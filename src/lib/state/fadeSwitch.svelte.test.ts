import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { FadeSwitch } from './fadeSwitch.svelte';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

test('a new value fades out, then shows', () => {
	const fade = new FadeSwitch(false, 150);

	fade.set(true);
	expect(fade.fading).toBe(true);
	expect(fade.shown).toBe(false);

	vi.advanceTimersByTime(150);
	expect(fade.shown).toBe(true);
	expect(fade.fading).toBe(false);
});

test('instant, or the value already shown, switches at once', () => {
	const fade = new FadeSwitch('panel');

	fade.set('strip', true);
	expect(fade.shown).toBe('strip');
	expect(fade.fading).toBe(false);

	fade.set('strip');
	expect(fade.fading).toBe(false);
});

test('a switch under way gives way to the next, or to cancel', () => {
	const fade = new FadeSwitch(0, 150);
	fade.set(1);

	fade.set(0); // Back before it switched: nothing to fade
	vi.advanceTimersByTime(150);
	expect(fade.shown).toBe(0);
	expect(fade.fading).toBe(false);

	fade.set(2);
	fade.cancel();
	vi.advanceTimersByTime(150);
	expect(fade.shown).toBe(0);
});
