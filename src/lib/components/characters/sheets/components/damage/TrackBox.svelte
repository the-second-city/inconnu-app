<script lang="ts">
	import type { Component } from 'svelte';

	import Hale from './Hale.svelte';
	import Bashing from './Bashing.svelte';
	import Lethal from './Lethal.svelte';
	import Aggravated from './Aggravated.svelte';

	interface ComponentProps {
		value: string;
	}

	const boxMap: Record<string, Component> = {
		'.': Hale,
		'/': Bashing,
		x: Lethal,
		'*': Aggravated
	};

	let { value }: ComponentProps = $props();
	let Box = $derived(boxMap[value]);
</script>

<Box size={20} />
