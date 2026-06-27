<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import '$lib/styles/app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import { initSmoothScroll } from '$lib/utils/smoothScroll';
	import { lenisStore } from '$lib/stores/scroll';
	let { children } = $props(); 
	onMount(() => {
		const { lenis, destroy } = initSmoothScroll();
		lenisStore.set(lenis);

		return () => {
			destroy();
			lenisStore.set(null);
  };
});
</script>

<Header />

<svelte:head>
	<title>Quante facce ha una medaglia?</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
