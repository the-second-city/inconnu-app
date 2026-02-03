<script lang="ts">
	import type { Character } from '$lib/types';

	import Card from '$lib/components/Card.svelte';
	import Tracker from './Tracker.svelte';
	import Humanity from './Humanity.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
		allowsPathChange: boolean;
	}

	let { character = $bindable(), editing, allowsPathChange }: ComponentProps = $props();
</script>

<Card alignment="center" extraClasses="px-2 h-full justify-center">
	<div class="grid grid-cols-[120px_1fr] gap-2">
		<Tracker bind:character track="health" editing={true} />
		<Tracker bind:character track="willpower" editing={true} />
		<Humanity bind:character editing={true} />
	</div>
</Card>
