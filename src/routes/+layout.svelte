<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import '$lib/styles/app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import { initSmoothScroll } from '$lib/utils/smoothScroll';

	let { children } = $props();
	onMount(() => {
    const smooth = initSmoothScroll();
    return () => smooth.destroy();
  });
</script>

<!-- alwaysVisible è temporaneo per lo sviluppo; rimuovere quando
     le pagine scrollabili gestiranno il reveal su scroll. -->
<Header alwaysVisible />

<svelte:head>
	<title>Quante facce ha una medaglia?</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
