import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import Hamburger from './Hamburger.svelte';

test('toggles the menu open and closed', async () => {
	const user = userEvent.setup();
	const menu = $state({ isMenuOpen: false });
	render(Hamburger, {
		get isMenuOpen() {
			return menu.isMenuOpen;
		},
		set isMenuOpen(open: boolean) {
			menu.isMenuOpen = open;
		}
	});
	const button = screen.getByRole('button', { name: 'Toggle navigation menu' });
	expect(button).toHaveAttribute('aria-expanded', 'false');

	await user.click(button);
	expect(menu.isMenuOpen).toBe(true);
	expect(button).toHaveAttribute('aria-expanded', 'true');

	await user.click(button);
	expect(menu.isMenuOpen).toBe(false);
	expect(button).toHaveAttribute('aria-expanded', 'false');
});
