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
	import Ankh from '$lib/components/Ankh.svelte';

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

<div class="mx-auto max-w-3xl text-center">
	<h1 class="h1 text-primary-500 text-5xl font-black tracking-tighter sm:text-6xl">
		Less bookkeeping. More bloodshed.
	</h1>

	<p class="mt-6 text-xl">
		Stay in the shadows with <strong>Inconnu</strong>, a Discord dice bot for
		<em>Vampire: The Masquerade 5th Edition</em>
		featuring full character management, character sheets, smart rolls, macros, and more.
	</p>

	<div class="card preset-outlined-surface-500 mt-6 p-6">
		<p class="text-surface-100 -mt-1 text-2xl leading-none font-semibold">
			Don't frenzy over the dice. Get started now.
		</p>

		<div class="mt-4 flex flex-wrap items-center justify-center gap-3 font-semibold">
			<a
				class="btn preset-filled-surface-500 hover:brightness-125"
				href="https://discord.com/oauth2/authorize?client_id=882409882119196704&permissions=537135104&scope=applications.commands+bot"
				title="Read the docs"
				target="_blank"
			>
				Get Inconnu
				<img class="size-6" src="/images/inconnu_logo.webp" alt="Inconnu logo" />
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
			<a
				class="btn text-white hover:brightness-125"
				style="background-color: #5865F2;"
				href="https://discord.gg/QHnCdSPeEE"
				title="Join our Discord"
				target="_blank"
			>
				<img src="/images/discord-logo.svg" alt="Discord logo" class="size-6" />
				Discord
			</a>
		</div>
	</div>
</div>

<section class="mx-auto mt-10 max-w-4xl space-y-12">
	<!-- For Players -->
	<div class="grid items-center gap-8 md:grid-cols-2">
		<div class="order-1">
			<h2 class="h2 mb-4">For Players</h2>
			<p>
				Unlike other Discord bots, <strong>Inconnu</strong> tracks your characters' stats. No need to
				remember your Dexterity rating while fleeing Hunters&mdash;just roll it!
			</p>
			<ul class="mt-3 text-lg">
				<li class="flex gap-3">
					<Ankh size={10} class="text-primary-500 mt-2 shrink-0" />Unlimited characters across all
					your servers
				</li>
				<li class="flex gap-3">
					<Ankh size={10} class="text-primary-500 mt-2 shrink-0" />Store common rolls as macros
				</li>
				<li class="flex gap-3">
					<Ankh size={10} class="text-primary-500 mt-2 shrink-0" />Discord commands for Rouse
					checks, healing, and more
				</li>
			</ul>
		</div>
		<div
			class="bg-surface-800 text-muted order-2 flex aspect-video items-center justify-center rounded-lg"
		>
			Image
		</div>
	</div>

	<hr class="border-surface-400 mx-auto my-12 w-4/5" />

	<!-- For Storytellers -->
	<div class="grid items-center gap-8 md:grid-cols-2">
		<div
			class="bg-surface-800 text-muted order-2 flex aspect-video items-center justify-center rounded-lg md:order-1"
		>
			Image
		</div>
		<div class="order-1 md:order-2">
			<h2 class="h2 mb-4">For Storytellers</h2>
			<p>
				<strong>Inconnu</strong> keeps your game organized. Storytellers can manage SPCs, track their
				players, and minimize metagaming by making hidden rolls on their behalf.
			</p>
			<ul class="mt-3 text-lg">
				<li class="flex gap-3">
					<Ankh size={10} class="text-primary-500 mt-2 shrink-0" />Track character XP
				</li>
				<li class="flex gap-3">
					<Ankh size={10} class="text-primary-500 mt-2 shrink-0" />Get notified of character updates
				</li>
				<li class="flex gap-3">
					<Ankh size={10} class="text-primary-500 mt-2 shrink-0" />Customize gameplay settings
				</li>
			</ul>
		</div>
	</div>

	<!-- Premium -->
	<div class="card preset-tonal-secondary flex flex-col items-center gap-6 p-8 md:flex-row">
		<div class="text-center md:text-left">
			<h2 class="h2 text-secondary-300 mb-3">Premium Features</h2>
			<p class="text-lg">
				Avoid the Second Inquisition with Premium! <a
					href="https://patreon.com/tiltowait"
					title="Patreon"
					class="text-secondary-300 font-semibold underline hover:no-underline"
					target="_blank">Patreon supporters</a
				> can upload unlimited character images and send Discord messages as their characters with Roleposts.
			</p>
		</div>
		<div
			class="bg-surface-800 text-muted flex aspect-[3/4] w-full items-center justify-center rounded-lg md:w-48 md:shrink-0"
		>
			Image
		</div>
	</div>
</section>

<section class="mx-auto mt-16 max-w-4xl">
	<div class="card preset-tonal-primary space-y-6 p-8">
		<div class="flex items-center gap-3">
			<Sparkles size={32} class="text-primary-500" />
			<h2 class="h2 text-primary-500">About this site</h2>
		</div>

		<p class="text-lg">
			This is the <strong class="text-primary-400">ALPHA/preview</strong> version of the web app for
			<strong>Inconnu</strong>. It is pretty barebones right now, mostly functioning as a new
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
		<div class="card preset-tonal-success space-y-4 p-6">
			<div class="flex items-center gap-2">
				<CheckCircle2 size={24} class="text-success-500" />
				<h3 class="h3 text-success-500">Current features</h3>
			</div>
			<ul class="space-y-3">
				<li class="flex gap-3">
					<CheckCircle2 size={20} class="text-success-400 mt-0.5 shrink-0" />
					<span
						>Web-based character creation wizard. (Use <code
							class="code bg-surface-900/50 rounded px-1.5 py-0.5 text-sm">/character wizard</code
						> in Discord.)</span
					>
				</li>
				<li class="flex gap-3">
					<CheckCircle2 size={20} class="text-success-400 mt-0.5 shrink-0" />
					<span>View your characters' stats and profiles.</span>
				</li>
				<li class="flex gap-3">
					<CheckCircle2 size={20} class="text-success-400 mt-0.5 shrink-0" />
					<span
						><a href="/utils/beasty" title="Beasty" class="underline hover:no-underline">Beasty</a>,
						a utility for making "beast text".</span
					>
				</li>
			</ul>
		</div>

		<!-- Planned Features -->
		<div class="card preset-tonal-secondary space-y-4 p-6">
			<div class="flex items-center gap-2">
				<Lightbulb size={24} class="text-secondary-500" />
				<h3 class="h3 text-secondary-500">Planned</h3>
			</div>
			<ul class="space-y-3">
				<li class="flex gap-3">
					<Lightbulb size={20} class="text-secondary-400 mt-0.5 shrink-0" />
					<span>View other users' character profiles.</span>
				</li>
				<li class="flex gap-3">
					<Lightbulb size={20} class="text-secondary-400 mt-0.5 shrink-0" />
					<span>View Rolepost changelogs.</span>
				</li>
				<li class="flex gap-3">
					<Lightbulb size={20} class="text-secondary-400 mt-0.5 shrink-0" />
					<span>Server admins: View players' full stats (not just profiles).</span>
				</li>
				<li class="flex gap-3">
					<Lightbulb size={20} class="text-secondary-400 mt-0.5 shrink-0" />
					<span
						>Better <code class="code bg-surface-900/50 rounded px-1.5 py-0.5 text-sm"
							>&lt;meta&gt;</code
						> tag use throughout (makes Discord links better).</span
					>
				</li>
				<li class="flex gap-3">
					<Lightbulb size={20} class="text-secondary-400 mt-0.5 shrink-0" />
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
		<div class="card preset-tonal-warning space-y-4 p-6">
			<div class="flex items-center gap-2">
				<HelpCircle size={24} class="text-warning-500" />
				<h3 class="h3 text-warning-500">Up in the air</h3>
			</div>
			<ul class="space-y-3">
				<li class="flex gap-3">
					<HelpCircle size={20} class="text-warning-400 mt-0.5 shrink-0" />
					<span
						>Update character traits and attributes. This would be a popular feature, but there are
						considerations to be made with Discord's permission models (and the challenges around
						synchronizing with them).</span
					>
				</li>
				<li class="flex gap-3">
					<HelpCircle size={20} class="text-warning-400 mt-0.5 shrink-0" />
					<span
						>View character experience logs. Two reasons: first, I'm not sure if anyone cares;
						second, there are difficulties with getting user info out of Discord.</span
					>
				</li>
			</ul>
		</div>

		<!-- Unplanned -->
		<div class="card preset-tonal-error space-y-4 p-6">
			<div class="flex items-center gap-2">
				<XCircle size={24} class="text-error-500" />
				<h3 class="h3 text-error-500">Unplanned</h3>
			</div>
			<ul class="space-y-3">
				<li class="flex gap-3">
					<XCircle size={20} class="text-error-400 mt-0.5 shrink-0" />
					<span
						>Upload character images. I get a lot of safety features "for free" with Discord's image
						uploader that would be a real hassle to replicate.</span
					>
				</li>
			</ul>
		</div>
	</div>
</section>
