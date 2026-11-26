<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	interface ComponentProps {
		class?: ClassValue; // The content's, inside the scroller (its padding and layout)
		children: Snippet;
	}

	let { class: className, children }: ComponentProps = $props();

	let scroller: HTMLElement | undefined = $state();
	let content: HTMLElement | undefined = $state();
	let rail: HTMLElement | undefined = $state();
	// What's scrolled, measured on scrolling and whenever the scroller or its content resizes
	let top = $state(0);
	let view = $state(0); // The scroller's height
	let total = $state(0); // Its content's

	const measure = () => {
		if (!scroller) return;
		top = scroller.scrollTop;
		view = scroller.clientHeight;
		total = scroller.scrollHeight;
	};

	$effect(() => {
		if (!scroller || !content || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(measure);
		observer.observe(scroller);
		observer.observe(content);
		return () => observer.disconnect();
	});

	const scrollable = $derived(total > view + 1);
	const room = $derived(total - view); // How far it scrolls
	const atTop = $derived(top <= 1);
	const atBottom = $derived(top >= room - 1);
	// The thumb is as tall as the share of the content in view (at least 24px), placed by how far
	// it's scrolled. The rail is inset 4px from each end
	const RAIL_INSET = 4;
	const MIN_THUMB = 24;
	const track = $derived(Math.max(0, view - 2 * RAIL_INSET));
	const size = $derived(scrollable ? Math.max(MIN_THUMB, (track * view) / total) : 0);
	// Scrolled past an end (WebKit's bounce), it squashes against that end, as a native one does,
	// rather than leaving the rail
	const over = $derived(top < 0 ? -top : Math.max(0, top - room));
	const thumb = $derived(Math.max(MIN_THUMB / 2, size - over));
	const thumbTop = $derived(
		top < 0 ? 0 : top > room ? track - thumb : room > 0 ? ((track - thumb) * top) / room : 0
	);

	// Dragging the thumb scrolls the content by the same share
	let drag: { y: number; top: number } | null = $state(null);
	const onThumbDown = (e: PointerEvent) => {
		if (e.button !== 0 || !scroller) return;
		e.preventDefault();
		e.stopPropagation();
		(e.currentTarget as Element).setPointerCapture?.(e.pointerId);
		drag = { y: e.clientY, top: scroller.scrollTop };
	};
	const onThumbMove = (e: PointerEvent) => {
		if (!drag || !scroller || track <= thumb) return;
		// A release it missed (say, let go in another app) ends the drag, rather than leaving the
		// thumb to follow a pointer with no button held
		if (e.buttons === 0) return endDrag();
		scroller.scrollTop = drag.top + ((e.clientY - drag.y) * room) / (track - thumb);
	};
	const endDrag = () => (drag = null);

	// Pressing the rail above or below the thumb pages that way, as a scrollbar's track does
	const onRailDown = (e: PointerEvent) => {
		if (e.button !== 0 || !scroller || !rail) return;
		e.preventDefault();
		const y = e.clientY - rail.getBoundingClientRect().top;
		const page = view * 0.9;
		scroller.scrollBy({ top: y < thumbTop ? -page : page, behavior: 'smooth' });
	};

	// The wheel over the rail scrolls the content, not the page under the panel (not passive, to
	// stop that)
	$effect(() => {
		// This rail: by teardown, `rail` is already the next one (or none)
		const el = rail;
		if (!el) return;
		const onWheel = (e: WheelEvent) => {
			if (!scroller) return;
			e.preventDefault();
			// In pixels, lines, or pages
			const unit = [1, 16, scroller.clientHeight][e.deltaMode] ?? 1;
			scroller.scrollTop += e.deltaY * unit;
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	});
</script>

<!--
@component
A scrolling region with a scrollbar that's always visible while there's more to see (macOS hides its
own until you scroll): a slim rail at the right, in a gutter of its own, with a thumb, which drags
(and squashes against an end when WebKit bounces past it), and pages when the rail
is pressed above or below it. The content also fades out at an edge with more beyond it. Keyboard
and wheel scrolling are the native scroller's. Fill a flex column with it (it grows, and shrinks
below its content).
-->
<div class="relative flex min-h-0 grow flex-col">
	<div
		bind:this={scroller}
		class={[
			'scroll-area min-h-0 grow overflow-y-auto',
			// A gutter for the rail, so the content keeps its own padding on both sides
			scrollable && 'pr-3'
		]}
		style:--fade-top={scrollable && !atTop ? '1.5rem' : '0px'}
		style:--fade-bottom={scrollable && !atBottom ? '1.5rem' : '0px'}
		onscroll={measure}
	>
		<div bind:this={content} class={className}>
			{@render children()}
		</div>
	</div>
	{#if scrollable}
		<div
			bind:this={rail}
			class="group absolute inset-y-1 right-0.5 w-2.5 cursor-default"
			aria-hidden="true"
			onpointerdown={onRailDown}
		>
			<!-- The track, faint, so the thumb reads as a scrollbar -->
			<div class="bg-surface-700/60 absolute inset-y-0 right-0.5 w-1.5 rounded-full"></div>
			<!-- A pointer's, inside the hidden rail: the keyboard scrolls the scroller itself -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class={[
					'absolute right-0.5 w-1.5 touch-none rounded-full transition-colors',
					drag ? 'bg-primary-400' : 'bg-surface-400 group-hover:bg-surface-300'
				]}
				data-scroll-thumb
				style:top="{thumbTop}px"
				style:height="{thumb}px"
				onpointerdown={onThumbDown}
				onpointermove={onThumbMove}
				onpointerup={endDrag}
				onpointercancel={endDrag}
				onlostpointercapture={endDrag}
			></div>
		</div>
	{/if}
</div>

<style>
	/* The native scrollbar makes way for the rail */
	.scroll-area {
		scrollbar-width: none;
		mask-image: linear-gradient(
			to bottom,
			transparent,
			black var(--fade-top),
			black calc(100% - var(--fade-bottom)),
			transparent
		);
	}

	.scroll-area::-webkit-scrollbar {
		display: none;
	}
</style>
