<script lang="ts">
	import '$lib/assets/styles/global.scss';
	import Header from 'lib/components/Header.svelte';

	let { children } = $props();
</script>

<Header />

{@render children?.()}
