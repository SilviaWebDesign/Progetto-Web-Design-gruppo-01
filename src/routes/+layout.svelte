<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import '$lib/styles/app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import { initSmoothScroll } from '$lib/utils/smoothScroll';
	import { lenisStore } from '$lib/stores/scroll';
	import PageTransition from '$lib/components/layout/PageTransition.svelte';

	let { children } = $props();
	let lenisInstance = $state<ReturnType<typeof initSmoothScroll>['lenis'] | null>(null);

	$effect(() => {
		const lenis = lenisInstance;
		if (!lenis) return;

		const routeUsesCustomScroll = page.url.pathname === '/' || page.url.pathname === '/about';
		if (routeUsesCustomScroll) {
			lenis.scrollTo(0, { immediate: true, force: true });
			lenis.stop();
		} else {
			lenis.start();
		}
	});

	onMount(() => {
		const { lenis, destroy } = initSmoothScroll();
		lenisInstance = lenis;
		lenisStore.set(lenis);

		return () => {
			destroy();
			lenisInstance = null;
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
