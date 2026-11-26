/** Where a floating panel sits, in pixels from the window's top left. */
export interface Box {
	left: number;
	top: number;
	width: number;
	height: number;
}

/**
 * Where it's been put: `height` is null until it's resized, so it fits its content. Fitting its
 * content in the window's lower half, it's held by its bottom edge (`bottom`, from the window's),
 * so it grows up when its content does, not past the window; otherwise `bottom` is null, and it
 * grows down from `top`.
 */
export interface Placement {
	left: number;
	top: number;
	width: number;
	height: number | null;
	bottom: number | null;
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
		top: clamp(p.top, b.margin, b.height - b.margin - (height ?? b.minHeight)),
		bottom: p.bottom === null ? null : clamp(p.bottom, b.margin, b.height - b.margin - b.minHeight)
	};
};

/** How far an element's transform moves it, if it has one that only moves it. */
const transformOffset = (el: Element): { x: number; y: number } => {
	const transform = getComputedStyle(el).transform;
	if (!transform || transform === 'none' || typeof DOMMatrixReadOnly === 'undefined') {
		return { x: 0, y: 0 };
	}
	const { e: x, f: y } = new DOMMatrixReadOnly(transform);
	return { x, y };
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
	// How far a move under way has taken it from its placement: shown as a translation, which the
	// compositor moves without laying out or repainting the panel, until it's released
	#shift: { x: number; y: number } | null = $state(null);
	#pointer: number | null = null; // The pointer dragging it
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

	/** How far a move under way has taken it, to show as a translation; null when not moving. */
	get shift(): { x: number; y: number } | null {
		return this.#shift;
	}

	/** The most it may be tall, while it fits its content: down to the window's bottom margin. */
	get maxHeight(): number | null {
		const p = this.placement;
		if (!p) return null;
		// Up to the window's top margin when it's held by its bottom edge, else down to the bottom's
		const edge = p.bottom === null ? p.top : p.bottom;
		return this.windowHeight - this.#limits.margin - edge;
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
		// One drag at a time: another finger's press doesn't start a second
		if (e.button !== 0 || this.#pointer !== null) return;
		const target = e.target as Element | null;
		if (!edge && target?.closest('button, a, input, textarea, select, [role="slider"]')) return;
		e.preventDefault(); // No text selection while dragging
		// Followed outside the window too, so a release there still ends it
		(e.currentTarget as Element | null)?.setPointerCapture?.(e.pointerId);
		const start = this.#box(panel);
		const { clientX: x, clientY: y, pointerId } = e;
		this.#pointer = pointerId;
		const sized = this.#placed?.height ?? null;
		let moved: Box | null = null; // Where a move has taken it

		/** Put it where a pointer at (`px`, `py`) takes it. */
		const follow = (px: number, py: number) => {
			const dx = px - x;
			const dy = py - y;
			if (edge) {
				this.#placed = this.#resized(resizeBox(start, edge, dx, dy, this.bounds), edge, sized);
				return;
			}
			moved = moveBox(start, dx, dy, this.bounds);
			this.#shift = { x: moved.left - start.left, y: moved.top - start.top };
		};
		const move = (ev: PointerEvent) => {
			if (ev.pointerId !== pointerId) return; // Another finger's
			if (!this.dragging && Math.hypot(ev.clientX - x, ev.clientY - y) < DRAG_AFTER) return;
			// Moving starts from where it is (moving keeps fitting its content, until it's resized),
			// and shifts it until it's released
			if (!this.dragging && !edge) this.#placed = { ...start, height: sized, bottom: null };
			this.dragging = true;
			// Where the browser predicts the pointer will be when the frame shows, so the panel keeps
			// up with it (it would otherwise trail by a frame or two)
			const ahead = ev.getPredictedEvents?.().at(-1) ?? ev;
			follow(ahead.clientX, ahead.clientY);
		};
		const end = (ev: PointerEvent) => {
			if (ev.pointerId !== pointerId) return;
			// Released, it settles where the pointer is, not where it was predicted to go
			if (this.dragging && ev.type === 'pointerup') follow(ev.clientX, ev.clientY);
			if (moved) this.#placed = this.#held(moved, sized);
			this.#shift = null;
			this.dragging = false;
			this.#pointer = null;
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
		const steps: Record<string, [Edge, number, number]> = {
			ArrowLeft: ['e', -KEY_STEP, 0],
			ArrowRight: ['e', KEY_STEP, 0],
			ArrowUp: ['s', 0, -KEY_STEP],
			ArrowDown: ['s', 0, KEY_STEP]
		};
		const step = steps[e.key];
		if (!step) return false;
		e.preventDefault();
		const [edge, dx, dy] = step;
		const box = resizeBox(this.#box(panel), edge, dx, dy, this.bounds);
		this.#placed = this.#resized(box, edge, this.#placed?.height ?? null);
		return true;
	}

	/**
	 * A resized box's placement: its height is set only by its top or bottom edge, so one only made
	 * wider or narrower keeps the height it had (`sized`; null, fitting its content).
	 */
	#resized(box: Box, edge: Edge, sized: number | null): Placement {
		return this.#held(box, edge.includes('n') || edge.includes('s') ? box.height : sized);
	}

	/**
	 * A box's placement with a height (`sized`; null, fitting its content), held by its bottom edge
	 * when it fits its content in the window's lower half, so it grows up.
	 */
	#held(box: Box, sized: number | null): Placement {
		const low = sized === null && box.top + box.height / 2 > this.windowHeight / 2;
		return {
			...box,
			height: sized,
			bottom: low ? this.windowHeight - box.top - box.height : null
		};
	}

	/**
	 * Where the panel is now, as laid out: without a transform's offset, like its fly-in's, which a
	 * press during it would otherwise keep, shifting it when it's placed.
	 */
	#box(panel: HTMLElement): Box {
		const { left, top, width, height } = panel.getBoundingClientRect();
		const { x, y } = transformOffset(panel);
		return { left: left - x, top: top - y, width, height };
	}
}
