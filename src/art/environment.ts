import { Pixmap, c } from '../utils/pixmap';

export const TILE = 64;

export function buildTileset(scene: Phaser.Scene) {
  const grass = new Pixmap(TILE, TILE);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const base = 88 + ((x * 7 + y * 13) % 14);
      grass.set(x, y, c(66 + base * 0.16, 118 + base * 0.24, 60 + base * 0.1));
    }
  }
  // mottled patches
  for (let i = 0; i < 26; i++) {
    const x = (i * 37) % TILE;
    const y = (i * 23) % TILE;
    grass.circle(x, y, 2 + (i % 3), c(78, 140, 66));
    grass.circle((x + 31) % TILE, (y + 17) % TILE, 1 + (i % 2), c(112, 168, 86));
  }
  scene.textures.addCanvas('t_grass', grass.toCanvas(1));

  const dirt = new Pixmap(TILE, TILE);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const v = ((x * 7 + y * 11) % 12);
      dirt.set(x, y, c(120 + v * 1.5, 90 + v, 52 + v * 0.6));
    }
  scene.textures.addCanvas('t_dirt', dirt.toCanvas(1));

  const sand = new Pixmap(TILE, TILE);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const v = ((x * 5 + y * 9) % 10);
      sand.set(x, y, c(200 + v * 1.2, 182 + v, 118 + v));
    }
  scene.textures.addCanvas('t_sand', sand.toCanvas(1));

  const water = new Pixmap(TILE, TILE);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const v = ((x * 9 + y * 13) % 8);
      const wave = (x + y * 0.4) % 16;
      const lite = wave < 3;
      water.set(x, y, c((lite ? 70 : 52) + v, (lite ? 128 : 108) + v, (lite ? 190 : 168) + v));
    }
  scene.textures.addCanvas('t_water', water.toCanvas(1));

  // stone platform top + body (for POIs / cliffs)
  const stoneTop = new Pixmap(TILE, 24);
  stoneTop.rect(0, 0, TILE, 24, 0x9ba0a8);
  stoneTop.rect(0, 20, TILE, 4, 0x7a7f88);
  for (let x = 0; x < TILE; x += 8) stoneTop.rect(x, 22, 4, 2, 0x676c74);
  scene.textures.addCanvas('t_stoneTop', stoneTop.toCanvas(1));

  const stoneBody = new Pixmap(TILE, TILE);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const v = ((x * 13 + y * 7) % 16);
      stoneBody.set(x, y, c(124 + v * 0.8, 128 + v * 0.8, 138 + v * 0.8));
    }
  for (let i = 0; i < 20; i++) {
    const x = (i * 29) % TILE;
    const y = (i * 41) % TILE;
    stoneBody.set(x, y, 0x7a7f88);
    stoneBody.set((x + 5) % TILE, (y + 3) % TILE, 0xb6bac4);
  }
  scene.textures.addCanvas('t_stoneBody', stoneBody.toCanvas(1));

  const clayTop = new Pixmap(TILE, 24);
  clayTop.rect(0, 0, TILE, 24, 0x9c6a3a);
  clayTop.rect(0, 20, TILE, 4, 0x77491f);
  for (let x = 0; x < TILE; x += 8) clayTop.rect(x, 22, 4, 2, 0x5e3a18);
  scene.textures.addCanvas('t_clayTop', clayTop.toCanvas(1));

  const clayBody = new Pixmap(TILE, TILE);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const v = ((x * 11 + y * 17) % 14);
      clayBody.set(x, y, c(140 + v, 96 + v * 0.6, 52 + v * 0.4));
    }
  scene.textures.addCanvas('t_clayBody', clayBody.toCanvas(1));

  const woodBody = new Pixmap(TILE, TILE);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const plank = Math.floor(x / 8) % 2;
      woodBody.set(x, y, plank ? c(146, 104, 58) : c(132, 92, 50));
    }
  for (let y = 0; y < TILE; y += 2) woodBody.rect(0, y, TILE, 1, 0x5e3c20);
  scene.textures.addCanvas('t_woodBody', woodBody.toCanvas(1));

  const woodTop = new Pixmap(TILE, 12);
  woodTop.rect(0, 0, TILE, 12, 0x6a4426);
  woodTop.rect(0, 0, TILE, 3, 0xa47040);
  scene.textures.addCanvas('t_woodTop', woodTop.toCanvas(1));

  const roof = new Pixmap(TILE, 12);
  roof.rect(0, 0, TILE, 12, 0x5e3c20);
  roof.rect(0, 0, TILE, 3, 0x8a5a30);
  for (let x = 0; x < TILE; x += 4) roof.rect(x, 4, 2, 4, 0x7a4e28);
  scene.textures.addCanvas('t_roof', roof.toCanvas(1));
}

export function buildTreeSprite(scene: Phaser.Scene, key: string, kind: 'oak' | 'pine' | 'palm'): void {
  const pm = new Pixmap(96, 140);
  if (kind === 'oak') {
    pm.rect(40, 96, 14, 40, 0x6b4426);
    pm.rect(38, 108, 4, 28, 0x5e3c20);
    pm.rect(52, 104, 4, 30, 0x7a5230);
    const blob: Array<[number, number, number, number, number]> = [
      [36, 56, 26, 26, 0x3e7a24],
      [58, 50, 24, 22, 0x4c8c2c],
      [48, 40, 22, 20, 0x5a9c34],
      [42, 62, 24, 22, 0x3a6e20],
      [56, 64, 20, 20, 0x559336],
      [46, 48, 18, 16, 0x67aa40],
    ];
    for (const [bx, by, rx, ry, col] of blob) pm.ellipse(bx, by, rx, ry, col);
    pm.ellipse(46, 42, 16, 12, 0x79bc4a);
    pm.ellipse(48, 82, 30, 6, 0x2c5318);
  } else if (kind === 'pine') {
    const tri = (cy: number, w: number, hgt: number, col: number) => {
      for (let y = 0; y < hgt; y++) {
        const t = y / hgt;
        const hw = Math.max(1, Math.round(w * (1 - t)));
        for (let x = -hw; x <= hw; x++) {
          const cc = Math.abs(x) === hw ? ((col & 0xfefefe) >> 1) : col;
          pm.set(48 + x, cy + y, cc);
        }
      }
    };
    tri(52, 14, 13, 0x2e6a1c);
    tri(62, 19, 13, 0x3a7a22);
    tri(72, 24, 13, 0x468c2c);
    tri(82, 29, 13, 0x549c34);
    pm.rect(44, 90, 8, 46, 0x6b4426);
    pm.rect(42, 98, 3, 38, 0x553318);
  } else {
    pm.line(46, 90, 52, 40, 0x8a6a3a);
    pm.line(47, 90, 53, 40, 0x7a5a30);
    pm.line(46, 90, 36, 40, 0x8a6a3a);
    pm.line(47, 90, 37, 40, 0x7a5a30);
    const fronds: Array<[number, number, number, number, number]> = [
      [52, 38, 26, -4, 0x3e8c28],
      [36, 38, -26, -4, 0x368026],
      [54, 40, 20, 12, 0x469832],
      [34, 40, -20, 12, 0x40902c],
      [44, 34, 0, -18, 0x52a03a],
    ];
    for (const [fx, fy, dx, dy, col] of fronds) {
      const steps = 14;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const x = Math.round(fx + dx * t);
        const y = Math.round(fy + dy * t);
        pm.circle(x, y, 2, col);
        if (i > 2) pm.circle(x + 1, y - 2, 1, 0x5cb042);
      }
    }
    pm.rect(60, 88, 10, 12, 0x5e3c20);
    pm.rect(34, 88, 8, 12, 0x77491f);
    pm.circle(46, 86, 3, 0x6b4426);
    pm.circle(42, 88, 3, 0x7a5230);
  }
  const cv = pm.toCanvas(1);
  scene.textures.addCanvas(key, cv);
}

export function buildRockSprite(scene: Phaser.Scene) {
  const pm = new Pixmap(64, 48);
  pm.ellipse(32, 40, 28, 12, 0x6a6f78);
  pm.ellipse(32, 36, 26, 20, 0x8a8f9a);
  pm.ellipse(28, 34, 14, 12, 0x9a9fa8);
  pm.ellipse(38, 38, 8, 7, 0x777c86);
  pm.ellipse(26, 26, 6, 5, 0xb0b5c0);
  pm.ellipse(35, 22, 5, 4, 0x9aa0ac);
  pm.ellipse(24, 42, 6, 4, 0x565b64);
  scene.textures.addCanvas('t_rock', pm.toCanvas(1));
}

export function buildBushSprite(scene: Phaser.Scene) {
  const pm = new Pixmap(48, 32);
  pm.ellipse(24, 28, 18, 8, 0x2e5c18);
  pm.ellipse(20, 24, 12, 10, 0x3e7a24);
  pm.ellipse(28, 24, 12, 10, 0x46832a);
  pm.ellipse(24, 20, 10, 8, 0x54903a);
  pm.circle(14, 14, 2, 0x7ab84a);
  pm.circle(10, 18, 2, 0x6aa842);
  pm.circle(30, 17, 2, 0x74b448);
  pm.circle(34, 21, 1, 0x84c458);
  scene.textures.addCanvas('t_bush', pm.toCanvas(1));
}

export function buildFlowerSprites(scene: Phaser.Scene) {
  const pm = new Pixmap(16, 20);
  pm.rect(7, 12, 2, 7, 0x3a7a22);
  pm.rect(6, 12, 1, 2, 0x2e6a1c);
  pm.circle(8, 8, 3, 0xf2e6a0);
  pm.set(6, 6, 0xfff0b0);
  pm.set(10, 6, 0xfff0b0);
  pm.set(6, 10, 0xfff0b0);
  pm.set(10, 10, 0xfff0b0);
  pm.set(8, 8, 0xe8a03a);
  scene.textures.addCanvas('t_flower_y', pm.toCanvas(1));

  const p2 = new Pixmap(16, 20);
  p2.rect(7, 12, 2, 7, 0x3a7a22);
  p2.circle(8, 8, 3, 0xf2a0a0);
  p2.set(6, 6, 0xffb4b4);
  p2.set(10, 6, 0xffb4b4);
  p2.set(6, 10, 0xffb4b4);
  p2.set(10, 10, 0xffb4b4);
  p2.set(8, 8, 0xd06050);
  scene.textures.addCanvas('t_flower_r', p2.toCanvas(1));
}

export function buildChestSprite(scene: Phaser.Scene) {
  const pm = new Pixmap(48, 40);
  pm.rect(6, 18, 36, 16, 0x7a4a22);
  pm.rect(6, 18, 36, 3, 0x9a6634);
  pm.rect(6, 14, 36, 5, 0x8a5a2a);
  pm.rect(6, 14, 36, 2, 0xa87442);
  pm.rect(9, 19, 30, 3, 0x5e3a1a);
  // lid band
  pm.rect(22, 13, 5, 5, 0xc9a020);
  pm.rect(23, 13, 3, 2, 0xe8c840);
  // side planks
  pm.rect(8, 24, 2, 8, 0x6b4426);
  pm.rect(38, 24, 2, 8, 0x6b4426);
  pm.rect(20, 24, 2, 8, 0x6b4426);
  scene.textures.addCanvas('t_chest', pm.toCanvas(1));
}

export function buildChestOpenSprite(scene: Phaser.Scene) {
  const pm = new Pixmap(48, 40);
  pm.rect(6, 22, 36, 12, 0x8a5a2a);
  pm.rect(6, 22, 36, 3, 0xa87442);
  // open lid tilted back
  pm.rect(6, 8, 36, 8, 0x8a5a2a);
  pm.rect(6, 8, 36, 2, 0xa87442);
  pm.rect(22, 10, 5, 6, 0xc9a020);
  // inner glow
  pm.rect(8, 24, 32, 6, 0xffe880);
  pm.set(12, 26, 0xffffff);
  scene.textures.addCanvas('t_chest_open', pm.toCanvas(1));
}

export function buildAmmoCrate(scene: Phaser.Scene) {
  const pm = new Pixmap(40, 34);
  pm.rect(8, 14, 24, 16, 0x9a8a5a);
  pm.rect(8, 14, 24, 3, 0xb8a86a);
  pm.rect(8, 14, 24, 1, 0xd8c888);
  pm.rect(12, 24, 5, 5, 0x3c3a30);
  pm.rect(23, 24, 5, 5, 0x3c3a30);
  // bullet icon
  pm.line(20, 18, 20, 21, 0xc9c020);
  pm.circle(20, 23, 2, 0xc9c020);
  scene.textures.addCanvas('t_ammocrate', pm.toCanvas(1));
}

export function buildVehicles(scene: Phaser.Scene) {
  // parked car - metal harvestable
  const pm = new Pixmap(96, 40);
  pm.rect(8, 18, 80, 18, 0xc0452a);
  pm.rect(8, 18, 80, 4, 0xe06040);
  pm.rect(20, 10, 52, 12, 0x2a6a9a);
  pm.rect(20, 10, 52, 3, 0x4a9ac8);
  pm.rect(24, 13, 14, 8, 0xa8d8e8);
  pm.rect(40, 13, 14, 8, 0xa8d8e8);
  pm.circle(22, 38, 7, 0x1c1c22);
  pm.circle(22, 38, 4, 0x44444e);
  pm.circle(74, 38, 7, 0x1c1c22);
  pm.circle(74, 38, 4, 0x44444e);
  pm.rect(6, 30, 3, 6, 0x8a2a18);
  pm.rect(88, 30, 3, 6, 0x8a2a18);
  scene.textures.addCanvas('t_car', pm.toCanvas(1));
}

export function buildCrateSprite(scene: Phaser.Scene) {
  const pm = new Pixmap(48, 40);
  pm.rect(10, 16, 28, 22, 0xb08858);
  pm.rect(10, 16, 28, 3, 0xd0a870);
  pm.line(10, 16, 38, 38, 0x8a6a3a);
  pm.line(38, 16, 10, 38, 0x8a6a3a);
  pm.line(24, 16, 24, 38, 0x8a5a3a);
  pm.line(10, 27, 38, 27, 0x8a5a3a);
  scene.textures.addCanvas('t_crate', pm.toCanvas(1));
}