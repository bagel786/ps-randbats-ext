import { PossibleSetMatch } from './types';

export interface AbilityPrediction {
  name: string;
  confidence: 'certain' | 'guess';
}

// Pick a best-guess ability for an opponent whose ability hasn't been revealed.
// Randbats sets list a small number of candidate abilities per role; when the
// union across non-eliminated sets collapses to one, we know the ability for
// sure. Otherwise fall back to the first listed (Showdown lists abilities in
// declaration order, which roughly matches frequency in practice).
export function predictAbility(possibleSets: PossibleSetMatch[]): AbilityPrediction | null {
  const active = possibleSets.filter((s) => !s.eliminated);
  if (active.length === 0) return null;

  const union = new Set<string>();
  for (const set of active) for (const a of set.abilities) union.add(a);
  if (union.size === 0) return null;

  if (union.size === 1) {
    return { name: union.values().next().value as string, confidence: 'certain' };
  }
  // Multiple candidates — pick the first ability of the first non-eliminated
  // set as a heuristic. Good enough for most species (e.g. Great Tusk's only
  // listed ability is Protosynthesis anyway).
  return { name: active[0].abilities[0], confidence: 'guess' };
}
