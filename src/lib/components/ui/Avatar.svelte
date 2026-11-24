<script lang="ts" module>
	/**
	 * Initials for a name: the first letter of its first and last words, or of its only word.
	 */
	export const initials = (name: string): string => {
		// Each word's first letter or digit, so an emoji or punctuation (common in Discord server
		// names, like "🩸 Night Court") is skipped, rather than giving half an emoji
		const letters = name
			.split(/\s+/)
			.map((word) => word.match(/[\p{L}\p{N}]/u)?.[0])
			.filter((letter) => letter !== undefined);
		if (letters.length === 0) return '';
		const ends = letters.length === 1 ? letters : [letters[0], letters[letters.length - 1]];
		return ends.join('').toUpperCase();
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';

	interface ComponentProps {
		/** The image; without one, the fallback shows */
		src?: string | null;
		/** Who or what is pictured: the image's alt text, and the source of its initials */
		name: string;
		/** Size classes */
		size?: string;
		/** A fallback to show instead of initials, such as an icon */
		children?: Snippet;
		/** Beside the name it pictures, so screen readers skip it (alt text and initials both),
		 * rather than reading the name twice */
		decorative?: boolean;
	}

	let { src, name, size = 'size-16', children, decorative = false }: ComponentProps = $props();
</script>

<!--
@component
A round image, falling back to initials (or `children`) until it loads or when there isn't one.
Wraps Skeleton's Avatar so its anatomy lives in one place.
-->
<Avatar class={size} aria-hidden={decorative || undefined}>
	{#if src}
		<Avatar.Image {src} alt={decorative ? '' : name} />
	{/if}
	<Avatar.Fallback>
		{#if children}
			{@render children()}
		{:else}
			{initials(name)}
		{/if}
	</Avatar.Fallback>
</Avatar>
