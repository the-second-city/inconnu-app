<script lang="ts">
	import { ClipboardCheck, LoaderCircle } from '@lucide/svelte';

	import Card from '$lib/components/Card.svelte';
	import Markdown from '$lib/components/Markdown.svelte';

	let input = $state('');
	let justCopied = $state(false);

	let disabled = $derived(input === '' || justCopied);
	let beasty = $derived(makeBeast(input));

	function makeBeast(input: string) {
		let beast = '';
		if (input) {
			let trimmed = input.replace(/\s+/g, ' ').trim();
			let letters = trimmed.split('');
			let bold = false;
			let characters: string[] = [];

			letters.forEach((char) => {
				if (char === ' ') {
					characters.push(char);
				} else if (bold) {
					characters.push(`**${char}**`);
				} else {
					characters.push(`*${char}*`);
				}
				bold = !bold;
			});

			beast = characters.join('');
		}
		return beast;
	}

	async function toClipboard() {
		await navigator.clipboard.writeText(beasty);
		justCopied = true;
		setTimeout(() => (justCopied = false), 1500);
	}
</script>

<svelte:head>
	<title>Beasty | botch.lol</title>
	<meta property="og:title" content="Beasty" />
	<meta property="og:description" content="A tool for formatting Discord text to Beast talk." />
	<meta property="og:image" content="/favicon.png" />
</svelte:head>

<div class="flex flex-col gap-2">
	<h1 class="h1">Beasty</h1>

	<p class="mb-4">
		In Discord play-by-post, many servers use <em>italic text</em> to indicate internal thoughts and
		<strong>bold text</strong>
		for thoughts dominated by the Beast. <strong>Beasty</strong> lets you add a little flair by "interleaving"
		character thoughts with "Beast thoughts." The output switches between italics and bold to indicate
		the character's thoughts are in line with their Beast's.
	</p>

	<textarea
		bind:value={input}
		class="textarea w-full border"
		placeholder="Enter text to be turned into Beast thoughts, then click the copy button."
		rows="3"
	></textarea>

	<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
		<Card extraClasses="min-h-[10rem]">
			{#if beasty}
				<p>{beasty}</p>
			{:else}
				<p class="text-surface-800-200 italic"><em>Discord text will show here.</em></p>
			{/if}
		</Card>
		<Card extraClasses="min-h-[10rem]">
			{#if beasty}
				<Markdown content={beasty} />
			{:else}
				<p class="text-surface-800-200 italic">Rendered text will display here.</p>
			{/if}
		</Card>
	</div>

	<button
		{disabled}
		onclick={toClipboard}
		class="btn preset-filled-secondary-500 w-full hover:brightness-125"
		aria-disabled={disabled}
	>
		{#if justCopied}
			<span class="inline-block animate-spin" aria-hidden="true"><LoaderCircle /></span>
			Copied!
		{:else}
			Copy to Clipboard
			<ClipboardCheck />
		{/if}
	</button>
</div>
