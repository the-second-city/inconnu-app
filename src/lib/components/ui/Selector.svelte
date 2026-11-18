<script lang="ts">
	import { FORM_CLASSES } from '$lib/constants/formStyles';

	interface ComponentProps {
		label: string;
		options: string[];
		value: string;
		id: string;
		placeholder?: string;
		required?: boolean;
	}

	let {
		label,
		options,
		value = $bindable(),
		id,
		placeholder,
		required = false
	}: ComponentProps = $props();
</script>

<label class={FORM_CLASSES.label} for={id}>
	{label}
</label>
<select {id} bind:value class={FORM_CLASSES.selectInput} aria-required={required}>
	{#if placeholder}
		<option value="" disabled selected>{placeholder}</option>
	{/if}
	{#each options as option (option)}
		<option value={option.toLowerCase()}>
			{option}
		</option>
	{/each}
</select>
