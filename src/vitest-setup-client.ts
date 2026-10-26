// DOM assertions for component tests, such as toBeInTheDocument() and toHaveAttribute()
import '@testing-library/jest-dom/vitest';

// jsdom lacks the Web Animations API, which Svelte transitions use. Finish every animation
// right away, so elements transitioning out are removed.
Element.prototype.animate ??= function () {
	const animation = {
		currentTime: 0,
		playState: 'finished',
		effect: null,
		onfinish: null as (() => void) | null,
		cancel() {}
	};
	setTimeout(() => animation.onfinish?.());
	return animation as unknown as Animation;
};

// jsdom lacks ResizeObserver, which Skeleton's popovers use for positioning
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
};
