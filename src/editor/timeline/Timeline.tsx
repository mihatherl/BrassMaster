/**
 * The timeline: the concept drawing, working — one bar per axis across the
 * level's progression, divisions the author drags, a per-segment rules table
 * below. `docs/level-progression-concept.png` is the specification and
 * `docs/level-axes-plan.md` the rulings.
 *
 * Percentages are an authoring device: the bars are drawn proportionally
 * because that is how the shape reads, and what is written into the document
 * is the ordered division list the app derives its segments from. Every edit
 * goes through `axis-model.ts`, where the ratified rule semantics (carry,
 * copy-on-split, merge-keep-left) live and are unit-tested; every keystroke
 * is judged by `readCourse` in the page above, as ever.
 *
 * The trichotomy's gesture lives here too: the add-axis picker offers every
 * parameter the material can play, and choosing one that is currently pinned
 * in the level's header *unpins it* — the author has dragged the control
 * down into the graph, exactly as ruled. A parameter is header-level or an
 * axis, never both, and this component makes the state change atomic so the
 * reader can never see the forbidden overlap.
 */

import { Fragment, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { AXIS_MATERIALS, DEFAULT_RULE, type AxisId, type LevelKind } from '../../exercise/course';
import { MAJOR_KEYS } from '../../domain/keys';
import { OFFERED_METRES } from '../../domain/metre';
import {
  instrumentById,
  writtenRange,
  soundingFromWritten,
  INSTRUMENTS,
  type Clef,
} from '../../domain/instruments';
import { formatMask, primaryFingering } from '../../domain/fingering';
import { drawRangeStave } from '../../render/range-stave';
import { StaveCanvas } from '../../ui/StaveCanvas';
import {
  addAxis,
  addDivision,
  clearRule,
  deleteDivision,
  removeAxis,
  setDivisionValue,
  setRule,
  type RawAxis,
  type RawRule,
  type TimelineFragment,
} from './axis-model';
import {
  applyBarDrag,
  ASSUMED_TEMPO,
  fitRule,
  formatSeconds,
  insertAt,
  layoutOf,
  resolveBarDrag,
  xOfAt,
  type BarDrag,
  type SegmentLayout,
  type SegmentRuleShape,
} from './layout';
import { numericDivisions, orderedDivisions, rangeDivisions } from './generators';

const AXIS_LABELS: Record<AxisId, string> = {
  tempo: 'Tempo',
  fifths: 'Key',
  bars: 'Bars',
  cycles: 'Cycles',
  themeCount: 'Tunes',
  range: 'Range',
  span: 'Reach',
  register: 'Register',
  metre: 'Metre',
  intervals: 'Intervals',
  metronomeEnabled: 'Metronome',
  conductorEnabled: 'Conductor',
  fingerings: 'Fingerings',
  playbackMode: 'Sound',
  readingMode: 'Reading',
};

/** Where each parameter's header scalar lives, for the unpin gesture. */
const LEVEL_SCALARS: readonly AxisId[] = [
  'tempo',
  'metronomeEnabled',
  'conductorEnabled',
  'fingerings',
  'playbackMode',
  'readingMode',
];
const BASE_FIELD: Partial<Record<AxisId, string>> = {
  fifths: 'fifths',
  bars: 'bars',
  cycles: 'cycles',
  themeCount: 'themeCount',
  range: 'range',
  span: 'spanSemitones',
  metre: 'metre',
  intervals: 'intervals',
};

const NUMERIC: readonly AxisId[] = ['tempo', 'bars', 'cycles', 'themeCount'];

/** The callout's gap under its chip, plus room for the horizontal scrollbar. */
const GAP_BELOW_CHIP = 34;

/**
 * Hues for the stage blocks, walked in order along each axis so neighbours
 * never share one (the player's ruling of 2026-08-29, replacing the little
 * red marks and the loose labels under them). Semi-transparent, so one set
 * of hues carries both themes: the block tints whatever the page is.
 */
const STAGE_HUES = [210, 145, 35, 275, 0, 185, 95, 320];
const stageTint = (index: number) => {
  const hue = STAGE_HUES[index % STAGE_HUES.length];
  return {
    background: `hsl(${hue} 60% 50% / 0.22)`,
    borderColor: `hsl(${hue} 60% 55% / 0.85)`,
  };
};

/**
 * The reaches a drill is asked for, in the player's own words. Semitones are
 * the schema's unit (7 a fifth, 12 an octave) but nobody authors in them —
 * the from/to generator once wrote figures like "16 semitones" here, which
 * is legal and musically odd, so Reach speaks intervals instead. A figure an
 * old document carries that is not on this list still shows, as itself.
 */
const REACHES: ReadonlyArray<{ semitones: number; name: string }> = [
  { semitones: 7, name: 'a fifth' },
  { semitones: 12, name: 'one octave' },
  { semitones: 19, name: 'an octave and a fifth' },
  { semitones: 24, name: 'two octaves' },
];

interface TimelineProps {
  /** The material, or `any` at the course, whose levels may differ. */
  kind: LevelKind | 'any';
  /** The raw level fragment; the page's reader judges it, this edits it. */
  level: Record<string, unknown>;
  onPatch: (changes: Record<string, unknown>) => void;
  /**
   * Axes this scope is taking from the course. They are drawn — they shape
   * this level's stages as surely as its own do — but ghosted and locked,
   * because they belong to the course document. `onAdopt` takes a copy into
   * this level, which is how an author overrides a shape rather than a
   * value: a dropdown cannot show a progression, so the timeline shows it.
   */
  inherited?: readonly AxisId[];
  onAdopt?: (axisId: AxisId) => void;
  /** False at the course, whose per-stage rules do not inherit. */
  showSegmentRules?: boolean;
  /** True where the level default rule shown is the course's. */
  ruleFromCourse?: boolean;
}

/** The axes as loosely as the document may hold them; garbage is the verdict line's job. */
function rawAxesOf(level: Record<string, unknown>): RawAxis[] {
  const list = Array.isArray(level.axes) ? (level.axes as unknown[]) : [];
  return list.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { axis, divisions } = entry as Record<string, unknown>;
    if (typeof axis !== 'string' || !(axis in AXIS_LABELS) || !Array.isArray(divisions)) return [];
    return [
      {
        axis: axis as AxisId,
        divisions: (divisions as unknown[]).flatMap((d) => {
          if (typeof d !== 'object' || d === null) return [];
          const { at, value } = d as Record<string, unknown>;
          return typeof at === 'number' ? [{ at, value }] : [];
        }),
      },
    ];
  });
}

function rawRulesOf(level: Record<string, unknown>): RawRule[] | undefined {
  const list = Array.isArray(level.segmentRules) ? (level.segmentRules as unknown[]) : [];
  const rules = list.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { at, minBars, score } = entry as Record<string, unknown>;
    if (typeof at !== 'number' || typeof minBars !== 'number') return [];
    return [
      {
        at,
        minBars,
        ...(typeof score === 'object' && score !== null
          ? { score: score as { atLeast: number; overBars: number } }
          : {}),
      },
    ];
  });
  return rules.length ? rules : undefined;
}

function levelRuleOf(level: Record<string, unknown>): {
  minBars: number;
  score?: { atLeast: number; overBars: number };
} {
  const rules = level.rules as Record<string, unknown> | undefined;
  if (typeof rules?.minBars !== 'number') return DEFAULT_RULE;
  const score = rules.score as { atLeast: number; overBars: number } | undefined;
  return { minBars: rules.minBars, ...(score ? { score } : {}) };
}

/** The header scalar a parameter currently pins, or undefined. */
function pinnedValue(level: Record<string, unknown>, axisId: AxisId): unknown {
  if (LEVEL_SCALARS.includes(axisId)) {
    // An old-format band is a tempo AXIS in waiting, not a pin.
    if (axisId === 'tempo' && typeof level.tempo === 'object') return undefined;
    return level[axisId];
  }
  const base = (level.base ?? {}) as Record<string, unknown>;
  return base[BASE_FIELD[axisId]!];
}

/** The starting sequence an added axis opens with — sensible, then edited. */
function defaultAxisFor(
  axisId: AxisId,
  context: { fifths: number; compass: readonly [number, number] },
): RawAxis {
  const divisions = (() => {
    switch (axisId) {
      case 'tempo':
        return numericDivisions(66, 96, 6);
      case 'bars':
        return numericDivisions(8, 16, 3);
      case 'cycles':
        return numericDivisions(2, 6, 3);
      case 'themeCount':
        return numericDivisions(2, 4, 2);
      case 'span':
        return orderedDivisions([7, 12, 24]);
      case 'fifths':
        return orderedDivisions([context.fifths]);
      case 'register':
        return orderedDivisions(['middle', 'high']);
      case 'metre':
        return orderedDivisions([[4, 4], [3, 4]]);
      case 'range':
        return rangeDivisions({
          fifths: context.fifths,
          compass: context.compass,
          anchor: middleOctave(context.compass),
          steps: 3,
          bias: 'both',
        });
      case 'intervals':
        return orderedDivisions([
          { intervals: [{ interval: 2, weight: 3 }, { interval: 3, weight: 1 }] },
        ]);
      case 'metronomeEnabled':
      case 'conductorEnabled':
        return orderedDivisions([true, false]);
      case 'fingerings':
        return orderedDivisions(['trouble', 'never']);
      case 'playbackMode':
        return orderedDivisions(['reference', 'off']);
      case 'readingMode':
        return orderedDivisions(['scrolling', 'paged']);
    }
  })();
  return { axis: axisId, divisions };
}

function middleOctave(compass: readonly [number, number]): { low: number; high: number } {
  const centre = Math.round((compass[0] + compass[1]) / 2);
  return { low: Math.max(compass[0], centre - 6), high: Math.min(compass[1], centre + 6) };
}

export function Timeline({
  kind,
  level,
  onPatch,
  inherited = [],
  onAdopt,
  showSegmentRules = true,
  ruleFromCourse = false,
}: TimelineProps): ReactElement {
  const isInherited = (axisId: AxisId) => inherited.includes(axisId);
  const axes = rawAxesOf(level);
  const fragment: TimelineFragment = { axes, segmentRules: rawRulesOf(level) };
  const levelRule = levelRuleOf(level);

  /*
   * The stave figures and the range generator need an instrument to walk —
   * a course is instrument-agnostic, so this is a PREVIEW, editor-local and
   * never written into the document. The fifths for the ladder come from the
   * level where it says (pinned or first key division), else C.
   */
  const [previewInstrument, setPreviewInstrument] = useState('eb-bass');
  const [previewClef, setPreviewClef] = useState<Clef>('treble');
  const instrument = instrumentById(previewInstrument);
  const compass = writtenRange(instrument, previewClef);
  const base = (level.base ?? {}) as Record<string, unknown>;
  const previewFifths =
    typeof base.fifths === 'number'
      ? base.fifths
      : ((axes.find((a) => a.axis === 'fifths')?.divisions[0]?.value as number | undefined) ?? 0);

  /**
   * A drag in flight: the pointer's time-position, and what dropping here
   * would mean — a join onto the boundary at `at` (snapped, lit) or a split
   * of the gap the pointer is in. Committed on release.
   */
  const [drag, setDrag] = useState<({ axisId: AxisId; index: number } & BarDrag) | null>(null);
  /** Which segment's rule callout is open, by its beginning boundary. */
  const [openRuleAt, setOpenRuleAt] = useState<number | null>(null);
  /**
   * How much room the open callout needs, measured rather than assumed.
   *
   * The first fix for the clipped callout reserved a fixed 13.5rem and was
   * one pixel short of the plainest variant — and the tallest (an authored
   * rule, with a score, wearing its back-to-default button) needs half as
   * much again. A figure guessed here would go stale the next time the
   * callout grows a row, so the callout reports its own height and this
   * follows it.
   */
  const [calloutRoom, setCalloutRoom] = useState(0);

  const apply = (next: TimelineFragment) => {
    // An inherited axis is drawn here but owned by the course: it never
    // travels back into this level's own document on an edit.
    const own = next.axes.filter((axis) => !isInherited(axis.axis));
    onPatch({ axes: own.length ? own : undefined, segmentRules: next.segmentRules });
  };

  const promote = (axisId: AxisId) => {
    /*
     * The drag-down gesture: a pinned parameter moved onto the timeline is
     * unpinned in the same patch, so the reader never sees both. An old
     * tempo band is replaced outright — it was an axis wearing older clothes.
     */
    const next = addAxis(fragment, defaultAxisFor(axisId, { fifths: previewFifths, compass }));
    const unpin: Record<string, unknown> = {};
    if (LEVEL_SCALARS.includes(axisId)) unpin[axisId] = undefined;
    else unpin.base = { ...base, [BASE_FIELD[axisId]!]: undefined };
    onPatch({
      axes: next.axes,
      segmentRules: next.segmentRules,
      ...unpin,
    });
  };

  const offered = (Object.keys(AXIS_MATERIALS) as AxisId[]).filter(
    (axisId) =>
      (kind === 'any' || AXIS_MATERIALS[axisId].includes(kind)) &&
      !axes.some((axis) => axis.axis === axisId),
  );

  /*
   * The x-axis is TIME (the player's ruling, on catching the percent ruler
   * lying): every segment's width is its estimated duration — the bars its
   * rule asks for, at the tempo and metre in force there — so seconds per
   * pixel holds across the whole graph, and every edit re-lays the lot.
   * Stored `at` fractions are an ordinal encoding only from here on; nothing
   * below draws with them.
   */
  const headerTempo = typeof level.tempo === 'number' ? level.tempo : undefined;
  const headerMetre = Array.isArray(base.metre)
    ? (base.metre as unknown as readonly [number, number])
    : undefined;
  const header = { tempo: headerTempo, metre: headerMetre };
  const layout = layoutOf(fragment, levelRule, header);

  /*
   * While a divider is in flight the whole graph is drawn from the document
   * the drop *would* write — so the bars either side, the rules chips, the
   * ruler and the level's own length all move under the finger, and what
   * the author lets go of is exactly what they were looking at.
   */
  const shownFragment = drag
    ? applyBarDrag(fragment, layout, drag.axisId, drag.index, drag, inherited.length === 0)
    : fragment;
  const shown = drag ? layoutOf(shownFragment, levelRule, header) : layout;
  const shownAxes = drag ? rawAxesOf({ ...level, axes: shownFragment.axes }) : axes;
  const tempoAssumed = shown.segments.some((segment) => segment.assumedTempo);

  return (
    <div className="tl">
      {/*
       * One grid, two columns: every axis's parameters on one line at the
       * left, every bar sharing the same right-hand column — so the bars
       * start and end together and the boundary lines below can run through
       * all of them. Wide by design; the wrapper scrolls sideways on a small
       * screen rather than folding the panels back into three lines.
       */}
      {/*
       * `has-callout` opens room *inside* the scroller for a callout to hang
       * in. It has to be inside: `overflow-x: auto` forces the other axis to
       * `auto` as well (a CSS rule with no opt-out), so this element clips
       * vertically whatever its own overflow-y says — which is exactly how
       * the first callout lost its top edge, opening upward through the
       * ruler. The room is taken only while one is open, and given back on
       * close, so the page does not carry a permanent hole.
       */}
      <div
        className={`tl__scroll ${openRuleAt !== null ? 'has-callout' : ''}`}
        style={openRuleAt !== null ? { paddingBottom: calloutRoom } : undefined}
      >
        <div className="tl__grid">
          <div className="tl__corner">
            Level progression{' '}
            <span className="muted">
              {shown.totalBars} bars ≈ {formatSeconds(shown.totalSeconds)}
            </span>
          </div>
          {/* Bars, because bars are the unit: what the rules ask for, what
              the player plays, and the only thing a drag can set. The time
              beneath each is a label on them, never the measure itself. */}
          <div className="tl__ruler">
            {[0, 1, 2, 3, 4].map((tick) => {
              const bar = Math.round((shown.totalBars * tick) / 4);
              return (
                <span key={tick} style={{ left: `${tick * 25}%` }}>
                  {tick === 0 ? 'bar 1' : bar + (tick === 4 ? 0 : 1)}
                </span>
              );
            })}
          </div>

          {shownAxes.map((axis, axisRow) => (
            <Fragment key={axis.axis}>
              {/* Explicit coordinates, not auto-placement: the lines overlay
                  below is explicitly placed across column 2, and auto-placed
                  items refuse to share its cells — they cascaded into column
                  1, stacking the bars under the panels. Explicit items may
                  overlap, which is the whole point of an overlay. */}
              <div className="tl-axis__panel" style={{ gridRow: axisRow + 2 }}>
                {!isInherited(axis.axis) && (
                  <button
                    type="button"
                    title="Remove this axis"
                    onClick={() => apply(removeAxis(fragment, axis.axis))}
                  >
                    ×
                  </button>
                )}
                <strong className="tl-axis__name">{AXIS_LABELS[axis.axis]}</strong>
                {isInherited(axis.axis) && (
                  <>
                    <span className="muted">from the course</span>
                    <button
                      type="button"
                      title="Take a copy into this level, to change it here"
                      onClick={() => onAdopt?.(axis.axis)}
                    >
                      Override
                    </button>
                  </>
                )}
                {NUMERIC.includes(axis.axis) && !isInherited(axis.axis) && (
                  <NumericGenerator
                    axis={axis}
                    onGenerate={(divisions) =>
                      apply({
                        ...removeAxis(fragment, axis.axis),
                        axes: [
                          ...removeAxis(fragment, axis.axis).axes,
                          { axis: axis.axis, divisions },
                        ],
                      })
                    }
                  />
                )}
                {axis.axis === 'range' && !isInherited(axis.axis) && (
                  <RangeGenerator
                    fifths={previewFifths}
                    compass={compass}
                    onGenerate={(divisions) =>
                      apply({
                        ...removeAxis(fragment, 'range'),
                        axes: [
                          ...removeAxis(fragment, 'range').axes,
                          { axis: 'range', divisions },
                        ],
                      })
                    }
                  />
                )}
              </div>
              <div className="tl-axis__bar" style={{ gridRow: axisRow + 2 }}>
                <div className="tl-axis__line" />
                {/*
                 * A stage is a coloured rounded block spanning the bars its
                 * value is in force for — so it rolls across every boundary
                 * that is not its own, and its own left edge is the divider.
                 * The value, its spinner and the delete button live INSIDE
                 * the block (the player's ruling of 2026-08-29): a mark on a
                 * line with a label loose underneath read as two things,
                 * and the label had nowhere to sit on a narrow stage.
                 */}
                {axis.divisions.map((division, index) => {
                  const start = xOfAt(shown, division.at);
                  const nextDivision = axis.divisions[index + 1];
                  const end = nextDivision ? xOfAt(shown, nextDivision.at) : 1;
                  return (
                    <div
                      className={`tl-span ${index === 0 ? 'is-first' : ''} ${
                        isInherited(axis.axis) ? 'is-ghost' : ''
                      }`}
                      key={index}
                      style={{
                        left: `${start * 100}%`,
                        width: `${(end - start) * 100}%`,
                        ...stageTint(index),
                      }}
                    >
                      {index > 0 && !isInherited(axis.axis) && (
                        <DragHandle
                          onDrag={(fraction) => {
                            const drop = resolveBarDrag(
                              fragment,
                              layout,
                              axis.axis,
                              index,
                              fraction,
                            );
                            if (drop) setDrag({ axisId: axis.axis, index, ...drop });
                          }}
                          onCommit={() => {
                            if (drag) {
                              apply(
                                applyBarDrag(
                                  fragment,
                                  layout,
                                  drag.axisId,
                                  drag.index,
                                  drag,
                                  inherited.length === 0,
                                ),
                              );
                            }
                            setDrag(null);
                          }}
                          onCancel={() => setDrag(null)}
                        />
                      )}
                      <fieldset
                        className="tl-span__body"
                        disabled={isInherited(axis.axis)}
                      >
                        <DivisionValue
                          axisId={axis.axis}
                          value={division.value}
                          onChange={(value) =>
                            apply(setDivisionValue(fragment, axis.axis, index, value))
                          }
                          instrumentId={previewInstrument}
                          clef={previewClef}
                          fifths={previewFifths}
                        />
                        {index > 0 && !isInherited(axis.axis) && (
                          <button
                            type="button"
                            className="tl-span__delete"
                            title="Delete this division"
                            onClick={() => apply(deleteDivision(fragment, axis.axis, index))}
                          >
                            ×
                          </button>
                        )}
                      </fieldset>
                    </div>
                  );
                })}
                {!isInherited(axis.axis) && (
                <button
                  type="button"
                  className="tl-axis__add"
                  title="Add a division"
                  onClick={() => {
                    /* Into the longest stage, wearing the value this axis
                       already has in force there — a division that changes
                       nothing until the author edits it. The new stage takes
                       the level default, so the level grows by it, exactly
                       as deleting a stage shortens the level by its own. */
                    const at = insertAt(layout);
                    let inForce = axis.divisions[0].value;
                    for (const division of axis.divisions) {
                      if (division.at <= at) inForce = division.value;
                    }
                    apply(addDivision(fragment, axis.axis, at, inForce));
                  }}
                >
                  +
                </button>
                )}
              </div>
            </Fragment>
          ))}

          {showSegmentRules && (
          <div className="tl-rules__label" style={{ gridRow: shownAxes.length + 2 }}>
            Progression rules
            <span className="muted">per segment</span>
          </div>
          )}
          {showSegmentRules && (
          <div className="tl-rules__row" style={{ gridRow: shownAxes.length + 2 }}>
            {/*
             * Chips, not a cramped form: each segment shows its whole story
             * in one line — the bars its rule asks for, the score if any,
             * and what that costs in time, which is exactly the width the
             * chip is drawn at. Clicking opens a callout with room to edit;
             * the figures never have to fit inside a sliver segment again.
             */}
            {shown.segments.map((segment) => (
              <div
                className="tl-chipwrap"
                key={segment.at}
                style={{ flexGrow: Math.max(segment.x1 - segment.x0, 0.02), flexBasis: 0 }}
              >
                <button
                  type="button"
                  className={`tl-chip ${segment.authored ? 'is-authored' : 'is-default'}`}
                  title={
                    segment.authored
                      ? 'This segment’s own rule — click to edit'
                      : 'The level default — click to give this segment its own'
                  }
                  onClick={() =>
                    setOpenRuleAt(openRuleAt === segment.at ? null : segment.at)
                  }
                >
                  {segment.bars} {segment.bars === 1 ? 'bar' : 'bars'}
                  {segment.rule.score
                    ? ` · ${Math.round(segment.rule.score.atLeast * 100)}%/${segment.rule.score.overBars}`
                    : ''}
                  {' · ≈'}
                  {formatSeconds(segment.seconds)}
                </button>
                {openRuleAt === segment.at && (
                  <RuleCallout
                    segment={segment}
                    /* Anchored to whichever edge keeps it on the page: a
                       callout hanging off a late segment would open past
                       the right edge and take the scroller with it. */
                    alignRight={segment.x0 > 0.6}
                    onRoom={setCalloutRoom}
                    levelRule={levelRule}
                    onSet={(rule) => apply(setRule(fragment, segment.at, rule))}
                    onClear={() => {
                      apply(clearRule(fragment, segment.at));
                      setOpenRuleAt(null);
                    }}
                    onClose={() => setOpenRuleAt(null)}
                  />
                )}
              </div>
            ))}
          </div>
          )}

          {/*
           * The common timeline, made visible: a faint line through every
           * bar at every boundary (stronger where two axes share one), and
           * the drag guide over the lot. Painted last, over the grid,
           * pointer-transparent.
           */}
          <div
            className="tl__lines"
            style={{ gridRow: `2 / ${3 + shownAxes.length}` }}
            aria-hidden="true"
          >
            {shown.segments
              .filter((segment) => segment.at > 0)
              .map((segment) => {
                const holders = shownAxes.filter((axis) =>
                  axis.divisions.some(
                    (division) => Math.abs(division.at - segment.at) < 1e-9,
                  ),
                ).length;
                return (
                  <div
                    key={segment.at}
                    className={`tl__line ${holders > 1 ? 'is-shared' : ''}`}
                    style={{ left: `${segment.x0 * 100}%` }}
                  />
                );
              })}
            {drag && (
              <div
                className={`tl__guide ${drag.aligned ? 'is-snapped' : ''}`}
                style={{ left: `${drag.x * 100}%` }}
              />
            )}
          </div>
        </div>
      </div>

      <p className="muted tl__estimate-note">
        Widths are bars — the minimum each stage asks for, which is what dragging a divider
        sets. Times are what those bars take at the tempo in force
        {tempoAssumed ? `, assuming ${ASSUMED_TEMPO} bpm where the level names none` : ''}, on a
        clean run. Dragging moves bars across a divider and leaves the level the same length;
        editing a rule changes it.
      </p>

      <div className="tl-rules__default">
        <span>
          Progression rules — {showSegmentRules ? 'level' : 'course'} default:
          {ruleFromCourse && <span className="muted"> (from the course)</span>}
        </span>
        <label>
          after
          <input
            type="number"
            min={1}
            value={levelRule.minBars}
            onChange={(e) =>
              onPatch({
                rules: {
                  minBars: Math.max(1, Number(e.target.value)),
                  ...(levelRule.score ? { score: levelRule.score } : {}),
                },
              })
            }
          />
          bars
        </label>
        <label>
          , every one of the last
          <input
            type="number"
            min={1}
            value={levelRule.score?.overBars ?? ''}
            placeholder="n/a"
            onChange={(e) =>
              onPatch({
                rules: {
                  minBars: levelRule.minBars,
                  ...(e.target.value
                    ? {
                        score: {
                          atLeast: levelRule.score?.atLeast ?? 0.85,
                          overBars: Math.max(1, Number(e.target.value)),
                        },
                      }
                    : {}),
                },
              })
            }
          />
          bars at ≥
          <input
            type="number"
            min={1}
            max={100}
            value={levelRule.score ? Math.round(levelRule.score.atLeast * 100) : ''}
            placeholder="n/a"
            disabled={!levelRule.score}
            onChange={(e) =>
              onPatch({
                rules: {
                  minBars: levelRule.minBars,
                  score: {
                    atLeast: Math.min(1, Math.max(0.01, Number(e.target.value) / 100)),
                    overBars: levelRule.score?.overBars ?? 4,
                  },
                },
              })
            }
          />
          %
        </label>
      </div>

      <div className="tl__controls">
        <label>
          Add an axis
          <select
            value=""
            onChange={(e) => e.target.value && promote(e.target.value as AxisId)}
          >
            <option value="">choose…</option>
            {offered.map((axisId) => (
              <option key={axisId} value={axisId}>
                {AXIS_LABELS[axisId]}
                {pinnedValue(level, axisId) !== undefined ? ' — pinned; moving it here unpins' : ''}
              </option>
            ))}
          </select>
        </label>
        {(axes.some((a) => a.axis === 'range') || kind === 'phrases') && (
          <>
            <label>
              Preview instrument
              <select
                value={previewInstrument}
                onChange={(e) => setPreviewInstrument(e.target.value)}
              >
                {INSTRUMENTS.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Clef
              <select value={previewClef} onChange={(e) => setPreviewClef(e.target.value as Clef)}>
                <option value="treble">Treble</option>
                <option value="bass">Bass</option>
              </select>
            </label>
            <span className="muted">
              Preview only — a course is instrument-agnostic; the stave figures and the range
              generator walk this instrument, and nothing about it is saved.
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** The draggable notch a division hangs from. Pointer-captured, Escape cancels. */
function DragHandle({
  onDrag,
  onCommit,
  onCancel,
}: {
  onDrag: (fraction: number) => void;
  onCommit: () => void;
  onCancel: () => void;
}): ReactElement {
  const dragging = useRef(false);
  return (
    <button
      type="button"
      className="tl-handle"
      title="Drag to move this division"
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const bar = (e.target as HTMLElement).closest('.tl-axis__bar');
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        onDrag((e.clientX - rect.left) / rect.width);
      }}
      onPointerUp={() => {
        if (!dragging.current) return;
        dragging.current = false;
        onCommit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          dragging.current = false;
          onCancel();
        }
      }}
    >
      ‖
    </button>
  );
}

/** From | to | steps for the numeric axes, regenerating the whole sequence. */
function NumericGenerator({
  axis,
  onGenerate,
}: {
  axis: RawAxis;
  onGenerate: (divisions: RawAxis['divisions']) => void;
}): ReactElement {
  const first = Number(axis.divisions[0]?.value ?? 60);
  const last = Number(axis.divisions[axis.divisions.length - 1]?.value ?? first);
  const [from, setFrom] = useState(String(first));
  const [to, setTo] = useState(String(last));
  const [steps, setSteps] = useState(String(axis.divisions.length || 5));
  return (
    <div className="tl-gen">
      <label>
        from
        <input type="number" value={from} onChange={(e) => setFrom(e.target.value)} />
      </label>
      <label>
        to
        <input type="number" value={to} onChange={(e) => setTo(e.target.value)} />
      </label>
      <label>
        steps
        <input type="number" min={1} value={steps} onChange={(e) => setSteps(e.target.value)} />
      </label>
      <button
        type="button"
        onClick={() => onGenerate(numericDivisions(Number(from), Number(to), Number(steps)))}
      >
        Generate
      </button>
    </div>
  );
}

/** "Give me N steps from this anchor, biased up / down / both" — ruling 2. */
function RangeGenerator({
  fifths,
  compass,
  onGenerate,
}: {
  fifths: number;
  compass: readonly [number, number];
  onGenerate: (divisions: RawAxis['divisions']) => void;
}): ReactElement {
  const anchor = middleOctave(compass);
  const [low, setLow] = useState(String(anchor.low));
  const [high, setHigh] = useState(String(anchor.high));
  const [steps, setSteps] = useState('4');
  const [bias, setBias] = useState<'up' | 'down' | 'both'>('both');
  return (
    <div className="tl-gen">
      <label>
        low
        <input type="number" value={low} onChange={(e) => setLow(e.target.value)} />
      </label>
      <label>
        high
        <input type="number" value={high} onChange={(e) => setHigh(e.target.value)} />
      </label>
      <label>
        steps
        <input type="number" min={1} value={steps} onChange={(e) => setSteps(e.target.value)} />
      </label>
      <label>
        bias
        <select value={bias} onChange={(e) => setBias(e.target.value as typeof bias)}>
          <option value="both">both (down first)</option>
          <option value="up">up</option>
          <option value="down">down</option>
        </select>
      </label>
      <button
        type="button"
        onClick={() =>
          onGenerate(
            rangeDivisions({
              fifths,
              compass,
              anchor: { low: Number(low), high: Number(high) },
              steps: Number(steps),
              bias,
            }),
          )
        }
      >
        Generate
      </button>
    </div>
  );
}

/** One division's value, edited in the vocabulary its axis speaks. */
function DivisionValue({
  axisId,
  value,
  onChange,
  instrumentId,
  clef,
  fifths,
}: {
  axisId: AxisId;
  value: unknown;
  onChange: (value: unknown) => void;
  instrumentId: string;
  clef: Clef;
  fifths: number;
}): ReactElement {
  if (NUMERIC.includes(axisId)) {
    return (
      <input
        type="number"
        className="tl-value"
        value={typeof value === 'number' ? value : ''}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  if (axisId === 'fifths') {
    return (
      <select
        className="tl-value"
        value={typeof value === 'number' ? String(value) : '0'}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {MAJOR_KEYS.map((key) => (
          <option key={key.fifths} value={key.fifths}>
            {key.name}
          </option>
        ))}
      </select>
    );
  }
  if (axisId === 'span') {
    const chosen = typeof value === 'number' ? value : 12;
    const named = REACHES.some((reach) => reach.semitones === chosen);
    return (
      <select
        className="tl-value"
        value={String(chosen)}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {!named && <option value={chosen}>{chosen} semitones</option>}
        {REACHES.map((reach) => (
          <option key={reach.semitones} value={reach.semitones}>
            {reach.name}
          </option>
        ))}
      </select>
    );
  }
  if (axisId === 'register') {
    return (
      <EnumValue value={value} onChange={onChange} choices={['low', 'middle', 'high']} />
    );
  }
  if (axisId === 'metre') {
    const chosen = Array.isArray(value) ? `${value[0]}/${value[1]}` : '4/4';
    return (
      <select
        className="tl-value"
        value={chosen}
        onChange={(e) => onChange(e.target.value.split('/').map(Number))}
      >
        {OFFERED_METRES.map(([n, d]) => (
          <option key={`${n}/${d}`} value={`${n}/${d}`}>
            {n}/{d}
          </option>
        ))}
      </select>
    );
  }
  if (axisId === 'metronomeEnabled' || axisId === 'conductorEnabled') {
    return (
      <select
        className="tl-value"
        value={value === false ? 'off' : 'on'}
        onChange={(e) => onChange(e.target.value === 'on')}
      >
        <option value="on">on</option>
        <option value="off">off</option>
      </select>
    );
  }
  if (axisId === 'fingerings') {
    return <EnumValue value={value} onChange={onChange} choices={['always', 'trouble', 'never']} />;
  }
  if (axisId === 'playbackMode') {
    return <EnumValue value={value} onChange={onChange} choices={['reference', 'off']} />;
  }
  if (axisId === 'readingMode') {
    return <EnumValue value={value} onChange={onChange} choices={['scrolling', 'paged']} />;
  }
  if (axisId === 'range') {
    return (
      <RangeValue
        value={value}
        onChange={onChange}
        instrumentId={instrumentId}
        clef={clef}
        fifths={fifths}
      />
    );
  }
  return <IntervalPoolValue value={value} onChange={onChange} />;
}

function EnumValue({
  value,
  onChange,
  choices,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  choices: readonly string[];
}): ReactElement {
  return (
    <select
      className="tl-value"
      value={typeof value === 'string' && choices.includes(value) ? value : choices[0]}
      onChange={(e) => onChange(e.target.value)}
    >
      {choices.map((choice) => (
        <option key={choice} value={choice}>
          {choice}
        </option>
      ))}
    </select>
  );
}

/** A range division: the two bounds, and the little stave the settings screen draws. */
function RangeValue({
  value,
  onChange,
  instrumentId,
  clef,
  fifths,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  instrumentId: string;
  clef: Clef;
  fifths: number;
}): ReactElement {
  const range =
    typeof value === 'object' && value !== null
      ? (value as { low?: number; high?: number })
      : {};
  const low = typeof range.low === 'number' ? range.low : 60;
  const high = typeof range.high === 'number' ? range.high : 72;
  const instrument = instrumentById(instrumentId);
  const bound = (midi: number) => {
    const sounding = soundingFromWritten(midi, instrument, clef);
    const mask = primaryFingering(sounding, instrument)?.mask;
    return { writtenMidi: midi, fingering: mask === undefined ? '—' : formatMask(mask) };
  };
  return (
    <div className="tl-range">
      <StaveCanvas
        className="tl-range__figure"
        label={`Range ${low} to ${high}`}
        draw={(canvas, theme) =>
          drawRangeStave(canvas, { low: bound(low), high: bound(high), clef, fifths, theme })
        }
      />
      <div className="tl-range__bounds">
        <input
          type="number"
          value={low}
          title="Low bound, written MIDI"
          onChange={(e) => onChange({ low: Number(e.target.value), high })}
        />
        <input
          type="number"
          value={high}
          title="High bound, written MIDI"
          onChange={(e) => onChange({ low, high: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}

/** The interval pool: weighted intervals and the degree fence, per division. */
function IntervalPoolValue({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}): ReactElement {
  const pool =
    typeof value === 'object' && value !== null
      ? (value as { intervals?: Array<{ interval: number; weight: number }>; degrees?: number[] })
      : {};
  const intervals = Array.isArray(pool.intervals) ? pool.intervals : [{ interval: 2, weight: 1 }];
  const degrees = Array.isArray(pool.degrees) ? pool.degrees : undefined;
  const write = (
    nextIntervals: Array<{ interval: number; weight: number }>,
    nextDegrees: number[] | undefined,
  ) =>
    onChange({
      intervals: nextIntervals,
      ...(nextDegrees && nextDegrees.length ? { degrees: nextDegrees } : {}),
    });
  return (
    <div className="tl-pool">
      {intervals.map((entry, i) => (
        <span className="tl-pool__row" key={i}>
          <input
            type="number"
            min={1}
            title="Interval: 2 a second, 3 a third…"
            value={entry.interval}
            onChange={(e) =>
              write(
                intervals.map((x, j) =>
                  j === i ? { ...x, interval: Math.max(1, Number(e.target.value)) } : x,
                ),
                degrees,
              )
            }
          />
          ×
          <input
            type="number"
            min={1}
            title="Weight"
            value={entry.weight}
            onChange={(e) =>
              write(
                intervals.map((x, j) =>
                  j === i ? { ...x, weight: Math.max(1, Number(e.target.value)) } : x,
                ),
                degrees,
              )
            }
          />
          {intervals.length > 1 && (
            <button
              type="button"
              title="Remove"
              onClick={() => write(intervals.filter((_, j) => j !== i), degrees)}
            >
              ×
            </button>
          )}
        </span>
      ))}
      <button
        type="button"
        title="Another interval"
        onClick={() => write([...intervals, { interval: 3, weight: 1 }], degrees)}
      >
        +
      </button>
      <span className="tl-pool__degrees" title="Scale degrees the line may visit; none ticked means any">
        {[1, 2, 3, 4, 5, 6, 7].map((degree) => (
          <label key={degree}>
            <input
              type="checkbox"
              checked={degrees?.includes(degree) ?? false}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...(degrees ?? []), degree].sort((a, b) => a - b)
                  : (degrees ?? []).filter((d) => d !== degree);
                write(intervals, next.length ? next : undefined);
              }}
            />
            {degree}
          </label>
        ))}
      </span>
    </div>
  );
}

/**
 * The callout a rules chip opens: the whole rule with room to breathe, and
 * the price it puts on the segment — the player's answer to figures that
 * could never fit inside a sliver of the bar. Edits land live, like every
 * other control on the page; editing a default-ruled segment materialises
 * an override that starts as a copy of the default, so nothing changes but
 * what the author touched.
 */
function RuleCallout({
  segment,
  alignRight,
  onRoom,
  onSet,
  onClear,
  onClose,
}: {
  segment: SegmentLayout;
  alignRight?: boolean;
  /** Reports the room this callout needs below its chip, in pixels. */
  onRoom?: (pixels: number) => void;
  levelRule: SegmentRuleShape;
  onSet: (rule: SegmentRuleShape) => void;
  onClear: () => void;
  onClose: () => void;
}): ReactElement {
  const rule = segment.rule;

  /*
   * Measured before paint, and again whenever the callout changes shape —
   * ticking the score box adds a row and the first authored edit adds a
   * button, each of which would otherwise hang past the scroller's clip.
   */
  const self = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = self.current;
    if (!element || !onRoom) return;
    const report = () => onRoom(element.offsetHeight + GAP_BELOW_CHIP);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(element);
    return () => observer.disconnect();
  }, [onRoom]);

  return (
    <div
      ref={self}
      className={`tl-callout ${alignRight ? 'is-right' : ''}`}
      role="dialog"
      aria-label="Segment rule"
    >
      <div className="tl-callout__head">
        <strong>{segment.authored ? 'This segment’s own rule' : 'Level default in force'}</strong>
        <button type="button" title="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <label>
        needs
        <input
          type="number"
          min={1}
          value={rule.minBars}
          /* Through `fitRule`, so shortening a stage takes its score window
             down with it rather than leaving a window it cannot fill. */
          onChange={(e) => onSet(fitRule(rule, Math.max(1, Number(e.target.value))))}
        />
        bars played
      </label>
      <label className="tl-callout__check">
        <input
          type="checkbox"
          checked={rule.score !== undefined}
          onChange={(e) =>
            onSet({
              minBars: rule.minBars,
              // Never wider than the stage it is judging.
              ...(e.target.checked
                ? { score: { atLeast: 0.85, overBars: Math.min(4, rule.minBars) } }
                : {}),
            })
          }
        />
        and a score
      </label>
      {rule.score && (
        <label>
          every one of the last
          <input
            type="number"
            min={1}
            max={rule.minBars}
            title="At most the stage's own length — the window is filled by bars played in this stage"
            value={rule.score.overBars}
            onChange={(e) =>
              onSet({
                minBars: rule.minBars,
                score: {
                  ...rule.score!,
                  overBars: Math.min(rule.minBars, Math.max(1, Number(e.target.value))),
                },
              })
            }
          />
          of its {rule.minBars} {rule.minBars === 1 ? 'bar' : 'bars'} at ≥
          <input
            type="number"
            min={1}
            max={100}
            value={Math.round(rule.score.atLeast * 100)}
            onChange={(e) =>
              onSet({
                minBars: rule.minBars,
                score: {
                  ...rule.score!,
                  atLeast: Math.min(1, Math.max(0.01, Number(e.target.value) / 100)),
                },
              })
            }
          />
          %
        </label>
      )}
      <p className="muted">
        {segment.bars} {segment.bars === 1 ? 'bar' : 'bars'} from bar {segment.barStart + 1} · ≈
        {formatSeconds(segment.seconds)} at{' '}
        {segment.tempo} bpm{segment.assumedTempo ? ' (assumed)' : ''}
      </p>
      {segment.authored && (
        <button type="button" onClick={onClear}>
          Back to the level default
        </button>
      )}
    </div>
  );
}
