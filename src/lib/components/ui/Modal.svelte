<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';

	import ClientPortal from './ClientPortal.svelte';

	interface ComponentProps {
		open: boolean;
		title: string | Snippet; // A snippet for a title that changes with the content (a roll's outcome)
		children: Snippet;
		header?: Snippet; // Above the title, such as an icon badge
		description?: Snippet; // The dialog's accessible description, under the title
		size?: 'sm' | 'md';
		centered?: boolean; // Center the title and description
		role?: 'dialog' | 'alertdialog';
		closeOnEscape?: boolean;
		closeOnInteractOutside?: boolean;
	}

	let {
		open = $bindable(),
		title,
		children,
		header,
		description,
		size = 'sm',
		centered = true,
		role = 'dialog',
		closeOnEscape = true,
		closeOnInteractOutside = false
	}: ComponentProps = $props();
</script>

<!-- The app's modal: the gothic backdrop and panel, portaled to <body> once mounted -->
<Dialog
	{role}
	{open}
	onOpenChange={(e) => (open = e.open)}
	{closeOnEscape}
	{closeOnInteractOutside}
>
	<ClientPortal>
		<Dialog.Backdrop class="modal-backdrop-gothic fade-backdrop fixed inset-0 z-50" />
		<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<Dialog.Content
				class={[
					'card modal-gothic fade-panel w-full space-y-4 p-6',
					size === 'md' ? 'max-w-md' : 'max-w-sm'
				]}
			>
				{@render header?.()}
				<Dialog.Title class={['h5 font-display tracking-[0.02em]', centered && 'text-center']}>
					{#if typeof title === 'string'}{title}{:else}{@render title()}{/if}
				</Dialog.Title>
				{#if description}
					<Dialog.Description class={['space-y-2', centered && 'text-center']}>
						{@render description()}
					</Dialog.Description>
				{/if}
				{@render children()}
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>
