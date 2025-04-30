<script lang="ts">
	type OptionType = string | number | null;

	export let label: string | null = null;
	export let options: OptionType[];
	export let value: OptionType;
	export let id: string;
	// export let labelClass = 'block uppercase tracking-wide font-bold mb-2'
	export let labelClass = 'block uppercase tracking-wide mb-2 text-lg';
	export let selectClass =
		'appearance-none select select-bordered block w-full border py-3 px-4 mb-3 leading-tight';
	export let placeholder: string | null = null;

	function handleChange(event: Event) {
		const selectedValue = (event.target as HTMLSelectElement).value;
		if (selectedValue === '') {
			value = null;
		} else {
			value = typeof value === 'number' ? Number(selectedValue) : selectedValue;
		}
	}

	$: showPlaceholder = placeholder && (value === null || value === '');
</script>

{#if label}
	<label class={labelClass} for={id}>
		{label}
	</label>
{/if}
<div class="relative">
	<select {id} class={selectClass} on:change={handleChange} bind:value>
		{#if showPlaceholder}
			<option value="" disabled>{placeholder}</option>
		{/if}
		{#each options as option}
			<option value={option}>{option}</option>
		{/each}
	</select>
	<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
		<svg class="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
			><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg
		>
	</div>
</div>
