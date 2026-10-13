# Colour contrast (WCAG 2.1 AA)

Ratios computed from the actual tokens (relative luminance, `(L1+0.05)/(L2+0.05)`). Panels are `rgba(8,4,5,0.82)`;
over the page background that is `#070405`, over the brightest red scene glow we use (`#5a0f16`) it is `#170608`
(the "worst" column). Normal text needs **≥ 4.5:1**, large text (≥ 24px, or ≥ 18.7px bold) and UI borders **≥ 3:1**.

| Foreground | Background | Ratio | Use |
|---|---|---|---|
| Ash `#E8E2DC` | page `#050505` | **15.9** | body text, headings |
| Ash `#E8E2DC` | panel `#070405` | **15.9** | text in panels |
| Ash `#E8E2DC` | panel worst `#170608` | **15.3** | text in panels over glow |
| Ash-dim `#B9B0A8` | panel | **9.6** (worst 9.2) | secondary text |
| Ash-mute `#9A918A` | panel | **6.6** (worst 6.4) | placeholders, captions |
| Crimson-text `#FF5A67` | panel | **6.7** (worst 6.5) | accent text, errors, links |
| White `#FFFFFF` | button `#C41423` | **6.05** | primary button label |
| White `#FFFFFF` | button hover `#E11D2E` | **4.75** | primary button hover |
| White `#FFFFFF` | deep red `#7A0A12` | **11.2** | badges on deep red |
| Ash `#E8E2DC` | deep red `#7A0A12` | **8.7** | chips on deep red |
| Black `#050505` | ash `#E8E2DC` | **15.9** | export card inverse text |
| Black `#050505` | `#FF5A67` | **6.7** | inverse accent |

**Not used for text:** crimson `#E11D2E` on dark is only **4.29:1** (fails 4.5), so it is reserved for borders, glow, rings
and large decorative shapes (UI components need 3:1: passes). All small red text uses `#FF5A67`.
Verdict colours (`KILL #ff8a93`, `PIVOT #ffd27a`, `BUILD #8ff0b4`) and the six stage colours are all ≥ 7:1 on the panel
and are always paired with text and an icon, never colour alone.
Engraved text (`#d9d2cb` with a dark top shadow) on the stone tones of the Gate is verified in Part 2 together with the scene.
