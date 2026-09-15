# Release preparation

## Build

Use Node 22.12+ or Node 24, then run `npm ci`, `npx playwright install chromium`, and `npm run release`.
The validated ZIP is written to `release/`. Load `dist/` unpacked in Chrome for testing.
`npm run sync-sets` is an explicit maintainer task requiring a sibling Showdown checkout; ordinary builds never silently change the set dataset.

## Before submission

- Live smoke test completed on the official server with two temporary test accounts: Morpeko form change, opponent Swords Dance, move hover, room switching, keyboard collapse and game-end cleanup. See LIVE_SMOKE.md. Repeat after future code changes.
- Publish docs/PRIVACY.md at a public HTTPS URL and enter it in the dashboard.
- Supply publisher contact/support information and complete the developer account requirements.
- Review docs/STORE_LISTING.md and the data-use disclosures against the shipped code.
- Live 1280×800 screenshots are ready in `artifacts/live/sidebar-1280x800.png` and `artifacts/live/move-hover-1280x800.png`. The separate `artifacts/whiteboard-*.png` files are synthetic design previews.
- Use `artifacts/store/promo-440x280.png` for the required small promotional image and `public/icons/icon128.png` for the icon.
- Upload the ZIP and store assets, then submit for review. This repository does not submit automatically.

## Known limits

Only official play.pokemonshowdown.com Gen 9 Random Battles singles are enabled. Start a fresh battle after installation. Hidden opponent EV/IV choices, multi-hit KO probabilities, unmodeled volatiles (including Substitute), Transform, ability suppression, and unusual ability-changing interactions can differ from estimates. Item frequencies come from an upstream sample of full teams and are estimates, not exact live probabilities. See ITEM_RESEARCH.md. The committed set snapshot can become stale as Showdown changes.

## References checked for this release

- https://developer.chrome.com/docs/webstore/publish
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/images
- https://github.com/smogon/pokemon-showdown/blob/master/sim/SIM-PROTOCOL.md
