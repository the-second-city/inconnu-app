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

// Node 25+ defines its own localStorage, which is undefined without --localstorage-file and
// hides jsdom's. Vitest exposes the jsdom instance, so use its storage instead.
const { jsdom } = globalThis as unknown as { jsdom: { window: Window } };
Object.defineProperty(globalThis, 'localStorage', {
	value: jsdom.window.localStorage,
	configurable: true
});
