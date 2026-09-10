import { PossibleSetMatch } from './types';

export interface ItemPrediction {
  name: string;
  confidence: 'certain' | 'guess';
}

// Rank items by expected damage impact for the move category being calc'd.
// Higher = more impactful, picked first when multiple sets disagree.
const RANK_PHYSICAL: Record<string, number> = {
  'Choice Band': 100,
  'Life Orb': 90,
  'Choice Scarf': 60,
  'Expert Belt': 50,
  'Black Glasses': 40, 'Charcoal': 40, 'Hard Stone': 40, 'Magnet': 40,
  'Metal Coat': 40, 'Miracle Seed': 40, 'Mystic Water': 40, 'Never-Melt Ice': 40,
  'Sharp Beak': 40, 'Soft Sand': 40, 'Spell Tag': 40,
};
const RANK_SPECIAL: Record<string, number> = {
  'Choice Specs': 100,
  'Life Orb': 90,
  'Choice Scarf': 60,
  'Expert Belt': 50,
  'Wise Glasses': 40,
};
const RANK_DEFAULT: Record<string, number> = {
  'Leftovers': 10,
  'Heavy-Duty Boots': 9,
  'Assault Vest': 8,
  'Rocky Helmet': 7,
};

function rankFor(item: string, category: 'Physical' | 'Special' | 'Status'): number {
  if (category === 'Physical' && item in RANK_PHYSICAL) return RANK_PHYSICAL[item];
  if (category === 'Special' && item in RANK_SPECIAL) return RANK_SPECIAL[item];
  return RANK_DEFAULT[item] ?? 1;
}

// Predict the opponent's item from the union of possible sets. If one item
// across all remaining sets, return it as 'certain'. If multiple candidates,
// pick the one most likely to affect the current calc (matching the move
// category for offensive items, else Leftovers tier).
export function predictItem(
  possibleSets: PossibleSetMatch[],
  category: 'Physical' | 'Special' | 'Status',
): ItemPrediction | null {
  const active = possibleSets.filter((s) => !s.eliminated);
  if (active.length === 0) return null;

  const union = new Set<string>();
  for (const set of active) for (const it of set.items) union.add(it);
  if (union.size === 0) return null;

  if (union.size === 1) {
    return { name: union.values().next().value as string, confidence: 'certain' };
  }
  let best = '';
  let bestRank = -1;
  for (const item of union) {
    const r = rankFor(item, category);
    if (r > bestRank) {
      bestRank = r;
      best = item;
    }
  }
  return { name: best, confidence: 'guess' };
}
