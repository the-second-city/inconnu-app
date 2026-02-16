<script lang="ts">
	import { resolve } from '$app/paths';
	import { ExternalLink } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Character Profiles | Inconnu</title>
</svelte:head>

<h1 class="h1 font-black">Character Profiles</h1>
<div class="card preset-tonal mx-auto space-y-4 p-6">
	<p>
		You worked hard on <a
			href={resolve('/characters')}
			title="Browse your characters"
			class="anchor text-secondary-500">your characters</a
		>&mdash;don't hide them from the world! You can generate a shareable link in Discord via
		<code class="text-primary-500 rounded px-2 py-1 font-mono text-sm">/character profile</code>. No
		sign-in required.
	</p>
	<p>
		Profiles only show the public description, history, and any
		<a
			href="https://docs.inconnu.app/premium/character-images"
			title="Character images"
			class="anchor text-secondary-500">images</a
		>
		you might have uploaded. Your skills, health, Disciplines, and other traits are all kept private.
	</p>
	<a
		class="btn preset-outlined-secondary-500 text-xl hover:brightness-125"
		href={resolve('/profile/[id]', { id: '680d32cbc0bf6151dbd5004e' })}
		target="_blank"
		rel="noopener noreferrer"
	>
		Example Profile
		<ExternalLink size={16} />
	</a>
</div>
