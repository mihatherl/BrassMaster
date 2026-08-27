/**
 * The bundled course: a document, not code.
 *
 * Typed `unknown` on purpose and read through `readCourse` like any user's
 * file will one day be — the bundled format and the read format cannot drift
 * apart if the bundle has no private door. A test asserts it reads.
 *
 * ## The content is scaffolding for the machinery, and says so
 *
 * The levels below follow `course-plan.md`'s ratified worked example —
 * "Mastery of Common Keys", opening levels — restricted to drills and
 * phrases, which are generated material: no new musical material ships here,
 * so the nothing-ships-unheard rule is satisfied by construction. **The real
 * curriculum is the player's to author** (the ruling: levels are ordered by
 * the author's own intuition about what is easy and what is harder), and this
 * document is where he does it — it is data, and editing it is authorship,
 * not programming.
 *
 * F major and B flat major because they are the first two flat keys every
 * band player meets; shape → chord → reading in each, because that is the
 * order the worked example ratified.
 */

export const COMMON_KEYS_DOCUMENT: unknown = {
  id: 'common-keys',
  name: 'Common Keys',
  blurb: 'F major and B flat: the shape, the chord, then reading in the key.',
  schemaVersion: 1,
  levels: [
    {
      id: 'f-shape',
      name: 'F major, the shape',
      note: 'The scale, up and back. Let the fingering settle before the tempo rises.',
      base: { kind: 'drills', drillId: 'major-scale', difficultyId: 'easy', fifths: -1 },
      tempo: { floor: 66, ceiling: 96, step: 6 },
    },
    {
      id: 'f-chord',
      name: 'F major, the chord',
      note: 'The tonic arpeggio — the leaps the scale hides.',
      base: { kind: 'drills', drillId: 'tonic-arpeggio', difficultyId: 'easy', fifths: -1 },
      tempo: { floor: 66, ceiling: 96, step: 6 },
    },
    {
      id: 'f-reading',
      name: 'Reading in F',
      note: 'Unfamiliar phrases in the key you just drilled. Slower on purpose.',
      base: { kind: 'phrases', difficultyId: 'easy', fifths: -1 },
      tempo: { floor: 60, ceiling: 84, step: 6 },
    },
    {
      id: 'bb-shape',
      name: 'B flat major, the shape',
      base: { kind: 'drills', drillId: 'major-scale', difficultyId: 'easy', fifths: -2 },
      tempo: { floor: 66, ceiling: 96, step: 6 },
    },
    {
      id: 'bb-chord',
      name: 'B flat major, the chord',
      base: { kind: 'drills', drillId: 'tonic-arpeggio', difficultyId: 'easy', fifths: -2 },
      tempo: { floor: 66, ceiling: 96, step: 6 },
    },
    {
      id: 'bb-reading',
      name: 'Reading in B flat',
      note: 'Both keys are now yours to read in. Push the tempo when it feels easy.',
      base: { kind: 'phrases', difficultyId: 'easy', fifths: -2 },
      tempo: { floor: 60, ceiling: 84, step: 6 },
    },
  ],
};
