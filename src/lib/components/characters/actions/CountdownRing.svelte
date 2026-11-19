<script lang="ts">
	interface ComponentProps {
		remaining: number; // The number shown; the ring sweeps once per number
		stepDelay: number; // ms each number lasts
	}

	let { remaining, stepDelay }: ComponentProps = $props();

	// The ring's size, in its SVG's 100-unit box
	const RADIUS = 44;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
</script>

<!-- A countdown in a ring that starts full and sweeps empty over each step, then refills for the
     next number. At 0 (say, waiting on a slow API), it stays empty. -->
<div class="flex justify-center py-6">
	<div class="relative size-28">
		<svg viewBox="0 0 100 100" class="absolute inset-0 -rotate-90" aria-hidden="true">
			<circle
				cx="50"
				cy="50"
				r={RADIUS}
				class="stroke-surface-400-600"
				fill="none"
				stroke-width="6"
			/>
			{#if remaining > 0}
				{#key remaining}
					<circle
						cx="50"
						cy="50"
						r={RADIUS}
						class="sweep stroke-primary-500"
						fill="none"
						stroke-width="6"
						stroke-linecap="round"
						stroke-dasharray={CIRCUMFERENCE}
						style:--circumference={CIRCUMFERENCE}
						style:--step="{stepDelay}ms"
					/>
				{/key}
			{/if}
		</svg>
		<span
			class="absolute inset-0 flex items-center justify-center text-4xl font-semibold"
			aria-hidden="true">{remaining}</span
		>
	</div>
	<p class="sr-only" aria-live="polite">Rolling…</p>
</div>

<style>
	/* A full ring that empties over one countdown step, easing in and out */
	.sweep {
		stroke-dashoffset: 0;
		animation: sweep var(--step) ease-in-out forwards;
	}

	@keyframes sweep {
		to {
			stroke-dashoffset: var(--circumference);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sweep {
			animation: none;
		}
	}
</style>
