<script lang="ts">
	import type { PageData } from './$types';
	import type { Trait } from '$lib/types';
	import { goto } from '$app/navigation';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
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

	const title = $derived(`Create a Character on ${data.guild.name}`);
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

	const isFormValid = $derived(
		isValidCharacterName && health !== '' && willpower !== '' && splat !== ''
	);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const payload = {
			name: name.trim(),
			splat,
			health: parseInt(health),
			willpower: parseInt(willpower),
			humanity: parseInt(humanity),
			blood_potency: splat === 'vampire' ? blood_potency : 0,
			traits
		};

		try {
			const response = await fetch(`/api/wizard/${data.token}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Failed to create character.' }));
				alert(errorData.message || 'Failed to create character');
				return;
			}

			const result = await response.json();

			// Store character info and redirect to success page
			creationInfoStore.set({
				characterId: result.id,
				guildName: data.guild.name,
				guildIcon: data.guild.icon,
				characterName: name.trim()
			});

			goto('/wizard/success');
		} catch (error) {
			alert('An unexpected error occurred. Please try again.');
			console.error('Error creating character:', error);
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
		<div class="-mx-3 mb-6 flex flex-wrap">
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

			<!-- Character type -->
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

		{#if splat !== ''}
			<!-- Temporary mock character object for TraitSheet -->
			<TraitSheet
				character={{ traits, _id: '', name: '', guild: 0, user: 0, splat: 'vampire', profile: { description: null, history: null, images: [] }, health: '', willpower: '', humanity: 0 }}
				editing={true}
			/>

			{#if splat === 'vampire'}
				<div class="mt-3">
					<Card>
						<h3 class="h3 -mt-1 mb-2 text-center text-xl font-semibold uppercase">
							Blood Potency
						</h3>
						<div class="flex justify-center">
							<RatingSelector
								bind:rating={blood_potency}
								min={1}
								max={10}
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
					class="btn preset-filled-primary-500 hover:brightness-110 w-full"
					disabled={!isFormValid}
				>
					Create Character
				</button>
			</div>
		{/if}
	</form>
