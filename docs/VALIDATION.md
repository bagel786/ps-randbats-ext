# Validation — September 14, 2026

- TypeScript: passed.
- 17 automated regression tests: passed, including calculations for all 508 committed set species and explicit cosmetic-form fixtures.
- Built-bundle browser integration: passed. An opposing Sawsbuck's possible Double-Edge changes from 64–76% to 128–150% at +2 Attack against the fixture Charizard. The value survives a turn request and leaving/returning to the battle tab. Separate battles retain separate state.
- Keyboard tooltip focus/Escape, lobby cleanup, malformed frames and unsupported-format filtering: passed.
- Desktop 1280×800 and narrow 390×844 preview: inspected; collapse control, incoming disclosure, tooltip positioning, no horizontal overflow, no browser errors.
- npm audit: zero known vulnerabilities, including development dependencies, after compatible updates.
- Release validation: manifest version, standalone scripts, referenced assets, no eval, no source maps, and allowlisted ZIP contents passed.
- Independent UI source review: keyboard tooltip support, missing estimate states, item candidates and disclosure cues were corrected.
- Mechanical design check flagged HP width animation; changed to transform-based scaling. The recorded raw audit is retained in artifacts/design-audit.json.

The browser integration uses the real built scripts on an intercepted local fixture for the Showdown origin. It does not simulate Chrome installation or a live Showdown server. The subsequent live smoke test is documented in LIVE_SMOKE.md.

## Follow-up: compact sidebar, forms, and item estimates

- Sidebar reduced to 264px; scrollable body capped at 60vh / 580px. No full-page extension UI is shipped.
- Minior colors resolve to Core stats; Meteor keeps its separate stats and weight. Temporary own form changes survive base-species request refreshes. Opponent form changes and switching preserve learned moves/items while resetting boosts on switch.
- Item data regenerated from 20,000 full upstream teams, with 509 species and no unsampled roles. See ITEM_RESEARCH.md and src/data/item-sampling.json.
- 24 regression tests passed, including conditional item frequencies and Minior form transitions. Built-bundle integration remains passing.
