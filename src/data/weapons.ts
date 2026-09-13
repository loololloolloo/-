export const RARITIES = [
  {
    key: 'common',
    name: 'Common',
    color: 0xd7d7d7,
    css: '#d7d7d7',
    light: '#f4f4f4',
    dark: '#8f8f8f',
    index: 0,
  },
  {
    key: 'uncommon',
    name: 'Uncommon',
    color: 0x51b03d,
    css: '#51b03d',
    light: '#7fde6a',
    dark: '#2c7a1d',
    index: 1,
  },
  {
    key: 'rare',
    name: 'Rare',
    color: 0x2f9bf4,
    css: '#2f9bf4',
    light: '#63c3ff',
    dark: '#126bb3',
    index: 2,
  },
  {
    key: 'epic',
    name: 'Epic',
    color: 0xb04cf0,
    css: '#b04cf0',
    light: '#d184ff',
    dark: '#7d24b8',
    index: 3,
  },
  {
    key: 'legendary',
    name: 'Legendary',
    color: 0xffc91a,
    css: '#ffc91a',
    light: '#ffe666',
    dark: '#c98a00',
    index: 4,
  },
] as const;

export type RarityKey = (typeof RARITIES)[number]['key'];

export interface WeaponDef {
  id: string;
  name: string;
  category: 'assault' | 'pistol' | 'shotgun' | 'smg' | 'sniper' | 'rocket';
  baseDamage: number;
  dmgPerTier: number;
  fireRate: number; // shots per second
  magSize: number;
  reloadTime: number;
  reloadTimePerTier: number;
  auto: boolean;
  spreadBase: number; // radians
  spreadPerShot: number;
  spreadCap: number;
  spreadRecover: number; // per second
  headshotMult: number;
  range: number;
  projectiles: number;
  projectileSpeed?: number; // for non-hitscan
  aoeRadius?: number;
  rarity: RarityKey;
  bulletSpeed?: number;
}

export function rarityScale(def: WeaponDef, r: RarityKey): number {
  return RARITIES.findIndex((x) => x.key === r);
}

const rarityIndex = (id: string) => RARITIES.findIndex((x) => x.key === id);

export const WEAPONS: WeaponDef[] = [
  {
    id: 'assault',
    name: 'Assault Rifle',
    category: 'assault',
    baseDamage: 30,
    dmgPerTier: 1.6,
    fireRate: 5.5,
    magSize: 30,
    reloadTime: 2.4,
    reloadTimePerTier: -0.07,
    auto: true,
    spreadBase: 0.04,
    spreadPerShot: 0.011,
    spreadCap: 0.14,
    spreadRecover: 0.16,
    headshotMult: 2.0,
    range: 1100,
    projectiles: 1,
    rarity: 'common',
    bulletSpeed: 2600,
  },
  {
    id: 'pistol',
    name: 'Pistol',
    category: 'pistol',
    baseDamage: 23,
    dmgPerTier: 1.2,
    fireRate: 6.1,
    magSize: 16,
    reloadTime: 1.5,
    reloadTimePerTier: -0.05,
    auto: false,
    spreadBase: 0.028,
    spreadPerShot: 0.02,
    spreadCap: 0.11,
    spreadRecover: 0.4,
    headshotMult: 2.0,
    range: 900,
    projectiles: 1,
    rarity: 'common',
    bulletSpeed: 2200,
  },
  {
    id: 'shotgun',
    name: 'Pump Shotgun',
    category: 'shotgun',
    baseDamage: 70,
    dmgPerTier: 9,
    fireRate: 0.75,
    magSize: 5,
    reloadTime: 3.2,
    reloadTimePerTier: -0.09,
    auto: false,
    spreadBase: 0.09,
    spreadPerShot: 0.02,
    spreadCap: 0.16,
    spreadRecover: 0.2,
    headshotMult: 1.6,
    range: 320,
    projectiles: 10,
    rarity: 'common',
    bulletSpeed: 1500,
  },
  {
    id: 'smg',
    name: 'SMG',
    category: 'smg',
    baseDamage: 14,
    dmgPerTier: 0.7,
    fireRate: 11.0,
    magSize: 25,
    reloadTime: 2.0,
    reloadTimePerTier: -0.06,
    auto: true,
    spreadBase: 0.05,
    spreadPerShot: 0.014,
    spreadCap: 0.19,
    spreadRecover: 0.12,
    headshotMult: 1.8,
    range: 650,
    projectiles: 1,
    rarity: 'uncommon',
    bulletSpeed: 2200,
  },
  {
    id: 'sniper',
    name: 'Bolt-Action Sniper',
    category: 'sniper',
    baseDamage: 105,
    dmgPerTier: 4.5,
    fireRate: 0.45,
    magSize: 1,
    reloadTime: 3.6,
    reloadTimePerTier: -0.1,
    auto: false,
    spreadBase: 0.001,
    spreadPerShot: 0.001,
    spreadCap: 0.002,
    spreadRecover: 0.1,
    headshotMult: 2.5,
    range: 3000,
    projectiles: 1,
    rarity: 'rare',
    bulletSpeed: 4000,
  },
  {
    id: 'rocket',
    name: 'Rocket Launcher',
    category: 'rocket',
    baseDamage: 100,
    dmgPerTier: 8,
    fireRate: 0.5,
    magSize: 1,
    reloadTime: 3.8,
    reloadTimePerTier: -0.12,
    auto: false,
    spreadBase: 0.004,
    spreadPerShot: 0.004,
    spreadCap: 0.004,
    spreadRecover: 0.1,
    headshotMult: 1.0,
    range: 1600,
    projectiles: 1,
    projectileSpeed: 620,
    aoeRadius: 130,
    rarity: 'epic',
    bulletSpeed: 620,
  },
];

export function getWeaponStats(def: WeaponDef, rarity: RarityKey) {
  const idx = rarityIndex(rarity);
  const r: RarityKey = rarity;
  return {
    ...def,
    rarity: r,
    damage: Math.round(def.baseDamage + def.dmgPerTier * idx),
    fireRate: def.fireRate,
    magSize: def.magSize,
    reloadTime: Math.max(0.4, def.reloadTime + def.reloadTimePerTier * idx),
  };
}

export const RARITY_COLORS: Record<RarityKey, number> = {
  common: 0xd7d7d7,
  uncommon: 0x51b03d,
  rare: 0x2f9bf4,
  epic: 0xb04cf0,
  legendary: 0xffc91a,
};

export const RARITY_CSS: Record<RarityKey, string> = {
  common: '#d7d7d7',
  uncommon: '#51b03d',
  rare: '#2f9bf4',
  epic: '#b04cf0',
  legendary: '#ffc91a',
};