<script lang="ts">
	import { capitalize, orList } from '$lib';
	import { HandHeart, HeartCrack } from '@lucide/svelte';

	import Popover from '$lib/components/Popover.svelte';

	import { remorseDice } from '$lib/remorse';
	import type { Character } from '$lib/types';

	import Empty from './humanity/Empty.svelte';
	import Filled from './humanity/Filled.svelte';
	import Stain from './humanity/Stain.svelte';
	import Degeneration from './humanity/Degeneration.svelte';
	import { CLICKABLE } from './clickable';
	import MenuAction from './MenuAction.svelte';
	import Stepper from '$lib/components/characters/Stepper.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
		// Outside edit mode, clicking Humanity offers these: Apply Stains (anyone with full access) and
		// Remorse (the owner, or a Storyteller for an SPC)
		onStain?: () => void;
		onRemorse?: () => void;
	}

	let { character = $bindable(), editing, onStain, onRemorse }: ComponentProps = $props();

	// The actions menu's hover text: what it offers this viewer
	const actionsTitle = $derived(
		capitalize(
			orList([...(onStain ? ['apply Stains'] : []), ...(onRemorse ? ['test Remorse'] : [])])
		)
	);

	let showControls = $state(false);
	let showActions = $state(false);
	// So neither popover reopens by itself when the mode switches back
	$effect(() => {
		if (!editing) showControls = false;
		if (editing) showActions = false;
	});

	const totalBoxes = 10;

	// Default only when missing; 0 is a valid Humanity (and Stains)
	let humanity = $derived(character.humanity ?? 7);
	let stains = $derived(character.stains ?? 0);

	let boxStates = $derived.by(() => {
		const emptyBoxes = totalBoxes - humanity;
		const stainOverflow = Math.max(0, stains - emptyBoxes);
		const normalStains = stains - stainOverflow;

		const filled = humanity - stainOverflow;
		const empty = emptyBoxes - normalStains;
		const degeneration = stainOverflow;

		return {
			filled,
			empty,
			degeneration,
			stains: normalStains
		};
	});
</script>

Humanity

{#snippet boxes()}
	<div class="flex flex-wrap items-center gap-2">
		{#each Array(boxStates.filled), i (i)}
			<Filled size={20} />
		{/each}
		{#each Array(boxStates.empty), i (i)}
			<Empty size={20} />
		{/each}
		{#each Array(boxStates.degeneration), i (i)}
			<Degeneration size={20} />
		{/each}
		{#each Array(boxStates.stains), i (i)}
			<Stain size={20} />
		{/each}
	</div>
{/snippet}

{#snippet controls()}
	<div class="flex w-56 flex-col gap-3">
		<div class="font-display text-md text-center tracking-[0.02em] uppercase">Make Corrections</div>
		<!-- Each with the box it draws, as the track shows them -->
		<Stepper
			label="Humanity"
			bind:value={() => humanity, (next) => (character.humanity = next)}
			max={10}
		>
			{#snippet icon()}<Filled size={20} />{/snippet}
		</Stepper>
		<Stepper label="Stains" bind:value={() => stains, (next) => (character.stains = next)} max={10}>
			{#snippet icon()}<Stain size={20} />{/snippet}
		</Stepper>
	</div>
{/snippet}

{#snippet actions()}
	{@const dice = remorseDice(humanity, stains)}
	<div class="flex w-64 flex-col gap-2">
		<div class="font-display text-md text-center tracking-[0.02em] uppercase">Humanity</div>
		{#if onStain}
			<MenuAction
				icon={HeartCrack}
				label="Apply Stains"
				detail={stains >= 10
					? 'Already 10 Stains'
					: stains === 0
						? 'No Stains yet'
						: `${stains} ${stains === 1 ? 'Stain' : 'Stains'} so far`}
				tone="warning"
				disabled={stains >= 10}
				onclick={() => {
					showActions = false;
					onStain();
				}}
			/>
		{/if}
		{#if onRemorse}
			<MenuAction
				icon={HandHeart}
				label="Remorse"
				detail={stains === 0
					? 'No Stains to atone for'
					: `Roll ${dice} ${dice === 1 ? 'die' : 'dice'}`}
				tone="secondary"
				disabled={stains === 0}
				onclick={() => {
					showActions = false;
					onRemorse();
				}}
			/>
		{/if}
	</div>
{/snippet}

{#if editing}
	<Popover
		bind:open={showControls}
		trigger={boxes}
		content={controls}
		triggerTitle="Correct Humanity"
		triggerClass={CLICKABLE}
		arrow
	/>
{:else if onStain || onRemorse}
	<Popover
		bind:open={showActions}
		trigger={boxes}
		content={actions}
		triggerLabel="Humanity actions"
		triggerTitle={actionsTitle}
		triggerClass={CLICKABLE}
		arrow
	/>
{:else}
	{@render boxes()}
{/if}
