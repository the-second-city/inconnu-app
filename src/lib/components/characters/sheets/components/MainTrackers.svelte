<script lang="ts">
	import type { Character } from '$lib/types';

	import Card from '$lib/components/Card.svelte';
	import Tracker from './Tracker.svelte';
	import Humanity from './Humanity.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
		actionable?: boolean; // Outside edit mode, the damage tracks offer actions
		onRouse?: () => void; // Offered in a ghoul's Health menu
	}

	let { character = $bindable(), editing, actionable = false, onRouse }: ComponentProps = $props();
</script>

<Card alignment="center" extraClasses="px-2 h-full justify-center">
	<div class="grid grid-cols-[120px_1fr] gap-2">
		<Tracker bind:character track="health" {editing} {actionable} {onRouse} />
		<Tracker bind:character track="willpower" {editing} {actionable} />
		<Humanity bind:character {editing} />
	</div>
</Card>
