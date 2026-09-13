export interface ConsumableDef {
  id: string;
  name: string;
  icon: string;
  hp?: number;
  maxHp?: number;
  shield?: number;
  maxShield?: number;
  useTime: number;
  stackCap: number;
  desc: string;
}

export const CONSUMABLES: Record<string, ConsumableDef> = {
  bandage: {
    id: 'bandage',
    name: 'Bandage',
    icon: 'bandage',
    hp: 15,
    maxHp: 75,
    useTime: 2.0,
    stackCap: 15,
    desc: 'Heals 15 HP, up to 75 max.',
  },
  medkit: {
    id: 'medkit',
    name: 'Med Kit',
    icon: 'medkit',
    hp: 100,
    maxHp: 100,
    useTime: 4.0,
    stackCap: 3,
    desc: 'Restores you to full Health.',
  },
  smallshield: {
    id: 'smallshield',
    name: 'Small Shield Potion',
    icon: 'smallshield',
    shield: 25,
    maxShield: 50,
    useTime: 2.0,
    stackCap: 6,
    desc: 'Grants 25 Shield, up to 50 max.',
  },
  shieldpot: {
    id: 'shieldpot',
    name: 'Shield Potion',
    icon: 'shieldpot',
    shield: 50,
    maxShield: 100,
    useTime: 3.0,
    stackCap: 3,
    desc: 'Grants 50 Shield, up to 100 max.',
  },
  slurp: {
    id: 'slurp',
    name: 'Slurp Juice',
    icon: 'slurp',
    hp: 25,
    shield: 25,
    useTime: 5.0,
    stackCap: 2,
    desc: 'Heals 25 HP AND 25 Shield over time.',
  },
};

export interface Item {
  kind: 'weapon' | 'consumable';
  weaponId?: string;
  rarity?: string;
  consumableId?: string;
  count: number;
}

export const AMMO_TYPES = ['light', 'medium', 'shells', 'heavy', 'rockets'] as const;
export type AmmoType = (typeof AMMO_TYPES)[number];

export function ammoForCategory(cat: string): AmmoType {
  switch (cat) {
    case 'pistol':
    case 'smg':
      return 'light';
    case 'assault':
      return 'medium';
    case 'shotgun':
      return 'shells';
    case 'sniper':
      return 'heavy';
    case 'rocket':
      return 'rockets';
    default:
      return 'medium';
  }
}

export const AMMO_CAP: Record<AmmoType, number> = {
  light: 120,
  medium: 90,
  shells: 40,
  heavy: 15,
  rockets: 6,
};