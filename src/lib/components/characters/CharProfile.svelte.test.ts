import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import type { Profile } from '$lib/types';
import CharProfile from './CharProfile.svelte';

const IMAGES = ['https://example.com/1.webp', 'https://example.com/2.webp'];

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
const renderProfile = (prof: Profile = profile(), editing = false) => {
	const bound = $state({ profile: prof });
	render(CharProfile, {
		name: 'Nadia',
		splat: 'vampire',
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
