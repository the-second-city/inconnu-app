import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, expect, test, vi } from 'vitest';
import Page from './+page.svelte';

const data = {
	session: null,
	keys: [],
	channels: [],
	creation_id: 'ed00a680-4bb1-4c32-9705-63bb764b3792' as const
};

afterEach(() => vi.unstubAllGlobals());

test('copies the one-time secret and confirms only after the clipboard succeeds', async () => {
	const writeText = vi.fn().mockResolvedValue(undefined);
	vi.stubGlobal('navigator', { clipboard: { writeText } });
	render(Page, { params: {}, data, form: { secret: 'new-secret' } });
	await fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
	expect(writeText).toHaveBeenCalledWith('new-secret');
	expect(await screen.findByRole('button', { name: 'Copied' })).toBeDisabled();
});

test('keeps the secret selectable when clipboard access fails', async () => {
	vi.stubGlobal('navigator', {
		clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) }
	});
	render(Page, { params: {}, data, form: { secret: 'new-secret' } });
	await fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
	expect(
		await screen.findByText('Could not copy. Select the key and copy it manually.')
	).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
	expect(screen.getByLabelText('API key secret')).toHaveValue('new-secret');
});

test('explains unavailable channels without presenting a creation form', () => {
	render(Page, { params: {}, data, form: null });
	expect(screen.getByText(/No eligible channels/)).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Create key' })).not.toBeInTheDocument();
});

test('provides named channel selection and a bounded expiry', () => {
	render(Page, {
		params: {},
		data: {
			...data,
			channels: [
				{ guild_id: '123', guild_name: 'Chronicle', channel_id: '456', channel_name: 'play' }
			]
		},
		form: null
	});
	expect(screen.getByRole('option', { name: 'Chronicle / #play' })).toHaveValue('123:456');
	expect(screen.getByLabelText('Expires in days')).toHaveValue(90);
	expect(screen.getByLabelText('Expires in days')).toHaveAttribute('max', '90');
});

test('shows the new secret only when returned by the create action', () => {
	render(Page, { params: {}, data, form: { secret: 'new-secret' } });
	expect(screen.getByLabelText('API key secret')).toHaveValue('new-secret');
	expect(screen.getByText(/shown only once/)).toBeInTheDocument();
});

test('retains revocation when no eligible channels remain', () => {
	render(Page, {
		params: {},
		data: {
			...data,
			keys: [
				{
					id: 'a'.repeat(24),
					name: 'Campaign export',
					prefix: 'ink_123',
					guild_id: '123',
					channel_id: '456',
					created_at: '2026-11-11T00:00:00Z',
					expires_at: '2099-01-01T00:00:00Z',
					revoked_at: null,
					scope: 'rolls:read'
				}
			]
		},
		form: null
	});
	expect(screen.getByRole('button', { name: 'Revoke Campaign export' })).toBeInTheDocument();
	expect(screen.queryByLabelText('API key secret')).not.toBeInTheDocument();
});

test('never expires is explicit and disables the numeric expiry only while checked', async () => {
	render(Page, {
		params: {},
		data: {
			...data,
			channels: [
				{ guild_id: '123', guild_name: 'Chronicle', channel_id: '456', channel_name: 'play' }
			]
		},
		form: null
	});
	const checkbox = screen.getByRole('checkbox', { name: 'Never expires' });
	const expiry = screen.getByLabelText('Expires in days');
	expect(checkbox).not.toBeChecked();
	expect(expiry).toBeEnabled();
	expect(expiry).toBeRequired();
	await fireEvent.click(checkbox);
	expect(expiry).toBeDisabled();
	expect(expiry).not.toBeRequired();
	await fireEvent.click(checkbox);
	expect(expiry).toBeEnabled();
	expect(expiry).toBeRequired();
	expect(expiry).toHaveValue(90);
});

test('lists masked non-expiring keys in a named table with current channel names and revocation', () => {
	render(Page, {
		params: {},
		data: {
			...data,
			channels: [
				{ guild_id: '123', guild_name: 'Chronicle', channel_id: '456', channel_name: 'play' }
			],
			keys: [
				{
					id: 'a'.repeat(24),
					name: 'Campaign export',
					prefix: 'ink_visible',
					guild_id: '123',
					channel_id: '456',
					created_at: '2026-11-11T00:00:00Z',
					expires_at: null,
					revoked_at: null,
					scope: 'rolls:read'
				}
			]
		},
		form: null
	});
	const table = screen.getByRole('table', { name: /Your integration API keys/ });
	expect(
		within(table)
			.getAllByRole('columnheader')
			.map((cell) => cell.textContent)
	).toEqual(['Name', 'Key', 'Channel', 'Expiry', 'Status', 'Action']);
	expect(within(table).getByText('ink_visible********', { exact: true })).toBeInTheDocument();
	expect(within(table).getByText('Chronicle / #play', { exact: true })).toBeInTheDocument();
	expect(within(table).getByRole('cell', { name: 'Never expires' })).toBeInTheDocument();
	expect(within(table).getByRole('cell', { name: 'Active' })).toBeInTheDocument();
	expect(within(table).getByRole('button', { name: 'Revoke Campaign export' })).toBeInTheDocument();
	expect(screen.queryByLabelText('API key secret')).not.toBeInTheDocument();
});

test('falls back to channel IDs when a revoked key is no longer eligible', () => {
	render(Page, {
		params: {},
		data: {
			...data,
			keys: [
				{
					id: 'a'.repeat(24),
					name: 'Old integration',
					prefix: 'ink_old',
					guild_id: '123',
					channel_id: '456',
					created_at: '2026-11-11T00:00:00Z',
					expires_at: null,
					revoked_at: '2026-11-11T00:00:00Z',
					scope: 'rolls:read'
				}
			]
		},
		form: null
	});
	expect(screen.getByRole('cell', { name: 'Guild 123 / Channel 456' })).toBeInTheDocument();
	expect(screen.getByRole('cell', { name: /Revoked/ })).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Revoke Old integration' })).not.toBeInTheDocument();
});

test('submits the server-issued creation ID with the lifecycle guidance', () => {
	render(Page, {
		params: {},
		data: {
			...data,
			channels: [
				{ guild_id: '123', guild_name: 'Chronicle', channel_id: '456', channel_name: 'play' }
			]
		},
		form: null
	});
	const form = screen.getByRole('button', { name: 'Create key' }).closest('form');
	expect(new FormData(form ?? undefined).get('creation_id')).toBe(data.creation_id);
	expect(
		screen.getByText(
			'We recommend an expiration date. Keys stop working when you lose server or channel access. Leaving the server or removing the bot revokes the key.'
		)
	).toBeInTheDocument();
});
