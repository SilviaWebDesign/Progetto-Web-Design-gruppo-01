<!--
  ============================================================
  HEADER
  ============================================================
  Fixed site header. Hidden by default (translated up + faded
  out); becomes visible once the user scrolls past a small
  threshold, or when the menu is open, or when `alwaysVisible`
  is set. This keeps it out of the way during the frost/intro
  scenes (no scroll yet = hidden) and reveals it as you scroll.

  Left:  site wordmark (link to home)
  Right: menu button that opens a right-side navigation drawer
  ============================================================
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { sections } from '$lib/data/sections';
  import { headerState } from '$lib/stores/header';

 interface Props {
    /** Force the header to stay visible regardless of scroll. */
    alwaysVisible?: boolean;
    /** Section name shown centered; appears only when `showSection` is true. */
    sectionTitle?: string;
    /** Whether the centered section name is visible (driven by scroll). */
    showSection?: boolean;
  }

  let { alwaysVisible = false }: Props = $props();

  /* Section name + visibility come from the shared store (set by pages). */
  let sectionTitle = $derived($headerState.sectionTitle);
  let showSection = $derived($headerState.showSection);
  let forceVisible = $derived($headerState.forceVisible ?? false);
  let onSectionTitleClick = $derived($headerState.onSectionTitleClick);

  function handleSectionTitleClick() {
    onSectionTitleClick?.();
  }

  let menuOpen = $state(false);
  let scrolled = $state(false);

  const SCROLL_THRESHOLD = 8;

  /* Nav targets: home + the three sections, built from our data. */
  const navLinks = [
    { href: '/', label: 'Home' },
    ...sections.map((section) => ({
      href: `/sections/${section.id}`,
      label: section.title
    })),
    // NOTE: /about doesn't exist yet — link added so the menu is complete.
    // It will 404 until the About page is built (roadmap).
    { href: '/about', label: 'About' }
  ];

  function updateScrollState() {
    scrolled = window.scrollY > SCROLL_THRESHOLD;
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && menuOpen) {
      closeMenu();
    }
  }

  /* Pages drive their own scroll (native scroll, Lenis, wheel-jacked
     narrative, ...). A capturing listener on window runs before any
     of those bubble-phase listeners, so it can veto the event outright
     and keep the content behind the overlay from moving. */
  function blockBackgroundScroll(event: Event) {
    if (!menuOpen) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  /* Lock body scroll while the menu drawer is open, and flag the body so the
     page content behind can be blurred via a CSS filter (reliable on Chrome,
     where backdrop-filter fails to sample the WebGL canvas). */
  $effect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    document.body.classList.toggle('menu-open', menuOpen);
  });

  onMount(() => {
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('wheel', blockBackgroundScroll, { capture: true, passive: false });
    window.addEventListener('touchmove', blockBackgroundScroll, { capture: true, passive: false });
    return () => {
      window.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('wheel', blockBackgroundScroll, { capture: true });
      window.removeEventListener('touchmove', blockBackgroundScroll, { capture: true });
    };
  });
</script>


<header
  class="header"
  class:header--visible={alwaysVisible || scrolled || menuOpen || forceVisible}
  class:header--always={alwaysVisible}
  class:header--menu-open={menuOpen}
>
  <div class="header__inner">
  <a class="header__logo" href="/">Quante facce ha una medaglia?</a>

  {#if sectionTitle}
    <button
      type="button"
      class="header__section"
      class:is-visible={showSection}
      onclick={handleSectionTitleClick}
    >
      {sectionTitle}
    </button>
  {/if}

  <button
      type="button"
      class="header__menu-button"
      aria-expanded={menuOpen}
      aria-controls="site-menu"
      aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'}
      onclick={toggleMenu}
    >
      <span class="header__burger" class:is-open={menuOpen} aria-hidden="true">
        <span class="header__burger-line"></span>
        <span class="header__burger-line"></span>
        <span class="header__burger-line"></span>
      </span>
    </button>
  </div>
</header>


<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="menu-overlay"
  class:menu-overlay--open={menuOpen}
  aria-hidden={!menuOpen}
  onclick={(e) => e.target === e.currentTarget && closeMenu()}
>
  <button
    type="button"
    class="menu-overlay__close"
    aria-label="Chiudi menu"
    onclick={closeMenu}
  >
    <span class="menu-overlay__close-icon" aria-hidden="true">
      <span class="menu-overlay__close-line"></span>
      <span class="menu-overlay__close-line"></span>
    </span>
  </button>

  <nav id="site-menu" class="menu-overlay__panel" aria-label="Navigazione principale">
    <ul class="menu-overlay__list">
      {#each navLinks as link (link.href)}
        <li>
          <a class="menu-overlay__link" href={link.href} onclick={closeMenu}>
            {link.label}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
</div>


<style>
  /* ============================================================
     HEADER BAR — hidden until scroll / menu / alwaysVisible
     ============================================================ */

  .header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    max-width: 100vw;
    z-index: 100;

    box-sizing: border-box;
    background: transparent;

    /* Hidden by default: slid up and faded out. */
    pointer-events: none;
    transform: translateY(-100%);
    opacity: 0;
    transition:
      transform 350ms ease,
      opacity 350ms ease;
  }

  .header--visible {
    transform: translateY(0);
    opacity: 1;
  }

  .header--always {
    z-index: 200;
  }

  /* Hide the bar itself while the menu overlay is open: the overlay
     provides its own close control, so the header would otherwise
     just sit there duplicating it. */
  .header.header--menu-open {
    opacity: 0;
    pointer-events: none;
  }

  .header.header--menu-open .header__inner {
    pointer-events: none;
  }

  .header__inner {
    --control-height: 24px;

    position: relative; 

    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-sm);

    width: 100%;
    min-height: var(--control-height);
    padding: var(--spacing-xl) var(--page-gutter);

    box-sizing: border-box;
    pointer-events: auto; /* re-enable clicks on the bar itself */
  }


  /* ============================================================
     LOGO / WORDMARK
     ============================================================ */

  .header__logo {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    display: flex;
    align-items: center;

    font-family: var(--font-family-display);
    font-size: var(--font-size-lg);
    font-weight: 900;
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;

    color: var(--color-text-primary);
    text-decoration: none;
  }

  /* ============================================================
     CENTERED SECTION NAME — appears after the title scrolls away
     ============================================================ */

.header__section {
    position: absolute;
    left: 50%;
    top: var(--spacing-xl);
    bottom: var(--spacing-sm);
    transform: translateX(-50%);

    display: flex;
    align-items: center;
    height: var(--control-height);

    margin: 0;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;

    font-family: var(--font-family-display);
    font-size: var(--font-size-lg);
    font-weight: 900;
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    text-transform: uppercase;
    white-space: nowrap;

    color: var(--color-text-primary);

    opacity: 0;
    transition: opacity 300ms ease;
    pointer-events: none;
  }

  .header__section.is-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .header__section:hover {
    opacity: 0.85;
  }

  .header__section:focus-visible {
    outline: 2px solid var(--color-text-primary);
    outline-offset: 4px;
  }

  .header__logo:hover {
    opacity: 0.85;
  }


  /* ============================================================
     MENU BUTTON
     ============================================================ */

  .header__menu-button {
    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    width: var(--control-height);
    height: var(--control-height);
    margin: 0;
    padding: 0;

    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-primary);
  }

  .header__menu-button:focus-visible {
    outline: 2px solid var(--color-text-primary);
    outline-offset: 4px;
  }

  .header__menu-button[aria-expanded='true'] {
    color: var(--color-text-primary);
    position: relative;
    z-index: 200;
  }

  /* ============================================================
     BURGER → X morph (Strada B: 3 lines that reposition)
     ============================================================
     Three lines stacked vertically. On open:
     - top line moves to center and rotates 45deg
     - middle line fades out
     - bottom line moves to center and rotates -45deg
     The two remaining lines cross into an X.
     ============================================================ */

  .header__burger {
    position: relative;
    display: block;
    width: var(--control-height);
    height: var(--control-height);
  }

  .header__burger-line {
    position: absolute;
    left: 50%;
    width: 20px;
    height: 2px;
    background-color: currentColor;
    border-radius: 2px;
    transform: translateX(-50%);

    transition:
      top 300ms cubic-bezier(0.25, 1, 0.5, 1),
      opacity 200ms ease,
      transform 300ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  /* Resting positions: three evenly-spaced horizontal lines.
     control-height is 24px, lines are 2px tall. */
  .header__burger-line:nth-child(1) { top: 5px; }
  .header__burger-line:nth-child(2) { top: 11px; }
  .header__burger-line:nth-child(3) { top: 17px; }

  /* Open state → X */
  .header__burger.is-open .header__burger-line:nth-child(1) {
    top: 11px;
    transform: translateX(-50%) rotate(45deg);
  }
  .header__burger.is-open .header__burger-line:nth-child(2) {
    opacity: 0;
  }
  .header__burger.is-open .header__burger-line:nth-child(3) {
    top: 11px;
    transform: translateX(-50%) rotate(-45deg);
  }

  /* ============================================================
     MENU OVERLAY (right-side drawer)
     ============================================================ */

  .menu-overlay {
    /* Light tint on top of the page, which is blurred by a CSS filter on
       .app-shell (see app.css) — reliable on Chrome, unlike backdrop-filter. */
    --menu-veil: rgba(249, 249, 250, 0.55);  /* light tint over the blurred page */

    position: fixed;
    inset: 0;
    z-index: 99;

    display: flex;
    align-items: center;
    justify-content: center;

    background: var(--menu-veil);

    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
      opacity 300ms ease,
      visibility 300ms ease;
  }

  .menu-overlay--open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  /* Keep the drawer above the bar when alwaysVisible raised z-index. */
  .header--always ~ .menu-overlay {
    z-index: 199;
  }

  .menu-overlay__close {
    position: absolute;
    top: var(--spacing-xl);
    right: var(--page-gutter);

    display: flex;
    align-items: center;
    justify-content: center;

    width: 24px;
    height: 24px;
    margin: 0;
    padding: 0;

    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-primary);
    z-index: 1;
  }

  .menu-overlay__close:focus-visible {
    outline: 2px solid var(--color-text-primary);
    outline-offset: 4px;
  }

  .menu-overlay__close-icon {
    position: relative;
    display: block;
    width: 24px;
    height: 24px;
  }

  .menu-overlay__close-line {
    position: absolute;
    top: 11px;
    left: 50%;
    width: 20px;
    height: 2px;
    background-color: currentColor;
    border-radius: 2px;
  }

  .menu-overlay__close-line:nth-child(1) {
    transform: translateX(-50%) rotate(45deg);
  }

  .menu-overlay__close-line:nth-child(2) {
    transform: translateX(-50%) rotate(-45deg);
  }

  .menu-overlay__panel {
    display: flex;
    align-items: center;
    justify-content: center;

    width: 100%;
    padding: var(--spacing-xl) var(--page-gutter);
    box-sizing: border-box;
  }

  .menu-overlay__list {
    list-style: none;
    margin: 0;
    padding: 0;

    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }

  .menu-overlay__link {
    font-family: var(--font-family-display);
    font-size: var(--font-size-4xl);
    font-weight: 900;
    font-variation-settings: 'wght' 900;
    line-height: 1;
    text-transform: uppercase;
    text-align: center;

    color: var(--color-text-primary);
    text-decoration: none;
  }

  .menu-overlay__link:hover {
    opacity: 0.75;
  }

  .menu-overlay__link:focus-visible {
    outline: 2px solid var(--color-text-primary);
    outline-offset: 4px;
  }
</style>