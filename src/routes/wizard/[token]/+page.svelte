<script lang="ts">
	import type { PageData } from './$types';
	import type { Trait } from '$lib/types';
	import TraitSheet from '$lib/components/characters/sheets/TraitSheet.svelte';

	let { data }: { data: PageData } = $props();
	let traits = $state<Trait[]>(data.traits);
	let name = $state('');

	const title = $derived(`Create a Character on ${data.guild.name}`);

	const labelClass = 'mb-2 block text-lg uppercase tracking-wide';
	const inputClass = 'input input-bordered mb-3 block w-full border px-4 py-3 leading-tight';
</script>

<svelte:head>
	<title>{title} | inconnu.app</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-2">
	<div class="flex items-start gap-4">
		<!-- TODO: Add V5 logo image -->
		<!-- <img src="/images/v5-logo.png" alt="V5 logo" class="h-24 w-auto" /> -->
		<div>
			<h1 class="h1 mb-3 uppercase tracking-wide">New character</h1>
			<h4 class="h4 mb-9 flex items-center tracking-wide">
				{#if data.guild.icon}
					<img
						class="mr-2 h-[1.5em] w-auto rounded-full"
						src={data.guild.icon}
						alt={data.guild.name}
					/>
				{/if}
				{data.guild.name}
			</h4>
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
			</div>
		</div>

		<!-- Temporary mock character object for TraitSheet -->
		<TraitSheet
			character={{ traits, _id: '', name: '', guild: 0, user: 0, splat: 'vampire', profile: { description: null, history: null, images: [] }, health: '', willpower: '', humanity: 0 }}
			editing={true}
		/>

		<div class="mt-6">
			<button type="submit" class="btn preset-filled-primary-500">Create Character</button>
		</div>
	</form>
</div>
