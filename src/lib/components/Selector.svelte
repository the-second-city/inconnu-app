<script lang="ts">
	interface ComponentProps {
		label: string;
		options: string[];
		value: string;
		id: string;
		placeholder?: string;
	}

	let { label, options, value = $bindable(), id, placeholder }: ComponentProps = $props();

	const labelClass = 'mb-2 block text-lg uppercase tracking-wide';
	const selectClass =
		'input input-bordered mb-3 block w-full border px-4 py-3 leading-tight';
</script>

<label class={labelClass} for={id}>
	{label}
</label>
<select {id} bind:value class={selectClass}>
	{#if placeholder}
		<option value="" disabled selected>{placeholder}</option>
	{/if}
	{#each options as option}
		<option value={option.toLowerCase()}>
			{option}
		</option>
	{/each}
</select>
