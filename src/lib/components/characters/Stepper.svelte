<script lang="ts">
	import { Minus, Plus } from '@lucide/svelte';

	interface ComponentProps {
		label: string; // Names the group, and the buttons ("Less {label}", "More {label}")
		value: number;
		min?: number;
		max?: number; // The most it goes up to (omit for canAdd alone)
		canAdd?: boolean; // Whether it may go up at all, for limits a maximum can't express
		disabled?: boolean;
	}

	let {
		label,
		value = $bindable(),
		min = 0,
		max = Infinity,
		canAdd = true,
		disabled = false
	}: ComponentProps = $props();

	const id = $derived(`stepper-${label.toLowerCase().replace(/\W+/g, '-')}`);
</script>

<!-- A labelled number with - and + buttons -->
<div class="flex items-center justify-between">
	<span {id}>{label}</span>
	<div class="flex items-center gap-3" role="group" aria-labelledby={id}>
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
