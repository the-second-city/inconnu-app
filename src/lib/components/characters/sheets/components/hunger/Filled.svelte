<script lang="ts">
	let { size = 30, fillColor = '#DC2626', strokeColor = '#EF4444', strokeWidth = 8 } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
	<path
		d="M 50,10 C 30,30 20,50 20,65 C 20,80 33,90 50,90 C 67,90 80,80 80,65 C 80,50 70,30 50,10 Z"
		fill={fillColor}
		stroke={strokeColor}
		stroke-width={strokeWidth}
		stroke-linejoin="round"
	/>
</svg>
