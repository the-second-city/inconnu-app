<script lang="ts">
	import type { Snippet } from 'svelte';

	import type { Character } from '$lib/types';

	import MainTrackers from './components/MainTrackers.svelte';
	import TraitColumn from './components/TraitColumn.svelte';
	import TraitSection from './components/TraitSection.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
		inner?: Snippet | null;
	}

	let { character = $bindable(), editing, inner = null }: ComponentProps = $props();
</script>

<div class="flex flex-col gap-3">
	<TraitSection
		title="Attributes"
		cat="attributes"
		subs={['physical', 'social', 'mental']}
		bind:traits={character.traits!}
		dir="horizontal"
		{editing}
		allowsSubtraits={false}
	/>

	<div class="flex flex-wrap gap-3">
		<div class="w-full md:w-[300px]">
			<TraitSection
				title="Skills"
				cat="skills"
				subs={['physical', 'social', 'mental']}
				bind:traits={character.traits!}
				dir="vertical"
				{editing}
				allowsSubtraits={true}
			/>
		</div>
		<div class="flex-1">
			<!-- Inner box -->
			<div class="flex flex-col gap-3">
				<MainTrackers bind:character {editing} allowsPathChange={false} />

				{#if inner}
					{@render inner()}
				{/if}

				<TraitColumn
					name="Custom Traits"
					cat="custom"
					sub="custom"
					bind:traits={character.traits!}
					{editing}
					allowsSubtraits={false}
					addable={true}
				/>
			</div>
			<!-- End inner box -->
		</div>
	</div>
</div>
