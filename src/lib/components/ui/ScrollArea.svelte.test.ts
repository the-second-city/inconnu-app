import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import ScrollArea from './ScrollArea.svelte';

/**
 * Render a scroll area holding a line of text, its scroller `view` pixels tall over `total` pixels
 * of content (jsdom lays nothing out), scrolled to `top`. Returns the scroller, measured.
 */
const renderArea = async (view: number, total: number, top = 0): Promise<HTMLElement> => {
	render(ScrollArea, {
		children: createRawSnippet(() => ({ render: () => '<p>Macros</p>' }))
	});
	// The scroller is the content's parent
	const scroller = screen.getByText('Macros').parentElement?.parentElement as HTMLElement;
	Object.defineProperty(scroller, 'clientHeight', { value: view });
	Object.defineProperty(scroller, 'scrollHeight', { value: total });
	scroller.scrollTop = top;
	await fireEvent.scroll(scroller);
	return scroller;
};

/** The scrollbar's thumb, the element placed and sized from the scroll. */
const thumbOf = (scroller: HTMLElement): HTMLElement | null =>
	scroller.parentElement?.querySelector<HTMLElement>('[data-scroll-thumb]') ?? null;

test('content that fits has no scrollbar or fades', async () => {
	const scroller = await renderArea(400, 400);

	expect(thumbOf(scroller)).toBeNull();
	expect(scroller.style.getPropertyValue('--fade-top')).toBe('0px');
	expect(scroller.style.getPropertyValue('--fade-bottom')).toBe('0px');
});

test.each([
	[0, '0px', '1.5rem', 0], // At the top, it fades only below
	[300, '1.5rem', '1.5rem', 117.6], // Midway, both ways
	[600, '1.5rem', '0px', 235.2] // At the end, only above
])('scrolled to %ipx, it fades %s above and %s below', async (top, above, below, thumbTop) => {
	// The rail is 392px (4px in from each end); the thumb shows 400 of 1000px, so 156.8px of it, with
	// 235.2px to travel
	const scroller = await renderArea(400, 1000, top);
	const thumb = thumbOf(scroller);

	expect(scroller.style.getPropertyValue('--fade-top')).toBe(above);
	expect(scroller.style.getPropertyValue('--fade-bottom')).toBe(below);
	expect(parseFloat(thumb?.style.height ?? '')).toBeCloseTo(156.8);
	expect(parseFloat(thumb?.style.top ?? '')).toBeCloseTo(thumbTop);
});

test.each([
	[-50, 0], // Bounced past the top, it squashes against it
	[650, 392 - 106.8] // Past the end, against the end
])('scrolled to %ipx, the thumb shortens and sits at %fpx', async (top, thumbTop) => {
	const thumb = thumbOf(await renderArea(400, 1000, top));

	expect(parseFloat(thumb?.style.height ?? '')).toBeCloseTo(106.8);
	expect(parseFloat(thumb?.style.top ?? '')).toBeCloseTo(thumbTop);
});

test('dragging the thumb scrolls by the same share', async () => {
	const scroller = await renderArea(400, 1000);
	const thumb = thumbOf(scroller) as HTMLElement;

	// The thumb travels 235.2px over 600px of scrolling
	await userEvent.setup().pointer([
		{ keys: '[MouseLeft>]', target: thumb, coords: { clientY: 100 } },
		{ target: thumb, coords: { clientY: 100 + 117.6 } },
		{ keys: '[/MouseLeft]', target: thumb }
	]);

	expect(scroller.scrollTop).toBeCloseTo(300);
});
