<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const statusCode = $derived(page.status);
	const isServiceUnavailable = $derived(statusCode === 503);
	const isServerError = $derived(statusCode === 500);
	const isNotFound = $derived(statusCode === 404);

	const title = $derived(
		isServiceUnavailable
			? 'Service Starting | Inconnu'
			: isServerError
				? 'Connection Error | Inconnu'
				: isNotFound
					? 'Guild Not Found | Inconnu'
					: 'Error | Inconnu'
	);
	const heading = $derived(
		isServiceUnavailable
			? 'Starting up'
			: isServerError
				? 'Connection error'
				: isNotFound
					? 'Guild not found'
					: 'Something went wrong'
	);
	const message = $derived(
		isServiceUnavailable
			? 'Inconnu is still starting up. Please wait a moment and try again.'
			: isServerError
				? 'Unable to connect to bot. Please try again later.'
				: isNotFound
					? "This guild doesn't exist or you don't have access to it."
					: page.error?.message || 'An unexpected error occurred. Please try again later.'
	);
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="flex min-h-[50vh] flex-col items-center justify-center">
	<h1
		class="text-primary-500 m-0 overflow-hidden text-center text-[12rem] leading-none font-black tracking-tighter md:text-[25rem]"
	>
		{statusCode}
	</h1>
	<h2
		class="text-primary-500 -mt-5 overflow-hidden text-center text-[1.7rem] leading-none font-bold tracking-tight uppercase md:-mt-10 md:text-[3.2rem]"
	>
		{heading}
	</h2>
	<p class="mt-6 text-center text-xl">{message}</p>
	<a
		class="btn preset-outlined-primary-500 mt-4 text-xl hover:brightness-125"
		href={resolve('/characters')}
		title="Go back to your characters"
	>
		Return to Characters
	</a>
</div>
