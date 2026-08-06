/** How many sectors a player picks, and therefore how many missions they play
 *  and how many startups end up on their founder card.
 *
 *  Kept in its own module (rather than in store.ts) so server components like
 *  the root layout can read it without pulling zustand into the server bundle.
 *
 *  Everything downstream is already length-driven -- mission progress, the city
 *  skyline, founder-card startups and scoring all derive from
 *  chosenSectors.length -- so this is the only value that needs changing. */
export const MISSIONS_PER_RUN = 2;

/** Spelled-out form for prose copy. */
export const MISSIONS_WORD =
  ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE"][MISSIONS_PER_RUN] ??
  String(MISSIONS_PER_RUN);
