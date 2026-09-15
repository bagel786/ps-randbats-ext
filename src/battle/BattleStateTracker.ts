import { Generations, toID } from '@smogon/calc';
import {
  BattleState,
  FieldState,
  MyPokemon,
  RevealedPokemon,
  Side,
  SideConditions,
  StatBoosts,
} from './types';
import { SetEliminator } from './SetEliminator';
import { speciesFamily } from './species';

const gen9 = Generations.get(9);

export const toId = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

// `|request|` payloads carry item/ability as IDs ("choiceband", "intimidate"),
// but @smogon/calc's Pokemon constructor matches display names ("Choice Band",
// "Intimidate") and silently drops unknown values. Normalize here so the calc
// actually applies these modifiers.
function normalizeItemName(raw: string): string {
  if (!raw) return '';
  return gen9.items.get(toID(raw))?.name ?? raw;
}

function normalizeAbilityName(raw: string): string {
  if (!raw) return '';
  return gen9.abilities.get(toID(raw))?.name ?? raw;
}

function defaultBoosts(): StatBoosts {
  return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 };
}

function defaultSideConditions(): SideConditions {
  return {
    stealthRock: false,
    spikes: 0,
    toxicSpikes: 0,
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
  };
}

function defaultField(): FieldState {
  return {
    weather: null,
    terrain: null,
    trickRoom: false,
    gravity: false,
    p1: defaultSideConditions(),
    p2: defaultSideConditions(),
  };
}

function defaultRevealedPokemon(species: string, level: number, gender: string): RevealedPokemon {
  return {
    species,
    level,
    gender,
    hpPercent: 100,
    status: null,
    boosts: defaultBoosts(),
    revealedMoves: [],
    item: null,
    itemConfirmed: false,
    ability: null,
    teraType: null,
    terastallized: false,
    consecutiveSameMove: 0,
    lastMove: null,
    choiceConfirmed: false,
    volatiles: [],
  };
}

function defaultState(): BattleState {
  return {
    playerSide: null,
    turn: 0,
    myTeam: [],
    opponentActive: null,
    opponentSeen: [],
    field: defaultField(),
    possibleSets: [],
    illusionWarning: false,
  };
}

// Parses "p2a: Charizard" → { side: 'p2', label: 'p2a', species: 'charizard' }
function parsePokemonId(pokeId: string): { side: Side; species: string } {
  const sideMatch = pokeId.match(/^(p[12])/);
  const side: Side = (sideMatch?.[1] ?? 'p1') as Side;
  const namePart = pokeId.split(': ')[1] ?? '';
  return { side, species: toId(namePart) };
}

// Parses details string "Charizard, L85, M" → { species, level, gender }
function parseDetails(details: string): { species: string; level: number; gender: string } {
  const tokens = details.split(', ').map((t) => t.trim());
  const species = toId(tokens[0] ?? '');
  const levelMatch = details.match(/L(\d+)/);
  const level = levelMatch ? parseInt(levelMatch[1]) : 100;
  const gender = tokens.includes('M') ? 'M' : tokens.includes('F') ? 'F' : 'N';
  return { species, level, gender };
}

// Parse [from] item/ability and optional [of] tags from a protocol line
function parseFromTag(line: string): { kind: 'item' | 'ability' | 'move'; name: string; of?: string; ofSide?: Side } | null {
  const fromMatch = line.match(/\[from\] (item|ability|move): ([^|[\]]+)/);
  const ofMatch = line.match(/\[of\] ([^|[\]]+)/);
  if (!fromMatch) return null;
  return {
    kind: fromMatch[1] as 'item' | 'ability' | 'move',
    name: fromMatch[2].trim(),
    of: ofMatch ? parsePokemonId(ofMatch[1].trim()).species : undefined,
    ofSide: ofMatch ? parsePokemonId(ofMatch[1].trim()).side : undefined,
  };
}

// Verbs we intentionally ignore — chat, internal, or purely cosmetic.
const IGNORED_VERBS = new Set([
  '', 'init', 'title', 'gametype', 'gen', 'tier', 'rated', 'rule',
  'clearpoke', 'poke', 'teampreview', 'teamsize', 'player', 'start',
  'upkeep', 'message', 'c', 'chat', 'j', 'l', 'n', 'b', 'J', 'L', 'N',
  'B', 'inactive', 'inactiveoff', 'raw', 'html', 'uhtml', 'uhtmlchange',
  'seed', 'split', 't:', 'expire', 'callback', 'choice', 'error', 'debug',
  // Lobby / account-level traffic that hits the same channel.
  'updateuser', 'updatesearch', 'updatechallenges', 'formats', 'challstr',
  'queryresponse', 'pm', 'usercount', 'nametaken', 'noinit', 'popup',
  '-message', '-hint', '-center',
  '-combine', '-waiting', '-prepare', '-mustrecharge', '-nothing', '-fail',
  '-block', '-notarget', '-miss', '-immune', '-resisted', '-supereffective',
  '-crit', '-hitcount', '-anim', '-singleturn', '-singlemove', '-activate',
  '-end', '-start', '-mega', '-zpower', '-zbroken', '-burst', '-ohko',
  '-recoil', '-drag', '-fieldactivate', '-clearpositiveboost',
  '-clearnegativeboost', '-copyboost', '-invertboost', '-swapboost',
  '-transform', '-formeChange', '-clearboost', '-status', '-curestatus',
  '-cureteam', '-sethp',
]);

export class BattleStateTracker extends EventTarget {
  state: BattleState = defaultState();

  private eliminator = new SetEliminator();
  private pendingLines: string[] = [];
  private warnedVerbs = new Set<string>();

  reset(): void {
    this.pendingLines = [];
    this.state = defaultState();
    this.eliminator = new SetEliminator();
  }

  processLine(line: string): void {
    if (!line.startsWith('|')) return;
    const parts = line.split('|');
    const type = parts[1];
    if (this.state.playerSide === null && !['request', 'init', 'win', 'tie', 'deinit'].includes(type)) {
      if (this.pendingLines.length < 10000) this.pendingLines.push(line);
      return;
    }

    switch (type) {
      case 'init':
        if (parts[2] === 'battle') this.reset();
        break;
      case 'win':
      case 'tie':
      case 'deinit':
        // Battle is over (loss, win, forfeit) or the room was closed —
        // clear state so the sidebar doesn't keep showing the last opp.
        this.reset();
        break;
      case 'request':      this.handleRequest(parts); break;
      case 'switch':
      case 'drag':         this.handleSwitch(parts); break;
      case 'replace':      this.handleReplace(parts); break;
      case 'move':         this.handleMove(parts, line); break;
      case 'cant':         this.handleCant(parts); break;
      case '-item':        this.handleItem(parts); break;
      case '-enditem':     this.handleEndItem(parts); break;
      case '-ability':     this.handleAbility(parts); break;
      case '-damage':
      case '-heal':        this.handleDamageHeal(parts, line); break;
      case '-sethp':
        this.handleDamageHeal(['', '-heal', parts[2], parts[3]], '');
        if (parts[4]?.startsWith('p')) this.handleDamageHeal(['', '-heal', parts[4], parts[5]], '');
        break;
      case '-status':      this.handleStatus(parts); break;
      case '-curestatus':  this.handleCureStatus(parts); break;
      case '-boost':       this.handleBoost(parts, 1); break;
      case '-unboost':     this.handleBoost(parts, -1); break;
      case '-setboost':    this.handleSetBoost(parts); break;
      case '-clearboost':  this.handleClearBoost(parts); break;
      case '-clearpositiveboost':
      case '-clearnegativeboost':
      case '-invertboost':
      case '-copyboost':
      case '-swapboost': this.handleBoostOperation(parts); break;
      case '-clearallboost': this.handleClearAllBoost(); break;
      case '-terastallize': this.handleTera(parts); break;
      case '-weather':     this.handleWeather(parts); break;
      case '-fieldstart':  this.handleFieldStart(parts); break;
      case '-fieldend':    this.handleFieldEnd(parts); break;
      case '-sidestart':   this.handleSideStart(parts); break;
      case '-sideend':     this.handleSideEnd(parts); break;
      case 'detailschange':
      case '-formechange': this.handleFormeChange(parts); break;
      case 'faint':        this.handleFaint(parts); break;
      case 'turn':         this.handleTurn(parts); break;
      default:
        if (type && !IGNORED_VERBS.has(type) && !this.warnedVerbs.has(type)) {
          this.warnedVerbs.add(type);
          console.warn('[PSExt/tracker] unrecognised protocol verb:', type);
        }
    }

    this.dispatchEvent(new CustomEvent('stateChange', { detail: structuredClone(this.state) }));
  }

  private handleRequest(parts: string[]): void {
    const json = parts.slice(2).join('|');
    if (!json) return;
    try {
      const req = JSON.parse(json);
      if (req.side) {
        const wasUnknown = this.state.playerSide === null;
        this.state.playerSide = req.side.id as Side;

        // PS re-sends |request| every turn. The payload has HP, item, moves,
        // and active flag — but never boost stages or tera state, which only
        // arrive via |-boost|/|-terastallize|. Preserve those from the
        // previous myTeam entry (keyed by species) so a Bulk Up doesn't get
        // wiped on the next turn.
        const prev = new Map(this.state.myTeam.map((p) => [p.ident ?? p.species, p]));

        this.state.myTeam = (req.side.pokemon as Record<string, unknown>[]).map((p) => {
          const details = parseDetails((p['details'] as string) ?? '');
          const stats = p['stats'] as Record<string, number> | undefined;
          const item = normalizeItemName((p['item'] as string) ?? '');
          const carryover = prev.get((p['ident'] as string) ?? details.species);
          const ability = normalizeAbilityName((p['ability'] as string) ?? carryover?.ability ?? (p['baseAbility'] as string) ?? '');
          const nature = (p['nature'] as string) ?? 'Serious';
          const moves = (p['moves'] as string[]) ?? [];
          const active = !!(p['active'] as boolean);
          const hpStr = (p['condition'] as string) ?? '100/100';
          const hpPercent = this.parseHpPercent(hpStr);

          return {
            ident: p['ident'] as string | undefined,
            species: active && carryover?.battleForm ? carryover.battleForm : details.species,
            battleForm: active ? carryover?.battleForm : undefined,
            level: details.level,
            ability,
            item,
            nature,
            evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            moves,
            boosts: carryover?.boosts ?? defaultBoosts(),
            status: hpStr.match(/\b(par|brn|psn|tox|slp|frz)\b/)?.[1] ?? null,
            hpPercent,
            teraType: (p['terastallized'] as string) || (p['teraType'] as string) || carryover?.teraType || null,
            terastallized: p['terastallized'] !== undefined ? !!p['terastallized'] : (carryover?.terastallized ?? false),
            active,
            baseStats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            currentSpeed: stats?.['spe'] ?? 0,
          } satisfies MyPokemon;
        });

        if (wasUnknown) {
          const pending = this.pendingLines;
          this.pendingLines = [];
          for (const line of pending) this.processLine(line);
        }
      }
    } catch {
      // Malformed request JSON — ignore
    }
  }

  private handleSwitch(parts: string[]): void {
    // Species must come from `details` (e.g. "Slowbro-Galar"), not the
    // position-prefixed nickname (e.g. "p2a: Slowbro"). Otherwise forme'd
    // mons get a base-species ID that won't match myTeam during reconcile.
    const { side } = parsePokemonId(parts[2] ?? '');
    const ident = (parts[2] ?? '').replace(/^(p[12])[a-z]:/, '$1:');
    const { species, level, gender } = parseDetails(parts[3] ?? '');
    const hpStr = parts[4] ?? '100/100';
    const hpPercent = this.parseHpPercent(hpStr);
    const status = hpStr.match(/\b(par|brn|psn|tox|slp|frz)\b/)?.[1] ?? null;

    if (side === this.state.playerSide) {
      const me = this.state.myTeam.find(p => p.ident === ident) ?? this.state.myTeam.find(p => speciesFamily(p.species) === speciesFamily(species));
      this.state.myTeam.forEach(p => { p.active = p === me; });
      if (me) {
        me.species = species;
        me.battleForm = undefined;
        me.hpPercent = hpPercent;
        me.status = status;
        me.boosts = defaultBoosts();
      }
    } else {
      // Opponent switch
      const existing = this.state.opponentSeen.find(p => speciesFamily(p.species) === speciesFamily(species) && (!p.ident || p.ident === ident));
      let active: RevealedPokemon;
      if (existing) {
        existing.hpPercent = hpPercent;
        existing.boosts = defaultBoosts();
        active = existing;
      } else {
        active = defaultRevealedPokemon(species, level, gender);
        active.hpPercent = hpPercent;
        this.state.opponentSeen.push(active);
      }
      active.ident = ident;
      active.species = species;
      active.status = status;
      active.lastMove = null;
      active.consecutiveSameMove = 0;
      active.volatiles = [];
      this.state.opponentActive = active;
      // Re-init then replay everything we already know about this mon
      let sets = this.eliminator.init(species);
      for (const moveId of active.revealedMoves) sets = this.eliminator.revealMove(sets, moveId);
      if (active.ability) sets = this.eliminator.revealAbility(sets, active.ability);
      if (active.terastallized && active.teraType) sets = this.eliminator.revealTeraType(sets, active.teraType);
      this.state.possibleSets = sets;
      this.state.illusionWarning = false;
    }
  }

  private handleReplace(parts: string[]): void {
    // Illusion broke — everything about the previous slot is wrong
    const { side } = parsePokemonId(parts[2] ?? '');
    const { species, level, gender } = parseDetails(parts[3] ?? '');
    const hpStr = parts[4] ?? '100/100';
    const hpPercent = this.parseHpPercent(hpStr);

    if (side !== this.state.playerSide) {
      const pokemon = defaultRevealedPokemon(species, level, gender);
      pokemon.hpPercent = hpPercent;
      // Remove the fake entry if present
      this.state.opponentSeen = this.state.opponentSeen.filter((p) => p !== this.state.opponentActive);
      this.state.opponentSeen.push(pokemon);
      this.state.opponentActive = pokemon;
      this.state.possibleSets = this.eliminator.init(species);
      this.state.illusionWarning = true;
    }
  }

  private handleMove(parts: string[], line: string): void {
    if (this.state.playerSide === null) return;
    const { side } = parsePokemonId(parts[2] ?? '');
    const moveName = parts[3] ?? '';
    const moveId = toId(moveName);

    if (side !== this.state.playerSide && this.state.opponentActive) {
      const opp = this.state.opponentActive;
      if (!opp.revealedMoves.includes(moveId)) {
        opp.revealedMoves.push(moveId);
        this.state.possibleSets = this.eliminator.revealMove(this.state.possibleSets, moveId);
        // A randbats set has exactly 4 moves — a 5th distinct move means the
        // species is wrong (Zoroark/Zorua illusion).
        if (opp.revealedMoves.length > 4) this.state.illusionWarning = true;
      }

      // Track consecutive same move for choice inference, but skip locked
      // moves like Outrage/Petal Dance which aren't choice-locked.
      const lockedMove = /\[from\]\s*lockedmove/.test(line);
      if (!lockedMove) {
        if (opp.lastMove === moveId) {
          opp.consecutiveSameMove++;
        } else {
          opp.consecutiveSameMove = 1;
          opp.lastMove = moveId;
        }
      }
    }
  }

  private handleCant(parts: string[]): void {
    // |cant|POKEMON|REASON|MOVE
    const { side } = parsePokemonId(parts[2] ?? '');
    const reason = parts[3] ?? '';

    if (side !== this.state.playerSide && reason === 'choicelock' && this.state.opponentActive) {
      this.state.opponentActive.choiceConfirmed = true;
      // Infer Choice Band vs Specs from revealed move types (handled in UI)
    }
  }

  private handleItem(parts: string[]): void {
    // |-item|POKEMON|ITEM|[from] ability: X|[of] OTHER
    if (this.state.playerSide === null) return;

    const fullLine = parts.join('|');
    const { side } = parsePokemonId(parts[2] ?? '');
    const item = normalizeItemName(parts[3] ?? '');

    if (side !== this.state.playerSide && this.state.opponentActive) {
      this.state.opponentActive.item = item;
      this.state.opponentActive.itemConfirmed = true;
    } else if (side === this.state.playerSide) {
      const me = this.state.myTeam.find(p => p.active);
      if (me) me.item = item;
    }

    // If [from] ability: X with [of] OTHER, OTHER's ability is X.
    // e.g. Clefable's Life Orb revealed by Furret's Frisk reveals Furret has Frisk.
    const fromTag = parseFromTag(fullLine);
    if (fromTag?.kind === 'ability' && fromTag.of) {
      const opp = fromTag.ofSide !== this.state.playerSide ? this.state.opponentActive : null;
      if (opp && !opp.ability) {
        const abilityName = normalizeAbilityName(fromTag.name);
        opp.ability = abilityName;
        if (this.state.opponentActive === opp) {
          this.state.possibleSets = this.eliminator.revealAbility(
            this.state.possibleSets,
            abilityName,
          );
        }
      }
    }
  }

  private handleEndItem(parts: string[]): void {
    // |-enditem|POKEMON|ITEM — item was consumed/removed. We *know* they
    // have nothing now — record null + confirmed so the calc bridge stops
    // applying the item's modifier.
    if (this.state.playerSide === null) return;
    const { side } = parsePokemonId(parts[2] ?? '');
    if (side !== this.state.playerSide && this.state.opponentActive) {
      this.state.opponentActive.item = null;
      this.state.opponentActive.itemConfirmed = true;
      this.state.opponentActive.choiceConfirmed = false;
    } else {
      const me = this.state.myTeam.find(p => p.active);
      if (me) me.item = '';
    }
  }

  private handleAbility(parts: string[]): void {
    // |-ability|POKEMON|ABILITY[|MODIFIER or |[from] ...]
    // Wait until we know which side we are, otherwise we may misattribute.
    if (this.state.playerSide === null) return;

    const fullLine = parts.join('|');
    const { side } = parsePokemonId(parts[2] ?? '');
    const ability = normalizeAbilityName(parts[3] ?? '');

    // [from] cases are special: Trace copies an ability, Skill Swap exchanges
    // them, etc. The POKEMON in the message now has ABILITY but its NATIVE
    // ability is something else (often what's in [from]). These would
    // mis-eliminate sets, so skip the elimination path here.
    const fromTag = parseFromTag(fullLine);
    if (fromTag) {
      if (side === this.state.playerSide) {
        const me = this.state.myTeam.find(p => p.active);
        if (me) me.ability = ability;
      } else if (this.state.opponentActive) this.state.opponentActive.ability = ability;
      // Trace: opponent now has the copied ability — record but don't eliminate
      if (side !== this.state.playerSide && this.state.opponentActive) {
        // If they Traced something, we know their original ability is Trace
        if (fromTag.kind === 'ability' && toId(fromTag.name) === 'trace') {
          this.state.opponentActive.ability = ability;
          this.state.possibleSets = this.eliminator.revealAbility(this.state.possibleSets, 'Trace');
        }
      }
      return;
    }

    if (side === this.state.playerSide) {
      const me = this.state.myTeam.find(p => p.active);
      if (me) me.ability = ability;
    }
    if (side !== this.state.playerSide && this.state.opponentActive) {
      this.state.opponentActive.ability = ability;
      this.state.possibleSets = this.eliminator.revealAbility(this.state.possibleSets, ability);
    }
  }

  private handleDamageHeal(parts: string[], line: string): void {
    if (this.state.playerSide === null) return;
    const { side } = parsePokemonId(parts[2] ?? '');
    const hpStr = parts[3] ?? '';
    const hpPercent = this.parseHpPercent(hpStr);

    // Update HP
    if (side === this.state.playerSide) {
      const me = this.state.myTeam.find((p) => p.active);
      if (me) me.hpPercent = hpPercent;
    } else if (this.state.opponentActive) {
      this.state.opponentActive.hpPercent = hpPercent;
    }

    // Parse [from] item tag for item inference
    const fromTag = parseFromTag(line);
    if (fromTag?.kind === 'item') {
      if (fromTag.of) {
        // e.g. Rocky Helmet — [of] points to who owns the item
        const opp = fromTag.ofSide !== this.state.playerSide ? this.state.opponentActive : null;
        if (opp) {
          opp.item = fromTag.name;
          opp.itemConfirmed = true;
        }
      } else {
        // e.g. Life Orb — damage taken by the holder
        if (side !== this.state.playerSide && this.state.opponentActive) {
          this.state.opponentActive.item = fromTag.name;
          this.state.opponentActive.itemConfirmed = true;
        }
      }
    }
  }

  private handleStatus(parts: string[]): void {
    if (this.state.playerSide === null) return;
    const { side } = parsePokemonId(parts[2] ?? '');
    const status = parts[3] ?? null;
    if (side !== this.state.playerSide && this.state.opponentActive) {
      this.state.opponentActive.status = status;
    } else if (side === this.state.playerSide) {
      const me = this.state.myTeam.find((p) => p.active);
      if (me) me.status = status;
    }
  }

  private handleCureStatus(parts: string[]): void {
    if (this.state.playerSide === null) return;
    const { side } = parsePokemonId(parts[2] ?? '');
    if (side !== this.state.playerSide && this.state.opponentActive) {
      this.state.opponentActive.status = null;
    } else if (side === this.state.playerSide) {
      const me = this.state.myTeam.find((p) => p.active);
      if (me) me.status = null;
    }
  }

  private handleBoost(parts: string[], sign: 1 | -1): void {
    if (this.state.playerSide === null) return;
    const { side } = parsePokemonId(parts[2] ?? '');
    const stat = parts[3] as keyof StatBoosts;
    const amount = parseInt(parts[4] ?? '0') * sign;
    const target = side !== this.state.playerSide ? this.state.opponentActive : this.state.myTeam.find((p) => p.active);
    if (target && stat in target.boosts) {
      target.boosts[stat] = Math.max(-6, Math.min(6, target.boosts[stat] + amount));
    }
  }

  private handleSetBoost(parts: string[]): void {
    if (this.state.playerSide === null) return;
    const { side } = parsePokemonId(parts[2] ?? '');
    const stat = parts[3] as keyof StatBoosts;
    const amount = parseInt(parts[4] ?? '0');
    const target = side !== this.state.playerSide ? this.state.opponentActive : this.state.myTeam.find((p) => p.active);
    if (target && stat in target.boosts) {
      target.boosts[stat] = Math.max(-6, Math.min(6, amount));
    }
  }

  private handleBoostOperation(parts: string[]): void {
    const targetFor = (id: string) => parsePokemonId(id).side === this.state.playerSide
      ? this.state.myTeam.find(p => p.active) : this.state.opponentActive;
    const target = targetFor(parts[2] ?? '');
    if (!target) return;
    const source = targetFor(parts[3] ?? '');
    const stats = (parts[4] && !parts[4].startsWith('[') ? parts[4].split(',').map(s => s.trim()) : Object.keys(target.boosts)) as (keyof StatBoosts)[];
    for (const stat of stats) {
      if (!(stat in target.boosts)) continue;
      const value = target.boosts[stat];
      if (parts[1] === '-clearpositiveboost' && value > 0) target.boosts[stat] = 0;
      if (parts[1] === '-clearnegativeboost' && value < 0) target.boosts[stat] = 0;
      if (parts[1] === '-invertboost') target.boosts[stat] = -value;
      if (parts[1] === '-copyboost' && source) target.boosts[stat] = source.boosts[stat];
      if (parts[1] === '-swapboost' && source) {
        target.boosts[stat] = source.boosts[stat];
        source.boosts[stat] = value;
      }
    }
  }

  private handleClearBoost(parts: string[]): void {
    if (this.state.playerSide === null) return;
    const { side } = parsePokemonId(parts[2] ?? '');
    const target = side !== this.state.playerSide ? this.state.opponentActive : this.state.myTeam.find((p) => p.active);
    if (target) target.boosts = defaultBoosts();
  }

  private handleClearAllBoost(): void {
    this.state.opponentActive && (this.state.opponentActive.boosts = defaultBoosts());
    this.state.myTeam.forEach((p) => { p.boosts = defaultBoosts(); });
  }

  private handleTera(parts: string[]): void {
    // |-terastallize|POKEMON|TYPE
    const { side } = parsePokemonId(parts[2] ?? '');
    const teraType = parts[3] ?? '';
    if (side !== this.state.playerSide && this.state.opponentActive) {
      this.state.opponentActive.teraType = teraType;
      this.state.opponentActive.terastallized = true;
      this.state.possibleSets = this.eliminator.revealTeraType(this.state.possibleSets, teraType);
    } else {
      const me = this.state.myTeam.find((p) => p.active);
      if (me) { me.teraType = teraType; me.terastallized = true; }
    }
  }

  private handleWeather(parts: string[]): void {
    const weather = parts[2] ?? '';
    this.state.field.weather = weather === 'none' ? null : weather;
  }

  private handleFieldStart(parts: string[]): void {
    const condition = toId(parts[2] ?? '');
    if (condition.includes('trickroom')) this.state.field.trickRoom = true;
    else if (condition.includes('gravity')) this.state.field.gravity = true;
    else if (condition.includes('electricterrain')) this.state.field.terrain = 'Electric';
    else if (condition.includes('grassyterrain')) this.state.field.terrain = 'Grassy';
    else if (condition.includes('mistyterrain')) this.state.field.terrain = 'Misty';
    else if (condition.includes('psychicterrain')) this.state.field.terrain = 'Psychic';
  }

  private handleFieldEnd(parts: string[]): void {
    const condition = toId(parts[2] ?? '');
    if (condition.includes('trickroom')) this.state.field.trickRoom = false;
    else if (condition.includes('gravity')) this.state.field.gravity = false;
    else if (condition.includes('terrain')) this.state.field.terrain = null;
  }

  private handleSideStart(parts: string[]): void {
    const sideId = (parts[2] ?? '').startsWith('p1') ? 'p1' : 'p2';
    const condition = toId(parts[3] ?? '');
    const sc = this.state.field[sideId];
    if (condition.includes('stealthrock')) sc.stealthRock = true;
    else if (condition.includes('toxicspikes')) sc.toxicSpikes = Math.min(2, sc.toxicSpikes + 1);
    else if (condition.includes('spikes')) sc.spikes = Math.min(3, sc.spikes + 1);
    else if (condition.includes('reflect')) sc.reflect = true;
    else if (condition.includes('lightscreen')) sc.lightScreen = true;
    else if (condition.includes('auroraveil')) sc.auroraVeil = true;
    else if (condition.includes('tailwind')) sc.tailwind = true;
  }

  private handleSideEnd(parts: string[]): void {
    const sideId = (parts[2] ?? '').startsWith('p1') ? 'p1' : 'p2';
    const condition = toId(parts[3] ?? '');
    const sc = this.state.field[sideId];
    if (condition.includes('stealthrock')) sc.stealthRock = false;
    else if (condition.includes('toxicspikes')) sc.toxicSpikes = 0;
    else if (condition.includes('spikes')) sc.spikes = 0;
    else if (condition.includes('reflect')) sc.reflect = false;
    else if (condition.includes('lightscreen')) sc.lightScreen = false;
    else if (condition.includes('auroraveil')) sc.auroraVeil = false;
    else if (condition.includes('tailwind')) sc.tailwind = false;
  }

  private handleFormeChange(parts: string[]): void {
    if (this.state.playerSide === null) return;
    const { side } = parsePokemonId(parts[2] ?? '');
    const { species } = parseDetails(parts[3] ?? '');
    if (side !== this.state.playerSide && this.state.opponentActive) {
      const opp = this.state.opponentActive;
      opp.species = species;
      const from = parseFromTag(parts.join('|'));
      if (from?.kind === 'ability') opp.ability = normalizeAbilityName(from.name);
      let sets = this.eliminator.init(species);
      for (const move of opp.revealedMoves) sets = this.eliminator.revealMove(sets, move);
      this.state.possibleSets = sets;
    } else if (side === this.state.playerSide) {
      const me = this.state.myTeam.find(p => p.active);
      if (me) {
        me.species = species;
        me.battleForm = parts[1] === '-formechange' ? species : undefined;
        const from = parseFromTag(parts.join('|'));
        if (from?.kind === 'ability') me.ability = normalizeAbilityName(from.name);
      }
    }
  }

  private handleFaint(parts: string[]): void {
    if (this.state.playerSide === null) return;
    const { side } = parsePokemonId(parts[2] ?? '');
    if (side === this.state.playerSide) {
      const me = this.state.myTeam.find((p) => p.active);
      if (me) { me.hpPercent = 0; me.active = false; }
    } else {
      // Leave opponentActive set so the sidebar keeps showing what we
      // learned about the fainted mon (revealed moves, item, etc.) until
      // the opponent's next |switch| overwrites it. Otherwise the sidebar
      // blanks during the gap between faint and replacement.
      if (this.state.opponentActive) this.state.opponentActive.hpPercent = 0;
    }
  }

  private handleTurn(parts: string[]): void {
    this.state.turn = parseInt(parts[2] ?? '0');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private parseHpPercent(hpStr: string): number {
    if (hpStr === '0' || hpStr === '0 fnt') return 0;
    const match = hpStr.match(/(\d+)\/(\d+)/);
    if (!match) return 100;
    return Number(match[2]) > 0 ? Math.min(100, Math.max(0, (Number(match[1]) / Number(match[2])) * 100)) : 0;
  }
}

export const tracker = new BattleStateTracker();
