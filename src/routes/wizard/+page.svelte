<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import { ExternalLink } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Character Wizard | inconnu.app</title>
	<meta property="og:title" content="Character Wizard | Inconnu" />
	<meta
		property="og:description"
		content="Create V5 characters using Inconnu's web-based character creation wizard."
	/>
	<meta property="og:image" content="/favicon.png" />
</svelte:head>

<div class="flex flex-col gap-6">
	<h1 class="h1">Character Wizard</h1>
	<hr class="border-surface-400" />

	<p class="mb-4">
		The Character Wizard is a web-based tool for creating new characters for <em
			>Vampire: The Masquerade</em
		>
		5th Edition. To access the wizard, you need to generate a unique link from Discord.
	</p>

	<div class="card preset-tonal p-4">
		<h3 class="h3 mb-2">Getting Started</h3>
		<ol class="ml-6 list-outside list-decimal space-y-2 pl-2">
			<li>Open Discord and navigate to your game server</li>
			<li>
				Type the command: <code class="code">/character wizard</code>
			</li>
			<li>You'll receive a private link to create your character</li>
			<li>Click the link to open the Character Wizard in your browser</li>
			<li>Fill out your character details and submit</li>
		</ol>
	</div>

	<div>
		<p class="mb-2">
			<strong>Note:</strong> Wizard links are temporary and expire after 20 minutes. Each link is unique
			and can only be used once.
		</p>
	</div>

	<Card>
		<h2 class="h2 mb-4">Need Help?</h2>
		<p class="mb-4">
			For more information about using Inconnu and creating characters, check out the documentation.
		</p>
		<a
			href="https://docs.inconnu.app"
			target="_blank"
			rel="noopener noreferrer"
			class="btn preset-filled-primary-500 inline-flex items-center gap-2"
		>
			View Documentation
			<ExternalLink size={18} />
		</a>
	</Card>
</div>
