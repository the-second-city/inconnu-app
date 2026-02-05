<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import { Eye, Skull } from '@lucide/svelte';

	import type { Profile, Splat } from '$lib/types';
	import Markdown from '$lib/components/Markdown.svelte';

	interface ComponentProps {
		name: string;
		profile: Profile;
		splat: Splat;
		editing: boolean;
	}

	let { name, profile = $bindable(), splat, editing }: ComponentProps = $props();
	let galleryClasses = $derived.by(() => {
		let classes: string;
		if (profile.images.length == 1) {
			classes = 'grid grid-cols-1';
		} else if (profile.images.length == 2) {
			classes = 'grid grid-cols-2 gap-2';
		} else {
			classes = 'grid grid-cols-2 gap-2 sm:grid-cols-3';
		}
		return classes;
	});

	let activeModalIndex = $state<number | null>(null);

	let splatIcon = `/images/wod/${splat}-logo.png`;
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
	<!-- Profile -->
	<div
		class="card variant-soft splatted top-4 self-start p-4 shadow-lg transition-all hover:shadow-xl sm:sticky"
	>
		<img
			src={splatIcon}
			alt={splat}
			class="absolute left-1/2 -z-10 mt-13 h-auto w-auto max-w-[150px] -translate-x-1/2 opacity-15 mix-blend-multiply"
			aria-hidden="true"
		/>
		<article class="space-y-6">
			<!-- Description Section -->
			<section class="space-y-2">
				<header class="border-surface-300-600 flex items-center gap-2 border-b pb-2">
					<span class="text-primary-500">
						<Eye size={18} />
					</span>
					<h2 class="h6">Description</h2>
				</header>
				<p class="leading-relaxed">
					{#if editing}
						<textarea
							class="textarea border"
							bind:value={profile.description}
							rows="4"
							maxlength="1500"
						></textarea>
					{:else if profile.description}
						<Markdown content={profile.description} />
					{:else}
						<span class="text-surface-500 italic">
							{name}'s appearance is an enigma...
						</span>
					{/if}
				</p>
			</section>

			<!-- History Section -->
			<section class="space-y-2">
				<header class="border-surface-300-600 flex items-center gap-2 border-b pb-2">
					<span class="text-primary-500">
						<Skull size={18} />
					</span>
					<h2 class="h6">History</h2>
				</header>
				<p class="leading-relaxed">
					{#if editing}
						<textarea
							class="textarea border"
							bind:value={profile.biography}
							rows="4"
							maxlength="1500"
						></textarea>
					{:else if profile.biography}
						<Markdown content={profile.biography} />
					{:else}
						<span class="text-surface-300 italic">
							{name}'s past is shrouded in mystery ...
						</span>
					{/if}
				</p>
			</section>
		</article>
	</div>
	<!-- End profile -->

	<!-- Image gallery -->
	<div class={galleryClasses}>
		{#each profile.images as image, i}
			{@const alt = `${name} - Image ${i + 1}`}
			<Modal
				open={activeModalIndex === i}
				onOpenChange={(e) => {
					activeModalIndex = e.open ? i : null;
				}}
				triggerBase="placeholder w-full h-full group relative overflow-hidden rounded-md aspect-12/16"
				contentBase="card bg-surface-100-900 p-2 shadow-xl max-w-screen-sm"
			>
				{#snippet trigger()}
					<img
						class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
						src={image}
						{alt}
						loading="lazy"
					/>
				{/snippet}
				{#snippet content()}
					<img class="rounded-md" src={image} {alt} />
				{/snippet}
			</Modal>
		{/each}
	</div>
	<!-- End image gallery -->
</div>
