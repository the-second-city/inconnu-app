<script lang="ts">
	import { page } from '$app/state';

	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { ExternalLink, LogIn } from '@lucide/svelte';
	import { SignIn } from '@auth/sveltekit/components';

	const user = page.data.session?.user;
	const userName = user?.name ?? '';
	const userImage = user?.image ?? '';
</script>

<svelte:head>
	<title>inconnu.app | Discord bot for V5</title>
	<meta property="og:title" content="Inconnu" />
	<meta
		property="og:description"
		content="Discord bot for Vampire: The Masquerade 5th Edition. Character sheets. Smart rolls. Profiles. Images. More."
	/>
	<meta property="og:image" content="/favicon.png" />
</svelte:head>

<img src="/images/hero.webp" alt="Inconnu" />

<h1 class="h1 text-primary-500">Smart rolls for the supernaturally challenged</h1>

<p>
	<strong>Inconnu</strong> is a Discord dice bot for <em>Vampire: The Masequerade 5th Edition</em>
	featuring full character management, character sheets, smart rolls, macros, and more! Click the links
	below to get started.
</p>

<div class="mt-10 flex flex-wrap items-center justify-center gap-4">
	<a
		class="btn preset-filled-surface-500 hover:brightness-125"
		href="https://docs.inconnu.app"
		title="Read the docs"
		target="_blank"
	>
		Get Started
		<ExternalLink size={18} />
	</a>
	{#if user}
		<a
			class="btn preset-filled-secondary-500 hover:brightness-125"
			href="/characters"
			title="View your characters"
		>
			View Your Characters
			<Avatar src={userImage} name={userName} size="size-6" />
		</a>
	{:else}
		<SignIn provider="discord" options={{ redirectTo: '/characters' }}>
			<span slot="submitButton" class="btn preset-filled-secondary-500 hover:brightness-125">
				<LogIn size={18} />
				Sign in to Discord
			</span>
		</SignIn>
	{/if}
</div>
