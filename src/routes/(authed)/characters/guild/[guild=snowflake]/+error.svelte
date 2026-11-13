<script lang="ts">
	import { resolve } from '$app/paths';
	import StatusError from '$lib/components/StatusError.svelte';
</script>

<StatusError
	notFoundHeading="Guild Not Found"
	notFoundMessage="This guild doesn't exist or you don't have access to it."
	invalidHeading="Invalid Guild ID"
	invalidMessage="The guild ID in the URL is not valid."
	backHref={resolve('/characters')}
	backLabel="Return to Characters"
	backTitle="Go back to your characters"
/>
