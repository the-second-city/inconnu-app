<script lang="ts">
	import { page } from '$app/state';
	import ErrorPanel from '$lib/components/ErrorPanel.svelte';
</script>

<svelte:head><title>API Keys Unavailable | Inconnu</title></svelte:head>

<ErrorPanel
	title="API Keys Unavailable"
	subtitle={page.error?.message ?? 'Unable to load API keys. Please try again later.'}
/>
