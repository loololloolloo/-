export interface MaterialDef {
  key: 'wood' | 'stone' | 'metal';
  name: string;
  color: number;
  light: number;
  dark: number;
  css: string;
  minHp: number;
  maxHp: number;
  buildTime: number; // seconds to full HP from min
  harvestHit: number; // pickaxe damage
}

export const MATERIALS: Record<'wood' | 'stone' | 'metal', MaterialDef> = {
  wood: {
    key: 'wood',
    name: 'Wood',
    color: 0x9a6b3c,
    light: 0xc89a5c,
    dark: 0x6b4426,
    css: '#c89a5c',
    minHp: 50,
    maxHp: 100,
    buildTime: 3.0,
    harvestHit: 50,
  },
  stone: {
    key: 'stone',
    name: 'Stone',
    color: 0x9b9aa3,
    light: 0xc8c7cf,
    dark: 0x66666f,
    css: '#c8c7cf',
    minHp: 45,
    maxHp: 150,
    buildTime: 5.0,
    harvestHit: 50,
  },
  metal: {
    key: 'metal',
    name: 'Metal',
    color: 0x7f8b96,
    light: 0xb9c6d0,
    dark: 0x47515c,
    css: '#b9c6d0',
    minHp: 40,
    maxHp: 200,
    buildTime: 7.0,
    harvestHit: 50,
  },
};

export type PieceType = 'wall' | 'floor' | 'ramp';

export interface PieceDef {
  key: PieceType;
  name: string;
  keyHint: string;
  size: { w: number; h: number };
}

export const PIECES: Record<PieceType, PieceDef> = {
  wall: { key: 'wall', name: 'Wall', keyHint: '1', size: { w: 64, h: 64 } },
  floor: { key: 'floor', name: 'Floor', keyHint: '2', size: { w: 64, h: 16 } },
  ramp: { key: 'ramp', name: 'Ramp', keyHint: '3', size: { w: 64, h: 64 } },
};

export const PIECE_KEYS: PieceType[] = ['wall', 'floor', 'ramp'];

export const RESOURCE_COST = 10;

export const MAX_RESOURCE = 999;

export const DEFAULT_RESOURCES = { wood: 10, stone: 0, metal: 0 };