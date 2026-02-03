<svelte:head>
	<title>Character Not Found | inconnu.app</title>
</svelte:head>

<div class="flex min-h-[50vh] flex-col items-center justify-center">
	<h1
		class="text-primary-500 m-0 overflow-hidden text-center text-[12rem] leading-none font-black tracking-tighter md:text-[25rem]"
	>
		404
	</h1>
	<h2
		class="text-primary-500 -mt-5 overflow-hidden text-center text-[1.7rem] leading-none font-bold tracking-tight uppercase md:-mt-10 md:text-[3.2rem]"
	>
		Character not found
	</h2>
	<p class="mt-6 text-center text-xl">Either it doesn't exist, or it belongs to someone else.</p>
	<a
		class="btn preset-outlined-primary-500 mt-4 text-xl hover:brightness-125"
		href="/characters"
		title="Go back to the selection page"
	>
		Return to Selection
	</a>
</div>
