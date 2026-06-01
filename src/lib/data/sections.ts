/* ============================================================
   DATA — SECTIONS (aggregator)
   ============================================================
   Combines all section data files into a single array.
   This is the main entry point components should import to
   render the full content of the site.

   Order of sections in the array reflects the order they
   appear in the home menu / user flow.
   ============================================================ */

import type { Section, SectionId } from '$lib/types';

import { sustainabilitySection } from './sustainability';
import { sportSection } from './sport';
import { infrastructureSection } from './infrastructure';

/* --- All sections (ordered) --- */

export const sections: Section[] = [
  sustainabilitySection,
  sportSection,
  infrastructureSection
];

/* --- Lookup helper --- */

/**
 * Retrieve a single section by its id.
 * Returns undefined if no section matches (shouldn't happen in practice
 * because the SectionId type only allows valid ids).
 */
export function getSectionById(id: SectionId): Section | undefined {
  return sections.find((section) => section.id === id);
}