import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { SectionId, OpinionState } from '$lib/types';

/* Records, per section, the opinion result the user reached.
   Persisted in sessionStorage so it survives reloads during a visit,
   but resets when the tab is closed (fresh start each new session). */
type ProgressMap = Partial<Record<SectionId, OpinionState>>;

/** The three sections, in canonical order. */
export const SECTION_ORDER: SectionId[] = [
  'sustainability',
  'sport',
  'infrastructure'
];

const STORAGE_KEY = 'olympics-progress';

/* Read any saved progress (browser only — sessionStorage doesn't
   exist during server-side rendering). */
function loadInitial(): ProgressMap {
  if (!browser) return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function createProgress() {
  const { subscribe, update, set } = writable<ProgressMap>(loadInitial());

  /* Mirror every change back into sessionStorage. */
  function persist(map: ProgressMap) {
    if (browser) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      } catch {
        /* storage full or unavailable — fail silently */
      }
    }
    return map;
  }

  return {
    subscribe,
    /** Marks a section completed with its computed result. */
    markCompleted(id: SectionId, result: OpinionState) {
      update((map) => persist({ ...map, [id]: result }));
    },
    /** Clears all progress (e.g. to restart the experience). */
    reset() {
      set(persist({}));
    }
  };
}

export const progress = createProgress();

/** True once every section has a recorded result. */
export const allSectionsCompleted = derived(progress, ($progress) =>
  SECTION_ORDER.every((id) => $progress[id] != null)
);