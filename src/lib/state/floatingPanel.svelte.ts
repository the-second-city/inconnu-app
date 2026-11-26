/** Where a floating panel sits, in pixels from the window's top left. */
export interface Box {
	left: number;
	top: number;
	width: number;
	height: number;
}

/** Where it's been put: `height` is null until it's resized, so it fits its content. */
export interface Placement {
	left: number;
	top: number;
	width: number;
	height: number | null;
}

/** An edge or corner to resize from, by compass point. */
export type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** The room a panel has: the window's size, the gap it keeps from its edges, and its least size. */
export interface Bounds {
	width: number;
	height: number;
	margin: number;
	minWidth: number;
	minHeight: number;
}

const clamp = (value: number, least: number, most: number): number =>
	Math.min(Math.max(value, least), Math.max(least, most));

/** A box moved by (`dx`, `dy`), kept inside the window. */
export const moveBox = (start: Box, dx: number, dy: number, b: Bounds): Box => ({
	...start,
	left: clamp(start.left + dx, b.margin, b.width - b.margin - start.width),
	top: clamp(start.top + dy, b.margin, b.height - b.margin - start.height)
});

/**
 * A box resized from an edge or corner by (`dx`, `dy`): the opposite edges stay put, and it stays
 * inside the window and no smaller than its least size.
 */
export const resizeBox = (start: Box, edge: Edge, dx: number, dy: number, b: Bounds): Box => {
	let { left, top, width, height } = start;
	const right = left + width;
	const bottom = top + height;
	if (edge.includes('e')) width = clamp(width + dx, b.minWidth, b.width - b.margin - left);
	if (edge.includes('w')) {
		left = clamp(left + dx, b.margin, right - b.minWidth);
		width = right - left;
	}
	if (edge.includes('s')) height = clamp(height + dy, b.minHeight, b.height - b.margin - top);
	if (edge.includes('n')) {
		top = clamp(top + dy, b.margin, bottom - b.minHeight);
		height = bottom - top;
	}
	return { left, top, width, height };
};

/** A placement held inside a window that may have shrunk since it was set. */
export const fitPlacement = (p: Placement, b: Bounds): Placement => {
	const width = clamp(p.width, b.minWidth, b.width - 2 * b.margin);
	const height = p.height === null ? null : clamp(p.height, b.minHeight, b.height - 2 * b.margin);
	return {
		width,
		height,
		left: clamp(p.left, b.margin, b.width - b.margin - width),
		top: clamp(p.top, b.margin, b.height - b.margin - (height ?? b.minHeight))
	};
};

// A press moves this far (in pixels) before it's a drag, so a click does nothing
const DRAG_AFTER = 4;
// How far an arrow key resizes it
const KEY_STEP = 40;

/**
 * A panel that floats over the page, which can be dragged by its header and resized from any edge
 * or corner (`ResizeHandles`). Until then it's wherever its own layout puts it (`placement` is
 * null); afterwards, `placement` says where, held inside the window (`windowWidth` and
 * `windowHeight`, which the panel binds).
 */
export class FloatingPanel {
	// Where it's been put, as set: `placement` holds it inside the window
	#placed: Placement | null = $state(null);
	windowWidth = $state(0);
	windowHeight = $state(0);
	dragging = $state(false); // Moving or resizing, say to pause a height transition
	readonly #limits: Omit<Bounds, 'width' | 'height'>;

	constructor(
		limits: Omit<Bounds, 'width' | 'height'> = { margin: 8, minWidth: 288, minHeight: 160 }
	) {
		this.#limits = limits;
	}

	get bounds(): Bounds {
		return { ...this.#limits, width: this.windowWidth, height: this.windowHeight };
	}

	/** Where it is, once moved or resized; null for wherever its layout puts it. */
	get placement(): Placement | null {
		return this.#placed && fitPlacement(this.#placed, this.bounds);
	}

	/** The most it may be tall, while it fits its content: down to the window's bottom margin. */
	get maxHeight(): number | null {
		const p = this.placement;
		return p ? this.windowHeight - this.#limits.margin - p.top : null;
	}

	/** Back to wherever its layout puts it. */
	reset() {
		this.#placed = null;
	}

	/**
	 * Follow a press (on the header, or a handle) until it's released: moving the panel, or, from an
	 * edge, resizing it. `panel` is where it starts from. Presses on buttons and fields are theirs.
	 */
	press(e: PointerEvent, panel: HTMLElement, edge?: Edge) {
		if (e.button !== 0) return;
		const target = e.target as Element | null;
		if (!edge && target?.closest('button, a, input, textarea, select, [role="slider"]')) return;
		e.preventDefault(); // No text selection while dragging
		// Followed outside the window too, so a release there still ends it
		(e.currentTarget as Element | null)?.setPointerCapture?.(e.pointerId);
		const start = this.#box(panel);
		const { clientX: x, clientY: y } = e;
		const sized = this.#placed?.height ?? null;

		const move = (ev: PointerEvent) => {
			const dx = ev.clientX - x;
			const dy = ev.clientY - y;
			if (!this.dragging && Math.hypot(dx, dy) < DRAG_AFTER) return;
			this.dragging = true;
			const box = edge
				? resizeBox(start, edge, dx, dy, this.bounds)
				: moveBox(start, dx, dy, this.bounds);
			// Moving keeps fitting its content, until it's resized
			this.#placed = { ...box, height: edge ? box.height : sized };
		};
		const end = () => {
			this.dragging = false;
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', end);
			window.removeEventListener('pointercancel', end);
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', end);
		window.addEventListener('pointercancel', end);
	}

	/** Resize it with the arrow keys (from its bottom right corner), returning whether it did. */
	key(e: KeyboardEvent, panel: HTMLElement): boolean {
		const steps: Record<string, [number, number]> = {
			ArrowLeft: [-KEY_STEP, 0],
			ArrowRight: [KEY_STEP, 0],
			ArrowUp: [0, -KEY_STEP],
			ArrowDown: [0, KEY_STEP]
		};
		const step = steps[e.key];
		if (!step) return false;
		e.preventDefault();
		this.#placed = resizeBox(this.#box(panel), 'se', ...step, this.bounds);
		return true;
	}

	/** Where the panel is now, as laid out. */
	#box(panel: HTMLElement): Box {
		const { left, top, width, height } = panel.getBoundingClientRect();
		return { left, top, width, height };
	}
}
