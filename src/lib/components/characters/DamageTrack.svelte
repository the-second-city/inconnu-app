<script lang="ts">
	import { countBoxes } from '$lib/damage';
	import TrackBox from './sheets/components/damage/TrackBox.svelte';

	interface ComponentProps {
		label: string; // "Health" or "Willpower"
		track: string; // As stored: healthy first
		before?: string; // The track before a change, to mark what the change produced
		// Where a kind's new boxes are marked: next to the damage (healing frees the healthy boxes
		// there) or at the healthy end (new damage lands there)
		markFrom?: 'damage' | 'healthy';
	}

	let { label, track, before = track, markFrom = 'damage' }: ComponentProps = $props();

	/**
	 * The boxes as the sheet shows them (damage first), with the ones the change produced marked.
	 * Tracks are sorted, so comparing box by box would mark every box after a change; instead, each
	 * kind that grew marks that many of its boxes, from `markFrom`'s side.
	 */
	const boxes = $derived.by(() => {
		const gained: Record<string, number> = {};
		for (const kind of ['.', '/', 'x']) {
			gained[kind] = Math.max(0, countBoxes(track, kind) - countBoxes(before, kind));
		}
		const shown = [...track].reverse();
		const order = markFrom === 'damage' ? shown : [...shown].reverse();
		const marked = order.map((value) => {
			const changed = gained[value] > 0;
			if (changed) gained[value]--;
			return { value, changed };
		});
		return markFrom === 'damage' ? marked : marked.reverse();
	});
</script>

<!-- The track, damage first as the sheet shows it; the boxes the change produced pulse -->
<div class="grid gap-1">
	<span>{label}</span>
	<div class="flex flex-wrap gap-2">
		{#each boxes as box, i (i)}
			{#if box.changed}
				<span class="motion-safe:animate-pulse" data-changed>
					<TrackBox value={box.value} />
				</span>
			{:else}
				<TrackBox value={box.value} />
			{/if}
		{/each}
	</div>
</div>
