<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	import { isVampiric } from '$lib/rules/vampire';
	import type { Range, Trait, Splat } from '$lib/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { Loader2 } from '@lucide/svelte';
	import TraitSheet from '$lib/components/characters/sheet/TraitSheet.svelte';
	import RatingSelector from '$lib/components/characters/sheet/RatingSelector.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Selector from '$lib/components/ui/Selector.svelte';
	import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
	import { FORM_CLASSES } from '$lib/constants/formStyles';
	import { creationInfoStore } from '$lib/stores/CreationStore';
	import { normalize, getErrorDetail } from '$lib';
	import { characterNameError, lengthError, maxCodeUnits, setConstraints } from '$lib/constraints';
	import Meta from '$lib/components/layout/Meta.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ModalActions from '$lib/components/ui/ModalActions.svelte';
	import { TimerOff } from '@lucide/svelte';
	import WizardCountdown from './WizardCountdown.svelte';

	let { data }: { data: PageData } = $props();
	// What the bot accepts, here and in the trait sheet
	const constraints = $derived(data.constraints);
	setConstraints(() => constraints);
	// The form starts from the wizard's traits, then owns them
	let traits = $state<Trait[]>(untrack(() => data.traits));
	let name = $state('');
	let splat = $state('');
	let health = $state('');
	let willpower = $state('');
	let humanity = $state('7');
	let blood_potency = $state(1);
	let convictions = $state<string[]>(
		untrack(() => Array<string>(data.constraints.conviction_count).fill(''))
	);
	let description = $state('');
	let history = $state('');
	let submitting = $state(false);
	// The link's time ran out: the bot would refuse the character, so creating waits on a new link
	let expired = $state(false);
	// Says so when it does; closing it keeps the form, to copy into a new link
	let expiredNotice = $state(false);

	let previousSplat = $state('');

	// Reset blood potency and clear disciplines when switching splat types
	$effect(() => {
		if (splat !== previousSplat) {
			blood_potency = isVampiric(splat) ? potencyRange.min : 0;
			if (splat === 'mortal') {
				traits = traits.filter((t) => t.type !== 'discipline');
			}
			previousSplat = splat;
		}
	});

	const title = $derived(`New Character on ${data.guild.name}`);
	const characterType = $derived(data.spc ? 'New SPC' : 'New Character');

	// Format splat names for display
	const formatSplat = (str: string) => {
		if (str === 'thin-blood') return 'Thin-Blood';
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	};
	const splatOptions = $derived(data.splats.map(formatSplat));
	/** The ratings from a track's fewest to most boxes, as the bot allows. */
	const rangeOptions = ({ min, max }: Range): string[] =>
		Array.from({ length: max - min + 1 }, (_, i) => `${i + min}`);
	const healthOptions = $derived(rangeOptions(constraints.trackers.health));
	const willpowerOptions = $derived(rangeOptions(constraints.trackers.willpower));
	// From 1: a new character with no Humanity would be a wight
	const humanityOptions = $derived(
		rangeOptions({ min: Math.max(1, constraints.humanity.min), max: constraints.humanity.max })
	);
	// Thin-bloods have the bot's range; other vampires start at 1
	const potencyRange: Range = $derived.by(() => {
		const range = constraints.potency[splat as Splat] ?? { min: 0, max: 0 };
		return splat === 'thin-blood' ? range : { min: Math.max(1, range.min), max: range.max };
	});

	// Character name validation
	const normalizedName = $derived(normalize(name));
	const isValidCharacterName = $derived(characterNameError(normalizedName, constraints) === null);
	// Don't show an error for an empty field
	const nameError = $derived(
		name.length === 0 ? null : characterNameError(normalizedName, constraints)
	);

	// Collapsed as the bot stores them, so extra spaces don't count against the length
	const normalizedConvictions = $derived(convictions.map(normalize));
	const convictionErrors = $derived(
		normalizedConvictions.map((conviction) =>
			lengthError(conviction, constraints.conviction_max_length)
		)
	);
	const descriptionError = $derived(lengthError(description, constraints.profile_max_length));
	const historyError = $derived(lengthError(history, constraints.profile_max_length));

	const isFormValid = $derived(
		isValidCharacterName &&
			health !== '' &&
			willpower !== '' &&
			splat !== '' &&
			convictionErrors.every((error) => error === null) &&
			!descriptionError &&
			!historyError &&
			!submitting &&
			!expired
	);

	const submitLabel = $derived.by(() => {
		if (expired) return 'Link expired';
		return isFormValid ? `Create ${normalizedName}` : 'Fill out the form first';
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		// Only Create submits, and only when the form is complete: not Enter in an incomplete form,
		// a submit while one is under way, or after the link expired
		if (!isFormValid) return;
		submitting = true;

		const payload = {
			name: normalizedName,
			splat,
			health: parseInt(health),
			willpower: parseInt(willpower),
			humanity: parseInt(humanity),
			blood_potency: isVampiric(splat) ? blood_potency : 0,
			convictions: normalizedConvictions,
			biography: history,
			description,
			traits
		};

		try {
			const response = await fetch(`/api/wizard/${data.token}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				if (response.status === 404) {
					alert('This wizard has expired. Please run the command again in Discord.');
					goto(resolve('/wizard'));
					return;
				}
				alert(await getErrorDetail(response, 'Failed to create character.'));
				return;
			}

			const result = await response.json();

			// Store character info and redirect to success page
			creationInfoStore.set({
				character_id: result.character_id,
				guild: result.guild,
				character_name: result.character_name,
				has_premium: result.has_premium
			});

			goto(resolve('/wizard/success'));
		} catch (error) {
			alert('An unexpected error occurred. Please try again.');
			console.error('Error creating character:', error);
		} finally {
			submitting = false;
		}
	}
</script>

<Meta
	title="{title} | Inconnu"
	description="Create a new character for Vampire: The Masquerade 5th Edition using Inconnu's character wizard."
/>

<div class="flex flex-wrap items-start justify-between gap-2">
	<div>
		<h1 class="h1 font-black tracking-wide">{characterType}</h1>
		<div class="flex justify-end">
			<h6 class="text-surface-800-200 flex items-center gap-4 italic">
				{data.guild.name}
				<Avatar src={data.guild.icon ?? undefined} name={data.guild.name} size="size-6" />
			</h6>
		</div>
	</div>
	<WizardCountdown
		expiresIn={data.expiresIn}
		onexpire={() => {
			expired = true;
			expiredNotice = true;
		}}
	/>
</div>

<Modal bind:open={expiredNotice} title="Link Expired" role="alertdialog">
	{#snippet header()}
		<div class="text-error-600-400 flex justify-center">
			<TimerOff size={32} aria-hidden="true" />
		</div>
	{/snippet}
	{#snippet description()}
		<p>
			This wizard link has expired. Run <code>/character wizard</code> in Discord again for a new one.
		</p>
		<p>The form keeps what you've entered, so you can copy it over.</p>
	{/snippet}
	<ModalActions bind:open={expiredNotice} done />
</Modal>

<form onsubmit={handleSubmit}>
	<div class="mb-6 flex flex-col gap-9">
		<!-- Group 1: Basics -->
		<div class="-mx-3 flex flex-wrap">
			<div class="w-full px-3">
				<label class={FORM_CLASSES.label} for="character-name">Name</label>
				<input
					bind:value={name}
					class="{FORM_CLASSES.textInput} {nameError ? 'border-error-500' : ''}"
					id="character-name"
					type="text"
					maxlength={maxCodeUnits(constraints.name_max_length) + 7}
					placeholder="Nadea Theron"
					aria-required="true"
					aria-describedby={nameError ? 'name-error' : undefined}
				/>
				<ErrorMessage error={nameError} id="name-error" />
			</div>

			<!-- Health -->
			<div class="w-full px-3 md:w-1/2">
				<Selector
					label="Health"
					options={healthOptions}
					bind:value={health}
					id="health"
					placeholder="Select Health rating"
					required={true}
				/>
			</div>
			<!-- Willpower -->
			<div class="w-full px-3 md:w-1/2">
				<Selector
					label="Willpower"
					options={willpowerOptions}
					bind:value={willpower}
					id="willpower"
					placeholder="Select Willpower rating"
					required={true}
				/>
			</div>

			<!-- Humanity -->
			<div class="w-full px-3">
				<Selector label="Humanity" options={humanityOptions} bind:value={humanity} id="humanity" />
			</div>
		</div>

		<!-- Group 2: Convictions -->
		<div class="-mx-3 flex flex-wrap">
			<div class="w-full px-3">
				<label class={FORM_CLASSES.label} for="conviction-1">Convictions</label>
				{#each convictions, i (i)}
					{@const error = convictionErrors[i]}
					<input
						bind:value={convictions[i]}
						class="{FORM_CLASSES.textInput} {error ? 'border-error-500' : ''}"
						id="conviction-{i + 1}"
						type="text"
						maxlength={maxCodeUnits(constraints.conviction_max_length)}
						placeholder="Conviction {i + 1}"
						aria-label={i === 0 ? undefined : `Conviction ${i + 1}`}
						aria-describedby={error ? `conviction-${i + 1}-error` : undefined}
					/>
					<ErrorMessage {error} id="conviction-{i + 1}-error" />
				{/each}
			</div>
		</div>

		<!-- Group 3: Biography -->
		<div class="-mx-3 flex flex-wrap">
			<div class="w-full px-3">
				<label class={FORM_CLASSES.label} for="description">Description</label>
				<textarea
					bind:value={description}
					class="{FORM_CLASSES.textarea} {descriptionError ? 'border-error-500' : ''}"
					id="description"
					rows="4"
					maxlength={maxCodeUnits(constraints.profile_max_length)}
					placeholder="Describe your character..."
					aria-describedby={descriptionError ? 'description-error' : undefined}
				></textarea>
				<ErrorMessage error={descriptionError} id="description-error" />
			</div>

			<div class="w-full px-3">
				<label class={FORM_CLASSES.label} for="history">History</label>
				<textarea
					bind:value={history}
					class="{FORM_CLASSES.textarea} {historyError ? 'border-error-500' : ''}"
					id="history"
					rows="4"
					maxlength={maxCodeUnits(constraints.profile_max_length)}
					placeholder="Your character's background and history..."
					aria-describedby={historyError ? 'history-error' : undefined}
				></textarea>
				<ErrorMessage error={historyError} id="history-error" />
			</div>
		</div>

		<!-- Group 4: Template -->
		<div class="-mx-3 flex flex-wrap">
			<div class="w-full px-3">
				<Selector
					label="Template"
					options={splatOptions}
					bind:value={splat}
					id="character-type"
					placeholder="Select a character type"
					required={true}
				/>
			</div>
		</div>
	</div>

	{#if splat !== ''}
		<TraitSheet bind:traits splat={splat as Splat} editing={true} />

		{#if isVampiric(splat)}
			<div class="mt-3">
				<Card>
					<h3 class="h3 mb-2 text-center text-xl font-semibold uppercase">Blood Potency</h3>
					<div class="flex justify-center">
						<RatingSelector
							name="Blood Potency"
							bind:rating={blood_potency}
							min={potencyRange.min}
							max={potencyRange.max}
							showLabel={false}
							editing={true}
							allowsSubtraits={false}
						/>
					</div>
				</Card>
			</div>
		{/if}

		<div class="mt-3 px-4 text-center">
			<small>
				To accommodate potential house rules, this wizard lets you create "invalid" characters. If
				you're unsure of how to build a character, read the fourth chapter of V5 core, starting on
				p.133.
			</small>
		</div>

		<div class="mt-6">
			<button
				type="submit"
				class="btn preset-filled-primary-500 flex w-full items-center justify-center gap-2 hover:brightness-110"
				disabled={!isFormValid}
				aria-busy={submitting}
			>
				{#if submitting}
					<Loader2 class="animate-spin" size={20} aria-hidden="true" />
				{/if}
				{submitting ? 'Creating...' : submitLabel}
			</button>
		</div>

		<!-- Screen reader announcements -->
		<div class="sr-only" aria-live="polite" aria-atomic="true">
			{#if submitting}
				Creating character, please wait...
			{/if}
		</div>
	{/if}
</form>
