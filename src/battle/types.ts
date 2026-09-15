export type Side = 'p1' | 'p2';

export interface StatBoosts {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  accuracy: number;
  evasion: number;
}

export interface SideConditions {
  stealthRock: boolean;
  spikes: number;
  toxicSpikes: number;
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  tailwind: boolean;
}

export interface FieldState {
  weather: string | null;
  terrain: string | null;
  trickRoom: boolean;
  gravity: boolean;
  p1: SideConditions;
  p2: SideConditions;
}

export interface RevealedPokemon {
  ident?: string;
  species: string;
  level: number;
  gender: string;
  hpPercent: number;
  status: string | null;
  boosts: StatBoosts;
  revealedMoves: string[];
  item: string | null;
  itemConfirmed: boolean;
  ability: string | null;
  teraType: string | null;
  terastallized: boolean;
  consecutiveSameMove: number;
  lastMove: string | null;
  choiceConfirmed: boolean;
  volatiles: string[];
}

export interface MyPokemon {
  battleForm?: string;
  ident?: string;
  species: string;
  level: number;
  ability: string;
  item: string;
  nature: string;
  evs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  moves: string[];
  boosts: StatBoosts;
  status: string | null;
  hpPercent: number;
  teraType: string | null;
  terastallized: boolean;
  active: boolean;
  baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  currentSpeed: number;
}

export interface ItemSample {
  item: string;
  moves: string[];
  count: number;
}

export interface PossibleSetMatch {
  itemSamples?: ItemSample[];
  role: string;
  movepool: string[];
  abilities: string[];
  teraTypes: string[];
  items: string[];
  eliminated: boolean;
  eliminatedReason: string | null;
}

export interface BattleState {
  playerSide: Side | null;
  turn: number;
  myTeam: MyPokemon[];
  opponentActive: RevealedPokemon | null;
  opponentSeen: RevealedPokemon[];
  field: FieldState;
  possibleSets: PossibleSetMatch[];
  illusionWarning: boolean;
}

export interface CalcResult {
  moveName: string;
  percentMin: number;
  percentMax: number;
  koChance: number;
  koLabel: string;
  modifiers: string[];
  notes: string[];
  /** Type effectiveness multiplier: 0, 0.25, 0.5, 1, 2, 4 */
  effectiveness: number;
}
