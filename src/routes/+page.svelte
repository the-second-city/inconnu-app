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
	<title>botch.lol | Discord bots for WoD and CofD</title>
	<meta property="og:title" content="Botch & Beat" />
	<meta
		property="og:description"
		content="Discord bots for World of Darkness and Chronicles of Darkness. Full character sheets. Smart rolls. Profiles. Images. More."
	/>
	<meta property="og:image" content="/favicon.png" />
</svelte:head>

<img src="/images/hero.webp" alt="Botch & Beat" />

<h1 class="h1 text-primary-500">Smart rolls for the supernaturally challenged</h1>

<p>
	<strong>Botch &amp; Beat</strong> are Discord dice bots for World of Darkness and Chronicles of Darkness
	featuring full character management, character sheets, smart rolls, macros, and more! Click the links
	below to get started.
</p>

<div class="mt-10 flex flex-wrap items-center justify-center gap-4">
	<a
		class="btn preset-filled-surface-500 hover:brightness-125"
		href="https://botch.lol"
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
