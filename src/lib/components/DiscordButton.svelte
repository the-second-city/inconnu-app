<script lang="ts">
	import { page } from '$app/state';
	import Avatar from '$lib/components/Avatar.svelte';
	import Popover from '$lib/components/Popover.svelte';
	import { LogIn, LogOut } from '@lucide/svelte';
	import { SignIn } from '@auth/sveltekit/components';
	import { signOut } from '@auth/sveltekit/client';

	interface ComponentProps {
		full?: boolean;
	}
	let { full = true }: ComponentProps = $props();

	const signInOptions = { redirectTo: '/characters' };

	const user = page.data.session?.user;
	const userName = user?.name ?? '';
	const userImage = user?.image ?? '';

	const triggerClass = $derived(
		full
			? 'btn w-full sm:w-fit flex items-center preset-tonal-secondary hover:brightness-125'
			: 'btn flex items-center border-primary-500 rounded-full hover:brightness-125 border-2 p-0'
	);
	const avatarSize = $derived(full ? 'size-6' : 'size-9');

	let showLogoutButton = $state(false);
</script>

{#if user}
	<Popover
		bind:open={showLogoutButton}
		positioning={{ placement: 'bottom-end' }}
		{triggerClass}
		contentClass="card bg-black p-2 z-60"
	>
		{#snippet trigger()}
			{#if full}
				{userName} <Avatar src={userImage} name={userName} size={avatarSize} />
			{:else}
				<Avatar src={userImage} name={userName} size={avatarSize} />
			{/if}
		{/snippet}
		{#snippet content()}
			<button
				class="btn preset-filled-primary-500 w-56"
				onclick={() => signOut({ redirect: true, redirectTo: '/' })}
			>
				<LogOut size={18} />
				Sign out
			</button>
		{/snippet}
	</Popover>
{:else}
	<SignIn provider="discord" options={signInOptions}>
		<span slot="submitButton" class="btn preset-filled-secondary-500 hover:brightness-125">
			<LogIn size={18} />
			Sign in to Discord
		</span>
	</SignIn>
{/if}
