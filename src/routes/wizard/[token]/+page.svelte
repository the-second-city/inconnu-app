<script lang="ts">
	import type { PageData } from './$types';
	import type { Trait } from '$lib/types';
	import TraitSheet from '$lib/components/characters/sheets/TraitSheet.svelte';

	let { data }: { data: PageData } = $props();
	let traits = $state<Trait[]>(data.traits);
</script>

<svelte:head>
	<title>{data.title} | inconnu.app</title>
</svelte:head>

<div class="container mx-auto p-4">
	<h1 class="h1 mb-6">Create Your Character</h1>

	<!-- Temporary mock character object for TraitSheet -->
	<TraitSheet
		character={{ traits, _id: '', name: '', guild: 0, user: 0, splat: 'vampire', profile: { description: null, history: null, images: [] }, health: '', willpower: '', humanity: 0 }}
		editing={true}
	/>

	<div class="mt-6">
		<button class="btn preset-filled-primary-500">Create Character</button>
	</div>
</div>
