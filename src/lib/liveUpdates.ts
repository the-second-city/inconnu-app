/**
 * Live character updates: the Inconnu API streams a message whenever a character changes, and the
 * page reruns its loader for the fresh data (which also re-checks access).
 */

/** The character page loader's dependency, which `invalidate()` reruns. */
export const CHARACTER_DEPENDENCY = 'app:character';

/** The first wait before reconnecting after the server refused the stream. It doubles each time. */
export const RETRY_MIN_MS = 5_000;
/** The longest wait before reconnecting. */
export const RETRY_MAX_MS = 60_000;
/** How long a connection must stay open to count as working, which resets the backoff. Opening
 * isn't enough: a refusal (`gone`) arrives on a stream that opened fine. */
export const STABLE_MS = 5_000;
/** How long the tab can be hidden before the stream closes, so a quick look at another tab or app
 * doesn't cost a reconnection and a refetch. */
export const HIDDEN_GRACE_MS = 30_000;
/** How long to wait for more changes before refetching, as one command can save several times. */
export const DEBOUNCE_MS = 250;

/**
 * Watch a character's event stream, calling `onChange` when it may have changed. Returns a function
 * that stops watching. Calls are debounced: `onChange` runs once things have been quiet for
 * `DEBOUNCE_MS`.
 *
 * - Each `changed` message calls `onChange`. So do `deleted` and `gone` (signed out, or no access to
 *   the character), which also close the stream and retry it with backoff. They don't end the
 *   watch: if the refusal is for good, the refetch shows why (an error page, sign-in), which unmounts
 *   the page and stops the watch. If the page survives the refetch, the refusal was a blip, and the
 *   retry brings live updates back.
 * - Once the tab has been hidden for `HIDDEN_GRACE_MS`, the stream is closed (until then, it carries
 *   on as usual, so a quick absence costs nothing). When it's visible again, the stream reopens, and
 *   once it's open, `onChange` is called, since anything could have happened in the meantime. (Not
 *   before: if the API were down, the refetch would replace the page with an error. A character
 *   deleted meanwhile gets `gone` instead.)
 * - After a dropped connection, the browser reconnects by itself; after a refused one (an error
 *   status, such as while the bot restarts), it gives up, so this retries with backoff. Any way it
 *   reconnects, events may have been missed, so reconnecting calls `onChange`.
 */
export const watchCharacter = (url: string, onChange: () => void): (() => void) => {
	let source: EventSource | null = null;
	let retryTimer: ReturnType<typeof setTimeout> | undefined;
	let retryDelay = RETRY_MIN_MS;
	let missed = false; // Events may have been missed while disconnected
	let ended = false;
	let changeTimer: ReturnType<typeof setTimeout> | undefined;
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	/** Call `onChange` once things have been quiet for a moment. */
	const changed = () => {
		clearTimeout(changeTimer);
		changeTimer = setTimeout(onChange, DEBOUNCE_MS);
	};

	const connect = () => {
		retryTimer = undefined;
		const es = new EventSource(url);
		source = es;
		let openedAt: number | null = null;

		es.onopen = () => {
			openedAt = Date.now();
			if (missed) {
				missed = false;
				changed();
			}
		};
		es.onmessage = ({ data }: MessageEvent<string>) => {
			if (data === 'deleted' || data === 'gone') retryLater(es, openedAt);
			else if (data !== 'changed') return; // Not one of ours
			changed();
		};
		es.onerror = () => {
			missed = true;
			if (es.readyState !== EventSource.CLOSED) return; // The browser is reconnecting
			retryLater(es, openedAt);
		};
	};

	/** Close a stream and reconnect after the backoff delay, which then doubles. A stream that had
	 * been open (since `openedAt`) for long enough was working, so the backoff starts over. */
	const retryLater = (es: EventSource, openedAt: number | null) => {
		es.close();
		source = null;
		missed = true;
		if (openedAt !== null && Date.now() - openedAt >= STABLE_MS) retryDelay = RETRY_MIN_MS;
		retryTimer = setTimeout(connect, retryDelay);
		retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
	};

	const disconnect = () => {
		clearTimeout(retryTimer);
		retryTimer = undefined;
		source?.close();
		source = null;
	};

	const onVisibilityChange = () => {
		clearTimeout(hideTimer); // Hidden and shown again within the grace: nothing to do
		hideTimer = undefined;
		if (document.visibilityState === 'hidden') {
			hideTimer = setTimeout(disconnect, HIDDEN_GRACE_MS);
		} else if (!source && !retryTimer) {
			missed = true;
			retryDelay = RETRY_MIN_MS;
			connect();
		}
	};

	/** Stop watching for good. */
	const stop = () => {
		if (ended) return;
		ended = true;
		clearTimeout(changeTimer);
		clearTimeout(hideTimer);
		disconnect();
		document.removeEventListener('visibilitychange', onVisibilityChange);
	};

	document.addEventListener('visibilitychange', onVisibilityChange);
	if (document.visibilityState !== 'hidden') connect();

	return stop;
};
