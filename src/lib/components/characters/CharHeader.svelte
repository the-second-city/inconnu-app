<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import Avatar from '$lib/components/Avatar.svelte';
	import { ChevronLeft } from '@lucide/svelte';

	import type { Guild, OwnerData } from '$lib/types';

	interface ComponentProps {
		name: string;
		images: string[];
		guild: Guild | null;
		owner?: OwnerData | null;
		spc?: boolean;
		backUrl?: Pathname;
		editing?: boolean; // Swaps the name for a text field
		editedName?: string; // The text field's value
		nameError?: string | null; // Why the edited name is invalid
	}

	let {
		name,
		images,
		guild,
		owner,
		spc = false,
		backUrl,
		editing = false,
		editedName = $bindable(''),
		nameError = null
	}: ComponentProps = $props();

	const currentUserId = $derived(page.data.session?.user?.id);

	const metadata = $derived.by(() => {
		const items: { name: string; icon: string | null; badge?: boolean }[] = [];
		if (guild) items.push({ name: guild.name, icon: guild.icon });
		if (owner) {
			if (owner.id === currentUserId) {
				items.push({ name: 'You', icon: null, badge: true });
			} else {
				items.push({ name: owner.name, icon: owner.icon });
			}
		}
		if (spc) items.push({ name: 'SPC', icon: null, badge: true });
		return items;
	});
</script>

<div class="flex flex-wrap items-start justify-between gap-2">
	<div class="relative">
		<h1 class="h1 flex items-center gap-4 font-black">
			{#if backUrl}
				<a href={resolve(backUrl)} class="opacity-60 transition-opacity hover:opacity-100">
					<ChevronLeft size={32} />
				</a>
			{/if}
			{#if images.length > 0}
				<div class="ring-primary-500 rounded-full ring-2">
					<Avatar {name} src={images[0]} />
				</div>
			{/if}
			{#if editing}
				<!-- The field is as wide as its text, so the header (and the metadata aligned to its
				     right edge) keeps its width, and wraps like the heading where it doesn't fit (on a
				     phone). An invisible copy of the text, styled like the field, sizes the grid cell
				     they share. Negative margins, the size of the field's padding (from Skeleton's
				     `input`: (1rem - 0.125rem) / 2 + 0.25rem by 0.4375rem) plus its border, keep the
				     text where it was. It's a textarea only to wrap: Enter and pasted line breaks don't
				     add lines. -->
				<span
					class="-mx-[calc(0.6875rem+1px)] -my-[calc(0.4375rem+1px)] inline-grid max-w-full min-w-[4ch]"
				>
					<span
						class="input h1 invisible col-start-1 row-start-1 w-auto! border font-black wrap-break-word whitespace-pre-wrap"
						aria-hidden="true">{editedName}</span
					>
					<!-- One column, so its default width (20 columns) doesn't size the grid; the copy does -->
					<textarea
						rows="1"
						cols="1"
						class="input h1 col-start-1 row-start-1 h-full min-w-0 resize-none overflow-hidden border font-black"
						class:text-error-500={nameError}
						class:border-error-500={nameError}
						value={editedName}
						oninput={(e) => {
							// A name is one line
							const value = e.currentTarget.value;
							editedName = value.replace(/[\r\n]+/g, ' ');
							if (editedName !== value) e.currentTarget.value = editedName;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter') e.preventDefault();
						}}
						aria-label="Character name"
						aria-invalid={nameError ? 'true' : undefined}
						aria-describedby={nameError ? 'name-error' : undefined}
					></textarea>
				</span>
			{:else}
				{name}
			{/if}
		</h1>
		{#if editing && nameError}
			<p id="name-error" class="text-error-500 mt-1 text-sm">{nameError}</p>
		{/if}

		{#if metadata.length > 0}
			<div class="flex justify-end" class:mt-3={editing}>
				<h6 class="text-surface-800-200 flex items-center gap-3 italic">
					{#each metadata as item, i (i)}
						{#if i > 0 && !item.badge}<span class="opacity-60">•</span>{/if}
						{#if item.badge}
							<span class="badge preset-filled-surface-500 text-xs uppercase">{item.name}</span>
						{:else}
							{item.name}
							<Avatar src={item.icon ?? undefined} name={item.name} size="size-6" />
						{/if}
					{/each}
				</h6>
			</div>
		{/if}
	</div>
</div>
