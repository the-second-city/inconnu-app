<script lang="ts">
	import { page } from '$app/state';

	interface StatusErrorProps {
		notFoundHeading: string;
		notFoundMessage: string;
		invalidHeading?: string;
		invalidMessage?: string;
		backHref: string;
		backLabel: string;
		backTitle: string;
	}

	let {
		notFoundHeading,
		notFoundMessage,
		invalidHeading,
		invalidMessage,
		backHref,
		backLabel,
		backTitle
	}: StatusErrorProps = $props();

	const statusCode = $derived(page.status);

	const heading = $derived(
		statusCode === 503
			? 'Starting up'
			: statusCode === 500
				? 'Connection error'
				: statusCode === 404
					? notFoundHeading
					: statusCode === 422 && invalidHeading
						? invalidHeading
						: 'Something went wrong'
	);

	const message = $derived(
		statusCode === 503
			? 'Inconnu is still starting up. Please wait a moment and try again.'
			: statusCode === 500
				? 'Unable to connect to bot. Please try again later.'
				: statusCode === 404
					? notFoundMessage
					: statusCode === 422 && invalidMessage
						? invalidMessage
						: page.error?.message || 'An unexpected error occurred. Please try again later.'
	);

	const title = $derived(
		statusCode === 503
			? 'Service Starting'
			: statusCode === 500
				? 'Connection Error'
				: statusCode === 404
					? notFoundHeading
					: statusCode === 422 && invalidHeading
						? invalidHeading
						: 'Error'
	);
</script>

<svelte:head>
	<title>{title} | Inconnu</title>
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
		href={backHref}
		title={backTitle}
	>
		{backLabel}
	</a>
</div>
