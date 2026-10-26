import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import RatingSelector from './RatingSelector.svelte';

interface Options {
	rating?: number;
	subtraits?: string[];
	min?: number;
	max?: number;
	editing?: boolean;
	allowsSubtraits?: boolean;
	type?: string;
}

/**
 * Render a rating for Athletics, with `rating` and `subtraits` bound to the returned state, as a
 * parent's `bind:` would.
 */
const renderRating = ({
	rating = 2,
	subtraits = [],
	editing = true,
	allowsSubtraits = true,
	...rest
}: Options = {}) => {
	const bound = $state({ rating, subtraits });
	render(RatingSelector, {
		name: 'Athletics',
		editing,
		allowsSubtraits,
		...rest,
		get rating() {
			return bound.rating;
		},
		set rating(next: number) {
			bound.rating = next;
		},
		get subtraits() {
			return bound.subtraits;
		},
		set subtraits(next: string[]) {
			bound.subtraits = next;
		}
	});
	return bound;
};

/** The button that sets Athletics to `dots`. */
const dot = (dots: number): HTMLElement =>
	screen.getByRole('button', { name: `Athletics: ${dots} dots` });

/** The trait's name, which opens its specialties popover. */
const NAME = /^Athletics(?!:)/;

/**
 * Open the specialties popover by clicking the trait's name. The popover moves focus shortly
 * after opening, which would pull it out of an input being typed into, so wait for that first.
 */
const openPopover = async (user: ReturnType<typeof userEvent.setup>) => {
	const trigger = screen.getByRole('button', { name: NAME });
	await user.click(trigger);
	await waitFor(() => expect(trigger).not.toHaveFocus());
};

test('shows the rating, without controls, when not editing', () => {
	const { container } = render(RatingSelector, {
		name: 'Athletics',
		rating: 3,
		editing: false,
		allowsSubtraits: false
	});

	expect(screen.getByText('3 dots')).toBeInTheDocument();
	expect(screen.queryByRole('button')).not.toBeInTheDocument();
	expect(container.querySelectorAll('.rating-circle')).toHaveLength(5);
	expect(container.querySelectorAll('.rating-circle.selected')).toHaveLength(3);
});

test('has a dot for each rating up to the max', () => {
	renderRating({ max: 10, allowsSubtraits: false });

	expect(screen.getAllByRole('button', { name: /^Athletics: \d+ dots$/ })).toHaveLength(10);
});

test('clicking a dot sets the rating', async () => {
	const user = userEvent.setup();
	const bound = renderRating({ rating: 2 });

	await user.click(dot(4));
	expect(bound.rating).toBe(4);

	await user.click(dot(1));
	expect(bound.rating).toBe(1);
});

test('clicking the only filled dot clears the rating', async () => {
	const user = userEvent.setup();
	const bound = renderRating({ rating: 1 });

	await user.click(dot(1));

	expect(bound.rating).toBe(0);
});

test('the rating cannot go below the minimum', async () => {
	const user = userEvent.setup();
	const bound = renderRating({ rating: 4, min: 2 });

	await user.click(dot(1));

	expect(bound.rating).toBe(2);
});

test('a rating of 1 stays when the minimum is 1', async () => {
	const user = userEvent.setup();
	const bound = renderRating({ rating: 1, min: 1 });

	await user.click(dot(1));

	expect(bound.rating).toBe(1);
});

test('hovering previews the dots up to the pointer, and leaving clears it', async () => {
	const user = userEvent.setup();
	renderRating({ rating: 1 });
	/** Which of the five dots are previewed. */
	const previewed = (): boolean[] =>
		[1, 2, 3, 4, 5].map((dots) => dot(dots).classList.contains('hovered'));

	await user.hover(dot(3));
	expect(previewed()).toEqual([false, true, true, false, false]);

	await user.unhover(screen.getByRole('group'));
	expect(previewed()).toEqual([false, false, false, false, false]);
});

test('counts specialties next to the name', () => {
	renderRating({ subtraits: ['Climbing', 'Running'] });

	expect(screen.getByRole('button', { name: NAME })).toHaveTextContent('2');
});

test('adds a specialty, trimmed and in order', async () => {
	const user = userEvent.setup();
	const bound = renderRating({ subtraits: ['Running'] });
	await openPopover(user);

	await user.type(screen.getByPlaceholderText('Add new Specialty ...'), '  Climbing ');
	await user.click(screen.getByRole('button', { name: 'Add specialty' }));

	expect(bound.subtraits).toEqual(['Climbing', 'Running']);
	expect(screen.getByPlaceholderText('Add new Specialty ...')).toHaveValue('');
});

test('Enter adds a specialty', async () => {
	const user = userEvent.setup();
	const bound = renderRating();
	await openPopover(user);

	await user.type(screen.getByPlaceholderText('Add new Specialty ...'), 'Climbing{Enter}');

	expect(bound.subtraits).toEqual(['Climbing']);
});

test.each([
	['A'.repeat(21), 'Maximum 20 characters'],
	['Free running', 'Letters and underscores only'],
	['parkour', 'Specialty already exists']
])('rejects the specialty %o', async (subtrait, error) => {
	const user = userEvent.setup();
	const bound = renderRating({ subtraits: ['Parkour'] });
	await openPopover(user);
	const input = screen.getByPlaceholderText('Add new Specialty ...');

	await user.type(input, `${subtrait}{Enter}`);

	expect(screen.getByText(error)).toBeInTheDocument();
	expect(input).toHaveAccessibleDescription(error);
	expect(screen.getByRole('button', { name: 'Add specialty' })).toBeDisabled();
	expect(bound.subtraits).toEqual(['Parkour']);
});

test("can't add an empty specialty", async () => {
	const user = userEvent.setup();
	renderRating();
	await openPopover(user);

	await user.type(screen.getByPlaceholderText('Add new Specialty ...'), '   ');

	expect(screen.getByRole('button', { name: 'Add specialty' })).toBeDisabled();
});

test('removes a specialty', async () => {
	const user = userEvent.setup();
	const bound = renderRating({ subtraits: ['Climbing', 'Parkour', 'Running'] });
	await openPopover(user);

	await user.click(screen.getByRole('button', { name: 'Remove Parkour' }));

	expect(bound.subtraits).toEqual(['Climbing', 'Running']);
	expect(screen.queryByText('Parkour')).not.toBeInTheDocument();
});

test('disciplines have powers instead of specialties', async () => {
	const user = userEvent.setup();
	renderRating({ type: 'discipline' });
	await openPopover(user);

	expect(screen.getByText('Powers')).toBeInTheDocument();
	expect(screen.getByPlaceholderText('Add new Power ...')).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Add power' })).toBeInTheDocument();
});

test('specialties can be read, but not changed, when not editing', async () => {
	const user = userEvent.setup();
	renderRating({ subtraits: ['Climbing'], editing: false });
	await openPopover(user);

	expect(screen.getByText('Climbing')).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Remove Climbing' })).not.toBeInTheDocument();
	expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test('a trait without specialties has no popover when not editing', () => {
	renderRating({ editing: false });

	expect(screen.queryByRole('button')).not.toBeInTheDocument();
	expect(screen.getByText('Athletics')).toBeInTheDocument();
});

test('a trait that disallows specialties has no popover', () => {
	renderRating({ allowsSubtraits: false });

	expect(screen.queryByRole('button', { name: NAME })).not.toBeInTheDocument();
	expect(screen.getByText('Athletics')).toBeInTheDocument();
});
