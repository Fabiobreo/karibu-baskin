import type { DrillContent } from "./content";

/**
 * Schema di prova per i test della lavagna: meta' campo, il 3 riceve dal 4,
 * palleggia verso il canestro laterale e tira; il 5 blocca; un cono fermo.
 */
export const PICK_AND_SHOOT: DrillContent = {
  v: 1,
  pieces: [
    { id: "a3", kind: "role", side: "attack", role: 3 },
    { id: "a4", kind: "role", side: "attack", role: 4 },
    { id: "a5", kind: "role", side: "attack", role: 5 },
    { id: "d4", kind: "role", side: "defense", role: 4 },
    { id: "c1", kind: "cone" },
  ],
  steps: [
    {
      text: "Il 4 porta palla, il 5 va a bloccare",
      at: {
        a3: { x: 20, y: 4 },
        a4: { x: 16, y: 7.5 },
        a5: { x: 22, y: 8 },
        d4: { x: 21, y: 4.5 },
        c1: { x: 18, y: 12 },
      },
      ball: { holder: "a4" },
      screens: [{ from: "a5", to: { x: 21, y: 5 } }],
    },
    {
      text: "Passaggio al 3",
      at: {
        a3: { x: 19, y: 6 },
        a4: { x: 17, y: 7.5 },
        a5: { x: 21, y: 5 },
        d4: { x: 21, y: 4.5 },
        c1: { x: 18, y: 12 },
      },
      ball: { holder: "a3" },
    },
    {
      text: "Il 3 palleggia verso il laterale e tira",
      at: {
        a3: { x: 15, y: 11 },
        a4: { x: 17, y: 7.5 },
        a5: { x: 21, y: 5 },
        d4: { x: 21, y: 4.5 },
        c1: { x: 18, y: 12 },
      },
      ball: { shot: "bottomSide" },
    },
  ],
};
