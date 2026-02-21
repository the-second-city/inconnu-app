<script lang="ts">
	interface Props {
		title: string;
		description?: string;
		image?: string;
		type?: string;
	}
	let { title, description, image = '/favicon.png', type }: Props = $props();
</script>

<svelte:head>
	<title>{title}</title>
	{#if description}
		<meta name="description" content={description} />
		<meta property="og:title" content={title} />
		<meta property="og:description" content={description} />
		<meta property="og:image" content={image} />
		{#if type}
			<meta property="og:type" content={type} />
		{/if}
	{/if}
</svelte:head>
