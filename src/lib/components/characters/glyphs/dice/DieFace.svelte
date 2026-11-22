<script lang="ts">
	import { capitalize } from '$lib';
	import { facePaths, HUNGER_COLOR, NORMAL_COLOR, type Face } from './shapes';

	interface ComponentProps {
		face: Face; // What the die rolled (see dieFace())
		hunger?: boolean; // A Hunger die: red, its critical with drips of blood in place of stars
		size?: number;
		color?: string; // Overrides the die's color (gray, or red for Hunger)
	}

	let { face, hunger = false, size = 30, color }: ComponentProps = $props();

	const paths = $derived(facePaths(face, hunger));
	const label = $derived(
		face === 'bestial' ? 'Bestial failure' : hunger ? `Hunger ${face}` : capitalize(face)
	);
</script>

<!-- A die's face, as the bot's dice emoji: a dot for failure, the ankh for success, the ankh between
     stars (or a Hunger die's drips of blood) for a critical, a skull for a bestial failure -->
<svg
	width={size}
	height={size}
	viewBox="0 0 100 100"
	xmlns="http://www.w3.org/2000/svg"
	role="img"
	aria-label={label}
	fill={color ?? (hunger ? HUNGER_COLOR : NORMAL_COLOR)}
>
	{#each paths as d (d)}
		<path {d} fill-rule="evenodd" />
	{/each}
</svg>
