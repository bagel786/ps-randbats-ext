# Maintainer scripts

Run commands from the repository root after `npm ci`.

| Script | Purpose | Requirements |
| --- | --- | --- |
| `package-release.mjs` | Validate built manifest/assets and ZIP an explicit file allowlist | Existing `dist/`; system `zip` command |
| `check-integration.mjs` | Test built scripts, boosts, room isolation, keyboard tooltips, and cleanup | Existing `dist/`; Playwright Chromium |
| `check-room-routing.mjs` | Test public/hidden room IDs, both player sides and renames through both built entries | Existing `dist/`; Playwright Chromium |
| `check-ui.mjs` | Check desktop/narrow layouts and capture preview screenshots | Vite server at `127.0.0.1:5173`; Playwright Chromium |
| `build-icons.mjs` | Render PNG icons and small promotional image from the SVG mark | Playwright Chromium |
| `build-randbats-items.cjs` | Refresh sets and empirical item frequencies from full Showdown teams | Separate, built Pokémon Showdown checkout |

Install the test browser with `npx playwright install chromium`. Prefer `npm run release` for the complete build/check/package sequence.

## Refresh set and item data

```sh
SHOWDOWN_PATH=/absolute/path/to/pokemon-showdown npm run sync-sets
```

The upstream checkout must have its `dist/sim/teams.js` built. This command intentionally replaces `src/data/gen9-sets.json` and `src/data/item-sampling.json`. It samples 20,000 full teams by default. Override with `TEAMS=<count>` for research, then review the resulting sample coverage before shipping.

Sampling records the upstream Git revision and seed. It preserves counts by species, role, item, and move combination. Do not describe sampled frequencies as exact probabilities or a sampled singleton as guaranteed.

After refreshing data, run the release checks and commit the source dataset, metadata, updated build, and archive together. See [item research](../docs/ITEM_RESEARCH.md).
