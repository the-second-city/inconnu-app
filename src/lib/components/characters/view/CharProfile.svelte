<script lang="ts">
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import ClientPortal from '$lib/components/ui/ClientPortal.svelte';
	import { ChevronLeft, ChevronRight, Eye, Scale, Tombstone } from '@lucide/svelte';

	import type { Profile, Splat } from '$lib/types';
	import { DISCORD_URL } from '$lib/index';
	import { getConstraints, maxCodeUnits, profileLengthErrors } from '$lib/constraints';
	import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
	import Markdown from '$lib/components/ui/Markdown.svelte';

	interface ComponentProps {
		name: string;
		profile: Profile;
		splat: Splat;
		convictions?: string[]; // While editing, the parent pads these to the bot's count
		editing: boolean;
	}

	let {
		name,
		profile = $bindable(),
		splat,
		convictions = $bindable(), // Bound to an optional field, so no fallback
		editing
	}: ComponentProps = $props();

	// The bot's lengths, for the editing fields (so a read-only profile needs none provided)
	const constraints = getConstraints();

	// Fields too long for the bot, while editing (CharacterPage holds Save until they fit). Counted
	// in code points, as the bot counts them, so `maxlength` (which counts UTF-16 code units) is
	// only a ceiling
	const id = $props.id();
	const lengthErrors = $derived(
		editing ? profileLengthErrors(profile, convictions ?? [], constraints()) : null
	);

	// The bot may store blank convictions
	let shownConvictions = $derived((convictions ?? []).map((c) => c.trim()).filter(Boolean));
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

	let viewerOpen = $state(false);
	// The viewer's image stays a moment after closing, through its fade (`fade-panel`, 150ms)
	let viewerShown = $state(false);
	$effect(() => {
		if (viewerOpen) {
			viewerShown = true;
			return;
		}
		const timer = setTimeout(() => (viewerShown = false), 150);
		return () => clearTimeout(timer);
	});
	// The chosen image, by URL, so fresh data that reorders or removes other images doesn't switch
	// it. Its index tells duplicates apart, and is the fallback (kept in range) once it's gone.
	let selectedUrl = $state<string | null>(null);
	let selectedIndex = $state(0);
	// The image shown, which stays set after closing so focus can return to its thumbnail
	let viewing = $derived.by(() => {
		const { images } = profile;
		if (images[selectedIndex] === selectedUrl) return selectedIndex;
		const found = selectedUrl === null ? -1 : images.indexOf(selectedUrl);
		return found >= 0 ? found : Math.min(selectedIndex, Math.max(images.length - 1, 0));
	});
	// The thumbnail buttons, so focus returns to the last image viewed
	let thumbnails: HTMLButtonElement[] = $state([]);

	const imageAlt = (i: number): string => `${name} - Image ${i + 1}`;

	let canPage = $derived(profile.images.length > 1);

	/** Choose the image to show. */
	const select = (i: number) => {
		selectedIndex = i;
		selectedUrl = profile.images[i] ?? null;
	};

	/** Move through the enlarged images, wrapping at either end. */
	const pageBy = (step: number) => {
		if (!canPage) return;
		const count = profile.images.length;
		select((viewing + step + count) % count);
	};

	/** Page with the arrow keys, leaving modified ones (like Alt+Left for Back) to the browser. */
	const pageImages = (event: KeyboardEvent) => {
		const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
		if (step === undefined || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
			return;
		}
		event.preventDefault();
		pageBy(step);
	};

	// Fresh data without images removes the dialog, so close it first; otherwise it would reopen
	// on its own when images return
	$effect(() => {
		if (profile.images.length === 0) viewerOpen = false;
	});

	// Preload the neighboring originals while the viewer is open, so paging doesn't wait on them
	// (and the panel doesn't collapse while one loads)
	$effect(() => {
		if (!viewerOpen || !canPage) return;
		const { images } = profile;
		const count = images.length;
		for (const step of [1, -1]) {
			new Image().src = images[(viewing + step + count) % count];
		}
	});

	let splatIcon = $derived(`/images/wod/${splat}-logo.png`);
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
	<!-- Profile -->
	<div
		class="card splatted top-4 self-start p-4 shadow-lg transition-all hover:shadow-xl sm:sticky"
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
				<header class="border-surface-300-700 flex items-center gap-2 border-b pb-2">
					<span class="text-primary-500">
						<Eye size={18} />
					</span>
					<h2 class="h6">Description</h2>
				</header>
				<div class="leading-relaxed">
					{#if editing}
						<textarea
							class="textarea field-sizing-content max-h-[70vh] min-h-48 border leading-relaxed"
							class:border-error-500={lengthErrors?.description}
							bind:value={profile.description}
							aria-label="Description"
							aria-describedby={lengthErrors?.description ? `${id}-description-error` : undefined}
							rows="8"
							maxlength={maxCodeUnits(constraints().profile_max_length)}
						></textarea>
						<ErrorMessage error={lengthErrors?.description} id="{id}-description-error" />
					{:else if profile.description}
						<Markdown content={profile.description} />
					{:else}
						<span class="text-surface-300 italic">
							{name}'s appearance is an enigma...
						</span>
					{/if}
				</div>
			</section>

			<!-- History Section -->
			<section class="space-y-2">
				<header class="border-surface-300-700 flex items-center gap-2 border-b pb-2">
					<span class="text-primary-500">
						<Tombstone size={18} />
					</span>
					<h2 class="h6">History</h2>
				</header>
				<div class="leading-relaxed">
					{#if editing}
						<textarea
							class="textarea field-sizing-content max-h-[70vh] min-h-48 border leading-relaxed"
							class:border-error-500={lengthErrors?.biography}
							bind:value={profile.biography}
							aria-label="History"
							aria-describedby={lengthErrors?.biography ? `${id}-biography-error` : undefined}
							rows="8"
							maxlength={maxCodeUnits(constraints().profile_max_length)}
						></textarea>
						<ErrorMessage error={lengthErrors?.biography} id="{id}-biography-error" />
					{:else if profile.biography}
						<Markdown content={profile.biography} />
					{:else}
						<span class="text-surface-300 italic">
							{name}'s past is shrouded in mystery ...
						</span>
					{/if}
				</div>
			</section>

			<!-- Convictions Section -->
			{#if editing || shownConvictions.length > 0}
				<section class="space-y-2">
					<header class="border-surface-300-700 flex items-center gap-2 border-b pb-2">
						<span class="text-primary-500">
							<Scale size={18} />
						</span>
						<h2 class="h6">Convictions</h2>
					</header>
					{#if editing}
						<div class="space-y-2">
							{#each convictions ?? [] as conviction, i (i)}
								{@const error = lengthErrors?.convictions[i]}
								<input
									type="text"
									class="input border"
									class:border-error-500={error}
									maxlength={maxCodeUnits(constraints().conviction_max_length)}
									placeholder="Conviction {i + 1}"
									aria-label="Conviction {i + 1}"
									aria-describedby={error ? `${id}-conviction-${i}-error` : undefined}
									value={conviction}
									oninput={(e) => {
										if (convictions) convictions[i] = e.currentTarget.value;
									}}
								/>
								<ErrorMessage {error} id="{id}-conviction-{i}-error" />
							{/each}
						</div>
					{:else}
						<ul class="list-inside list-disc space-y-1 leading-relaxed">
							{#each shownConvictions as conviction, i (i)}
								<li>{conviction}</li>
							{/each}
						</ul>
					{/if}
				</section>
			{/if}
		</article>
	</div>
	<!-- End profile -->

	<!-- A previous/next button under the enlarged image -->
	{#snippet pager(label: string, step: number, Icon: typeof ChevronLeft)}
		<button
			type="button"
			class="btn-icon hover:preset-tonal rounded-full"
			aria-label={label}
			onclick={() => pageBy(step)}
		>
			<Icon size={20} />
		</button>
	{/snippet}

	<!-- Image gallery -->
	<div class={galleryClasses}>
		{#each profile.images as image, i (i)}
			<button
				type="button"
				class="placeholder group relative aspect-12/16 h-full w-full overflow-hidden rounded-md"
				aria-haspopup="dialog"
				bind:this={thumbnails[i]}
				onclick={() => {
					select(i);
					viewerOpen = true;
				}}
			>
				<img
					class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
					src={image}
					alt={imageAlt(i)}
					loading="lazy"
					decoding="async"
				/>
			</button>
		{/each}
	</div>

	{#if profile.images.length > 0}
		<!-- One dialog for the whole gallery, so the arrow keys can page through it -->
		<Dialog
			open={viewerOpen}
			onOpenChange={(e) => (viewerOpen = e.open)}
			finalFocusEl={() => thumbnails[viewing] ?? null}
		>
			<ClientPortal>
				<Dialog.Backdrop class="modal-backdrop-gothic fade-backdrop fixed inset-0 z-50" />
				<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
					<Dialog.Content
						class="card bg-surface-100-900 fade-panel max-w-full p-2 shadow-xl"
						aria-label={imageAlt(viewing)}
						onkeydown={pageImages}
					>
						<!-- Only while open (and fading out): closed dialogs stay in the page, and would fetch the original -->
						{#if viewerShown}
							<!-- The panel follows the image, which fits the viewport, less the padding (and the
							pager, if any). Its height is fixed numbers, not a flex column: a shrunken image
							in a flex column keeps its natural width, leaving bars on either side. 3rem is the
							positioner's and panel's padding; the pager adds pt-2 and a 2rem btn-icon, plus some slack. -->
							<img
								class={[
									'mx-auto block h-auto max-w-full rounded-md object-contain',
									canPage ? 'max-h-[calc(100dvh-6rem)]' : 'max-h-[calc(100dvh-3rem)]'
								]}
								src={profile.images[viewing]}
								alt={imageAlt(viewing)}
								decoding="async"
							/>
							{#if canPage}
								<!-- A fixed width, so the buttons stay put as the panel follows each image -->
								<div class="mx-auto flex w-48 items-center justify-between pt-2">
									{@render pager('Previous image', -1, ChevronLeft)}
									<p class="text-surface-700-300 text-sm" role="status">
										{viewing + 1} / {profile.images.length}
									</p>
									{@render pager('Next image', 1, ChevronRight)}
								</div>
							{/if}
						{/if}
					</Dialog.Content>
				</Dialog.Positioner>
			</ClientPortal>
		</Dialog>
	{/if}
	<!-- End image gallery -->
</div>

<!-- Premium CTA and abuse reporting -->
<div class="text-surface-100 mt-16 text-center">
	<small>
		<p>
			Update profile via <code class="text-secondary-100 text-xs"
				>/character profile edit:{name}</code
			>.
		</p>
		<p>
			Upload images via <code class="text-secondary-100 text-xs">/character images upload</code>.
		</p>
		<p>
			Problem?
			<!-- eslint-disable svelte/no-navigation-without-resolve -- external link -->
			<a href={DISCORD_URL} title="Contact on Discord" class="anchor">Reach out on Discord.</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</p></small
	>
</div>
