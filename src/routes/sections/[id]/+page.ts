import { error } from '@sveltejs/kit';
import { getSectionById } from '$lib/data/sections';
import type { SectionId } from '$lib/types';
import type { PageLoad } from './$types';

/**
 * Load function for a section page.
 * Runs before the page renders. Reads the [id] segment from the URL,
 * validates it against our known sections, and returns the matching
 * Section object (or throws a 404 if the id is unknown).
 */
export const load: PageLoad = ({ params }) => {
  const section = getSectionById(params.id as SectionId);

  if (!section) {
    throw error(404, `Sezione "${params.id}" non trovata`);
  }

  return { section };
};