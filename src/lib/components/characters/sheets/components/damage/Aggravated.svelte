<script lang="ts">
	let { size = 30, color = '#FF0000', strokeWidth = 10 } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
	<rect x="5" y="5" width="90" height="90" fill="none" stroke={color} stroke-width={strokeWidth} />
	<line
		x1="0"
		y1="0"
		x2="100"
		y2="100"
		stroke={color}
		stroke-width={strokeWidth}
		stroke-linecap="butt"
	/>
	<line
		x1="100"
		y1="0"
		x2="0"
		y2="100"
		stroke={color}
		stroke-width={strokeWidth}
		stroke-linecap="butt"
	/>
	<line
		x1="50"
		y1="0"
		x2="50"
		y2="100"
		stroke={color}
		stroke-width={strokeWidth}
		stroke-linecap="butt"
	/>
</svg>
