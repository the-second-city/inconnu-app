<script lang="ts">
	import { ExternalLink } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Roleposts | inconnu.app</title>
</svelte:head>

<h1 class="h1 font-black">Roleposts</h1>
<div class="card preset-tonal mx-auto space-y-4 p-6">
	<p>
		Roleposts are a premium <strong>Inconnu</strong> feature for players to write and edit in-character
		posts directly in Discord. Storytellers can track changes via the changelog, which shows a full revision
		history with diffs.
	</p>
	<p>
		When the changelog channel is configured, player edits generate a notification with a link to
		the change history on this site.
	</p>
	<a
		class="btn preset-outlined-primary-500 text-xl hover:brightness-125"
		href="https://docs.inconnu.app/premium/roleposting"
		target="_blank"
		rel="noopener noreferrer"
	>
		Read the Docs
		<ExternalLink size={16} />
	</a>
</div>
