import { Pixmap, c } from '../utils/pixmap';
import type { MaterialDef } from '../data/materials';

const TILE = 64;

export function buildWallTexture(scene: Phaser.Scene, mat: MaterialDef) {
  const p = new Pixmap(TILE, TILE);
  // frame
  p.rect(0, 0, TILE, 3, mat.light);
  p.rect(0, TILE - 3, TILE, 3, mat.dark);
  p.rect(0, 0, 3, TILE, mat.light);
  p.rect(TILE - 3, 0, 3, TILE, mat.dark);
  // panel style by material
  if (mat.key === 'wood') {
    for (let y = 6; y < TILE - 3; y += 10) {
      p.rect(6, y, TILE - 12, 8, 0x8a5f34);
      p.rect(6, y, TILE - 12, 2, 0xb0844c);
    }
    for (let x = 6; x < TILE - 6; x += 17) p.rect(x, 6, 2, TILE - 12, 0x6f4a28);
    // cross braces
    p.rect(6, 10, TILE - 12, 3, 0x5e3c20);
  } else if (mat.key === 'stone') {
    // brick pattern
    for (let y = 4; y < TILE - 3; y += 8) {
      const off = (Math.floor(y / 8) % 2) * 10;
      for (let x = -14 + off; x < TILE; x += 26) {
        p.rect(Math.max(3, x), y, 24, 7, 0x85828e);
        p.rect(Math.max(3, x), y, 24, 1, 0xaaa6b4);
        if (x >= 3) p.set(x, y + 4, 0x6a6674);
      }
    }
  } else {
    // metal corrugated
    for (let x = 3; x < TILE - 3; x += 6) {
      p.rect(x, 5, 3, TILE - 9, 0x8a98a6);
      p.rect(x, 5, 1, TILE - 9, 0xb9c6d0);
    }
    p.rect(6, 5, TILE - 12, 3, 0x64707c);
    for (let x = 6; x < TILE - 6; x += 18) p.rect(x, 24, 2, TILE - 30, 0x64707c);
  }
  // rivets / bolts
  for (let x = 6; x < TILE; x += 18) {
    p.set(x, 6, mat.light);
    p.set(x + 2, 6, mat.dark);
  }
  scene.textures.addCanvas(`b_wall_${mat.key}`, p.toCanvas(1));
}

export function buildFloorTexture(scene: Phaser.Scene, mat: MaterialDef) {
  const p = new Pixmap(TILE, 16);
  p.rect(0, 0, TILE, 3, mat.light);
  p.rect(0, 12, TILE, 4, mat.dark);
  p.rect(0, 1, TILE, 2, mat.color);
  if (mat.key === 'wood') {
    for (let x = 0; x < TILE; x += 8) p.rect(x, 4, 8, 8, (x / 8) % 2 ? 0x8a5f34 : 0x9a6f3c);
    p.line(0, 7, TILE, 7, 0x6f4a28);
  } else if (mat.key === 'stone') {
    for (let y = 4; y < 12; y += 4) p.line(3, y, TILE - 3, y, 0x6a6674);
  } else {
    for (let x = 8; x < TILE; x += 12) p.set(x, 6, 0x64707c);
  }
  scene.textures.addCanvas(`b_floor_${mat.key}`, p.toCanvas(1));
}

export function buildRampTexture(scene: Phaser.Scene, mat: MaterialDef) {
  const p = new Pixmap(TILE, TILE + 8);
  // diagonal steps: 4 quarter-tile steps
  const stepH = (TILE + 8) / 4;
  for (let s = 0; s < 4; s++) {
    const yTop = Math.round(s * stepH);
    const h = Math.round(stepH) + 2;
    const xStart = Math.round((s / 4) * TILE);
    const w = TILE - xStart;
    for (let j = yTop; j < yTop + h && j < TILE + 8; j++) {
      const t = (j - yTop) / stepH;
      const lineCol =
        j === yTop ? mat.light : j < yTop + 2 ? mat.color : mat.key === 'stone' ? 0x85828e : mat.color;
      for (let i = 0; i < w; i++) {
        // taper right edge to maintain ramp slant
        const edgeT = i / w;
        const yoff = Math.round(edgeT * stepH);
        if (j - yTop >= yoff && j - yTop < yoff + stepH) {
          continue;
        }
      }
      p.line(xStart + 1, j, TILE - 2, j, lineCol);
    }
  }
  // Instead of the loop above, draw clean solid steps
  const p2 = new Pixmap(TILE, TILE + 8);
  const sh = (TILE + 8) / 4;
  for (let s = 0; s < 4; s++) {
    const top = Math.floor(s * sh);
    const yTop = top;
    const hh = Math.floor(sh) + (s === 3 ? (TILE + 8) - Math.floor(3 * sh) : 0);
    const x0 = Math.floor((s / 4) * TILE);
    // fill triangle below the diagonal edge
    for (let y = yTop; y < yTop + hh; y++) {
      for (let x = x0; x < TILE; x++) {
        p2.set(x, y, mat.color);
      }
    }
  }
  // diagonal edge
  for (let stepIdx = 0; stepIdx < 5; stepIdx++) {
    const x = Math.round((stepIdx / 4) * TILE);
    const y = Math.round((stepIdx / 4) * (TILE + 8));
    p2.rect(x, y - 1, TILE - x, 2, mat.light);
    p2.rect(x, y + 1, TILE - x, 1, mat.dark);
  }
  // surface lines
  for (let i = 1; i < 4; i++) {
    const x = Math.round((i / 4) * TILE);
    p2.line(x, 0, x, TILE + 8, mat.dark);
  }
  scene.textures.addCanvas(`b_ramp_${mat.key}`, p2.toCanvas(1));
}

export function buildPieceIcons(scene: Phaser.Scene) {
  const icons: Array<[string, (p: Pixmap) => void]> = [
    [
      'ico_wall',
      (p) => {
        p.rect(3, 6, 14, 14, 0xb08858);
        p.rect(3, 6, 14, 2, 0xd4b888);
        p.rect(3, 6, 2, 14, 0x7a5a38);
        p.line(5, 12, 17, 6, 0x8a6a3a);
      },
    ],
    [
      'ico_floor',
      (p) => {
        p.rect(2, 12, 16, 6, 0xb08858);
        p.rect(2, 12, 16, 2, 0xd4b888);
        p.line(4, 18, 4, 12, 0x8a6a3a);
      },
    ],
    [
      'ico_ramp',
      (p) => {
        p.line(3, 18, 17, 4, 0x8a6a3a);
        p.rect(6, 12, 8, 3, 0xb08858);
        p.rect(11, 8, 7, 3, 0xb08858);
        p.rect(2, 16, 6, 3, 0xb08858);
        p.set(17, 4, 0xd4b888);
      },
    ],
  ];
  for (const [key, draw] of icons) {
    const p = new Pixmap(20, 20);
    draw(p);
    scene.textures.addCanvas(key, p.toCanvas(2));
  }
}

export function buildGlowDot(scene: Phaser.Scene) {
  // small 8x8 soft dot for pickups / muzzle flash
  const p = new Pixmap(16, 16);
  for (let y = -8; y < 8; y++) {
    for (let x = -8; x < 8; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d < 7) {
        const a = Math.max(0, 255 - (d / 7) * 255);
        p.set(x + 8, y + 8, (a << 24) | 0xffffff);
      }
    }
  }
  scene.textures.addCanvas('glow_dot', p.toCanvas(1));
}

export function buildMuzzle(scene: Phaser.Scene) {
  const defs: Array<[string, number]> = [
    ['m_light', 0xffe070],
    ['m_shell', 0xffc850],
    ['m_heavy', 0xff8040],
    ['m_rocket', 0xff5030],
  ];
  for (const [key, col] of defs) {
    const p = new Pixmap(16, 16);
    const r = ((col >>> 16) & 0xff) + 40;
    const g = ((col >>> 8) & 0xff) + 30;
    const b = (col & 0xff) + 10;
    for (let y = -7; y < 8; y++) {
      for (let x = -7; x < 8; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d < 7) {
          const a = Math.max(0, Math.round(255 - (d / 7) * 260));
          p.set(x + 8, y + 8, Math.min(255, a) << 24 | Math.min(255, r) << 16 | Math.min(255, g) << 8 | Math.min(255, b));
        }
      }
    }
    scene.textures.addCanvas(key, p.toCanvas(1));
  }
}

export function buildCrosshairShapes(scene: Phaser.Scene) {
  const p = new Pixmap(32, 32);
  // 4 dots in a plus pattern
  const draw = (x: number, y: number, col: number) => {
    p.set(x, y, col);
    p.set(x + 1, y, col);
    p.set(x, y + 1, col);
    p.set(x + 1, y + 1, col);
  };
  draw(14, 15, 0xffffff);
  draw(17, 15, 0xffffff);
  draw(15, 14, 0xffffff);
  draw(15, 17, 0xffffff);
  p.set(15, 15, 0xffffff);
  scene.textures.addCanvas('xhair', p.toCanvas(1));
}