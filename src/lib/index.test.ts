import { expect, test } from 'vitest';

import {
	getErrorDetail,
	hasProfileContent,
	insensitiveSort,
	isReservedTraitName,
	isValidTraitName,
	normalize,
	stripLeadingArticles
} from '$lib';
import type { Profile } from '$lib/types';

/** A JSON response, as the Inconnu API would send it. */
const jsonResponse = (body: unknown, status = 400): Response =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test.each([
	['Strength', true],
	['Blood_Sorcery', true],
	['', false],
	['Brawl2', false],
	['Blood Sorcery', false],
	['Ölfaktorisch', false]
])('isValidTraitName(%j) is %s', (name: string, expected: boolean) => {
	expect(isValidTraitName(name)).toBe(expected);
});

test.each(['Willpower', 'hunger', 'POWER_BONUS', 'current_hunger'])(
	'isReservedTraitName(%j) is true',
	(name: string) => {
		expect(isReservedTraitName(name)).toBe(true);
	}
);

test('isReservedTraitName is false for ordinary Traits', () => {
	expect(isReservedTraitName('Strength')).toBe(false);
});

test('normalize collapses and trims whitespace', () => {
	expect(normalize('  Nadea \t  Theron\n')).toBe('Nadea Theron');
});

test('insensitiveSort sorts in place, ignoring case', () => {
	const items = ['banana', 'Apple', 'cherry'];
	insensitiveSort(items);
	expect(items).toEqual(['Apple', 'banana', 'cherry']);
});

test.each([
	['The Prince', 'Prince'],
	['a Childe', 'Childe'],
	['An Elder', 'Elder'],
	['Theron', 'Theron'],
	['Anarch', 'Anarch']
])('stripLeadingArticles(%j) is %j', (text: string, expected: string) => {
	expect(stripLeadingArticles(text)).toBe(expected);
});

test('getErrorDetail reads a string detail', async () => {
	expect(await getErrorDetail(jsonResponse({ detail: 'Rolepost not found' }))).toBe(
		'Rolepost not found'
	);
});

test('getErrorDetail joins validation errors and drops their prefix', async () => {
	const response = jsonResponse({
		detail: [{ msg: 'Value error, Name is too long' }, { msg: 'Health must be 4-20' }]
	});
	expect(await getErrorDetail(response)).toBe('Name is too long\nHealth must be 4-20');
});

test('getErrorDetail falls back to a message field', async () => {
	expect(await getErrorDetail(jsonResponse({ message: 'Server error' }))).toBe('Server error');
});

test('getErrorDetail uses the fallback when the body has no detail', async () => {
	expect(await getErrorDetail(jsonResponse({ detail: [] }), 'Nope')).toBe('Nope');
	expect(await getErrorDetail(new Response('not json', { status: 500 }), 'Nope')).toBe('Nope');
});

test.each<[string, Profile, boolean]>([
	['empty', { description: null, biography: null, images: [] }, false],
	['whitespace only', { description: '  ', biography: '\n', images: [] }, false],
	['a description', { description: 'Tall', biography: null, images: [] }, true],
	['a biography', { description: null, biography: 'Born 1890', images: [] }, true],
	['an image', { description: null, biography: null, images: ['a.webp'] }, true]
])('hasProfileContent with %s is %s', (_label: string, profile: Profile, expected: boolean) => {
	expect(hasProfileContent(profile)).toBe(expected);
});
