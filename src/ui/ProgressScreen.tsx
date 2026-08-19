/**
 * What has improved, what has not, and what to work on.
 *
 * The visible half of the coach (`docs/roadmap.md` § 1.6), and the half that
 * makes the rest of it worth having: the skill model has been recording since
 * 1.1 and the sittings since 1.5, and neither was readable by the person they
 * were about.
 *
 * **It reports; it does not coach.** Nothing here changes a rung, sets a goal
 * or chooses material — it says what the history holds and leaves the player to
 * decide. A screen that both measured and prescribed would make it impossible
 * to tell a fact from an instruction.
 *
 * **It says "not enough yet" rather than filling space.** A weakness drawn from
 * three notes is not a weakness, it is noise with a percentage on it, and a
 * player told to work on their dotted quavers because of one bad bar would
 * rightly stop believing the next thing the app said. `MIN_ATTEMPTS_TO_JUDGE`
 * is what keeps that honest, and an empty report is the correct output for a
 * player who has just arrived.
 */

import { useMemo } from 'react';
import { describeSkill, type SkillDimension } from '../exercise/attributes';
import { loadSkills, weakestIn, type SkillStats } from '../storage/skills';
import { loadSessions, meanAccuracy, type Session } from '../storage/sessions';
import type { Clef } from '../domain/instruments';

interface ProgressScreenProps {
  instrumentId: string;
  clef: Clef;
  onBack: () => void;
}

/**
 * The dimensions worth putting in front of a player, and what to call them.
 *
 * Not every dimension the model records: `accidental` and `beat` have two
 * buckets each and read as a comparison rather than a weakness, so they are
 * shown as a pair below rather than ranked. `tempo` is left out entirely — the
 * ladder is already the thing that says whether speed is the problem.
 */
const RANKED: ReadonlyArray<{ dimension: SkillDimension; heading: string }> = [
  { dimension: 'rhythm', heading: 'Rhythms' },
  { dimension: 'interval', heading: 'Intervals' },
  { dimension: 'key', heading: 'Keys' },
];

/** A percentage, or a dash where there is not enough to say. */
function percent(value: number | null): string {
  return value === null ? '–' : `${Math.round(value * 100)}%`;
}

function Weakest({ stats, dimension, heading }: { stats: SkillStats } & (typeof RANKED)[number]) {
  const worst = weakestIn(stats, dimension, 3);
  if (worst.length === 0) return null;
  return (
    <section className="panel">
      <h2>{heading}</h2>
      <ul className="report__list">
        {worst.map(({ key, accuracy }) => (
          <li key={key} className="report__row">
            <span className="report__name">{describeSkill(key)}</span>
            <span className="report__bar" aria-hidden="true">
              <span style={{ width: `${Math.round(accuracy * 100)}%` }} />
            </span>
            <span className="report__value">{percent(accuracy)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function whenDay(at: number): string {
  return new Date(at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function ProgressScreen({ instrumentId, clef, onBack }: ProgressScreenProps) {
  const stats = useMemo(() => loadSkills(instrumentId, clef), [instrumentId, clef]);
  const sessions = useMemo(() => loadSessions(instrumentId, clef), [instrumentId, clef]);

  // Newest first: a report is read from the top, and the interesting sitting is
  // the last one rather than the first one ever played.
  const recent: Session[] = useMemo(() => [...sessions].reverse().slice(0, 8), [sessions]);
  const runs = sessions.reduce((total, session) => total + session.runs.length, 0);

  const anything = RANKED.some(({ dimension }) => weakestIn(stats, dimension, 1).length > 0);

  return (
    <div className="screen">
      <header className="masthead">
        <h1>Progress</h1>
      </header>

      {runs === 0 ? (
        <p className="practice__note">
          Nothing recorded yet. Play a few runs and this fills itself in.
        </p>
      ) : (
        <p className="practice__note">
          {runs} {runs === 1 ? 'run' : 'runs'} across {sessions.length}{' '}
          {sessions.length === 1 ? 'sitting' : 'sittings'}.
        </p>
      )}

      {recent.length > 0 && (
        <section className="panel">
          <h2>Recent sittings</h2>
          <ul className="report__list">
            {recent.map((session) => (
              <li key={session.startedAt} className="report__row">
                <span className="report__name">{whenDay(session.startedAt)}</span>
                <span className="report__bar" aria-hidden="true">
                  <span style={{ width: `${Math.round((meanAccuracy(session) ?? 0) * 100)}%` }} />
                </span>
                <span className="report__value">{percent(meanAccuracy(session))}</span>
              </li>
            ))}
          </ul>
          <p className="practice__note">
            The average of each sitting&rsquo;s runs, newest first.
          </p>
        </section>
      )}

      {anything ? (
        RANKED.map((entry) => <Weakest key={entry.dimension} stats={stats} {...entry} />)
      ) : runs > 0 ? (
        <p className="practice__note">
          Not enough yet to say what is weak — a few more runs and this will have something
          worth telling you.
        </p>
      ) : null}

      <button type="button" className="button button--quiet" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
