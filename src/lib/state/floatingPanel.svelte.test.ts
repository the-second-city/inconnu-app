import { expect, onTestFinished, test, vi } from 'vitest';

import {
	FloatingPanel,
	fitPlacement,
	moveBox,
	resizeBox,
	type Bounds,
	type Box,
	type Edge
} from './floatingPanel.svelte';

/** A 1000×800 window, keeping 8px from its edges, for panels at least 300×200. */
const BOUNDS: Bounds = { width: 1000, height: 800, margin: 8, minWidth: 300, minHeight: 200 };
/** A 400×400 panel at (500, 200). */
const BOX: Box = { left: 500, top: 200, width: 400, height: 400 };

test.each([
	[10, 20, 510, 220],
	[-1000, -1000, 8, 8], // Held inside the window
	[1000, 1000, 592, 392]
])('moved by (%i, %i), it goes to (%i, %i)', (dx, dy, left, top) => {
	expect(moveBox(BOX, dx, dy, BOUNDS)).toEqual({ ...BOX, left, top });
});

test.each<[Edge, number, number, Box]>([
	['e', 50, 0, { left: 500, top: 200, width: 450, height: 400 }],
	['e', 500, 0, { left: 500, top: 200, width: 492, height: 400 }], // To the window's edge
	['w', -100, 0, { left: 400, top: 200, width: 500, height: 400 }], // The right edge stays
	['w', 300, 0, { left: 600, top: 200, width: 300, height: 400 }], // No narrower than its least
	['s', 0, -300, { left: 500, top: 200, width: 400, height: 200 }],
	['n', 0, -500, { left: 500, top: 8, width: 400, height: 592 }], // The bottom stays
	['se', 20, 30, { left: 500, top: 200, width: 420, height: 430 }],
	['nw', -20, -30, { left: 480, top: 170, width: 420, height: 430 }]
])('resized from %s by (%i, %i), it becomes %o', (edge, dx, dy, box) => {
	expect(resizeBox(BOX, edge, dx, dy, BOUNDS)).toEqual(box);
});

test('a window that shrinks holds the panel inside it', () => {
	const small = { ...BOUNDS, width: 600, height: 500 };

	expect(fitPlacement({ ...BOX, height: 600, bottom: null }, small)).toEqual({
		left: 192,
		top: 8,
		width: 400,
		height: 484,
		bottom: null
	});
	// Fitting its content, it keeps room for its least height
	expect(fitPlacement({ ...BOX, height: null, bottom: null }, small)).toEqual({
		left: 192,
		top: 200,
		width: 400,
		height: null,
		bottom: null
	});
	// Held by its bottom edge, it keeps room above for its least height
	expect(fitPlacement({ ...BOX, height: null, bottom: 400 }, small)?.bottom).toBe(292);
});

/** A panel element whose laid-out box is `BOX`, and a floating panel in `BOUNDS`'s window. */
const setup = (): { floating: FloatingPanel; panel: HTMLElement } => {
	const floating = new FloatingPanel({ margin: 8, minWidth: 300, minHeight: 200 });
	floating.windowWidth = BOUNDS.width;
	floating.windowHeight = BOUNDS.height;
	const panel = document.createElement('div');
	panel.getBoundingClientRect = () => DOMRect.fromRect({ x: BOX.left, y: BOX.top, ...BOX });
	return { floating, panel };
};

/** A pointer event at (`x`, `y`), from `target`, by pointer `id` (the first finger, say). */
const pointer = (
	type: string,
	x: number,
	y: number,
	target?: EventTarget,
	id = 1
): PointerEvent => {
	const e = new MouseEvent(type, { clientX: x, clientY: y, button: 0, cancelable: true });
	if (target) Object.defineProperty(e, 'target', { value: target });
	Object.defineProperty(e, 'pointerId', { value: id });
	return e as PointerEvent;
};

test('dragging moves it (shifted until released), still fitting its content, and reset puts it back', () => {
	const { floating, panel } = setup();
	expect(floating.placement).toBeNull();

	floating.press(pointer('pointerdown', 0, 0, document.body), panel);
	window.dispatchEvent(pointer('pointermove', 2, 2)); // Not yet a drag
	expect(floating.placement).toBeNull();
	window.dispatchEvent(pointer('pointermove', -100, 50));
	expect(floating.dragging).toBe(true);
	// While it moves, it's shifted from where it started
	expect(floating.placement).toEqual({
		left: 500,
		top: 200,
		width: 400,
		height: null,
		bottom: null
	});
	expect(floating.shift).toEqual({ x: -100, y: 50 });
	window.dispatchEvent(pointer('pointerup', -100, 50));
	expect(floating.shift).toBeNull();

	expect(floating.dragging).toBe(false);
	expect(floating.placement).toEqual({
		left: 400,
		top: 250,
		width: 400,
		height: null,
		bottom: 150
	});
	expect(floating.maxHeight).toBe(642); // Dropped low, it grows up, to the window's top
	window.dispatchEvent(pointer('pointermove', 0, 0)); // Released, it no longer follows
	expect(floating.placement?.left).toBe(400);

	floating.reset();
	expect(floating.placement).toBeNull();
});

test.each([
	[-150, null, 742], // Dropped high, it grows down from its top, to the window's bottom
	[100, 100, 692] // Dropped low, it's held by its bottom edge, growing up to the window's top
])('moved by %ipx, it’s held from the bottom by %s, up to %ipx tall', (dy, bottom, max) => {
	const { floating, panel } = setup();

	floating.press(pointer('pointerdown', 0, 0, document.body), panel);
	window.dispatchEvent(pointer('pointermove', 0, dy));
	window.dispatchEvent(pointer('pointerup', 0, dy));

	expect(floating.placement?.bottom).toBe(bottom);
	expect(floating.maxHeight).toBe(max);
});

test('a resized panel is held by its top, whatever its height', () => {
	const { floating, panel } = setup();

	floating.press(pointer('pointerdown', 0, 0, document.body), panel, 's');
	window.dispatchEvent(pointer('pointermove', 0, 100));
	window.dispatchEvent(pointer('pointerup', 0, 100));

	expect(floating.placement).toMatchObject({ top: 200, height: 500, bottom: null });
});

test('another finger can’t end, steer, or restart a drag', () => {
	const { floating, panel } = setup();

	floating.press(pointer('pointerdown', 0, 0, document.body), panel);
	window.dispatchEvent(pointer('pointermove', -100, 0));
	// A second finger presses, moves, and lifts
	floating.press(pointer('pointerdown', 300, 300, document.body, 2), panel);
	window.dispatchEvent(pointer('pointermove', 400, 400, undefined, 2));
	window.dispatchEvent(pointer('pointerup', 400, 400, undefined, 2));
	expect(floating.dragging).toBe(true);
	expect(floating.shift).toEqual({ x: -100, y: 0 });

	window.dispatchEvent(pointer('pointerup', -100, 0));
	expect(floating.dragging).toBe(false);
	expect(floating.placement?.left).toBe(400);
});

test('a press on a button is the button’s', () => {
	const { floating, panel } = setup();
	const button = document.createElement('button');

	floating.press(pointer('pointerdown', 0, 0, button), panel);
	window.dispatchEvent(pointer('pointermove', 100, 100));

	expect(floating.placement).toBeNull();
});

test('dragging an edge resizes it, setting its height', () => {
	const { floating, panel } = setup();

	floating.press(pointer('pointerdown', 0, 0, document.body), panel, 'sw');
	window.dispatchEvent(pointer('pointermove', -50, 60));
	window.dispatchEvent(pointer('pointerup', -50, 60));

	expect(floating.placement).toEqual({
		left: 450,
		top: 200,
		width: 450,
		height: 460,
		bottom: null
	});
});

test.each<[Edge, number | null]>([
	['e', null], // Only wider, it still fits its content
	['w', null],
	['s', 460], // Taller, it's that tall
	['ne', 340]
])('resized from %s, its height is %s', (edge, height) => {
	const { floating, panel } = setup();

	floating.press(pointer('pointerdown', 0, 0, document.body), panel, edge);
	window.dispatchEvent(pointer('pointermove', 50, 60));
	window.dispatchEvent(pointer('pointerup', 50, 60));

	expect(floating.placement?.height).toBe(height);
});

test('the arrow keys resize it from its bottom right corner', () => {
	const { floating, panel } = setup();
	/** Press a key on the corner, returning whether it resized the panel. */
	const key = (key: string): boolean => floating.key(new KeyboardEvent('keydown', { key }), panel);

	expect(key('ArrowRight')).toBe(true);
	// Only wider, it still fits its content
	expect(floating.placement).toEqual({
		left: 500,
		top: 200,
		width: 440,
		height: null,
		bottom: null
	});
	expect(key('ArrowUp')).toBe(true);
	expect(floating.placement).toEqual({
		left: 500,
		top: 200,
		width: 400,
		height: 360,
		bottom: null
	});
	expect(key('Enter')).toBe(false);
});

test('it follows where the pointer is predicted to be, and settles where it’s released', () => {
	const { floating, panel } = setup();
	const move = pointer('pointermove', -100, 50);
	Object.defineProperty(move, 'getPredictedEvents', {
		value: () => [pointer('pointermove', -110, 55), pointer('pointermove', -120, 60)]
	});

	floating.press(pointer('pointerdown', 0, 0, document.body), panel);
	window.dispatchEvent(move);
	expect(floating.shift).toEqual({ x: -120, y: 60 }); // The last prediction
	window.dispatchEvent(pointer('pointerup', -100, 50));

	expect(floating.placement).toEqual({
		left: 400,
		top: 250,
		width: 400,
		height: null,
		bottom: 150
	});
});

test('pressed as it flies in, it’s measured without the fly’s offset', () => {
	// jsdom has no DOMMatrixReadOnly: this reads a computed matrix(), as browsers give it
	vi.stubGlobal(
		'DOMMatrixReadOnly',
		class {
			e: number;
			f: number;
			constructor(transform: string) {
				[this.e, this.f] = transform.slice(7, -1).split(',').slice(4).map(Number);
			}
		}
	);
	onTestFinished(() => {
		vi.unstubAllGlobals();
	});
	const { floating, panel } = setup();
	panel.style.transform = 'matrix(1, 0, 0, 1, 24, 0)';
	// Laid out at BOX, it shows 24px to the right
	panel.getBoundingClientRect = () => DOMRect.fromRect({ x: 524, y: 200, width: 400, height: 400 });

	floating.press(pointer('pointerdown', 0, 0, document.body), panel);
	window.dispatchEvent(pointer('pointermove', -100, 0));
	window.dispatchEvent(pointer('pointerup', -100, 0));

	expect(floating.placement?.left).toBe(400);
});
