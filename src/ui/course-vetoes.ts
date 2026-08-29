/**
 * The sitting's transient vetoes: steps the player said Stay here at.
 *
 * Module scope on purpose — remounts must not forget a veto two bars later,
 * and storage would make permanent what the ruling says is neither: "it
 * isn't expensive for the user to reset it." Its own file so the component
 * module exports only a component (fast refresh's rule), and so the tests
 * can clear it between cases.
 */

import type { Position } from '../exercise/course';

const VETOED = new Set<string>();

function key(position: Position): string {
  return `${position.courseId}:${position.levelId}:${position.segment}`;
}

export function vetoStep(position: Position): void {
  VETOED.add(key(position));
}

export function isVetoed(position: Position): boolean {
  return VETOED.has(key(position));
}

export function clearVetoes(): void {
  VETOED.clear();
}
