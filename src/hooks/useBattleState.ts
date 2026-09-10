import { useEffect, useState } from 'react';
import { tracker } from '../battle/BattleStateTracker';
import { BattleState } from '../battle/types';

export function useBattleState(): BattleState {
  const [state, setState] = useState<BattleState>(() => structuredClone(tracker.state));

  useEffect(() => {
    const handler = (e: Event) => {
      setState((e as CustomEvent<BattleState>).detail);
    };
    tracker.addEventListener('stateChange', handler);
    return () => tracker.removeEventListener('stateChange', handler);
  }, []);

  return state;
}
