<script lang="ts">
	import Card from '$lib/components/Card.svelte';
</script>

<svelte:head>
	<title>Utilities | inconnu.app</title>
	<meta property="og:title" content="Utilities | Inconnu" />
	<meta
		property="og:description"
		content="Utilities and tools for Vampire: The Masquerade 5th Edition."
	/>
	<meta property="og:image" content="/favicon.png" />
</svelte:head>

{#snippet heading(title: string)}
	<h2 class="h3">{title}</h2>
	<hr class="text-surface-300 py-2" />
{/snippet}

<h1 class="h1">Utilities</h1>

<a class="block transition-transform hover:scale-101" href="/utils/beasty" title="Beasty">
	<Card>
		{@render heading('Beasty')}
		<p>
			For fans of Discord play-by-post (or anywhere that accepts Markdown), give your writing some
			flair by formatting your character's internal monologue as "Beast speak," alternating between
			bold and italics.
		</p>
	</Card>
</a>
