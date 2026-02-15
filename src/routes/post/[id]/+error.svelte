<script lang="ts">
	import { page } from '$app/stores';

	import ErrorPanel from '$lib/components/ErrorPanel.svelte';

	const statusCode = $derived($page.status);
	const message = $derived(
		statusCode === 422
			? 'Invalid Rolepost ID'
			: $page.error?.message || 'An unexpected error occurred.'
	);
</script>

<svelte:head>
	<title>Error Fetching Changelog | Inconnu</title>
</svelte:head>

<ErrorPanel title="Error Fetching Changelog" subtitle={message}>
	<p>
		<strong>Tip:</strong> After you set up
		<a
			href="https://docs.inconnu.app/premium/roleposting/rp-changelog"
			title="Set up the Rolepost changelog"
			class="anchor text-secondary-500">the Rolepost changelog channel</a
		> for your server, you can view changes your players have made to their posts by clicking the notification's
		title.
	</p>
	<p class="text-center">
		<a
			href="/post/6370147493bf068e9fa108ec"
			title="View an example"
			class="btn preset-tonal-secondary text-xl hover:brightness-125">Example Changelog</a
		>
	</p>
</ErrorPanel>
