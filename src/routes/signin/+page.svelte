<script lang="ts">
	import { page } from '$app/state';
	import { SignIn } from '@auth/sveltekit/components';

	let returnUrl = page.url.searchParams.get('callbackUrl') || '/';
</script>

<div class="mt-8 flex w-full justify-center">
	<div class="flex flex-col items-center gap-8 text-center">
		<p class="text-3xl">Well, you botched that one.</p>
		<SignIn provider="discord" options={{ redirectTo: returnUrl }}>
			<span
				slot="submitButton"
				class="btn border-primary-500 border-5 p-4 shadow-lg hover:brightness-125"
			>
				<h1 class="h1 font-black">You Must Sign In</h1>
			</span>
		</SignIn>
	</div>
</div>
