<script lang="ts">
	import { Copyright } from '@lucide/svelte';

	const currentYear = new Date().getFullYear();
</script>

<footer class="text-surface-800-200 flex flex-col items-center px-16 py-8 text-sm">
	<p class="mb-0 flex items-center">
		<Copyright size={17} class="mr-1 inline" />{currentYear} tiltowait
	</p>
	<p>This site uses cookies for necessary functionality only.</p>
	<p>This site is in alpha. If something is broken, reach out on Discord.</p>
	<div class="bullet-list">
		<span>
			<a class="anchor" href="https://patreon.com/tiltowait" title="Become a patron">Patreon </a>
		</span>
		<span>
			<a class="anchor" href="https://discord.gg/QHnCdSPeEE" title="Join the Discord server">
				Discord
			</a>
		</span>
		<span>
			<a class="anchor" href="https://github.com/tiltowait/inconnu" title="View on GitHub">GitHub</a
			>
		</span>
		<span>
			<a class="anchor" href="https://docs.inconnu.app/privacy-policy" title="Privacy Policy">
				Privacy Policy
			</a>
		</span>
	</div>

	<div class="mt-4 text-center">
		<small
			>Portions of the materials are the copyrights and trademarks of Paradox Interactive AB, and
			are used with permission. All rights reserved. For more information please visit <a
				href="https://worldofdarkness.com"
				class="anchor"
				title="World of Darkness">worldofdarkness.com</a
			>. <strong>Inconnu</strong> is not official World of Darkness content.
		</small>
		<img
			src="/images/darkpack_logo2.webp"
			width="60"
			height="60"
			alt="Dark Pack logo"
			class="mx-auto mt-2"
		/>
	</div>
</footer>

<style>
	.bullet-list {
		display: flex;
		gap: 0.5rem;
	}

	.bullet-list span:not(:last-child)::after {
		content: '•';
		margin-left: 0.5rem;
	}
</style>
