<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	interface ComponentProps {
		icon: Component<{ size?: number; class?: string }>;
		children: Snippet;
		role?: 'status' | 'alert';
	}

	let { icon: Icon, children, role }: ComponentProps = $props();
</script>

<!-- A consequence to heed (frenzy, torpor, degeneration), with its icon -->
<p class="preset-tonal-error flex gap-2 rounded-md p-3 text-sm" {role}>
	<Icon size={18} class="shrink-0" />
	<span>{@render children()}</span>
</p>
