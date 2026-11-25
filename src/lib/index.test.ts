import { expect, test } from 'vitest';

import {
	capitalize,
	codePointLength,
	andList,
	orList,
	plural,
	getErrorDetail,
	isHttpsUrl,
	hasProfileContent,
	insensitiveSort,
	normalize,
	parseApiDate,
	cleanName,
	straightenApostrophes,
	stripLeadingArticles
} from '$lib';
import type { Profile } from '$lib/types';

/** A JSON response, as the Inconnu API would send it. */
const jsonResponse = (body: unknown, status = 400): Response =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('straightenApostrophes replaces curly apostrophes, as phones type them', () => {
	expect(straightenApostrophes('Dogs\u2019 \u2018Til')).toBe("Dogs' 'Til");
});

test('cleanName straightens apostrophes and collapses whitespace, as the bot cleans names', () => {
	expect(cleanName('  O\u2019Brien   Mac\u2018Bride ')).toBe("O'Brien Mac'Bride");
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

test('isHttpsUrl accepts https URLs', () => {
	expect(isHttpsUrl('https://discord.com/channels/1/2/3')).toBe(true);
});

test.each([
	'javascript:alert(1)',
	'data:text/html,<script>alert(1)</script>',
	'http://example.com',
	'/relative',
	''
])('isHttpsUrl rejects %j', (url: string) => {
	expect(isHttpsUrl(url)).toBe(false);
});

test.each([
	['2024-03-05T12:00:00', '2024-03-05T12:00:00.000Z'],
	['2024-03-05T12:00:00.123456', '2024-03-05T12:00:00.123Z'],
	['2024-03-05T12:00:00Z', '2024-03-05T12:00:00.000Z'],
	['2024-03-05T12:00:00+02:00', '2024-03-05T10:00:00.000Z'],
	['2024-03-05T12:00:00-05:00', '2024-03-05T17:00:00.000Z']
])('parseApiDate(%j) is %s', (date: string, expected: string) => {
	expect(parseApiDate(date).toISOString()).toBe(expected);
});

test.each([
	[[], ''],
	[['Rouse'], 'Rouse'],
	[['Rouse', 'slake'], 'Rouse or slake'],
	[['take damage', 'mend', 'Rouse'], 'take damage, mend, or Rouse']
])('orList(%j) is %j', (items, expected) => {
	expect(orList(items)).toBe(expected);
});

test.each([
	['', ''],
	['take damage', 'Take damage'],
	['Rouse or slake', 'Rouse or slake']
])('capitalize(%j) is %j', (text, expected) => {
	expect(capitalize(text)).toBe(expected);
});

test.each<[number, string]>([
	[0, '0 dice'],
	[1, '1 die'],
	[2, '2 dice']
])('plural(%i) is %j', (n, expected) => {
	expect(plural(n, 'die', 'dice')).toBe(expected);
});

test.each([
	['', 0],
	['Nadia', 5],
	['José', 4],
	['🩸', 1],
	['Nadia 😈', 7],
	['𝓥𝓪𝓶𝓹', 4],
	['👨‍👩‍👧', 5] // Three emoji joined by two ZWJs: one grapheme, five code points
])('codePointLength(%j) is %i, as Python’s len()', (text: string, expected: number) => {
	expect(codePointLength(text)).toBe(expected);
});

test.each([
	[[], ''],
	[['hunt'], 'hunt'],
	[['hunt', 'feed'], 'hunt and feed'],
	[['hunt', 'feed', 'lurk'], 'hunt, feed, and lurk']
])('andList(%j) is %j', (items, expected) => {
	expect(andList(items)).toBe(expected);
});
