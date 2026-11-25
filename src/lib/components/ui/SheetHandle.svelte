<script lang="ts">
	interface ComponentProps {
		label: string; // Names the slider ("Macros panel height")
		// The sheet's height in pixels once it's been resized (bindable); null fits its content
		height: number | null;
		current: number; // The sheet's laid-out height, where a drag starts from
		// On wider windows instead of phones, and sized freely, up to `max`: it stays where it's left
		free?: boolean;
		max?: number; // The most a free one goes to, in pixels
		snaps?: number[]; // The heights a phone's settles at, as fractions of the window, in order
		closeBelow?: number; // A phone's dragged below this fraction, it asks to close
		// Close the sheet, returning whether it did (asking first may keep it open)
		onclose?: () => boolean;
		dragging?: boolean; // Whether it's being dragged (bindable), say to pause a height transition
	}

	let {
		label,
		height = $bindable(),
		current,
		free = false,
		max = Infinity,
		snaps = [0.35, 0.6, 0.9],
		closeBelow = 0.2,
		onclose,
		dragging = $bindable(false)
	}: ComponentProps = $props();

	const minSnap = $derived(snaps[0]);
	const maxSnap = $derived(snaps[snaps.length - 1]);
	const FREE_MIN = 160; // The least a free one goes to, in pixels
	const FREE_STEP = 40; // How far an arrow key moves it

	let windowHeight = $state(0);
	// A press moves this far (in pixels) before it's a drag, so a tap does nothing
	const DRAG_AFTER = 4;
	let start: { y: number; height: number } | null = null;

	// The least and most it may be, in pixels, while dragged
	const least = $derived(free ? FREE_MIN : 64);
	const most = $derived(
		free ? Math.max(FREE_MIN, Math.min(max, windowHeight)) : windowHeight * maxSnap
	);
	const clamp = (value: number): number => Math.min(Math.max(value, least), most);
	// The height as it shows: a window that has shrunk since holds it to `most`
	const real = $derived(free ? Math.min(height ?? current, most) : (height ?? current));

	const snapTo = (fraction: number) => (height = fraction * windowHeight);

	const onDown = (e: PointerEvent) => {
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		start = { y: e.clientY, height: current };
	};

	const onMove = (e: PointerEvent) => {
		if (!start) return;
		if (!dragging && Math.abs(start.y - e.clientY) < DRAG_AFTER) return;
		dragging = true;
		height = clamp(start.height + (start.y - e.clientY));
	};

	// Released, it settles at the nearest size, or below `closeBelow` asks to close (declined, it
	// settles at the smallest). A cancelled drag (say, the system took the touch) only settles
	const release = (mayClose: boolean) => {
		start = null;
		if (!dragging) return;
		dragging = false;
		if (free) return; // Where it was left
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
		if (free) {
			height = clamp(real + (e.key === 'ArrowUp' ? FREE_STEP : -FREE_STEP));
			return;
		}
		const fraction = (height ?? current) / windowHeight;
		const next =
			e.key === 'ArrowUp'
				? snaps.find((snap) => snap > fraction + 0.01)
				: snaps.findLast((snap) => snap < fraction - 0.01);
		if (next !== undefined) snapTo(next);
	};

	/** A height as a percentage of the window's. */
	const percentOf = (value: number): number =>
		windowHeight > 0 ? Math.round((value / windowHeight) * 100) : 0;
	const percent = $derived(percentOf(real));
</script>

<svelte:window bind:innerHeight={windowHeight} />

<!--
@component
A panel's grab handle, on its top edge: dragging it up makes the panel taller (`height`, bindable, in
pixels), so the panel should keep its bottom edge in place. On phones (below `sm`) the panel is a
sheet, which settles on release at the nearest of `snaps` (fractions of the window), or, dragged below
`closeBelow`, asks to close (`onclose`). A `free` one is for wider windows, and stays where it's left,
up to `max`. It's a vertical slider: ↑ and ↓ make the panel taller and shorter, and it reports the
real height.
-->
<div
	role="slider"
	aria-orientation="vertical"
	aria-label={label}
	aria-valuenow={percent}
	aria-valuetext="{percent}% of the screen"
	aria-valuemin={free ? percentOf(least) : Math.round(minSnap * 100)}
	aria-valuemax={free ? percentOf(most) : Math.round(maxSnap * 100)}
	tabindex="0"
	class={[
		'[&:focus-visible>span]:bg-primary-300 shrink-0 touch-none justify-center pt-2 pb-1 focus-visible:outline-none',
		free ? 'hidden cursor-ns-resize sm:flex' : 'flex cursor-grab sm:hidden'
	]}
	onpointerdown={onDown}
	onpointermove={onMove}
	onpointerup={() => release(true)}
	onpointercancel={() => release(false)}
	onkeydown={onKey}
>
	<span class="bg-surface-400 h-1 w-10 rounded-full"></span>
</div>
