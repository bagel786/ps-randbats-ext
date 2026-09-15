# Official Showdown smoke test

September 14, 2026. Loaded the unpacked Manifest V3 extension from `dist/` in an isolated full Chromium profile. Two temporary guest test accounts played an unrated Gen 9 Random Battle against each other on the official server. No existing user account or ladder rating was used.

Battle: `battle-gen9randombattle-2681481932` (not uploaded as a public replay).

## Verified

- Extension content scripts loaded via the actual manifest; no injected fixture state.
- Opponent and own active Pokémon populated at battle start.
- Actual Showdown move buttons produced outgoing damage tooltips.
- Morpeko switched into Hangry form; sidebar species and calculations continued working. Its revealed Leftovers persisted.
- Opponent Blaziken used Swords Dance. Possible Close Combat changed from **62–75%** to **125–148%** against Toedscruel. Sidebar displayed **+2 Atk · +1 Spe applied**.
- The next request and turn preserved those boosts.
- Keyboard collapse/reopen worked.
- Going Home hid the board; returning to the battle restored boosts and estimates.
- Sidebar measured **264px** at 1280×800, clear of the battle's move controls. Its scrollable body was limited to 480px at that viewport.
- Forfeiting the test battle cleared the board. Both temporary browser profiles were closed afterward.

## Live assets

- `artifacts/live/sidebar-1280x800.png`
- `artifacts/live/move-hover-1280x800.png`
- `artifacts/live/morpeko-hangry.png`
- `artifacts/live/result.json`

These are live server screenshots, not mockups. The larger `initial-check.png` shows the earlier panel before its height/width reduction; use the two 1280×800 final screenshots for the store.

## Minior coverage

Minior did not appear in this randomly generated live battle. A deterministic test using the actual upstream simulator forced Minior-Blue → Minior-Meteor → Minior-Blue, Shell Smash and White Herb consumption. Its recorded protocol/request snapshots are checked in at `tests/fixtures/minior-upstream.json`. Replaying them through the tracker verifies the active form survives requests that still say `Minior-Blue`, the correct stats are used, boosts persist, and the consumed item stays removed. Separate tests cover switching away and back.
