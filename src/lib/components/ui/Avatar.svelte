<script lang="ts" module>
	/**
	 * Initials for a name: the first letter of its first and last words, or of its only word.
	 */
	export const initials = (name: string): string => {
		const words = name.trim().split(/\s+/).filter(Boolean);
		if (words.length === 0) return '';
		const letters = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
		return letters.map((word) => word.charAt(0).toUpperCase()).join('');
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
	}

	let { src, name, size = 'size-16', children }: ComponentProps = $props();
</script>

<!--
@component
A round image, falling back to initials (or `children`) until it loads or when there isn't one.
Wraps Skeleton's Avatar so its anatomy lives in one place.
-->
<Avatar class={size}>
	{#if src}
		<Avatar.Image {src} alt={name} />
	{/if}
	<Avatar.Fallback>
		{#if children}
			{@render children()}
		{:else}
			{initials(name)}
		{/if}
	</Avatar.Fallback>
</Avatar>
