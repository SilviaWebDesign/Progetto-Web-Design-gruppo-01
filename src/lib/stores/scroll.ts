import { writable } from 'svelte/store';
import type { Lenis } from 'lenis';

/* Holds the app-wide Lenis instance so pages can stop/start
   smooth scrolling (e.g. to lock the view during topics mode). */
export const lenisStore = writable<Lenis | null>(null);