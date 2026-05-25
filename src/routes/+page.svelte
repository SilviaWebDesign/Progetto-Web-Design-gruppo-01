<h1>Quante facce ha una medaglia</h1>

<p class="intro">
  Test del design system: colori, bordi e gradient delle 3 sezioni.
</p>

<h2>Card di default (background-card)</h2>
<div class="row">
  <div class="card thin">
    <p>Card thin border (1px)</p>
    <p class="muted">Background trasparente, bordo sottile.</p>
  </div>
  <div class="card thick">
    <p>Card thick border (2px)</p>
    <p class="muted">Background trasparente, bordo doppio.</p>
  </div>
</div>

<h2>Section gradients (per card sezioni, stato hover)</h2>
<div class="row">
  <div class="card thin gradient-sustainability">
    <p>Sostenibilità</p>
  </div>
  <div class="card thin gradient-sport">
    <p>Sport</p>
  </div>
  <div class="card thin gradient-infrastructure">
    <p>Infrastrutture</p>
  </div>
</div>

<h2>Comment gradients (per card commenti, stato hover/clicked)</h2>
<div class="row">
  <div class="card thin gradient-comment-sustainability">
    <p>Commento sostenibilità</p>
  </div>
  <div class="card thin gradient-comment-sport">
    <p>Commento sport</p>
  </div>
  <div class="card thin gradient-comment-infrastructure">
    <p>Commento infrastrutture</p>
  </div>
</div>

<style>
  h1 {
    color: var(--color-text-primary);
  }

  h2 {
    color: var(--color-text-secondary);
    margin-top: var(--spacing-xl);
  }

  .intro {
    color: var(--color-text-secondary);
  }

  .row {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  /* --- Cards --- */
  .card {
    flex: 1;
    min-height: var(--unit-160);
    padding: var(--spacing-lg);
    background-color: var(--color-background-card);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
  }

  .card.thin {
    border: var(--border-thin);
  }

  .card.thick {
    border: var(--border-thick);
  }

  .muted {
    color: var(--color-text-muted);
  }

  /* --- Gradient backgrounds (override background-color) --- */
  .gradient-sustainability {
    background: var(--gradient-section-sustainability);
  }
  .gradient-sport {
    background: var(--gradient-section-sport);
  }
  .gradient-infrastructure {
    background: var(--gradient-section-infrastructure);
  }

  .gradient-comment-sustainability {
    background: var(--gradient-comment-sustainability);
  }
  .gradient-comment-sport {
    background: var(--gradient-comment-sport);
  }
  .gradient-comment-infrastructure {
    background: var(--gradient-comment-infrastructure);
  }

  /* --- TEMP: test font loading --- */
    h1, h2 {
    font-family: var(--font-family-display);
    font-weight: var(--font-weight-black);
    }

    .intro, p {
    font-family: var(--font-family-body);
    }


</style>