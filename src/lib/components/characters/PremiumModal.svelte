<script lang="ts">
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { Crown } from '@lucide/svelte';

	import { resolve } from '$app/paths';
	import ClientPortal from '$lib/components/ClientPortal.svelte';

	interface ComponentProps {
		open: boolean;
		feature: string; // What was gated, for the description, e.g. "Editing characters"
	}

	let { open = $bindable(), feature }: ComponentProps = $props();
</script>

<!-- The upsell for a non-supporter who tried a premium feature (edit mode, a tracker action) -->
<Dialog {open} onOpenChange={(e) => (open = e.open)}>
	<ClientPortal>
		<Dialog.Backdrop class="modal-backdrop-gothic fixed inset-0 z-50" />
		<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<Dialog.Content class="card modal-gothic w-full max-w-md space-y-4 p-6">
				<div class="flex justify-center">
					<span class="preset-tonal-primary flex size-12 items-center justify-center rounded-full">
						<Crown size={24} />
					</span>
				</div>
				<Dialog.Title class="h5 font-display text-center tracking-[0.02em]"
					>A Premium Feature</Dialog.Title
				>
				<Dialog.Description class="space-y-2 text-center">
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
						You can still do it all in Discord. Already a supporter? Make sure your Discord account
						is linked on Patreon.
					</p>
				</Dialog.Description>
				<div class="flex justify-end gap-2">
					<button type="button" class="btn preset-tonal-surface" onclick={() => (open = false)}>
						Not Now
					</button>
					<!-- eslint-disable svelte/no-navigation-without-resolve -- external link -->
					<a
						href="https://patreon.com/tiltowait"
						target="_blank"
						rel="noopener"
						class="btn preset-filled-primary-500"
					>
						Become a Supporter
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>
