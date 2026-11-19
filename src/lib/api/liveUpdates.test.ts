import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import {
	DEBOUNCE_MS,
	HIDDEN_GRACE_MS,
	RETRY_MAX_MS,
	RETRY_MIN_MS,
	STABLE_MS,
	watchCharacter
} from './liveUpdates';

const URL = '/api/characters/id/events';

/** A stand-in for the browser's EventSource, driven by the test. */
class FakeEventSource {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSED = 2;
	/** Every source created, oldest first. */
	static instances: FakeEventSource[] = [];

	readyState = FakeEventSource.CONNECTING;
	onopen: (() => void) | null = null;
	onmessage: ((event: MessageEvent<string>) => void) | null = null;
	onerror: (() => void) | null = null;

	constructor(readonly url: string) {
		FakeEventSource.instances.push(this);
	}

	close(): void {
		this.readyState = FakeEventSource.CLOSED;
	}

	/** The connection opens. */
	open(): void {
		this.readyState = FakeEventSource.OPEN;
		this.onopen?.();
	}

	/** A message arrives. */
	message(data: string): void {
		this.onmessage?.(new MessageEvent('message', { data }));
	}

	/** The connection drops, and the browser will reconnect by itself. */
	drop(): void {
		this.readyState = FakeEventSource.CONNECTING;
		this.onerror?.();
	}

	/** The server refuses the connection (an error status), so the browser gives up. */
	refuse(): void {
		this.readyState = FakeEventSource.CLOSED;
		this.onerror?.();
	}
}

/** A stand-in for `document`, whose visibility the test sets. */
class FakeDocument extends EventTarget {
	visibilityState: DocumentVisibilityState = 'visible';

	/** Hide or show the tab. */
	setVisibility(state: DocumentVisibilityState): void {
		this.visibilityState = state;
		this.dispatchEvent(new Event('visibilitychange'));
	}
}

let doc: FakeDocument;
let onChange: Mock<() => void>;

/** The most recently created event source. */
const latest = (): FakeEventSource => FakeEventSource.instances.at(-1) as FakeEventSource;

/** Let the debounce run out, so a pending refetch happens. */
const settle = (): void => {
	vi.advanceTimersByTime(DEBOUNCE_MS);
};

/** Whether any event source is still open or connecting. */
const anyLive = (): boolean =>
	FakeEventSource.instances.some((source) => source.readyState !== FakeEventSource.CLOSED);

beforeEach(() => {
	vi.useFakeTimers();
	FakeEventSource.instances = [];
	doc = new FakeDocument();
	onChange = vi.fn();
	vi.stubGlobal('EventSource', FakeEventSource);
	vi.stubGlobal('document', doc);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

test('connects to the stream without refetching', () => {
	watchCharacter(URL, onChange);
	latest().open();

	expect(FakeEventSource.instances.map((source) => source.url)).toEqual([URL]);
	settle();
	expect(onChange).not.toHaveBeenCalled();
});

test('each change refetches', () => {
	watchCharacter(URL, onChange);
	latest().open();
	latest().message('changed');
	settle();
	latest().message('changed');

	settle();
	expect(onChange).toHaveBeenCalledTimes(2);
});

test('other messages are ignored', () => {
	watchCharacter(URL, onChange);
	latest().open();
	latest().message('ping');

	settle();
	expect(onChange).not.toHaveBeenCalled();
});

test.each(['deleted', 'gone'])('%s refetches, then retries with backoff', (data) => {
	watchCharacter(URL, onChange);
	latest().open();
	latest().message(data);

	settle();
	expect(onChange).toHaveBeenCalledOnce();
	expect(anyLive()).toBe(false);

	// Refused again: the wait doubles
	vi.advanceTimersByTime(RETRY_MIN_MS);
	expect(FakeEventSource.instances).toHaveLength(2);
	latest().message(data);
	vi.advanceTimersByTime(RETRY_MIN_MS * 2 - 1);
	expect(FakeEventSource.instances).toHaveLength(2);
	vi.advanceTimersByTime(1);
	expect(FakeEventSource.instances).toHaveLength(3);
});

test('live updates come back if the page survives a refusal', () => {
	watchCharacter(URL, onChange);
	latest().open();
	latest().message('gone');
	settle();
	onChange.mockClear();

	vi.advanceTimersByTime(RETRY_MIN_MS);
	latest().open();
	settle();
	expect(onChange).toHaveBeenCalledOnce(); // Events may have been missed meanwhile

	latest().message('changed');
	settle();
	expect(onChange).toHaveBeenCalledTimes(2);
});

test('stopping closes the stream', () => {
	const stop = watchCharacter(URL, onChange);
	stop();

	expect(anyLive()).toBe(false);
	doc.setVisibility('hidden');
	doc.setVisibility('visible');
	expect(FakeEventSource.instances).toHaveLength(1);
});

test('hiding the tab closes the stream after the grace, and showing it reconnects, then refetches', () => {
	watchCharacter(URL, onChange);
	latest().open();

	doc.setVisibility('hidden');
	vi.advanceTimersByTime(HIDDEN_GRACE_MS - 1);
	expect(anyLive()).toBe(true);
	vi.advanceTimersByTime(1);
	expect(anyLive()).toBe(false);

	doc.setVisibility('visible');
	expect(FakeEventSource.instances).toHaveLength(2);
	settle();
	expect(onChange).not.toHaveBeenCalled();

	latest().open();
	settle();
	expect(onChange).toHaveBeenCalledOnce();
});

test("showing the tab while the API is down doesn't refetch until it's back", () => {
	watchCharacter(URL, onChange);
	latest().open();
	doc.setVisibility('hidden');
	vi.advanceTimersByTime(HIDDEN_GRACE_MS);

	doc.setVisibility('visible');
	latest().refuse();
	vi.advanceTimersByTime(RETRY_MIN_MS);
	settle();
	expect(onChange).not.toHaveBeenCalled();

	latest().open();
	settle();
	expect(onChange).toHaveBeenCalledOnce();
});

test('a tab that opens hidden connects once shown', () => {
	doc.visibilityState = 'hidden';
	watchCharacter(URL, onChange);
	expect(FakeEventSource.instances).toHaveLength(0);

	doc.setVisibility('visible');
	expect(FakeEventSource.instances).toHaveLength(1);
});

test('reconnecting after a dropped connection refetches', () => {
	watchCharacter(URL, onChange);
	latest().open();

	latest().drop();
	settle();
	expect(onChange).not.toHaveBeenCalled();
	latest().open(); // The browser's own reconnection

	expect(FakeEventSource.instances).toHaveLength(1);
	settle();
	expect(onChange).toHaveBeenCalledOnce();
});

test('a refused connection retries with backoff, then refetches', () => {
	watchCharacter(URL, onChange);
	latest().refuse();

	// Each refusal doubles the wait, up to the maximum
	let delay = RETRY_MIN_MS;
	for (let attempt = 2; delay <= RETRY_MAX_MS; attempt++) {
		vi.advanceTimersByTime(delay - 1);
		expect(FakeEventSource.instances).toHaveLength(attempt - 1);
		vi.advanceTimersByTime(1);
		expect(FakeEventSource.instances).toHaveLength(attempt);
		latest().refuse();
		delay *= 2;
	}
	const attempts = FakeEventSource.instances.length;
	vi.advanceTimersByTime(RETRY_MAX_MS);
	expect(FakeEventSource.instances).toHaveLength(attempts + 1);

	latest().open();
	settle();
	expect(onChange).toHaveBeenCalledOnce();
});

test('a connection that stays open resets the backoff', () => {
	watchCharacter(URL, onChange);
	latest().refuse();
	vi.advanceTimersByTime(RETRY_MIN_MS);
	latest().refuse();
	vi.advanceTimersByTime(RETRY_MIN_MS * 2);
	latest().open();
	vi.advanceTimersByTime(STABLE_MS);

	latest().refuse();
	vi.advanceTimersByTime(RETRY_MIN_MS);
	expect(FakeEventSource.instances).toHaveLength(4);
});

test.each(['gone', 'deleted'])('repeated %s backs off, though each stream opens first', (data) => {
	watchCharacter(URL, onChange);

	let delay = RETRY_MIN_MS;
	for (let attempt = 1; delay <= RETRY_MAX_MS; attempt++) {
		latest().open();
		latest().message(data);
		vi.advanceTimersByTime(delay - 1);
		expect(FakeEventSource.instances).toHaveLength(attempt);
		vi.advanceTimersByTime(1);
		expect(FakeEventSource.instances).toHaveLength(attempt + 1);
		delay *= 2;
	}
});

test('a tab hidden past the grace stops retrying', () => {
	watchCharacter(URL, onChange);
	latest().refuse();

	doc.setVisibility('hidden');
	vi.advanceTimersByTime(HIDDEN_GRACE_MS);
	const attempts = FakeEventSource.instances.length;
	vi.advanceTimersByTime(RETRY_MAX_MS);
	expect(FakeEventSource.instances).toHaveLength(attempts);

	doc.setVisibility('visible');
	expect(FakeEventSource.instances).toHaveLength(attempts + 1);
	latest().open();
	settle();
	expect(onChange).toHaveBeenCalledOnce();
});

test('a burst of changes refetches once, once they stop', () => {
	watchCharacter(URL, onChange);
	latest().open();
	for (let i = 0; i < 3; i++) {
		latest().message('changed');
		vi.advanceTimersByTime(DEBOUNCE_MS - 1);
	}
	expect(onChange).not.toHaveBeenCalled();

	vi.advanceTimersByTime(1);
	expect(onChange).toHaveBeenCalledOnce();
});

test('stopping cancels a pending refetch', () => {
	const stop = watchCharacter(URL, onChange);
	latest().open();
	latest().message('changed');
	stop();

	settle();
	expect(onChange).not.toHaveBeenCalled();
});

test('hiding the tab briefly keeps the stream, with no refetch', () => {
	watchCharacter(URL, onChange);
	latest().open();

	doc.setVisibility('hidden');
	vi.advanceTimersByTime(HIDDEN_GRACE_MS - 1);
	doc.setVisibility('visible');
	vi.advanceTimersByTime(HIDDEN_GRACE_MS);

	expect(anyLive()).toBe(true);
	expect(FakeEventSource.instances).toHaveLength(1);
	expect(onChange).not.toHaveBeenCalled();
});

test('changes still refetch during the grace', () => {
	watchCharacter(URL, onChange);
	latest().open();
	doc.setVisibility('hidden');

	latest().message('changed');
	settle();

	expect(onChange).toHaveBeenCalledOnce();
});

test('stopping during the grace cancels it', () => {
	const stop = watchCharacter(URL, onChange);
	latest().open();
	doc.setVisibility('hidden');
	stop();

	expect(vi.getTimerCount()).toBe(0);
});
