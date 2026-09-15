import { useMemo, useState } from 'react';
import { Generations } from '@smogon/calc';
import { calcIncomingDamage, formatSpeciesName } from '../../battle/DamageCalcBridge';
import { BattleState, CalcResult, PossibleSetMatch } from '../../battle/types';
import { toId } from '../../battle/BattleStateTracker';

const gen = Generations.get(9);

function moveDisplayName(idOrName: string): string {
  const m = gen.moves.get(toId(idOrName) as Parameters<typeof gen.moves.get>[0]);
  return m?.name ?? idOrName;
}

interface Props {
  state: BattleState;
}

interface ThreatRow {
  moveName: string;
  result: CalcResult | null;
  potential: boolean; // true if from possible movepool but not yet revealed
}

export function ThreatList({ state }: Props) {
  const [showPotential, setShowPotential] = useState(false);
  const opp = state.opponentActive;
  const me = state.myTeam.find((p) => p.active);

  const rows = useMemo<ThreatRow[]>(() => {
    if (!opp || !me) return [];

    // Revealed moves: actual moves the opponent has used
    const revealedRows: ThreatRow[] = opp.revealedMoves
      .map((moveId) => ({
        moveName: moveDisplayName(moveId),
        result: calcIncomingDamage(state, moveDisplayName(moveId)),
        potential: false,
      }))
      .filter(r => gen.moves.get(toId(r.moveName) as Parameters<typeof gen.moves.get>[0])?.category !== 'Status');

    // Potential moves: union of un-eliminated set movepools, minus revealed
    const revealedIds = new Set(opp.revealedMoves);
    const possibleMoves = new Set<string>();
    state.possibleSets
      .filter((s: PossibleSetMatch) => !s.eliminated)
      .forEach((s) => {
        s.movepool.forEach((m) => {
          if (!revealedIds.has(toId(m))) possibleMoves.add(m);
        });
      });

    const potentialRows: ThreatRow[] = Array.from(possibleMoves)
      .map((moveName) => ({
        moveName,
        result: calcIncomingDamage(state, moveName),
        potential: true,
      }))
      .filter(r => gen.moves.get(toId(r.moveName) as Parameters<typeof gen.moves.get>[0])?.category !== 'Status')
      .sort((a, b) => (b.result?.percentMax ?? 0) - (a.result?.percentMax ?? 0));

    return [...revealedRows, ...potentialRows];
  }, [state]);

  if (!opp || !me) return null;
  if (rows.length === 0) return null;

  const revealedCount = rows.filter((r) => !r.potential).length;
  const potentialCount = rows.filter((r) => r.potential).length;

  return <section className="ps-section" aria-label="Incoming damage">
    <h3>Incoming damage</h3>
    {Object.entries(opp.boosts).some(([,value]) => value !== 0) && <p className="ps-observed ps-boosts">{Object.entries(opp.boosts).filter(([,value]) => value !== 0).map(([stat,value]) => `${value > 0 ? '+' : ''}${value} ${{atk:'Atk',def:'Def',spa:'SpA',spd:'SpD',spe:'Spe',accuracy:'Accuracy',evasion:'Evasion'}[stat]}`).join(' · ')} <span className="ps-muted">applied</span></p>}
    <p className="ps-note">vs {formatSpeciesName(me.species)} · % of max HP</p>
    {rows.filter(r => !r.potential).map(row => <ThreatRowDisplay key={row.moveName} row={row} />)}
    {potentialCount > 0 && <details open={showPotential} onToggle={e => setShowPotential(e.currentTarget.open)}>
      <summary>{potentialCount} possible moves{revealedCount === 0 ? ' · none seen' : ''}</summary>
      {rows.filter(r => r.potential).map(row => <ThreatRowDisplay key={row.moveName} row={row} />)}
    </details>}
    <p className="ps-note">Unknown items and abilities are estimated. Expand a move for assumptions.</p>
  </section>;
}
function ThreatRowDisplay({row}: {row: ThreatRow}) {
  const r = row.result;
  if (!r) return <div className="ps-unavailable"><span>{row.moveName}</span><span className="ps-note">Estimate unavailable</span></div>;
  return <details className="ps-threat"><summary><span>{row.moveName}</span><strong>{r.percentMin}–{r.percentMax}%</strong></summary>
    <p className="ps-note">{r.koLabel}{r.modifiers.length ? ` · ${r.modifiers.join(" · ")}` : ""}{r.notes.length ? ` · ${r.notes.join('; ')}` : ''}</p>
  </details>;
}
