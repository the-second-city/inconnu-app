<script lang="ts">
	import { Toast } from '@skeletonlabs/skeleton-svelte';
	import { CircleAlert, Info, X } from '@lucide/svelte';

	import { toaster } from '$lib/state/toaster';
</script>

<!--
@component
The app's toasts (`$lib/state/toaster`), in the theme's popover panel, a warning's icon in the
warning color. The root layout renders it once.
-->
<Toast.Group {toaster}>
	{#snippet children(toast)}
		{@const warning = toast.type === 'warning' || toast.type === 'error'}
		<Toast
			{toast}
			class="card popover-gothic flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 p-3 shadow-lg"
		>
			{#if warning}
				<CircleAlert size={18} class="text-warning-400 mt-0.5 shrink-0" />
			{:else}
				<Info size={18} class="text-surface-300 mt-0.5 shrink-0" />
			{/if}
			<Toast.Message class="min-w-0 flex-1">
				<Toast.Title class="font-semibold">{toast.title}</Toast.Title>
				{#if toast.description}
					<Toast.Description class="text-surface-200 text-sm">
						{toast.description}
					</Toast.Description>
				{/if}
			</Toast.Message>
			<Toast.CloseTrigger
				class="hover:preset-tonal-surface shrink-0 rounded-full p-1 opacity-70 hover:opacity-100"
				aria-label="Dismiss"
			>
				<X size={14} />
			</Toast.CloseTrigger>
		</Toast>
	{/snippet}
</Toast.Group>
