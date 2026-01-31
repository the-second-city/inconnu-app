<script lang="ts">
	import type { Character } from '$lib/types';

	import Card from '$lib/components/Card.svelte';
	import Tracker from './Tracker.svelte';
	import Grounding from './Grounding.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
		allowsPathChange: boolean;
	}

	let { character = $bindable(), editing, allowsPathChange }: ComponentProps = $props();
</script>

<Card alignment="center">
	<div class="grid grid-cols-[100px_1fr] gap-2">
		<Tracker bind:character track="health" editing={true} />
		<Tracker bind:character track="willpower" editing={true} />
	</div>
	<!--
	<Grounding bind:grounding={character.grounding} {editing} {allowsPathChange} />
	-->
</Card>
