<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();

	// Docs pages are wider by exactly their sidebar's extra room, so the text column
	// stays the same width as elsewhere
	const isDocs = $derived(page.route.id?.startsWith('/docs') ?? false);
</script>

<div class="grid h-screen grid-rows-[auto_1fr_auto]">
	<Header />

	<main class="w-full">
		<div
			class="container mx-auto space-y-4 p-6"
			class:max-w-[1000px]={!isDocs}
			class:max-w-[1048px]={isDocs}
		>
			{@render children()}
		</div>
	</main>

	<Footer />
</div>
