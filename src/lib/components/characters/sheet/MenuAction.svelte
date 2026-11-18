<script lang="ts">
	import type { Component } from 'svelte';

	import ChoiceRow, { type ChoiceTone } from '$lib/components/ui/ChoiceRow.svelte';

	interface ComponentProps {
		icon: Component<{ size?: number }>;
		label: string; // The action, and the button's accessible name
		detail: string; // What it does or costs, or why it's disabled
		badge: ChoiceTone; // The icon badge's color, by what the action does
		disabled?: boolean;
		onclick: () => void;
	}

	let { icon, label, detail, badge, disabled = false, onclick }: ComponentProps = $props();
</script>

<!-- A tracker menu's row, like the Slake modal's choices: an icon badge colored by what the action
     does, its name, and a line on what it costs (or why it's disabled), which describes the button -->
<ChoiceRow {icon} {label} {detail} {badge} {disabled} {onclick} />
