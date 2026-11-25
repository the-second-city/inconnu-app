<script lang="ts">
	interface ComponentProps {
		label: string; // Names the checkbox
		detail?: string; // A line under the label, describing it (what checking it does)
		checked: boolean;
		disabled?: boolean;
	}

	let { label, detail, checked = $bindable(), disabled = false }: ComponentProps = $props();

	// Unique per option, as a form may have several
	const id = $props.id();
</script>

<!--
@component
A checkbox with its label and, optionally, a detail line under it (what checking it does): the
checkbox is named by the label alone and described by the detail. The whole row toggles it;
disabled, it fades.
-->
<label class={['flex items-start gap-3', disabled ? 'opacity-50' : 'cursor-pointer']}>
	<input
		type="checkbox"
		class="checkbox mt-1"
		bind:checked
		{disabled}
		aria-labelledby="{id}-label"
		aria-describedby={detail === undefined ? undefined : `${id}-detail`}
	/>
	<span class="flex flex-col leading-tight">
		<span id="{id}-label">{label}</span>
		{#if detail !== undefined}
			<span id="{id}-detail" class="text-surface-300 text-sm">{detail}</span>
		{/if}
	</span>
</label>
