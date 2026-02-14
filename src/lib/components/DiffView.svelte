<script lang="ts">
	interface ComponentProps {
		oldText: string;
		newText: string;
	}

	let { oldText, newText }: ComponentProps = $props();

	type DiffLine = { type: 'same' | 'add' | 'remove'; text: string };

	function computeDiff(oldStr: string, newStr: string): DiffLine[] {
		const oldLines = oldStr.split('\n');
		const newLines = newStr.split('\n');
		const m = oldLines.length;
		const n = newLines.length;

		// LCS table
		const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
		for (let i = 1; i <= m; i++) {
			for (let j = 1; j <= n; j++) {
				if (oldLines[i - 1] === newLines[j - 1]) {
					dp[i][j] = dp[i - 1][j - 1] + 1;
				} else {
					dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
				}
			}
		}

		// Backtrack to build diff
		const result: DiffLine[] = [];
		let i = m;
		let j = n;
		while (i > 0 || j > 0) {
			if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
				result.push({ type: 'same', text: oldLines[i - 1] });
				i--;
				j--;
			} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
				result.push({ type: 'add', text: newLines[j - 1] });
				j--;
			} else {
				result.push({ type: 'remove', text: oldLines[i - 1] });
				i--;
			}
		}

		return result.reverse();
	}

	const lines = $derived(computeDiff(oldText, newText));
</script>

<div class="space-y-0 font-mono text-sm">
	{#each lines as line}
		{#if line.type === 'add'}
			<div class="border-l-2 border-green-500 bg-green-500/20 px-3 py-0.5">
				<span class="mr-2 opacity-60 select-none">+</span>{line.text || '\u00A0'}
			</div>
		{:else if line.type === 'remove'}
			<div class="border-l-2 border-red-500 bg-red-500/20 px-3 py-0.5">
				<span class="mr-2 opacity-60 select-none">-</span>{line.text || '\u00A0'}
			</div>
		{:else}
			<div class="px-3 py-0.5 opacity-75">
				<span class="mr-2 opacity-60 select-none">&nbsp;</span>{line.text || '\u00A0'}
			</div>
		{/if}
	{/each}
</div>
