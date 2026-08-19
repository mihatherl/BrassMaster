/**
 * The two doors, given equal billing.
 *
 * The app opened straight onto the settings screen until teacher mode existed,
 * and that screen is still exactly where *Free play* leads — untouched, every
 * control where it was. What changed is that it is no longer the only way in.
 *
 * **Neither door is the poor relation** (`docs/roadmap.md` § 1.4). A guided
 * path that quietly became the only route to a control would take the app away
 * from the player who wants to choose their own key at their own tempo, which
 * is most of what it has ever been for.
 *
 * Paid-only, and reached only from the build that has teacher mode: the free
 * app has one door and opens on it, as it always did.
 */

interface HomeScreenProps {
  /** The course the player is part-way through, for the door's own summary. */
  practising: string;
  onPractice: () => void;
  onFreePlay: () => void;
}

export function HomeScreen({ practising, onPractice, onFreePlay }: HomeScreenProps) {
  return (
    <div className="screen">
      <header className="masthead">
        <h1>Brass Master</h1>
      </header>

      <button type="button" className="entry" onClick={onPractice}>
        <span className="entry__title">Practice</span>
        <span className="entry__detail">{practising}</span>
      </button>

      <button type="button" className="entry" onClick={onFreePlay}>
        <span className="entry__title">Free play</span>
        <span className="entry__detail">Choose the instrument, key, material and tempo yourself</span>
      </button>
    </div>
  );
}
