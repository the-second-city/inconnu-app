import { render, screen } from '@testing-library/svelte';
import { Flame } from '@lucide/svelte';
import { createRawSnippet, type Snippet } from 'svelte';
import { expect, test } from 'vitest';

import Warning from './Warning.svelte';

/** A snippet rendering fixed text. */
const text = (words: string): Snippet =>
	createRawSnippet(() => ({ render: () => `<span>${words}</span>` }));

test('shows its message', () => {
	render(Warning, { icon: Flame, children: text('Test for Hunger frenzy.') });

	expect(screen.getByText('Test for Hunger frenzy.')).toBeInTheDocument();
	expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('can announce itself', () => {
	render(Warning, { icon: Flame, role: 'status', children: text('Degeneration: 1.') });

	expect(screen.getByRole('status')).toHaveTextContent('Degeneration: 1.');
});
