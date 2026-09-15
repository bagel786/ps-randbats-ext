/* THESIS: A small battle whiteboard, organized around evidence.
 * OWN-WORLD: white, charcoal, fine rules, one blue marker.
 * STORY: read known facts, inspect incoming damage, compare possible sets.
 * FIRST VIEWPORT: compact title/control, HP line, facts, threats, open set notes.
 * FORM: user-pinned minimalist whiteboard; no concept randomization. */
import { useState } from 'react';
import { useBattleState } from '../../hooks/useBattleState';
import { formatSpeciesName } from '../../battle/DamageCalcBridge';
import { SetCard } from './SetCard';
import { ThreatList } from './ThreatList';

export function SidebarPanel() {
  const state = useBattleState();
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const opp = state.opponentActive;
  if (!opp || !state.playerSide) return null;
  const active = state.possibleSets.filter(s => !s.eliminated);
  const eliminated = state.possibleSets.filter(s => s.eliminated);
  return <aside className="ps-board" aria-label="Random Battle assistant">
    <button className="ps-board-toggle" aria-expanded={!collapsed} aria-controls="ps-board-body" onClick={() => setCollapsed(!collapsed)}>
      <span><span className="ps-caption"><span className="ps-mark" aria-hidden="true" /> Battle notes <span>· Turn {state.turn}</span></span><strong>{formatSpeciesName(opp.species)}</strong></span>
      <span className="ps-toggle-icon" aria-hidden="true">{collapsed ? '+' : '−'}</span>
    </button>
    {!collapsed && <div id="ps-board-body" className="ps-board-body">
      <div className="ps-hp-label"><span>Lv. {opp.level}{opp.status ? ` · ${opp.status.toUpperCase()}` : ''}</span><strong>{Math.round(opp.hpPercent)}% HP</strong></div>
      <div className="ps-hp" role="meter" aria-label="Opponent HP" aria-valuemin={0} aria-valuemax={100} aria-valuenow={opp.hpPercent}><span style={{transform: `scaleX(${opp.hpPercent / 100})`}} /></div>
      {state.illusionWarning && <p className="ps-notice">Illusion revealed. Check the updated opponent information.</p>}
      <dl className="ps-facts">
        <dt>Item</dt><dd>{opp.item ?? (opp.itemConfirmed ? 'None · removed' : 'Unknown')}</dd>
        <dt>Ability</dt><dd>{opp.ability ?? 'Unknown'}</dd>
        <dt>Tera</dt><dd>{opp.teraType ?? 'Unrevealed'}</dd>
      </dl>
      {opp.choiceConfirmed && !opp.itemConfirmed && <p className="ps-note">Choice lock observed; item unknown.</p>}
      <ThreatList state={state} />
      <section className="ps-section" aria-label="Possible sets"><h3>Possible sets <span>{active.length}</span></h3>
        {active.length ? active.map((set, i) => <SetCard key={`${set.role}-${i}`} set={set} revealedMoves={opp.revealedMoves} />) : <p className="ps-note">No matching set data. Revealed facts still appear above.</p>}
        {!!eliminated.length && <details><summary>{eliminated.length} ruled out</summary>{eliminated.map((set,i) => <SetCard key={i} set={set} revealedMoves={opp.revealedMoves} />)}</details>}
      </section>
      <footer className="ps-footer">Estimates · hover a move to calculate</footer>
    </div>}
  </aside>;
}
