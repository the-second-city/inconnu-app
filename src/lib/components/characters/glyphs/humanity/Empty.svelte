<script lang="ts">
	let { size = 30, color = 'oklch(70% 0.03 70deg)', strokeWidth = 10 } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 100 100"
	xmlns="http://www.w3.org/2000/svg"
	role="img"
	aria-label="Empty"
>
	<polygon
		points="50,5 95,50 50,95 5,50"
		fill="none"
		stroke={color}
		stroke-width={strokeWidth}
		stroke-linejoin="miter"
	/>
</svg>
