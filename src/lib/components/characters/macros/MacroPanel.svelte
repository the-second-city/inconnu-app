<script lang="ts">
	import { fly } from 'svelte/transition';
	import { SquareFunction, X } from '@lucide/svelte';

	import type { Character } from '$lib/types';
	import MacroList from './MacroList.svelte';

	interface ComponentProps {
		character: Character;
		open: boolean;
	}

	let { character, open = $bindable() }: ComponentProps = $props();

	// Escape closes it, unless something over it (a popover or dialog) takes the key first. As a
	// (non-modal) dialog, edit mode leaves Escape to it rather than cancelling the edits
	const handleKey = (e: KeyboardEvent) => {
		if (open && e.key === 'Escape' && !e.defaultPrevented) open = false;
	};
</script>

<svelte:window onkeydown={handleKey} />

<!--
@component
The macros in a floating panel, opened from a Macros button. It isn't modal: the sheet stays usable
beside it. On phones it sits above the floating buttons; wider, at the window’s right, below the tab row (and the Macros button).
-->
{#if open}
	<div
		id="macro-panel"
		role="dialog"
		aria-modal="false"
		class="card popover-gothic fixed inset-x-4 bottom-46 z-40 flex max-h-[60vh] flex-col sm:inset-x-auto sm:top-60 sm:right-6 sm:bottom-auto sm:max-h-[calc(100vh-16.5rem)] sm:w-96"
		aria-labelledby="macro-panel-title"
		transition:fly={{ x: 24, duration: 200 }}
	>
		<header class="border-surface-500 flex items-center gap-2 border-b px-4 py-3">
			<SquareFunction size={18} class="text-primary-400 shrink-0" />
			<h2 id="macro-panel-title" class="font-display text-sm tracking-[0.04em] uppercase">
				Macros
			</h2>
			<button
				type="button"
				class="hover:preset-tonal-surface ml-auto rounded-full p-1 opacity-70 hover:opacity-100"
				onclick={() => (open = false)}
				aria-label="Close macros"
				title="Close (Esc)"
			>
				<X size={16} />
			</button>
		</header>
		<div class="overflow-y-auto px-4 py-3">
			<MacroList {character} layout="stack" />
		</div>
	</div>
{/if}
