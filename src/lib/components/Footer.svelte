<script lang="ts">
	import { Copyright } from '@lucide/svelte';

	const currentYear = new Date().getFullYear();
</script>

<footer class="text-surface-800-200 flex flex-col items-center px-16 py-8 text-sm">
	<p class="mb-0 flex items-center">
		<Copyright size={17} class="mr-1 inline" />{currentYear} tiltowait
	</p>
	<p>This site uses cookies for necessary functionality only.</p>
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
