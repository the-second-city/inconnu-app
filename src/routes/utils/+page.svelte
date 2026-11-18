<script lang="ts">
	import { resolve } from '$app/paths';
	import { ChartBellCurve, PawPrint } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Meta from '$lib/components/layout/Meta.svelte';
</script>

<Meta
	title="Utilities | Inconnu"
	description="Utilities and tools for Vampire: The Masquerade 5th Edition."
/>

{#snippet heading(title: string, Icon: Component)}
	<h2 class="h3 flex items-center gap-2"><Icon size={26} class="text-primary-500" />{title}</h2>
	<hr class="text-surface-300 py-2" />
{/snippet}

<h1 class="h1 font-black">Utilities</h1>

<p class="px-2">
	A small but growing collection of random play aids for <em>Vampire: The Masquerade</em>.
</p>

<a
	class="block transition-transform hover:scale-101"
	href={resolve('/utils/beasty')}
	title="Beasty"
>
	<Card>
		{@render heading('Beasty', PawPrint)}
		<p>
			For fans of Discord play-by-post (or anywhere that accepts Markdown), give your writing some
			flair by formatting your character's internal monologue as "Beast speak," alternating between
			bold and italics.
		</p>
	</Card>
</a>

<a
	class="block transition-transform hover:scale-101"
	href={resolve('/utils/probability')}
	title="Probability Calculator"
>
	<Card>
		{@render heading('Probability Calculator', ChartBellCurve)}
		<p>
			See the exact odds of every outcome of a roll, from messy criticals to bestial failures,
			including the effect of each Willpower re-roll strategy.
		</p>
	</Card>
</a>
