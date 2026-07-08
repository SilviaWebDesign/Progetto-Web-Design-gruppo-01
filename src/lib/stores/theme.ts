import { writable } from 'svelte/store';

/**
 * Home-only theme toggle.
 * We keep it global so the Header can control it, but the CSS/visual effects
 * are applied only on the home route.
 */
export const homeDarkModeEnabled = writable(false);

export function toggleHomeDarkMode() {
  homeDarkModeEnabled.update((v) => !v);
}

export function setHomeDarkModeEnabled(enabled: boolean) {
  homeDarkModeEnabled.set(enabled);
}

