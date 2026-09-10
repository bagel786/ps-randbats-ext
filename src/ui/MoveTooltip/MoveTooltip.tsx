import { Generations } from '@smogon/calc';
import { CalcResult } from '../../battle/types';
import { toId } from '../../battle/BattleStateTracker';

const gen = Generations.get(9);

function getMoveData(moveName: string) {
  return gen.moves.get(toId(moveName) as Parameters<typeof gen.moves.get>[0]);
}

interface Props {
  result: CalcResult | null;
  moveName: string;
  anchorRect: DOMRect;
}

export function MoveTooltip({ result, moveName, anchorRect }: Props) {
  const style = computePosition(anchorRect);
  const moveData = getMoveData(moveName);
  const category = moveData?.category;
  const isStatus = category === 'Status';

  return (
    <div
      id="ps-ext-tooltip"
      style={style}
      className="fixed z-[99999] bg-gray-900 text-white rounded-lg shadow-2xl p-3 w-56 text-xs pointer-events-none border border-gray-700"
    >
      <div className="font-bold text-sm mb-1 text-white">{moveData?.name ?? moveName}</div>

      {moveData && (
        <div className="text-[10px] text-gray-400 mb-1.5">
          {moveData.type}
          {category && <span> · {category}</span>}
          {!isStatus && moveData.basePower > 0 && <span> · {moveData.basePower} BP</span>}
        </div>
      )}

      {isStatus ? (
        <div className="text-gray-400 italic text-[11px]">Status move — no damage</div>
      ) : result ? (
        <>
          <div className="flex items-center gap-2">
            <div className="text-yellow-300 font-semibold">
              {result.percentMin}–{result.percentMax}%
            </div>
            <EffectivenessBadge eff={result.effectiveness} />
          </div>
          <div className={`font-semibold ${result.koChance >= 1 ? 'text-red-400' : result.koChance > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
            {result.koLabel}
          </div>

          {result.modifiers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {result.modifiers.map((mod) => (
                <span key={mod} className="bg-blue-700 rounded px-1 py-0.5 text-[10px]">
                  {mod}
                </span>
              ))}
            </div>
          )}

          {result.notes.length > 0 && (
            <div className="mt-1.5 text-gray-400 text-[10px] italic">
              {result.notes.join(', ')}
            </div>
          )}
        </>
      ) : (
        <div className="text-gray-400 italic">
          {moveData ? 'No damage (immune?)' : 'No opponent data'}
        </div>
      )}
    </div>
  );
}

function EffectivenessBadge({ eff }: { eff: number }) {
  if (eff === 1) return null;
  let label: string;
  let cls: string;
  if (eff === 0) {
    label = '0× Immune';
    cls = 'bg-gray-700 text-gray-200';
  } else if (eff >= 4) {
    label = '4× ‼ ';
    cls = 'bg-green-600 text-white';
  } else if (eff >= 2) {
    label = '2× Super';
    cls = 'bg-green-700 text-green-100';
  } else if (eff <= 0.25) {
    label = '¼× Resist';
    cls = 'bg-red-800 text-red-100';
  } else {
    label = '½× Resist';
    cls = 'bg-red-700 text-red-100';
  }
  return (
    <span className={`rounded px-1 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
  );
}

function computePosition(rect: DOMRect): React.CSSProperties {
  const tooltipHeight = 130;
  const tooltipWidth = 224;
  const margin = 8;

  let top = rect.top;
  let left = rect.right + margin;

  if (left + tooltipWidth > window.innerWidth - margin) {
    left = rect.left - tooltipWidth - margin;
  }
  if (left < margin) {
    left = Math.max(margin, rect.left);
    top = rect.top - tooltipHeight - margin;
    if (top < margin) top = rect.bottom + margin;
  }

  if (top + tooltipHeight > window.innerHeight - margin) {
    top = window.innerHeight - tooltipHeight - margin;
  }

  return { top, left, position: 'fixed' };
}
