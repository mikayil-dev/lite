<script lang="ts">
	import Sidebar from 'lib/components/Sidebar.svelte';

	let { children } = $props();
</script>

<div class="layout">
	<Sidebar />
	<main>
		{@render children?.()}
	</main>
</div>

<style lang="scss">
	.layout {
		padding-left: 250px;

		main {
			padding: 0 80px;
		}
	}
</style>
