<script lang="ts">
	import { onMount } from 'svelte';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import { Ban, Check, Pencil } from '@lucide/svelte';

	import { normalize } from '$lib';

	import { replaceState } from '$app/navigation';
	import type { Pathname } from '$app/types';
	import type { Character, Guild, OwnerData } from '$lib/types';
	import CharacterSheet from './CharacterSheet.svelte';
	import CharHeader from '$lib/components/characters/CharHeader.svelte';
	import CharProfile from '$lib/components/characters/CharProfile.svelte';
	import CharLog from '$lib/components/characters/CharLog.svelte';

	interface ComponentProps {
		character: Character;
		guild: Guild;
		owner?: OwnerData | null;
		spc?: boolean;
		backUrl?: Pathname;
	}

	let { character = $bindable(), guild, owner, spc = false, backUrl }: ComponentProps = $props();

	// The selected tab follows the URL's hash (#profile, #chronicle); the sheet has none
	const DEFAULT_TAB = 'sheet';
	let selectedTab = $state(DEFAULT_TAB);
	const tabs = $derived(['sheet', 'profile', ...(character.log ? ['chronicle'] : [])]);

	/** Select the tab named by the URL's hash, or the sheet if it names none. */
	const selectTabFromHash = () => {
		const tab = window.location.hash.slice(1);
		selectedTab = tabs.includes(tab) ? tab : DEFAULT_TAB;
	};

	/** Select a tab and put it in the URL, without adding a history entry. */
	const selectTab = (tab: string) => {
		selectedTab = tab;
		const { pathname, search } = window.location;
		replaceState(tab === DEFAULT_TAB ? `${pathname}${search}` : `#${tab}`, {});
	};

	// The server never sees the hash, so the page renders the sheet and switches once mounted
	onMount(selectTabFromHash);
	let copy: Character | null = null;
	let editing = $state(false);

	const enterEditMode = () => {
		editing = true;
		copy = structuredClone($state.snapshot(character));
		newName = character.name;
	};
	const cancelEditing = () => {
		editing = false;
		character = copy!;
		copy = null;
	};
	const saveChanges = () => {
		editing = false;
		copy = null;
	};

	let newName = $state('');
	let normalizedNewName = $derived(normalize(newName));

	const isValidCharName = (): boolean =>
		0 < normalizedNewName.length && normalizedNewName.length <= 37;

	$effect(() => {
		if (isValidCharName()) {
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

<svelte:window onhashchange={selectTabFromHash} />

<Tabs value={selectedTab} onValueChange={(e) => selectTab(e.value)}>
	<Tabs.List>
		<Tabs.Trigger value="sheet">Sheet</Tabs.Trigger>
		<Tabs.Trigger value="profile">Profile</Tabs.Trigger>
		{#if character.log}
			<Tabs.Trigger value="chronicle">Chronicle</Tabs.Trigger>
		{/if}
		<!--
		<Tabs.Trigger value="experience">Experience</Tabs.Trigger>
		-->
		<Tabs.Indicator />
	</Tabs.List>
	<Tabs.Content value="profile">
		{#key character}
			<CharProfile
				name={character.name}
				bind:profile={character.profile}
				splat={character.splat}
				{editing}
			/>
		{/key}
	</Tabs.Content>
	<Tabs.Content value="sheet">
		{#key character}
			<CharacterSheet bind:character />
		{/key}
	</Tabs.Content>
	{#if character.log}
		<Tabs.Content value="chronicle">
			<CharLog log={character.log} splat={character.splat} />
		</Tabs.Content>
	{/if}
	<!--
	<Tabs.Content value="experience">
		{#key character}
			Eventually
		{/key}
	</Tabs.Content>
	-->
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
