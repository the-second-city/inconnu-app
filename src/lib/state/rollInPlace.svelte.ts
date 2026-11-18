import { atLeast } from '$lib/state/busy';
import type { ActionOutcome } from '$lib/api/characterActions';

/** Where a roll that happens in place is: choosing, tumbling, revealing, or showing its outcome. */
export type RollPhase = 'options' | 'rolling' | 'revealing' | 'done';

/**
 * A roll that happens in place, as Remorse, Frenzy, and Mend do: rolling locks the options, the
 * dice tumble for at least `stepDelay` while the request runs, the modal reveals them, then shows
 * the outcome. It keeps the character as the roll began (`shown`), since the roll's live update
 * lands mid-reveal, which would change what's on screen under the dice.
 */
export class RollInPlace<C> {
	phase: RollPhase = $state('options');
	error: string | null = $state(null);
	#from: C | null = $state(null);
	#generation = 0; // Bumped by reset(), so a roll that was under way can tell it was dropped
	#current: () => C;

	/** @param current The character as it is now (a getter, so it follows the prop). */
	constructor(current: () => C) {
		this.#current = current;
	}

	/** Whether the roll has begun, locking the options. */
	get locked(): boolean {
		return this.phase !== 'options';
	}

	/** Whether the dice are in and the outcome shows. */
	get done(): boolean {
		return this.phase === 'done';
	}

	/** Whether the dice are tumbling or revealing: rolled, but not done. */
	get rolling(): boolean {
		return this.phase === 'rolling' || this.phase === 'revealing';
	}

	/** Whether the modal may close (Escape): not while the dice are rolling. */
	get closable(): boolean {
		return !this.rolling;
	}

	/** The character as the roll began, or as it is before one. */
	get shown(): C {
		return this.#from ?? this.#current();
	}

	/** Back to the options, as when the modal opens. */
	reset(): void {
		this.#generation++;
		this.phase = 'options';
		this.error = null;
		this.#from = null;
	}

	/**
	 * Roll: lock the options and run the request for at least `stepDelay` while the dice tumble.
	 * Returns the result, with the phase at `revealing`; or, on an error, unlocks the options, saying
	 * why, and returns null. Does nothing (null) if a roll is already under way. If `reset()` ran
	 * while the request did (the modal reopened), the roll was dropped: null, the new view untouched.
	 */
	async roll<T>(request: () => Promise<ActionOutcome<T>>, stepDelay: number): Promise<T | null> {
		if (this.locked) return null;
		this.phase = 'rolling';
		this.error = null;
		this.#from = $state.snapshot(this.#current()) as C;
		const generation = this.#generation;
		const outcome = await atLeast(request(), stepDelay);
		if (generation !== this.#generation) return null;
		if (outcome.error !== undefined) {
			this.reset();
			this.error = outcome.error;
			return null;
		}
		this.phase = 'revealing';
		return outcome.result;
	}

	/** The dice are in: show the outcome. (Not if the roll was reset while its dice revealed.) */
	finish(): void {
		if (this.phase === 'revealing') this.phase = 'done';
	}
}
