import { useState } from 'react';
import { useBattleState } from '../../hooks/useBattleState';
import { formatSpeciesName } from '../../battle/DamageCalcBridge';
import { SetCard } from './SetCard';
import { ThreatList } from './ThreatList';

export function SidebarPanel() {
  const state = useBattleState();
  const [collapsed, setCollapsed] = useState(false);

  const opp = state.opponentActive;
  const activeSets = state.possibleSets.filter((s) => !s.eliminated);
  const eliminatedSets = state.possibleSets.filter((s) => s.eliminated);

  if (!opp) return null;

  return (
    <div className="ps-ext-sidebar bg-gray-900 border border-gray-700 rounded-lg text-white text-xs w-56 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="font-bold text-sm">{formatSpeciesName(opp.species)}</span>
        <span className="text-gray-400 text-[10px]">
          {activeSets.length} set{activeSets.length !== 1 ? 's' : ''} {collapsed ? '▸' : '▾'}
        </span>
      </div>

      {!collapsed && (
        <div className="p-2 overflow-y-auto max-h-[70vh]">
          {/* Illusion warning */}
          {state.illusionWarning && (
            <div className="bg-red-900 border border-red-500 rounded p-1.5 mb-2 text-red-300 text-[10px]">
              ⚠ Illusion broken! Previous info invalidated.
            </div>
          )}

          {/* Revealed info */}
          <div className="mb-2 space-y-0.5">
            <InfoRow label="HP" value={`${opp.hpPercent}%`} />
            <InfoRow
              label="Item"
              value={opp.item ?? 'Unknown'}
              confirmed={opp.itemConfirmed}
              uncertain={opp.choiceConfirmed}
              uncertainLabel={opp.choiceConfirmed ? 'Choice (confirmed)' : undefined}
            />
            <InfoRow label="Ability" value={opp.ability ?? 'Unknown'} />
            <InfoRow
              label="Tera"
              value={opp.teraType ?? (opp.terastallized ? '?' : 'Unknown')}
            />
            {opp.status && <InfoRow label="Status" value={opp.status} valueClass="text-yellow-400" />}
            {opp.choiceConfirmed && !opp.item && (
              <div className="text-orange-300 text-[10px]">Choice item confirmed via lock</div>
            )}
            {!opp.choiceConfirmed && opp.consecutiveSameMove >= 3 && (
              <div className="text-gray-400 text-[10px] italic">? Possible Choice (same move ×{opp.consecutiveSameMove})</div>
            )}
          </div>

          {/* Incoming damage threats */}
          <ThreatList state={state} />

          <div className="border-t border-gray-700 my-1.5" />

          {/* Active sets */}
          {activeSets.length === 0 ? (
            <div className="text-red-400 text-[10px] italic">No matching sets</div>
          ) : (
            activeSets.map((set, i) => (
              <SetCard key={`${set.role}-${i}`} set={set} revealedMoves={opp.revealedMoves} />
            ))
          )}

          {/* Collapsed eliminated sets */}
          {eliminatedSets.length > 0 && (
            <details className="mt-1">
              <summary className="text-gray-600 text-[10px] cursor-pointer">
                {eliminatedSets.length} eliminated set{eliminatedSets.length !== 1 ? 's' : ''}
              </summary>
              {eliminatedSets.map((set, i) => (
                <SetCard key={`${set.role}-${i}`} set={set} revealedMoves={opp.revealedMoves} />
              ))}
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  confirmed,
  uncertain,
  uncertainLabel,
  valueClass,
}: {
  label: string;
  value: string;
  confirmed?: boolean;
  uncertain?: boolean;
  uncertainLabel?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}:</span>
      <span className={valueClass ?? (value === 'Unknown' ? 'text-gray-600 italic' : 'text-white')}>
        {uncertain && uncertainLabel ? uncertainLabel : value}
        {confirmed && <span className="ml-1 text-green-400 text-[10px]">✓</span>}
      </span>
    </div>
  );
}
