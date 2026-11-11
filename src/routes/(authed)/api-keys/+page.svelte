<script lang="ts">
	import type { PageProps } from './$types';
	import { FORM_CLASSES } from '$lib/constants/formStyles';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';

	let { data, form }: PageProps = $props();
	let neverExpires = $state(false);
	let justCopied = $state(false);
	let copyFailed = $state(false);
	const formatDate = (value: string) => new Date(value).toLocaleDateString();

	async function copySecret(secret: string) {
		copyFailed = false;
		try {
			await navigator.clipboard.writeText(secret);
			justCopied = true;
			setTimeout(() => (justCopied = false), 1500);
		} catch {
			copyFailed = true;
		}
	}
</script>

<svelte:head><title>API Keys | Inconnu</title><meta name="robots" content="noindex" /></svelte:head>

<h1 class="h1 mb-4 font-black">API Keys</h1>
<p class="mb-6">
	Give an integration read-only access to roll outcomes in one channel. Hidden rolls are included
	and marked as hidden; rolls excluded from statistics are never shared. Keys use the fixed
	rolls:read scope and require your current Storyteller and channel permissions.
</p>

{#if form && 'secret' in form && form.secret}
	<section class="card preset-outlined-primary-500 mb-6 p-4" aria-label="New API key">
		<h2 class="h2 mb-2">Copy your new API key</h2>
		<p class="mb-3">This secret is shown only once. Store it securely before leaving this page.</p>
		<label class={FORM_CLASSES.label} for="new-secret">API key secret</label>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
			<input
				id="new-secret"
				class={`${FORM_CLASSES.textInput} min-w-0 flex-1`}
				value={form.secret}
				readonly
				autocomplete="off"
				spellcheck="false"
			/>
			<button
				type="button"
				class={`${FORM_CLASSES.buttonSecondary} mb-3 shrink-0`}
				disabled={justCopied}
				aria-live="polite"
				onclick={() => copySecret(form.secret)}>{justCopied ? 'Copied' : 'Copy'}</button
			>
		</div>
		{#if copyFailed}
			<ErrorMessage error="Could not copy. Select the key and copy it manually." />
		{/if}
	</section>
{/if}
{#if form && 'message' in form && form.message}
	<p role="status" class="mb-4">{form.message}</p>
{/if}

<section class="card preset-outlined-surface-500 mb-8 p-4">
	<h2 class="h2 mb-4">Create API key</h2>
	<p class="mb-4">
		Up to five active keys per account. Revoke a key immediately if it is shared accidentally.
	</p>
	{#if data.channels.length === 0}
		<ErrorMessage
			error="No eligible channels. You need Storyteller access and permission to view channel history."
		/>
	{:else}
		<form method="POST" action="?/create">
			<input type="hidden" name="creation_id" value={data.creation_id} />
			<label class={FORM_CLASSES.label} for="key-name">Name</label>
			<input
				id="key-name"
				name="name"
				class={FORM_CLASSES.textInput}
				maxlength="64"
				required
				autocomplete="off"
			/>
			<label class={FORM_CLASSES.label} for="key-channel">Channel</label>
			<select id="key-channel" name="channel" class={FORM_CLASSES.selectInput} required>
				<option value="" disabled selected>Choose a channel</option>
				{#each data.channels as channel (channel.channel_id)}
					<option value={`${channel.guild_id}:${channel.channel_id}`}
						>{channel.guild_name} / #{channel.channel_name}</option
					>
				{/each}
			</select>
			<label class={FORM_CLASSES.label} for="key-expiry">Expires in days</label>
			<input
				id="key-expiry"
				name="expires_in_days"
				type="number"
				min="1"
				max="90"
				value="90"
				class={FORM_CLASSES.textInput}
				disabled={neverExpires}
				required={!neverExpires}
			/>
			<label class="mb-2 flex items-center gap-2">
				<input type="checkbox" name="never_expires" value="true" bind:checked={neverExpires} />
				Never expires
			</label>
			<p class="mb-4">
				We recommend an expiration date. Keys stop working when you lose server or channel access.
				Leaving the server or removing the bot revokes the key.
			</p>
			<button class={FORM_CLASSES.buttonSecondary} type="submit">Create key</button>
		</form>
	{/if}
</section>

<h2 id="your-keys-heading" class="h2 mb-4">Your keys</h2>
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="w-full max-w-full min-w-0 overflow-x-auto [contain:inline-size]"
	role="region"
	aria-labelledby="your-keys-heading"
	tabindex="0"
>
	<table class="table w-full min-w-[48rem] text-left">
		<caption class="sr-only">Your integration API keys. All keys have rolls:read scope.</caption>
		<thead class="border-surface-500 border-b">
			<tr>
				<th scope="col" class="p-3">Name</th>
				<th scope="col" class="p-3">Key</th>
				<th scope="col" class="p-3">Channel</th>
				<th scope="col" class="p-3">Expiry</th>
				<th scope="col" class="p-3">Status</th>
				<th scope="col" class="p-3">Action</th>
			</tr>
		</thead>
		<tbody>
			{#each data.keys as key (key.id)}
				{@const channel = data.channels.find(
					(channel) => channel.guild_id === key.guild_id && channel.channel_id === key.channel_id
				)}
				{@const expired = key.expires_at !== null && Date.parse(key.expires_at) <= Date.now()}
				<tr class="border-surface-500 border-b last:border-b-0">
					<th scope="row" class="max-w-48 p-3 align-top break-all">{key.name}</th>
					<td class="p-3 align-top"
						><code>{key.prefix}********</code><span class="block text-sm">{key.scope}</span></td
					>
					<td class="p-3 align-top"
						>{#if channel}{channel.guild_name} / #{channel.channel_name}{:else}Guild {key.guild_id} /
							Channel {key.channel_id}{/if}</td
					>
					<td class="p-3 align-top"
						>{key.expires_at ? formatDate(key.expires_at) : 'Never expires'}</td
					>
					<td class="p-3 align-top"
						>{#if key.revoked_at}Revoked {formatDate(
								key.revoked_at
							)}{:else if expired}Expired{:else}Active{/if}</td
					>
					<td class="p-3 align-top">
						{#if !key.revoked_at && !expired}
							<form
								method="POST"
								action="?/revoke"
								onsubmit={(event) => {
									if (!confirm(`Revoke “${key.name}”? Any integration using it will lose access.`))
										event.preventDefault();
								}}
							>
								<input type="hidden" name="id" value={key.id} />
								<button
									type="submit"
									class="btn preset-outlined-error-500"
									aria-label={`Revoke ${key.name}`}>Revoke</button
								>
							</form>
						{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan="6" class="p-3">You have no API keys.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
