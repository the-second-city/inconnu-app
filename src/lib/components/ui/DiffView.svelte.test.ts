import { render } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import DiffView from './DiffView.svelte';

/** Render a diff and read it back as lines, each prefixed with +, -, or a space. */
const diff = (oldText: string, newText: string): string[] => {
	const { container } = render(DiffView, { oldText, newText });
	const lines = container.querySelectorAll(':scope > div > div');
	return Array.from(lines, (line) => (line.textContent ?? '').replace(/\u00a0/g, ' '));
};

test('unchanged text has no additions or removals', () => {
	expect(diff('one\ntwo', 'one\ntwo')).toEqual([' one', ' two']);
});

test('shows added lines', () => {
	expect(diff('one\nthree', 'one\ntwo\nthree')).toEqual([' one', '+two', ' three']);
});

test('shows removed lines', () => {
	expect(diff('one\ntwo\nthree', 'one\nthree')).toEqual([' one', '-two', ' three']);
});

test('shows a changed line as a removal and an addition', () => {
	expect(diff('The night\nis dark', 'The night\nis young')).toEqual([
		' The night',
		'-is dark',
		'+is young'
	]);
});

test('keeps blank lines visible', () => {
	expect(diff('one\n\ntwo', 'one\n\ntwo')).toEqual([' one', '  ', ' two']);
});
