<script lang="ts">
	import '../assets/styles/global.scss';

	let { children } = $props();
</script>

<main>
	{@render children?.()}
</main>

<style lang="scss">
	main {
		background-color: black;
	}
</style>
