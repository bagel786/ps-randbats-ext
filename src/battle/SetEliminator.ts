import { Generations, toID } from '@smogon/calc';
import setsJson from '../data/gen9-sets.json';
import { PossibleSetMatch } from './types';
import { toId } from './BattleStateTracker';

const gen = Generations.get(9);

// Cosmetic / alternate formes (e.g. Zarude-Dada, Maushold-Four, Sinistea-Antique)
// share their randbats movepool with the base species but get distinct IDs
// from toId(). Fall back to the dex's baseSpecies when the forme isn't keyed
// in gen9-sets.json directly.
function resolveSetsKey(speciesId: string): string | null {
  if ((setsJson as Record<string, unknown>)[speciesId]) return speciesId;
  const dexEntry = gen.species.get(toID(speciesId));
  const base = dexEntry?.baseSpecies;
  if (base) {
    const baseId = toID(base);
    if ((setsJson as Record<string, unknown>)[baseId]) return baseId;
  }
  return null;
}

interface RawSet {
  role: string;
  movepool: string[];
  abilities: string[];
  teraTypes: string[];
  items?: string[];
}

interface RawSpeciesData {
  level: number;
  sets: RawSet[];
}

const data = setsJson as Record<string, RawSpeciesData>;

export class SetEliminator {
  init(speciesId: string): PossibleSetMatch[] {
    const key = resolveSetsKey(speciesId);
    const species = key ? data[key] : undefined;
    if (!species) return [];

    return species.sets.map((set) => ({
      role: set.role,
      movepool: [...set.movepool],
      abilities: [...set.abilities],
      teraTypes: [...set.teraTypes],
      items: set.items ? [...set.items] : [],
      eliminated: false,
      eliminatedReason: null,
    }));
  }

  revealMove(sets: PossibleSetMatch[], moveId: string): PossibleSetMatch[] {
    const active = sets.filter((s) => !s.eliminated);
    if (active.length === 0) return sets;
    const anyMatch = active.some((s) => s.movepool.some((m) => toId(m) === moveId));
    if (!anyMatch) {
      console.debug('[PSExt/eliminator] move', moveId, 'matches no active sets — keeping all');
      return sets;
    }
    return sets.map((set) => {
      if (set.eliminated) return set;
      const inPool = set.movepool.some((m) => toId(m) === moveId);
      if (!inPool) {
        return { ...set, eliminated: true, eliminatedReason: `doesn't have ${moveId}` };
      }
      return set;
    });
  }

  revealAbility(sets: PossibleSetMatch[], ability: string): PossibleSetMatch[] {
    const abilityId = toId(ability);
    const active = sets.filter((s) => !s.eliminated);
    if (active.length === 0) return sets;
    const anyMatch = active.some((s) => s.abilities.some((a) => toId(a) === abilityId));
    if (!anyMatch) {
      console.debug('[PSExt/eliminator] ability', ability, 'matches no active sets — keeping all');
      return sets;
    }
    return sets.map((set) => {
      if (set.eliminated) return set;
      const matches = set.abilities.some((a) => toId(a) === abilityId);
      if (!matches) {
        return { ...set, eliminated: true, eliminatedReason: `ability ${ability} not in set` };
      }
      return set;
    });
  }

  revealTeraType(sets: PossibleSetMatch[], teraType: string): PossibleSetMatch[] {
    const active = sets.filter((s) => !s.eliminated);
    if (active.length === 0) return sets;
    const anyMatch = active.some((s) => s.teraTypes.includes(teraType));
    if (!anyMatch) {
      console.debug('[PSExt/eliminator] tera', teraType, 'matches no active sets — keeping all');
      return sets;
    }
    return sets.map((set) => {
      if (set.eliminated) return set;
      const matches = set.teraTypes.includes(teraType);
      if (!matches) {
        return { ...set, eliminated: true, eliminatedReason: `tera ${teraType} not in set` };
      }
      return set;
    });
  }

  /** Moves in the set that haven't been revealed yet */
  static stillPossibleMoves(set: PossibleSetMatch, revealedMoves: string[]): string[] {
    return set.movepool.filter((m) => !revealedMoves.includes(toId(m)));
  }
}
