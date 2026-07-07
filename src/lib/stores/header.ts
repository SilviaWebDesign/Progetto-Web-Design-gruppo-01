/* ============================================================
   HEADER STATE (store)
   ============================================================
   Shared state so a page can drive the global Header (which lives
   in the root layout): the centered section name and whether it's
   currently visible. Section pages set these; the Header reads them.
   ============================================================ */

import { writable } from 'svelte/store';

interface HeaderState {
  /** Section name to show centered in the header (empty = none). */
  sectionTitle: string;
 /** Whether the centered section name is visible. */
  showSection: boolean;
  /** Force the header visible without real scroll (e.g. home cards phase). */
  forceVisible?: boolean;
  /** Called when the centered section name is clicked (jump to section start). */
  onSectionTitleClick?: () => void;
  /** Called when the logo/Home link is clicked while already on "/" (reset to top). */
  onLogoClick?: () => void;
}

export const headerState = writable<HeaderState>({
  sectionTitle: '',
  showSection: false,
  forceVisible: false,
  onSectionTitleClick: undefined,
  onLogoClick: undefined
});

/** Reset to defaults (e.g. when leaving a section page). */
export function resetHeaderState() {
  headerState.set({
    sectionTitle: '',
    showSection: false,
    forceVisible: false,
    onSectionTitleClick: undefined,
    onLogoClick: undefined
  });
}