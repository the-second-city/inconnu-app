<svelte:head>
	<title>Session Not Found | inconnu.app</title>
</svelte:head>

<div class="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
	<h1 class="text-primary-500 h1 text-center leading-none font-black tracking-tighter">
		The Sun Has Risen
	</h1>
	<p class="text-center text-xl">One of the following has happened:</p>
	<ol class="ml-6 list-outside list-decimal space-y-2 pl-2 text-left">
		<li>Your character creation link has expired.</li>
		<li>You copy+pasted incorrectly.</li>
		<li>You're poking around with random URLs.</li>
		<li>The SI is trying to steal your vampires.</li>
	</ol>
	<div class="mt-3 flex gap-3">
		<a
			class="btn preset-outlined-primary-500 text-xl hover:brightness-125"
			href="/wizard"
			title="View character creation instructions"
		>
			Start Over
		</a>
		<a
			class="btn preset-outlined-secondary-500 text-xl hover:brightness-125"
			href="/"
			title="Go home"
		>
			Go Home
		</a>
	</div>
</div>
