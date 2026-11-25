<script lang="ts">
	import { ChevronUp, Loader2, Minimize2, Plus, X } from '@lucide/svelte';

	import { plural } from '$lib';

	import { getConstraints, lengthError, macroNameError } from '$lib/constraints';
	import { FORM_CLASSES } from '$lib/constants/formStyles';
	import { saveMacros } from '$lib/api/macros';
	import { BusySubmit } from '$lib/state/busySubmit.svelte';
	import { resolvePool } from '$lib/rules/macros';
	import { isVampiric } from '$lib/rules/vampire';
	import type { Character, Macro } from '$lib/types';
	import BusySpinner from '$lib/components/ui/BusySpinner.svelte';
	import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
	import Stepper from '$lib/components/ui/Stepper.svelte';
	import PoolText from './PoolText.svelte';

	interface ComponentProps {
		character: Character;
		oncancel: () => void; // Back to the list, discarding the macro
		onsaved: () => void; // The macro saved; the live update brings it to the list
		dirty?: boolean; // Whether anything differs from a blank form, so leaving should ask
		// Collapsed to a strip (the name, the pool, Add), leaving the sheet clear for picking traits
		compact?: boolean;
	}

	let {
		character,
		oncancel,
		onsaved,
		dirty = $bindable(false),
		compact = $bindable(false)
	}: ComponentProps = $props();

	const id = $props.id();

	// The bot's limits, from the page (CharacterPage provides them)
	const constraints = getConstraints();

	// The new macro. Defaults as `/macro create`'s: Hunger on, no Rouse Checks, no Difficulty.
	let name = $state('');
	let difficulty = $state(0);
	let rouses = $state(0);
	let hunger = $state(true);
	let rerollRouses = $state(false);
	let stains = $state(false);
	let hunt = $state(false);
	let comment = $state('');
	// Built by clicking traits on the sheet (not yet): the bot's expanded tokens (see `Macro`)
	const pool: string[] = $state([]);

	// Vampires roll Hunger, hunt, and Rouse; ghouls Rouse too (taking damage instead); mortals neither
	const vampiric = $derived(isVampiric(character.splat));
	const rousing = $derived(vampiric || character.splat === 'ghoul');

	const trimmedName = $derived(name.trim());
	const nameError = $derived(
		macroNameError(
			trimmedName,
			(character.macros ?? []).map((macro) => macro.name),
			constraints()
		)
	);
	const commentError = $derived(
		lengthError(comment.trim(), constraints().macro_comment_max_length)
	);
	const resolved = $derived(resolvePool(pool, character));
	// A macro rolls a pool or makes Rouse Checks (the bot's `check_has_action`)
	const hasAction = $derived(pool.length > 0 || rouses > 0);
	const valid = $derived(!nameError && !commentError && hasAction);

	// Anything typed, picked, or toggled away from the defaults
	$effect(() => {
		dirty =
			trimmedName !== '' ||
			comment.trim() !== '' ||
			difficulty !== 0 ||
			rouses !== 0 ||
			!hunger ||
			hunt ||
			rerollRouses ||
			stains ||
			pool.length > 0;
	});

	/** The macro as the bot stores it. Options that can't apply are off. */
	const macro = (): Macro => ({
		name: trimmedName,
		pool: $state.snapshot(pool),
		hunger: vampiric ? hunger : true,
		difficulty,
		rouses: rousing ? rouses : 0,
		reroll_rouses: vampiric && rouses > 0 && rerollRouses,
		staining: vampiric && rouses > 0 && stains ? 'apply' : 'show',
		hunt: vampiric && hunt,
		comment: comment.trim() || null
	});

	const submit = new BusySubmit();

	const save = async (e: SubmitEvent) => {
		e.preventDefault();
		if (!valid) return;
		const macros = [...(character.macros ?? []), macro()];
		if (await submit.run(() => saveMacros(character._id, macros))) onsaved();
	};

	interface Option {
		label: string;
		detail: string;
		checked: () => boolean;
		set: (value: boolean) => void;
		disabled?: boolean;
	}

	// The checkboxes: what a vampire's macro can do besides roll its pool
	const options: Option[] = $derived(
		vampiric
			? [
					{
						label: 'Hunger dice',
						detail: 'Roll current Hunger as Hunger dice',
						checked: () => hunger,
						set: (value) => (hunger = value)
					},
					{
						label: 'Hunt',
						detail: 'On a win, offer to slake Hunger',
						checked: () => hunt,
						set: (value) => (hunt = value)
					},
					{
						label: 'Re-roll Rouse failures',
						detail: 'As Blood Potency allows',
						checked: () => rerollRouses,
						set: (value) => (rerollRouses = value),
						disabled: rouses === 0
					},
					{
						label: 'Oblivion Stains',
						detail: 'Rouse Checks can Stain, as Oblivion’s do',
						checked: () => stains,
						set: (value) => (stains = value),
						disabled: rouses === 0
					}
				]
			: []
	);
</script>

<!--
@component
A new macro's form, in the macro panel: its name, then the pool (built by clicking traits on the
sheet), then its Difficulty, Rouse Checks, options, and comment. Adding saves the character's macros with it.
`compact` collapses it to a strip (the name, the pool and its dice, and buttons to show the details,
cancel, and add), so the sheet stays clear while traits are picked; the details are kept.
-->
<form class="flex flex-col gap-4" onsubmit={save} aria-label="New macro">
	{#if compact}
		<div class="flex items-center gap-2">
			<div class="min-w-0 flex-1">
				<div class="flex items-baseline gap-2">
					<span class="font-display truncate text-sm tracking-[0.04em]">
						{trimmedName || 'New Macro'}
					</span>
					{#if pool.length > 0 && resolved.dice !== null}
						<span class="font-display text-primary-300 shrink-0 text-sm tabular-nums">
							{plural(resolved.dice, 'die', 'dice')}
						</span>
					{/if}
				</div>
				{#if pool.length > 0}
					<PoolText terms={resolved.terms} />
				{:else}
					<p class="text-surface-300 text-sm italic">
						Click traits on the sheet to build the pool.
					</p>
				{/if}
			</div>
			<button
				type="button"
				class="btn-icon hover:preset-tonal-surface shrink-0"
				onclick={() => (compact = false)}
				aria-label="Show details"
				title="Show details"
			>
				<ChevronUp size={18} />
			</button>
			<button
				type="button"
				class="btn-icon hover:preset-tonal-surface shrink-0"
				onclick={oncancel}
				disabled={submit.busy}
				aria-label="Cancel"
				title="Cancel"
			>
				<X size={18} />
			</button>
			<button
				type="submit"
				class="btn btn-sm btn-gothic btn-gothic-blood shrink-0"
				disabled={!valid || submit.busy}
				aria-busy={submit.busy}
				aria-label="Add Macro"
			>
				{#if submit.busy}
					<Loader2 size={16} class="animate-spin" />
				{:else}
					<Plus size={16} />
				{/if}
				<span>Add</span>
			</button>
		</div>
		{#if submit.error}
			<p class="{FORM_CLASSES.error} card preset-tonal-error p-2" role="alert">{submit.error}</p>
		{/if}
	{:else if submit.busy}
		<BusySpinner label="Adding the macro…" />
	{:else}
		<div>
			<label class="mb-1 block font-semibold" for="{id}-name">Name</label>
			<input
				bind:value={name}
				{@attach (input) => input.focus()}
				class="input {trimmedName && nameError ? 'border-error-500' : ''}"
				id="{id}-name"
				type="text"
				maxlength={constraints().macro_name_max_length}
				autocomplete="off"
				spellcheck="false"
				placeholder="feed"
				aria-required="true"
				aria-invalid={trimmedName !== '' && nameError !== null}
				aria-describedby="{id}-name-error"
			/>
			<!-- Not while it's empty: a new form isn't wrong yet -->
			<ErrorMessage error={trimmedName ? nameError : null} id="{id}-name-error" />
		</div>
		<section
			class="border-surface-500 flex flex-col gap-2 border-y py-3"
			aria-labelledby="{id}-pool"
		>
			<div class="flex items-center justify-between">
				<h3 id="{id}-pool" class="font-display text-sm tracking-[0.04em] uppercase">Pool</h3>
				<button
					type="button"
					class="btn btn-sm hover:preset-tonal-surface"
					onclick={() => (compact = true)}
				>
					<Minimize2 size={14} />
					<span>Pick traits</span>
				</button>
			</div>
			{#if pool.length > 0}
				<PoolText terms={resolved.terms} />
			{:else}
				<p class="text-surface-300 italic">Click traits on the sheet to build the pool.</p>
			{/if}
		</section>

		<div class="flex flex-col gap-2">
			<Stepper label="Difficulty" bind:value={difficulty} {...constraints().macro_difficulty} />
			{#if rousing}
				<Stepper label="Rouse Checks" bind:value={rouses} {...constraints().macro_rouses} />
			{/if}
		</div>

		{#if options.length > 0}
			<fieldset class="flex flex-col gap-2">
				<legend class="sr-only">Options</legend>
				{#each options as option, i (option.label)}
					<label
						class={['flex items-start gap-3', option.disabled ? 'opacity-50' : 'cursor-pointer']}
					>
						<input
							type="checkbox"
							class="checkbox mt-1"
							checked={option.checked()}
							onchange={(e) => option.set(e.currentTarget.checked)}
							disabled={option.disabled}
							aria-labelledby="{id}-option-{i}-label"
							aria-describedby="{id}-option-{i}"
						/>
						<span class="flex flex-col leading-tight">
							<span id="{id}-option-{i}-label">{option.label}</span>
							<span id="{id}-option-{i}" class="text-surface-300 text-sm">{option.detail}</span>
						</span>
					</label>
				{/each}
			</fieldset>
		{/if}

		<div>
			<label class="mb-1 block font-semibold" for="{id}-comment">
				Comment <span class="text-surface-400 font-normal">(optional)</span>
			</label>
			<textarea
				bind:value={comment}
				class="textarea {commentError ? 'border-error-500' : ''}"
				id="{id}-comment"
				rows="2"
				placeholder="Shown with the roll"
				aria-invalid={commentError !== null}
				aria-describedby="{id}-comment-error"
			></textarea>
			<ErrorMessage error={commentError} id="{id}-comment-error" />
		</div>

		{#if submit.error}
			<p class="{FORM_CLASSES.error} card preset-tonal-error p-3" role="alert">{submit.error}</p>
		{/if}

		<div class="flex justify-end gap-2">
			<button type="button" class="btn btn-gothic btn-gothic-ash" onclick={oncancel}>
				Cancel
			</button>
			<button type="submit" class="btn btn-gothic btn-gothic-blood" disabled={!valid}>
				<Plus size={18} />
				<span>Add Macro</span>
			</button>
		</div>
	{/if}
</form>
