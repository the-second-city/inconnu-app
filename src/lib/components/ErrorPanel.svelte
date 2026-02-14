<script lang="ts">
	import type { Snippet } from 'svelte';

	interface ComponentProps {
		title: string;
		subtitle?: string | null;
		showHome?: boolean;
		children?: Snippet | null;
	}
	let { title, subtitle = null, showHome = true, children = null }: ComponentProps = $props();
</script>

<div class="card preset-tonal p-5">
	<div class="flex flex-col justify-center gap-4">
		<div class="flex flex-col gap-2">
			<h1 class="h1 text-primary-500 text-center font-black">{title}</h1>
			{#if subtitle}
				<h2 class="h2 text-surface-100 text-center">{subtitle}</h2>
			{/if}
		</div>
		<hr class="border-surface-500" />
		{#if children}
			{@render children()}
		{/if}

		{#if showHome}
			<a
				class="btn preset-outlined-primary-500 mt-4 text-xl hover:brightness-125"
				href="/"
				title="Go back to the home page"
			>
				Return Home
			</a>
		{/if}
	</div>
</div>
