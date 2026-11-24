<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	// Every error a route without its own error page throws ends up here, not just a 404: say which
	// it was, with the error's message (such as the docs' "unavailable right now")
	const notFound = $derived(page.status === 404);
	const heading = $derived(
		notFound ? 'Not found' : page.status >= 500 ? 'Something went wrong' : 'Can’t show this page'
	);
	// SvelteKit's message for an unexpected error says nothing useful
	const message = $derived(
		notFound
			? null
			: page.error?.message && page.error.message !== 'Internal Error'
				? page.error.message
				: 'Please try again in a moment.'
	);
</script>

<svelte:head>
	<title>{notFound ? 'Page Not Found' : 'Error'} | Inconnu</title>
</svelte:head>

<div class="flex min-h-[50vh] flex-col items-center justify-center">
	<h1
		class="text-primary-500 m-0 overflow-hidden text-center text-[12rem] leading-none font-black tracking-tighter md:text-[25rem]"
	>
		{page.status}
	</h1>
	<h2
		class="text-primary-500 -mt-5 overflow-hidden text-center text-[1.7rem] leading-none font-bold tracking-tight uppercase md:-mt-10 md:text-[3.2rem]"
	>
		{heading}
	</h2>
	{#if message}
		<p class="text-surface-300 mt-4 max-w-md text-center text-lg">{message}</p>
	{/if}
	<a
		class="btn preset-outlined-primary-500 mt-4 text-xl hover:brightness-125"
		href={resolve('/')}
		title="Go home"
	>
		Go Home
	</a>
</div>
