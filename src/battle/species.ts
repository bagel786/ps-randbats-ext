import { Generations, toID } from '@smogon/calc';

const gen = Generations.get(9);
// Explicit cosmetic aliases only. Never strip arbitrary suffixes: regional and
// battle forms can have different stats, types, or abilities.
const cosmetics: Record<string, string[]> = {
  minior: ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'],
  sawsbuck: ['spring', 'summer', 'autumn', 'winter'],
  deerling: ['spring', 'summer', 'autumn', 'winter'],
  tatsugiri: ['curly', 'droopy', 'stretchy'],
  maushold: ['four'],
  dudunsparce: ['threesegment'],
  squawkabilly: ['green', 'blue', 'yellow', 'white'],
  sinistea: ['antique'], polteageist: ['antique'],
  poltchageist: ['artisan'], sinistcha: ['masterpiece'],
  zarude: ['dada'], keldeo: ['resolute'],
  gastrodon: ['east', 'west'], shellos: ['east', 'west'],
  vivillon: ['fancy', 'pokeball'], florges: ['blue', 'orange', 'white', 'yellow'],
};
const aliases = new Map(Object.entries(cosmetics).flatMap(([base, forms]) => forms.map(form => [base + form, base] as const)));

export function resolveSpeciesId(raw: string): string {
  const id = toID(raw);
  const exact = gen.species.get(id);
  if (exact) return exact.name;
  const base = aliases.get(id);
  return base ? gen.species.get(toID(base))?.name ?? raw : raw;
}

export function cosmeticBase(raw: string): string {
  return aliases.get(toID(raw)) ?? toID(raw);
}

/** Identity family, never used as a damage-calculation species. */
export function speciesFamily(raw: string): string {
  const species = gen.species.get(toID(resolveSpeciesId(raw)));
  return toID(species?.baseSpecies ?? species?.name ?? raw);
}
