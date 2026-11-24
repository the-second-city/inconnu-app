<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		title: string;
		description?: string;
		image?: string; // A URL, or a path on this site
		type?: string;
	}
	let { title, description, image = '/favicon.png', type }: Props = $props();

	// Open Graph needs an absolute URL: link previews (Discord's among them) skip a relative one
	const imageUrl = $derived(new URL(image, page.url).href);
</script>

<svelte:head>
	<title>{title}</title>
	{#if description}
		<meta name="description" content={description} />
		<meta property="og:title" content={title} />
		<meta property="og:description" content={description} />
		<meta property="og:image" content={imageUrl} />
		{#if type}
			<meta property="og:type" content={type} />
		{/if}
	{/if}
</svelte:head>
