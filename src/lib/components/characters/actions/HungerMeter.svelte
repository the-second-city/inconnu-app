<script lang="ts">
	import type { ClassValue } from 'svelte/elements';

	import EmptyHunger from '$lib/components/characters/glyphs/hunger/Empty.svelte';
	import FilledHunger from '$lib/components/characters/glyphs/hunger/Filled.svelte';

	interface ComponentProps {
		hunger: number; // The Hunger there is
		to?: number; // The Hunger a change would leave (or left), marked against `hunger`
		// How the change shows: a preview's gains are faint and its losses hollow; a result's gains
		// pulse and its losses pulse as outlines (unless motion is reduced)
		mark?: 'preview' | 'pulse';
		size?: number;
		label?: string; // An accessible name, making it an image; otherwise screen readers skip it
		class?: ClassValue; // The row's layout
	}

	let {
		hunger,
		to = hunger,
		mark = 'preview',
		size = 14,
		label,
		class: className = 'flex shrink-0 gap-0.5'
	}: ComponentProps = $props();

	const kept = $derived(Math.min(hunger, to));
	const pulse = $derived(mark === 'pulse');
</script>

<!-- Five Hunger drops: the Hunger kept solid, then what the change adds or removes -->
<span
	class={className}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	{#each Array(5), i (i)}
		{#if i < kept}
			<FilledHunger {size} />
		{:else if i < to}
			<span class={pulse ? 'motion-safe:animate-pulse' : 'opacity-40'} data-gained={pulse || null}>
				<FilledHunger {size} />
			</span>
		{:else if i < hunger && pulse}
			<span class="motion-safe:animate-pulse" data-lost>
				<EmptyHunger {size} />
			</span>
		{:else}
			<EmptyHunger {size} />
		{/if}
	{/each}
</span>
