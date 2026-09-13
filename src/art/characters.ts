import { Pixmap, c } from '../utils/pixmap';

export type Skin = 'jonesy' | 'bandit' | 'reaper' | 'royale';

interface SkinPal {
  hair: number;
  hairDk: number;
  skin: number;
  skinDk: number;
  top: number;
  topDk: number;
  topLt: number;
  pants: number;
  pantsDk: number;
  boot: number;
  bag: number;
}

const SKINS: Record<Skin, SkinPal> = {
  jonesy: {
    hair: 0x6b4a2b,
    hairDk: 0x4d311a,
    skin: 0xf2c99a,
    skinDk: 0xd9a76f,
    top: 0x2f76c4,
    topDk: 0x1c4f8f,
    topLt: 0x5aa2e8,
    pants: 0xbc9268,
    pantsDk: 0x8a6a46,
    boot: 0x33302b,
    bag: 0x7a6a54,
  },
  bandit: {
    hair: 0x1c1c1c,
    hairDk: 0x0c0c0c,
    skin: 0xe8b888,
    skinDk: 0xc09060,
    top: 0x8a3a2a,
    topDk: 0x5c2418,
    topLt: 0xb05a48,
    pants: 0x4a4a52,
    pantsDk: 0x2e2e34,
    boot: 0x22222a,
    bag: 0x3a3a44,
  },
  reaper: {
    hair: 0x22262e,
    hairDk: 0x10141c,
    skin: 0xded6c8,
    skinDk: 0xb0a898,
    top: 0x9aa6b2,
    topDk: 0x66727e,
    topLt: 0xc8d4e0,
    pants: 0x525e6a,
    pantsDk: 0x36424e,
    boot: 0x242e38,
    bag: 0x45505c,
  },
  royale: {
    hair: 0x2a1f66,
    hairDk: 0x1a1244,
    skin: 0xf2c99a,
    skinDk: 0xd9a76f,
    top: 0x7b3fa0,
    topDk: 0x4f2670,
    topLt: 0xa87cc8,
    pants: 0x22262e,
    pantsDk: 0x14181e,
    boot: 0x10141c,
    bag: 0x8f6a2a,
  },
};

export const CHAR_W = 26;
export const CHAR_H = 34;

export type AnimName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'land'
  | 'hurt'
  | 'harvest'
  | 'build'
  | 'reload'
  | 'dead';

export interface AnimDef {
  name: AnimName;
  start: number;
  count: number;
  frameRate: number;
  repeat: number;
}

export const PLAYER_ANIMS: AnimDef[] = [
  { name: 'idle', start: 0, count: 2, frameRate: 2, repeat: -1 },
  { name: 'walk', start: 2, count: 4, frameRate: 8, repeat: -1 },
  { name: 'run', start: 6, count: 6, frameRate: 12, repeat: -1 },
  { name: 'jump', start: 12, count: 1, frameRate: 1, repeat: 0 },
  { name: 'fall', start: 13, count: 1, frameRate: 1, repeat: 0 },
  { name: 'land', start: 14, count: 1, frameRate: 1, repeat: 0 },
  { name: 'hurt', start: 15, count: 1, frameRate: 1, repeat: 0 },
  { name: 'harvest', start: 16, count: 4, frameRate: 13, repeat: 0 },
  { name: 'build', start: 20, count: 2, frameRate: 4, repeat: -1 },
  { name: 'reload', start: 22, count: 2, frameRate: 6, repeat: 0 },
  { name: 'dead', start: 24, count: 1, frameRate: 1, repeat: 0 },
];

/** Character sprite is 26x34 but playable hitbox is 1 tile wide. */
export const CHAR_PHYS_W = 12;
export const CHAR_PHYS_H = 30;

function drawHead(p: Pixmap, x0: number, y0: number, s: SkinPal) {
  p.rect(x0 + 1, y0, 7, 2, s.hairDk);
  p.rect(x0 + 2, y0 + 1, 6, 1, s.hair);
  p.rect(x0 + 4, y0, 5, 1, s.hair);
  p.rect(x0 + 7, y0 + 2, 2, 1, s.hair);
  p.rect(x0 + 1, y0 + 2, 8, 6, s.skin);
  p.rect(x0 + 2, y0 + 3, 6, 4, s.skin);
  p.set(x0, y0 + 5, s.skin);
  p.set(x0, y0 + 6, s.skinDk);
  p.set(x0 + 6, y0 + 4, 0x181820);
  p.set(x0 + 7, y0 + 4, 0x181820);
  p.set(x0 + 2, y0 + 7, s.skinDk);
}

function drawTorso(p: Pixmap, x0: number, y0: number, s: SkinPal) {
  p.rect(x0 - 1, y0 + 2, 2, 6, s.bag);
  p.rect(x0 - 1, y0 + 3, 2, 1, 0x9a8a6a);
  p.rect(x0, y0, 12, 9, s.top);
  p.rect(x0 + 2, y0 + 9, 8, 1, s.topLt);
  p.rect(x0, y0 + 9, 2, 1, s.topDk);
  p.set(x0 + 11, y0 + 7, s.topDk);
  p.rect(x0 + 2, y0 + 1, 8, 1, s.topDk);
  p.rect(x0 + 1, y0 + 7, 11, 1, 0x222024);
}

function drawIdleLegs(p: Pixmap, x0: number, y0: number, s: SkinPal) {
  p.rect(x0 + 3, y0, 3, 6, s.pants);
  p.rect(x0 + 9, y0, 3, 6, s.pantsDk);
  p.rect(x0 + 2, y0 + 6, 4, 3, s.boot);
  p.rect(x0 + 9, y0 + 6, 4, 3, s.boot);
  p.set(x0 + 4, y0 + 1, s.pantsDk);
}

function drawWalkLegs(
  p: Pixmap,
  x0: number,
  y0: number,
  s: SkinPal,
  phase: number,
  run: boolean
) {
  const amp = run ? 4 : 2.4;
  const a = phase * Math.PI * 2;
  const fOff = Math.round(Math.sin(a) * amp);
  const bOff = Math.round(Math.sin(a + Math.PI) * amp);
  const fLift = Math.round(Math.max(0, Math.sin(a)) * 2);
  const bLift = Math.round(Math.max(0, Math.sin(a + Math.PI)) * 2);
  const ftop = y0 - fLift;
  const btop = y0 - bLift;
  p.rect(x0 + 4 + Math.round(fOff * 0.6), ftop, 3, 6, s.pants);
  p.rect(x0 + 9 + Math.round(bOff * 0.6), btop, 3, 6, s.pantsDk);
  p.rect(x0 + 2 + fOff, y0 + 6 - fLift, 4, 3, s.boot);
  p.rect(x0 + 8 + bOff, y0 + 6 - bLift, 4, 3, s.boot);
  p.set(x0 + 5 + Math.round(fOff * 0.6), ftop + 1, s.pantsDk);
}

function drawTuckedLegs(p: Pixmap, x0: number, y0: number, s: SkinPal, mode: 'jump' | 'fall') {
  if (mode === 'jump') {
    p.rect(x0 + 4, y0, 3, 5, s.pants);
    p.rect(x0 + 8, y0, 3, 5, s.pantsDk);
    p.rect(x0 + 2, y0 + 5, 4, 2, s.boot);
    p.rect(x0 + 8, y0 + 5, 4, 2, s.boot);
    p.rect(x0 + 9, y0 + 1, 3, 1, s.pantsDk);
  } else {
    p.rect(x0 + 5, y0, 3, 4, s.pants);
    p.rect(x0 + 8, y0, 3, 4, s.pantsDk);
    p.rect(x0 + 4, y0 + 4, 4, 3, s.boot);
    p.rect(x0 + 8, y0 + 4, 4, 3, s.boot);
    p.set(x0 + 6, y0 + 1, s.pantsDk);
  }
}

function drawArmsIdle(p: Pixmap, x0: number, y0: number, s: SkinPal) {
  p.rect(x0 - 1, y0 - 2, 2, 7, s.skin);
  p.rect(x0 + 12, y0 - 2, 2, 7, s.skin);
  p.set(x0 - 1, y0 + 4, s.top);
  p.set(x0 + 12, y0 + 4, s.top);
}

export function buildSkinFrames(skin: Skin): Pixmap[] {
  const s = SKINS[skin];
  const frames: Pixmap[] = [];
  const base = () => new Pixmap(CHAR_W, CHAR_H);

  const drawBody = (opts: {
    legmode?: 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'dead';
    legPhase?: number;
    bob?: number;
    lean?: number;
  } = {}) => {
    const p = base();
    const lean = opts.lean ?? 0;
    const bob = opts.bob ?? 0;
    const y = CHAR_H - 2 - bob;
    const dx = lean;
    drawHead(p, dx + 8, y - 21, s);
    if (lean > 0) {
      p.rect(dx + 8 + lean, y - 12, 13 - lean, 9, s.top);
      p.rect(dx + 9 + lean, y - 3, 8, 1, s.topLt);
    } else {
      drawTorso(p, dx + 7, y - 12, s);
    }
    if (opts.legmode === 'walk' || opts.legmode === 'run') {
      drawWalkLegs(p, dx + 8, y - 9, s, opts.legPhase ?? 0, opts.legmode === 'run');
    } else if (opts.legmode === 'jump' || opts.legmode === 'fall') {
      drawTuckedLegs(p, dx + 8, y - 9, s, opts.legmode);
    } else {
      drawIdleLegs(p, dx + 8, y - 9, s);
      if (lean > 0) {
        p.rect(dx + 10 + lean, y - 11, 2, 7, s.skin);
        p.set(dx + 10 + lean, y - 4, s.top);
      } else {
        drawArmsIdle(p, dx + 8, y - 11, s);
      }
    }
    return p;
  };

  for (let b = 0; b < 2; b++) frames.push(drawBody({ bob: b })); // idle
  for (let i = 0; i < 4; i++) frames.push(drawBody({ legmode: 'walk', legPhase: i / 4 })); // walk
  for (let i = 0; i < 6; i++) frames.push(drawBody({ legmode: 'run', legPhase: i / 6, lean: 2 })); // run
  frames.push(drawBody({ legmode: 'jump' })); // 12 jump
  frames.push(drawBody({ legmode: 'fall' })); // 13 fall
  frames.push(drawBody({ bob: 2 })); // 14 land
  {
    // 15 hurt
    const p = base();
    drawHead(p, 7, CHAR_H - 2 - 21 - 1, s);
    p.rect(6, CHAR_H - 2 - 13 - 1, 12, 9, s.top);
    p.rect(6, CHAR_H - 2 - 4 - 1, 10, 1, s.topLt);
    drawIdleLegs(p, 7, CHAR_H - 2 - 9, s);
    p.set(4, CHAR_H - 2 - 6, s.skin);
    p.set(5, CHAR_H - 2 - 7, s.skin);
    frames.push(p);
  }
  // harvest (16..19)
  for (let i = 0; i < 4; i++) {
    const p = drawBody({});
    const t = i / 3;
    const ang = -1.5 + t * 2.7;
    const cx = 8;
    const cy = CHAR_H - 2 - 13;
    const hx = Math.round(cx + 14 * Math.cos(ang));
    const hy = Math.round(cy + 14 * Math.sin(ang));
    p.line(cx, cy, hx, hy, 0x8a6a3a);
    p.line(cx, cy + 1, hx, hy + 1, 0x6a4f28);
    p.circle(hx, hy, 2, 0xc8b898);
    p.set(hx, hy - 2, 0xe8dcc8);
    if (i === 3) p.circle(hx + 1, hy - 1, 1, 0xf4ecd8);
    p.rect(cx - 1, cy - 1, 2, 4, s.skin);
    frames.push(p);
  }
  // build (20..21)
  for (let i = 0; i < 2; i++) {
    const p = drawBody({ bob: i });
    const ox = 13 + i;
    const ybase = CHAR_H - 2;
    p.rect(ox, ybase - 15, 4, 8, 0xb08858);
    p.rect(ox + 1, ybase - 14, 1, 6, 0xd4b888);
    p.rect(ox + 3, ybase - 14, 1, 6, 0x7a5a38);
    p.rect(ox + 1, ybase - 16, 1, 1, 0xd4b888);
    p.rect(ox - 2, ybase - 12, 2, 5, s.skin);
    p.rect(ox - 2, ybase - 7, 1, 1, s.top);
    p.rect(ox + 5, ybase - 12, 2, 5, s.skin);
    p.rect(ox + 5, ybase - 7, 1, 1, s.top);
    frames.push(p);
  }
  // reload (22..23)
  for (let i = 0; i < 2; i++) {
    const p = drawBody({ bob: i });
    const ybase = CHAR_H - 2;
    p.rect(6, ybase - 16, 13, 2, 0x22262e);
    p.rect(6 + i * 7, ybase - 15, 2, 2, 0x9a6a3a);
    p.rect(4, ybase - 13, 2, 6, s.skin);
    p.set(4, ybase - 7, s.top);
    frames.push(p);
  }
  // dead (24)
  {
    const p = new Pixmap(CHAR_W, CHAR_H);
    p.rect(2, 14, 9, 7, s.top);
    p.rect(0, 11, 7, 3, s.hair);
    p.rect(0, 13, 8, 5, s.skin);
    p.set(6, 14, 0x181820);
    p.rect(11, 15, 3, 6, s.pants);
    p.rect(9, 21, 4, 2, s.boot);
    p.rect(14, 14, 3, 7, s.pantsDk);
    p.rect(13, 21, 4, 2, s.boot);
    frames.push(p);
  }

  return frames;
}