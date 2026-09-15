# Chrome Web Store listing draft

Name: PS Randbats Assistant

Short description: Minimal battle notes, damage estimates, and possible set tracking for Gen 9 Random Battles on Pokémon Showdown.

## Description

Keep your next turn in view. PS Randbats Assistant adds a compact whiteboard-style panel to Gen 9 Random Battles on play.pokemonshowdown.com.

- Hover or focus a move button for an outgoing damage estimate.
- Compare incoming damage from revealed and possible opposing moves.
- See observed stat boosts alongside the incoming estimates.
- Track revealed items, abilities, Tera types, and remaining possible sets.
- Expand move estimates to inspect assumptions, or collapse the board.

Battle information is processed locally. No analytics, ads, account, or remote code.

Estimates use bundled random-battle sets and @smogon/calc. Unknown items and abilities are assumptions, not revelations. Item assumptions use sampled Showdown team frequencies, narrowed by observed moves. Opponent HP is approximate. Some unusual battle mechanics are not yet modeled. Supports Gen 9 Random Battles singles on the official Showdown client; other formats, replays and spectator battles are outside this release's scope. Reload Showdown after installing, then start a new battle for complete tracking.

An independent fan project; not affiliated with Pokémon, Nintendo, Game Freak, The Pokémon Company, or Pokémon Showdown.

## Privacy dashboard

Single purpose: provide local damage estimates and possible-set tracking during Gen 9 Random Battles.

Site access justification: two content scripts read battle protocol in the official Showdown page and render local estimates. Access is restricted to https://play.pokemonshowdown.com/*.

Remote code: none. All JavaScript and data ship inside the extension.

Data: battle messages are processed locally in memory; no developer collection or transmission. Review the current dashboard wording against docs/PRIVACY.md before certifying disclosures.

## Reviewer instructions

1. Install the extension and reload https://play.pokemonshowdown.com/.
2. Start a new Gen 9 Random Battle (no extension-specific account is required).
3. Once both active Pokémon appear, inspect Battle notes.
4. Hover or keyboard-focus a damaging move. Inspect its damage estimate.
5. Expand possible opposing moves. After an opposing stat boost, verify the applied boost label and changed damage range.
6. Collapse and reopen the board using mouse or keyboard. Change Showdown room tabs; unrelated rooms should have no board.
