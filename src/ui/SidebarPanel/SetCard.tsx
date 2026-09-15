import { PossibleSetMatch } from '../../battle/types';
import { SetEliminator } from '../../battle/SetEliminator';
import { toId } from '../../battle/BattleStateTracker';
export function SetCard({set, revealedMoves}: {set: PossibleSetMatch; revealedMoves: string[]}) {
  const remaining = SetEliminator.stillPossibleMoves(set, revealedMoves);
  const seen = set.movepool.filter(m => revealedMoves.includes(toId(m)));
  return <article className={`ps-set${set.eliminated ? ' ps-set-eliminated' : ''}`}>
    <h4>{set.role}</h4>
    {set.eliminated ? <p className="ps-note">{set.eliminatedReason}</p> : <>
      {!!seen.length && <p className="ps-observed"><span aria-hidden="true">✓ </span>{seen.join(' · ')}</p>}
      {!!remaining.length && <p><span className="ps-muted">May have </span>{remaining.join(' · ')}</p>}
      {!!set.items.length && <p className="ps-note">Item · {set.items.join(" / ")}</p>}
      <p className="ps-note">Ability · {set.abilities.join(' / ')}</p>
      <p className="ps-note">Tera · {set.teraTypes.join(' / ')}</p>
    </>}
  </article>;
}
