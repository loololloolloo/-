import Phaser from 'phaser';
import { Pixmap, c } from '../utils/pixmap';

export const TILE = 64;
export const WORLD_TILES_W = 240;
export const WORLD_TILES_H = 60;
export const WORLD_W = WORLD_TILES_W * TILE;
export const WORLD_H = WORLD_TILES_H * TILE;

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SolidDef extends AABB {
  material?: 'wood' | 'stone' | 'metal';
  isBuild?: boolean;
  hp?: number;
  maxHp?: number;
  buildT?: number;
  maxBuildT?: number;
  brickId?: number;
}

export interface HarvestableDef {
  x: number;
  y: number;
  kind: 'tree_oak' | 'tree_pine' | 'tree_palm' | 'rock' | 'bush' | 'car' | 'crate' | 'ammocrate' | 'flower';
  resource: 'wood' | 'stone' | 'metal' | 'none';
  hp: number;
  maxHp: number;
  scale?: number;
  id: number;
}

export interface ChestDef {
  x: number;
  y: number;
  tier: 1 | 2 | 3;
  id: number;
  loot?: FloorLootDef[];
}

export interface FloorLootDef {
  x: number;
  y: number;
  weaponId?: string;
  rarity: string;
  kind: 'weapon' | 'consumable';
  consumableId?: string;
  count?: number;
  id: number;
}

export interface EnemySpawnDef {
  x: number;
  y: number;
  skin: 'bandit' | 'reaper' | 'royale';
  weaponId: string;
  rarity: string;
  patrol: number;
}

export interface WorldData {
  h: Int16Array;
  chunks: Phaser.GameObjects.Image[];
  solids: SolidDef[]; // solid build props + POI walls
  platforms: AABB[]; // jump-through platforms
  harvestables: HarvestableDef[];
  chests: ChestDef[];
  floorLoot: FloorLootDef[];
  enemySpawns: EnemySpawnDef[];
  playerSpawn: { x: number; y: number };
  waterSurface: number;
  idCounter: number;
}

export function groundAt(data: WorldData, x: number): number {
  const i = Math.max(0, Math.min(WORLD_W - 1, Math.round(x)));
  return data.h[i];
}

const CTL: Array<[number, number]> = [
  [-8, 54],
  [2, 46],
  [10, 40],
  [20, 35],
  [34, 33],
  [48, 34],
  [58, 31],
  [70, 33],
  [82, 31],
  [92, 33],
  [100, 38],
  [103, 47],
  [107, 38],
  [110, 47],
  [113, 38],
  [120, 30],
  [130, 24],
  [138, 28],
  [150, 36],
  [160, 32],
  [174, 32],
  [184, 34],
  [196, 28],
  [210, 31],
  [222, 36],
  [230, 41],
  [238, 47],
  [248, 54],
];

function smoothHeight(tileX: number): number {
  const n = CTL.length;
  if (tileX <= CTL[0][0]) return CTL[0][1];
  if (tileX >= CTL[n - 1][0]) return CTL[n - 1][1];
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = CTL[i];
    const [x1, y1] = CTL[i + 1];
    if (tileX >= x0 && tileX <= x1) {
      const t = (tileX - x0) / (x1 - x0);
      return y0 + (y1 - y0) * (1 - Math.cos(t * Math.PI)) / 2;
    }
  }
  return 36;
}

function seededRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function addCanvas(scene: Phaser.Scene, pm: Pixmap, key: string): string {
  scene.textures.addCanvas(key, pm.toCanvas(1));
  return key;
}

export function generateWorld(scene: Phaser.Scene): WorldData {
  const rand = seededRand(20260913);
  const h = new Int16Array(WORLD_W);
  const waterLevel = 46 * TILE;
  for (let i = 0; i < WORLD_W; i++) {
    const colX = i / TILE;
    const base = smoothHeight(colX);
    const n1 = Math.sin(colX * 0.42) * 0.5 + Math.sin(colX * 0.13) * 0.9 + Math.sin(colX * 0.07) * 0.6;
    let hh = base + n1 * 0.7;
    if (colX > 56 && colX < 76) hh = hh * 0.4 + 32 * 0.6;
    if (colX > 158 && colX < 176) hh = hh * 0.4 + 32 * 0.6;
    h[i] = Math.round(hh * TILE);
  }

  const data: WorldData = {
    h,
    chunks: [],
    solids: [],
    platforms: [],
    harvestables: [],
    chests: [],
    floorLoot: [],
    enemySpawns: [],
    playerSpawn: { x: 15 * TILE, y: 0 },
    waterSurface: waterLevel,
    idCounter: 1,
  };

  renderTerrain(scene, data);
  populate(scene, data, rand);
  data.playerSpawn.y = groundAt(data, data.playerSpawn.x) - 90;
  return data;
}

function renderTerrain(scene: Phaser.Scene, data: WorldData) {
  const CHUNK_W = 1024;
  const CHUNK_H = 512;
  const minS = new Int16Array(WORLD_W);
  for (let i = 0; i < WORLD_W; i++) minS[i] = data.h[i];
  for (let cx = 0; cx < WORLD_W; cx += CHUNK_W) {
    for (let cy = 0; cy < WORLD_H; cy += CHUNK_H) {
      const chunkBot = cy + CHUNK_H;
      let rangeMinS = Infinity;
      for (let x = 0; x < CHUNK_W; x++) {
        const wx = cx + x;
        if (wx >= WORLD_W) break;
        rangeMinS = Math.min(rangeMinS, minS[wx]);
      }
      if (chunkBot <= rangeMinS) continue; // fully above terrain
      const pm = new Pixmap(CHUNK_W, CHUNK_H);
      for (let x = 0; x < CHUNK_W; x++) {
        const wx = cx + x;
        if (wx >= WORLD_W) break;
        const g = minS[wx];
        for (let y = 0; y < CHUNK_H; y++) {
          const wy = cy + y;
          const depth = wy - g;
          if (depth >= -14) {
            if (depth < 0) {
              pm.set(x, y, grassFringe(depth, wx));
            } else {
              pm.set(x, y, terrainColor(depth, x, y));
            }
          }
        }
      }
      const key = `chunk_${cx}_${cy}`;
      scene.textures.addCanvas(key, pm.toCanvas(1));
      const img = scene.add.image(cx + CHUNK_W / 2, cy + CHUNK_H / 2, key);
      img.setOrigin(0.5);
      img.setDepth(-20);
      data.chunks.push(img);
    }
  }
}

function grassFringe(depth: number, wx: number): number {
  const shades = [0x6cb850, 0x68b24c, 0x5aa442, 0x559c3a, 0x4f9634];
  return shades[Math.max(0, Math.min(4, (-depth >> 1) + (wx % 3)))];
}

function terrainColor(depth: number, x: number, y: number): number {
  const v = ((x * 7 + y * 13) % 12);
  if (depth < 24) {
    const shades = [0x4f9634, 0x56a03a, 0x4c8e2e, 0x5aa440, 0x54a03c, 0x509a36];
    return shades[(depth >> 2) % 6];
  }
  if (depth < 110) {
    const g = 0x7a5c3a - (depth - 24) * 0.5;
    return c(clamp255(g + v), clamp255(g - 10 - v * 0.6), clamp255(g - 26 - v * 0.8));
  }
  const s = 0x6a6a74 - (depth - 110) * 0.3;
  return c(clamp255(s + v * 0.5), clamp255(s + v * 0.5), clamp255(s + 10 + v));
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function populate(scene: Phaser.Scene, data: WorldData, rand: () => number) {
  const isWater = (x: number) => groundAt(data, x) > data.waterSurface - 3 * TILE;

  const forestZones: Array<[number, number]> = [
    [22, 52],
    [74, 96],
    [140, 158],
    [186, 220],
  ];
  const id = data.idCounter;
  let nid = id;
  const spawnHarvest = (hd: Omit<HarvestableDef, 'id' | 'maxHp'>, maxHpOverride?: number) => {
    data.harvestables.push({ ...hd, maxHp: maxHpOverride ?? hd.hp, id: nid++ });
  };
  for (let i = 0; i < 200; i++) {
    const tx = Math.round((rand() * (WORLD_TILES_W - 20) + 10) * TILE);
    if (isWater(tx)) continue;
    const inForest = forestZones.some(([a, b]) => tx >= a * TILE && tx <= b * TILE);
    if (!inForest && rand() > 0.42) continue;
    if ((tx > 57 * TILE && tx < 78 * TILE) || (tx > 159 * TILE && tx < 178 * TILE) || (tx > 125 * TILE && tx < 132 * TILE)) continue;
    const g = groundAt(data, tx);
    let blocked = false;
    for (const s of data.solids) {
      if (tx > s.x - 60 && tx < s.x + s.w + 60 && g > s.y - 30 && g < s.y + s.h + 30) { blocked = true; break; }
    }
    if (blocked) continue;
    let kind: HarvestableDef['kind'] = 'tree_oak';
    if (tx < 22 * TILE || tx > 220 * TILE) kind = 'tree_palm';
    else if (inForest) kind = rand() > 0.45 ? 'tree_oak' : 'tree_pine';
    spawnHarvest({ x: tx, y: g - 60, kind, resource: 'wood', hp: 300, scale: 0.85 + rand() * 0.5 });
  }

  const rockZones: Array<[number, number]> = [
    [124, 142],
    [28, 34],
    [78, 84],
  ];
  for (const [a, b] of rockZones) {
    for (let i = 0; i < 18; i++) {
      const tx = Math.round((a + rand() * (b - a)) * TILE);
      if (isWater(tx)) continue;
      const g = groundAt(data, tx);
      spawnHarvest({ x: tx, y: g - 22, kind: 'rock', resource: 'stone', hp: 260, scale: 0.9 + rand() * 0.7 });
    }
  }

  for (let i = 0; i < 160; i++) {
    const tx = Math.round((rand() * (WORLD_TILES_W - 16) + 8) * TILE);
    if (isWater(tx)) continue;
    const g = groundAt(data, tx);
    const kind = rand() > 0.45 ? 'bush' : 'flower';
    spawnHarvest({ x: tx, y: g - (kind === 'bush' ? 12 : 10), kind: kind as HarvestableDef['kind'], resource: 'none', hp: 30 });
  }

  for (let i = 0; i < 5; i++) {
    const tx = 58 * TILE + i * 100 + rand() * 40;
    const g = groundAt(data, tx);
    spawnHarvest({ x: tx, y: g - 16, kind: 'car', resource: 'metal', hp: 600 });
  }

  for (let i = 0; i < 18; i++) {
    const tx = Math.round((14 + rand() * 210) * TILE);
    if (isWater(tx)) continue;
    const g = groundAt(data, tx);
    const kind = i % 3 === 0 ? 'ammocrate' : 'crate';
    spawnHarvest({ x: tx, y: g - 18, kind: kind as HarvestableDef['kind'], resource: kind === 'ammocrate' ? 'none' : 'wood', hp: 140 });
  }

  data.idCounter = nid;

  buildHouse(scene, data, 60, 31, 8, 5, 'wood');
  buildHouse(scene, data, 70, 32, 6, 4, 'clay');
  buildHouse(scene, data, 161, 32, 7, 6, 'wood');
  buildHouse(scene, data, 169, 32, 6, 8, 'stone');
  buildHouse(scene, data, 166, 32, 4, 5, 'wood');
  buildHouse(scene, data, 52, 34, 4, 4, 'wood');

  buildWatchtower(scene, data, 76, 31);
  buildWatchtower(scene, data, 128, 24);
  buildWatchtower(scene, data, 190, 28);
  buildLakeIsland(scene, data);

  const pushChest = (tx: number, ty: number, tier: 1 | 2 | 3) => {
    if (tx < 0 || ty < 0 || isWater(tx)) return;
    data.chests.push({ x: tx, y: ty, tier, id: data.idCounter++ });
  };
  const spots: Array<[number, number, 1 | 2 | 3]> = [
    [62.5, 29.5, 2],
    [63.8, 29.5, 2],
    [71.5, 30.5, 1],
    [76.3, 27.8, 2],
    [128.3, 21.8, 2],
    [108.0, 41.8, 3],
    [162.8, 26.8, 3],
    [170.6, 24.2, 3],
    [167.6, 28.5, 2],
    [192.3, 25.2, 2],
    [53.5, 32.4, 1],
    [60.0, 25.2, 2],
  ];
  for (const [sx, sy, tier] of spots) {
    pushChest(sx * TILE, sy * TILE, tier);
  }

  const floors: Array<[number, number, string, string]> = [
    [17, 32.2, 'pistol', 'common'],
    [22, 32.4, 'smg', 'common'],
    [28, 31.2, 'assault', 'uncommon'],
    [32, 31.4, 'shotgun', 'uncommon'],
    [45, 32.2, 'sniper', 'rare'],
    [90, 29.4, 'assault', 'rare'],
    [104, 33.2, 'smg', 'uncommon'],
    [118, 28.8, 'rocket', 'epic'],
    [136, 22.4, 'sniper', 'epic'],
    [156, 33.2, 'shotgun', 'rare'],
    [182, 32.2, 'assault', 'epic'],
    [214, 29.2, 'smg', 'rare'],
    [60, 29.2, 'bandage', 'common'],
    [84, 29.4, 'shieldpot', 'common'],
    [120, 26.4, 'medkit', 'common'],
    [170, 30.2, 'slurp', 'common'],
  ];
  for (const [tx, gy, wid, rar] of floors) {
    const cx = tx * TILE;
    if (isWater(cx)) continue;
    const isWeapon = ['pistol', 'smg', 'assault', 'shotgun', 'sniper', 'rocket'].includes(wid);
    data.floorLoot.push({
      x: cx,
      y: gy * TILE,
      weaponId: isWeapon ? wid : undefined,
      rarity: rar,
      kind: isWeapon ? 'weapon' : 'consumable',
      consumableId: isWeapon ? undefined : wid,
      count: isWeapon ? undefined : wid === 'bandage' ? 5 : wid === 'shieldpot' ? 2 : 1,
      id: data.idCounter++,
    });
  }

  const enemies: Array<[number, number, string, string, string, number]> = [
    [26, 32.8, 'bandit', 'pistol', 'common', 3],
    [30, 32.6, 'bandit', 'pistol', 'common', 3],
    [38, 33.4, 'bandit', 'smg', 'uncommon', 3],
    [47, 32.2, 'bandit', 'assault', 'common', 4],
    [61, 30.2, 'reaper', 'assault', 'uncommon', 4],
    [72, 31.2, 'reaper', 'shotgun', 'rare', 3],
    [85, 29.4, 'bandit', 'smg', 'common', 4],
    [96, 31.4, 'reaper', 'assault', 'uncommon', 5],
    [116, 28.4, 'reaper', 'sniper', 'rare', 5],
    [129, 22.4, 'royale', 'rocket', 'epic', 4],
    [168, 30.2, 'royale', 'assault', 'epic', 5],
    [197, 26.4, 'reaper', 'sniper', 'epic', 5],
    [207, 29.2, 'royale', 'shotgun', 'rare', 4],
    [178, 30.4, 'bandit', 'assault', 'common', 3],
    [134, 26.4, 'royale', 'smg', 'rare', 4],
  ];
  for (const [etx, , skin, w, r, pr] of enemies) {
    const x = etx * TILE + rand() * 20 - 10;
    const g = groundAt(data, x);
    data.enemySpawns.push({ x, y: g - 20, skin: skin as EnemySpawnDef['skin'], weaponId: w, rarity: r, patrol: pr * TILE });
  }
  data.idCounter = nid;
}

function buildHouse(scene: Phaser.Scene, data: WorldData, gxTile: number, gyTile: number, w: number, h: number, mat: string) {
  const W = w * TILE;
  const x0 = gxTile * TILE - W / 2;
  const ground = groundAt(data, gxTile * TILE);
  const wallH = h * 36 + 20;
  const topY = ground - wallH;
  data.solids.push({ x: x0, y: topY, w: 14, h: wallH, material: 'wood' });
  data.solids.push({ x: x0 + W - 14, y: topY, w: 14, h: wallH, material: 'wood' });
  data.solids.push({ x: x0, y: topY - 20, w: W, h: 20, material: mat === 'stone' ? 'stone' : 'wood' });

  const H = wallH + 40;
  const pm = new Pixmap(W + 2, H + 2);
  const wallColor = mat === 'wood' ? 0x9a6a3a : mat === 'stone' ? 0x8a8890 : 0xb08050;
  pm.rect(0, 40, W, wallH - 16, wallColor);
  if (mat === 'wood') {
    for (let fx = 6; fx < W; fx += 18) pm.line(fx, 42, fx, H - 20, 0x7a5030);
  } else if (mat === 'stone') {
    for (let y = 44; y < H - 18; y += 8) pm.line(2, y, W - 2, y, 0x6e6a74);
  }
  const roofH = 34;
  for (let y = 0; y < roofH; y++) {
    const t = y / roofH;
    const inset = Math.round(t * (W / 2 - 10));
    pm.rect(inset + 4, y, W - inset * 2, 2, 0x5e3c20);
    pm.set(Math.round(W / 2), y, 0x7a4e28);
  }
  pm.rect(0, 30, 6, roofH - 20, 0x4a2e14);
  const win = 0x8ad4e8;
  if (W > 220) {
    pm.rect(30, wallH - 66, 30, 40, win);
    pm.rect(30, wallH - 68, 30, 3, 0xd0f0f8);
    pm.rect(W - 60, wallH - 66, 30, 40, win);
    pm.rect(W - 60, wallH - 68, 30, 3, 0xd0f0f8);
  } else {
    pm.rect(24, wallH - 60, 30, 40, win);
    pm.rect(24, wallH - 62, 30, 3, 0xd0f0f8);
  }
  const doorX = Math.round(W / 2 - 12);
  pm.rect(doorX, wallH - 40, 24, 40, 0x3c301e);
  pm.rect(doorX + 18, wallH - 24, 3, 3, 0xe0b040);
  const key = `bldg_${gxTile}_${gyTile}`;
  scene.textures.addCanvas(key, pm.toCanvas(1));
  const img = scene.add.image(x0 + W / 2, topY + (wallH + 34) / 2 - 4, key);
  img.setOrigin(0.5, 0.52);
  img.setDepth(-4);
  data.chests.push({ x: x0 + W * 0.32, y: ground - 16, tier: h > 5 ? 2 : 1, id: data.idCounter++ });
}

function buildWatchtower(scene: Phaser.Scene, data: WorldData, gxTile: number, gyTile: number) {
  const x = gxTile * TILE;
  const g = groundAt(data, x);
  const wallH = 130;
  const x0 = x - 32;
  const topY = g - wallH;
  data.solids.push({ x: x0, y: topY, w: 10, h: wallH, material: 'wood' });
  data.solids.push({ x: x0 + 54, y: topY, w: 10, h: wallH, material: 'wood' });
  data.solids.push({ x: x0 - 14, y: topY - 18, w: 92, h: 18, material: 'wood' });

  const pm = new Pixmap(96, wallH + 34);
  pm.rect(0, 34, 10, wallH, 0x6b4426);
  pm.rect(78, 34, 10, wallH, 0x6b4426);
  pm.rect(0, 0, 88, 16, 0x8a5f34);
  pm.rect(4, 8, 80, 4, 0xb0844c);
  for (let i = 0; i < 12; i++) {
    const ly = wallH + 30 - i * 13;
    pm.rect(26, ly, 20, 2, 0x5e3c20);
  }
  pm.line(26, 40, 26, wallH + 30, 0x5e3c20);
  pm.line(46, 40, 46, wallH + 30, 0x5e3c20);
  const key = `tower_${gxTile}`;
  scene.textures.addCanvas(key, pm.toCanvas(1));
  const img = scene.add.image(x0 + 48, g - wallH / 2 + 8, key);
  img.setOrigin(0.5);
  img.setDepth(-4);
  data.chests.push({ x: x + 8, y: topY - 34, tier: 2, id: data.idCounter++ });
}

function buildLakeIsland(scene: Phaser.Scene, data: WorldData) {
  const cx = 108 * TILE;
  const islandTop = data.waterSurface - 26;
  const x0 = cx - 70;
  data.solids.push({ x: x0 + 10, y: islandTop - 40, w: 120, h: 40, material: 'stone' });
  data.solids.push({ x: cx + 65, y: islandTop + 6, w: 96, h: 14, material: 'wood' });

  const pm = new Pixmap(180, 100);
  pm.ellipse(90, 80, 88, 28, 0x8a6a3a);
  pm.ellipse(90, 56, 86, 46, 0x4ea24a);
  pm.ellipse(90, 40, 62, 28, 0x5cb04c);
  pm.ellipse(118, 44, 24, 14, 0x3a8c3a);
  scene.textures.addCanvas('lakeisland_tex', pm.toCanvas(1));
  const img = scene.add.image(x0 + 90, islandTop - 22, 'lakeisland_tex');
  img.setOrigin(0.5);
  img.setDepth(-4);
  data.chests.push({ x: x0 + 80, y: islandTop - 56, tier: 3, id: data.idCounter++ });
  const shoreX = 102 * TILE;
  const shoreY = groundAt(data, shoreX);
  data.platforms.push({ x: shoreX, y: shoreY - 10, w: cx - 60 - shoreX, h: 10 });
}