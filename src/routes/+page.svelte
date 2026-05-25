<h1>Quante facce ha una medaglia</h1>

<p>Test colori, spacing tokens e radius tokens:</p>

<div class="row">
  <div class="swatch sustainability"></div>
  <div class="swatch sport"></div>
  <div class="swatch infrastructure"></div>
  <div class="swatch neutral"></div>
</div>

<p>Test radius tokens (none / xs / sm / md):</p>

<div class="row">
  <div class="radius-test radius-none"></div>
  <div class="radius-test radius-xs"></div>
  <div class="radius-test radius-sm"></div>
  <div class="radius-test radius-md"></div>
</div>

<style>
  .row {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
  }

  .swatch {
    width: var(--unit-120);
    height: var(--unit-120);
    border: 1px solid var(--neutral-200);
  }

  .sustainability { background-color: var(--sustainability-500); }
  .sport          { background-color: var(--sport-500); }
  .infrastructure { background-color: var(--infrastructure-500); }
  .neutral        { background-color: var(--neutral-700); }

  .radius-test {
    width: var(--unit-120);
    height: var(--unit-120);
    background-color: var(--neutral-300);
  }

  .radius-none { border-radius: var(--radius-none); }
  .radius-xs   { border-radius: var(--radius-xs); }
  .radius-sm   { border-radius: var(--radius-sm); }
  .radius-md   { border-radius: var(--radius-md); }
</style>