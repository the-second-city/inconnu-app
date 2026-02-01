<script lang="ts">
	import type { PageData } from './$types';
	import type { Trait } from '$lib/types';
	import { goto } from '$app/navigation';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { Loader2 } from '@lucide/svelte';
	import TraitSheet from '$lib/components/characters/sheets/TraitSheet.svelte';
	import RatingSelector from '$lib/components/characters/sheets/components/RatingSelector.svelte';
	import Card from '$lib/components/Card.svelte';
	import Selector from '$lib/components/Selector.svelte';
	import { creationInfoStore } from '$lib/stores/CreationStore';
	import { normalize } from '$lib';

	let { data }: { data: PageData } = $props();
	let traits = $state<Trait[]>(data.traits);
	let name = $state('');
	let splat = $state('');
	let health = $state('');
	let willpower = $state('');
	let humanity = $state('7');
	let blood_potency = $state(1);
	let conviction1 = $state('');
	let conviction2 = $state('');
	let conviction3 = $state('');
	let description = $state('');
	let history = $state('');
	let submitting = $state(false);

	const title = $derived(`New Character on ${data.guild.name}`);
	const characterType = $derived(data.spc ? 'New SPC' : 'New character');

	// Format splat names for display
	const formatSplat = (str: string) => {
		if (str === 'thinblood') return 'Thin-Blood';
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	};
	const splatOptions = $derived(data.splats.map(formatSplat));
	const healthOptions = Array.from({ length: 17 }, (_, i) => `${i + 4}`);
	const willpowerOptions = Array.from({ length: 9 }, (_, i) => `${i + 2}`);
	const humanityOptions = Array.from({ length: 10 }, (_, i) => `${i + 1}`);

	// Character name validation
	const normalizedName = $derived(normalize(name));
	const isValidCharacterName = $derived.by(() => {
		if (!normalizedName) return false;
		if (normalizedName.length > 30) return false;
		return /^([^\W]|[-_\s'])+$/.test(normalizedName);
	});
	const nameError = $derived.by(() => {
		if (name.length === 0) return null; // Don't show error for empty field
		if (!normalizedName) return 'Name cannot be empty';
		if (normalizedName.length > 30) return 'Name must be 30 characters or less';
		if (!/^([^\W]|[-_\s'])+$/.test(normalizedName)) {
			return 'Name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes';
		}
		return null;
	});

	// Conviction validation
	const conviction1Error = $derived(conviction1.length > 200 ? 'Maximum 200 characters' : null);
	const conviction2Error = $derived(conviction2.length > 200 ? 'Maximum 200 characters' : null);
	const conviction3Error = $derived(conviction3.length > 200 ? 'Maximum 200 characters' : null);

	// Biography validation
	const descriptionError = $derived(description.length > 1024 ? 'Maximum 1024 characters' : null);
	const historyError = $derived(history.length > 1024 ? 'Maximum 1024 characters' : null);

	const isFormValid = $derived(
		isValidCharacterName &&
			health !== '' &&
			willpower !== '' &&
			splat !== '' &&
			!conviction1Error &&
			!conviction2Error &&
			!conviction3Error &&
			!descriptionError &&
			!historyError &&
			!submitting
	);

	const submitLabel = $derived(isFormValid ? `Create ${normalizedName}` : 'Fill out the form first');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;

		const payload = {
			name: normalizedName,
			splat,
			health: parseInt(health),
			willpower: parseInt(willpower),
			humanity: parseInt(humanity),
			blood_potency: splat === 'vampire' || splat === 'thinblood' ? blood_potency : 0,
			convictions: [conviction1, conviction2, conviction3],
			biography: description,
			history,
			traits
		};

		try {
			// TODO: Remove this delay after testing
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const response = await fetch(`/api/wizard/${data.token}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: 'Failed to create character.' }));
				alert(errorData.message);
				return;
			}

			const result = await response.json();

			// Store character info and redirect to success page
			creationInfoStore.set({
				characterId: result.id,
				guildName: data.guild.name,
				guildIcon: data.guild.icon,
				characterName: normalizedName
			});

			goto('/wizard/success');
		} catch (error) {
			alert('An unexpected error occurred. Please try again.');
			console.error('Error creating character:', error);
		} finally {
			submitting = false;
		}
	}

	const labelClass = 'mb-2 block text-lg uppercase tracking-wide';
	const inputClass = 'input input-bordered mb-3 block w-full border px-4 py-3 leading-tight';
</script>

<svelte:head>
	<title>{title} | inconnu.app</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-2">
	<div>
		<h1 class="h1 uppercase tracking-wide">{characterType}</h1>
		<div class="flex justify-end">
			<h6 class="text-surface-800-200 flex items-center gap-4 italic">
				{data.guild.name}
				<Avatar src={data.guild.icon} name={data.guild.name} size="size-6" />
			</h6>
		</div>
	</div>
</div>

<form onsubmit={handleSubmit}>
	<div class="mb-6 flex flex-col gap-9">
		<!-- Group 1: Basics -->
		<div class="-mx-3 flex flex-wrap">
			<div class="w-full px-3">
				<label class={labelClass} for="character-name">Name</label>
				<input
					bind:value={name}
					class="{inputClass} {nameError ? 'border-error-500' : ''}"
					id="character-name"
					type="text"
					maxlength="37"
					placeholder="Nadea Theron"
				/>
				{#if nameError}
					<p class="text-error-500 mt-1 mb-2 text-sm">{nameError}</p>
				{/if}
			</div>

			<!-- Health -->
			<div class="w-full px-3 md:w-1/2">
				<Selector
					label="Health"
					options={healthOptions}
					bind:value={health}
					id="health"
					placeholder="Select Health rating"
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
				/>
			</div>

			<!-- Humanity -->
			<div class="w-full px-3">
				<Selector
					label="Humanity"
					options={humanityOptions}
					bind:value={humanity}
					id="humanity"
				/>
			</div>
		</div>

		<!-- Group 2: Convictions -->
		<div class="-mx-3 flex flex-wrap">
			<div class="w-full px-3">
				<label class={labelClass}>Convictions</label>
				<input
					bind:value={conviction1}
					class="{inputClass} {conviction1Error ? 'border-error-500' : ''}"
					type="text"
					maxlength="200"
					placeholder="First conviction"
				/>
				{#if conviction1Error}
					<p class="text-error-500 mt-1 mb-2 text-sm">{conviction1Error}</p>
				{/if}
				<input
					bind:value={conviction2}
					class="{inputClass} {conviction2Error ? 'border-error-500' : ''}"
					type="text"
					maxlength="200"
					placeholder="Second conviction"
				/>
				{#if conviction2Error}
					<p class="text-error-500 mt-1 mb-2 text-sm">{conviction2Error}</p>
				{/if}
				<input
					bind:value={conviction3}
					class="{inputClass} {conviction3Error ? 'border-error-500' : ''}"
					type="text"
					maxlength="200"
					placeholder="Third conviction"
				/>
				{#if conviction3Error}
					<p class="text-error-500 mt-1 mb-2 text-sm">{conviction3Error}</p>
				{/if}
			</div>
		</div>

		<!-- Group 3: Biography -->
		<div class="-mx-3 flex flex-wrap">
			<div class="w-full px-3">
				<label class={labelClass} for="description">Description</label>
				<textarea
					bind:value={description}
					class="{inputClass} {descriptionError ? 'border-error-500' : ''}"
					id="description"
					rows="4"
					maxlength="1024"
					placeholder="Describe your character..."
				></textarea>
				{#if descriptionError}
					<p class="text-error-500 mt-1 mb-2 text-sm">{descriptionError}</p>
				{/if}
			</div>

			<div class="w-full px-3">
				<label class={labelClass} for="history">History</label>
				<textarea
					bind:value={history}
					class="{inputClass} {historyError ? 'border-error-500' : ''}"
					id="history"
					rows="4"
					maxlength="1024"
					placeholder="Your character's background and history..."
				></textarea>
				{#if historyError}
					<p class="text-error-500 mt-1 mb-2 text-sm">{historyError}</p>
				{/if}
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
				/>
			</div>
		</div>
	</div>

		{#if splat !== ''}
			<!-- Temporary mock character object for TraitSheet -->
			<TraitSheet
				character={{ traits, _id: '', name: '', guild: 0, user: 0, splat: 'vampire', profile: { description: null, history: null, images: [] }, health: '', willpower: '', humanity: 0 }}
				editing={true}
			/>

			{#if splat === 'vampire' || splat === 'thinblood'}
				<div class="mt-3">
					<Card>
						<h3 class="h3 -mt-1 mb-2 text-center text-xl font-semibold uppercase">
							Blood Potency
						</h3>
						<div class="flex justify-center">
							<RatingSelector
								bind:rating={blood_potency}
								min={splat === 'thinblood' ? 0 : 1}
								max={splat === 'thinblood' ? 2 : 10}
								showLabel={false}
								editing={true}
								allowsSubtraits={false}
							/>
						</div>
					</Card>
				</div>
			{/if}

			<div class="mt-6">
				<button
					type="submit"
					class="btn preset-filled-primary-500 hover:brightness-110 w-full flex items-center justify-center gap-2"
					disabled={!isFormValid}
				>
					{#if submitting}
						<Loader2 class="animate-spin" size={20} />
					{/if}
					{submitting ? 'Creating...' : submitLabel}
				</button>
			</div>
		{/if}
	</form>
