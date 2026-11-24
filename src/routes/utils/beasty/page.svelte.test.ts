import { render, screen } from '@testing-library/svelte';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import Page from './+page.svelte';

// Meta reads the page's URL, for its absolute og:image
vi.mock('$app/state', () => import('$lib/testing/page.svelte'));

/** Whether some UTF-16 code unit in the text is half of a pair, without its other half. */
const hasLoneSurrogate = (text: string): boolean =>
	/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(text);

/** Paste text into the formatter, then copy what it made, as the clipboard has it. */
const formatAndCopy = async (user: UserEvent, text: string): Promise<string> => {
	await user.click(screen.getByRole('textbox', { name: 'Text to turn into Beast thoughts' }));
	await user.paste(text);
	await user.click(screen.getByRole('button', { name: 'Copy to Clipboard' }));
	return navigator.clipboard.readText();
};

test('alternates italic and bold, character by character, collapsing spaces', async () => {
	const user = userEvent.setup();
	render(Page);

	// A space takes its turn in the alternation, unformatted
	expect(await formatAndCopy(user, 'ab  c')).toBe('*a***b** **c**');
});

test.each([
	['an emoji', '🩸'],
	['an emoji of several code points', '👨‍👩‍👧'],
	['a skin tone', '👍🏽'],
	['a letter with a combining accent', 'é']
])('keeps %s whole', async (_, whole) => {
	const user = userEvent.setup();
	render(Page);

	expect(await formatAndCopy(user, `a${whole}b`)).toBe(`*a***${whole}***b*`);
	expect(hasLoneSurrogate(document.body.innerHTML)).toBe(false);
});

test('blank text has nothing to copy', async () => {
	const user = userEvent.setup();
	render(Page);
	const copy = screen.getByRole('button', { name: 'Copy to Clipboard' });
	expect(copy).toBeDisabled();

	await user.type(screen.getByRole('textbox'), '   ');

	expect(copy).toBeDisabled();
});
