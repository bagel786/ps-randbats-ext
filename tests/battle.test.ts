import test from 'node:test';
import assert from 'node:assert/strict';
import { Generations, Pokemon, toID } from '@smogon/calc';
import { BattleStateTracker } from '../src/battle/BattleStateTracker';
import { resolveSpeciesId } from '../src/battle/species';
import { SetEliminator } from '../src/battle/SetEliminator';
import { calcDamage, calcIncomingDamage } from '../src/battle/DamageCalcBridge';
import sets from '../src/data/gen9-sets.json';
const gen = Generations.get(9);
function request(species = 'Pikachu', condition = '200/200', extra = {}) {
  return '|request|' + JSON.stringify({side: {id:'p1', pokemon: [{ident:'p1: Sparky', details:`${species}, L80`, condition, active:true, baseAbility:'static', item:'', moves:['thunderbolt'], ...extra}]}});
}
function battle(me = 'Pikachu', opp = 'Sawsbuck-Winter') {
  const t = new BattleStateTracker();
  t.processLine(request(me));
  t.processLine(`|switch|p2a: Nickname|${opp}, L80|100/100`);
  return t;
}
test('cosmetic forms resolve from display names AND protocol IDs', () => {
  for (const name of ['Sawsbuck-Summer','Sawsbuck-Autumn','Sawsbuck-Winter','Tatsugiri-Stretchy','Maushold-Four','Sinistea-Antique','Polteageist-Antique','Zarude-Dada','Dudunsparce-Three-Segment']) {
    for (const raw of [name, toID(name)]) {
      assert.doesNotThrow(() => new Pokemon(gen, resolveSpeciesId(raw)), raw);
      if (!raw.toLowerCase().startsWith('sinistea')) assert.ok(new SetEliminator().init(raw).length, raw);
      assert.ok(calcDamage(battle('Pikachu', raw).state, 'Thunderbolt'), raw);
      assert.ok(calcIncomingDamage(battle('Pikachu', raw).state, 'Tackle'), raw);
    }
  }
});
test('stat-changing forms stay distinct and unknown forms are not guessed', () => {
  for (const name of ['Tauros-Paldea-Blaze','Rotom-Wash','Ogerpon-Wellspring','Giratina-Origin','Zygarde-Complete']) {
    assert.equal(toID(resolveSpeciesId(toID(name))), toID(name));
  }
  assert.equal(resolveSpeciesId('sawsbuckimaginary'), 'sawsbuckimaginary');
});
test('all committed set species construct and calculate', () => {
  for (const id of Object.keys(sets)) {
    assert.ok(gen.species.get(toID(resolveSpeciesId(id))), id);
    assert.ok(calcDamage(battle('Pikachu', id).state, 'Tackle'), id);
  }
});
test('requests preserve burn, boosts and tera; fainted condition is zero HP', () => {
  const t = battle();
  t.processLine('|-boost|p1a: Sparky|atk|2');
  t.processLine('|-terastallize|p1a: Sparky|Water');
  t.processLine(request('Pikachu','100/200 brn'));
  assert.equal(t.state.myTeam[0].status, 'brn');
  assert.equal(t.state.myTeam[0].boosts.atk, 2);
  assert.equal(t.state.myTeam[0].terastallized, true);
  t.processLine(request('Pikachu','0 fnt'));
  assert.equal(t.state.myTeam[0].hpPercent, 0);
  assert.equal(calcDamage(t.state,'Tackle'), null);
});
test('burn reduces physical damage after a new request', () => {
  const t = battle(); const healthy = calcDamage(t.state,'Tackle')!;
  t.processLine(request('Pikachu','200/200 brn'));
  assert.ok(calcDamage(t.state,'Tackle')!.percentMax < healthy.percentMax);
});
test('confirmed removed items are never predicted back', () => {
  const t = battle('Blissey', 'Sawsbuck');
  t.state.possibleSets = [{role:'test',movepool:['Tackle'],abilities:['Sap Sipper'],items:['Choice Band'],teraTypes:['Normal'],eliminated:false,eliminatedReason:null}];
  const before = calcIncomingDamage(t.state, 'Tackle')!;
  t.processLine('|-enditem|p2a: Nickname|Choice Band');
  const after = calcIncomingDamage(t.state, 'Tackle')!;
  assert.ok(after.percentMax < before.percentMax);
  assert.ok(!after.notes.some(n => n.includes('Choice Band')));
});
test('switches reset status and move streak; hazards track and clear separately', () => {
  const t = battle();
  t.processLine('|move|p2a: Nickname|Tackle|p1a: Sparky');
  t.processLine('|-status|p2a: Nickname|brn');
  t.processLine('|switch|p2a: Nickname|Sawsbuck-Winter, L80|80/100');
  assert.equal(t.state.opponentActive!.status, null);
  assert.equal(t.state.opponentActive!.consecutiveSameMove, 0);
  t.processLine('|-sidestart|p1: User|move: Toxic Spikes');
  assert.equal(t.state.field.p1.spikes, 0);
  assert.equal(t.state.field.p1.toxicSpikes, 1);
  t.processLine('|-sideend|p1: User|move: Toxic Spikes');
  assert.equal(t.state.field.p1.toxicSpikes, 0);
});
test('forme changes preserve revelations and update either side', () => {
  const t = battle('Palafin', 'Palafin');
  t.processLine('|move|p2a: Nickname|Jet Punch|p1a: Sparky');
  t.processLine('|-item|p2a: Nickname|Choice Band');
  t.processLine('|-formechange|p2a: Nickname|Palafin-Hero');
  assert.equal(t.state.opponentActive!.item,'Choice Band');
  assert.deepEqual(t.state.opponentActive!.revealedMoves,['jetpunch']);
  t.processLine('|-formechange|p1a: Sparky|Palafin-Hero');
  assert.equal(t.state.myTeam[0].species,'palafinhero');
});
test('pre-request events resolve by side even in a mirror matchup', () => {
  const t = new BattleStateTracker();
  t.processLine('|switch|p1a: Mine|Pikachu, L80|100/100');
  t.processLine('|switch|p2a: Theirs|Pikachu, L80|100/100');
  t.processLine(request());
  assert.equal(t.state.opponentActive!.species,'pikachu');
  assert.equal(t.state.opponentSeen.length,1);
});
test('immunity is a zero result, distinct from unavailable or status', () => {
  const t = battle('Pikachu','Quagsire');
  const r = calcDamage(t.state,'Thunderbolt')!;
  assert.equal(r.percentMax,0); assert.equal(r.effectiveness,0);
  assert.equal(calcDamage(t.state,'Protect'),null);
});
test('HP-dependent moves use current HP', () => {
  const t = battle('Typhlosion','Blissey');
  const full = calcDamage(t.state,'Eruption')!;
  t.processLine(request('Typhlosion','20/200',{baseAbility:'blaze'}));
  assert.ok(calcDamage(t.state,'Eruption')!.percentMax < full.percentMax);
});
test('opponent +2 Attack affects incoming revealed AND possible moves after turn updates', () => {
  const t = battle('Blissey','Sawsbuck');
  const baseline = calcIncomingDamage(t.state,'Double-Edge')!;
  t.processLine('|-boost|p2a: Nickname|atk|2');
  assert.equal(t.state.opponentActive!.boosts.atk,2);
  const boosted = calcIncomingDamage(t.state,'Double-Edge')!;
  assert.ok(boosted.percentMax > baseline.percentMax * 1.8);
  assert.ok(boosted.modifiers.includes('+2 Atk'));
  t.processLine(request('Blissey'));
  t.processLine('|turn|3');
  assert.equal(calcIncomingDamage(t.state,'Double-Edge')!.percentMax,boosted.percentMax);
  t.processLine('|move|p2a: Nickname|Double-Edge|p1a: Sparky');
  assert.equal(calcIncomingDamage(t.state,'Double-Edge')!.percentMax,boosted.percentMax);
  // Calc mutates its own Pokemon objects; it must never mutate tracker boosts.
  calcIncomingDamage(t.state,'Horn Leech');
  assert.equal(t.state.opponentActive!.boosts.atk,2);
  t.processLine('|switch|p2a: Nickname|Sawsbuck, L80|100/100');
  assert.equal(calcIncomingDamage(t.state,'Double-Edge')!.percentMax,baseline.percentMax);
});
test('boost inversion, selective clearing, copying and swapping', () => {
  const t = battle();
  t.processLine('|-boost|p2a: Nickname|atk|2');
  t.processLine('|-invertboost|p2a: Nickname');
  assert.equal(t.state.opponentActive!.boosts.atk,-2);
  t.processLine('|-clearnegativeboost|p2a: Nickname');
  assert.equal(t.state.opponentActive!.boosts.atk,0);
  t.processLine('|-boost|p1a: Sparky|spa|3');
  t.processLine('|-copyboost|p2a: Nickname|p1a: Sparky');
  assert.equal(t.state.opponentActive!.boosts.spa,3);
  t.processLine('|-clearboost|p1a: Sparky');
  t.processLine('|-swapboost|p1a: Sparky|p2a: Nickname|spa, spd');
  assert.equal(t.state.opponentActive!.boosts.spa,0);
  assert.equal(t.state.myTeam[0].boosts.spa,3);
});
test('nickname source tags reveal the actual holder on the correct side', () => {
  const t = battle();
  t.processLine('|-damage|p1a: Sparky|180/200|[from] item: Rocky Helmet|[of] p2a: Nickname');
  assert.equal(t.state.opponentActive!.item,'Rocky Helmet');
});
test('Pain Split updates both HP values', () => {
  const t = battle();
  t.processLine('|-sethp|p1a: Sparky|60/200|p2a: Nickname|40/100|[from] move: Pain Split');
  assert.equal(t.state.myTeam[0].hpPercent,30);
  assert.equal(t.state.opponentActive!.hpPercent,40);
});
test('stable request identity preserves boosts through own form changes', () => {
  const t = battle('Palafin');
  t.processLine('|-boost|p1a: Sparky|atk|2');
  t.processLine('|-formechange|p1a: Sparky|Palafin-Hero');
  t.processLine(request('Palafin-Hero'));
  assert.equal(t.state.myTeam[0].boosts.atk,2);
});
test('Minior colored core and Meteor remain mechanically distinct', () => {
  const t = battle('Blissey','Minior-Meteor');
  t.processLine('|-boost|p2a: Nickname|atk|2');
  t.processLine('|-enditem|p2a: Nickname|White Herb');
  const meteor = calcIncomingDamage(t.state,'Acrobatics')!;
  t.processLine('|-formechange|p2a: Nickname|Minior-Blue|[from] ability: Shields Down');
  const core = calcIncomingDamage(t.state,'Acrobatics')!;
  assert.ok(core.percentMax > meteor.percentMax);
  assert.equal(t.state.opponentActive!.boosts.atk,2);
  assert.equal(t.state.opponentActive!.itemConfirmed,true);
  assert.ok(t.state.possibleSets.length);
  t.processLine('|switch|p2a: Elsewhere|Pikachu, L80|100/100');
  t.processLine('|switch|p2a: Nickname|Minior-Blue, L80|100/100');
  t.processLine('|-formechange|p2a: Nickname|Minior-Meteor|[from] ability: Shields Down');
  assert.equal(t.state.opponentActive!.itemConfirmed,true);
  assert.equal(t.state.opponentActive!.boosts.atk,0);
  assert.equal(t.state.opponentSeen.length,2);
});
test('own temporary Minior form survives request with unchanged base details', () => {
  const t = battle('Minior-Blue','Blissey');
  t.processLine('|-formechange|p1a: Sparky|Minior-Meteor|[from] ability: Shields Down');
  t.processLine(request('Minior-Blue'));
  assert.equal(t.state.myTeam[0].species,'miniormeteor');
  const meteor = calcDamage(t.state,'Acrobatics')!;
  t.processLine('|-formechange|p1a: Sparky|Minior-Blue|[from] ability: Shields Down');
  t.processLine(request('Minior-Blue'));
  assert.ok(calcDamage(t.state,'Acrobatics')!.percentMax > meteor.percentMax);
});
