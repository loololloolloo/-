import Phaser from 'phaser';
import type { GameScene } from '../scenes/gameScene';
import type { WorldData } from '../systems/worldGen';
import { groundAt } from '../systems/worldGen';
import type { Skin } from '../art/characters';
import { getWeaponStats, type WeaponDef, type RarityKey } from '../data/weapons';
import { audio } from '../scenes/bootScene';

const HITBOX_W = 18;
const HITBOX_H = 60;

export class Enemy {
  scene: GameScene;
  world: WorldData;
  sprite: Phaser.GameObjects.Sprite;
  skin: Skin;
  name: string;

  homeX: number;
  patrolHalf: number;
  targetX: number;
  face = 1;
  vx = 0;
  vy = 0;
  onGround = false;

  health: number;
  shield: number;
  maxHealth = 100;
  maxShield = 100;

  weaponDef: WeaponDef;
  rarity: RarityKey;
  mag: number;
  reloading = false;
  reloadT = 0;
  fireCooldown = 0;
  bloom = 0;

  state: 'patrol' | 'chase' | 'shoot' | 'reposition' = 'patrol';
  stateTimer = 0;
  dead = false;
  hurtFlashT = 0;
  attackRange: number;
  /** horizontal activation radius (Fortnite NPCs don't aggro from off-screen distance) */
  aggroRange: number;
  accuracy: number;
  projectileTimer = 0;
  lastShotT = 0;
  strafeDir = 0;
  strafeT = 0;

  constructor(
    scene: GameScene,
    world: WorldData,
    skin: Skin,
    weaponId: string,
    rarity: RarityKey,
    x: number,
    y: number,
    patrolHalf: number,
    name: string
  ) {
    this.scene = scene;
    this.world = world;
    this.skin = skin;
    this.weaponDef = scene.weaponDefs[weaponId];
    this.rarity = rarity;
    this.name = name;
    this.health = this.maxHealth;
    this.shield = 50;
    this.homeX = x;
    this.patrolHalf = patrolHalf;
    this.targetX = x + (Math.random() < 0.5 ? patrolHalf * 0.6 : -patrolHalf * 0.6);
    const stats = getWeaponStats(this.weaponDef, rarity);
    this.mag = stats.magSize;
    this.attackRange = this.weaponDef.category === 'shotgun' ? 260 : this.weaponDef.category === 'sniper' ? 1000 : this.weaponDef.category === 'rocket' ? 640 : 520;
    // aggro radius: ~1.6x weapon range by category, so enemies must get fairly close
    this.aggroRange = this.weaponDef.category === 'sniper' ? 900 : this.weaponDef.category === 'rocket' ? 700 : this.weaponDef.category === 'shotgun' ? 400 : 560;
    this.accuracy = rarity === 'common' ? 0.06 : rarity === 'uncommon' ? 0.05 : rarity === 'rare' ? 0.035 : rarity === 'epic' ? 0.025 : 0.015;
    this.sprite = scene.add.sprite(x, y, `charsheet_${skin}`, 0);
    this.sprite.setDepth(5);
    this.sprite.play(`char_${skin}_idle`);
  }

  get physX() { return this.sprite.x; }
  get physY() { return this.sprite.y + 8; }
  get targetPlayer() { return this.scene.player; }

  isSolid(x0: number, y0: number, w: number, h: number): boolean {
    for (const s of this.world.solids) {
      if (x0 < s.x + s.w && x0 + w > s.x && y0 < s.y + s.h && y0 + h > s.y) return true;
    }
    return false;
  }

  damage(amt: number, fromX?: number, headshot = false): boolean {
    if (this.dead) return false;
    let rem = amt;
    if (this.shield > 0) {
      const a = Math.min(this.shield, rem);
      this.shield -= a;
      rem -= a;
    }
    this.health -= rem;
    this.hurtFlashT = 0.2;
    this.scene.showFloating(this.sprite.x, this.sprite.y - 48, `${Math.round(headshot ? amt : amt)}`, headshot ? '#ffd23f' : '#ffffff');
    if (fromX !== undefined) {
      const dir = fromX < this.physX ? 1 : -1;
      this.vx += dir * 260;
      this.vy -= 140;
    }
    // aggro
    this.state = 'chase';
    audio.hit();
    if (this.health <= 0) {
      this.health = 0;
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.dead = true;
    this.sprite.play(`char_${this.skin}_dead`);
    this.sprite.setDepth(1);
    // drop loot
    this.scene.spawnWeaponDrop(this.sprite.x, this.sprite.y + 30, this.weaponDef.id, this.rarity);
    if (Math.random() < 0.4) {
      this.scene.spawnConsumableDrop(this.sprite.x, this.sprite.y + 34, Math.random() < 0.5 ? 'bandage' : 'shieldpot');
    }
    if (Math.random() < 0.3) {
      this.scene.spawnMaterialDrop(this.sprite.x, this.sprite.y + 20, Math.random() < 0.5 ? 'wood' : 'stone', 30);
    }
    this.scene.onEnemyKilled(this);
    audio.kill();
  }

  update(delta: number) {
    const dt = Math.min(delta / 1000, 0.033);
    if (this.dead) return;
    this.fireCooldown -= dt;
    this.hurtFlashT -= dt;
    this.stateTimer -= dt;
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        this.reloading = false;
        const stats = getWeaponStats(this.weaponDef, this.rarity);
        const need = stats.magSize - this.mag;
        const have = this.scene.getEnemyAmmo(this.weaponDef.category);
        const take = Math.min(need, have);
        this.mag += take;
      }
    }

    const player = this.targetPlayer;
    if (!player || player.dead) {
      this.state = 'patrol';
    }

    const dxToPlayer = player ? player.physX - this.physX : 0;
    const distToPlayer = player ? Math.abs(dxToPlayer) : 9999;
    const canSee = player ? this.canSeePlayer(player.physX, player.physY) : false;

    if (this.state === 'patrol') {
      if (canSee && distToPlayer < this.aggroRange && !player.spawnProtect) this.state = 'chase';
      else {
        const dxToTarget = this.targetX - this.physX;
        if (Math.abs(dxToTarget) < 12) {
          this.targetX = this.homeX + (Math.random() < 0.5 ? this.patrolHalf : -this.patrolHalf);
          this.stateTimer = 0.5;
        }
        const dir = Math.sign(dxToTarget);
        this.vx = dir * 60;
        if (dir !== 0) this.face = dir;
        // keep within patrol around home
        if (Math.abs(this.physX - this.homeX) > this.patrolHalf) {
          this.targetX = this.homeX;
        }
      }
    } else if (this.state === 'chase') {
      if (player && distToPlayer < this.attackRange * 0.95 && canSee) {
        this.state = 'shoot';
        this.vx = 0;
        this.face = Math.sign(dxToPlayer) || this.face;
      } else if (player && distToPlayer > 1200) {
        this.state = 'patrol';
      } else {
        // approach
        const dir = Math.sign(dxToPlayer);
        this.vx = dir * 120;
        if (dir !== 0) this.face = dir;
      }
    } else if (this.state === 'shoot') {
      const dir = Math.sign(dxToPlayer);
      if (dir !== 0) this.face = dir;
      if (!player || distToPlayer > this.attackRange * 1.25) {
        this.state = 'chase';
        return;
      }
      // shoot at player
      this.tryShoot(player, dt);
      // strafe
      this.strafeT -= dt;
      if (this.strafeT <= 0) {
        this.strafeT = 1 + Math.random() * 1.4;
        this.strafeDir = Math.random() < 0.5 ? -1 : 1;
      }
      this.vx = this.strafeDir * 70;
      // reposition if wall in front
      if (this.isSolid(this.physX + this.face * 34, this.physY, 6, 40)) {
        this.strafeDir *= -1;
        this.vx = this.strafeDir * 90;
      }
      if (player && Math.abs(player.physY - this.physY) > 120) {
        // player higher/lower: try to jump occasionally
        if (Math.random() < 0.01) { this.vy = -650; this.onGround = false; }
      }
    }

    // physics
    const maxSpeed = 140;
    this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));
    this.vy = Math.min(1500, this.vy + 2300 * dt);

    const hbw = HITBOX_W / 2;
    const hbh = HITBOX_H / 2;

    const nx = this.physX + this.vx * dt;
    if (!this.isSolid(nx - hbw, this.physY - hbh, HITBOX_W, HITBOX_H - 4)) {
      this.sprite.x = nx;
    } else {
      this.vx = 0;
    }

    let onTerrain = false;
    const ny = this.physY + this.vy * dt;
    const bottom = ny + hbh;
    const groundHere = groundAt(this.world, this.physX);
    if (this.vy >= 0 && bottom > groundHere) {
      this.sprite.y = groundHere - hbh - 8;
      this.vy = 0;
      onTerrain = true;
    }
    for (const s of this.world.solids) {
      if (bottom >= s.y && bottom <= s.y + s.h && topOf(this.physY, hbh) < s.y && this.physX > s.x - hbw && this.physX < s.x + s.w + hbw && this.vy >= 0) {
        this.sprite.y = s.y - hbh - 8;
        this.vy = 0;
        onTerrain = true;
      }
    }
    this.onGround = onTerrain;
    if (this.onGround) {
      this.sprite.y = this.sprite.y;
    } else {
      this.sprite.y = ny;
    }
    // clamp to prevent sinking
    if (this.isSolid(this.physX - hbw, this.physY - hbh, HITBOX_W, HITBOX_H)) {
      this.sprite.y -= 8;
      this.onGround = true;
      this.vy = 0;
    }

    // animation
    const anim = !this.onGround ? (this.vy < 0 ? 'jump' : 'fall') : Math.abs(this.vx) > 20 ? (Math.abs(this.vx) > 90 ? 'run' : 'walk') : 'idle';
    if (this.hurtFlashT <= 0) this.sprite.play(`char_${this.skin}_${anim}`, true);
    this.sprite.setFlipX(this.face < 0);
  }

  canSeePlayer(px: number, py: number): boolean {
    // raycast through solids AND terrain hills (terrains block line of sight)
    const dx = px - this.physX;
    const dy = py - this.physY;
    const dist = Math.hypot(dx, dy) || 1;
    const steps = Math.min(24, Math.max(8, Math.ceil(dist / 32)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = this.physX + dx * t;
      const y = this.physY + dy * t;
      if (this.isSolid(x, y, 4, 4)) return false;
      // terrain check: projectile is blocked if it dips below ground along the line
      if (y > groundAt(this.world, x) + 6) return false;
    }
    return true;
  }

  tryShoot(player: { physX: number; physY: number }, dt: number) {
    if (this.reloading) return;
    const stats = getWeaponStats(this.weaponDef, this.rarity);
    if (this.fireCooldown > 0) return;
    if (this.mag <= 0) {
      // consume global ammo pool
      const have = this.scene.getEnemyAmmo(this.weaponDef.category);
      if (have > 1) {
        this.reloading = true;
        this.reloadT = stats.reloadTime;
        audio.reloadStart();
      }
      return;
    }
    this.fireCooldown = 1 / stats.fireRate;
    this.mag--;
    if ((window as any).__errors && this.name) {
      (window as any).__errors.push(`[${((performance.now() / 1000).toFixed(2))}s] [SHOT] ${this.name} at=(${Math.round(this.physX)},${Math.round(this.physY)}) player=(${Math.round(player.physX)},${Math.round(player.physY)}) dist=${Math.round(Math.abs(this.physX - player.physX))} state=${this.state}`);
    }
    const aimDY = (player.physY - this.physY);
    const aimD = Math.abs(player.physX - this.physX);
    const angleToPlayer = Math.atan2(aimDY, player.physX - this.physX);
    const error = (Math.random() - 0.5) * 2 * this.accuracy * (this.weaponDef.category === 'shotgun' ? 2.5 : 1);
    const fireAngle = angleToPlayer + error;
    this.scene.fireProjectile(this, fireAngle, stats, true);
    audio.shot(this.weaponDef.category);
    // muzzle
    this.scene.spawnMuzzle(this.sprite.x + this.face * 22, this.sprite.y - 8, this.weaponDef.category);
    if (this.mag === 0 && this.scene.getEnemyAmmo(this.weaponDef.category) > 1) {
      this.reloading = true;
      this.reloadT = stats.reloadTime;
      audio.reloadStart();
    }
  }
}

function topOf(y: number, hbh: number) {
  return y - hbh;
}