import { writable, derived } from 'svelte/store';
import type { SectionId, OpinionState } from '$lib/types';

/* Records, per section, the opinion result the user reached.
   Drives next-section navigation and the final results page. */
type ProgressMap = Partial<Record<SectionId, OpinionState>>;

/** The three sections, in their canonical order. */
export const SECTION_ORDER: SectionId[] = [
  'sustainability',
  'sport',
  'infrastructure'
];

function createProgress() {
  const { subscribe, update, set } = writable<ProgressMap>({});

  return {
    subscribe,
    /** Marks a section completed with its computed result. */
    markCompleted(id: SectionId, result: OpinionState) {
      update((map) => ({ ...map, [id]: result }));
    },
    /** Clears all progress (e.g. to restart the experience). */
    reset() {
      set({});
    }
  };
}

export const progress = createProgress();

/** True once every section in SECTION_ORDER has a recorded result. */
export const allSectionsCompleted = derived(progress, ($progress) =>
  SECTION_ORDER.every((id) => $progress[id] != null)
);