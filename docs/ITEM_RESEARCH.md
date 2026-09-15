# Gen 9 Random Battle items

Source: Pokémon Showdown commit `c23d2e942c9c0daadb13a7162a385bf78e3c9353`, checked September 14, 2026.

## What the generator does

Items are chosen by an ordered set of rules, not uniformly at random from an item pool. Species, role, selected moves, ability, lead position, and already-generated teammates affect the result. Some branches use random choices, such as eligible physical attackers receiving Band or Scarf. Earlier rules take priority.

[Item rules](https://github.com/smogon/pokemon-showdown/blob/c23d2e942c9c0daadb13a7162a385bf78e3c9353/data/random-battles/gen9/teams.ts#L1152) · [Set definitions](https://github.com/smogon/pokemon-showdown/blob/c23d2e942c9c0daadb13a7162a385bf78e3c9353/data/random-battles/gen9/sets.json)

## Reproducible sample

Generated 20,000 full teams (120,000 Pokémon slots), using seed `[2026,914,1729,4813]`. Full teams include lead and team-context effects, unlike the prior sampler's isolated randomSet calls with an empty team context. Counts below concern appearances of each species, not all slots.

| Pokémon / role | Observed items | Appearances |
| --- | --- | ---: |
| Ambipom / Fast Attacker | Choice Band 133 | 133 |
| Ambipom / Wallbreaker | Silk Scarf 149 | 149 |
| Electivire / Fast Attacker | Life Orb 121, Choice Scarf 11, Choice Band 8 | 140 |
| Electivire / Setup Sweeper | Life Orb 158 | 158 |
| Minior / Setup Sweeper | White Herb 264 | 264 |

Ambipom's overall split in this sample was 47% Band / 53% Silk Scarf. Double-Edge plus Fake Out triggers Silk Scarf before the generic item rules. Its Fast Attacker moves are physical attacks and its Speed is too high for the generic Scarf branch.

Electivire had Life Orb in 279/298 appearances (~94%). Its mixed attacking and Bulk Up sets reach the Life Orb rules. All-physical eligible sets can take Band or Scarf. Heavy-Duty Boots was not observed; the listed roles and typing do not meet the relevant Boots conditions. This finding differs from the user's recollection and is scoped to this upstream snapshot, not every past version or other random format.

Minior's Shell Smash triggers White Herb before the empty-item Acrobatics rule.

## Extension changes

The previous predictor ranked items by damage impact, so it preferred Band over more common items. It did not estimate likelihood. The new predictor totals full-team sample counts for surviving roles and filters to samples containing all revealed moves. Its selected item is stable across move categories. Confirmed removal overrides prediction, and no matching samples means unknown. A 100% sampled frequency is still labeled an assumption; rare possibilities can be missed.

The data stores observed item/move combinations per role. The UI exposes sample size and frequency in the estimate's assumptions. These are empirical frequencies, not exact live-server probabilities. Revealed ability, team composition, Tera, and turn-by-turn likelihood are not fully conditioned beyond the existing role elimination.

Regenerate with a built Showdown checkout:

```sh
SHOWDOWN_PATH=/path/to/pokemon-showdown npm run sync-sets
```

Upstream changes require a new build and extension update; runtime does not fetch code or data.
