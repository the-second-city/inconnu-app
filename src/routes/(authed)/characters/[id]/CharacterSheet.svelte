<script lang="ts">
	import type { Character } from '$lib/types';

	import TraitSheet from '$lib/components/characters/sheets/TraitSheet.svelte';
	import MainTrackers from '$lib/components/characters/sheets/components/MainTrackers.svelte';
	import Vampirism from '$lib/components/characters/sheets/components/wod/Vampirism.svelte';

	interface ComponentProps {
		character: Character;
	}

	let { character = $bindable() }: ComponentProps = $props();
</script>

<div class="flex flex-col gap-3">
	<MainTrackers bind:character editing={false} allowsPathChange={true} />

	<TraitSheet bind:character editing={false} />

	<!--
	<Vampirism bind:character editing={false} />
	-->
</div>
