<script lang="ts">
	import type { PageData } from './$types';
	import type { Trait } from '$lib/types';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import TraitSheet from '$lib/components/characters/sheets/TraitSheet.svelte';
	import Selector from '$lib/components/Selector.svelte';

	let { data }: { data: PageData } = $props();
	let traits = $state<Trait[]>(data.traits);
	let name = $state('');
	let splat = $state('');

	const title = $derived(`Create a Character on ${data.guild.name}`);

	// Title-case the splats for display
	const titleCase = (str: string) =>
		str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	const splatOptions = $derived(data.splats.map(titleCase));

	const labelClass = 'mb-2 block text-lg uppercase tracking-wide';
	const inputClass = 'input input-bordered mb-3 block w-full border px-4 py-3 leading-tight';
</script>

<svelte:head>
	<title>{title} | inconnu.app</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-2">
	<div>
		<h1 class="h1 uppercase tracking-wide">New character</h1>
		<div class="flex justify-end">
			<h6 class="text-surface-800-200 flex items-center gap-4 italic">
				{data.guild.name}
				<Avatar src={data.guild.icon} name={data.guild.name} size="size-6" />
			</h6>
		</div>
	</div>
</div>

<form>
		<div class="-mx-3 mb-6 flex flex-wrap">
			<div class="mb-6 w-full px-3 md:mb-0">
				<label class={labelClass} for="character-name">Character name</label>
				<input
					bind:value={name}
					class={inputClass}
					id="character-name"
					type="text"
					maxlength="37"
					placeholder="John Wilcox"
				/>

				<Selector
					label="Character type"
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
		{/if}

		<div class="mt-6">
			<button type="submit" class="btn preset-filled-primary-500">Create Character</button>
		</div>
	</form>
