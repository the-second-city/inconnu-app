/**
 * A value shown a beat behind what's wanted, so what it switches can fade: set a new value and it
 * fades out (`fading`), switches (`shown`) while unseen, and fades back in. For a switch that can't
 * crossfade, as when one element changes layout (the macro panel and its strip).
 */

/** Whether the viewer asks for less motion. */
export const prefersReducedMotion = (): boolean =>
	typeof window !== 'undefined' &&
	typeof window.matchMedia === 'function' &&
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class FadeSwitch<T> {
	shown: T = $state() as T;
	fading = $state(false);
	#timer: ReturnType<typeof setTimeout> | undefined;

	/** Start at `initial`; `duration` is how long the fade out takes (ms), before the switch. */
	constructor(
		initial: T,
		private readonly duration = 150
	) {
		this.shown = initial;
	}

	/** Switch to `value`, fading, or at once (`instant`, say while unseen or for less motion). */
	set(value: T, instant = false): void {
		this.cancel();
		if (value === this.shown || instant) {
			this.shown = value;
			this.fading = false;
			return;
		}
		this.fading = true;
		this.#timer = setTimeout(() => {
			this.shown = value;
			this.fading = false;
		}, this.duration);
	}

	/** Drop a switch under way (say, on unmounting). */
	cancel(): void {
		clearTimeout(this.#timer);
	}
}
