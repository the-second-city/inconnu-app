<script lang="ts">
	import { untrack } from 'svelte';
	import { Droplets, Mouth } from '@lucide/svelte';

	import { bloodPotency } from '$lib/vampire';
	import type { Character } from '$lib/types';

	import Card from '$lib/components/Card.svelte';
	import EmptyHunger from './hunger/Empty.svelte';
	import FilledHunger from './hunger/Filled.svelte';
	import MenuAction from './MenuAction.svelte';
	import PipSelector, { type PipState } from './PipSelector.svelte';
	import Popover from '$lib/components/Popover.svelte';
	import { CLICKABLE } from './clickable';

	interface ComponentProps {
		character: Character;
		editing?: boolean;
		// Outside edit mode, clicking Hunger offers these (the owner, or a Storyteller for an SPC)
		onRouse?: () => void;
		onSlake?: () => void;
	}

	let { character = $bindable(), editing = false, onRouse, onSlake }: ComponentProps = $props();

	let showHungerMenu = $state(false);
	// So the menu doesn't reopen by itself when edit mode ends
	$effect(() => {
		if (editing) showHungerMenu = false;
	});

	/** Close the Hunger menu, then run an action from it. */
	const hunger = $derived(character.hunger ?? 0);

	const fromMenu = (action: (() => void) | undefined) => () => {
		showHungerMenu = false;
		action?.();
	};

	// Thin-bloods have 0-2; other vampires 1-10, like the wizard. Discord can set a vampire to 0,
	// which the bot keeps as long as it isn't changed, so a vampire can return to its recorded
	// value. (The sheet is rebuilt for each new character copy, so this is the saved value.)
	const recordedPotency = untrack(() => bloodPotency(character));
	const isThinBlood = $derived(character.splat === 'thin-blood');
	const minBloodPotency = $derived(isThinBlood ? 0 : Math.min(1, recordedPotency));
	const maxBloodPotency = $derived(isThinBlood ? 2 : 10);
</script>

{#snippet potencyPip({ filled, preview }: PipState)}
	<div
		class="h-3 w-3 rounded-full border-2 transition-colors"
		class:bg-red-500={filled || preview}
		class:border-red-500={filled || preview}
		class:border-red-300={!filled && !preview}
		class:opacity-50={preview}
	></div>
{/snippet}

{#snippet hungerPip({ filled, preview }: PipState)}
	{#if filled || preview}
		<span class:opacity-50={preview}><FilledHunger size={20} /></span>
	{:else}
		<EmptyHunger size={20} />
	{/if}
{/snippet}

<Card alignment="center" extraClasses="px-2 h-full justify-center">
	<div class="grid grid-cols-[120px_1fr] items-center gap-2">
		<div>Blood Potency</div>
		<!-- The API sends `potency`; `blood_potency` is the wizard's name for it -->
		<PipSelector
			label="Blood Potency"
			bind:rating={() => bloodPotency(character), (value) => (character.potency = value)}
			min={minBloodPotency}
			max={maxBloodPotency}
			{editing}
			pip={potencyPip}
		/>

		<div>Hunger</div>
		{#snippet hungerPips()}
			<PipSelector
				label="Hunger"
				bind:rating={() => character.hunger ?? 0, (value) => (character.hunger = value)}
				max={5}
				{editing}
				pip={hungerPip}
			/>
		{/snippet}
		{#snippet hungerMenu()}
			<div class="flex w-64 flex-col gap-2">
				<div class="text-md text-center uppercase">Hunger</div>
				{#if onRouse}
					<MenuAction
						icon={Droplets}
						label="Rouse"
						detail={hunger >= 5 ? 'At Hunger 5, a failure risks frenzy' : 'Hunger may rise'}
						tone={hunger >= 5 ? 'warning' : 'primary'}
						onclick={fromMenu(onRouse)}
					/>
				{/if}
				{#if onSlake}
					<MenuAction
						icon={Mouth}
						label="Slake"
						detail={hunger === 0 ? 'No Hunger to slake' : 'Feed to lower Hunger'}
						tone="secondary"
						disabled={hunger === 0}
						onclick={fromMenu(onSlake)}
					/>
				{/if}
			</div>
		{/snippet}
		{#if (onRouse || onSlake) && !editing}
			<!-- Outside edit mode, the drops open the Hunger menu -->
			<Popover
				bind:open={showHungerMenu}
				trigger={hungerPips}
				content={hungerMenu}
				triggerLabel="Hunger actions"
				triggerClass={CLICKABLE}
				arrow
			/>
		{:else}
			{@render hungerPips()}
		{/if}
	</div>
</Card>
