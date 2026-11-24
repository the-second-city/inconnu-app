<script lang="ts">
	import { onMount, untrack, type Component, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import {
		Ban,
		IdCardLanyard,
		Loader2,
		Pencil,
		SaveCheck,
		ScrollText,
		SquareFunction,
		StarPlus,
		Timeline
	} from '@lucide/svelte';

	import { cleanName } from '$lib';
	import {
		characterNameError,
		profileLengthErrors,
		setConstraints,
		tooLongFields
	} from '$lib/constraints';

	import { beforeNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { atLeast } from '$lib/state/busy';
	import {
		editBody,
		saveErrors,
		type CharacterEdit,
		type SaveErrors
	} from '$lib/api/characterEdit';
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import type { Character, Constraints, Guild, OwnerData, TrackType } from '$lib/types';
	import ClientPortal from '$lib/components/ui/ClientPortal.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ModalActions from '$lib/components/ui/ModalActions.svelte';
	import CharacterSheet from './CharacterSheet.svelte';
	import CharHeader from '$lib/components/characters/view/CharHeader.svelte';
	import CharProfile from '$lib/components/characters/view/CharProfile.svelte';
	import CharLog from '$lib/components/characters/view/CharLog.svelte';
	import CharExperience from '$lib/components/characters/view/CharExperience.svelte';
	import RouseModal from '$lib/components/characters/actions/RouseModal.svelte';
	import MendModal from '$lib/components/characters/actions/MendModal.svelte';
	import DamageModal from '$lib/components/characters/actions/DamageModal.svelte';
	import SlakeModal from '$lib/components/characters/actions/SlakeModal.svelte';
	import StainModal from '$lib/components/characters/actions/StainModal.svelte';
	import RemorseModal from '$lib/components/characters/actions/RemorseModal.svelte';
	import FrenzyModal from '$lib/components/characters/actions/FrenzyModal.svelte';
	import MacroPanel from '$lib/components/characters/macros/MacroPanel.svelte';
	import PremiumModal from '$lib/components/premium/PremiumModal.svelte';
	import { isSupporter, refusedForPremium, showUpsell, upsell } from '$lib/state/premium.svelte';

	interface ComponentProps {
		character: Character;
		constraints: Constraints; // The bot's, which edit mode checks input against
		guild: Guild;
		owner?: OwnerData | null;
		spc?: boolean;
		backUrl?: Pathname;
		editable?: boolean; // Shows the edit buttons
		actionable?: boolean; // Clicking a damage track offers its actions (Take Damage)
		ownerActions?: boolean; // Plus Rouse, Mend, Slake, Remorse and Frenzy (the owner, or a Storyteller for an SPC)
	}

	let {
		character: initialCharacter,
		constraints,
		guild,
		owner,
		spc = false,
		backUrl,
		editable = false,
		actionable = false,
		ownerActions = false
	}: ComponentProps = $props();

	// The page's own copy, for edits. The parent keys this component on the character's ID, so a
	// new character starts a new copy.
	let character: Character = $state(untrack(() => $state.snapshot(initialCharacter)));

	// For the sheet's and profile's editing controls; a getter, so a refetch's copy reaches them
	setConstraints(() => constraints);

	interface Tab {
		value: string;
		label: string;
		ariaLabel?: string; // When the label is an abbreviation
		icon: Component;
		content: Snippet;
	}

	// The one list of tabs, which renders their triggers and panels. The first is the default.
	const tabs: Tab[] = $derived([
		{ value: 'sheet', label: 'Sheet', icon: ScrollText, content: sheetTab },
		{ value: 'profile', label: 'Profile', icon: IdCardLanyard, content: profileTab },
		...(character.log
			? [{ value: 'chronicle', label: 'Chronicle', icon: Timeline, content: chronicleTab }]
			: []),
		...(character.experience
			? [
					{
						value: 'experience',
						label: 'XP',
						ariaLabel: 'Experience',
						icon: StarPlus,
						content: experienceTab
					}
				]
			: [])
	]);
	const defaultTab = $derived(tabs[0].value);

	// This page's URL hash. `page.url` becomes the next page's URL before this one is torn down,
	// so the hash only follows it while it's still this page; its hash isn't ours.
	const { pathname, search } = untrack(() => page.url);
	let lastHash = '';
	const hash = $derived.by(() => {
		if (page.url.pathname === pathname) lastHash = page.url.hash;
		return lastHash;
	});

	// The selected tab is the hash (#profile, #chronicle); the default tab has none. The server
	// never sees the hash, so a link to another tab renders the default tab, then switches.
	const selectedTab = $derived.by(() => {
		const tab = hash.slice(1);
		return tabs.some(({ value }) => value === tab) ? tab : defaultTab;
	});

	/** The URL hash for a tab: none for the default tab. */
	const hashFor = (tab: string): string => (tab === defaultTab ? '' : `#${tab}`);

	/** Select a tab by putting it in the URL, without adding a history entry. */
	const selectTab = (tab: string) => {
		const url = tab === defaultTab ? `${pathname}${search}` : hashFor(tab);
		// An aborted navigation (say, a quick second click) leaves the tab as the URL has it.
		// The URL is the current page's own path or just a hash, so there's no route to resolve.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(url, { replaceState: true, noScroll: true, keepFocus: true }).catch(() => {});
	};

	// A hash that names no tab (or the default tab) shows the default tab, so drop it from the
	// URL. Otherwise it would stay, and selecting the default tab couldn't clear it.
	$effect(() => {
		if (page.url.pathname === pathname && hash !== hashFor(selectedTab)) selectTab(selectedTab);
	});

	let copy: Character | null = null;

	// Editing and the tracker actions are for supporters. Each click asks the API first, and a
	// non-supporter gets the upsell instead. One check at a time, so a double click can't start two.
	let checkingPremium = $state(false);
	/** Wrap an action so it runs only for a supporter; others see the upsell, naming `feature`. */
	const forSupporters =
		<A extends unknown[]>(feature: string, action: (...args: A) => void) =>
		async (...args: A): Promise<void> => {
			if (checkingPremium) return;
			checkingPremium = true;
			const supporter = await isSupporter();
			checkingPremium = false;
			if (supporter) {
				action(...args);
			} else {
				showUpsell(feature);
			}
		};
	/** Wrap a tracker action so it runs only for a supporter. */
	const gameplay = <A extends unknown[]>(action: (...args: A) => void) =>
		forSupporters('Using gameplay actions', action);

	// The Rouse modal lives here, not in the sheet: a Rouse saves the character, and the refetch
	// that follows rebuilds the sheet, which would close it just as the result arrives
	let rouseOpen = $state(false);
	const openRouse = () => (rouseOpen = true);
	// The Mend modal, likewise, for the kind of damage and track chosen in a track's menu
	let mendOpen = $state(false);
	let mendType: 'superficial' | 'aggravated' = $state('superficial');
	let mendTrack: TrackType = $state('health');
	const openMend = (type: 'superficial' | 'aggravated', track: TrackType) => {
		mendType = type;
		mendTrack = track;
		mendOpen = true;
	};
	// And the damage modal, for the track whose Take Damage was clicked
	let damageOpen = $state(false);
	let damageTrack: TrackType = $state('health');
	const openDamage = (track: TrackType) => {
		damageTrack = track;
		damageOpen = true;
	};
	// And the Slake (from Hunger), Apply Stains and Remorse (from Humanity) modals
	let slakeOpen = $state(false);
	let stainOpen = $state(false);
	let remorseOpen = $state(false);
	// And the frenzy test (below Hunger)
	let frenzyOpen = $state(false);
	let editing = $state(false);

	// The macros show below the sheet, or (with ?macros=panel, while both are being tried) in a
	// floating panel opened from a Macros button
	const macroPlacement = $derived(
		page.url.searchParams.get('macros') === 'panel' ? 'panel' : 'sheet'
	);
	const macroButton = $derived(macroPlacement === 'panel' && !!character.macros?.length);
	let macrosOpen = $state(false);

	// Fresh data for the same character (such as a data refresh) replaces the copy. While it's
	// being edited, the data waits: Cancel takes it, and Save keeps the edits instead.
	let applied = untrack(() => initialCharacter);
	$effect(() => {
		const fresh = initialCharacter;
		if (editing || fresh === applied) return;
		applied = fresh;
		character = untrack(() => $state.snapshot(fresh));
	});

	// The name being edited. It's only written to the character on Save, as normalizing it while
	// typing would strip the space before the next word.
	let newName = $state('');
	const normalizedNewName = $derived(cleanName(newName));

	// A failed save's errors. The bot's error for the name shows with the name until it's changed
	let saveError: SaveErrors | null = $state(null);
	let rejectedName = $state('');
	const nameError = $derived.by(() => {
		if (!editing) return null;
		const serverError = normalizedNewName === rejectedName ? saveError?.name : null;
		return characterNameError(normalizedNewName, constraints) ?? serverError ?? null;
	});

	// Profile text too long for the bot holds Save. CharProfile shows why with each field; elsewhere
	// (say, the Sheet tab), a notice names them, so Save isn't disabled for no visible reason
	const tooLong = $derived(
		editing
			? tooLongFields(
					profileLengthErrors(character.profile, character.convictions ?? [], constraints)
				)
			: []
	);
	const textTooLong = $derived(tooLong.length > 0);
	const tooLongNotice = $derived(
		textTooLong && selectedTab !== 'profile'
			? `To save, shorten the Profile tab’s ${new Intl.ListFormat('en').format(tooLong)}.`
			: null
	);

	// A save in progress: the buttons and shortcuts wait for it
	let saving = $state(false);

	/** What Save would send for a character, for telling whether anything changed. It's only the
	 * editable fields, so changes elsewhere (the Chronicle log, which each roll updates, or images
	 * added in Discord) don't count. Blank convictions (such as edit mode's empty slots) are left
	 * out, as the bot drops them. */
	const comparable = (char: Character, name: string): string => {
		const body = editBody(char, name);
		return JSON.stringify({ ...body, convictions: body.convictions.filter(Boolean) });
	};

	// The character when editing began, to compare the edits against
	let baseline = $state('');
	const hasChanges = $derived(editing && comparable(character, newName) !== baseline);

	// Fresh data that changes what edit mode can (say, damage taken in Discord) while editing asks
	// whether to reload it, discarding the edits, or keep editing. Each version is compared with the
	// last one seen while editing, not with the data editing began with: after Proceed Anyway, a later
	// version that changes only the log shouldn't ask again about the change already kept.
	let showStaleNotice = $state(false);
	let seen: Character | null = null; // The last version seen this edit (null: none since `applied`)
	$effect(() => {
		const fresh = initialCharacter;
		// Not while saving: the save's own "changed" event would bring it
		if (!editing || saving || fresh === applied || fresh === seen) return;
		const previous = seen ?? applied;
		seen = fresh;
		if (untrack(() => comparable(fresh, fresh.name) !== comparable(previous, previous.name))) {
			showStaleNotice = true;
		}
	});

	/** Take the fresh data, leaving edit mode and discarding the edits. */
	const reloadFresh = () => {
		showStaleNotice = false;
		saveError = null;
		editing = false;
		copy = null;
		applied = initialCharacter;
		character = $state.snapshot(initialCharacter);
	};

	const enterEditMode = () => {
		saveError = null; // A failed save's errors belong to that edit
		editing = true;
		seen = null;
		copy = $state.snapshot(character);
		baseline = comparable(copy, copy.name);
		newName = character.name;
		// A slot for each conviction the bot allows, like the wizard's. Cancel restores the original.
		const count = constraints.conviction_count;
		const convictions = [...(character.convictions ?? []), ...Array<string>(count).fill('')];
		character.convictions = convictions.slice(0, count);
	};
	const startEditing = forSupporters('Editing characters', enterEditMode);
	/** Ask before discarding unsaved edits. True when there are none, or the user agrees. */
	const confirmDiscard = (): boolean => !hasChanges || confirm('Discard your unsaved changes?');

	// Leaving the page with unsaved edits asks first. Switching tabs (a hash change on this page)
	// isn't leaving. For closing the tab, reloading, or leaving the site ("leave"), cancelling has
	// the browser show its own prompt, as pages can't show theirs there.
	beforeNavigate(({ type, from, to, cancel }) => {
		if (!hasChanges || (to && from && to.url.pathname === from.url.pathname)) return;
		if (type === 'leave' || !confirmDiscard()) cancel();
	});

	const cancelEditing = () => {
		if (saving || !confirmDiscard()) return;
		saveError = null;
		editing = false;
		if (copy) character = copy;
		copy = null;
	};
	/** Send the edits to the bot: the errors it gave, or null when it saved them. */
	const sendEdits = async (body: CharacterEdit): Promise<SaveErrors | null> => {
		try {
			const url = resolve('/api/characters/[id=objectid]', { id: character._id });
			const response = await fetch(url, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (response.ok) return null;
			const json = await response.json().catch(() => null);
			if (refusedForPremium(response.status, json)) showUpsell('Editing characters');
			return saveErrors(response.status, json, body);
		} catch {
			return { name: null, messages: ["Couldn't reach Inconnu to save your changes."] };
		}
	};

	/**
	 * Save the edits, spinning for at least the busy delay. On success, leave edit mode, keeping the
	 * edits: the save's own live update (`changed`) refetches the character, so the page then shows
	 * what the bot stored. On failure, stay in edit mode and show why.
	 */
	const saveChanges = async () => {
		if (saving || nameError || textTooLong || !hasChanges) return;
		saving = true;
		saveError = null;
		const before = initialCharacter; // The data these edits were made against
		const body = editBody($state.snapshot(character), newName);
		const errors = await atLeast(sendEdits(body));
		saving = false;

		if (errors) {
			saveError = errors;
			rejectedName = body.name;
			return;
		}
		character.name = body.name;
		character.convictions = body.convictions.filter(Boolean);
		// Until the live update's refetch, the edits stand. Not `initialCharacter`: the refetch can
		// land while the spinner runs, and leaving edit mode should apply it, not take it as seen
		applied = before;
		editing = false;
		copy = null;
	};

	// Keyboard shortcuts while editing: ⌘/Ctrl+S or ⌘/Ctrl+Enter saves, Escape cancels. The
	// modifier's name, for the buttons' tooltips, is only known in the browser.
	let modKey = $state('Ctrl');
	onMount(() => {
		if (/Mac|iPhone|iPad/.test(navigator.userAgent)) modKey = '⌘';
	});

	/** Whether a popover or dialog is open, which Escape should close rather than cancelling.
	 * Closed ones stay in the page, `hidden`. */
	const layerOpen = (): boolean =>
		document.querySelector('[role="dialog"]:not([hidden]), [role="alertdialog"]:not([hidden])') !==
		null;

	// Captured, so it runs before an open popover or dialog handles (and closes on) Escape
	const handleShortcut = (e: KeyboardEvent) => {
		if (!editing || saving || e.isComposing) return;
		const mod = e.metaKey || e.ctrlKey;
		if (mod && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
			e.preventDefault(); // Not the browser's "save page", even when there's nothing to save
			// Not under the "was updated" notice: it asks first whether to keep these edits
			if (!showStaleNotice) saveChanges();
		} else if (e.key === 'Escape' && !mod && !layerOpen()) {
			e.preventDefault();
			cancelEditing();
		}
	};
</script>

<svelte:window onkeydowncapture={handleShortcut} />

<svelte:head>
	<title>{character.name} | Inconnu</title>
</svelte:head>

<CharHeader
	name={character.name}
	images={character.profile.images}
	{guild}
	{owner}
	{spc}
	{backUrl}
	{editing}
	bind:editedName={newName}
	{nameError}
/>

{#snippet sheetTab()}
	{#key character}
		<CharacterSheet
			bind:character
			{editing}
			macros={macroPlacement === 'sheet'}
			{actionable}
			onRouse={ownerActions ? gameplay(openRouse) : undefined}
			onMend={ownerActions ? gameplay(openMend) : undefined}
			onTakeDamage={actionable ? gameplay(openDamage) : undefined}
			onSlake={ownerActions ? gameplay(() => (slakeOpen = true)) : undefined}
			onFrenzy={ownerActions ? gameplay(() => (frenzyOpen = true)) : undefined}
			onStain={actionable ? gameplay(() => (stainOpen = true)) : undefined}
			onRemorse={ownerActions ? gameplay(() => (remorseOpen = true)) : undefined}
		/>
	{/key}
{/snippet}

{#snippet profileTab()}
	<!-- Not keyed, unlike the sheet: CharProfile derives everything from its props, so it takes a
	     replaced character (Cancel, fresh data) in place. Rebuilding it would re-decode the gallery's
	     full-size images. -->
	<CharProfile
		name={character.name}
		bind:profile={character.profile}
		splat={character.splat}
		bind:convictions={character.convictions}
		{editing}
	/>
{/snippet}

{#snippet experienceTab()}
	{#if character.experience}
		<CharExperience experience={character.experience} />
	{/if}
{/snippet}

{#snippet chronicleTab()}
	{#if character.log}
		<CharLog log={character.log} splat={character.splat} />
	{/if}
{/snippet}

<Tabs value={selectedTab} onValueChange={(e) => selectTab(e.value)}>
	<div class="relative">
		<Tabs.List>
			{#each tabs as tab (tab.value)}
				<Tabs.Trigger
					value={tab.value}
					aria-label={tab.ariaLabel}
					class="flex items-center gap-1.5"
				>
					<!-- Not on phones, where the tabs wouldn't fit with them -->
					<tab.icon size={16} class="hidden shrink-0 sm:block" />{tab.label}
				</Tabs.Trigger>
			{/each}
			<Tabs.Indicator />
		</Tabs.List>
		{#if editable || macroButton}
			<!-- Desktop buttons, at the end of the tab row (outside the tab list, which should hold
			     only tabs). The mobile ones float instead. -->
			<div class="absolute top-0 right-0 hidden gap-2 sm:flex">
				{#if macroButton}
					{@render macrosToggle('btn btn-gothic btn-gothic-ash', 18)}
				{/if}
				{#if !editable}
					<!-- No edit buttons -->
				{:else if editing}
					<button
						class="btn btn-gothic btn-gothic-ash"
						onclick={cancelEditing}
						disabled={saving}
						title="Cancel (Esc)"
						aria-keyshortcuts="Escape"
					>
						<Ban size={18} />
						<span>Cancel</span>
					</button>
					<button
						class="btn btn-gothic btn-gothic-blood"
						onclick={saveChanges}
						disabled={saving || nameError !== null || textTooLong || !hasChanges}
						aria-busy={saving}
						title="Save ({modKey}S)"
						aria-keyshortcuts="Meta+S Control+S"
					>
						{#if saving}
							<Loader2 size={18} class="animate-spin" />
						{:else}
							<SaveCheck size={18} />
						{/if}
						<span>Save</span>
					</button>
				{:else}
					<button
						class="btn btn-gothic btn-gothic-bone"
						onclick={startEditing}
						disabled={checkingPremium}
					>
						<Pencil size={18} />
						<span>Edit</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>
	{#if tooLongNotice}
		<div
			class="card preset-tonal-warning mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 p-4"
			role="status"
		>
			<p class="flex-1">{tooLongNotice}</p>
			<button class="btn btn-sm preset-tonal" onclick={() => selectTab('profile')}>
				Go to Profile
			</button>
		</div>
	{/if}
	{#if editing && saveError && saveError.messages.length > 0}
		<div class="card preset-tonal-error mb-4 p-4" role="alert">
			<p class="font-semibold">Your changes weren't saved.</p>
			<ul class="mt-1 list-inside list-disc text-sm">
				{#each saveError.messages as message, i (i)}
					<li>{message}</li>
				{/each}
			</ul>
		</div>
	{/if}
	{#each tabs as tab (tab.value)}
		<Tabs.Content value={tab.value}>
			{@render tab.content()}
		</Tabs.Content>
	{/each}
</Tabs>

<!-- Edit mode tints the window's edge, so it's clear anywhere on the page. It's decoration only:
     it ignores clicks, and sits under the floating edit buttons. Portaled to <body>, as the page's
     own spacing (margins between siblings) would otherwise lift its bottom edge. -->
{#if editing}
	<ClientPortal>
		<div
			class="edit-edge pointer-events-none fixed inset-0 z-30"
			aria-hidden="true"
			transition:fade={{ duration: 150 }}
		></div>
	</ClientPortal>
{/if}

{#if actionable}
	<RouseModal bind:open={rouseOpen} {character} />
	<MendModal bind:open={mendOpen} {character} type={mendType} track={mendTrack} />
	<DamageModal bind:open={damageOpen} {character} track={damageTrack} />
	<SlakeModal bind:open={slakeOpen} {character} />
	<StainModal bind:open={stainOpen} {character} />
	<RemorseModal bind:open={remorseOpen} {character} />
	<FrenzyModal bind:open={frenzyOpen} {character} />
{/if}

{#if editable || actionable}
	<PremiumModal bind:open={upsell.open} feature={upsell.feature} />
{/if}

<!-- The character changed while it was being edited -->
<Modal
	role="alertdialog"
	bind:open={showStaleNotice}
	title="{character.name} was updated"
	size="md"
	centered={false}
>
	{#snippet description()}
		<p>
			This character changed while you were editing, perhaps in Discord. Reload to see the changes,
			which discards your edits.
		</p>
		<p>If you proceed anyway, saving will overwrite those changes.</p>
	{/snippet}
	<ModalActions
		bind:open={showStaleNotice}
		cancelLabel="Proceed Anyway"
		action="Reload"
		onaction={reloadFresh}
	/>
</Modal>

{#snippet macrosToggle(classes: string, size: number)}
	<button
		class={classes}
		onclick={() => (macrosOpen = !macrosOpen)}
		aria-expanded={macrosOpen}
		aria-controls="macro-panel"
		aria-label="Macros"
	>
		<SquareFunction {size} />
		{#if size < 20}<span>Macros</span>{/if}
	</button>
{/snippet}

{#if macroButton}
	<MacroPanel {character} bind:open={macrosOpen} />
{/if}

{#if editable || macroButton}
	<!-- Room at the end of the page, so its last rows can scroll clear of the floating buttons -->
	<div class={[macroButton && editable ? 'h-40' : 'h-24', 'sm:hidden']} aria-hidden="true"></div>

	<!-- Mobile floating buttons: Macros above the edit buttons -->
	<div class="fixed right-6 bottom-6 z-40 sm:hidden">
		<div class="flex flex-col items-end gap-4 p-4">
			{#if macroButton}
				{@render macrosToggle('fab-gothic btn-gothic btn-gothic-ash', 24)}
			{/if}
			<div class="container mx-auto flex justify-center gap-4">
				{#if !editable}
					<!-- No edit buttons -->
				{:else if editing}
					<button
						class="fab-gothic btn-gothic btn-gothic-ash"
						onclick={cancelEditing}
						disabled={saving}
						aria-label="Cancel"
					>
						<Ban strokeWidth={2.5} size={22} />
					</button>
					<button
						class="fab-gothic btn-gothic btn-gothic-blood"
						onclick={saveChanges}
						disabled={saving || nameError !== null || textTooLong || !hasChanges}
						aria-busy={saving}
						aria-label="Save"
					>
						{#if saving}
							<Loader2 strokeWidth={2.5} class="animate-spin" size={24} />
						{:else}
							<SaveCheck strokeWidth={2.5} size={24} />
						{/if}
					</button>
				{:else}
					<button
						class="fab-gothic btn-gothic btn-gothic-bone"
						onclick={startEditing}
						disabled={checkingPremium}
						aria-label="Edit"
					>
						<Pencil size={24} />
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.edit-edge {
		/* A glow only, no hard line: a line would be clipped by rounded window corners. Bone, like
		   the Edit button: candlelight at the window's edge. */
		box-shadow: inset 0 0 48px color-mix(in oklab, oklch(86% 0.035 80deg) 45%, transparent);
	}
</style>
