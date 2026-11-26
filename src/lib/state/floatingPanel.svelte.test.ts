import { expect, test } from 'vitest';

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

	expect(fitPlacement({ ...BOX, height: 600 }, small)).toEqual({
		left: 192,
		top: 8,
		width: 400,
		height: 484
	});
	// Fitting its content, it keeps room for its least height
	expect(fitPlacement({ ...BOX, height: null }, small)).toEqual({
		left: 192,
		top: 200,
		width: 400,
		height: null
	});
});

/** A panel element whose laid-out box is `BOX`, and a floating panel in `BOUNDS`'s window. */
const setup = (): { floating: FloatingPanel; panel: HTMLElement } => {
	const floating = new FloatingPanel({ margin: 8, minWidth: 300, minHeight: 200 });
	floating.windowWidth = BOUNDS.width;
	floating.windowHeight = BOUNDS.height;
	const panel = {
		getBoundingClientRect: () => BOX
	} as unknown as HTMLElement;
	return { floating, panel };
};

/** A pointer event at (`x`, `y`), from `target`. */
const pointer = (type: string, x: number, y: number, target?: EventTarget): PointerEvent => {
	const e = new MouseEvent(type, { clientX: x, clientY: y, button: 0, cancelable: true });
	if (target) Object.defineProperty(e, 'target', { value: target });
	return e as PointerEvent;
};

test('dragging moves it, still fitting its content, and reset puts it back', () => {
	const { floating, panel } = setup();
	expect(floating.placement).toBeNull();

	floating.press(pointer('pointerdown', 0, 0, document.body), panel);
	window.dispatchEvent(pointer('pointermove', 2, 2)); // Not yet a drag
	expect(floating.placement).toBeNull();
	window.dispatchEvent(pointer('pointermove', -100, 50));
	expect(floating.dragging).toBe(true);
	window.dispatchEvent(pointer('pointerup', -100, 50));

	expect(floating.dragging).toBe(false);
	expect(floating.placement).toEqual({ left: 400, top: 250, width: 400, height: null });
	expect(floating.maxHeight).toBe(542);
	window.dispatchEvent(pointer('pointermove', 0, 0)); // Released, it no longer follows
	expect(floating.placement?.left).toBe(400);

	floating.reset();
	expect(floating.placement).toBeNull();
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

	expect(floating.placement).toEqual({ left: 450, top: 200, width: 450, height: 460 });
});

test('the arrow keys resize it from its bottom right corner', () => {
	const { floating, panel } = setup();
	const key = (key: string) => floating.key(new KeyboardEvent('keydown', { key }), panel);

	expect(key('ArrowRight')).toBe(true);
	expect(floating.placement).toEqual({ left: 500, top: 200, width: 440, height: 400 });
	expect(key('ArrowUp')).toBe(true);
	expect(floating.placement).toEqual({ left: 500, top: 200, width: 400, height: 360 });
	expect(key('Enter')).toBe(false);
});
