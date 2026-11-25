<script lang="ts">
	interface ComponentProps {
		label: string; // Names the slider ("Macros panel height")
		// The sheet's height in pixels once it's been resized (bindable); null fits its content
		height: number | null;
		current: number; // The sheet's laid-out height, where a drag starts from
		snaps?: number[]; // The heights it settles at, as fractions of the window, in order
		closeBelow?: number; // Dragged below this fraction, it asks to close
		// Close the sheet, returning whether it did (asking first may keep it open)
		onclose?: () => boolean;
		dragging?: boolean; // Whether it's being dragged (bindable), say to pause a height transition
	}

	let {
		label,
		height = $bindable(),
		current,
		snaps = [0.35, 0.6, 0.9],
		closeBelow = 0.2,
		onclose,
		dragging = $bindable(false)
	}: ComponentProps = $props();

	const minSnap = $derived(snaps[0]);
	const maxSnap = $derived(snaps[snaps.length - 1]);

	let windowHeight = $state(0);
	// A press moves this far (in pixels) before it's a drag, so a tap does nothing
	const DRAG_AFTER = 4;
	let start: { y: number; height: number } | null = null;

	const snapTo = (fraction: number) => (height = fraction * windowHeight);

	const onDown = (e: PointerEvent) => {
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		start = { y: e.clientY, height: current };
	};

	const onMove = (e: PointerEvent) => {
		if (!start) return;
		if (!dragging && Math.abs(start.y - e.clientY) < DRAG_AFTER) return;
		dragging = true;
		const dragged = start.height + (start.y - e.clientY);
		height = Math.min(Math.max(dragged, 64), windowHeight * maxSnap);
	};

	// Released, it settles at the nearest size, or below `closeBelow` asks to close (declined, it
	// settles at the smallest). A cancelled drag (say, the system took the touch) only settles
	const release = (mayClose: boolean) => {
		start = null;
		if (!dragging) return;
		dragging = false;
		const fraction = (height ?? current) / windowHeight;
		if (mayClose && fraction < closeBelow && onclose) {
			height = null;
			if (!onclose()) snapTo(minSnap);
			return;
		}
		snapTo(snaps.reduce((a, b) => (Math.abs(b - fraction) < Math.abs(a - fraction) ? b : a)));
	};

	// The keyboard steps between the sizes
	const onKey = (e: KeyboardEvent) => {
		if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
		e.preventDefault();
		const fraction = (height ?? current) / windowHeight;
		const next =
			e.key === 'ArrowUp'
				? snaps.find((snap) => snap > fraction + 0.01)
				: snaps.findLast((snap) => snap < fraction - 0.01);
		if (next !== undefined) snapTo(next);
	};

	const percent = $derived(
		windowHeight > 0 ? Math.round(((height ?? current) / windowHeight) * 100) : 0
	);
</script>

<svelte:window bind:innerHeight={windowHeight} />

<!--
@component
A bottom sheet's grab handle: dragging it resizes the sheet (`height`, bindable, in pixels), which
settles on release at the nearest of `snaps` (fractions of the window), or, dragged below
`closeBelow`, asks to close (`onclose`). It's a vertical slider: ↑ and ↓ step between the sizes,
and it reports the sheet's real height. Phones only (hidden from `sm`).
-->
<div
	role="slider"
	aria-orientation="vertical"
	aria-label={label}
	aria-valuenow={percent}
	aria-valuetext="{percent}% of the screen"
	aria-valuemin={Math.round(minSnap * 100)}
	aria-valuemax={Math.round(maxSnap * 100)}
	tabindex="0"
	class="[&:focus-visible>span]:bg-primary-300 flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-1 focus-visible:outline-none sm:hidden"
	onpointerdown={onDown}
	onpointermove={onMove}
	onpointerup={() => release(true)}
	onpointercancel={() => release(false)}
	onkeydown={onKey}
>
	<span class="bg-surface-400 h-1 w-10 rounded-full"></span>
</div>
