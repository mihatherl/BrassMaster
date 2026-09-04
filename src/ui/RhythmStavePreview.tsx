/**
 * The engraved stave the rhythm tool and the cell editor both draw on —
 * extracted from the rhythm editor (2026-09-04) the day the cell editor
 * became its own sheet, so the two cannot drift: one preview, one hit
 * test, one drag.
 */

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  attackIndexByNote,
  inflectedNote,
  movedNote,
  previewExerciseFromBars,
  type CellNote,
} from '../exercise/rhythm';
import { t } from '../i18n';
import { formatPitch } from '../domain/pitch';
import { instrumentById, type Clef } from '../domain/instruments';
import { currentTheme, StaveRenderer } from '../render/surface';
import type { Exercise } from '../exercise/types';
import { Transport } from '../engine/clock';

/**
 * The editing highlights: amber, deliberately far from every colour the
 * play screen spends — the verdict green and red, the horizon grey, the
 * answer wash's blue — so a held note reads as "in hand", never as
 * judged. Hover is the same hue, paler.
 */
const EDIT_SELECTED = '#e8a33d';
const EDIT_HOVER = '#e8c98a';

/**
 * How near a touch must land to claim a note, in stave spaces — against
 * 3 for a mouse. On a phone EVERYTHING is near a note, and the wide
 * radius meant every touch anywhere on the sheet grabbed one and hauled
 * it through fifty ledger lines while the page refused to scroll (the
 * player, 2026-09-04, in the band hall). Tight for touch: a finger on a
 * note drags it; a finger anywhere else pans the sheet, which
 * `touch-action: pan-y` now permits.
 */
const TOUCH_RADIUS = 2;
const MOUSE_RADIUS = 3;

/**
 * The drawing, engraved — a static stave on one written C, ties and all,
 * with the count above it. The same suspended-transport trick the course
 * editor's tune preview proved: `StaveRenderer` wants a Transport for its
 * clock, so it gets one over a context that never starts.
 */
export function RhythmStavePreview({
  bars,
  metre,
  instrumentId,
  clef,
  notes,
  onNotes,
  fifths = 0,
  selected,
  onSelect,
}: {
  bars: readonly string[];
  metre: readonly [number, number];
  instrumentId: string;
  clef: Clef;
  /** The line, where this is a cell being written; absent draws the rhythm. */
  notes?: readonly CellNote[];
  onNotes?: (notes: CellNote[]) => void;
  /** The transcriber's lens: the key the line is drawn in. */
  fifths?: number;
  selected?: number | null;
  onSelect?: (index: number | null) => void;
}): ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<StaveRenderer | null>(null);
  const layout = useRef<ReturnType<StaveRenderer['noteLayout']> | null>(null);
  /**
   * Layout index → attack index. The renderer draws a notehead for every
   * sounded event, tie continuations included; the line holds one note
   * per attack. Selection, hover and the drag all speak in ATTACKS, so
   * every read off the layout goes through this map — without it, on a
   * tied rhythm each notehead past the first tie addressed the wrong
   * note (or none, and the drag silently died).
   */
  const attackOf = useMemo(() => attackIndexByNote(bars), [bars]);
  /**
   * Selection and hover live in refs read by the renderer's colour hook,
   * so a highlight change is one cheap `draw()` — never a rebuild, which
   * would mint an AudioContext per mouse movement.
   */
  const selectedRef = useRef<number | null>(selected ?? null);
  const hovered = useRef<number | null>(null);
  /**
   * A drag: which note, the pointer's y at the press, and the flat
   * degree it held then. Steps come from the pointer's own travel — the
   * stave rescales as notes climb into ledger lines, so a hit test read
   * mid-gesture moves under the hand (the fault of 2026-09-03).
   */
  const dragging = useRef<{ index: number; startY: number; startDegree: number; space: number } | null>(
    null,
  );
  /**
   * The canvas's height, in rems — grown to hold every system the piece
   * wants (the player, 2026-09-03: eight bars did not fit). The renderer
   * reports how many lines it planned; one correction converges, because
   * the line plan depends on width alone.
   */
  const [heightRem, setHeightRem] = useState(11);
  /**
   * The keyboard-style callout over a touch drag (the player,
   * 2026-09-04: *"it's really difficult to see when I'm dragging the
   * note to, under my finger"*): the note's written name, floated above
   * the fingertip like a phone keyboard's key preview. Touch only — a
   * mouse cursor hides nothing.
   */
  const [callout, setCallout] = useState<{ x: number; y: number; attack: number } | null>(null);
  /** The engraved exercise behind the picture, for the callout's name. */
  const exerciseRef = useRef<Exercise | null>(null);
  /**
   * Where the selected note sits on the page, for the accidental pair
   * that floats beside it (the player, 2026-09-04: *"two little buttons
   * nearby to make it a sharp or a flat"* — on a phone the nudge row is
   * a reach away from the note in hand). Held as state because the
   * layout lives in a ref the render cannot watch: both effects set it
   * from the freshly drawn layout.
   */
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const anchorFor = (attack: number | null): { x: number; y: number } | null => {
    const map = layout.current;
    if (attack === null || !map) return null;
    const noteIndex = attackIndexByNote(bars).findIndex((a) => a === attack);
    const drawn = map.notes.find((note) => note.index === noteIndex);
    return drawn ? { x: drawn.x, y: drawn.y } : null;
  };

  useEffect(() => {
    selectedRef.current = selected ?? null;
    renderer.current?.draw();
    setAnchor(anchorFor(selected ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const context = new AudioContext();
    void context.suspend();
    const exercise = previewExerciseFromBars(
      bars,
      metre,
      instrumentById(instrumentId),
      clef,
      notes,
      fifths,
    );
    const drawn = new StaveRenderer({
      canvas,
      exercise,
      transport: new Transport(context, 80),
      theme: currentTheme(),
      scrollSpeed: 0,
      readingMode: 'paged',
      // Width decides the stave, the plan decides the height, and the
      // canvas grows to hold it — never the reverse (see `fitContent`).
      fitContent: true,
      verdictFor: () => undefined,
      // The tool always shows the full picture: the count band shaded,
      // whatever the player's run option says (that option is the run's).
      beatTint: true,
      /* Editing colours, read per draw: the gesture outranks everything.
         Compared as attacks, so every notehead of a tied note lights
         together — they are one note, held. */
      noteColourFor: (index) =>
        attackOf[index] === selectedRef.current
          ? EDIT_SELECTED
          : attackOf[index] === hovered.current
            ? EDIT_HOVER
            : undefined,
    });
    drawn.draw();
    renderer.current = drawn;
    layout.current = drawn.noteLayout();
    exerciseRef.current = exercise;
    setAnchor(anchorFor(selectedRef.current));
    /* Grow to hold every line the piece wants, with headroom above the
       first and below the last. Shrink only when a bar leaves. */
    const wantRem = Math.max(
      11,
      (layout.current.systems * layout.current.systemHeight) / 16 + 3,
    );
    if (Math.abs(wantRem - heightRem) > 0.5) setHeightRem(wantRem);
    return () => {
      drawn.stop();
      renderer.current = null;
      void context.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, metre, instrumentId, clef, notes, fifths, heightRem]);

  /** The ATTACK nearest a page point, by distance, or null. */
  const hitAt = (clientX: number, clientY: number, radiusSpaces: number) => {
    const canvas = ref.current;
    const map = layout.current;
    if (!canvas || !notes) return null;
    if (!map || map.notes.length === 0) {
      // Undrawn (no 2D context — every test environment): the first note,
      // so the arrows stay reachable without a picture.
      return notes.length > 0 ? { index: 0, x: 0, y: 0, step: 0 } : null;
    }
    /*
     * The pointer is compared UNSCALED: the renderer's resize() applies
     * the devicePixelRatio as a canvas transform, so everything it draws
     * — and everything `noteLayout` reports — is already in CSS pixels,
     * the pointer's own unit. The first cut multiplied by
     * `canvas.width / rect.width` (the ratio), which was invisible at
     * ratio 1 and pushed every hit zone left of its note at any zoom or
     * HiDPI ratio, the error growing with x (the player, 2026-09-04:
     * *"I have to click some way to the left of the note"*).
     */
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const nearest = map.notes.reduce((best, note) =>
      Math.hypot(note.x - x, note.y - y) < Math.hypot(best.x - x, best.y - y) ? note : best,
    );
    if (Math.hypot(nearest.x - x, nearest.y - y) > map.staveSpace * radiusSpaces) return null;
    const attack = attackOf[nearest.index];
    return attack === undefined || attack >= notes.length ? null : { ...nearest, index: attack };
  };
  const radiusFor = (pointerType: string) =>
    pointerType === 'touch' ? TOUCH_RADIUS : MOUSE_RADIUS;
  const noteAt = (event: React.PointerEvent<HTMLCanvasElement>) =>
    hitAt(event.clientX, event.clientY, radiusFor(event.pointerType));

  /*
   * The claim: `touch-action: pan-y` lets a finger anywhere on the sheet
   * scroll it, and the browser would take a NOTE drag the same way —
   * cancelling our pointer events the moment the pan starts. So a touch
   * that lands ON a note is claimed here, in a non-passive listener
   * (React's synthetic events cannot preventDefault a scroll), and the
   * pointer events then drive the drag; a touch anywhere else is the
   * browser's, and the page moves under the finger as a page should.
   */
  const hitRef = useRef(hitAt);
  hitRef.current = hitAt;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !onNotes) return;
    const claim = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch && hitRef.current(touch.clientX, touch.clientY, TOUCH_RADIUS)) {
        event.preventDefault();
      }
    };
    canvas.addEventListener('touchstart', claim, { passive: false });
    return () => canvas.removeEventListener('touchstart', claim);
  }, [onNotes]);

  const moveTo = (index: number, steps: number) => {
    if (!onNotes || !notes || !notes[index]) return;
    onNotes(notes.map((note, i) => (i === index ? movedNote(note, steps) : note)));
  };

  /* What the callout names: the dragged attack's first notehead, spelled
     under the lens key — read from the engraved exercise itself, so the
     bubble and the page cannot disagree about a name. */
  const calloutText = (() => {
    if (!callout) return null;
    const exercise = exerciseRef.current;
    const noteIndex = attackOf.findIndex((attack) => attack === callout.attack);
    const pitch = exercise?.notes[noteIndex]?.pitch;
    return pitch ? formatPitch(pitch) : null;
  })();

  return (
    <div className="rhythm-editor__staveWrap">
      <canvas
        ref={ref}
        className={`rhythm-editor__stave ${onNotes ? 'is-editable' : ''}`}
        style={{ height: `${heightRem}rem` }}
        onPointerDown={(event) => {
          if (!onNotes || !notes) return;
          const hit = noteAt(event);
          onSelect?.(hit ? hit.index : null);
          if (!hit || !layout.current) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          const rect = event.currentTarget.getBoundingClientRect();
          dragging.current = {
            index: hit.index,
            startY: event.clientY - rect.top,
            startDegree: notes[hit.index].degree - 1 + (notes[hit.index].octave ?? 0) * 7,
            // Already CSS pixels — the renderer draws under a ratio
            // transform — so the pointer's travel divides it directly.
            space: layout.current.staveSpace,
          };
          if (event.pointerType === 'touch') {
            setCallout({
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              attack: hit.index,
            });
          }
        }}
        onPointerMove={(event) => {
          const drag = dragging.current;
          if (!drag) {
            if (!onNotes) return;
            // Hover, so the stave says which note the hand is over.
            const hit = noteAt(event);
            const index = hit ? hit.index : null;
            if (hovered.current !== index) {
              hovered.current = index;
              renderer.current?.draw();
            }
            return;
          }
          if (!onNotes || !notes || !notes[drag.index]) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.pointerType === 'touch') {
            setCallout({
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              attack: drag.index,
            });
          }
          const travelled = drag.startY - (event.clientY - rect.top);
          const steps = Math.round(travelled / (drag.space / 2));
          const current = notes[drag.index].degree - 1 + (notes[drag.index].octave ?? 0) * 7;
          const wanted = drag.startDegree + steps;
          if (wanted === current) return;
          moveTo(drag.index, wanted - current);
        }}
        onPointerUp={() => {
          dragging.current = null;
          setCallout(null);
        }}
        onPointerCancel={() => {
          // The browser took the gesture (a pan won): the drag ends where
          // the note stands, cleanly.
          dragging.current = null;
          setCallout(null);
        }}
        onPointerLeave={() => {
          if (hovered.current !== null) {
            hovered.current = null;
            renderer.current?.draw();
          }
        }}
      />
      {callout && calloutText && (
        <div
          className="rhythm-editor__callout"
          style={{ left: `${callout.x}px`, top: `${callout.y}px` }}
          aria-hidden="true"
        >
          {calloutText}
        </div>
      )}
      {/* The accidental pair, floated beside the note in hand (the
          player, 2026-09-04) — hidden while a touch drag is in flight,
          so it never jitters under the moving finger. The nudge row's
          own ♯/♭ remain; this pair is the same toggles within thumb's
          reach of the note they inflect. */}
      {onNotes && notes && selected != null && notes[selected] && anchor && !callout && (
        <div
          className="rhythm-editor__floats"
          style={{ left: `${anchor.x}px`, top: `${Math.max(30, anchor.y - 14)}px` }}
        >
          <button
            type="button"
            className={`rhythm-editor__float ${notes[selected].alter === 1 ? 'is-selected' : ''}`}
            aria-label={t('rhythm.sharp')}
            aria-pressed={notes[selected].alter === 1}
            onClick={() => onNotes(notes.map((n, i) => (i === selected ? inflectedNote(n, 1) : n)))}
          >
            ♯
          </button>
          <button
            type="button"
            className={`rhythm-editor__float ${notes[selected].alter === -1 ? 'is-selected' : ''}`}
            aria-label={t('rhythm.flat')}
            aria-pressed={notes[selected].alter === -1}
            onClick={() => onNotes(notes.map((n, i) => (i === selected ? inflectedNote(n, -1) : n)))}
          >
            ♭
          </button>
        </div>
      )}
    </div>
  );
}
