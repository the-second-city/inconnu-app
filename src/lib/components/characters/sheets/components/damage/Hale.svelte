<script lang="ts">
	let { size = 30, color = '#ccc', strokeWidth = 10 } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 100 100"
	xmlns="http://www.w3.org/2000/svg"
	role="img"
	aria-label="Healthy"
>
	<rect
		x="5"
		y="5"
		width="90"
		height="90"
		fill="none"
		style:stroke={color}
		stroke-width={strokeWidth}
	/>
</svg>
