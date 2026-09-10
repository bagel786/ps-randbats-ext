import { PossibleSetMatch } from '../../battle/types';
import { SetEliminator } from '../../battle/SetEliminator';
import { toId } from '../../battle/BattleStateTracker';

interface Props {
  set: PossibleSetMatch;
  revealedMoves: string[];
}

export function SetCard({ set, revealedMoves }: Props) {
  const remaining = SetEliminator.stillPossibleMoves(set, revealedMoves);
  const seen = set.movepool.filter((m) => revealedMoves.includes(toId(m)));

  const cardClass = set.eliminated
    ? 'opacity-40 border-gray-700'
    : 'border-blue-600';

  return (
    <div className={`border rounded p-2 mb-2 text-xs ${cardClass}`}>
      <div className="flex items-center gap-1 mb-1">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${set.eliminated ? 'bg-red-500' : 'bg-green-400'}`} />
        <span className={`font-semibold ${set.eliminated ? 'text-gray-500 line-through' : 'text-white'}`}>
          {set.role}
        </span>
      </div>

      {set.eliminated && set.eliminatedReason && (
        <div className="text-red-400 text-[10px] mb-1 italic">✗ {set.eliminatedReason}</div>
      )}

      {!set.eliminated && (
        <>
          {seen.length > 0 && (
            <div className="mb-1">
              <span className="text-gray-400">Seen: </span>
              <span className="text-green-300">{seen.join(', ')}</span>
            </div>
          )}
          {remaining.length > 0 && (
            <div>
              <span className="text-gray-400">May have: </span>
              <span className="text-blue-200">{remaining.join(', ')}</span>
            </div>
          )}
          <div className="mt-1 text-gray-500 text-[10px]">
            Abilities: {set.abilities.join(' / ')}
          </div>
          <div className="text-gray-500 text-[10px]">
            Tera: {set.teraTypes.join(' / ')}
          </div>
        </>
      )}
    </div>
  );
}
