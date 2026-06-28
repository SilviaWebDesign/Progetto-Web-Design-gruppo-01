<!--
  ============================================================
  PAGE TRANSITION
  ============================================================
  A full-screen veil that fades in before navigating to another
  section and fades out once the new page mounts, covering the
  remount so the change feels smooth.
  ============================================================
-->

<script lang="ts">
  import { overlayVisible } from '$lib/stores/pageTransition';
</script>

<div
  class="page-transition"
  class:is-visible={$overlayVisible}
  aria-hidden="true"
></div>

<style>
  .page-transition {
    position: fixed;
    inset: 0;
    z-index: 9999;

    background: var(--color-background-page);

    opacity: 0;
    pointer-events: none;
    transition: opacity 400ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  .page-transition.is-visible {
    opacity: 1;
    pointer-events: auto;
  }
</style>