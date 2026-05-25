<h1 class="page-title">Quante facce ha una medaglia</h1>

<p class="home-subtitle">Test typography del design system</p>

<h2 class="section-menu">Section menu (50px)</h2>

<p class="home-intro">
  Home intro: body bold 56px.<br>
  Per testare un testo introduttivo dell'homepage.
</p>

<p class="section-intro">
  Section intro: body bold 68px line-height 110%.<br>
  Esempio di testo introduttivo di una sezione.
</p>

<h3 class="header">Header (20px display)</h3>

<div class="card-test">
  <p class="card-id">card id 14px uppercase</p>
  <p class="card-body">Card body: extrabold 22px line-height 110%. Esempio di testo body in una card.</p>
  <p class="card-footer">card footer uppercase</p>
</div>

<p class="comment-body">
  Comment body: medium 18px. Testo di un commento d'esempio.
</p>

<h2 class="section-title sustainability">SOSTENIBILITÀ</h2>
<h2 class="section-title sport">SPORT</h2>
<h2 class="section-title infrastructure">INFRASTRUTTURE</h2>

<style>
  /* --- Page-level layout --- */
  :global(body) {
    padding: var(--spacing-xl);
    color: var(--color-text-primary);
  }

  h1, h2, h3, p {
    margin: 0 0 var(--spacing-md) 0;
  }

  /* --- Text styles --- */
  .page-title {
    font: var(--text-page-title-font);
  }

  .home-subtitle {
    font: var(--text-home-subtitle-font);
    color: var(--color-text-secondary);
  }

  .section-menu {
    font: var(--text-section-menu-font);
  }

  .home-intro {
    font: var(--text-home-intro-font);
  }

  .section-intro {
    font: var(--text-section-intro-font);
  }

  .header {
    font: var(--text-header-font);
  }

  .card-test {
    border: var(--border-thin);
    border-radius: var(--radius-sm);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    background-color: var(--color-background-card);
  }

  .card-id {
    font: var(--text-card-id-font);
    text-transform: var(--text-card-id-text-transform);
  }

  .card-body {
    font: var(--text-card-body-font);
  }

  .card-footer {
    font: var(--text-card-footer-font);
    text-transform: var(--text-card-footer-text-transform);
  }

  .comment-body {
    font: var(--text-comment-body-font);
  }

  /* --- Section titles (one font, three letter-spacings) --- */
  .section-title {
    font: var(--text-section-title-font);
    margin-bottom: var(--spacing-lg);
  }

  .section-title.sustainability {
    letter-spacing: var(--text-section-title-letter-spacing-sustainability);
    color: var(--color-section-sustainability);
  }

  .section-title.sport {
    letter-spacing: var(--text-section-title-letter-spacing-sport);
    color: var(--color-section-sport);
  }

  .section-title.infrastructure {
    letter-spacing: var(--text-section-title-letter-spacing-infrastructure);
    color: var(--color-section-infrastructure);
  }
</style>