<script lang="ts">
	interface ComponentProps {
		isMenuOpen: boolean;
	}
	let { isMenuOpen = $bindable() }: ComponentProps = $props();
	const toggleMenu = () => (isMenuOpen = !isMenuOpen);
</script>

<button
	class="flex flex-col justify-center gap-1.5 sm:hidden"
	onclick={toggleMenu}
	aria-label="Toggle navigation menu"
	aria-expanded={isMenuOpen}
>
	<span
		class="bg-primary-500 block h-0.5 w-6 origin-center transition-transform duration-300"
		class:rotate-45={isMenuOpen}
		class:translate-y-2={isMenuOpen}
	></span>
	<span
		class="bg-primary-500 block h-0.5 w-6 transition-opacity duration-300"
		class:opacity-0={isMenuOpen}
	></span>
	<span
		class="bg-primary-500 block h-0.5 w-6 origin-center transition-transform duration-300"
		class:-rotate-45={isMenuOpen}
		class:-translate-y-2={isMenuOpen}
	></span>
</button>
