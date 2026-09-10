// Scrape Pokemon Showdown's getItem logic by sampling randomSet() many times
// per (species, role) and accumulating the observed items. Output augments
// src/data/gen9-sets.json with an `items` array per set so the runtime
// predictor can do a simple lookup instead of reimplementing getItem.
//
// Run after building Showdown:
//   cd ~/Desktop/pokemon-showdown && node build
// Then:
//   node scripts/build-randbats-items.js
//
// Re-run whenever Showdown's random-battle logic is updated upstream.

'use strict';

const fs = require('fs');
const path = require('path');

const SHOWDOWN = process.env.SHOWDOWN_PATH || path.resolve(__dirname, '../../pokemon-showdown');
const SETS_PATH = path.resolve(__dirname, '../src/data/gen9-sets.json');
const ROUNDS_PER_LEAD = 60;

const { Teams } = require(path.join(SHOWDOWN, 'dist/sim/teams'));

const sets = JSON.parse(fs.readFileSync(SETS_PATH, 'utf8'));
const speciesIds = Object.keys(sets);

let scanned = 0;
const t0 = Date.now();

for (const speciesId of speciesIds) {
  const itemsByRole = new Map();
  for (const isLead of [false, true]) {
    const generator = Teams.getGenerator('gen9randombattle', [0, 0, 0, 0]);
    for (let i = 0; i < ROUNDS_PER_LEAD; i++) {
      generator.setSeed([i, i * 3 + 1, i * 7 + 13, i * 11 + 5]);
      let result;
      try {
        result = generator.randomSet(speciesId, {}, isLead, false);
      } catch (err) {
        // Some formes (cosmetic) aren't directly callable; skip silently.
        break;
      }
      if (!result || !result.role) continue;
      const role = result.role;
      const item = result.item || '';
      if (!item) continue;
      if (!itemsByRole.has(role)) itemsByRole.set(role, new Set());
      itemsByRole.get(role).add(item);
    }
  }

  for (const set of sets[speciesId].sets) {
    const observed = itemsByRole.get(set.role);
    set.items = observed ? [...observed].sort() : [];
  }

  scanned++;
  if (scanned % 50 === 0) {
    console.log(`[${scanned}/${speciesIds.length}] ${speciesId} (${Math.round((Date.now() - t0) / 1000)}s)`);
  }
}

fs.writeFileSync(SETS_PATH, JSON.stringify(sets, null, 2) + '\n');
console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s. Wrote ${SETS_PATH}.`);
