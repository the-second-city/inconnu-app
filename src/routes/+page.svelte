<script lang="ts">
	import { page } from '$app/state';

	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import {
		ExternalLink,
		LogIn,
		Sparkles,
		CheckCircle2,
		Lightbulb,
		HelpCircle,
		XCircle
	} from '@lucide/svelte';
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

<h1 class="h1 text-primary-500">Don't frenzy over the dice</h1>

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

<section class="mt-16 max-w-4xl mx-auto">
	<div class="card preset-tonal-primary p-8 space-y-6">
		<div class="flex items-center gap-3">
			<Sparkles size={32} class="text-primary-500" />
			<h2 class="h2 text-primary-500">About this site</h2>
		</div>

		<p class="text-lg">
			This is the <strong class="text-primary-400">ALPHA/preview</strong> version of the web app
			for <strong>Inconnu</strong>. It is pretty barebones right now, mostly functioning as a new
			character creation interface. (Pretentious people would say "experience" or "UX". I, of
			course, would never.)
		</p>

		<div class="flex justify-center pt-2">
			<a
				class="btn preset-filled-surface-500 hover:brightness-125"
				href="https://discord.gg/QHnCdSPeEE"
				title="Discuss on Discord"
				target="_blank"
			>
				Discuss on Discord
				<ExternalLink size={18} />
			</a>
		</div>
	</div>

	<div class="mt-8 grid gap-6 md:grid-cols-2">
		<!-- Current Features -->
		<div class="card preset-tonal-success p-6 space-y-4">
			<div class="flex items-center gap-2">
				<CheckCircle2 size={24} class="text-success-500" />
				<h3 class="h3 text-success-500">Current features</h3>
			</div>
			<ul class="space-y-3">
				<li class="flex gap-3">
					<CheckCircle2 size={20} class="mt-0.5 shrink-0 text-success-400" />
					<span
						>Web-based character creation wizard. (Use <code
							class="code text-sm bg-surface-900/50 px-1.5 py-0.5 rounded"
							>/character wizard</code
						> in Discord.)</span
					>
				</li>
				<li class="flex gap-3">
					<CheckCircle2 size={20} class="mt-0.5 shrink-0 text-success-400" />
					<span>View your characters' stats and profiles.</span>
				</li>
				<li class="flex gap-3">
					<CheckCircle2 size={20} class="mt-0.5 shrink-0 text-success-400" />
					<span
						><a href="/utils/beasty" title="Beasty" class="underline hover:no-underline"
							>Beasty</a
						>, a utility for making "beast text".</span
					>
				</li>
			</ul>
		</div>

		<!-- Planned Features -->
		<div class="card preset-tonal-secondary p-6 space-y-4">
			<div class="flex items-center gap-2">
				<Lightbulb size={24} class="text-secondary-500" />
				<h3 class="h3 text-secondary-500">Planned</h3>
			</div>
			<ul class="space-y-3">
				<li class="flex gap-3">
					<Lightbulb size={20} class="mt-0.5 shrink-0 text-secondary-400" />
					<span>View other users' character profiles.</span>
				</li>
				<li class="flex gap-3">
					<Lightbulb size={20} class="mt-0.5 shrink-0 text-secondary-400" />
					<span>View Rolepost changelogs.</span>
				</li>
				<li class="flex gap-3">
					<Lightbulb size={20} class="mt-0.5 shrink-0 text-secondary-400" />
					<span>Server admins: View players' full stats (not just profiles).</span>
				</li>
				<li class="flex gap-3">
					<Lightbulb size={20} class="mt-0.5 shrink-0 text-secondary-400" />
					<span
						>Better <code class="code text-sm bg-surface-900/50 px-1.5 py-0.5 rounded"
							>&lt;meta&gt;</code
						> tag use throughout (makes Discord links better).</span
					>
				</li>
				<li class="flex gap-3">
					<Lightbulb size={20} class="mt-0.5 shrink-0 text-secondary-400" />
					<span
						>Migrate <a
							href="https://docs.inconnu.app"
							title="Inconnu Docs"
							class="underline hover:no-underline">the docs</a
						> to this site so everything is in one spot.</span
					>
				</li>
			</ul>
		</div>

		<!-- Up in the Air -->
		<div class="card preset-tonal-warning p-6 space-y-4">
			<div class="flex items-center gap-2">
				<HelpCircle size={24} class="text-warning-500" />
				<h3 class="h3 text-warning-500">Up in the air</h3>
			</div>
			<ul class="space-y-3">
				<li class="flex gap-3">
					<HelpCircle size={20} class="mt-0.5 shrink-0 text-warning-400" />
					<span
						>Update character traits and attributes. This would be a popular feature, but there
						are considerations to be made with Discord's permission models (and the challenges
						around synchronizing with them).</span
					>
				</li>
				<li class="flex gap-3">
					<HelpCircle size={20} class="mt-0.5 shrink-0 text-warning-400" />
					<span
						>View character experience logs. Two reasons: first, I'm not sure if anyone cares;
						second, there are difficulties with getting user info out of Discord.</span
					>
				</li>
			</ul>
		</div>

		<!-- Unplanned -->
		<div class="card preset-tonal-error p-6 space-y-4">
			<div class="flex items-center gap-2">
				<XCircle size={24} class="text-error-500" />
				<h3 class="h3 text-error-500">Unplanned</h3>
			</div>
			<ul class="space-y-3">
				<li class="flex gap-3">
					<XCircle size={20} class="mt-0.5 shrink-0 text-error-400" />
					<span
						>Upload character images. I get a lot of safety features "for free" with Discord's
						image uploader that would be a real hassle to replicate.</span
					>
				</li>
			</ul>
		</div>
	</div>
</section>
