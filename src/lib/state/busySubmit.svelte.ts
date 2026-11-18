import { atLeast } from '$lib/state/busy';
import type { ActionOutcome } from '$lib/api/characterActions';

/**
 * A modal's submit, as Slake, Apply Stains, and Take Damage do it: a spinner in place of the
 * content for at least the busy delay. On success it keeps spinning, so the modal can close without
 * its content flashing back; on failure the content returns, saying why.
 */
export class BusySubmit {
	busy = $state(false);
	error: string | null = $state(null);

	/** Back to the content, as when the modal opens. */
	reset(): void {
		this.busy = false;
		this.error = null;
	}

	/**
	 * Run the request behind the spinner. Returns its result, still spinning (close the modal, or
	 * `reset()` to show something else); or, on an error, null, the content back with the error. Does
	 * nothing (null) while a request is already running.
	 */
	async run<T>(request: () => Promise<ActionOutcome<T>>): Promise<{ result: T } | null> {
		if (this.busy) return null;
		this.busy = true;
		this.error = null;
		const outcome = await atLeast(request());
		if (outcome.error !== undefined) {
			this.busy = false;
			this.error = outcome.error;
			return null;
		}
		return { result: outcome.result };
	}
}
