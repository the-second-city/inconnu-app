<script lang="ts">
	import { untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { SvelteSet } from 'svelte/reactivity';
	import { Ban, Loader2, Pencil, Plus, SaveCheck, SquareFunction, X } from '@lucide/svelte';

	import { deleteMacro } from '$lib/api/macros';
	import { BusySubmit } from '$lib/state/busySubmit.svelte';
	import type { Character } from '$lib/types';
	import BusySpinner from '$lib/components/ui/BusySpinner.svelte';
	import MacroForm from './MacroForm.svelte';
	import MacroList from './MacroList.svelte';

	/** What the panel shows: the macros, the form for a new one, or the macros to edit. */
	export type MacroPanelView = 'list' | 'add' | 'edit';

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

	// The macros still standing: all of them, less those marked or deleted
	const remaining = $derived(
		macros.filter((macro) => !deleted.has(macro.name) && !removed.has(macro.name))
	);
	const hasChanges = $derived(view === 'edit' && deleted.size > 0);
	let formDirty = $state(false); // The new macro form has input
	// The new macro form collapsed to a strip at the bottom, so the sheet is clear for picking traits
	let formCompact = $state(false);
	const compact = $derived(view === 'add' && formCompact);
	// A new form starts full
	$effect(() => {
		if (view !== 'add') formCompact = false;
	});
	// What leaving would lose: deletions not saved, or a new macro not added
	const unsaved = $derived(hasChanges || (view === 'add' && formDirty));
	$effect(() => {
		dirty = unsaved;
	});

	/** Ask before discarding unsaved deletions or a new macro, as character edit mode does. True
	 * when there's nothing to lose, or the user agrees. */
	const confirmDiscard = (): boolean => !unsaved || confirm('Discard your unsaved changes?');

	/** Back out of the new macro form (its Cancel, Escape), asking first if it has input. */
	const cancelAdding = () => {
		if (!confirmDiscard()) return;
		formDirty = false;
		view = 'list';
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
	const handleKey = (e: KeyboardEvent) => {
		if (!open || e.key !== 'Escape' || e.defaultPrevented) return;
		if (view === 'add') {
			cancelAdding();
		} else if (view === 'edit') {
			cancelEditing();
		} else {
			open = false;
		}
	};

	const titles: Record<MacroPanelView, string> = {
		list: 'Macros',
		add: 'New Macro',
		edit: 'Edit Macros'
	};

	// Switching views crossfades: the old and new share a grid cell while one fades out and the
	// other in, so neither waits for the other
	const crossfade = { duration: 200 };
	// The header's buttons, which change with the view, crossfade in place at its right
	const stacked = 'col-start-1 row-start-1 flex items-center gap-1';
</script>

<svelte:window onkeydown={handleKey} />

<!--
@component
The macros in a floating panel, opened from a Macros button. It isn't modal: the sheet stays usable
beside it (it's where a new macro's pool will come from). With `onswitch`, Add switches it to the
new macro form, and Edit (with macros to edit) to editing: each macro gets a Delete button, and
Cancel and Save replace Add and Edit. On phones it sits above the floating buttons; wider, at the
window's right, below the tab row (and the Macros button).
-->
{#if compact}
	<!-- Room at the end of the page, so its last rows can scroll clear of the strip. Phones have the
	     page's own, for the floating buttons beside it -->
	<div class="hidden h-24 sm:block" aria-hidden="true"></div>
{/if}

{#if open}
	<div
		id="macro-panel"
		role="dialog"
		aria-modal="false"
		class={[
			'card popover-gothic fixed z-40 flex flex-col',
			compact
				? // A strip along the bottom: on phones, clear of the floating buttons at the right
					'right-28 bottom-6 left-4 sm:right-auto sm:left-1/2 sm:w-[36rem] sm:-translate-x-1/2'
				: 'inset-x-4 bottom-46 max-h-[60vh] sm:inset-x-auto sm:top-60 sm:right-6 sm:bottom-auto sm:max-h-[calc(100vh-16.5rem)] sm:w-96'
		]}
		aria-labelledby={compact ? undefined : 'macro-panel-title'}
		aria-label={compact ? 'New Macro' : undefined}
		transition:fly={{ x: 24, duration: 200 }}
	>
		<header class="border-surface-500 flex items-center gap-2 border-b px-4 py-3" hidden={compact}>
			<SquareFunction size={18} class="text-primary-400 shrink-0" />
			<h2 id="macro-panel-title" class="font-display grid text-sm tracking-[0.04em] uppercase">
				{#key view}
					<span class="col-start-1 row-start-1" transition:fade={crossfade}>{titles[view]}</span>
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
							{:else}
								<SaveCheck size={14} />
							{/if}
							<span>Save</span>
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
		<div class={['grid overflow-y-auto px-4', compact ? 'py-2' : 'py-3']}>
			{#if view === 'add'}
				<div class="col-start-1 row-start-1" transition:fade={crossfade}>
					<MacroForm
						{character}
						bind:dirty={formDirty}
						bind:compact={formCompact}
						oncancel={cancelAdding}
						onsaved={() => {
							formDirty = false;
							view = 'list';
						}}
					/>
				</div>
			{:else}
				<!-- The list and editing share this: editing adds the Delete buttons -->
				<div class="col-start-1 row-start-1 flex flex-col gap-3" transition:fade={crossfade}>
					{#if submit.busy}
						<BusySpinner label="Saving the macros…" />
					{:else}
						{#if remaining.length > 0}
							<MacroList
								{character}
								macros={remaining}
								layout="stack"
								ondelete={view === 'edit' ? (macro) => deleted.add(macro.name) : undefined}
							/>
						{:else if view === 'edit'}
							<p class="text-surface-300 italic">Saving will delete all of the macros.</p>
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
