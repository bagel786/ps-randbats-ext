# Screenshots and store assets

## Live Showdown captures

Use these 1280×800 captures of the actual extension for release review:

- [Sidebar](live/sidebar-1280x800.png)
- [Sidebar and outgoing move-hover estimate](live/move-hover-1280x800.png)

[Morpeko's form change](live/morpeko-hangry.png) is an additional live check. [result.json](live/result.json) records the smoke-test observations. The battle used two temporary test accounts; see [the smoke-test report](../docs/LIVE_SMOKE.md).

`live/initial-check.png` shows the earlier, larger panel and is retained as development evidence. Do not use it for the final listing.

## Illustrative previews

`whiteboard-desktop.png`, `whiteboard-mobile.png`, and `whiteboard-tooltip.png` come from the labeled development fixture in `preview/`. They are not live battle screenshots. Regenerate them with `npm run test:ui` while the Vite preview server is running.

## Store graphics

- [Small promotional image, 440×280](store/promo-440x280.png)
- [128px extension icon](../public/icons/icon128.png)
- [Source SVG mark](../public/icons/mark.svg)

`design-audit.json` retains the raw mechanical design check. Its width-animation finding was corrected with transform-based HP scaling, as documented in [validation](../docs/VALIDATION.md).
