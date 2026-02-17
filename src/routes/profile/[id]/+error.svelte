<script lang="ts">
	import { resolve } from '$app/paths';
	import StatusError from '$lib/components/StatusError.svelte';
</script>

<StatusError
	notFoundHeading="Profile Not Found"
	notFoundMessage="This character profile doesn't exist or is unavailable."
	invalidHeading="Invalid Character ID"
	backHref={resolve('/')}
	backLabel="Return Home"
	backTitle="Go back to the home page"
/>
