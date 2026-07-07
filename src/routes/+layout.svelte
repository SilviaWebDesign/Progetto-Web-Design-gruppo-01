<script lang="ts">
	import { onMount } from 'svelte';
	import '$lib/styles/app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import { initSmoothScroll } from '$lib/utils/smoothScroll';
	import { lenisStore } from '$lib/stores/scroll';
	import PageTransition from '$lib/components/layout/PageTransition.svelte';

	const FAVICON_HREF = '/icons/favicon-32x32.png';

	let { children } = $props();

	function applyFavicon() {
		document.querySelectorAll("link[rel*='icon']").forEach((node) => node.remove());

		const png = document.createElement('link');
		png.rel = 'icon';
		png.type = 'image/png';
		png.sizes = '32x32';
		png.href = `${FAVICON_HREF}?t=${Date.now()}`;
		document.head.appendChild(png);

		const ico = document.createElement('link');
		ico.rel = 'shortcut icon';
		ico.href = `/icons/favicon.ico?t=${Date.now()}`;
		document.head.appendChild(ico);
	}

	onMount(() => {
		applyFavicon();

		const { lenis, destroy } = initSmoothScroll();
		lenisStore.set(lenis);

		return () => {
			destroy();
			lenisStore.set(null);
		};
	});
</script>

<Header />
<PageTransition />

<svelte:head>
	<title>Quante facce ha una medaglia?</title>
</svelte:head>

<div class="app-shell">{@render children()}</div>
