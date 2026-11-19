<script lang="ts">
	import { Crown } from '@lucide/svelte';

	import { resolve } from '$app/paths';
	import { PATREON_URL } from '../..';
	import Modal from '$lib/components/ui/Modal.svelte';

	interface ComponentProps {
		open: boolean;
		feature: string; // What was gated, for the description, e.g. "Editing characters"
	}

	let { open = $bindable(), feature }: ComponentProps = $props();
</script>

<!-- The upsell for a non-supporter who tried a premium feature (edit mode, a tracker action) -->
<Modal bind:open title="A Premium Feature" size="md" closeOnInteractOutside>
	{#snippet header()}
		<div class="flex justify-center">
			<span class="preset-tonal-primary flex size-12 items-center justify-center rounded-full">
				<Crown size={24} />
			</span>
		</div>
	{/snippet}
	{#snippet description()}
		<p>
			{feature} on the web is a thank-you for
			<strong>Patreon supporters</strong>, who keep Inconnu running.
			<a
				href={resolve('/docs/[...path]', { path: 'premium/web-app' })}
				class="anchor"
				target="_blank"
				rel="noopener">Learn more.</a
			>
		</p>
		<p class="text-surface-700-300 text-sm">
			You can still do it all in Discord. Already a supporter? Make sure your Discord account is
			linked on Patreon.
		</p>
	{/snippet}
	<div class="flex justify-end gap-2">
		<button type="button" class="btn preset-tonal-surface" onclick={() => (open = false)}>
			Not Now
		</button>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- external link -->
		<a href={PATREON_URL} target="_blank" rel="noopener" class="btn preset-filled-primary-500">
			Become a Supporter
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
</Modal>
