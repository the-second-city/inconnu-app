<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();
</script>

<div class="grid h-screen grid-rows-[auto_1fr_auto]">
	<Header />

	<main class="w-full">
		<div class="container mx-auto max-w-[1000px] space-y-4 p-6">
			{@render children()}
		</div>
	</main>

	<Footer />
</div>
