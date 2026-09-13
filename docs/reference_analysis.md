# Reference Analysis

## Supplied Reference Material

| File | Kind | Contents |
|------|------|----------|
| `fortnite-select-mode.mp4` | Video (14.3s) | Mode-select / lobby UI loop. Blue mode-select screen with title text, game-mode cards, yellow accent bar bottom, dark navy background (#12172a). |
| `fortnite-cut-down-tree.mp4` | Video (≈9s) | Third-person gameplay harvesting a tree with a pickaxe. Shows island terrain, grass, drifting clouds, a big central tree, hotbar along the bottom, and vertical mode column on the right side. |
| `0xbdJiLA5K9QUN0vfl1gHQ.mp4` | Video (9s) | Third-person gameplay running over a grassy island: character moves across terrain, culminating in a woods/valley with a visible glider-skinned character (skin tones+green). |
| `Lobby (v39.00) webp` | Image 1918×1079 | Actual Fortnite v39 lobby: bottom nav bar (HOME/LOOT/BUILD/COMPETE), purple gradient center stage with a battle-pass character, white rounded button chips, player level badge top-left, V-Bucks gem top-right, mode-select cards in center. |
| `Archive.zip` (videos) | Screenshots? | Contains the two extracted gameplay videos. |
| `Archive (2).zip` (screenshots) | 3840×2160 PNG | battle-pass, build, compete, inventory, map, victory-royale, you-win — classic Fortnite HUD/menus. |
| `fortnite-map.png` | 3840×2160 | Full battle royale island map with inset mini-map and expanded map UI in inventory. |
| `fortnite-inventory.png` | 3840×2160 | Inventory grid + bottom HUD bar with 5 slots, resources, ammo; top-right large map. |
| `fortnite-build.png` | 3840×2160 | Building UI: bottom build bar with wall/floor/ramp icons, structure preview in world, materials counter top-right. |
| `fortnite-victory-royale.png` | 3840×2160 | Victory screen: "VICTORY ROYALE!" big centered text over scene. |
| `fortnite-you-win.png` | 3840×2160 | "YOU WIN" win screen. |
| `fortnite-battle-pass.png` | 3840×2160 | Battle-pass unlock screen with tier numbers and premium track. |
| `fortnite-compete.png` | 3840×2160 | Arena/compete menu. |

## Fortnite Gameplay Research

### Rarity Colors (verified across multiple sources)
Grey `#9fa3a6` Common / Green `#5b9b34` Uncommon / Blue `#2ba6f6` Rare / Purple `#a45ee6` Epic / Gold `#e9d710` Legendary.

Values are consistent across arenafps.com, fandom, quora gameplay communities, and official art.

### Weapon Damage (classic values, Ch1-style)
- Assault Rifle: 30 dmg common, +~1.4 per tier → 36 legendary. Rate 5.5/s, mag 30, headshot ×2 ≈ 4.5 DPS scaling.
- Pump Shotgun: 70 common → 110 epic/legendary; 0.7 fire cap, mag 5, high spread short range, stunning knockback feel.
- SMG: 13 common → 16 legendary, 8-15/s very high rate, mag 30, moderate spread.
- Sniper (Bolt): 105 rare → 116 legendary, 1 shot mag, 2.5x headshot, hitscan with scope sway, long reload.
- Pistol: 23-25 common, mag 16, fast.
- Rocket launcher: 100+2 self-damage area, 1 mag, slow reload — omitted from MVP or made rare pickup.

Tiers scale damage ~+8% per tier, reduced reload.

### Health / Shield
Players start 100 health + 0 shield. Shield (blue) absorbs first, then health (white). Max shield 100 in build mode. Overshield (50, chip-damage) exists in Zero Build only — we implement build mode so overshield omitted. Damage pipeline: shield → health; overflow carries (nothing wasted).

### Movement
- Walk speed ~ standard, run/sprint faster with stamina-like sprint meter in Zero-Build; in build mode classic movement had no fatigue but we add light sprint.
- Jump hold-to-higher (variable jump height), gravity unaffected by fall speed beyond terminal velocity; fall damage exists from high falls (~3 tiles+).
- Acceleration-based; instant direction flips are NOT authentic — movement eases with FPS-controlled help.
- Crouch reduces accuracy spread dramatically and lowers hitbox, slows walk.

### Building
- Pieces: Wall, Floor, Ramp (+ staircase in 3D; in 2D we use Wall, Floor/Platform, Ramp = floor + quarter-height step for traversal).
- Cost = 10 resources per piece regardless of material.
- Wood: min HP 100 → max 200; Stone(Brick) min 90 → max 300; Metal min 80 → max 400.
- Build time: newly placed structures start ~50% HP and "form up" over seconds (wood fastest, metal slowest).
- Structures can be damaged/destroyed; repair costs proportional.
- Max resources 999 each.

### Harvesting
- Pickaxe is the harvesting tool, also can damage builds (does 50 on hit, → 100 on weak-point).
- Objects: Trees (wood), Rocks (stone), Vehicles/cars (metal), plus pallets/fences.
- On destroy, resources pop out as small pickups with a "+10 Wood" popup.
- Blue weak-point circles multiply damage ×2.

### Loot
- Floor loot: small items glowing on the ground; walk over to auto-pickup (gun goes into hotbar).
- Chests: valuable loot in large numbers (supply), glowing gold, opening animation.
- Ammo boxes give ammo.
- Consumables: Bandages (+15 HP, 1s, heal to 75 max), Med Kit (+100 to full), Small Shield (+25), Shield Potion (+50).
- Hotbar: 5 slots; picking up a weapon when full auto-swaps the lowest-tier weapon / drops current.
- Slurp juice heals health+shield over time.

## Fortnite UI Research

### HUD Decoded From References
- **Health bar (white) + Shield bar (blue)**: left segment, main HP 100 in 10 segments of 10; two stacked blue bars above for shield (10-px segments).
- **Hotbar**: 5 slots bottom-center above bottom edge. Each slot a dark rounded square with 2px bevel border; 9th slot right edge holds inventory. Bottom-left of slot shows number key; bottom-right tiny ammo count.
- **Resources**: bottom-right corner above hotbar: Wood/Stone/Metal counters with tiny icons, vertical stack.
- **Ammo**: bottom-right with large magazine number and reserve under.
- **Kill feed** top-right; **minimap** top-right under killfeed or integral.
- **Eliminated / Victory** screens.
- **Extraction (Creative) top bar**: mode title bar at top center — we imitate with a game title bar in HUD.
- **Task/Loot prompt** bottom-center above hotbar: "Press [E] to pick up" / "Open Chest".

### Menus
- **Lobby**: bottom nav (HOME, LOOT, BUILD, COMPETE), purple/blue energy gradient stage, character with idle animations, top-left tab rail, top-right buttons (V-Bucks, Settings), center mode-select cards with white rounded buttons.
- **Pause/Game menu**: paper-doll-style list, settings, leave match.
- Buttons: white rounded-rect chips with dark text; highlights yellow (#e2b714) on hover/selection; disabled = greyed translucent.

### Visual Language
- Font: Burbank Big Condensed; heavy all-caps titles, bold sans lowercase buttons (we use "Luckiest Guy" + "Chakra Petch"/"Rajdhani" Google fonts as 2D stand-in).
- Accent colors: Fortnite Yellow `#E3B505` / `#FFEE00` (highlights), white panels at ~85% opacity, dark navy-blue `#0E1626`.
- Panels: square-corner or slight radius, 2px border, inner glows.
- Icons: flat, chunky, high-contrast silhouettes.

## Visual Analysis

### Selected details found by pixel analysis
- Screenshots are 4K renders of classic Fortnite UI (mostly Chapter 2/3 era).
- Mode-select video: dark navy bg `#12172a`, centered title, rows of mode cards, bottom yellow accent bar, blue "LAUNCH" pill button.
- Playback videos at 1920×1080 show gameplay with the hotbar at bottom spanning x≈254→1249 (width ~995px for 5 slots ≈ 199px per slot), dark rounded slots on semi-transparent black bar with 1px bevel.
- Tree-cutting frames drift clouds in sky, sunlit green island terrain, single large central tree harvested with pickaxe; resource popups float.
- Lobby reference (v39) is a goldmine: exact nav + battle pass marketing, purple sky island, marble stage.

### Character proportions (pixel-style translation)
- Head large (~30% of height), wide shoulders, bean-shaped legs, big feet; hands oversized; cartoon proportions.
- Default skin: Jonesy default with blue hoodie? References show multiple skins; we create the default "Agent"-style blue/teal hoodie fighter matching the v39 lobby character silhouette (dark jacket + lighter arms, neutral pants).

## Player Analysis
See above. Player has 6 animation states; move/sprint/jump/fall/land/aim/harvest/emote.

## Weapon Analysis
Detailed per-weapon tables in `src/data/weapons.ts`. All five rarities implemented with stat scaling.

## Building Analysis
3 pieces × 3 materials with proper costs, HP, build-up time, collision, and edit/destroy rates. Represented in 2D side-view:
- Wall = full tile (64×64)
- Floor = horizontal platform (64×16) at feet height (jump-through + standable)
- Ramp = 45° stair (64×64, 4 steps 16px tall)

Grid is 64px tiles. Preview ghost + validity tint colors match Fortnite (green = place, red = invalid).

## Inventory Analysis
5-slot hotbar modeled as array; pickups go to first empty slot or replace lowest-tier; ammo shown per slot bottom-right; consumables stack; drop with Q key; inventory hotkey toggles grid.

## Environment Analysis
Deliberate hand-rolled island (not random generation): grassy rolling hills, beach shoreline, built POIs:
— Pleasant Village (wooden houses, open field)
— Tilted Towers-style urban strip (guard AI)
— Loot Lake (central pond w/ island)
— Rocky Ridge (stone nodes, tactical heights)
Various trees, rocks, bushes, vehicles (metal), ammo crates, chests, supply drops.

## Animation Analysis
Frame timings for run 8f/cycle, walk 10f, idle 4f with breathing, jump/fall 3f, recoil 2f, harvest 4f, build pose 4f.

## Audio Analysis
All SFX synthesized via Web Audio API: gunshots (noise burst + thump), reload ticks, pickaxe clinks, building thuds, pickup chime, chest open arpeggio, storm wind, elimination jingle, music stingers. Keeps everything procedural, no licenses needed.

## External Fortnite Research
- Source 1: Fortnite Wiki (fandom) — Building, Materials, Health — costs 10/piece, HP ranges, damage pipeline.
- Source 2: arenafps.com BR weapon guide — classic weapon stats & accuracy behavior.
- Source 3: Multiple community/measurement threads on harvest rates & rarity colors.
- Source 4: Official Fortnite gameplay footage (lobby/hotbar/build modes) distilled into design file.
- Battle-pass / compete modes are cosmetic-only in the reference; we implement matchmaking-free solo play (no real economy).

## Implementation Decisions
- **Tech**: Phaser 3 + TypeScript + Vite (2D, no 3D). Arcade physics through custom AABB resolution for max control (Fortnite-like movement tuning requires custom accel/jump).
- **Camera**: zoomed pixel-perfect (16 world = 1 art px for UI, 8 for world), scrolls with lerp, small shake feedback.
- **Combat**: hitscan for all guns except rocket/GL (projectiles); headshot multiplier 2x; per-shot bloom increases during sustained fire; recoil raises gun & restores; crosshair expands to show bloom (Half-Life-style but chunky).
- **Building** is a true hotbar slot (Q or B key) with placement preview following grid, resource costs, and static-body collision + destructible HP.
- **DBNO**: single-player island fights "hunting bots" and last-standing wins → victory screen when all opposing players eliminated OR you're last alive in a storm-closing island.
- **Storm**: pre-defined island ring closes in phases; damage ticks 1/4/7/10 per sec based on phase.

## Intentional Simplifications
- No squad modes, no voice, no Battle Pass progression stored (visual homage only), no underwater, no vehicles with physics (parked metal cars as harvest/prop), no storm-circle "bus" deployment (we spawn with glider landing), no emotes beyond a mute pose, no crafting.
- Trees/rocks/cars harvest circulable, not buildable-over Terraria style.
- Boss AI is simple: patrol between waypoints, chase + shoot when in range, better aim by rarity.

## Unresolved Questions
- Exact classic damage numbers vary season to season; we anchor to classic (Ch1/Omni) values and mark them.
- Whether to include vehicles; resolved: no drivable vehicles in v1.
- Zero-Build oversehield: not included because building is core identity per directive.