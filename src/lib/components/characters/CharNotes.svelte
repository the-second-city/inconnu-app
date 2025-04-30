<script lang="ts">
	import { onMount } from 'svelte';

	import type { Character } from '$lib/types';

	interface ComponentProps {
		character: Character;
		editing: boolean;
	}

	let { character = $bindable(), editing }: ComponentProps = $props();

	onMount(() => {
		if (!character.notes) {
			character.notes = Array(4).fill('');
		}
	});
</script>

<p class="mb-4">Use this area for notes on Backgrounds, relationships, etc.</p>

<div class="flex h-[calc(90vh-2rem)] grid-cols-1 flex-wrap gap-2 sm:grid-cols-2">
	{#each character.notes as _, i}
		<textarea
			class="textarea min-h[30vh] w-full flex-grow border disabled:opacity-75 sm:min-h-[calc(50%)] sm:w-[calc(50%-0.5rem)]"
			disabled={!editing}
			bind:value={character.notes[i]}
		></textarea>
	{/each}
</div>
