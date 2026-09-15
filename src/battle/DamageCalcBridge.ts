import { calculate, Field, Generations, Move, Pokemon, Side, toID } from '@smogon/calc';
import type { State } from '@smogon/calc';
import { BattleState, CalcResult, MyPokemon, RevealedPokemon } from './types';
import { predictAbility } from './abilityPrediction';
import { predictItem, describeItemPrediction } from './itemPrediction';
import { resolveSpeciesId } from './species';

const gen = Generations.get(9);

const RANDBATS_EVS = { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 } as const;
const RANDBATS_IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } as const;

type Weather = State.Field['weather'];
type Terrain = State.Field['terrain'];
type TypeName = NonNullable<State.Pokemon['teraType']>;
type Status = State.Pokemon['status'];

const STATUS_MAP: Record<string, Status> = {
  par: 'par', brn: 'brn', psn: 'psn', tox: 'tox', slp: 'slp', frz: 'frz',
};

function mapStatus(s: string | null): Status {
  return s ? STATUS_MAP[s] : undefined;
}

function mapWeather(w: string | null): Weather {
  switch (w) {
    case 'SunnyDay':       return 'Sun';
    case 'DesolateLand':   return 'Harsh Sunshine';
    case 'RainDance':      return 'Rain';
    case 'PrimordialSea':  return 'Heavy Rain';
    case 'Sandstorm':      return 'Sand';
    case 'Snow':           return 'Snow';
    case 'Hail':           return 'Snow';
    default:               return undefined;
  }
}

function mapTerrain(t: string | null): Terrain {
  switch (t) {
    case 'Electric': return 'Electric';
    case 'Grassy':   return 'Grassy';
    case 'Misty':    return 'Misty';
    case 'Psychic':  return 'Psychic';
    default:         return undefined;
  }
}

function koLabel(chance: number): string {
  if (chance >= 1)     return 'OHKO';
  if (chance >= 0.875) return '7/8 OHKO';
  if (chance >= 0.5)   return '~50% OHKO';
  if (chance > 0)      return `${Math.round(chance * 100)}% OHKO`;
  return 'No OHKO';
}

function formatBoost(stat: string, stage: number): string {
  const sign = stage > 0 ? '+' : '';
  return `${sign}${stage} ${stat}`;
}

function extractModifiers(
  attacker: Pokemon,
  defender: Pokemon,
  moveName: string,
  field: Field,
): string[] {
  const mods: string[] = [];
  const moveData = gen.moves.get(toID(moveName));
  const moveType = moveData?.type;
  const category = moveData?.category;

  const attackerTypes = attacker.teraType
    ? [attacker.teraType as string]
    : [...(attacker.types ?? [])];

  if (moveType && attackerTypes.includes(moveType)) mods.push('STAB');
  if (attacker.teraType) mods.push(`Tera ${String(attacker.teraType)}`);

  // Surface offensive/defensive boost stages so the user can see the calc is
  // honoring them. Only show the stage relevant to the move's category.
  if (category === 'Physical') {
    if (attacker.boosts.atk) mods.push(formatBoost('Atk', attacker.boosts.atk));
    if (defender.boosts.def) mods.push(formatBoost('Def', defender.boosts.def));
  } else if (category === 'Special') {
    if (attacker.boosts.spa) mods.push(formatBoost('SpA', attacker.boosts.spa));
    if (defender.boosts.spd) mods.push(formatBoost('SpD', defender.boosts.spd));
  }

  if (attacker.item) mods.push(String(attacker.item));
  if (field.weather) mods.push(String(field.weather));
  if (field.terrain) mods.push(`${String(field.terrain)} Terrain`);

  return mods;
}

function capitalizeType(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

// Some moves take their type from runtime context, not the dex entry. The
// underlying calc resolves these internally for damage, but our
// effectiveness badge has to redo the lookup or it stays on the static type.
function resolveMoveType(
  moveId: string,
  baseType: string,
  attacker: Pokemon,
  field: Field,
): string {
  if (moveId === 'weatherball') {
    const w = field.weather;
    if (w === 'Sun' || w === 'Harsh Sunshine') return 'Fire';
    if (w === 'Rain' || w === 'Heavy Rain') return 'Water';
    if (w === 'Sand') return 'Rock';
    if (w === 'Snow' || w === 'Hail') return 'Ice';
    return 'Normal';
  }
  if (moveId === 'terablast' && attacker.teraType) {
    return attacker.teraType as string;
  }
  if (moveId === 'revelationdance') {
    return (attacker.types?.[0] as string) ?? baseType;
  }
  if (moveId === 'aurawheel') {
    return attacker.species.id === ('morpekohangry' as typeof attacker.species.id) ? 'Dark' : 'Electric';
  }
  if (moveId === 'judgment') {
    // Arceus formes are separate species IDs (arceusbug, arceusfairy, ...);
    // plain "arceus" stays Normal. Fall back to the Plate item if we have it
    // (handles cases where the forme ID hasn't resolved cleanly).
    const id = attacker.species.id as string;
    const formeMatch = id.match(/^arceus(.+)$/);
    if (formeMatch) return capitalizeType(formeMatch[1]);
    const item = attacker.item as string | undefined;
    const itemMatch = item?.match(/^(\w+) Plate$/);
    if (itemMatch) return itemMatch[1];
  }
  if (moveId === 'multiattack') {
    const id = attacker.species.id as string;
    const formeMatch = id.match(/^silvally(.+)$/);
    if (formeMatch) return capitalizeType(formeMatch[1]);
    const item = attacker.item as string | undefined;
    const itemMatch = item?.match(/^(\w+) Memory$/);
    if (itemMatch) return itemMatch[1];
  }
  if (moveId === 'technoblast') {
    const id = attacker.species.id as string;
    if (id === 'genesectdouse') return 'Water';
    if (id === 'genesectshock') return 'Electric';
    if (id === 'genesectburn') return 'Fire';
    if (id === 'genesectchill') return 'Ice';
    const item = attacker.item as string | undefined;
    if (item === 'Douse Drive') return 'Water';
    if (item === 'Shock Drive') return 'Electric';
    if (item === 'Burn Drive') return 'Fire';
    if (item === 'Chill Drive') return 'Ice';
  }
  if (moveId === 'ivycudgel') {
    const id = attacker.species.id as string;
    if (id.startsWith('ogerponwellspring')) return 'Water';
    if (id.startsWith('ogerponhearthflame')) return 'Fire';
    if (id.startsWith('ogerponcornerstone')) return 'Rock';
  }
  if (moveId === 'ragingbullet') {
    const id = attacker.species.id as string;
    if (id === 'taurospaldeacombat') return 'Fighting';
    if (id === 'taurospaldeablaze') return 'Fire';
    if (id === 'taurospaldeaaqua') return 'Water';
  }
  return baseType;
}

/** Compute type-effectiveness multiplier of a move against a defender. */
function computeEffectiveness(
  moveName: string,
  attacker: Pokemon,
  defender: Pokemon,
  field: Field,
): number {
  const moveData = gen.moves.get(toID(moveName));
  if (!moveData || moveData.category === 'Status') return 1;
  const moveType = resolveMoveType(toID(moveName), moveData.type, attacker, field);

  // Tera type replaces both types defensively when terastallized
  const defTypes = defender.teraType
    ? [defender.teraType as string]
    : [...(defender.types ?? [])];

  // Type chart in @smogon/calc is indexed [attacker][defender], so we look up
  // the attacker entry once and multiply over each defender type.
  const atkTypeData = gen.types.get(toID(moveType));
  if (!atkTypeData) return 1;

  let mult = 1;
  for (const t of defTypes) {
    const eff = atkTypeData.effectiveness?.[t as keyof typeof atkTypeData.effectiveness];
    if (typeof eff === 'number') mult *= eff;
  }
  return mult;
}

const REGIONAL_FORME_PREFIX: Record<string, string> = {
  Alola: 'Alolan',
  Galar: 'Galarian',
  Hisui: 'Hisuian',
  Paldea: 'Paldean',
};

export function formatSpeciesName(speciesId: string): string {
  const canonical = gen.species.get(toID(resolveSpeciesId(speciesId)))?.name ?? speciesId;
  const m = canonical.match(/^(.+)-(Alola|Galar|Hisui|Paldea)$/);
  return m ? `${REGIONAL_FORME_PREFIX[m[2]]} ${m[1]}` : canonical;
}

function buildField(state: BattleState, attackerIsMe: boolean): Field {
  const mySide = state.playerSide ?? 'p1';
  const oppSide = mySide === 'p1' ? 'p2' : 'p1';
  const aSC = state.field[attackerIsMe ? mySide : oppSide];
  const dSC = state.field[attackerIsMe ? oppSide : mySide];
  // @smogon/calc doesn't model Trick Room — it only flips move order, not damage.
  return new Field({
    weather: mapWeather(state.field.weather),
    terrain: mapTerrain(state.field.terrain),
    isGravity: state.field.gravity,
    attackerSide: new Side({
      spikes: aSC.spikes,
      isSR: aSC.stealthRock,
      isReflect: aSC.reflect,
      isLightScreen: aSC.lightScreen,
      isAuroraVeil: aSC.auroraVeil,
      isTailwind: aSC.tailwind,
    }),
    defenderSide: new Side({
      spikes: dSC.spikes,
      isSR: dSC.stealthRock,
      isReflect: dSC.reflect,
      isLightScreen: dSC.lightScreen,
      isAuroraVeil: dSC.auroraVeil,
      isTailwind: dSC.tailwind,
    }),
  });
}

function runCalc(
  attacker: Pokemon,
  defender: Pokemon,
  moveName: string,
  field: Field,
  defenderHpPercent: number,
  notes: string[],
): CalcResult | null {
  try {
    const move = new Move(gen, moveName);
    const result = calculate(gen, attacker, defender, move, field);
    const effectiveness = computeEffectiveness(moveName, attacker, defender, field);

    // result.range() collapses the four damage shapes (fixed number, 16-roll
    // single-hit number[], fixed multi-hit number[] length<16 where each entry
    // is one hit, and true multi-hit number[][]) into a summed [min, max].
    const [minDmg, maxDmg] = result.range();
    if (move.category === 'Status') return null;

    const maxHp = result.defender.maxHP();
    const percentMin = Math.floor((minDmg / maxHp) * 100);
    const percentMax = Math.floor((maxDmg / maxHp) * 100);

    const currentHp = Math.floor(maxHp * defenderHpPercent / 100);

    // KO chance: for the standard single-hit 16-roll case, count rolls that
    // KO for a precise probability. For multi-hit or fixed damage, fall back
    // to a coarse bracket using the summed range, since each "entry" no
    // longer represents an equally-weighted damage roll.
    const raw = result.damage;
    if (Array.isArray(raw) && (Array.isArray(raw[0]) || raw.length !== 16)) notes.push('Multi-hit KO chance is approximate');
    let koChance: number;
    if (Array.isArray(raw) && raw.length === 16 && typeof raw[0] === 'number') {
      const rolls = raw as number[];
      koChance = rolls.filter((d) => d >= currentHp).length / 16;
    } else if (minDmg >= currentHp) {
      koChance = 1;
    } else if (maxDmg >= currentHp) {
      koChance = 0.5;
    } else {
      koChance = 0;
    }

    return {
      moveName,
      percentMin,
      percentMax,
      koChance,
      koLabel: koLabel(koChance),
      modifiers: extractModifiers(attacker, defender, moveName, field),
      notes,
      effectiveness: maxDmg === 0 ? 0 : effectiveness,
    };
  } catch (err) {
    console.warn('[PSExt/calc] failed for', moveName, err);
    return null;
  }
}

export function calcDamage(state: BattleState, moveName: string): CalcResult | null {
  const me = state.myTeam.find((p) => p.active);
  const opp = state.opponentActive;
  if (!me || !opp || me.hpPercent <= 0 || opp.hpPercent <= 0) return null;

  const notes: string[] = [];
  let abilityOverride: string | undefined;
  if (!opp.ability) {
    const pred = predictAbility(state.possibleSets);
    if (pred) {
      abilityOverride = pred.name;
      notes.push(`${pred.confidence === 'certain' ? 'predicted' : 'assumed'} ability: ${pred.name}`);
    } else {
      notes.push('ability unknown');
    }
  }
  let itemOverride: string | undefined;
  if (!opp.itemConfirmed && !opp.item) {
    const cat = gen.moves.get(toID(moveName))?.category ?? 'Status';
    const pred = predictItem(state.possibleSets, cat, opp.revealedMoves, opp.choiceConfirmed);
    if (pred) {
      itemOverride = pred.name;
      notes.push(describeItemPrediction(pred));
    } else {
      notes.push('item unknown');
    }
  }

  try {
    const attacker = buildMyPokemon(me);
    const defender = buildOpponentPokemon(opp, itemOverride, abilityOverride);
    const field = buildField(state, true);
    return runCalc(attacker, defender, moveName, field, opp.hpPercent, notes);
  } catch (err) {
    console.warn('[PSExt/calc] calcDamage failed', moveName, err);
    return null;
  }
}

/** Damage from the opponent's move against my active Pokemon. */
export function calcIncomingDamage(state: BattleState, moveName: string): CalcResult | null {
  const me = state.myTeam.find((p) => p.active);
  const opp = state.opponentActive;
  if (!me || !opp || me.hpPercent <= 0 || opp.hpPercent <= 0) return null;

  const notes: string[] = [];
  let abilityOverride: string | undefined;
  if (!opp.ability) {
    const pred = predictAbility(state.possibleSets);
    if (pred) {
      abilityOverride = pred.name;
      notes.push(`${pred.confidence === 'certain' ? 'predicted' : 'assumed'} ability: ${pred.name}`);
    } else {
      notes.push('opp ability unknown');
    }
  }

  let inferredItem: string | undefined;
  const moveCategory = gen.moves.get(toID(moveName))?.category ?? 'Status';
  if (!opp.itemConfirmed && !opp.item && !inferredItem) {
    const pred = predictItem(state.possibleSets, moveCategory, opp.revealedMoves, opp.choiceConfirmed);
    if (pred) {
      inferredItem = pred.name;
      notes.push(describeItemPrediction(pred));
    } else {
      notes.push('opp item unknown');
    }
  }

  try {
    const attacker = buildOpponentPokemon(opp, inferredItem, abilityOverride);
    const defender = buildMyPokemon(me);
    const field = buildField(state, false);
    return runCalc(attacker, defender, moveName, field, me.hpPercent, notes);
  } catch (err) {
    console.warn('[PSExt/calc] calcIncomingDamage failed', moveName, err);
    return null;
  }
}

function buildMyPokemon(me: MyPokemon): Pokemon {
  return new Pokemon(gen, resolveSpeciesId(me.species), {
    level: me.level,
    ability: me.ability || undefined,
    item: me.item || undefined,
    nature: me.nature,
    curHP: Math.max(1, Math.round(new Pokemon(gen, resolveSpeciesId(me.species), { level: me.level, evs: me.evs, ivs: me.ivs }).maxHP() * me.hpPercent / 100)),
    evs: me.evs,
    ivs: me.ivs,
    boosts: me.boosts,
    status: mapStatus(me.status),
    teraType: me.terastallized && me.teraType ? (me.teraType as TypeName) : undefined,
  });
}

function buildOpponentPokemon(
  opp: RevealedPokemon,
  itemOverride?: string,
  abilityOverride?: string,
): Pokemon {
  return new Pokemon(gen, resolveSpeciesId(opp.species), {
    level: opp.level,
    ability: opp.ability || abilityOverride || undefined,
    item: opp.itemConfirmed ? (opp.item ?? '') : (opp.item ?? itemOverride ?? ''),
    nature: 'Serious',
    curHP: Math.max(1, Math.round(new Pokemon(gen, resolveSpeciesId(opp.species), { level: opp.level, evs: RANDBATS_EVS, ivs: RANDBATS_IVS }).maxHP() * opp.hpPercent / 100)),
    evs: RANDBATS_EVS,
    ivs: RANDBATS_IVS,
    boosts: opp.boosts,
    status: mapStatus(opp.status),
    teraType: opp.terastallized && opp.teraType ? (opp.teraType as TypeName) : undefined,
  });
}
