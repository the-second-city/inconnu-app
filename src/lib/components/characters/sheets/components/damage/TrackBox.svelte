<script lang="ts">
	import type { Component } from 'svelte';

	import Hale from './Hale.svelte';
	import Superficial from './Superficial.svelte';
	import Aggravated from './Aggravated.svelte';

	interface ComponentProps {
		value: string;
	}

	const boxMap: Record<string, Component> = {
		'.': Hale,
		'/': Superficial,
		x: Aggravated
	};

	let { value }: ComponentProps = $props();
	let Box = $derived(boxMap[value]);
</script>

<Box size={20} />
