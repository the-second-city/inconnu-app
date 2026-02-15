<script lang="ts">
	import { page } from '$app/state';

	import ErrorPanel from '$lib/components/ErrorPanel.svelte';

	const message = $derived(
		page.error?.message || "We couldn't load your characters. Please try again later."
	);
</script>

<svelte:head>
	<title>Characters Unavailable | Inconnu</title>
</svelte:head>

<ErrorPanel title="Characters Unavailable" subtitle={message}>
	<p class="text-center">
		<strong>Inconnu</strong> restarted recently and needs to rebuild its caches. Please try again in a
		few minutes.
	</p>
</ErrorPanel>
