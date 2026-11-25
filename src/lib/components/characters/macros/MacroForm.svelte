<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowRight, Minimize2, Plus, SaveCheck, X } from '@lucide/svelte';

	import { orList, plural } from '$lib';

	import { getConstraints, lengthError, macroNameError } from '$lib/constraints';
	import { FORM_CLASSES } from '$lib/constants/formStyles';
	import { saveMacros } from '$lib/api/macros';
	import { BusySubmit } from '$lib/state/busySubmit.svelte';
	import { getPoolPicker, isNumber } from '$lib/state/poolPicker.svelte';
	import { difficultyName } from '$lib/rules/dice';
	import { resolvePool } from '$lib/rules/macros';
	import { isVampiric } from '$lib/rules/vampire';
	import type { Character, Macro } from '$lib/types';
	import BusySpinner from '$lib/components/ui/BusySpinner.svelte';
	import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
	import Stepper from '$lib/components/ui/Stepper.svelte';
	import PoolChips from './PoolChips.svelte';
	import { randomPlaceholder } from './placeholders';

	interface ComponentProps {
		character: Character;
		macro?: Macro; // The macro to edit; a new one without it
		oncancel: () => void; // Back to the list, discarding the macro
		onsaved: () => void; // The macro saved; the live update brings it to the list
		dirty?: boolean; // Whether anything differs from where it started, so leaving should ask
		// Collapsed to a strip (the name, the pool, Continue), leaving the sheet clear for picking traits
		compact?: boolean;
	}

	let {
		character,
		macro: original,
		oncancel,
		onsaved,
		dirty = $bindable(false),
		compact = $bindable(false)
	}: ComponentProps = $props();

	const id = $props.id();

	// The bot's limits, from the page (CharacterPage provides them)
	const constraints = getConstraints();

	// A new macro's Difficulty: 2, Straightforward in V5's table, as most rolls' default; 0 is none
	const DEFAULT_DIFFICULTY = 2;

	// The macro being edited, as it started (taken once: the form edits its own copy)
	const start = untrack(() => original);
	// The macro. A new one has `/macro create`'s defaults: Hunger on, no Rouse Checks
	let name = $state(start?.name ?? '');
	// Chosen once per form, from the names the character hasn't used
	const placeholder = randomPlaceholder(
		untrack(() => (character.macros ?? []).map((macro) => macro.name))
	);
	let difficulty = $state(start?.difficulty ?? DEFAULT_DIFFICULTY);
	let rouses = $state(start?.rouses ?? 0);
	let hunger = $state(start?.hunger ?? true);
	let rerollRouses = $state(start?.reroll_rouses ?? false);
	let stains = $state(start?.staining === 'apply');
	let hunt = $state(start?.hunt ?? false);
	let comment = $state(start?.comment ?? '');
	// Picked from the sheet (the page's pool picker), as the bot's expanded tokens (see `Macro`).
	// Editing starts with the macro's pool picked
	const picker = getPoolPicker();
	if (start) untrack(() => picker?.load(start.pool, character));
	const pool: string[] = $derived(picker?.tokens(character.traits) ?? []);

	// Vampires roll Hunger, hunt, and Rouse; ghouls Rouse too (taking damage instead); mortals neither
	const vampiric = $derived(isVampiric(character.splat));
	const rousing = $derived(vampiric || character.splat === 'ghoul');

	const trimmedName = $derived(name.trim());
	const nameError = $derived(
		macroNameError(
			trimmedName,
			// Its own name isn't taken
			(character.macros ?? []).map((macro) => macro.name).filter((n) => n !== start?.name),
			constraints()
		)
	);
	const commentError = $derived(
		lengthError(comment.trim(), constraints().macro_comment_max_length)
	);
	const resolved = $derived(resolvePool(pool, character));
	// Picks the character lacks (from an edited macro), which the bot won't save
	const missing = $derived(
		resolved.terms.filter((term) => term.missing !== null).map((term) => term.name)
	);
	// A macro rolls a pool or makes Rouse Checks (the bot's `check_has_action`)
	const hasAction = $derived(pool.length > 0 || rouses > 0);
	// A pool must add something: all subtracted (say, its last trait removed), it can't roll
	const addsNothing = $derived(pool.length > 0 && !picker?.adds);

	// The pool's number, beyond its traits. The bot sets no limit; this keeps the stepper sensible
	const MODIFIER_LIMIT = 10;
	// Subtracting needs something to subtract from
	const canSubtract = $derived(picker?.picks.some((pick) => !pick.negative && !isNumber(pick)));
	const modifierDetail = (value: number): string =>
		value === 0
			? 'Dice beyond the traits'
			: `${value > 0 ? 'Adds' : 'Subtracts'} ${plural(Math.abs(value), 'die', 'dice')}`;

	/** The macro as the bot stores it. Options that can't apply are off. */
	const macro = (): Macro => ({
		name: trimmedName,
		pool: $state.snapshot(pool),
		hunger: vampiric ? hunger : true,
		difficulty,
		rouses: rousing ? rouses : 0,
		reroll_rouses: vampiric && rouses > 0 && rerollRouses,
		// Without Stains, an edited macro keeps how it showed them
		staining:
			vampiric && rouses > 0 && stains
				? 'apply'
				: start && start.staining !== 'apply'
					? start.staining
					: 'show',
		hunt: vampiric && hunt,
		comment: comment.trim() || null
	});

	// Anything typed, picked, or toggled since the form opened (blank, or the macro as it was)
	const initial = untrack(() => JSON.stringify(macro()));
	const changed = $derived(JSON.stringify(macro()) !== initial);
	$effect(() => {
		dirty = changed;
	});
	// An edit saves once something changed
	// Why the macro can't be added (or saved) yet, by the buttons: its own message may be scrolled
	// out of sight (an empty name's isn't shown at all)
	const blocker: string | null = $derived.by(() => {
		if (trimmedName === '') return 'Needs a name';
		if (nameError) return 'The name needs fixing';
		if (!hasAction) return 'Needs a pool or Rouse Checks';
		if (addsNothing) return 'The pool needs something to add';
		if (missing.length > 0) return 'The pool has traits that aren’t on the sheet';
		if (commentError) return 'The comment is too long';
		if (start && !changed) return 'No changes yet';
		return null;
	});
	const valid = $derived(blocker === null);

	const submit = new BusySubmit();

	const save = async (e: SubmitEvent) => {
		e.preventDefault();
		if (!valid) return;
		// An edited macro replaces itself (if it's still there), keeping the others
		const others = (character.macros ?? []).filter((m) => m.name !== start?.name);
		const macros = [...others, macro()];
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
						label: 'Automatic Hunger',
						detail: 'Use current Hunger when rolling',
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
A macro's form, in the macro panel, for a new one or (with `macro`) editing one: its name, then the pool (built by clicking traits on the
sheet), then its Difficulty, Rouse Checks, options, and comment. Adding saves the character's macros with it.
`compact` collapses it to a strip (the name, the pool and its dice, Cancel, and Continue), so the sheet stays clear while traits are picked; Continue opens the
details, kept as they were, where the macro is added (or saved). Editing loads the macro's pool
into the picker, and saving replaces the macro, by its name as it started.
-->
<!-- The pool's dice, in the strip and by the Pool heading: "?" while a trait is missing, as the
     macro cards show it -->
{#snippet dice()}
	{#if pool.length > 0}
		<span class="font-display text-primary-300 shrink-0 text-sm tabular-nums">
			{resolved.dice === null ? '? dice' : plural(resolved.dice, 'die', 'dice')}
		</span>
	{/if}
{/snippet}

<form
	class="flex flex-col gap-4"
	onsubmit={save}
	aria-label={start ? `Edit ${start.name}` : 'New macro'}
>
	{#if compact}
		<div class="flex flex-col gap-1.5">
			<div class="flex items-center gap-2">
				<div class="flex min-w-0 flex-1 items-baseline gap-2">
					<span class="font-display truncate text-sm tracking-[0.04em]">
						{trimmedName || start?.name || 'New Macro'}
					</span>
					{@render dice()}
				</div>
				<button
					type="button"
					class="btn-icon hover:preset-tonal-surface shrink-0"
					onclick={oncancel}
					aria-label="Cancel"
					title="Cancel"
				>
					<X size={18} />
				</button>
				<!-- On from the pool to the details, where the macro is added -->
				<button
					type="button"
					class="btn btn-sm btn-gothic btn-gothic-bone shrink-0"
					onclick={() => (compact = false)}
				>
					<span>Continue</span>
					<ArrowRight size={16} />
				</button>
			</div>
			<!-- Below, the whole width: many traits wrap here rather than squeezing the buttons -->
			{#if pool.length > 0}
				{#if picker}<PoolChips {picker} traits={character.traits} {missing} />{/if}
			{:else}
				<p class="text-surface-300 text-sm italic">Click traits on the sheet to build the pool.</p>
			{/if}
		</div>
	{:else if submit.busy}
		<BusySpinner label={start ? 'Saving the macro…' : 'Adding the macro…'} />
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
				{placeholder}
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
				<div class="flex items-baseline gap-2">
					<h3 id="{id}-pool" class="font-display text-sm tracking-[0.04em] uppercase">Pool</h3>
					{@render dice()}
				</div>
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
				{#if picker}<PoolChips {picker} traits={character.traits} {missing} />{/if}
			{:else}
				<p class="text-surface-300 italic">Click traits on the sheet to build the pool.</p>
			{/if}
			{#if missing.length > 0}
				<p class="text-warning-300 text-sm">
					{orList(missing)}
					{missing.length === 1 ? 'isn’t' : 'aren’t'} on the sheet. Remove {missing.length === 1
						? 'it'
						: 'them'} to save.
				</p>
			{/if}
			{#if addsNothing}
				<p class="text-warning-300 text-sm">A pool needs something to add.</p>
			{/if}
			{#if picker}
				<Stepper
					label="Modifier"
					bind:value={() => picker.modifier, (value) => (picker.modifier = value)}
					min={canSubtract || picker.modifier < 0 ? -MODIFIER_LIMIT : 0}
					max={MODIFIER_LIMIT}
					detail={modifierDetail(picker.modifier)}
				/>
			{/if}
		</section>

		<div class="flex flex-col gap-2">
			<Stepper
				label="Difficulty"
				bind:value={difficulty}
				{...constraints().macro_difficulty}
				detail={difficultyName(difficulty)}
			/>
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

		<div class="flex flex-col items-end gap-1.5">
			{#if blocker}
				<p id="{id}-blocker" class="text-surface-300 text-sm italic">{blocker}</p>
			{/if}
			<div class="flex justify-end gap-2">
				<button type="button" class="btn btn-gothic btn-gothic-ash" onclick={oncancel}>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-gothic btn-gothic-blood"
					disabled={!valid}
					aria-describedby={blocker ? `${id}-blocker` : undefined}
				>
					{#if start}
						<SaveCheck size={18} />
						<span>Save Macro</span>
					{:else}
						<Plus size={18} />
						<span>Add Macro</span>
					{/if}
				</button>
			</div>
		</div>
	{/if}
</form>
