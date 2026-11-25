<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Check } from '@lucide/svelte';

	import type { PoolPicker } from '$lib/state/poolPicker.svelte';
	import ClientPortal from '$lib/components/ui/ClientPortal.svelte';

	interface ComponentProps {
		picker: PoolPicker;
		name: string;
		subtraits: string[];
		type?: string; // A Discipline's subtraits are powers, which add no dice
		line: Snippet; // The trait's line as the sheet draws it (its name and pips)
	}

	let { picker, name, subtraits, type, line }: ComponentProps = $props();

	const id = $props.id();
	const selection = $derived(picker.selection(name));
	const picked = $derived(selection !== undefined);
	const negative = $derived(picked && picker.isNegative(name));
	const hasMenu = $derived(subtraits.length > 0);
	const discipline = $derived(type === 'discipline');
	const open = $derived(hasMenu && picker.open === name);

	let lineEl: HTMLButtonElement | undefined = $state();
	let menuEl: HTMLDivElement | undefined = $state();
	let position: { top: number; left: number; width: number | null } = $state({
		top: 0,
		left: 0,
		width: null
	});

	// Hovering opens the menu after a moment, so sweeping across the sheet doesn't flash menus; leaving
	// the line and the menu closes it after one, so the pointer can cross the gap between them
	const OPEN_DELAY = 120;
	const CLOSE_DELAY = 180;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const schedule = (action: () => void, delay: number) => {
		clearTimeout(timer);
		timer = setTimeout(action, delay);
	};
	const cancel = () => clearTimeout(timer);

	const show = () => (picker.open = name);
	const hide = () => {
		cancel();
		if (picker.open === name) picker.open = null;
	};

	const onLineEnter = (e: PointerEvent) => {
		if (e.pointerType !== 'mouse' || !hasMenu) return;
		if (open) cancel();
		else schedule(show, OPEN_DELAY);
	};
	const onLeave = (e: PointerEvent) => {
		if (e.pointerType === 'mouse' && hasMenu) schedule(hide, CLOSE_DELAY);
	};
	const onMenuEnter = (e: PointerEvent) => {
		if (e.pointerType === 'mouse') cancel();
	};

	/** The menu's rows, for moving between them with the arrow keys. */
	const rows = (): HTMLElement[] =>
		menuEl ? [...menuEl.querySelectorAll<HTMLElement>('[role="menuitemradio"]')] : [];

	/**
	 * A click (or tap, or Enter) on the line: a trait without specialties is picked (or unpicked);
	 * otherwise the menu opens, focused on its first row when the keyboard opened it.
	 */
	const onLineClick = async (e: MouseEvent) => {
		if (!hasMenu) {
			picker.pick(name, null);
			return;
		}
		cancel();
		show();
		if (e.detail === 0) {
			await tick();
			rows()[0]?.focus();
		}
	};

	/** Pick a row, closing the menu (back to the line, if focus was in the menu). */
	const choose = (specialty: string | null) => {
		picker.pick(name, specialty);
		const refocus = menuEl?.contains(document.activeElement);
		hide();
		if (refocus) lineEl?.focus();
	};

	const onMenuKey = (e: KeyboardEvent) => {
		const all = rows();
		const index = all.indexOf(document.activeElement as HTMLElement);
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const step = e.key === 'ArrowDown' ? 1 : -1;
			all[(index + step + all.length) % all.length]?.focus();
		} else if (e.key === 'Home' || e.key === 'End') {
			e.preventDefault();
			all[e.key === 'Home' ? 0 : all.length - 1]?.focus();
		} else if (e.key === 'Tab') {
			hide();
		}
	};

	// Escape closes the menu first, ahead of the macro panel's own Escape (captured, so it runs first)
	const onWindowKey = (e: KeyboardEvent) => {
		if (!open || e.key !== 'Escape') return;
		e.preventDefault();
		e.stopPropagation();
		const refocus = menuEl?.contains(document.activeElement);
		hide();
		if (refocus) lineEl?.focus();
	};

	// A tap or click anywhere else closes it (how touch closes it)
	const onWindowPointer = (e: PointerEvent) => {
		if (!open) return;
		const target = e.target as Node;
		if (!lineEl?.contains(target) && !menuEl?.contains(target)) hide();
	};

	/**
	 * Over the line, so the menu's first row (the line itself) lands where the line is and the
	 * specialties open out below it: the row's inset in the menu (its border and padding) is measured,
	 * not assumed. Near the window's bottom, it moves up to fit.
	 */
	const place = () => {
		const base = menuEl?.querySelector<HTMLElement>('[data-base]');
		if (!lineEl || !menuEl || !base) return;
		const line = lineEl.getBoundingClientRect();
		const menu = menuEl.getBoundingClientRect();
		const row = base.getBoundingClientRect();
		const insetLeft = row.left - menu.left;
		const insetRight = menu.right - row.right;
		const margin = 8;
		const top = Math.min(
			line.top - (row.top - menu.top),
			window.innerHeight - margin - menu.height
		);
		position = {
			top: Math.max(margin, top),
			left: line.left - insetLeft,
			width: line.width + insetLeft + insetRight
		};
	};

	// Placed twice: taking the line's width can rewrap the rows, which the second fits to the window
	$effect(() => {
		if (!open || !menuEl) return;
		place();
		tick().then(place);
	});

	$effect(() => () => {
		// Leaving the sheet (say, picking ends) drops a pending open and this menu
		cancel();
		if (picker.open === name) picker.open = null;
	});
</script>

<svelte:window
	onkeydowncapture={onWindowKey}
	onpointerdown={onWindowPointer}
	onscroll={() => open && place()}
	onresize={() => open && place()}
/>

<!--
@component
A trait's line while a pool is being picked: the whole line is the choice. Without specialties,
clicking it picks the trait (or drops it). With them, hovering (or clicking, tapping, or Enter) opens
a menu over the line, as wide as it: the line itself (the trait without a specialty), then each
specialty (a Discipline's powers) below it, one at most. Picking the row already picked drops the
trait. A picked line glows; a subtracted one has a dashed ash ring.
-->
<button
	bind:this={lineEl}
	type="button"
	class="pick-line flex w-full flex-wrap items-center justify-between text-left"
	class:picked
	class:negative
	onclick={onLineClick}
	onpointerenter={onLineEnter}
	onpointerleave={onLeave}
	aria-pressed={hasMenu ? undefined : picked}
	aria-haspopup={hasMenu ? 'menu' : undefined}
	aria-expanded={hasMenu ? open : undefined}
	aria-controls={open ? `${id}-menu` : undefined}
	aria-label={hasMenu ? `${name}: pick for the pool` : `Pick ${name}`}
>
	{@render line()}
</button>

{#if open}
	<ClientPortal>
		<div
			bind:this={menuEl}
			id="{id}-menu"
			role="menu"
			aria-label={name}
			tabindex="-1"
			class="card popover-gothic fixed z-50 flex flex-col p-1"
			style:top="{position.top}px"
			style:left="{position.left}px"
			style:width={position.width === null ? undefined : `${position.width}px`}
			onpointerenter={onMenuEnter}
			onpointerleave={onLeave}
			onkeydown={onMenuKey}
			transition:fade={{ duration: 120 }}
		>
			<!-- The line itself: the trait without a specialty -->
			<button
				type="button"
				role="menuitemradio"
				aria-checked={selection === null}
				aria-label={name}
				class="menu-base flex w-full flex-wrap items-center justify-between text-left"
				class:checked={selection === null}
				data-base
				onclick={() => choose(null)}
			>
				{@render line()}
			</button>
			{#each subtraits as subtrait (subtrait)}
				{@render row(subtrait)}
			{/each}
		</div>
	</ClientPortal>
{/if}

{#snippet row(specialty: string)}
	{@const checked = selection === specialty}
	<button
		type="button"
		role="menuitemradio"
		aria-checked={checked}
		class="menu-row flex items-center gap-2 py-1.5 pr-[0.4rem] pl-1 text-left"
		class:checked
		onclick={() => choose(specialty)}
	>
		<span class="flex w-4 shrink-0 justify-center" aria-hidden="true">
			{#if checked}<Check size={14} />{/if}
		</span>
		<span class="min-w-0 flex-1 truncate italic">{specialty}</span>
		{#if !discipline}
			<span class="text-surface-300 shrink-0 text-sm tabular-nums">+1</span>
		{/if}
	</button>
{/snippet}

<style>
	/* The line as a choice: a faint bone wash on hover, a blood ring once it's picked */
	.pick-line {
		cursor: pointer;
		border-radius: 0.5rem;
		padding: 0.15rem 0.4rem;
		margin: -0.15rem -0.4rem;
		width: calc(100% + 0.8rem);
		transition:
			box-shadow 0.2s ease,
			background-color 0.2s ease;
	}

	.pick-line:hover,
	.pick-line[aria-expanded='true'] {
		background-color: color-mix(in oklab, var(--color-surface-200) 8%, transparent);
	}

	.pick-line.picked {
		background-color: color-mix(in oklab, var(--blood) 18%, transparent);
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--blood-bright) 70%, transparent),
			0 0 10px color-mix(in oklab, var(--blood-bright) 35%, transparent);
	}

	/* Subtracted (a flaw, say): a dashed ash ring, no blood */
	.pick-line.picked.negative {
		background-color: color-mix(in oklab, var(--color-surface-200) 6%, transparent);
		box-shadow: none;
		outline: 1px dashed color-mix(in oklab, var(--color-surface-200) 60%, transparent);
		outline-offset: -1px;
	}

	.pick-line:focus {
		outline: none;
	}

	.pick-line:focus-visible {
		outline: 2px solid var(--color-primary-300);
		outline-offset: 2px;
	}

	/* The line inside the menu sits exactly where the line was: the same padding */
	.menu-base {
		padding: 0.15rem 0.4rem;
	}

	.menu-base,
	.menu-row {
		border-radius: 0.5rem;
	}

	.menu-base:hover,
	.menu-base:focus-visible,
	.menu-row:hover,
	.menu-row:focus-visible {
		outline: none;
		background-color: color-mix(in oklab, var(--color-surface-200) 10%, transparent);
	}

	.menu-base.checked,
	.menu-row.checked {
		color: var(--color-primary-200);
		background-color: color-mix(in oklab, var(--blood) 25%, transparent);
	}
</style>
