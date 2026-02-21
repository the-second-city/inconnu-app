<script lang="ts">
	import { resolve } from '$app/paths';
	import Card from '$lib/components/Card.svelte';
	import Meta from '$lib/components/Meta.svelte';
</script>

<Meta
	title="Utilities | Inconnu"
	description="Utilities and tools for Vampire: The Masquerade 5th Edition."
/>

{#snippet heading(title: string)}
	<h2 class="h3">{title}</h2>
	<hr class="text-surface-300 py-2" />
{/snippet}

<h1 class="h1 font-black">Utilities</h1>

<p class="px-2">
	A small but growing collection of random play aids for <em>Vampore: The Masquerade</em>.
</p>

<a
	class="block transition-transform hover:scale-101"
	href={resolve('/utils/beasty')}
	title="Beasty"
>
	<Card>
		{@render heading('Beasty')}
		<p>
			For fans of Discord play-by-post (or anywhere that accepts <a
				class="anchor"
				href="https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline"
				title="Markdown overview">Markdown</a
			>), give your writing some flair by formatting your character's internal monologue as "Beast
			speak," alternating between bold and italics.
		</p>
	</Card>
</a>
