<script lang="ts">
	import { slide } from 'svelte/transition';

	import { Castle, ChevronDown, ExternalLink, Github, Orbit, Users } from '@lucide/svelte';
	import { Popover } from '@skeletonlabs/skeleton-svelte';

	import DiscordButton from '$lib/components/DiscordButton.svelte';
	import Hamburger from '$lib/components/Hamburger.svelte';
	import NavButton from './NavButton.svelte';
	import NavLink from './NavLink.svelte';

	let isMenuOpen = $state(false);
	let isMoreMenuOpen = $state(false);
</script>

{#snippet docs()}
	<NavButton
		href="https://docs.inconnu.app"
		title="Read the docs"
		color="preset-filled-surface-500"
		full={true}
		target="_blank"
	>
		Docs <ExternalLink size={18} />
	</NavButton>
{/snippet}

{#snippet github()}
	<NavButton
		href="https://github.com/tiltowait/inconnu"
		title="View on GitHub"
		color="preset-outlined-surface-800-200"
		full={true}
	>
		GitHub <Github />
	</NavButton>
{/snippet}

{#snippet patreon()}
	<NavButton
		href="https://patreon.com/tiltowait"
		title="Become a patron"
		color="preset-outlined-success-500"
		full={true}
	>
		Patreon
	</NavButton>
{/snippet}

{#snippet discord()}
	<NavButton
		href="https://discord.gg/QHnCdSPeEE"
		title="Join the Discord server"
		color="preset-outlined-secondary-500"
		full={true}
	>
		The Second City <Castle size={18} />
	</NavButton>
{/snippet}

<header class="bg-surface-50-950 flex items-center justify-between p-4 shadow-md">
	<a href="/" class="anchor text-primary-500 flex items-center gap-2 text-3xl font-bold" style="font-family: Avenir, Montserrat, Corbel, 'URW Gothic', source-sans-pro, sans-serif;">
		<img src="/favicon.png" alt="Inconnu icon" class="h-[1em] w-auto" />
		Inconnu
	</a>

	<!-- Desktop menu -->
	<nav class="hidden items-center gap-2 sm:flex">
		<NavLink href="/characters" title="View your characters">
			Characters <Users size={18} />
		</NavLink>
		<NavLink href="/utils" title="Random utilities">
			Utilities <Orbit size={18} />
		</NavLink>

		<DiscordButton full={false} />

		<Popover
			open={isMoreMenuOpen}
			onOpenChange={(e) => (isMoreMenuOpen = e.open)}
			triggerBase="btn p-1.5 rounded-full border-2 flex items-stretch border-surface-700-300 hover:brightness-125"
			contentBase="bg-black w-64 p-4"
		>
			{#snippet trigger()}
				<span class="sr-only">More</span>
				<ChevronDown />
			{/snippet}
			{#snippet content()}
				<div class="flex flex-col gap-2">
					{@render docs()}
					{@render discord()}
					{@render github()}
					{@render patreon()}
				</div>
			{/snippet}
		</Popover>
	</nav>
	<!-- End desktop menu -->

	<!-- Mobile menu -->
	<Hamburger bind:isMenuOpen />

	{#if isMenuOpen}
		<div
			class="bg-surface-50-950 fixed inset-x-0 top-[4rem] z-50 p-4 shadow-lg sm:hidden"
			transition:slide={{ duration: 200 }}
		>
			<nav class="flex flex-col items-end gap-4">
				<NavButton
					href="/characters"
					title="View your characters"
					color="preset-filled-secondary-500"
					full={true}
				>
					Characters <Users size={18} />
				</NavButton>

				<NavButton href="/utils" title="Random utilities" color="preset-tonal-tertiary" full={true}>
					Utilities <Orbit size={18} />
				</NavButton>

				{@render docs()}
				{@render discord()}
				{@render github()}
				{@render patreon()}
				<DiscordButton />
			</nav>
		</div>
	{/if}
	<!-- End mobile menu -->
</header>
