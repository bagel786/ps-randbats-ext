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

function damageColor(percentMax: number, koChance: number): string {
  if (koChance >= 1) return 'text-red-400';
  if (percentMax >= 50) return 'text-orange-400';
  if (percentMax >= 25) return 'text-yellow-400';
  return 'text-gray-300';
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
      .filter((r) => r.result !== null);

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
      .filter((r) => r.result !== null)
      .sort((a, b) => (b.result?.percentMax ?? 0) - (a.result?.percentMax ?? 0));

    return [...revealedRows, ...potentialRows];
  }, [state]);

  if (!opp || !me) return null;
  if (rows.length === 0) return null;

  const revealedCount = rows.filter((r) => !r.potential).length;
  const potentialCount = rows.filter((r) => r.potential).length;

  return (
    <div className="border-t border-gray-700 mt-2 pt-2">
      <div className="text-gray-400 text-[10px] uppercase tracking-wide mb-1">
        Threats vs {formatSpeciesName(me.species)}
      </div>

      <div className="space-y-0.5">
        {rows
          .filter((r) => !r.potential)
          .map((row) => (
            <ThreatRowDisplay key={row.moveName} row={row} />
          ))}
      </div>

      {potentialCount > 0 && (
        <details
          className="mt-1"
          open={showPotential}
          onToggle={(e) => setShowPotential((e.target as HTMLDetailsElement).open)}
        >
          <summary className="text-gray-500 text-[10px] cursor-pointer hover:text-gray-300">
            {potentialCount} potential move{potentialCount !== 1 ? 's' : ''}
            {revealedCount === 0 && ' (no moves seen yet)'}
          </summary>
          <div className="space-y-0.5 mt-1">
            {rows
              .filter((r) => r.potential)
              .map((row) => (
                <ThreatRowDisplay key={row.moveName} row={row} />
              ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ThreatRowDisplay({ row }: { row: ThreatRow }) {
  const r = row.result!;
  const color = damageColor(r.percentMax, r.koChance);
  return (
    <div className="flex justify-between items-center text-[11px] gap-2">
      <span className={`truncate ${row.potential ? 'text-gray-400' : 'text-white'}`}>
        {row.moveName}
      </span>
      <span className={`font-semibold whitespace-nowrap ${color}`}>
        {r.percentMin}–{r.percentMax}%
      </span>
    </div>
  );
}

