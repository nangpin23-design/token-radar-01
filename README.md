# Token Radar — model radar-2

A token launch radar: it reads a sealed snapshot of every protocol DefiLlama tracks
(`input/snapshot.json`, fetched 2026-11-14), finds the ones that record no token yet,
ranks them by what their launch would be worth, and hands in a static dashboard that
shows the board, a detail view for each protocol and the steps to farm it.

## The value model (radar-2)

```
implied = TVL × 0.25 × growth × maturity × breadth × category
```

- **Base** — TVL × 0.25. The launch is worth a quarter of the value already locked.
- **Growth** — `1 + clamp(7d change, −60%, +120%) × 0.5` (0.70–1.60). A protocol whose
  TVL is growing is worth more than one the same size that is shrinking.
- **Maturity** — `0.6 + min(age, 3y) / 3y × 0.4` (0.60–1.00; unknown age counts as 365
  days). Longer with no token means longer to build the users a launch would pay.
- **Breadth** — `1 + 0.04 × extra chains, at most 4` (1.00–1.16). More chains, more users.
- **Category** — ×1.10 for user-facing apps (DEXs, lending, derivatives, yield, CDPs,
  prediction markets, RWAs and the like), ×0.90 for infrastructure and wrapped products
  (bridges, liquid staking, oracles, CEXs), ×1.00 otherwise — from the category's words,
  never from a protocol's name. No name is ever special-cased.

Every factor comes from the snapshot's own figures.

## The board

The board covers the snapshot's whole watchlist (40 protocols — the floor, never the
ceiling) and adds every pre-token protocol below the $50M floor that the field guide's
rule allows: no token recorded, no version marker in the name, no wrapped / staked /
staking word, no exchange-name prefix, and a category that is not Bridge, Canonical
Bridge, Liquid Staking, Liquid Restaking, Restaked BTC or CEX. That is 178 rows in
all (40 watchlist + 138 early). Protocols at or above the floor that the watchlist
leaves out stay out: the house's list is the authority there, because the one field it
used and this file does not carry — the parent protocol — is what leaves them out.

Live-token protocols are kept apart in the dashboard's Live token view, at the market's
own values, never mixed into the ranked board. "Records no token" means the snapshot
lists no market cap, no CoinGecko id and no symbol — not that the protocol has none.

## Farm plans

Each row carries six steps derived from the protocol's own record (category, chains,
TVL, age): a fresh wallet, the main action, a weekly action, a hold of 30–60 days, a
second-chain step (or a points-page check for single-chain protocols), and a safe-claim
step with a farm log. Each step states what it costs and how long it takes.

## Run it

```
node main.ts --input <snapshot.json|directory>   # writes /output (or $MAKEFUN_OUTPUT_DIR)
```

`main.ts` is Node 22, standard library only — nothing is installed. It writes
`board.json`, `data.js`, copies `dashboard/` and `screenshots/`, and writes
`dossier.json` with the vendored `vendor/makefun-board.ts` library. It is
deterministic: two runs write the same bytes.

View the dashboard by opening `dashboard/index.html` beside `data.js` (for example,
serve the output directory and open it in a browser). Hash routes: `#board`,
`#detail=<slug>`, `#live`, `#filter=<category>`, `#search=<text>`.
