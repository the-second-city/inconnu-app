import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import SheetHandle from './SheetHandle.svelte';

/** Render a handle for a sheet 300px high, its height in state the test can read. */
const renderHandle = (closes = true) => {
	const state = $state<{ height: number | null }>({ height: null });
	const onclose = vi.fn(() => closes);
	render(SheetHandle, {
		label: 'Height',
		current: 300,
		onclose,
		get height() {
			return state.height;
		},
		set height(value: number | null) {
			state.height = value;
		}
	});
	return { state, onclose, handle: screen.getByRole('slider', { name: 'Height' }) };
};

/** Press the handle at one height in the window and move to another, without releasing. */
const press = (
	user: ReturnType<typeof userEvent.setup>,
	handle: HTMLElement,
	from: number,
	to: number
): Promise<void> =>
	user.pointer([
		{ keys: '[MouseLeft>]', target: handle, coords: { clientY: from } },
		{ target: handle, coords: { clientY: to } }
	]);

test.each([0, 3])('a tap (moving %ipx) does nothing', async (moved) => {
	const user = userEvent.setup();
	const { state, onclose, handle } = renderHandle();

	await press(user, handle, 500, 500 + moved);
	await user.pointer({ keys: '[/MouseLeft]', target: handle });

	expect(onclose).not.toHaveBeenCalled();
	expect(state.height).toBeNull();
});

test('dragged well down, it asks to close; declined, it settles at the smallest size', async () => {
	const user = userEvent.setup();
	const { state, onclose, handle } = renderHandle(false);

	await press(user, handle, 500, 780);
	await user.pointer({ keys: '[/MouseLeft]', target: handle });

	expect(onclose).toHaveBeenCalledOnce();
	expect(state.height).toBeCloseTo(0.35 * window.innerHeight);
});

test('a cancelled drag settles without closing', async () => {
	const user = userEvent.setup();
	const { state, onclose, handle } = renderHandle();

	await press(user, handle, 500, 780);
	await fireEvent.pointerCancel(handle);

	expect(onclose).not.toHaveBeenCalled();
	expect(state.height).toBeCloseTo(0.35 * window.innerHeight);
});
