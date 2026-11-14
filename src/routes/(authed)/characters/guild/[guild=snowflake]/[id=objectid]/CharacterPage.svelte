<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import { Ban, Check, Pencil } from '@lucide/svelte';

	import { normalize } from '$lib';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import type { Character, Guild, OwnerData } from '$lib/types';
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
	}

	let {
		character: initialCharacter,
		guild,
		owner,
		spc = false,
		backUrl
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
		// An aborted navigation (say, a quick second click) leaves the tab as the URL has it
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

	const enterEditMode = () => {
		editing = true;
		copy = $state.snapshot(character);
		newName = character.name;
	};
	const cancelEditing = () => {
		editing = false;
		if (copy) character = copy;
		copy = null;
	};
	const saveChanges = () => {
		applied = initialCharacter; // Data that arrived while editing would undo the edits
		editing = false;
		copy = null;
	};

	let newName = $state('');
	let normalizedNewName = $derived(normalize(newName));

	const isValidCharName = (): boolean =>
		0 < normalizedNewName.length && normalizedNewName.length <= 37;

	// Only while editing: otherwise replacing the character (Cancel, fresh data) would get the last
	// edited name written back over it
	$effect(() => {
		if (editing && isValidCharName()) {
			character.name = normalizedNewName;
			newName = normalizedNewName;
		}
	});
</script>

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
/>

{#snippet sheetTab()}
	{#key character}
		<CharacterSheet bind:character />
	{/key}
{/snippet}

{#snippet profileTab()}
	{#key character}
		<CharProfile
			name={character.name}
			bind:profile={character.profile}
			splat={character.splat}
			{editing}
		/>
	{/key}
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
	<Tabs.List>
		{#each tabs as tab (tab.value)}
			<Tabs.Trigger value={tab.value} aria-label={tab.ariaLabel}>{tab.label}</Tabs.Trigger>
		{/each}
		<Tabs.Indicator />
	</Tabs.List>
	{#each tabs as tab (tab.value)}
		<Tabs.Content value={tab.value}>
			{@render tab.content()}
		</Tabs.Content>
	{/each}
</Tabs>

<!-- Mobile floating edit buttons; remove entire block to undo -->
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
