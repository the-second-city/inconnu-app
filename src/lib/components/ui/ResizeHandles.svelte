<script lang="ts">
	import type { Edge, FloatingPanel } from '$lib/state/floatingPanel.svelte';

	interface ComponentProps {
		floating: FloatingPanel;
		panel: HTMLElement | undefined; // The panel they resize, positioned (fixed or relative)
		label: string; // Names the corner's keyboard handle ("Resize the macros panel")
	}

	let { floating, panel, label }: ComponentProps = $props();

	// Each edge and corner: where it sits on the panel, and its cursor. The edges stop short of the
	// corners, which take the ends
	const handles: { edge: Edge; class: string }[] = [
		{ edge: 'n', class: 'inset-x-3 -top-1 h-2 cursor-ns-resize' },
		{ edge: 's', class: 'inset-x-3 -bottom-1 h-2 cursor-ns-resize' },
		{ edge: 'e', class: 'inset-y-3 -right-1 w-2 cursor-ew-resize' },
		{ edge: 'w', class: 'inset-y-3 -left-1 w-2 cursor-ew-resize' },
		{ edge: 'nw', class: '-top-1 -left-1 size-4 cursor-nwse-resize' },
		{ edge: 'ne', class: '-top-1 -right-1 size-4 cursor-nesw-resize' },
		{ edge: 'sw', class: '-bottom-1 -left-1 size-4 cursor-nesw-resize' }
	];

	const press = (e: PointerEvent, edge: Edge) => panel && floating.press(e, panel, edge);
</script>

<!--
@component
Invisible handles along a floating panel's edges and corners (wider windows only), which resize it
through its `FloatingPanel`. The bottom right corner is also a button for the keyboard: the arrows
make the panel wider, narrower, taller, and shorter.
-->
{#each handles as handle (handle.edge)}
	<div
		class={['absolute z-10 hidden touch-none sm:block', handle.class]}
		aria-hidden="true"
		onpointerdown={(e) => press(e, handle.edge)}
	></div>
{/each}
<button
	type="button"
	class="focus-visible:outline-primary-300 absolute -right-1 -bottom-1 z-10 hidden size-4 cursor-nwse-resize touch-none rounded-sm focus-visible:outline-2 sm:block"
	aria-label={label}
	title="Drag to resize, or use the arrow keys"
	onpointerdown={(e) => press(e, 'se')}
	onkeydown={(e) => panel && floating.key(e, panel)}
></button>
