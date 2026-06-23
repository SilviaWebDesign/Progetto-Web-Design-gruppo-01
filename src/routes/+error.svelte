<script lang="ts">
  import { page } from '$app/stores';
</script>

<main class="error-page">
  <h1>{$page.status}</h1>
  <p>{$page.error?.message ?? 'Pagina non trovata'}</p>
  <a href="/">← Torna alla home</a>
</main>

<style>
  .error-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    text-align: center;
    padding: var(--spacing-xl);
  }
  .error-page h1 {
    font: var(--text-page-title-font, 700 80px/1 sans-serif);
  }
  .error-page a {
    color: var(--color-text-primary);
    font-weight: 700;
  }
</style>