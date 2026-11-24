<script lang="ts">
	import { ClipboardCheck, LoaderCircle } from '@lucide/svelte';

	import Card from '$lib/components/ui/Card.svelte';
	import Meta from '$lib/components/layout/Meta.svelte';

	let input = $state('');
	let justCopied = $state(false);

	// What a reader sees as one character: an emoji of several code points (👨‍👩‍👧, 👍🏽), or a letter
	// and its accent, stays whole rather than splitting into broken halves
	const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

	/** A character of the text, in italics or bold, or a space (which takes its turn unformatted). */
	interface Piece {
		text: string;
		bold: boolean;
		space: boolean;
	}

	/** The text as alternating italic and bold characters, spaces collapsed. */
	const toPieces = (text: string): Piece[] => {
		const trimmed = text.replace(/\s+/g, ' ').trim();
		return Array.from(graphemes.segment(trimmed), ({ segment }, i) => ({
			text: segment,
			bold: i % 2 === 1,
			space: segment === ' '
		}));
	};

	/** A character with Discord's Markdown escaped, so a typed `*` or `_` stays text. */
	const escape = (char: string): string => char.replace(/[\\*_~`|]/g, '\\$&');

	const pieces = $derived(toPieces(input));
	// The text for Discord
	const beasty = $derived(
		pieces
			.map(({ text, bold, space }) =>
				space ? text : bold ? `**${escape(text)}**` : `*${escape(text)}*`
			)
			.join('')
	);
	// Blank text makes nothing to copy
	let disabled = $derived(beasty === '' || justCopied);

	async function toClipboard() {
		await navigator.clipboard.writeText(beasty);
		justCopied = true;
		setTimeout(() => (justCopied = false), 1500);
	}
</script>

<Meta title="Beasty | Inconnu" description="Format Discord text to Beast talk." />

<div class="flex flex-col gap-2">
	<h1 class="h1 font-black">Beasty</h1>

	<p class="mb-4">
		In Discord play-by-post, many servers use <em>italic text</em> to indicate internal thoughts and
		<strong>bold text</strong>
		for thoughts dominated by the Beast. <strong>Beasty</strong> lets you add a little flair by "interleaving"
		character thoughts with "Beast thoughts." The output switches between italics and bold to indicate
		the character's thoughts are in line with their Beast's.
	</p>

	<textarea
		bind:value={input}
		aria-label="Text to turn into Beast thoughts"
		class="textarea w-full border"
		placeholder="Enter text to be turned into Beast thoughts, then click the copy button."
		rows="3"
	></textarea>

	<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
		<Card extraClasses="min-h-[10rem]">
			{#if beasty}
				<p style="overflow-wrap: break-word;">{beasty}</p>
			{:else}
				<p class="text-surface-800-200 italic"><em>Discord text will show here.</em></p>
			{/if}
		</Card>
		<Card extraClasses="min-h-[10rem]">
			{#if beasty}
				<!-- Drawn from the pieces, not by parsing the text: a Markdown parser's rules (CommonMark
				     won't bold "!" between letters) aren't Discord's -->
				<section aria-label="Preview">
					<p style="overflow-wrap: break-word;">
						{#each pieces as { text, bold, space }, i (i)}{#if space}{text}{:else if bold}<strong
									>{text}</strong
								>{:else}<em>{text}</em>{/if}{/each}
					</p>
				</section>
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
