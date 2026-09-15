import { toID } from '@smogon/calc';
import { PossibleSetMatch } from './types';
export interface ItemPrediction {
  name: string;
  confidence: 'certain' | 'guess';
  sampleSize?: number;
  frequency?: number;
}
/** Conditional empirical item frequency, never a damage-maximizing guess.
 * Counts come from full Showdown teams. A sampled singleton is not certainty.
 * Empty item is valid (e.g. Acrobatics), distinct from no prediction.
 */
export function predictItem(
  possibleSets: PossibleSetMatch[],
  _category: 'Physical' | 'Special' | 'Status',
  revealedMoves: string[] = [],
  choiceConfirmed = false,
): ItemPrediction | null {
  const active = possibleSets.filter(s => !s.eliminated);
  const counts = new Map<string,number>();
  const moves = revealedMoves.map(toID);
  let sampled = false;
  for (const set of active) {
    if (set.itemSamples) {
      sampled = true;
      for (const sample of set.itemSamples) {
        if (!moves.every(m => sample.moves.includes(m))) continue;
        if (choiceConfirmed && !sample.item.startsWith('Choice ')) continue;
        counts.set(sample.item, (counts.get(sample.item) ?? 0) + sample.count);
      }
    }
  }
  if (sampled) {
    const total = [...counts.values()].reduce((a,b)=>a+b,0);
    // No matching sample is a coverage gap, not permission to pick a stronger item.
    if (!total) return null;
    const [name,count] = [...counts.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))[0];
    return {name, confidence:'guess', frequency:count/total, sampleSize:total};
  }
  // Legacy fixtures or data without frequencies: only a singleton is usable.
  const items = new Set(active.flatMap(s=>s.items).filter(i=>!choiceConfirmed || i.startsWith('Choice ')));
  return items.size === 1 ? {name:[...items][0],confidence:'guess'} : null;
}
export function describeItemPrediction(pred: ItemPrediction): string {
  const item = pred.name || 'no item';
  return pred.frequency === undefined ? `assumed item: ${item}`
    : `assumed item: ${item} (${Math.round(pred.frequency * 100)}% of ${pred.sampleSize} matching samples)`;
}
