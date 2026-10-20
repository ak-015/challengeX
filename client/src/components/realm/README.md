# realm — live artwork scenes

`<RealmScene scene="background" | "secondary" />` renders realm-background / realm-secondary
as a WebGL2 scene instead of a static `<img>`.

- Fire (braziers, castle terrace): shader flames + heat shimmer + bloom + rising embers
- Painted fire / lava / floor reflections: detected by colour, flickered with scrolling noise
- Lava falls, burning cloud seams: directional lava flow over the painted pixels
- Fog: volumetric, 3 drifting layers, lit by the artwork's own light
- Swords: incandescent blade, energy pulses hilt→tip, halo, tip flare
- Moon: smouldering surface + flame tongues; castle/mountains occlude it

All coordinates live in `scenes.ts` (artwork pixels). Props: `fixed`, `objectPosition`
(`[0.5, 0]` = center top), `scrim`, `intensity` (0 = plain image), `className`.
No WebGL2 -> plain image + the old CSS embers / canvas smoke.
Render resolution adapts automatically; it pauses off-screen / in background tabs and
shows one still frame under `prefers-reduced-motion`.
