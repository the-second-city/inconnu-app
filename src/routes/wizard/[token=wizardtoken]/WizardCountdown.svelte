<script lang="ts">
	import { onMount } from 'svelte';
	import { Hourglass, TimerOff } from '@lucide/svelte';
	import { formatTimeLeft, timeLeft, urgency } from './countdown';

	interface ComponentProps {
		/** Milliseconds until the link expires as the page loaded (by the server's clock), or null. */
		expiresIn: number | null;
		/** Called once, when the time runs out (or on mounting, if it already has). */
		onexpire?: () => void;
		/** The link stopped working early (the bot no longer has it), so it reads as expired now. */
		ended?: boolean;
	}

	let { expiresIn, onexpire, ended = false }: ComponentProps = $props();

	// The deadline on the viewer's clock, which may be off by minutes: only the time left counts.
	// Set once mounted, as SSR's clock isn't the viewer's
	let deadline: number | null = $state(null);
	let now: number | null = $state(null);

	onMount(() => {
		now = Date.now();
		deadline = expiresIn === null ? null : now + expiresIn;
		// Read from the clock each tick, so a throttled background tab catches up
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	const left = $derived(now === null || deadline === null ? null : timeLeft(deadline, now));
	const runOut = $derived(left === 0);
	const expired = $derived(runOut || ended);

	let notified = false;
	$effect(() => {
		if (runOut && !notified) {
			notified = true;
			onexpire?.();
		}
	});

	const TONES = {
		calm: 'text-surface-700-300',
		warning: 'text-warning-600-400',
		error: 'text-error-600-400'
	};
</script>

{#if left !== null && deadline !== null}
	<!-- Once expired (early, too), it's urgent, and there's no time left to tell of -->
	<p
		class="flex items-center gap-1.5 text-sm tabular-nums {TONES[
			expired ? 'error' : urgency(left)
		]}"
		title={expired
			? undefined
			: `This link expires at ${new Date(deadline).toLocaleTimeString([], {
					hour: 'numeric',
					minute: '2-digit'
				})}`}
	>
		{#if expired}
			<TimerOff size={16} aria-hidden="true" />
			Link expired
		{:else}
			<Hourglass size={16} aria-hidden="true" />
			<span role="timer">Expires in {formatTimeLeft(left)}</span>
		{/if}
	</p>
{/if}
