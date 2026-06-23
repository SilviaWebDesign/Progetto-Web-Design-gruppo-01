<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/app.css';
	import Header from '$lib/components/layout/Header.svelte';

	let { children } = $props();
</script>

<!-- alwaysVisible è temporaneo per lo sviluppo; rimuovere quando
     le pagine scrollabili gestiranno il reveal su scroll. -->
<Header alwaysVisible />

<svelte:head>
	<title>Quante facce ha una medaglia?</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
