# Fortnite 2D

A 2D pixel-art reinterpretation of Fortnite built with **Phaser 3 + TypeScript + Vite**.

## Run

```bash
npm install
npm run dev
```

Then open the forwarded browser port (default `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

## Gameplay

A solo battle-royale island translated into 2D side-view pixel art:

- **Movement** — acceleration-based run/sprint/jump/crouch, Fortnite-style game feel
- **Combat** — hitscan and projectile weapons with rarity tiers, bloom/recoil, headshots, reloads, ammo
- **Building** — wall / floor / ramp pieces with grid snapping, placement validation, resource costs, destructible HP
- **Harvesting** — trees (wood), rocks (stone), cars (metal) with pickaxe and resource popups
- **Loot** — floor loot, chests, ammo crates, rarity-colored pickups
- **HUD/UI** — Fortnite-style segment health/shield, hotbar, resources, ammo, kill feed, minimap, storm circle
- **Storm** — a closing storm circle with phase-based damage
- **Solo vs AI** — 12 hunting bots; last one standing wins

## Controls

| Key | Action |
|-----|--------|
| A / D / ← / → | Move |
| Space / W / ↑ | Jump |
| Shift | Sprint |
| C / Ctrl | Crouch |
| Mouse | Aim + Fire |
| R | Reload |
| 1–5 | Hotbar slots |
| B / Q | Build mode |
| Q / E | Toggle build piece (in build mode) |
| F | Cycle build material (in build mode) |
| E | Interact / pick up |
| Esc | Pause |

## Structure

```
src/art/       procedural pixel-art sprites (characters, weapons, builds, environment)
src/data/      weapon / item / material definitions
src/objects/   player & enemy logic
src/scenes/    boot, asset, menu, game, game-over scenes
src/systems/   audio synth, world generation
src/ui/        Fortnite-style HUD
docs/          reference analysis & design decisions
```

All sprites, textures, effects, and audio are generated procedurally at runtime — no external asset files are required.