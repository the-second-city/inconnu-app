<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
	}
	let { size = 16, class: className = '' }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size * 2}
	viewBox="0 0 100 200"
	fill="currentColor"
	class={className}
	aria-hidden="true"
>
	<path
		fill-rule="evenodd"
		d="M 50 2
		C 78 2 90 28 90 52
		C 90 72 72 84 60 88
		L 68 96
		C 78 90 90 88 95 94
		C 98 98 92 106 86 106
		C 78 106 70 102 66 100
		L 56 108
		C 55 120 54 160 50 198
		C 46 160 45 120 44 108
		L 34 100
		C 30 102 22 106 14 106
		C 8 106 2 98 5 94
		C 10 88 22 90 32 96
		L 40 88
		C 28 84 10 72 10 52
		C 10 28 22 2 50 2
		Z
		M 50 16
		C 30 16 22 34 22 52
		C 22 70 38 82 47 88
		L 50 93
		L 53 88
		C 62 82 78 70 78 52
		C 78 34 70 16 50 16
		Z"
	/>
</svg>
