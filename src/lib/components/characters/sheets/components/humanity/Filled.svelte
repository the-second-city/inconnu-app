<script lang="ts">
	let { size = 30, fillColor = '#CC00CC', strokeColor = '#DD00DD', strokeWidth = 8 } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
	<polygon
		points="50,5 95,50 50,95 5,50"
		fill={fillColor}
		stroke={strokeColor}
		stroke-width={strokeWidth}
		stroke-linejoin="miter"
	/>
</svg>
