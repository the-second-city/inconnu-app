<script lang="ts">
	import { resolve } from '$app/paths';
	import StatusError from '$lib/components/StatusError.svelte';
</script>

<StatusError
	notFoundHeading="Character Not Found"
	notFoundMessage="Either it doesn't exist, or it belongs to someone else."
	invalidHeading="Invalid Character ID"
	invalidMessage="The character ID in the URL is not valid."
	backHref={resolve('/characters')}
	backLabel="Return to Selection"
	backTitle="Go back to the selection page"
/>
