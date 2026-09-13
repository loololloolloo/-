import Phaser from 'phaser';
import type { GameScene } from '../scenes/gameScene';
import { CHAR_W, CHAR_H, type Skin } from '../art/characters';
import type { WorldData } from '../systems/worldGen';
import { groundAt } from '../systems/worldGen';
import { getWeaponStats, type WeaponDef, type RarityKey } from '../data/weapons';
import { audio } from '../scenes/bootScene';

export interface PlayerState {
  health: number;
  shield: number;
  maxHealth: number;
  maxShield: number;
  resources: { wood: number; stone: number; metal: number };
  ammo: Record<string, number>;
  items: Array<{ weaponId?: string; rarity?: RarityKey; consumableId?: string; count: number } | null>;
  itemsFull: boolean;
}

export const HITBOX_W = 20;
export const HITBOX_H = 64;

const ACCEL = 3200;
const AIR_ACCEL = 2300;
const MAX_WALK = 280;
const MAX_SPRINT = 430;
const JUMP_V = 780;
const GROUND_FRICTION = 3000;
const AIR_FRICTION = 600;
const MAX_FALL = 1400;
const STAMINA_MAX = 100;
const STAMINA_DRAIN = 22;
const STAMINA_REGEN = 30;

export class Player {
  scene: GameScene;
  world: WorldData;
  sprite: Phaser.GameObjects.Sprite;
  skin: Skin;

  face = 1;
  vx = 0;
  vy = 0;
  onGround = false;
  crouching = false;
  sprinting = false;
  jumping = false;
  jumpHeld = false;
  jumpingFrames = 0;
  coyoteTimer = 0;
  jumpBufTimer = 0;
  stamina = STAMINA_MAX;
  wantSprint = false;
  moving = false;

  health = 100;
  shield = 0;
  maxHealth = 100;
  maxShield = 100;
  resources = { wood: 10, stone: 0, metal: 0 };
  ammo: Record<string, number> = {};
  items: Array<{ weaponId?: string; rarity?: RarityKey; consumableId?: string; count: number } | null> = [
    null, null, null, null, null,
  ];

  currentSlot = 0;
  lastWeaponSlot = 0;
  private _equipped: 'weapon' | 'consumable' | null = null;
  private _weapon: { def: WeaponDef; rarity: RarityKey; mag: number; reloading: boolean; reloadT: number } | null = null;

  bloom = 0;
  recoilT = 0;
  private fireCooldown = 0;
  harvestCooldown = 0;
  harvestAnim = false;
  buildMode = false;
  private buildPiece = 0;
  private buildTicker = 0;

  aimAngle = 0;
  hurtFlashT = 0;
  landTimer = 0;
  walkTime = 0;
  animOverride: string | null = null;
  dead = false;
  /** seconds of spawn protection (Fortnite: invulnerable until you land / pick up a weapon) */
  spawnProtect = 4;
  fallStartY = 0;
  private lastGroundY = 0;
  private useKeyHeld = false;
  private useTimer = 0;
  private swingAt: string | null = null;

  healthBar!: Phaser.GameObjects.Rectangle;
  shieldBar!: Phaser.GameObjects.Rectangle;

  constructor(scene: GameScene, world: WorldData, skin: Skin, startX: number, startY: number) {
    this.scene = scene;
    this.world = world;
    this.skin = skin;
    this.sprite = scene.add.sprite(startX, startY, `charsheet_${skin}`, 0);
    this.sprite.setDepth(5);
    this.sprite.play(`char_${skin}_idle`);
    this.aimAngle = 0;
  }

  get physX() { return this.sprite.x; }
  get physY() { return this.sprite.y + 8; } // sprite origin center; feet at +17; hitbox center at +8
  get slotItem() { return this.items[this.currentSlot]; }
  get equipped(): 'weapon' | 'consumable' | null { return this._equipped; }
  get weapon() { return this._weapon; }
  get buildingPiece() { return this.buildPiece; }

  isSolid(x0: number, y0: number, w: number, h: number): boolean {
    const dw = this.world.solids;
    for (const s of dw) {
      if (x0 < s.x + s.w && x0 + w > s.x && y0 < s.y + s.h && y0 + h > s.y) return true;
    }
    return false;
  }

  groundBelow(x: number, y: number): boolean {
    // terrain height check
    return false; // placeholder, actual physics done in scene
  }

  tryJump(): void {
    this.jumpBufTimer = 0.12;
  }

  setWantSprint(v: boolean) { this.wantSprint = v; }

  setCrouch(v: boolean) { this.crouching = v; }

  setMoveDir(dir: number) {
    this.moving = dir !== 0;
    if (dir !== 0) this.face = Math.sign(dir);
  }

  setBuildMode(v: boolean) {
    if (this._equipped === 'consumable') this.cancelUse();
    this.buildMode = v;
    if (v) this.animOverride = 'build';
    else this.animOverride = null;
    audio.uiHover();
    if (this.buildMode) this.sprite.play(`char_${this.skin}_build`);
    else this.sprite.play(`char_${this.skin}_idle`);
  }

  switchBuildPiece(dir: number) {
    const count = 3;
    this.buildPiece = (this.buildPiece + dir + count) % count;
    audio.uiHover();
  }

  cycleSlot(dir: number) {
    if (this._equipped === 'consumable') this.cancelUse();
    let next = this.currentSlot + dir;
    if (next < 0) next = 4;
    if (next > 4) next = 0;
    this.selectSlot(next);
  }

  selectSlot(idx: number) {
    if (this._equipped === 'consumable') this.cancelUse();
    const prev = this.currentSlot;
    this.currentSlot = idx;
    const it = this.items[idx];
    if (it && it.weaponId) {
      this.lastWeaponSlot = idx;
      this.equipWeapon(it.weaponId!, it.rarity!);
    } else if (it && it.consumableId) {
      this.equipConsumable(it.consumableId);
    } else {
      this._equipped = null;
      this._weapon = null;
    }
    if (prev !== idx) audio.uiHover();
  }

  equipWeapon(id: string, rarity: RarityKey) {
    const def = this.scene.weaponDefs[id];
    if (!def) return;
    const stats = getWeaponStats(def, rarity);
    const existing = this._weapon;
    this._weapon = {
      def,
      rarity,
      mag: stats.magSize,
      reloading: false,
      reloadT: 0,
    };
    this._equipped = 'weapon';
    audio.equip();
  }

  equipConsumable(id: string) {
    this._weapon = null;
    this._equipped = 'consumable';
    audio.equip();
  }

  pocketWeapon(): boolean {
    // slot 0 is pickaxe-hold? use slot 0 as pickaxe. return true if swapping
    return false;
  }

  private pickupWeapon(id: string, rarity: RarityKey): string {
    const def = this.scene.weaponDefs[id];
    if (!def) return '';
    // find same weapon slot first
    for (let i = 0; i < 5; i++) {
      const it = this.items[i];
      if (it && it.weaponId === id && it.rarity === rarity) return it.weaponId!;
    }
    // find empty
    for (let i = 0; i < 5; i++) {
      if (!this.items[i]) {
        this.items[i] = { weaponId: id, rarity, count: 1 };
        this.selectSlot(i);
        return id;
      }
    }
    // full: swap lowest tier
    let lowest = -1;
    let lowestIdx = 0;
    const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    for (let i = 0; i < 5; i++) {
      const it = this.items[i];
      if (it && it.weaponId) {
        const o = order.indexOf(it.rarity!);
        if (lowest === -1 || o < lowest) {
          lowest = o;
          lowestIdx = i;
        }
      }
    }
    if (lowestIdx >= 0) {
      // drop old weapon as floor loot
      const old = this.items[lowestIdx];
      this.scene.spawnWeaponDrop(this.physX, this.physY + 20, old!.weaponId!, old!.rarity!);
      this.items[lowestIdx] = { weaponId: id, rarity, count: 1 };
      this.selectSlot(lowestIdx);
      return id;
    }
    return '';
  }

  pickupItem(item: { weaponId?: string; rarity?: string; consumableId?: string; count?: number }) {
    if (item.weaponId) this.pickupWeapon(item.weaponId, item.rarity as RarityKey);
    else if (item.consumableId) {
      // stack
      for (let i = 0; i < 5; i++) {
        const it = this.items[i];
        if (it && it.consumableId === item.consumableId && it.count < 15) {
          it.count += item.count || 1;
          return;
        }
      }
      for (let i = 0; i < 5; i++) {
        if (!this.items[i]) {
          this.items[i] = { consumableId: item.consumableId, count: item.count || 1 };
          this.selectSlot(i);
          return;
        }
      }
    }
    audio.pickup();
  }

  addAmmo(type: string, count: number) {
    this.ammo[type] = Math.min(999, (this.ammo[type] || 0) + count);
  }

  addResources(r: 'wood' | 'stone' | 'metal', count: number) {
    this.resources[r] = Math.min(999, this.resources[r] + count);
    audio.materialTick();
  }

  heal(hp: number, maxHp: number): number {
    const total = Math.min(maxHp, this.health + hp);
    const applied = total - this.health;
    this.health = total;
    return applied;
  }

  shieldUp(amt: number, maxShield: number): number {
    const total = Math.min(maxShield, this.shield + amt);
    const applied = total - this.shield;
    this.shield = total;
    return applied;
  }

  damage(amt: number, fromX?: number): boolean {
    if (this.dead) return false;
    if (this.spawnProtect > 0) return false;
    // shield absorbs first
    let rem = amt;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, rem);
      this.shield -= absorbed;
      rem -= absorbed;
    }
    this.health -= rem;
    if ((window as any).__errors) {
      (window as any).__errors.push(`[${((performance.now() / 1000).toFixed(2))}s] [DMG] hp was ${this.health + rem}, took ${Math.round(rem)} from=${fromX === undefined ? '?' : Math.round(fromX)}`);
    }
    this.hurtFlashT = 0.25;
    if (fromX !== undefined) {
      const dir = fromX < this.physX ? 1 : -1;
      this.vx += dir * 300;
      this.vy -= 120;
    }
    audio.hurt();
    if (this.health <= 0) {
      this.health = 0;
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.dead = true;
    this.setBuildMode(false);
    this.sprite.play(`char_${this.skin}_dead`);
    this.scene.onPlayerDied();
  }

  cancelUse() {
    this._equipped = null;
    this._weapon = null;
    this.useTimer = 0;
  }

  recomputeWeaponMag(delta: number) {
    if (this._weapon) {
      const stats = getWeaponStats(this._weapon.def, this._weapon.rarity);
      if (this._weapon.reloading) {
        this._weapon.reloadT -= delta;
        if (this._weapon.reloadT <= 0) {
          const need = stats.magSize - this._weapon.mag;
          const have = this.ammo[ammoType(this._weapon.def.category)] || 0;
          const take = Math.min(need, have);
          this._weapon.mag += take;
          this.ammo[ammoType(this._weapon.def.category)] = have - take;
          this._weapon.reloading = false;
          audio.reloadEnd();
        }
      }
    }
  }

  update(delta: number, input: { left: boolean; right: boolean }): void {
    const dt = Math.min(delta / 1000, 0.033);
    if (this.dead) {
      this.sprite.setDepth(1);
      return;
    }

    // timers
    this.jumpBufTimer -= dt;
    this.coyoteTimer -= dt;
    this.spawnProtect = Math.max(0, this.spawnProtect - dt);
    this.stamina = Math.min(STAMINA_MAX, this.stamina + STAMINA_REGEN * dt * (this.sprinting ? 0 : 1));
    this.fireCooldown -= dt;
    this.harvestCooldown -= dt;
    this.hurtFlashT -= dt;
    this.recoilT = Math.max(0, this.recoilT - dt);
    this.landTimer -= dt;
    this.bloom = Math.max(0, this.bloom - this.bloomRecover * dt);

    // banner: sprinting
    this.sprinting = this.wantSprint && this.moving && this.onGround && this.stamina > 1 && !this.crouching;
    if (this.sprinting) this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN * dt);
    if (this.stamina <= 0) this.sprinting = false;

    const maxSpeed = this.crouching ? MAX_WALK * 0.5 : this.sprinting ? MAX_SPRINT : MAX_WALK;
    const accel = this.onGround ? ACCEL : AIR_ACCEL;
    let dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (this._equipped === 'consumable') dir = 0;
    const targetV = dir * maxSpeed;
    if (dir !== 0) {
      this.vx += Math.sign(targetV - this.vx) * Math.min(Math.abs(targetV - this.vx), accel * dt);
    } else {
      const fric = this.onGround ? GROUND_FRICTION : AIR_FRICTION;
      const s = Math.sign(this.vx);
      this.vx -= s * Math.min(Math.abs(this.vx), fric * dt);
      if (Math.abs(this.vx) < 10) this.vx = 0;
    }
    this.face = dir !== 0 ? Math.sign(dir) : this.face;

    // gravity
    this.vy = Math.max(-1400, Math.min(MAX_FALL + 400, this.vy + 2300 * dt));
    if (this.jumping && !this.jumpHeld && this.vy < -200) this.vy += 4000 * dt; // early release

    // jump
    if (this.jumpBufTimer > 0 && (this.onGround || this.coyoteTimer > 0)) {
      this.vy = -JUMP_V;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufTimer = 0;
      this.jumping = true;
      this.jumpingFrames = 0;
      this.sprite.play(`char_${this.skin}_jump`);
      audio.jump();
    }
    if (this.jumping) {
      this.jumpingFrames++;
      if (this.jumpingFrames > 8 && this.vy > -60) this.jumping = false;
    }

    // collide X with solids
    const hbw = HITBOX_W / 2;
    const hbh = HITBOX_H / 2;
    const nx = this.physX + this.vx * dt;
    let blockedX = false;
    if (this.isSolid(nx - hbw, this.physY - hbh, HITBOX_W, HITBOX_H - 4)) {
      // try to nudge
      if (this.vx > 0) {
        let cand = nx;
        while (cand > this.physX - 1 && this.isSolid(cand - hbw, this.physY - hbh, HITBOX_W, HITBOX_H - 4)) cand--;
        this.sprite.x = cand;
        this.vx = 0;
      } else if (this.vx < 0) {
        let cand = nx;
        while (cand < this.physX + 1 && this.isSolid(cand - hbw, this.physY - hbh, HITBOX_W, HITBOX_H - 4)) cand++;
        this.sprite.x = cand;
        this.vx = 0;
      }
      blockedX = true;
    } else {
      this.sprite.x = nx;
    }

    // collide Y with solids
    this.onGround = false;
    const ny = this.physY + this.vy * dt;
    const bottom = ny + hbh;
    const top = ny - hbh;
    const groundHere = groundAt(this.world, this.physX);
    if (this.vy >= 0) {
      // terrain
      if (bottom > groundHere) {
        this.sprite.y = groundHere - hbh - 8;
        const wasAir = !this.onGround && this.vy > 400 && this.lastGroundY !== groundHere;
        this.vy = 0;
        this.onGround = true;
        this.jumping = false;
        if (wasAir || this.landTimer <= 0) {
          this.landed();
        }
      }
      // solid floors
      for (const s of this.world.solids) {
        if (this.physX < s.x || this.physX > s.x + s.w) continue;
        if (top < s.y && bottom <= s.y && bottom + this.vy * dt >= s.y - this.vy * dt * 0.5) continue;
        if (bottom >= s.y && bottom <= s.y + s.h && top < s.y + s.h && this.physX > s.x - hbw && this.physX < s.x + s.w + hbw) {
          this.sprite.y = s.y - hbh - 8;
          this.vy = 0;
          this.onGround = true;
          this.jumping = false;
          this.landed();
        }
      }
    } else {
      // ceiling
      const ceilY = this.isSolid(this.physX - hbw, top, HITBOX_W, -this.vy * dt) ? this.sprite.y : top;
      if (ceilY !== top) {
        this.vy = 0;
        this.sprite.y = ceilY + hbh + 8 + 2;
        this.sprite.y = ceilY + hbh + 8;
      }
    }

    // jump-through platforms
    if (this.vy >= 0) {
      for (const pl of this.world.platforms) {
        if (this.physX < pl.x || this.physX > pl.x + pl.w) continue;
        const prevBottom = this.physY + hbh;
        const newBottom = ny + hbh;
        if (prevBottom <= pl.y + 6 && newBottom >= pl.y && this.vy >= 0) {
          if (!(this._dropThrough)) {
            this.sprite.y = pl.y - hbh - 8;
            this.vy = 0;
            this.onGround = true;
            this.jumping = false;
            this.landed();
          }
        }
      }
      this._dropThroughTimer = Math.max(0, (this._dropThroughTimer ?? 0) - dt);
    }

    // fall damage
    if (!this.onGround && this.vy > 200) this.fallStartY = this.physY;
    if (this.onGround && this.vy === 0) {
      if (this.fallStartY !== 0) {
        const fell = this.fallStartY - this.physY;
        this.fallStartY = 0;
        if (fell > 260) {
          const dmg = Math.round((fell - 260) / 40);
          if (dmg > 0) this.damage(Math.min(dmg, 70));
        }
      }
    }

    // animation
    this.updateAnim();
  }

  private _dropThrough = false;
  private _dropThroughTimer = 0;

  setDropThrough() {
    this._dropThrough = true;
    this._dropThroughTimer = 0.35;
  }
  postPhysics() {
    if (this._dropThroughTimer <= 0) this._dropThrough = false;
  }

  landed() {
    this.landTimer = 0.1;
    if (!this.dead && !this.buildMode) this.sprite.play(`char_${this.skin}_land`);
    audio.land();
  }

  get bloomRecover() {
    return this._weapon ? this._weapon.def.spreadRecover : 0.4;
  }

  private updateAnim() {
    if (this.dead || this.animOverride) {
      if (this.animOverride) this.sprite.play(`char_${this.skin}_${this.animOverride}`, true);
      else this.sprite.play(`char_${this.skin}_dead`, true);
      return;
    }
    if (this.landTimer > 0) {
      this.sprite.play(`char_${this.skin}_land`, true);
      return;
    }
    if (this._weapon && this._weapon.reloading) {
      this.sprite.play(`char_${this.skin}_reload`, true);
      return;
    }
    const anim = !this.onGround
      ? this.vy < 0 ? 'jump' : 'fall'
      : this.moving
        ? this.sprinting ? 'run' : 'walk'
        : 'idle';
    this.sprite.play(`char_${this.skin}_${anim}`, true);
    if (this.moving) this.walkTime += 0.05;
    if (this.walkTime > 0.4) {
      const c = this.onGround && this.moving;
      if (c) audio.step();
      this.walkTime = 0;
    }
  }

  setAim(angle: number) {
    this.aimAngle = angle;
  }

  fireWeapon(now: boolean): boolean {
    if (!this._weapon || this._weapon.reloading) return false;
    const def = getWeaponStats(this._weapon.def, this._weapon.rarity);
    if (this.fireCooldown > 0) return false;
    if (this._weapon.mag <= 0) {
      this.tryReload();
      return false;
    }
    this.fireCooldown = 1 / def.fireRate;
    this._weapon.mag--;
    this.spawnProtect = 0; // engaging ends spawn protection (Fortnite: invulnerable only until you land/act)
    this.recoilT = 0.1;
    this.bloom = Math.min(def.spreadCap, this.bloom + def.spreadPerShot);
    // scramble crosshair
    this.scene.spawnMuzzle(this.sprite.x + this.face * 26, this.sprite.y - 6, def.category);
    audio.shot(def.category);
    for (let i = 0; i < def.projectiles; i++) {
      const angle = this.aimAngle + (Math.random() - 0.5) * 2 * this.bloom + (def.projectiles > 1 ? (i - (def.projectiles - 1) / 2) * 0.09 : 0);
      this.scene.fireProjectile(this, angle, def);
    }
    if (this._weapon.mag === 0) this.tryReload();
    return true;
  }

  tryReload() {
    if (!this._weapon || this._weapon.reloading) return;
    const stats = getWeaponStats(this._weapon.def, this._weapon.rarity);
    if (this._weapon.mag >= stats.magSize) return;
    if ((this.ammo[ammoType(this._weapon.def.category)] || 0) <= 0) {
      // dry
      return;
    }
    this._weapon.reloading = true;
    this._weapon.reloadT = stats.reloadTime;
    audio.reloadStart();
  }

  useConsumable(): boolean {
    if (this._equipped !== 'consumable') return false;
    const it = this.items[this.currentSlot];
    if (!it || !it.consumableId) return false;
    const def = this.scene.consumableDefs[it.consumableId];
    if (!def) return false;
    if ((def.hp && this.health >= this.maxHealth) && (def.shield && this.shield >= this.maxShield)) return false;
    if ((def.hp && this.health >= (def.maxHp ?? this.maxHealth)) && (def.shield && this.shield >= (def.maxShield ?? this.maxShield))) return false;
    if (this.useTimer <= 0) {
      this.useTimer = def.useTime;
      audio.drink();
    }
    this.useTimer -= this.scene.game.loop.delta / 1000;
    if (this.useTimer <= 0) {
      let appliedH = 0;
      let appliedS = 0;
      if (def.hp) appliedH = this.heal(def.hp, def.maxHp ?? this.maxHealth) || 1;
      if (def.shield) appliedS = this.shieldUp(def.shield, def.maxShield ?? this.maxShield) || 1;
      const applied = Math.max(appliedH, appliedS);
      it.count -= 1;
      if (it.count <= 0) {
        this.items[this.currentSlot] = null;
        this._equipped = null;
      }
      audio.healDone();
      if (applied > 0) this.scene.showFloating(this.sprite.x, this.sprite.y - 40, `+${Math.round(applied)}`, def.shield ? '#4ad8ff' : '#7dff8a');
    }
    // cancel if moved
    return true;
  }

  harvest(): void {
    if (this._equipped !== 'weapon' || this._weapon) return;
    if (this.harvestCooldown > 0) return;
    this.harvestCooldown = 0.55;
    this.harvestAnim = true;
    this.sprite.play(`char_${this.skin}_harvest`);
    audio.harvest();
    const hitX = this.physX + this.face * 42;
    const hitY = this.physY - 8;
    this.scene.harvestAt(hitX, hitY, this);
    this.harvestAnim = false;
  }
}

function ammoType(cat: string): string {
  const map: Record<string, string> = {
    assault: 'medium',
    pistol: 'light',
    smg: 'light',
    shotgun: 'shells',
    sniper: 'heavy',
    rocket: 'rockets',
  };
  return map[cat] || 'medium';
}