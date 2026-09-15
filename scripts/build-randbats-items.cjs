// Sample FULL teams so item frequencies include lead and team-context effects.
// Usage: SHOWDOWN_PATH=/path/to/built/pokemon-showdown node scripts/build-randbats-items.cjs
// Outputs are deterministic for a fixed upstream commit, seed and team count.
'use strict';
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const root = process.env.SHOWDOWN_PATH || path.resolve(__dirname,'../../pokemon-showdown');
const {Teams} = require(path.join(root,'dist/sim/teams'));
const source = JSON.parse(fs.readFileSync(path.join(root,'data/random-battles/gen9/sets.json'),'utf8'));
const teamCount = Number(process.env.TEAMS || 20000);
if (!Number.isInteger(teamCount) || teamCount < 1) throw new Error('TEAMS must be a positive integer');
const seed = [2026,914,1729,4813];
const generator = Teams.getGenerator('gen9randombattle', seed);
const groups = new Map();
for (let i=0; i<teamCount; i++) {
  for (const set of generator.randomTeam()) {
    const key = `${set.speciesId}|${set.role}`;
    if (!groups.has(key)) groups.set(key,new Map());
    const moves = [...set.moves].sort();
    const signature = JSON.stringify([set.item,moves]);
    const group = groups.get(key);
    if (!group.has(signature)) group.set(signature,{item:set.item,moves,count:0});
    group.get(signature).count++;
  }
  if ((i+1)%2000===0) console.log(`${i+1}/${teamCount} teams`);
}
let empty=0;
for (const [id,pokemon] of Object.entries(source)) {
  for (const set of pokemon.sets) {
    const samples = [...(groups.get(`${id}|${set.role}`)?.values() || [])];
    set.itemSamples = samples.sort((a,b)=>b.count-a.count || a.item.localeCompare(b.item) || a.moves.join().localeCompare(b.moves.join()));
    set.items = [...new Set(samples.map(s=>s.item))].sort();
    if (!samples.length) empty++;
  }
}
const dataDir=path.resolve(__dirname,'../src/data');
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
fs.writeFileSync(path.join(dataDir,'gen9-sets.json'),JSON.stringify(source,null,2)+'\n');
fs.writeFileSync(path.join(dataDir,'item-sampling.json'),JSON.stringify({source:'https://github.com/smogon/pokemon-showdown',revision,format:'gen9randombattle',teamCount,seed,method:'Full randomTeam generation; item/moves counts by species and role. Sample frequencies are estimates, not exhaustive probabilities.',unsampledRoles:empty},null,2)+'\n');
console.log(`Wrote ${Object.keys(source).length} species; ${empty} unsampled roles (kept unknown, never guessed).`);
