<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Quante facce ha una medaglia?</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
