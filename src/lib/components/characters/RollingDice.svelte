<script lang="ts">
	import { isSuccess } from '$lib/dice';

	interface ComponentProps {
		faces: (number | null)[]; // Each die's number, or null while it's a blank face
		rolling: boolean; // Blank faces tumble, one after another
		removed?: number; // Dice taken away (say, by the Lasombra Bane), crossed out at the end
		stained?: boolean[]; // Faces shown red (say, Oblivion's Stains), by index
		stagger?: boolean; // Blank faces start tumbling one after another (else at once, to re-roll)
		label: string; // What the row says to screen readers
	}

	let {
		faces,
		rolling,
		removed = 0,
		stained = [],
		stagger = true,
		label
	}: ComponentProps = $props();
</script>

<!-- Dice rolled in place: blank dashed faces until rolled, tumbling one after another while the roll
     is out, then each showing its number as it's revealed, successes (6+) in blue, stained faces red.
     A face can go blank again to re-roll. -->
<div class="flex flex-wrap justify-center gap-2" role="img" aria-label={label}>
	{#each faces as face, i (i)}
		{#if face === null}
			<span
				class={[
					'border-secondary-500 text-secondary-500 flex size-10 items-center justify-center rounded-md border-2 border-dashed text-lg font-semibold',
					rolling && 'tumble'
				]}
				style:--delay="{stagger ? i * 120 : 0}ms"
			>
				?
			</span>
		{:else}
			<span
				class={[
					'reveal flex size-10 items-center justify-center rounded-md text-lg font-semibold',
					stained[i]
						? 'preset-filled-error-500'
						: isSuccess(face)
							? 'preset-filled-secondary-500'
							: 'preset-tonal-surface'
				]}
			>
				{face}
			</span>
		{/if}
	{/each}
	{#each Array(removed), i (i)}
		<span
			class="border-surface-500 relative flex size-10 items-center justify-center rounded-md border-2 border-dashed text-lg font-semibold opacity-30"
		>
			?
			<span class="bg-surface-400 absolute h-0.5 w-12 rotate-45"></span>
		</span>
	{/each}
</div>

<style>
	/* A blank die tumbling while the roll is out, each starting a beat after the one before */
	.tumble {
		animation: tumble 600ms ease-in-out var(--delay) infinite;
	}

	@keyframes tumble {
		25% {
			transform: rotate(-14deg) scale(0.9);
		}
		75% {
			transform: rotate(14deg) scale(0.9);
		}
	}

	/* A die's number popping in */
	.reveal {
		animation: reveal 250ms ease-out;
	}

	@keyframes reveal {
		from {
			transform: scale(0.5);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tumble,
		.reveal {
			animation: none;
		}
	}
</style>
