<script lang="ts">
	import HungerMeter from './HungerMeter.svelte';

	interface ComponentProps {
		before: number; // Hunger before the action
		after: number; // Hunger after it
	}

	let { before, after }: ComponentProps = $props();
</script>

<!-- Hunger across the width: the Hunger kept is solid, Hunger the action added pulses, and Hunger
     it removes (slaking) pulses as outlines (unless motion is reduced). Screen readers get the
     change as text. -->
<p class="sr-only">Hunger {before} → {after}</p>
<HungerMeter
	hunger={before}
	to={after}
	mark="pulse"
	size={44}
	class="flex justify-between px-4 py-2"
/>
