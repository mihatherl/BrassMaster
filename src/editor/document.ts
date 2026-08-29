/**
 * A parsed course, written back out as a document — the editor's modernising
 * pass. Opening an old-format file (tempo bands, `advance`, `pinned`) runs it
 * through `readCourse`, whose read-forward turned those into the axes they
 * always meant, and this writes the result in today's format. The editor
 * saves new-format documents only; the app's reader keeps reading old ones
 * forever, so nothing on a phone is ever forced through this.
 *
 * The one cost, accepted: a field written by a *newer* editor than this one
 * would be shed here, where the phone's verbatim store would keep it. The
 * editor is an authoring tool and is by definition the newest thing in the
 * loop; the moment that stops being true, this note is the bug report.
 */

import type { Course, CourseLevel } from '../exercise/course';

function levelDocument(level: CourseLevel): Record<string, unknown> {
  return {
    id: level.id,
    name: level.name,
    ...(level.note ? { note: level.note } : {}),
    base: { ...level.base },
    ...(level.tempo !== undefined ? { tempo: level.tempo } : {}),
    ...(level.metronomeEnabled !== undefined ? { metronomeEnabled: level.metronomeEnabled } : {}),
    ...(level.conductorEnabled !== undefined ? { conductorEnabled: level.conductorEnabled } : {}),
    ...(level.fingerings !== undefined ? { fingerings: level.fingerings } : {}),
    ...(level.playbackMode !== undefined ? { playbackMode: level.playbackMode } : {}),
    ...(level.readingMode !== undefined ? { readingMode: level.readingMode } : {}),
    ...(level.axes?.length ? { axes: level.axes.map((axis) => ({ ...axis })) } : {}),
    ...(level.rules ? { rules: level.rules } : {}),
    ...(level.segmentRules?.length ? { segmentRules: level.segmentRules.map((r) => ({ ...r })) } : {}),
    ...(level.mastery ? { mastery: level.mastery } : {}),
    ...(level.endless ? { endless: true } : {}),
    // `segments` stays out: derived by every reader, never authored.
  };
}

export function documentOf(course: Course): Record<string, unknown> & {
  levels: Record<string, unknown>[];
} {
  return {
    id: course.id,
    name: course.name,
    blurb: course.blurb,
    schemaVersion: course.schemaVersion,
    ...(course.mastery ? { mastery: course.mastery } : {}),
    levels: course.levels.map(levelDocument),
  };
}
