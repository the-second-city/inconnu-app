<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Minus, Plus } from '@lucide/svelte';

	interface ComponentProps {
		label: string; // Names the group, and the buttons ("Less {label}", "More {label}")
		value: number;
		min?: number;
		max?: number; // The most it goes up to (omit for canAdd alone)
		canAdd?: boolean; // Whether it may go up at all, for limits a maximum can't express
		disabled?: boolean;
		icon?: Snippet; // Drawn before the label (say, the track box the amount adds)
		detail?: string; // A line under the label (say, what the value means), describing the group
	}

	let {
		label,
		value = $bindable(),
		min = 0,
		max = Infinity,
		canAdd = true,
		disabled = false,
		icon,
		detail
	}: ComponentProps = $props();

	// Unique per stepper, as two can share a label (Superficial in a popover and a modal)
	const id = $props.id();
</script>

<!-- A labelled number with - and + buttons -->
<div class="flex items-center justify-between">
	<span class="flex items-center gap-2">
		{#if icon}<span class="flex shrink-0" aria-hidden="true">{@render icon()}</span>{/if}
		{#if detail === undefined}
			<span {id}>{label}</span>
		{:else}
			<span class="flex flex-col leading-tight">
				<span {id}>{label}</span>
				<span id="{id}-detail" class="text-surface-300 text-sm" aria-live="polite">{detail}</span>
			</span>
		{/if}
	</span>
	<div
		class="flex items-center gap-3"
		role="group"
		aria-labelledby={id}
		aria-describedby={detail === undefined ? undefined : `${id}-detail`}
	>
		<button
			type="button"
			class="btn-icon preset-tonal-surface"
			onclick={() => value--}
			disabled={disabled || value <= min}
			aria-label="Less {label}"
		>
			<Minus size={16} />
		</button>
		<span class="w-5 text-center" aria-live="polite">{value}</span>
		<button
			type="button"
			class="btn-icon preset-tonal-surface"
			onclick={() => value++}
			disabled={disabled || !canAdd || value >= max}
			aria-label="More {label}"
		>
			<Plus size={16} />
		</button>
	</div>
</div>
