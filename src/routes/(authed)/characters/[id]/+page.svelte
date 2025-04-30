<script lang="ts">
	import { page } from '$app/state';

	import { Avatar, Tabs } from '@skeletonlabs/skeleton-svelte';
	import { Ban, Check, Pencil } from '@lucide/svelte';

	import { normalize } from '$lib';

	import type { Character, Guild } from '$lib/types';
	import CharSheet from '$lib/components/characters/CharSheet.svelte';
	import CharProfile from '$lib/components/characters/CharProfile.svelte';
	import CharNotes from '$lib/components/characters/CharNotes.svelte';

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
	<title>{character.name} | botch.lol</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-2">
	<div class="relative">
		<h1 class="h1 flex items-center gap-4">
			{#if character.profile.images.length > 0}
				<div class="ring-primary-500 rounded-full ring-2">
					<Avatar name={character.name} src={character.profile.images[0]} />
				</div>
			{/if}

			{#if editing}
				<input
					type="text"
					class="input h1 border"
					class:text-error-500={!isValidCharName()}
					class:border-error-500={!isValidCharName()}
					bind:value={newName}
					aria-label="Edit character name"
				/>
			{:else}
				{character.name}
			{/if}
		</h1>

		{#if guild && !editing}
			<div class="flex justify-end">
				<h6 class="text-surface-800-200 flex items-center gap-4 italic">
					{guild.name}
					<Avatar src={guild.icon} name={guild.name} size="size-6" />
				</h6>
			</div>
		{/if}
	</div>

	<!-- Desktop edit buttons -->
	<div class="hidden sm:block">
		<!-- Remove this class to undo -->
		{#if editing}
			<div class="flex gap-2">
				<button
					class="btn preset-outlined-warning-500 hover:scale-105 hover:brightness-125 active:scale-95"
					onclick={cancelEditing}
				>
					Cancel
				</button>
				<button
					class="btn preset-filled-success-500 hover:scale-105 hover:brightness-125 active:scale-95"
					onclick={saveChanges}
				>
					Save
				</button>
			</div>
		{:else}
			<button
				class="btn preset-filled-secondary-500 hover:scale-105 hover:brightness-125 active:scale-95"
				onclick={enterEditMode}
			>
				Edit <Pencil size={18} />
			</button>
		{/if}
	</div>
</div>

<Tabs value={selectedTab} onValueChange={(e) => (selectedTab = e.value)}>
	{#snippet list()}
		<Tabs.Control value="sheet">Sheet</Tabs.Control>
		<Tabs.Control value="profile">Profile</Tabs.Control>
		<Tabs.Control value="notes">Notes</Tabs.Control>
	{/snippet}
	{#snippet content()}
		<Tabs.Panel value="profile">
			{#key character}
				<CharProfile bind:character {editing} />
			{/key}
		</Tabs.Panel>
		<Tabs.Panel value="sheet">
			{#key character}
				<CharSheet bind:character {editing} />
			{/key}
		</Tabs.Panel>
		<Tabs.Panel value="notes">
			<CharNotes bind:character {editing} />
		</Tabs.Panel>
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
