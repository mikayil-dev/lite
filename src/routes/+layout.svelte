<script lang="ts">
	import '$lib/assets/styles/global.scss';
	import Header from 'lib/components/Header.svelte';

	let { children } = $props();
</script>

<svelte:body
	onkeydown={e => {
		if (e.key !== 'Tab') return;
		document.body.setAttribute('data-usingkeyboard', '');
	}}
	onclick={() => {
		document.body.removeAttribute('data-usingkeyboard');
	}}
/>

<Header />

{@render children?.()}
