<script lang="ts" module>
	/** A menu action's color, by what it does: crimson for blood, red for harm, green for healing. */
	export type MenuTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
</script>

<script lang="ts">
	import type { Component } from 'svelte';

	interface ComponentProps {
		icon: Component<{ size?: number }>;
		label: string; // The action, and the button's accessible name
		detail: string; // What it does or costs, or why it's disabled
		tone: MenuTone;
		disabled?: boolean;
		onclick: () => void;
	}

	let { icon: Icon, label, detail, tone, disabled = false, onclick }: ComponentProps = $props();

	const id = $props.id();

	// Full class names, so Tailwind finds them
	const BADGES: Record<MenuTone, string> = {
		primary: 'preset-tonal-primary',
		secondary: 'preset-tonal-secondary',
		success: 'preset-tonal-success',
		warning: 'preset-tonal-warning',
		error: 'preset-tonal-error'
	};
</script>

<!-- A menu row, like the Slake modal's choices: an icon badge colored by what the action does, its
     name, and a line on what it costs (or why it's disabled), which describes the button -->
<button
	type="button"
	class={[
		'border-surface-600-400 flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
		'enabled:hover:bg-surface-300-700/40 disabled:opacity-50'
	]}
	{disabled}
	{onclick}
	aria-label={label}
	aria-describedby="{id}-detail"
>
	<span class="flex size-9 shrink-0 items-center justify-center rounded-full {BADGES[tone]}">
		<Icon size={18} />
	</span>
	<span class="flex grow flex-col leading-tight">
		<span class="font-semibold">{label}</span>
		<span id="{id}-detail" class="text-surface-800-200 text-sm">{detail}</span>
	</span>
</button>
