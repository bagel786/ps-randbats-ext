import { useLayoutEffect, useRef, useState } from 'react';
import { Generations, toID } from '@smogon/calc';
import { CalcResult } from '../../battle/types';
const gen = Generations.get(9);
export function MoveTooltip({ result, moveName, anchorRect }: {result: CalcResult | null; moveName: string; anchorRect: DOMRect}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({left: 8, top: 8});
  useLayoutEffect(() => {
    const box = ref.current!.getBoundingClientRect();
    const left = anchorRect.right + 8 + box.width <= window.innerWidth ? anchorRect.right + 8 : anchorRect.left - box.width - 8;
    setPosition({left: Math.max(8, Math.min(left, window.innerWidth - box.width - 8)), top: Math.max(8, Math.min(anchorRect.top, window.innerHeight - box.height - 8))});
  }, [anchorRect, result]);
  const move = gen.moves.get(toID(moveName));
  return <div ref={ref} id="ps-ext-tooltip" role="tooltip" className="ps-tooltip" style={position}>
    <div className="ps-caption">Damage estimate</div><h3>{move?.name ?? moveName}</h3>
    <p className="ps-note">{move?.type} · {move?.category}{move && move.basePower > 0 ? ` · ${move.basePower} BP` : ''}</p>
    {move?.category === 'Status' ? <p>Status move · no direct damage</p> : result ? <>
      <div className="ps-damage">{result.percentMin}–{result.percentMax}<span>%</span></div>
      <p>{result.koLabel} <span className="ps-muted">· of maximum HP</span></p>
      {result.effectiveness === 0 && <p className="ps-observed">No damage · immune</p>}
      {!!result.modifiers.length && <p className="ps-modifiers">{result.modifiers.join(' · ')}</p>}
      {!!result.notes.length && <p className="ps-note">{result.notes.join('; ')}</p>}
    </> : <p className="ps-note">Estimate unavailable. Wait for both active Pokémon to be revealed.</p>}
  </div>;
}
