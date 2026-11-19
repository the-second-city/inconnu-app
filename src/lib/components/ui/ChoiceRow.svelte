<script lang="ts" module>
	/** A row's color, by what it does: crimson for blood, red for harm, green for healing. */
	export type ChoiceTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
</script>

<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	interface ComponentProps {
		icon: Component<{ size?: number }>;
		label: string; // The row's title
		name?: string; // Its accessible name, if not the label
		detail: string; // What it does or costs, or why it's disabled: the row's accessible description
		badge: ChoiceTone | 'blood'; // The icon badge's color ('blood' is solid crimson, for the gravest)
		tone?: ChoiceTone | 'surface'; // The detail's color
		outline?: ChoiceTone | 'surface';
		detailClass?: ClassValue;
		trailing?: Snippet; // At the row's end, such as a Hunger meter
		// Clicking it acts: without this, the row is a card that only says something
		onclick?: () => void;
		onpointerenter?: () => void;
		disabled?: boolean;
	}

	let {
		icon: Icon,
		label,
		name = label,
		detail,
		badge,
		tone = 'surface',
		outline = 'surface',
		detailClass,
		trailing,
		onclick,
		onpointerenter,
		disabled = false
	}: ComponentProps = $props();

	const id = $props.id();

	// Full class names, so Tailwind finds them
	const BADGES: Record<ChoiceTone | 'blood', string> = {
		primary: 'preset-tonal-primary',
		secondary: 'preset-tonal-secondary',
		success: 'preset-tonal-success',
		warning: 'preset-tonal-warning',
		error: 'preset-tonal-error',
		blood: 'preset-filled-primary-500'
	};
	const TEXT: Record<ChoiceTone | 'surface', string> = {
		primary: 'text-primary-600-400',
		secondary: 'text-secondary-600-400',
		success: 'text-success-600-400',
		warning: 'text-warning-600-400',
		error: 'text-error-600-400',
		surface: 'text-surface-800-200'
	};
	const BORDERS: Record<ChoiceTone | 'surface', string> = {
		primary: 'border-primary-500',
		secondary: 'border-secondary-500',
		success: 'border-success-500',
		warning: 'border-warning-500',
		error: 'border-error-500',
		surface: 'border-surface-600-400'
	};

	const ROW = $derived([
		'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left',
		BORDERS[outline]
	]);
</script>

<!-- A choice in a menu or modal (Slake's amounts, Rouse's checks, a cost): an icon badge colored by
     what it does, its title, a line on what it costs, and anything trailing -->
{#snippet body()}
	<span class="flex size-9 shrink-0 items-center justify-center rounded-full {BADGES[badge]}">
		<Icon size={18} />
	</span>
	<span class="flex grow flex-col leading-tight">
		<span class="font-semibold">{label}</span>
		<span id="{id}-detail" class={['text-sm', TEXT[tone], detailClass]}>{detail}</span>
	</span>
	{@render trailing?.()}
{/snippet}

{#if onclick}
	<button
		type="button"
		class={[...ROW, 'enabled:hover:bg-surface-300-700/40 transition-colors disabled:opacity-50']}
		{disabled}
		{onclick}
		{onpointerenter}
		aria-label={name}
		aria-describedby="{id}-detail"
	>
		{@render body()}
	</button>
{:else}
	<div class={ROW} role="group" aria-label={name} aria-describedby="{id}-detail">
		{@render body()}
	</div>
{/if}
