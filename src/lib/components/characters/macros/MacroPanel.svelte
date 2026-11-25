<script module lang="ts">
	/** Whether the panel's view is a macro's form, where the pool is picked from the sheet. */
	export const isFormView = (view: string): boolean => view === 'add' || view === 'modify';
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { SvelteSet } from 'svelte/reactivity';
	import { Ban, Loader2, Pencil, Plus, SaveCheck, SquareFunction, X, Trash2 } from '@lucide/svelte';

	import { deleteMacro } from '$lib/api/macros';
	import { BusySubmit } from '$lib/state/busySubmit.svelte';
	import { getPoolPicker } from '$lib/state/poolPicker.svelte';
	import type { Character, Macro } from '$lib/types';
	import BusySpinner from '$lib/components/ui/BusySpinner.svelte';
	import MacroForm from './MacroForm.svelte';
	import MacroList from './MacroList.svelte';

	/**
	 * What the panel shows: the macros, the form for a new one, the macros to edit (delete, or pick
	 * one to change), or the form for one of them.
	 */
	export type MacroPanelView = 'list' | 'add' | 'edit' | 'modify';

	interface ComponentProps {
		character: Character;
		open: boolean;
		view?: MacroPanelView;
		// Shows the Add and Edit buttons, which call this with the view they open (so the page can
		// check first, then set `view`)
		onswitch?: (view: 'add' | 'edit') => void;
		// Whether editing has unsaved deletions or the new macro form has input, for the page to ask
		// before it closes the panel or leaves
		dirty?: boolean;
	}

	let {
		character,
		open = $bindable(),
		view = $bindable('list'),
		onswitch,
		dirty = $bindable(false)
	}: ComponentProps = $props();

	const macros = $derived(character.macros ?? []);

	// Editing: the names of the macros marked for deletion. Nothing is sent until Save.
	const deleted = new SvelteSet<string>();
	// The names of macros Save deleted, hidden until a live update brings macros without them, so
	// they don't reappear in the meantime
	const removed = new SvelteSet<string>();
	$effect(() => {
		const names = new Set(macros.map((macro) => macro.name));
		untrack(() => {
			for (const name of removed) if (!names.has(name)) removed.delete(name);
		});
	});
	const submit = new BusySubmit();

	// The macros shown: all of them, less those Save deleted. Editing shows the ones marked for
	// deletion struck through, so they can be brought back one at a time
	const shown = $derived(macros.filter((macro) => !removed.has(macro.name)));
	// Those still standing, less the marked ones
	const remaining = $derived(shown.filter((macro) => !deleted.has(macro.name)));
	const hasChanges = $derived(view === 'edit' && deleted.size > 0);
	// The macro being changed, in the modify view
	let target = $state<Macro | null>(null);
	const inForm = $derived(isFormView(view));
	let formDirty = $state(false); // The form has input (or changes)
	// The new macro form collapsed to a strip at the bottom, so the sheet is clear for picking traits
	let formCompact = $state(false);
	const wantsCompact = $derived(inForm && formCompact);
	// The layout shown, a beat behind: switching between the strip and the panel fades the one out,
	// switches while it's unseen, and fades the other in. The form inside stays mounted throughout
	// (it holds what's been entered), so they can't overlap. At once without motion, or while closed
	let compact = $state(false);
	let fading = $state(false);
	const FADE = 150;
	let fadeTimer: ReturnType<typeof setTimeout> | undefined;
	const reducedMotion = (): boolean =>
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	$effect(() => {
		const wanted = wantsCompact;
		untrack(() => {
			clearTimeout(fadeTimer);
			if (wanted === compact || !open || reducedMotion()) {
				compact = wanted;
				fading = false;
				return;
			}
			fading = true;
			fadeTimer = setTimeout(() => {
				compact = wanted;
				fading = false;
			}, FADE);
		});
	});
	$effect(() => () => clearTimeout(fadeTimer));
	// A new macro starts as the strip, since its pool is the main work (and the sheet should be clear
	// for it); Done opens the name and details. An edited macro's form starts full
	$effect(() => {
		const next = view;
		untrack(() => (formCompact = next === 'add'));
	});

	// Picking a trait from the sheet collapses the form, clearing the sheet for the rest (loading
	// an edited macro's pool doesn't count)
	const picker = getPoolPicker();
	let picked = 0;
	$effect(() => {
		const count = picker?.added ?? 0;
		untrack(() => {
			if (inForm && count > picked) formCompact = true;
			picked = count;
		});
	});
	// What leaving would lose: deletions not saved, or a macro not added or saved
	const unsaved = $derived(hasChanges || (inForm && formDirty));
	$effect(() => {
		dirty = unsaved;
	});

	/** Ask before discarding unsaved deletions or a new macro, as character edit mode does. True
	 * when there's nothing to lose, or the user agrees. */
	const confirmDiscard = (): boolean => !unsaved || confirm('Discard your unsaved changes?');

	/**
	 * Back out of a form (its Cancel, Escape), asking first if it has input: a new macro's to the
	 * list, an edited one's to editing.
	 */
	const cancelForm = () => {
		if (!confirmDiscard()) return;
		leaveForm();
	};

	/** Leave a form, back where it came from. */
	const leaveForm = () => {
		formDirty = false;
		view = view === 'modify' ? 'edit' : 'list';
	};

	/** Change a macro (its Edit button), asking first if deletions are marked, which it discards. */
	const modify = (macro: Macro) => {
		if (!confirmDiscard()) return;
		deleted.clear();
		target = macro;
		view = 'modify';
	};

	/** Leave editing, restoring the macros marked for deletion. */
	const discardEdits = () => {
		deleted.clear();
		submit.reset();
		view = 'list';
	};

	/** Cancel editing (Cancel, Escape), asking first if anything's marked. */
	const cancelEditing = () => {
		if (submit.busy || !confirmDiscard()) return;
		discardEdits();
	};

	/** Close the panel (its ✕), asking first if editing has unsaved deletions. */
	const close = () => {
		if (submit.busy || !confirmDiscard()) return;
		open = false;
	};

	// On phones, the panel is a sheet from the bottom, resized by dragging its handle: released, it
	// snaps to a third, 60%, or 90% of the window; dragged below a fifth, it closes (asking first,
	// as its ✕ does). Until it's dragged, it fits its content, up to 60%
	const SNAPS = [0.35, 0.6, 0.9];
	const CLOSE_BELOW = 0.2;
	let sheetHeight: number | null = $state(null); // In pixels, once dragged
	let drag: { y: number; height: number } | null = $state(null);
	const snapTo = (fraction: number) => (sheetHeight = fraction * window.innerHeight);
	const onHandleDown = (e: PointerEvent) => {
		if (!panel) return;
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		drag = { y: e.clientY, height: panel.getBoundingClientRect().height };
	};
	const onHandleMove = (e: PointerEvent) => {
		if (!drag) return;
		const height = drag.height + (drag.y - e.clientY);
		sheetHeight = Math.min(Math.max(height, 64), window.innerHeight * SNAPS.at(-1)!);
	};
	const onHandleUp = () => {
		if (!drag) return;
		drag = null;
		const fraction = (sheetHeight ?? 0) / window.innerHeight;
		if (fraction < CLOSE_BELOW) {
			sheetHeight = null;
			close();
			// Declined: back to the smallest size
			if (open) snapTo(SNAPS[0]);
			return;
		}
		const nearest = SNAPS.reduce((a, b) =>
			Math.abs(b - fraction) < Math.abs(a - fraction) ? b : a
		);
		snapTo(nearest);
	};
	// The keyboard steps between the sizes
	const onHandleKey = (e: KeyboardEvent) => {
		if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
		e.preventDefault();
		const fraction =
			(sheetHeight ?? panel?.getBoundingClientRect().height ?? 0) / window.innerHeight;
		const next =
			e.key === 'ArrowUp'
				? SNAPS.find((snap) => snap > fraction + 0.01)
				: SNAPS.findLast((snap) => snap < fraction - 0.01);
		if (next !== undefined) snapTo(next);
	};
	const sheetPercent = $derived(
		sheetHeight === null ? undefined : Math.round((sheetHeight / window.innerHeight) * 100)
	);

	// Entering editing starts fresh
	$effect(() => {
		if (view !== 'edit') return;
		untrack(() => {
			deleted.clear();
			submit.reset();
		});
	});

	// Closing discards a macro in progress or unsaved deletions, so the panel reopens on the list
	$effect(() => {
		if (open) return;
		untrack(() => {
			// Whoever closed it has asked already (the ✕, or the page's Macros button)
			if (view === 'edit') discardEdits();
			formDirty = false;
			view = 'list';
		});
	});

	/**
	 * Save the deletions, one macro at a time: at once, the bot's saves could race, one undoing
	 * another. Each deleted macro moves from marked to removed. The first failure stops it, leaving
	 * the rest marked, and says which; otherwise it's back to the list.
	 */
	const save = async () => {
		if (!hasChanges) return;
		const id = character._id;
		const done = await submit.run(async () => {
			for (const name of [...deleted]) {
				const outcome = await deleteMacro(id, name);
				if (outcome.error !== undefined) {
					return { error: `Couldn’t delete ${name}. ${outcome.error}` };
				}
				deleted.delete(name);
				removed.add(name);
			}
			return { result: null };
		});
		if (!done) return;
		submit.reset();
		view = 'list';
	};

	// Escape backs out of the form or editing, then closes the panel, unless something over it (a
	// popover or dialog) takes the key first
	// Just viewing, a click (or tap) anywhere else closes the panel; editing and the forms stay open,
	// since the sheet is where their pools come from
	let panel: HTMLElement | undefined = $state();
	const handlePointer = (e: PointerEvent) => {
		if (!open || view !== 'list' || !panel) return;
		if (!panel.contains(e.target as Node)) open = false;
	};

	const handleKey = (e: KeyboardEvent) => {
		if (!open || e.key !== 'Escape' || e.defaultPrevented) return;
		if (inForm) {
			cancelForm();
		} else if (view === 'edit') {
			cancelEditing();
		} else {
			open = false;
		}
	};

	// The panel's name, for screen readers, and its title, which editing shortens so the header's
	// buttons (Cancel, Delete N) fit on one line beside it. Editing a macro names it
	const names: Record<MacroPanelView, string> = $derived({
		list: 'Macros',
		add: 'New Macro',
		edit: 'Edit Macros',
		modify: target ? `Edit ${target.name}` : 'Edit Macro'
	});
	const titles: Record<MacroPanelView, string> = $derived({ ...names, edit: 'Edit' });

	// Switching views crossfades: the old and new share a grid cell while one fades out and the
	// other in, so neither waits for the other
	const crossfade = { duration: 200 };
	// The header's buttons, which change with the view, crossfade in place at its right
	const stacked = 'col-start-1 row-start-1 flex items-center gap-1';
</script>

<svelte:window onkeydown={handleKey} onpointerdown={handlePointer} />

<!--
@component
The macros in a floating panel, opened from a Macros button. It isn't modal: the sheet stays usable
beside it (it's where a new macro's pool will come from). With `onswitch`, Add switches it to the
new macro form, and Edit (with macros to edit) to editing: each macro gets Edit and Delete buttons,
and Cancel and Save replace Add and Edit. A macro's Edit opens its form, which returns to editing. On phones it sits at the bottom, where the floating buttons were (they make way while it's open); wider, at the
window's right, below the tab row (and the Macros button).
-->
{#if compact}
	<!-- Room at the end of the page, so its last rows can scroll clear of the strip. Phones have the
	     page's own, for the floating buttons beside it -->
	<div class="hidden h-24 sm:block" aria-hidden="true"></div>
{/if}

{#if open}
	<div
		bind:this={panel}
		id="macro-panel"
		role="dialog"
		aria-modal="false"
		class={[
			'card popover-gothic fixed z-40 flex flex-col transition-[opacity,height] duration-150',
			drag && 'transition-none',
			// Resized as a sheet (phones only)
			!compact && sheetHeight !== null && 'max-sm:h-(--sheet-height) max-sm:max-h-none',
			fading && 'opacity-0',
			compact && 'pool-strip',
			compact
				? // A strip along the bottom: the window's width on phones (the floating buttons make
					// way while the panel's open)
					'inset-x-4 bottom-4 sm:right-auto sm:bottom-6 sm:left-1/2 sm:w-[36rem] sm:-translate-x-1/2'
				: 'inset-x-4 bottom-4 max-h-[60vh] sm:inset-x-auto sm:top-60 sm:right-6 sm:bottom-auto sm:max-h-[calc(100vh-16.5rem)] sm:w-96'
		]}
		aria-labelledby={compact ? undefined : 'macro-panel-title'}
		aria-label={compact ? names[view] : undefined}
		style:--sheet-height={sheetHeight === null ? undefined : `${sheetHeight}px`}
		transition:fly={{ x: 24, duration: 200 }}
	>
		{#if !compact}
			<!-- The sheet's handle (phones): drag it to resize the panel, or below a fifth to close it -->
			<div
				role="slider"
				aria-orientation="vertical"
				aria-label="Macros panel height"
				aria-valuenow={sheetPercent ?? 60}
				aria-valuetext="{sheetPercent ?? 60}% of the screen"
				aria-valuemin={Math.round(SNAPS[0] * 100)}
				aria-valuemax={Math.round(SNAPS.at(-1)! * 100)}
				tabindex="0"
				class="[&:focus-visible>span]:bg-primary-300 flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-1 focus-visible:outline-none sm:hidden"
				onpointerdown={onHandleDown}
				onpointermove={onHandleMove}
				onpointerup={onHandleUp}
				onpointercancel={onHandleUp}
				onkeydown={onHandleKey}
			>
				<span class="bg-surface-400 h-1 w-10 rounded-full"></span>
			</div>
		{/if}
		<header class="border-surface-500 flex items-center gap-2 border-b px-4 py-3" hidden={compact}>
			<SquareFunction size={18} class="text-primary-400 shrink-0" />
			<h2
				id="macro-panel-title"
				class="font-display grid min-w-0 text-sm tracking-[0.04em] uppercase"
			>
				<span class="sr-only">{names[view]}</span>
				{#key view}
					<span
						class="col-start-1 row-start-1 truncate"
						aria-hidden="true"
						transition:fade={crossfade}>{titles[view]}</span
					>
				{/key}
			</h2>
			<div class="ml-auto grid justify-items-end">
				{#if onswitch && view === 'list'}
					<div class={stacked} transition:fade={crossfade}>
						{#if macros.length > 0}
							<button
								type="button"
								class="btn btn-sm btn-gothic btn-gothic-bone"
								onclick={() => onswitch('edit')}
								aria-label="Edit macros"
							>
								<Pencil size={14} />
								<span>Edit</span>
							</button>
						{/if}
						<button
							type="button"
							class="btn btn-sm btn-gothic btn-gothic-bone"
							onclick={() => onswitch('add')}
							aria-label="Add macro"
						>
							<Plus size={16} />
							<span>Add</span>
						</button>
					</div>
				{:else if view === 'edit'}
					<div class={stacked} transition:fade={crossfade}>
						<button
							type="button"
							class="btn btn-sm btn-gothic btn-gothic-ash"
							onclick={cancelEditing}
							disabled={submit.busy}
						>
							<Ban size={14} />
							<span>Cancel</span>
						</button>
						<button
							type="button"
							class="btn btn-sm btn-gothic btn-gothic-blood"
							onclick={save}
							disabled={submit.busy || !hasChanges}
							aria-busy={submit.busy}
						>
							{#if submit.busy}
								<Loader2 size={14} class="animate-spin" />
							{:else if deleted.size > 0}
								<Trash2 size={14} />
							{:else}
								<SaveCheck size={14} />
							{/if}
							<!-- Saving only deletes, so it says how many -->
							<span>{deleted.size > 0 ? `Delete ${deleted.size}` : 'Save'}</span>
						</button>
					</div>
				{/if}
			</div>
			<button
				type="button"
				class="hover:preset-tonal-surface rounded-full p-1 opacity-70 hover:opacity-100"
				onclick={close}
				aria-label="Close macros"
				title="Close (Esc)"
			>
				<X size={16} />
			</button>
		</header>
		<!-- In the strip, a list still fading out (picking straight after Add) stays out of it -->
		<div
			class={[
				'grid min-h-0 overflow-y-auto px-4',
				compact ? 'py-2 [&>[data-list]]:hidden' : 'py-3'
			]}
		>
			{#if inForm}
				<!-- Keyed, so editing another macro starts a fresh form -->
				{#key view === 'modify' ? target : null}
					<div class="col-start-1 row-start-1" transition:fade={crossfade}>
						<MacroForm
							{character}
							macro={view === 'modify' ? (target ?? undefined) : undefined}
							bind:dirty={formDirty}
							bind:compact={() => compact, (value) => (formCompact = value)}
							oncancel={cancelForm}
							onsaved={leaveForm}
						/>
					</div>
				{/key}
			{:else}
				<!-- The list and editing share this: editing adds the Delete buttons -->
				<div
					class="col-start-1 row-start-1 flex flex-col gap-3"
					data-list
					transition:fade={crossfade}
				>
					{#if submit.busy}
						<BusySpinner label="Saving the macros…" />
					{:else}
						{#if shown.length > 0}
							<MacroList
								{character}
								macros={view === 'edit' ? shown : remaining}
								layout="stack"
								ondelete={view === 'edit' ? (macro) => deleted.add(macro.name) : undefined}
								onedit={view === 'edit' ? modify : undefined}
								marked={view === 'edit' ? deleted : undefined}
								onrestore={(macro) => deleted.delete(macro.name)}
							/>
							{#if view === 'edit' && remaining.length === 0}
								<p class="text-surface-300 italic">Saving will delete all of the macros.</p>
							{/if}
						{:else}
							<p class="text-surface-300 italic">No macros yet.</p>
						{/if}
						{#if submit.error}
							<p class="card preset-tonal-error p-3 text-sm" role="alert">{submit.error}</p>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* The strip stands out from the sheet it floats over: a blood-tinted panel with a crimson edge
	   and a faint glow (popover-gothic's fill and border are variables) */
	.pool-strip {
		--popover-bg: color-mix(in oklab, var(--blood-dark) 45%, var(--color-surface-900));
		--popover-border: color-mix(in oklab, var(--blood-bright) 60%, var(--color-surface-400));
		box-shadow:
			inset 0 0 0 3px var(--popover-bg),
			inset 0 0 0 4px color-mix(in oklab, var(--blood-bright) 30%, transparent),
			0 0 0 1px oklch(0% 0 0 / 0.6),
			0 0 24px color-mix(in oklab, var(--blood-bright) 25%, transparent),
			0 20px 40px -12px oklch(0% 0 0 / 0.9);
	}
</style>
