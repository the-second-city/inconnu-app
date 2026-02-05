<script lang="ts">
	import { page } from '$app/state';

	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import { Ban, Check, Pencil } from '@lucide/svelte';

	import { normalize } from '$lib';

	import type { Character, Guild } from '$lib/types';
	import CharacterSheet from './CharacterSheet.svelte';
	import CharHeader from '$lib/components/characters/CharHeader.svelte';
	import CharProfile from '$lib/components/characters/CharProfile.svelte';

	let selectedTab = $state('sheet');

	const guild: Guild | null = page.data.guild;

	let character = $state(page.data.character);
	let copy: Character | null = null;
	let editing = $state(false);

	const enterEditMode = () => {
		editing = true;
		copy = structuredClone($state.snapshot(character));
		newName = character.name;
	};
	const cancelEditing = () => {
		editing = false;
		character = copy;
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
	<title>{character.name} | inconnu.app</title>
</svelte:head>

<CharHeader name={character.name} images={character.profile.images} {guild} />

<Tabs value={selectedTab} onValueChange={(e) => (selectedTab = e.value)}>
	{#snippet list()}
		<Tabs.Control value="sheet">Sheet</Tabs.Control>
		<Tabs.Control value="profile">Profile</Tabs.Control>
		<!--
		<Tabs.Control value="experience">Experience</Tabs.Control>
		-->
	{/snippet}
	{#snippet content()}
		<Tabs.Panel value="profile">
			{#key character}
				<CharProfile
					name={character.name}
					bind:profile={character.profile}
					splat={character.splat}
					{editing}
				/>
			{/key}
		</Tabs.Panel>
		<Tabs.Panel value="sheet">
			{#key character}
				<CharacterSheet bind:character />
			{/key}
		</Tabs.Panel>
		<!--
		<Tabs.Panel value="experience">
			{#key character}
				Eventually
			{/key}
		</Tabs.Panel>
		-->
	{/snippet}
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
