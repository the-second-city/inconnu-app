<script lang="ts">
	let { size = 30, fillColor = '#FF0000', strokeColor = '#FF6600', strokeWidth = 8 } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
	<polygon
		points="50,5 95,50 50,95 5,50"
		fill={fillColor}
		stroke={strokeColor}
		stroke-width={strokeWidth}
		stroke-linejoin="miter"
	/>
	<line
		x1="15"
		y1="15"
		x2="85"
		y2="85"
		stroke={strokeColor}
		stroke-width={strokeWidth}
		stroke-linecap="butt"
	/>
	<line
		x1="85"
		y1="15"
		x2="15"
		y2="85"
		stroke={strokeColor}
		stroke-width={strokeWidth}
		stroke-linecap="butt"
	/>
</svg>
