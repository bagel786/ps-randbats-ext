import test from 'node:test';
import assert from 'node:assert/strict';
import {predictItem} from '../src/battle/itemPrediction';
import {SetEliminator} from '../src/battle/SetEliminator';
import type {PossibleSetMatch} from '../src/battle/types';
const eliminator = new SetEliminator();
test('item predictions use frequency, never the strongest damage item', () => {
  const sets = eliminator.init('electivire');
  for (const category of ['Physical','Special','Status'] as const) {
    const p = predictItem(sets,category)!;
    assert.equal(p.name,'Life Orb');
    assert.ok(p.frequency! > .9);
    assert.equal(p.confidence,'guess');
  }
});
test('observed moves condition sampled items, including Ambipom Fake Out', () => {
  assert.equal(predictItem(eliminator.init('ambipom'),'Physical',['fakeout'])!.name,'Silk Scarf');
  assert.equal(predictItem(eliminator.init('ambipom'),'Physical',['tripleaxel'])!.name,'Choice Band');
  assert.equal(predictItem(eliminator.init('electivire'),'Physical',['bulkup'])!.name,'Life Orb');
  assert.ok(!eliminator.init('electivire').some(s=>s.items.includes('Heavy-Duty Boots')));
});
test('consumed/absent sample is not confused with missing data; unseen combinations stay unknown', () => {
  const set: PossibleSetMatch={role:'test',movepool:['Acrobatics'],abilities:[],teraTypes:[],items:[''],itemSamples:[{item:'',moves:['acrobatics'],count:20}],eliminated:false,eliminatedReason:null};
  assert.equal(predictItem([set],'Physical',['acrobatics'])!.name,'');
  assert.equal(predictItem([set],'Physical',['surf']),null);
});
test('choice lock filters samples without assuming Band over Scarf', () => {
  const p = predictItem(eliminator.init('electivire'),'Physical',[],true)!;
  assert.equal(p.name,'Choice Scarf');
});
