# realm — live artwork scenes

`<RealmScene scene="background" | "secondary" | "ritual" | "gate" />` renders the realm
artworks as WebGL2 scenes instead of static images.

- Fire (braziers, torches, castle terrace): shader flames + heat shimmer + bloom + embers.
  Flames set `sharp: true` so they burn out of a bowl and never over its rim.
- Painted fire / lava / floor reflections: detected by colour, flickered with scrolling noise
- Lava falls, burning cloud seams: directional lava flow over the painted pixels
- Smoke: volumetric white smoke banks (ritual scene and the generic `Smoke` component)
- Painted fog (`fogFlow`, used by secondary + gate): the artwork's own clouds drift and billow
  in place via a flow-map. No extra smoke is added on top.
- Swords: incandescent blade, energy pulses hilt→tip, halo, tip flare
- Moon: smouldering surface + flame tongues; castle/mountains occlude it

All coordinates live in `scenes.ts` (artwork pixels). Props: `fixed`, `objectPosition`
(fractions, `[0.5, 0]` = center top; changing it does not rebuild the GPU context),
`scrim`, `intensity` (0 = plain image), `className`.
The WebGL context exists only while the scene is on or near the screen.
No WebGL2 -> plain image + the old CSS embers / canvas smoke.
