import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import ErrorMessage from './ErrorMessage.svelte';

test('shows the error with its id, for aria-describedby', () => {
	render(ErrorMessage, { error: 'Name is required', id: 'name-error' });

	expect(screen.getByText('Name is required')).toHaveAttribute('id', 'name-error');
});

test.each([null, undefined, ''])('renders nothing when the error is %o', (error) => {
	const { container } = render(ErrorMessage, { error, id: 'name-error' });

	expect(container.querySelector('p')).toBeNull();
});
