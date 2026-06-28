<!--
  ============================================================
  SECTION LAYOUT — [id]
  ============================================================
  Forces the section page to fully remount when the [id] param
  changes. Navigating between sections reuses the same route, so
  SvelteKit would otherwise keep the component (and its GSAP /
  ScrollTrigger / wheel listeners / phase state) alive, leaving
  the experience in a stale state. Keying on the section id makes
  Svelte destroy and recreate the page, so onMount runs fresh.
  ============================================================
-->

<script lang="ts">
  import { page } from '$app/state';

  let { children } = $props();
</script>

{#key page.url.pathname}
  {@render children()}
{/key}