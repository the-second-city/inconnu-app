<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { Plus, SquareFunction, X } from '@lucide/svelte';

	import type { Character } from '$lib/types';
	import MacroForm from './MacroForm.svelte';
	import MacroList from './MacroList.svelte';

	/** What the panel shows: the macros, or the form for a new one. */
	export type MacroPanelView = 'list' | 'add';

	interface ComponentProps {
		character: Character;
		open: boolean;
		view?: MacroPanelView;
		onadd?: () => void; // Shows an Add button, which calls this (to check, then set `view`)
	}

	let { character, open = $bindable(), view = $bindable('list'), onadd }: ComponentProps = $props();

	// Closing discards a macro in progress, so the panel reopens on the list
	$effect(() => {
		if (!open) view = 'list';
	});

	// Escape backs out of the form, then closes the panel, unless something over it (a popover or
	// dialog) takes the key first
	const handleKey = (e: KeyboardEvent) => {
		if (!open || e.key !== 'Escape' || e.defaultPrevented) return;
		if (view === 'add') {
			view = 'list';
		} else {
			open = false;
		}
	};

	const macros = $derived(character.macros ?? []);

	// Switching between the list and the form crossfades: the two share a grid cell while one fades
	// out and the other in, so neither waits for the other
	const crossfade = { duration: 200 };
</script>

<svelte:window onkeydown={handleKey} />

<!--
@component
The macros in a floating panel, opened from a Macros button. It isn't modal: the sheet stays usable
beside it (it's where a new macro's pool will come from). With `onadd`, an Add button switches it to
the new macro form. On phones it sits above the floating buttons; wider, at the window's right,
below the tab row (and the Macros button).
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
			<h2 id="macro-panel-title" class="font-display grid text-sm tracking-[0.04em] uppercase">
				{#if view === 'add'}
					<span class="col-start-1 row-start-1" transition:fade={crossfade}>New Macro</span>
				{:else}
					<span class="col-start-1 row-start-1" transition:fade={crossfade}>Macros</span>
				{/if}
			</h2>
			<div class="ml-auto flex items-center gap-1">
				{#if onadd && view === 'list'}
					<button
						type="button"
						class="btn btn-sm btn-gothic btn-gothic-bone"
						onclick={onadd}
						aria-label="Add macro"
						transition:fade={crossfade}
					>
						<Plus size={16} />
						<span>Add</span>
					</button>
				{/if}
				<button
					type="button"
					class="hover:preset-tonal-surface rounded-full p-1 opacity-70 hover:opacity-100"
					onclick={() => (open = false)}
					aria-label="Close macros"
					title="Close (Esc)"
				>
					<X size={16} />
				</button>
			</div>
		</header>
		<div class="grid overflow-y-auto px-4 py-3">
			{#if view === 'add'}
				<div class="col-start-1 row-start-1" transition:fade={crossfade}>
					<MacroForm {character} oncancel={() => (view = 'list')} onsaved={() => (view = 'list')} />
				</div>
			{:else}
				<div class="col-start-1 row-start-1" transition:fade={crossfade}>
					{#if macros.length > 0}
						<MacroList {character} layout="stack" />
					{:else}
						<p class="text-surface-300 italic">No macros yet.</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
