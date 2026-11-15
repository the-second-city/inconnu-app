<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Dialog, Tabs } from '@skeletonlabs/skeleton-svelte';
	import { Ban, Check, Pencil } from '@lucide/svelte';

	import { characterNameError, normalize } from '$lib';

	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import type { Character, Guild, OwnerData } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import CharacterSheet from './CharacterSheet.svelte';
	import CharHeader from '$lib/components/characters/CharHeader.svelte';
	import CharProfile from '$lib/components/characters/CharProfile.svelte';
	import CharLog from '$lib/components/characters/CharLog.svelte';
	import CharExperience from '$lib/components/characters/CharExperience.svelte';

	interface ComponentProps {
		character: Character;
		guild: Guild;
		owner?: OwnerData | null;
		spc?: boolean;
		backUrl?: Pathname;
		editable?: boolean; // Shows the edit buttons. Off until characters can be saved
	}

	let {
		character: initialCharacter,
		guild,
		owner,
		spc = false,
		backUrl,
		editable = false
	}: ComponentProps = $props();

	// The page's own copy, for edits. The parent keys this component on the character's ID, so a
	// new character starts a new copy.
	let character: Character = $state(untrack(() => $state.snapshot(initialCharacter)));

	interface Tab {
		value: string;
		label: string;
		ariaLabel?: string; // When the label is an abbreviation
		content: Snippet;
	}

	// The one list of tabs, which renders their triggers and panels. The first is the default.
	const tabs: Tab[] = $derived([
		{ value: 'sheet', label: 'Sheet', content: sheetTab },
		{ value: 'profile', label: 'Profile', content: profileTab },
		...(character.log ? [{ value: 'chronicle', label: 'Chronicle', content: chronicleTab }] : []),
		...(character.experience
			? [{ value: 'experience', label: 'XP', ariaLabel: 'Experience', content: experienceTab }]
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
	let editing = $state(false);

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
	const normalizedNewName = $derived(normalize(newName));
	const nameError = $derived(editing ? characterNameError(normalizedNewName) : null);

	/** A character as Save would store it, for telling whether anything changed: the name and
	 * convictions normalized, blank convictions (such as edit mode's empty slots) dropped, and the
	 * fields edit mode can't change (the Chronicle log, which each roll updates, and experience)
	 * left out. */
	const comparable = (char: Character, name: string): string => {
		const editable: Partial<Character> = {
			...$state.snapshot(char),
			name: normalize(name),
			convictions: (char.convictions ?? []).map(normalize).filter(Boolean)
		};
		delete editable.log;
		delete editable.experience;
		return JSON.stringify(editable);
	};

	// The character when editing began, to compare the edits against
	let baseline = $state('');
	const hasChanges = $derived(editing && comparable(character, newName) !== baseline);

	// Fresh data that changes what edit mode can (say, damage taken in Discord) while editing asks
	// whether to reload it, discarding the edits, or keep editing. Each version asks once.
	let showStaleNotice = $state(false);
	let noticed: Character | null = null;
	$effect(() => {
		const fresh = initialCharacter;
		if (!editing || fresh === applied || fresh === noticed) return;
		noticed = fresh;
		if (untrack(() => comparable(fresh, fresh.name) !== comparable(applied, applied.name))) {
			showStaleNotice = true;
		}
	});

	/** Take the fresh data, leaving edit mode and discarding the edits. */
	const reloadFresh = () => {
		showStaleNotice = false;
		editing = false;
		copy = null;
		applied = initialCharacter;
		character = $state.snapshot(initialCharacter);
	};

	const enterEditMode = () => {
		editing = true;
		copy = $state.snapshot(character);
		baseline = comparable(copy, copy.name);
		newName = character.name;
		// Three conviction slots to fill in, like the wizard's. Cancel restores the original list.
		character.convictions = [...(character.convictions ?? []), '', '', ''].slice(0, 3);
	};
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
		if (!confirmDiscard()) return;
		editing = false;
		if (copy) character = copy;
		copy = null;
	};
	const saveChanges = () => {
		if (nameError || !hasChanges) return;
		character.name = normalizedNewName;
		character.convictions = character.convictions?.map(normalize);
		applied = initialCharacter; // Data that arrived while editing would undo the edits
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
		if (!editing || e.isComposing) return;
		const mod = e.metaKey || e.ctrlKey;
		if (mod && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
			e.preventDefault(); // Not the browser's "save page", even when there's nothing to save
			saveChanges();
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
		<!-- Tracker actions follow `editable` for now; they'll be for owners only (not STs) -->
		<CharacterSheet bind:character {editing} actionable={editable} />
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
				<Tabs.Trigger value={tab.value} aria-label={tab.ariaLabel}>{tab.label}</Tabs.Trigger>
			{/each}
			<Tabs.Indicator />
		</Tabs.List>
		{#if editable}
			<!-- Desktop edit buttons, at the end of the tab row (outside the tab list, which
			     should hold only tabs). The mobile ones float instead. -->
			<div class="absolute top-0 right-0 hidden gap-2 sm:flex">
				{#if editing}
					<button
						class="btn preset-tonal-error"
						onclick={cancelEditing}
						title="Cancel (Esc)"
						aria-keyshortcuts="Escape"
					>
						<Ban size={18} />
						<span>Cancel</span>
					</button>
					<button
						class="btn preset-filled-success-500"
						onclick={saveChanges}
						disabled={nameError !== null || !hasChanges}
						title="Save ({modKey}S)"
						aria-keyshortcuts="Meta+S Control+S"
					>
						<Check size={18} />
						<span>Save</span>
					</button>
				{:else}
					<button class="btn preset-tonal-secondary" onclick={enterEditMode}>
						<Pencil size={18} />
						<span>Edit</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>
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

<!-- The character changed while it was being edited -->
<Dialog
	role="alertdialog"
	open={showStaleNotice}
	onOpenChange={(e) => (showStaleNotice = e.open)}
	closeOnInteractOutside={false}
>
	<ClientPortal>
		<Dialog.Backdrop class="bg-surface-50-950/50 fixed inset-0 z-50" />
		<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<Dialog.Content class="card bg-surface-100-900 w-full max-w-md space-y-4 p-6 shadow-xl">
				<Dialog.Title class="h5">{character.name} was updated</Dialog.Title>
				<Dialog.Description class="space-y-2">
					<p>
						This character changed while you were editing, perhaps in Discord. Reload to see the
						changes, which discards your edits.
					</p>
					<p>If you proceed anyway, saving will overwrite those changes.</p>
				</Dialog.Description>
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="btn preset-tonal-surface"
						onclick={() => (showStaleNotice = false)}
					>
						Proceed Anyway
					</button>
					<button type="button" class="btn preset-filled-primary-500" onclick={reloadFresh}>
						Reload
					</button>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>

{#if editable}
	<!-- Room at the end of the page, so its last rows can scroll clear of the floating buttons -->
	<div class="h-24 sm:hidden" aria-hidden="true"></div>

	<!-- Mobile floating edit buttons -->
	<div class="fixed right-6 bottom-6 z-40 sm:hidden">
		<div class="p-4">
			<div class="container mx-auto flex justify-center gap-4">
				{#if editing}
					<button
						class="from-error-400 to-error-600 border-surface-50/20 hover:shadow-error-500/50 relative flex aspect-square size-14 items-center justify-center overflow-hidden !rounded-full border-2 bg-gradient-to-br text-white shadow-xl transition-all duration-300 ease-out hover:scale-110 active:scale-95"
						onclick={cancelEditing}
						aria-label="Cancel"
					>
						<Ban strokeWidth={3} class="drop-shadow-md" size={24} />
					</button>
					<button
						class="from-success-400 to-success-600 border-surface-50/20 hover:shadow-success-500/50 relative flex aspect-square size-14 items-center justify-center overflow-hidden !rounded-full border-2 bg-gradient-to-br text-white shadow-xl transition-all duration-300 ease-out hover:scale-110 active:scale-95"
						onclick={saveChanges}
						disabled={nameError !== null || !hasChanges}
						aria-label="Save"
					>
						<Check color="#000" strokeWidth={3} class="drop-shadow-md" size={24} />
					</button>
				{:else}
					<button
						class="from-secondary-500 to-secondary-700 border-surface-50/20 hover:shadow-secondary-500/50 relative flex aspect-square size-14 items-center justify-center overflow-hidden !rounded-full border-2 bg-gradient-to-br text-white shadow-xl transition-all duration-300 ease-out hover:scale-110 active:scale-95"
						onclick={enterEditMode}
						aria-label="Edit"
					>
						<Pencil class="drop-shadow-md" size={24} />
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.edit-edge {
		/* A glow only, no hard line: a line would be clipped by rounded window corners */
		box-shadow: inset 0 0 48px color-mix(in oklab, var(--color-secondary-500) 75%, transparent);
	}
</style>
