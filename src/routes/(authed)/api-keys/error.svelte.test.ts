import { render, screen } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import ErrorPage from './+error.svelte';

vi.mock('$app/state', () => ({
	page: { status: 503, error: { message: 'The integration service is unavailable.' } }
}));
vi.mock('$app/paths', () => ({ resolve: (route: string) => route }));

test('shows the API key failure instead of the generic 404 page', () => {
	render(ErrorPage);
	expect(screen.getByRole('heading', { name: 'API Keys Unavailable' })).toBeInTheDocument();
	expect(screen.getByText('The integration service is unavailable.')).toBeInTheDocument();
	expect(screen.queryByText('404')).not.toBeInTheDocument();
});
