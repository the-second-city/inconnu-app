import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import type { Profile } from '$lib/types';
import CharProfile from './CharProfile.svelte';

const IMAGES = [
	'https://example.com/1.webp',
	'https://example.com/2.webp',
	'https://example.com/3.webp'
];

/** A profile, empty unless overridden. */
const profile = (overrides: Partial<Profile> = {}): Profile => ({
	description: null,
	biography: null,
	images: [],
	...overrides
});

/**
 * Render Nadia's profile, with `profile` as reactive state so edits are written back to it, as a
 * parent's `bind:` would. Returns that state.
 */
const renderProfile = (prof: Profile = profile(), editing = false, convictions?: string[]) => {
	const bound = $state({ profile: prof });
	render(CharProfile, {
		name: 'Nadia',
		splat: 'vampire',
		convictions,
		editing,
		get profile() {
			return bound.profile;
		},
		set profile(next: Profile) {
			bound.profile = next;
		}
	});
	return bound;
};

/** The section under a heading, such as "Description". */
const section = (heading: string): HTMLElement => {
	const found = screen.getByRole('heading', { name: heading }).closest('section');
	if (!found) throw new Error(`No ${heading} section`);
	return found;
};

test('shows the description and history', () => {
	renderProfile(profile({ description: 'Tall and pale.', biography: 'Embraced in 1920.' }));

	expect(section('Description')).toHaveTextContent('Tall and pale.');
	expect(section('History')).toHaveTextContent('Embraced in 1920.');
});

test('has placeholders for a missing description and history', () => {
	renderProfile();

	expect(section('Description')).toHaveTextContent("Nadia's appearance is an enigma...");
	expect(section('History')).toHaveTextContent("Nadia's past is shrouded in mystery ...");
});

test('edits the description and history in place', async () => {
	const user = userEvent.setup();
	const bound = renderProfile(profile({ description: 'Tall.' }), true);

	await user.type(within(section('Description')).getByRole('textbox'), ' Pale.');
	await user.type(within(section('History')).getByRole('textbox'), 'Embraced.');

	expect(bound.profile).toMatchObject({ description: 'Tall. Pale.', biography: 'Embraced.' });
});

test('lists the convictions, skipping blanks', () => {
	renderProfile(profile(), false, ['Protect the weak.', '', '  ', 'Never lie to kin.']);

	const items = within(section('Convictions')).getAllByRole('listitem');
	expect(items.map((item) => item.textContent)).toEqual(['Protect the weak.', 'Never lie to kin.']);
});

test.each([
	['none', undefined],
	['only blanks', ['', ' ', '']]
])('has no Convictions section with %s', (_label: string, convictions?: string[]) => {
	renderProfile(profile(), false, convictions);

	expect(screen.queryByRole('heading', { name: 'Convictions' })).not.toBeInTheDocument();
});

test('shows each image as a button', () => {
	renderProfile(profile({ images: IMAGES }));

	expect(screen.getByRole('button', { name: 'Nadia - Image 1' })).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Nadia - Image 2' })).toBeInTheDocument();
});

test('lazy-loads gallery images', () => {
	renderProfile(profile({ images: IMAGES }));

	const thumbnail = within(screen.getByRole('button', { name: 'Nadia - Image 1' })).getByRole(
		'img'
	);
	expect(thumbnail).toHaveAttribute('loading', 'lazy');
});

test('gallery images ask for async decoding', async () => {
	const user = userEvent.setup();
	renderProfile(profile({ images: IMAGES }));
	const trigger = screen.getByRole('button', { name: 'Nadia - Image 1' });
	expect(within(trigger).getByRole('img')).toHaveAttribute('decoding', 'async');

	await user.click(trigger);

	const dialog = await screen.findByRole('dialog');
	expect(within(dialog).getByRole('img')).toHaveAttribute('decoding', 'async');
});

test('has no gallery without images', () => {
	renderProfile();

	expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('clicking an image enlarges it in a dialog', async () => {
	const user = userEvent.setup();
	renderProfile(profile({ images: IMAGES }));

	await user.click(screen.getByRole('button', { name: 'Nadia - Image 2' }));

	const dialog = await screen.findByRole('dialog');
	expect(within(dialog).getByRole('img', { name: 'Nadia - Image 2' })).toHaveAttribute(
		'src',
		IMAGES[1]
	);
});

test('Escape closes the enlarged image', async () => {
	const user = userEvent.setup();
	renderProfile(profile({ images: IMAGES }));
	const trigger = screen.getByRole('button', { name: 'Nadia - Image 1' });
	await user.click(trigger);
	// The dialog moves focus into itself shortly after opening; Escape works from there
	await screen.findByRole('dialog');
	await waitFor(() => expect(trigger).not.toHaveFocus());

	await user.keyboard('{Escape}');

	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

/** Open the enlarged view of an image, waiting until the dialog has taken focus. */
const openImage = async (
	user: ReturnType<typeof userEvent.setup>,
	n: number
): Promise<HTMLElement> => {
	const trigger = screen.getByRole('button', { name: `Nadia - Image ${n}` });
	await user.click(trigger);
	const dialog = await screen.findByRole('dialog');
	await waitFor(() => expect(trigger).not.toHaveFocus());
	return dialog;
};

test.each([
	['ArrowRight', 1, 2],
	['ArrowLeft', 2, 1],
	['ArrowRight', 3, 1], // Wraps forward
	['ArrowLeft', 1, 3] // Wraps back
])('%s pages from image %i to image %i', async (key: string, from: number, to: number) => {
	const user = userEvent.setup();
	renderProfile(profile({ images: IMAGES }));
	const dialog = await openImage(user, from);

	await user.keyboard(`{${key}}`);

	expect(within(dialog).getByRole('img')).toHaveAttribute('src', IMAGES[to - 1]);
	expect(dialog).toHaveAccessibleName(`Nadia - Image ${to}`);
});

test('closing returns focus to the last image viewed', async () => {
	const user = userEvent.setup();
	renderProfile(profile({ images: IMAGES }));
	await openImage(user, 1);

	await user.keyboard('{ArrowRight}{Escape}');

	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	expect(screen.getByRole('button', { name: 'Nadia - Image 2' })).toHaveFocus();
});

test('a single image ignores the arrow keys', async () => {
	const user = userEvent.setup();
	renderProfile(profile({ images: IMAGES.slice(0, 1) }));
	const dialog = await openImage(user, 1);

	await user.keyboard('{ArrowRight}');

	expect(within(dialog).getByRole('img')).toHaveAttribute('src', IMAGES[0]);
});

test.each([
	['Next image', 1, 2],
	['Previous image', 2, 1],
	['Next image', 3, 1], // Wraps forward
	['Previous image', 1, 3] // Wraps back
])(
	'the %s button pages from image %i to image %i',
	async (button: string, from: number, to: number) => {
		const user = userEvent.setup();
		renderProfile(profile({ images: IMAGES }));
		const dialog = await openImage(user, from);

		await user.click(within(dialog).getByRole('button', { name: button }));

		expect(within(dialog).getByRole('img')).toHaveAttribute('src', IMAGES[to - 1]);
		expect(within(dialog).getByRole('status')).toHaveTextContent(`${to} / ${IMAGES.length}`);
	}
);

test('a single image has no paging buttons or counter', async () => {
	const user = userEvent.setup();
	renderProfile(profile({ images: IMAGES.slice(0, 1) }));
	const dialog = await openImage(user, 1);

	expect(within(dialog).queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument();
	expect(within(dialog).queryByRole('button', { name: 'Previous image' })).not.toBeInTheDocument();
	expect(within(dialog).queryByRole('status')).not.toBeInTheDocument();
});

test('the viewer stays in range when images are removed', async () => {
	const user = userEvent.setup();
	const bound = renderProfile(profile({ images: IMAGES }));
	const dialog = await openImage(user, 3);

	bound.profile = profile({ images: IMAGES.slice(0, 2) });

	await waitFor(() => expect(within(dialog).getByRole('img')).toHaveAttribute('src', IMAGES[1]));
	expect(within(dialog).getByRole('status')).toHaveTextContent('2 / 2');
});

test('the viewer keeps its image when fresh data removes an earlier one', async () => {
	const user = userEvent.setup();
	const bound = renderProfile(profile({ images: IMAGES }));
	const dialog = await openImage(user, 2);

	bound.profile = profile({ images: IMAGES.slice(1) });

	await waitFor(() => expect(dialog).toHaveAccessibleName('Nadia - Image 1'));
	expect(within(dialog).getByRole('img')).toHaveAttribute('src', IMAGES[1]);
});

test('the viewer goes back to its image if fresh data restores it', async () => {
	const user = userEvent.setup();
	const bound = renderProfile(profile({ images: IMAGES }));
	const dialog = await openImage(user, 3);

	bound.profile = profile({ images: IMAGES.slice(0, 2) });
	await waitFor(() => expect(within(dialog).getByRole('img')).toHaveAttribute('src', IMAGES[1]));
	bound.profile = profile({ images: IMAGES });

	await waitFor(() => expect(within(dialog).getByRole('img')).toHaveAttribute('src', IMAGES[2]));
});

test('the viewer closes when fresh data removes every image, and stays closed', async () => {
	const user = userEvent.setup();
	const bound = renderProfile(profile({ images: IMAGES }));
	await openImage(user, 1);

	bound.profile = profile();
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	bound.profile = profile({ images: IMAGES });

	await screen.findByRole('button', { name: 'Nadia - Image 1' });
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test.each(['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])(
	'arrows with %s are left to the browser',
	async (modifier: string) => {
		const user = userEvent.setup();
		renderProfile(profile({ images: IMAGES }));
		const dialog = await openImage(user, 1);

		// Fired directly: user-event can't hold Alt or Meta in jsdom reliably
		const event = new KeyboardEvent('keydown', {
			key: 'ArrowRight',
			bubbles: true,
			cancelable: true,
			[modifier]: true
		});
		dialog.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(false);
		expect(within(dialog).getByRole('img')).toHaveAttribute('src', IMAGES[0]);
	}
);

test('the viewer preloads the neighboring images', async () => {
	const preloaded: string[] = [];
	/** An Image that records what it's asked to load. */
	class RecordingImage {
		set src(url: string) {
			preloaded.push(url);
		}
	}
	vi.stubGlobal('Image', RecordingImage);
	try {
		const user = userEvent.setup();
		renderProfile(profile({ images: IMAGES }));
		await openImage(user, 1);

		expect(preloaded).toEqual(expect.arrayContaining([IMAGES[1], IMAGES[2]]));
		expect(preloaded).not.toContain(IMAGES[0]);
	} finally {
		vi.unstubAllGlobals();
	}
});
