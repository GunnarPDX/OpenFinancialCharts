# Benchmarks

Manual performance/memory harnesses for the chart. Not part of the published
package or the test suite — run them after significant changes and compare
against the previous numbers.

All browser benchmarks run headless Chrome against the **production demo
build** served statically, using the deterministic `?bench` synthetic feed
(no network). Set `CHROME_PATH` if Chrome isn't at the default macOS path.

## Setup (browser + memory)

```sh
npm run build
cd build && python3 -m http.server 3462   # any static server on :3462
```

## compute.js — hot-path micro-benchmarks

Times every study's `compute()`, the side-profile bucketizers, tick folding
and a theta-script run over 780 / 5k / 20k bars. Needs the library build:

```sh
npm run build:lib
node bench/compute.js
```

## browser.js — render + interaction benchmarks

First-paint time, idle FPS, pan FPS (one keyboard pan dispatched per frame)
and JS heap across bare/heavy/zoomed/live-tick scenarios:

```sh
node bench/browser.js
```

## memory.js — leak check + allocation profile

Post-GC heap slope over 3-minute live-tick runs (flat slope = no leak;
`--expose-gc` is passed to Chrome automatically) plus a heap sampling
profile naming the top allocation sites:

```sh
node bench/memory.js
```

Reference numbers (2026-08, M-series MacBook): bare pan 115–120 fps at 5k
bars; post-GC heap 13–14 MB bare / ~31 MB heavy, flat; allocation churn
heavy+200tps ≈ 2 MB per 45s.
