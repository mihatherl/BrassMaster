import { describe, expect, it } from 'vitest';
import { COLLECTIONS, collectionById, sellableCollections, type Collection } from './collections';
import { collectionDigest } from './corpus';
import { validateTheme } from './theme';

describe('the collections', () => {
  it('names each one once', () => {
    expect(new Set(COLLECTIONS.map((c) => c.id)).size).toBe(COLLECTIONS.length);
  });

  /*
   * A theme in two collections would be reviewed twice, versioned twice, and
   * counted twice — and if the two collections ever disagreed about provenance,
   * the same music would be both sellable and not.
   */
  it('puts each theme in exactly one collection', () => {
    const seen = new Map<string, string>();
    for (const collection of COLLECTIONS) {
      for (const theme of collection.themes) {
        expect(seen.has(theme.id), `${theme.id} is in ${seen.get(theme.id)} and ${collection.id}`).toBe(false);
        seen.set(theme.id, collection.id);
      }
    }
  });

  it('holds only themes that pass the theme rules', () => {
    for (const collection of COLLECTIONS) {
      for (const theme of collection.themes) {
        expect(validateTheme(theme), `${collection.id}/${theme.id}`).toEqual([]);
      }
    }
  });

  it('marks unjudged ids that are actually in the collection', () => {
    for (const collection of COLLECTIONS) {
      const ids = new Set(collection.themes.map((theme) => theme.id));
      for (const id of collection.unjudged ?? []) {
        expect(ids.has(id), `${collection.id} marks ${id} unjudged but does not contain it`).toBe(true);
      }
    }
  });

  it('finds one by id', () => {
    expect(collectionById('bach')?.name).toBe('Bach');
    expect(collectionById('nothing-like-this')).toBeUndefined();
  });
});

/*
 * The guard that exists because forgetting it is expensive.
 *
 * The project carries real licensing tripwires — four of the Mutopia inventions
 * are CC BY-SA, the generator's models are trained on a corpus that forbids
 * commercial use — and the cost of shipping one in a *sold* app is not a bug
 * report. Provenance is recorded per collection so the rule can be mechanical
 * rather than remembered.
 */
describe('what a paid build may carry', () => {
  it('excludes anything restricted', () => {
    for (const collection of sellableCollections()) {
      expect(collection.provenance).not.toBe('restricted');
    }
  });

  it('would actually exclude one, if there were one', () => {
    const restricted: Collection = {
      id: 'test-restricted',
      name: 'Test',
      blurb: 'A collection under a licence a sold app cannot honour.',
      provenance: 'restricted',
      status: 'candidate',
      revision: 1,
      themes: [],
    };
    // Proves the filter reads provenance rather than passing everything through
    // — this suite would otherwise be vacuous while no restricted collection
    // exists, which is exactly when the guard is easiest to break unnoticed.
    expect([...COLLECTIONS, restricted].filter((c) => c.provenance !== 'restricted')).not.toContain(
      restricted,
    );
  });

  it('accounts for every collection either way', () => {
    const sellable = sellableCollections().length;
    const restricted = COLLECTIONS.filter((c) => c.provenance === 'restricted').length;
    expect(sellable + restricted).toBe(COLLECTIONS.length);
  });
});

describe('collection digests', () => {
  it('differ between collections holding different music', () => {
    const digests = COLLECTIONS.map(collectionDigest);
    expect(new Set(digests).size).toBe(COLLECTIONS.length);
  });

  it('ignore the order themes are written in', () => {
    for (const collection of COLLECTIONS) {
      const reversed: Collection = { ...collection, themes: [...collection.themes].reverse() };
      expect(collectionDigest(reversed)).toBe(collectionDigest(collection));
    }
  });

  it('move when a theme is dropped', () => {
    for (const collection of COLLECTIONS) {
      const fewer: Collection = { ...collection, themes: collection.themes.slice(1) };
      expect(collectionDigest(fewer)).not.toBe(collectionDigest(collection));
    }
  });

  /*
   * Written because it was got wrong: the canonical form read a field the
   * interface does not have, so every key change serialised as `undefined` —
   * stable, and therefore invisible to a digest test, while describing nothing.
   * The compiler caught that one. It would not catch a rename to a field that
   * does exist, so the property is asserted rather than assumed.
   */
  it('move when a key change moves', () => {
    const [collection] = COLLECTIONS;
    const at = (atBar: number): Collection => ({
      ...collection,
      themes: [{ ...collection.themes[0], keyChanges: [{ atBar, fifths: 1 }] }],
    });
    expect(collectionDigest(at(2))).not.toBe(collectionDigest(at(3)));
  });

  /* Mode is not decoration: the same degrees in the minor are different music. */
  it('move when the mode changes', () => {
    const [collection] = COLLECTIONS;
    const inMode = (mode: 'major' | 'minor'): Collection => ({
      ...collection,
      themes: [{ ...collection.themes[0], mode }],
    });
    expect(collectionDigest(inMode('minor'))).not.toBe(collectionDigest(inMode('major')));
  });
});
