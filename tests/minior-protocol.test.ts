import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/minior-upstream.json';
import {BattleStateTracker} from '../src/battle/BattleStateTracker';
import {calcDamage} from '../src/battle/DamageCalcBridge';
test('actual upstream Minior log and unchanged request details preserve the active form', () => {
  const tracker=new BattleStateTracker();
  tracker.processLine('|request|'+JSON.stringify(fixture.stages[0].request));
  for(const stage of fixture.stages) {
    for(const line of stage.lines) tracker.processLine(line);
    tracker.processLine('|request|'+JSON.stringify(stage.request));
    assert.equal(tracker.state.myTeam[0].species,stage.actualSpecies);
    assert.ok(calcDamage(tracker.state,'Acrobatics'));
  }
  assert.equal(tracker.state.myTeam[0].boosts.atk,2);
  assert.equal(tracker.state.myTeam[0].item,'');
});
