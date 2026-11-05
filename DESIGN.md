# Design

Visual world for ScaleQuest, chosen with the user from three directions (blueprint, control room, isometric toybox). The user picked the isometric toybox. Product truth lives in `PRODUCT.md`.

## Mode

Operate. A learner builds and tests an architecture, so scanability and consistency outrank expression. The toy world lives in the blocks, the roads and the level map; the surrounding panels stay quiet.

## Scene

A learner at a laptop, in a quiet moment, assembling a pipeline of chunky blocks on a warm tabletop. Daylight, light ground.

## Color

Committed palette, light ground, ink-tinted neutrals. Every neutral is tinted toward the plum ink; nothing is pure gray.

| Role | Token | Value |
|---|---|---|
| Ground | `--ground` | `#fbf1dc` |
| Sheet | `--paper`, `--paper-2` | `#fffaf0`, `#fff3dc` |
| Board floor | `--board` | `#f8ebca` |
| Ink, text | `--ink`, `--ink-2`, `--ink-3` | `#2b2140`, `#5a4f70`, `#6b6182` |
| Action | `--cobalt`, `--cobalt-ink` | `#3d5afe`, `#2a3fc4` |
| Danger | `--tomato`, `--tomato-ink` | `#e8603f`, `#b2391b` |
| Healthy | `--mint`, `--mint-ink` | `#36b18d`, `#0e7358` |
| Warning | `--sun`, `--sun-ink` | `#ffcc47`, `#7a5200` |

Each component kind owns one block color (client lilac-gray, rate limiter violet, load balancer cobalt, API tomato, cache sunflower, local data pink, database mint, replicas sky). Block colors identify, they never carry status. Status is carried by a text pill ("96% busy", "386% overloaded") and by the road color, always with words.

## Typography

- Display: Bricolage Grotesque, weights 700 and 800, tracking -0.015em to -0.035em, self-hosted from `public/fonts`.
- Body and UI: Figtree 400 to 800, self-hosted.
- Code and data samples only: the system monospace stack.
- Tabular figures on every metric, input and load pill.

## Shape and depth

Radii: 10, 16, 24 and 28px. Soft, blurred, ink-tinted shadows only (`--lift`, `--lift-high`). No hard offset shadows. Isometric thickness is drawn geometry (the level-map tile edge, the block faces), not a shadow.

## Signature elements

- **Isometric blocks** (`src/canvas/IsoBlock.tsx`): one drawn silhouette per component, two-tone faces, 1.6px ink outline. API servers and replicas stack to hint at instance count.
- **Dotted roads and packets** (`src/canvas/PacketEdge.tsx`): requests ride the roads after a simulation runs. Packets slow and turn tomato when the target is overloaded. Motion is skipped under `prefers-reduced-motion`.
- **Level map** (`.campaign-track`): one isometric tile per chapter joined by a dotted path; done tiles are mint, the active tile is cobalt and bobs.

## Rules

- No kicker above a heading. The level map carries chapter position.
- No unicode glyphs as icons; icons are drawn SVG (`src/ui/Icon.tsx`).
- One accent-filled button per view.
- Body copy 65ch or less, mission heading max 2.8rem, intro heading max 4.4rem.
- Contrast: ink on ground and sheet is above 4.5:1; status text uses the `-ink` shades, never the bright fills.
- Keyboard: every canvas action has a list-editor equivalent; focus ring is a 3px cobalt outline.

## Open items

- The 1M chapter canvas is dense (seven blocks). At narrow desktop widths the zoom drops and small labels are hard to read.
- A Hinglish explanation toggle is undecided (see `PRODUCT.md`).
