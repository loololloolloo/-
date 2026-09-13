import { Pixmap, c } from '../utils/pixmap';
import type { RarityKey } from '../data/weapons';

// Gun sprites are drawn facing RIGHT, ~48x18 px, at 2px per pixel (96x36 canvas nominal).
// Simpler: 48x18 px drawn 1:1 but displayed scaled.

const RAR_COLOR: Record<RarityKey, number> = {
  common: 0xb8b8b8,
  uncommon: 0x4fae3c,
  rare: 0x2f9bf4,
  epic: 0xb04cf0,
  legendary: 0xffc91a,
};

interface GunDraw {
  draw: (p: Pixmap, base: number, dark: number, light: number) => void;
}

function drawAssault(p: Pixmap, base: number, dark: number, light: number) {
  // receiver
  p.rect(14, 8, 20, 8, base);
  p.rect(14, 8, 20, 2, light);
  p.rect(12, 10, 4, 6, base);
  p.rect(12, 10, 2, 1, light);
  // barrel
  p.rect(30, 10, 14, 3, dark);
  p.rect(30, 10, 14, 1, 0x22262e);
  // mag
  p.rect(20, 16, 5, 6, dark);
  p.rect(20, 16, 5, 1, base);
  // stock
  p.rect(6, 10, 8, 5, dark);
  p.rect(6, 10, 8, 1, base);
  // grip
  p.rect(22, 16, 3, 4, dark);
  // sight
  p.rect(20, 6, 3, 3, dark);
  p.rect(21, 5, 2, 2, light);
}

function drawPistol(p: Pixmap, base: number, dark: number, light: number) {
  p.rect(12, 10, 16, 7, base);
  p.rect(12, 10, 16, 2, light);
  p.rect(26, 11, 10, 4, dark);
  p.rect(26, 11, 10, 1, 0x22262e);
  p.rect(16, 17, 4, 6, dark);
  p.rect(16, 17, 4, 1, base);
  p.rect(20, 17, 2, 5, dark);
  p.rect(15, 7, 3, 3, dark);
}

function drawShotgun(p: Pixmap, base: number, dark: number, light: number) {
  p.rect(14, 8, 22, 9, base);
  p.rect(14, 8, 22, 2, light);
  p.rect(34, 10, 12, 6, dark); // pump tube
  p.rect(34, 10, 12, 2, 0x22262e);
  p.rect(30, 10, 6, 7, dark);
  p.rect(30, 11, 6, 2, base);
  p.rect(16, 17, 7, 5, base);
  p.rect(16, 17, 7, 1, light);
  p.rect(24, 18, 3, 4, dark);
  p.rect(8, 9, 6, 8, base);
  p.rect(10, 9, 3, 1, light);
  // lever
  p.rect(16, 12, 4, 4, dark);
}

function drawSMG(p: Pixmap, base: number, dark: number, light: number) {
  p.rect(10, 10, 22, 7, base);
  p.rect(10, 10, 22, 2, light);
  p.rect(30, 11, 12, 3, dark);
  p.rect(30, 11, 12, 1, 0x22262e);
  p.rect(16, 17, 5, 5, dark);
  p.rect(16, 17, 5, 1, base);
  p.rect(22, 17, 3, 4, dark);
  p.rect(6, 12, 5, 4, dark);
  // front grip
  p.rect(32, 14, 2, 4, dark);
  // stock
  p.rect(4, 10, 6, 3, dark);
  p.rect(4, 10, 1, 4, base);
}

function drawSniper(p: Pixmap, base: number, dark: number, light: number) {
  p.rect(14, 8, 26, 8, base);
  p.rect(14, 8, 26, 2, light);
  p.rect(38, 10, 16, 3, dark);
  p.rect(38, 10, 16, 1, 0x22262e);
  p.rect(20, 17, 6, 6, dark);
  p.rect(20, 17, 6, 1, base);
  p.rect(6, 8, 8, 6, dark);
  p.rect(6, 8, 8, 1, base);
  p.rect(22, 4, 6, 4, base); // scope
  p.rect(22, 5, 6, 2, 0x22262e);
  p.rect(23, 4, 2, 1, light);
  p.rect(24, 7, 2, 1, light);
}

function drawRocket(p: Pixmap, base: number, dark: number, light: number) {
  p.rect(12, 9, 24, 9, base);
  p.rect(12, 9, 24, 2, light);
  p.rect(30, 10, 12, 7, dark); // tube
  p.rect(12, 11, 4, 6, dark); // handle
  p.rect(8, 12, 4, 5, base);
  p.rect(14, 18, 5, 5, dark); // grip
  p.rect(22, 4, 4, 4, dark); // sight
  p.rect(32, 17, 8, 1, 0x22262e);
}

const GUN_DRAWERS: Record<string, GunDraw> = {
  assault: { draw: drawAssault },
  pistol: { draw: drawPistol },
  shotgun: { draw: drawShotgun },
  smg: { draw: drawSMG },
  sniper: { draw: drawSniper },
  rocket: { draw: drawRocket },
};

export function buildWeaponSprites(scene: Phaser.Scene) {
  for (const [cat, { draw }] of Object.entries(GUN_DRAWERS)) {
    for (const rarity of Object.keys(RAR_COLOR) as RarityKey[]) {
      const p = new Pixmap(56, 26);
      const base = RAR_COLOR[rarity];
      const dark = ((base & 0xfefefe) >> 1) & 0xfefefe;
      const light = ((base & 0xfefefe) >> 1) | 0x808080;
      draw(p, base, (dark & 0xfefefe) | (base & 0x01010100), light);
      const key = `w_${cat}_${rarity}`;
      const cv = p.toCanvas(2);
      scene.textures.addCanvas(key, cv);
    }
  }
}

/** Pickaxe sprite - the harvesting tool shown as an icon and held item. */
export function buildPickaxeSprite(scene: Phaser.Scene) {
  const p = new Pixmap(48, 32);
  // handle
  p.line(10, 4, 30, 26, 0x8a6a3a);
  p.line(11, 4, 31, 26, 0x6a4f28);
  // head - curved pick blade
  p.line(4, 8, 14, 14, 0xc0b890);
  p.line(5, 14, 15, 18, 0xa8a078);
  p.line(8, 8, 16, 18, 0xc8c098);
  p.rect(6, 12, 12, 3, 0xd8d0a8);
  p.circle(8, 8, 2, 0xe8e0c0);
  p.rect(9, 15, 2, 2, 0x88804f);
  scene.textures.addCanvas('w_pickaxe', p.toCanvas(2));
}

export function buildHealSprites(scene: Phaser.Scene) {
  // bandage
  {
    const p = new Pixmap(22, 22);
    p.rect(4, 4, 14, 14, 0xe8e4dc);
    p.rect(4, 4, 14, 2, 0xffffff);
    p.line(4, 5, 18, 17, 0xb8b0a4);
    p.line(4, 10, 18, 10, 0xb8b0a4);
    p.line(11, 4, 11, 18, 0xb8b0a4);
    p.rect(3, 3, 16, 16, 0);
    scene.textures.addCanvas('i_bandage', p.toCanvas(2));
  }
  // medkit
  {
    const p = new Pixmap(24, 24);
    p.rect(4, 12, 14, 6, 0xdc4038);
    p.rect(4, 12, 14, 2, 0xff6a5a);
    p.rect(10, 4, 2, 22, 0xe8e4dc);
    p.rect(4, 14, 14, 2, 0xe8e4dc);
    scene.textures.addCanvas('i_medkit', p.toCanvas(2));
  }
  // small shield
  {
    const p = new Pixmap(18, 22);
    p.ellipse(9, 14, 6, 7, 0x2f9bf4);
    p.ellipse(9, 13, 5, 6, 0x6ac4ff);
    p.rect(7, 14, 4, 3, 0x2f9bf4);
    p.rect(8, 4, 2, 6, 0x9ad8ff);
    scene.textures.addCanvas('i_smallshield', p.toCanvas(2));
  }
  // shield potion
  {
    const p = new Pixmap(20, 24);
    p.rect(7, 6, 6, 5, 0x3a9adc);
    p.rect(9, 4, 2, 3, 0x6ac4ff);
    p.rect(6, 9, 8, 12, 0x2f9bf4);
    p.rect(7, 10, 6, 8, 0x6ac4ff);
    p.rect(7, 18, 6, 2, 0x1c5c8c);
    scene.textures.addCanvas('i_shieldpot', p.toCanvas(2));
  }
  // slurp juice
  {
    const p = new Pixmap(22, 26);
    p.rect(5, 6, 12, 7, 0x2a9a4a);
    p.rect(7, 4, 8, 3, 0x4ac86a);
    p.rect(5, 11, 12, 12, 0xaa3490);
    p.rect(6, 12, 10, 9, 0xe84ac0);
    p.rect(6, 21, 10, 2, 0x5a1470);
    p.rect(10, 10, 2, 8, 0xffffff);
    scene.textures.addCanvas('i_slurp', p.toCanvas(2));
  }
}

export function buildMaterialIcons(scene: Phaser.Scene) {
  // wood
  {
    const p = new Pixmap(20, 20);
    p.rect(4, 4, 12, 12, 0x9a6b3c);
    p.rect(4, 4, 12, 3, 0xc89a5c);
    p.rect(6, 12, 2, 4, 0x6b4426);
    p.rect(10, 12, 2, 4, 0x6b4426);
    scene.textures.addCanvas('m_wood', p.toCanvas(2));
  }
  // stone
  {
    const p = new Pixmap(20, 20);
    p.ellipse(10, 11, 7, 6, 0x9b9aa3);
    p.ellipse(8, 10, 4, 4, 0xc8c7cf);
    p.ellipse(12, 14, 3, 2, 0x66666f);
    p.ellipse(11, 9, 3, 3, 0xb0afb8);
    scene.textures.addCanvas('m_stone', p.toCanvas(2));
  }
  // metal
  {
    const p = new Pixmap(20, 20);
    p.rect(4, 8, 12, 8, 0x7f8b96);
    p.rect(4, 8, 12, 2, 0xb9c6d0);
    p.rect(5, 12, 3, 3, 0x47515c);
    p.rect(12, 12, 3, 3, 0x47515c);
    p.rect(8, 6, 4, 3, 0x47515c);
    scene.textures.addCanvas('m_metal', p.toCanvas(2));
  }
}

export function buildAmmoIcons(scene: Phaser.Scene) {
  const defs: Array<[string, number]> = [
    ['light', 0xc9a020],
    ['medium', 0x5aaa2a],
    ['shells', 0xd05030],
    ['heavy', 0xb04cf0],
    ['rockets', 0x66666a],
  ];
  for (const [name, col] of defs) {
    const p = new Pixmap(20, 20);
    if (name === 'rockets') {
      p.rect(7, 5, 6, 10, col);
      p.rect(7, 5, 6, 2, 0x88888c);
      p.rect(8, 15, 4, 3, 0xd05030);
      p.rect(8, 3, 4, 3, 0xd05030);
    } else {
      p.line(6, 6, 11, 11, col);
      p.line(8, 5, 13, 10, col);
      p.line(6, 5, 11, 10, col);
      p.circle(13, 13, 3, 0x3c3a30);
      p.circle(13, 13, 2, col);
    }
    scene.textures.addCanvas(`ammo_${name}`, p.toCanvas(2));
  }
}