<script lang="ts">
	import { page } from '$app/state';

	import {
		ExternalLink,
		LogIn,
		Sparkles,
		CheckCircle2,
		Lightbulb,
		HelpCircle,
		XCircle
	} from '@lucide/svelte';
	import Ankh from '$lib/components/Ankh.svelte';
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

<section class="mx-auto mt-10 max-w-4xl space-y-8">
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
		<div class="order-2">
			<img src="/images/hero/for-players.webp" alt="Inconnu website showing character sheet" />
		</div>
	</div>

	<hr class="border-surface-400 mx-auto my-12 w-4/5" />

	<!-- For Storytellers -->
	<div class="grid items-center gap-8 md:grid-cols-2">
		<div class="md:order-1">
			<img src="/images/hero/discord-demo.webp" alt="Discord showcase" />
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
	<div class="card preset-glass-secondary flex flex-col items-center gap-6 p-8 md:flex-row">
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
		<div>
			<img src="/images/hero/rolepost.webp" alt="Phone showing a Rolepost" />
		</div>
	</div>
</section>

<style>
	.preset-glass-secondary {
		background: color-mix(in oklab, var(--color-secondary-500) 40%, transparent);
		box-shadow: 0 0px 30px color-mix(in oklab, var(--color-secondary-500) 50%, transparent) inset;
		backdrop-filter: blur(16px);
	}
</style>
