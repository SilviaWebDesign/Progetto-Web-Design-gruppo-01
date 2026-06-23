<script lang="ts">
  /* Placeholder home — will be rebuilt based on the final prototype design.
     The previous A/B/C card comparison test has served its purpose:
     CommentCardGlass (now CommentCard) is the chosen variant. */
</script>


<main class="placeholder">
  <h1>Quante facce ha una medaglia?</h1>
  <p>Home page in costruzione. Le sezioni sono raggiungibili via URL diretto:</p>
  <nav>
    <a href="/sections/infrastructure">→ Infrastrutture</a>
    <a href="/sections/sport">→ Sport</a>
    <a href="/sections/sustainability">→ Sostenibilità</a>
  </nav>
</main>


<style>
  .placeholder {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    padding: var(--spacing-xl);
    text-align: center;
  }

  .placeholder h1 {
    font: var(--text-header-font);
  }

  .placeholder nav {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-lg);
  }

  .placeholder a {
    color: var(--color-text-primary);
    font-weight: 700;
  }
</style>