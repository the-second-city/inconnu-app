/**
 * The macro panel's deletions: the macros marked in editing (nothing's sent until Save), and those
 * Save deleted, hidden until a live update brings macros without them, so they don't reappear in
 * the meantime.
 */

import { SvelteSet } from 'svelte/reactivity';

import { deleteMacro } from '$lib/api/macros';
import { BusySubmit } from '$lib/state/busySubmit.svelte';
import type { Macro } from '$lib/types';

export class MacroDeletions {
	/** The names of the macros marked for deletion. */
	readonly marked = new SvelteSet<string>();
	/** The names of the macros Save deleted, hidden until the character's macros lack them. */
	readonly removed = new SvelteSet<string>();
	/** Save's spinner and error. */
	readonly submit = new BusySubmit();

	/** The macros to show: all but those Save deleted. */
	shown(macros: Macro[]): Macro[] {
		return macros.filter((macro) => !this.removed.has(macro.name));
	}

	/** The macros still standing: those shown, less the marked ones. */
	standing(macros: Macro[]): Macro[] {
		return this.shown(macros).filter((macro) => !this.marked.has(macro.name));
	}

	/**
	 * Catch up with the character's macros (a live update): stop hiding the deleted ones it no longer
	 * has, and unmark any that went away elsewhere (not mid-save, which unmarks them itself).
	 */
	sync(macros: Macro[]): void {
		const present = macros.map((macro) => macro.name);
		for (const name of this.removed) if (!present.includes(name)) this.removed.delete(name);
		if (this.submit.busy) return;
		for (const name of this.marked) if (!present.includes(name)) this.marked.delete(name);
	}

	/** Unmark everything, and clear Save's state: back to the macros as they are. */
	discard(): void {
		this.marked.clear();
		this.submit.reset();
	}

	/**
	 * Delete the marked macros, one at a time: at once, the bot's saves could race, one undoing
	 * another. Each deleted macro moves from marked to removed. The first failure stops it, leaving
	 * the rest marked and saying which (`submit.error`). Once they've all gone, waits for `refetch`.
	 * Returns whether they all went.
	 */
	async save(characterId: string, refetch?: () => Promise<void>): Promise<boolean> {
		const done = await this.submit.run(async () => {
			for (const name of [...this.marked]) {
				const outcome = await deleteMacro(characterId, name);
				if (outcome.error !== undefined) {
					return { error: `Couldn’t delete ${name}. ${outcome.error}` };
				}
				this.marked.delete(name);
				this.removed.add(name);
			}
			await refetch?.();
			return { result: null };
		});
		if (!done) return false;
		this.submit.reset();
		return true;
	}
}
