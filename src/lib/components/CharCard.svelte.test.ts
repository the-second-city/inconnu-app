import { render, screen } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

import type { Character, CharacterData, OwnerData, Profile, PublicCharacter } from '$lib/types';
import CharCard from './CharCard.svelte';

vi.mock('$app/paths', () => ({
	resolve: (_route: string, params: { guild: string; id: string }) =>
		`/characters/guild/${params.guild}/${params.id}`
}));

const GUILD = { id: '111', name: 'Camarilla of Chicago', icon: null, count: null };
const OWNER: OwnerData = { id: '222', name: 'Lodin', icon: null };

/** A profile, empty unless overridden. */
const profile = (overrides: Partial<Profile> = {}): Profile => ({
	description: null,
	biography: null,
	images: [],
	...overrides
});

/** Data for a publicly visible character, as on guild pages. */
const publicData = (overrides: Partial<CharacterData> = {}, prof = profile()): CharacterData => {
	const character: PublicCharacter = {
		id: 'public-id',
		user: OWNER.id,
		name: 'Nadia',
		splat: 'vampire',
		profile: prof
	};
	return { guild: GUILD, owner: OWNER, character, spc: false, type: 'public', ...overrides };
};

/** Data for a character the user has full access to, as on their own characters page. */
const fullData = (): CharacterData => {
	const character: Character = {
		_id: 'full-id',
		name: 'Nadia',
		guild: GUILD.id,
		user: OWNER.id,
		splat: 'vampire',
		profile: profile(),
		health: '......',
		willpower: '.....',
		humanity: 7,
		stains: 0,
		traits: []
	};
	return { guild: GUILD, owner: null, character, spc: false, type: 'full' };
};

test.each([
	['full', fullData(), '/characters/guild/111/full-id'],
	['public', publicData(), '/characters/guild/111/public-id']
])('links a %s character to its page', (_type, data, href) => {
	render(CharCard, { data, showOwner: false });

	const link = screen.getByRole('link', { name: /Nadia/ });
	expect(link).toHaveAttribute('href', href);
	expect(link).toHaveAttribute('title', 'View/Edit Nadia');
});

test.each([
	['the guild, when not showing owners', publicData(), false, 'Camarilla of Chicago'],
	['the owner', publicData(), true, 'Lodin'],
	['SPCs', publicData({ owner: null, spc: true }), true, 'SPC'],
	["the user's own characters", publicData({ owner: null }), true, 'Your Own']
])('labels %s', (_case, data, showOwner, label) => {
	render(CharCard, { data, showOwner });

	expect(screen.getByRole('contentinfo')).toHaveTextContent(label);
});

test('shows the description over the biography', () => {
	const data = publicData({}, profile({ description: 'Tall and pale', biography: 'Born in 1890' }));
	render(CharCard, { data, showOwner: false });

	expect(screen.getByText('Tall and pale')).toBeInTheDocument();
	expect(screen.queryByText('Born in 1890')).not.toBeInTheDocument();
});

test('falls back to the biography', () => {
	render(CharCard, {
		data: publicData({}, profile({ biography: 'Born in 1890' })),
		showOwner: false
	});

	expect(screen.getByText('Born in 1890')).toBeInTheDocument();
});

test('a character without a profile is a mystery', () => {
	render(CharCard, { data: publicData(), showOwner: false });

	expect(screen.getByText('Nadia is a total mystery ...')).toBeInTheDocument();
});

test('shows the first image as a banner', () => {
	const images = ['https://example.com/one.png', 'https://example.com/two.png'];
	render(CharCard, { data: publicData({}, profile({ images })), showOwner: false });

	expect(screen.getByRole('img', { name: 'banner' })).toHaveAttribute('src', images[0]);
});

test('has no banner without images', () => {
	render(CharCard, { data: publicData(), showOwner: false });

	expect(screen.queryByRole('img', { name: 'banner' })).not.toBeInTheDocument();
});
