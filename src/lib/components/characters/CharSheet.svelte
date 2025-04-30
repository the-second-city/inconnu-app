<script lang="ts">
	import type { Character, GameLine, Splat } from '$lib/types';

	import VtR from './sheets/VtR.svelte';
	import CofD from './sheets/CofD.svelte';
	import VtM from './sheets/VtM.svelte';
	import Ghoul from './sheets/Ghoul.svelte';
	import WoD from './sheets/WoD.svelte';

	type SheetComponent = typeof CofD | typeof VtR | typeof WoD | typeof VtM | typeof Ghoul | null;

	interface ComponentProps {
		character: Character;
		editing: boolean;
	}

	let { character = $bindable(), editing }: ComponentProps = $props();

	const sheetMap: Record<GameLine, Record<Splat, SheetComponent>> = {
		cofd: {
			mortal: CofD,
			vampire: VtR,
			ghoul: null
		},
		wod: {
			mortal: WoD,
			vampire: VtM,
			ghoul: Ghoul
		}
	};
	const Sheet = sheetMap[character.line][character.splat];
</script>

{#if Sheet}
	<Sheet bind:character {editing} />
{:else}
	lol whoopsy {character.line} {character.splat}
{/if}
