# Changelog

## 1.0.1

- Fix missing sidebar and unavailable damage estimates in battle rooms with Showdown's hidden-room suffix. Either player's settings can produce this room ID.
- Preserve tracked state when Showdown renames a room between public and hidden IDs.
- Handle hash-based battle routes alongside normal paths.
- Add regression coverage through both built scripts for hidden rooms, player 2, pre-request switches, room renaming, and move hover.

Update the unpacked extension, click its Reload button, then refresh Showdown. Updating files alone does not replace scripts already running in an open tab.

## 1.0.0 — initial local-test candidate

Compact whiteboard sidebar, outgoing and incoming damage estimates, form/status/item fixes, sampled item frequencies, local testing documentation and submission assets. Superseded by 1.0.1 because its room filter rejected hidden-room IDs.
