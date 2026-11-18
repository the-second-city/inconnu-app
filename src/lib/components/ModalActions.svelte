<script lang="ts">
	import type { Snippet } from 'svelte';

	interface ComponentProps {
		open: boolean; // The modal's; Cancel and Done close it
		done?: boolean; // Finished: Done in place of Cancel and the action
		locked?: boolean; // Working (a roll, say): Cancel and the action wait, and the action is busy
		action?: string; // The primary button's label; without it, Cancel alone
		onaction?: () => void;
		disabled?: boolean; // The action can't run yet
		cancelLabel?: string;
		children?: Snippet; // More buttons, before the rest (Rouse Again)
	}

	let {
		open = $bindable(),
		done = false,
		locked = false,
		action,
		onaction,
		disabled = false,
		cancelLabel = 'Cancel',
		children
	}: ComponentProps = $props();
</script>

<!-- A modal's buttons, at its end: Cancel and the action, then, once it's done, Done -->
<div class="flex justify-end gap-2">
	{@render children?.()}
	{#if done}
		<button type="button" class="btn preset-filled-primary-500" onclick={() => (open = false)}>
			Done
		</button>
	{:else}
		<button
			type="button"
			class="btn preset-tonal-surface"
			onclick={() => (open = false)}
			disabled={locked}
		>
			{cancelLabel}
		</button>
		{#if action}
			<button
				type="button"
				class="btn preset-filled-primary-500"
				onclick={onaction}
				disabled={locked || disabled}
				aria-busy={locked || undefined}
			>
				{action}
			</button>
		{/if}
	{/if}
</div>
