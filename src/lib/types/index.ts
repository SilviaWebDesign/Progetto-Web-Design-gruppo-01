/* ============================================================
   TYPES — Shared data model for the project
   ============================================================
   Defines the shape of the data structures used across the site:
   sections, topics, comments, and derived opinion states.

   These types are the contract between data files (data/) and
   the components that render them.

   If you don't know what is typescipt, open these links: 
   https://www.typescriptlang.org/#:~:text=TypeScript%20is%20JavaScript%20with%20syntax,better%20tooling%20at%20any%20scale.
   https://www.w3schools.com/typescript/typescript_intro.php 


   ⚠️ TODO: This typing reflects the initial feedback algorithm
   (NEUTRAL / ALL_POSITIVE / ALL_NEGATIVE / MOSTLY_POSITIVE /
   MOSTLY_NEGATIVE). The algorithm and state model will likely
   be revised after the first components are prototyped.
   Revisit this type along with utils/getState and utils/getScore
   once the design of the 3D object's visual states is finalized.
   
   ============================================================ */


/* ------------------------------------------------------------
   SECTION IDS
   ------------------------------------------------------------
   The 3 main sections of the site. Used as keys for theming,
   routing, and data lookup.
   ------------------------------------------------------------ */

export type SectionId = 'sustainability' | 'sport' | 'infrastructure';


/* ------------------------------------------------------------
   OPINION STATE
   ------------------------------------------------------------
   The 5 possible states of a section based on user likes.
   Used to drive the 3D object's visual state.
   ! This have to be changed after the prof review on wendesday 27th. !
   ------------------------------------------------------------ */

export type OpinionState =
  | 'NEUTRAL'
  | 'ALL_POSITIVE'
  | 'ALL_NEGATIVE'
  | 'MOSTLY_POSITIVE'
  | 'MOSTLY_NEGATIVE';


/* ------------------------------------------------------------
   COMMENT
   ------------------------------------------------------------
   A single opinion comment within a topic.
   Each topic has 3 positive and 3 negative comments.
   ------------------------------------------------------------ */

export interface Comment {
  id: string;
  sentiment: 'positive' | 'negative';
  body: string;
}


/* ------------------------------------------------------------
   TOPIC
   ------------------------------------------------------------
   A topic within a section. Each section contains 3 topics.
   Each topic carries its own set of comments.
   ------------------------------------------------------------ */

/** A single external source/reference shown under a topic's text block. */
export interface Source {
  label: string;
  url: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  /** One or more external sources for this topic (may be empty). */
  sources: Source[];
  comments: Comment[];
}


/* ------------------------------------------------------------
   SECTION
   ------------------------------------------------------------
   A main section of the site (sustainability / sport /
   infrastructure). Holds its own topics and metadata for
   theming and 3D object association.
   ------------------------------------------------------------ */

export interface Section {
  id: SectionId;
  title: string;
  description: string;
  object3D: '3d-tree' | '3d-skater' | '3d-crane';
  glbPath: string;  // path to the .glb file in static/ (e.g. '/models/tree.glb')
  frostImage: string;
  modelFitFactor: number;
  resultScale?: number; // per-section feedback model size (default 1)
  topics: Topic[];
  feedback: Record<OpinionState, string>;
}


