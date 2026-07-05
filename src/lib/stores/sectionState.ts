import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { SectionId, OpinionState } from '$lib/types';

/* The working state *inside* a section — where the user currently is.
   Unlike `progress` (which records the final result per section and
   persists for the whole visit), this is the live, resumable snapshot
   used to land the user back exactly where they were after a reload.
   Same lifecycle: sessionStorage, so it survives reloads but resets
   when the tab is closed. */

type Phase = 'intro' | 'topics' | 'feedback';

export interface SavedSectionState {
  currentTopic: number;
  topicLikes: Record<string, boolean>[];
  phase: Phase;
  currentResult: OpinionState | null;
}

type SectionStateMap = Partial<Record<SectionId, SavedSectionState>>;

const STORAGE_KEY = 'olympics-section-state';

function loadInitial(): SectionStateMap {
  if (!browser) return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SectionStateMap) : {};
  } catch {
    return {};
  }
}

function createSectionState() {
  const store = writable<SectionStateMap>(loadInitial());

  function persist(map: SectionStateMap) {
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
    subscribe: store.subscribe,
    /** Save (overwrite) the working snapshot for one section. */
    save(id: SectionId, snapshot: SavedSectionState) {
      store.update((map) => persist({ ...map, [id]: snapshot }));
    },
    /** Read the saved snapshot for one section, or null if none. */
    read(id: SectionId): SavedSectionState | null {
      return get(store)[id] ?? null;
    },
    /** Clear every saved section snapshot (e.g. when restarting the experience). */
    clear() {
      store.set(persist({}));
    }
  };
}

export const sectionState = createSectionState();