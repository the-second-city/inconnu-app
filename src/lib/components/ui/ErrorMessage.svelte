<script lang="ts">
	import { FORM_CLASSES } from '$lib/constants/formStyles';

	interface ComponentProps {
		error?: string | null;
		id?: string;
		class?: string;
	}

	let { error = null, id, class: className }: ComponentProps = $props();
</script>

{#if error}
	<p {id} class="{FORM_CLASSES.error} mt-1 mb-2 {className}">{error}</p>
{/if}
