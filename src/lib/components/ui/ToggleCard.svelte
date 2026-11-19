<script lang="ts">
	import type { Component } from 'svelte';

	interface ComponentProps {
		icon: Component<{ size?: number }>;
		label: string; // The option, and the checkbox's accessible name
		detail: string; // What it does, the checkbox's accessible description
		checked: boolean;
		disabled?: boolean;
	}

	let {
		icon: Icon,
		label,
		detail,
		checked = $bindable(),
		disabled = false
	}: ComponentProps = $props();

	const id = $props.id();
</script>

<!-- An option as a card that toggles, like the choice rows beside it: its icon badge, name, and
     what it does, with the checkbox. Blue when on. -->
<label
	class={[
		'flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
		disabled ? 'opacity-60' : 'cursor-pointer',
		checked ? 'border-secondary-500 bg-secondary-500/10' : 'border-surface-600-400'
	]}
>
	<span
		class={[
			'flex size-9 shrink-0 items-center justify-center rounded-full',
			checked ? 'preset-filled-secondary-500' : 'preset-tonal-surface'
		]}
	>
		<Icon size={18} />
	</span>
	<span class="flex grow flex-col leading-tight">
		<span class="font-semibold">{label}</span>
		<span id="{id}-detail" class="text-surface-800-200 text-sm">{detail}</span>
	</span>
	<input
		type="checkbox"
		class="checkbox"
		bind:checked
		{disabled}
		aria-label={label}
		aria-describedby="{id}-detail"
	/>
</label>
