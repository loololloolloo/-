import Phaser from 'phaser';
import { generateWorld, groundAt, WORLD_W, WORLD_H, type WorldData, type FloorLootDef, type SolidDef, type AABB } from '../systems/worldGen';
import { Player } from '../objects/Player';
import { Enemy } from '../objects/Enemy';
import { HUD } from '../ui/HUD';
import { WEAPONS, getWeaponStats, type WeaponDef, type RarityKey } from '../data/weapons';
import { CONSUMABLES, type ConsumableDef } from '../data/items';
import { MATERIALS, PIECES, PIECE_KEYS, RESOURCE_COST, type PieceType } from '../data/materials';
import { audio } from './bootScene';

export interface GameInit {
  mode?: 'battle' | 'zeroBuild';
}

interface Projectile {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  dmg: number;
  fromPlayer: boolean;
  fromEnemy?: Enemy;
  kind: 'bullet' | 'rocket';
  radius: number;
  def: WeaponDef;
  life: number;
}

interface Pickup {
  sprite: Phaser.GameObjects.Image;
  kind: 'weapon' | 'consumable' | 'material';
  weaponId?: string;
  rarity?: RarityKey;
  consumableId?: string;
  count?: number;
  material?: 'wood' | 'stone' | 'metal';
  life: number;
  bobT: number;
}

interface BuildPiece {
  sprite: Phaser.GameObjects.Image;
  body: SolidDef;
  piece: PieceType;
  material: 'wood' | 'stone' | 'metal';
  hp: number;
  maxHp: number;
  buildT: number;
  maxBuildT: number;
  breaking: boolean;
  breakT: number;
  hitFlashT: number;
}

export class GameScene extends Phaser.Scene {
  world!: WorldData;
  player!: Player;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  pickups: Pickup[] = [];
  buildPieces: BuildPiece[] = [];
  hud!: HUD;

  weaponDefs: Record<string, WeaponDef> = {};
  consumableDefs: Record<string, ConsumableDef> = {};

  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  mouse!: Phaser.Input.Pointer;

  cameraShakeT = 0;
  cameraShakeAmp = 0;

  stormCenterX = 0;
  stormRadius = 0;
  stormPhase = 0;
  stormTimer = 0;
  stormPhaseTimers: number[] = [40, 35, 30, 25, 20, 15, 12, 10];
  stormMaxRadius = 6000;
  stormLabel = '';
  aliveCount = 0;
  gameOver = false;
  victory = false;
  mode: 'battle' | 'zeroBuild' = 'battle';

  // harvest object tracking
  harvestObjects: { sprite: Phaser.GameObjects.Image; def: { x: number; y: number; kind: string; resource: string; hp: number; maxHp: number; id: number } | null }[] = [];

  private gridGfx!: Phaser.GameObjects.Graphics;
  previewSprite!: Phaser.GameObjects.Image;
  previewValid = true;
  buildMaterial: 'wood' | 'stone' | 'metal' = 'wood';
  private buildKeyTimer = 0;

  private enemyAmmo: Record<string, number> = {};

  private cameraTargetX = 0;
  private cameraTargetY = 0;

  private stormGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super('game');
    for (const w of WEAPONS) this.weaponDefs[w.id] = w;
    this.consumableDefs = CONSUMABLES;
  }

  get audioSys() {
    return audio;
  }

  create(data: GameInit) {
    (window as any).__activeScene = 'game';
    (window as any).__phase = 'game-create';
    this.mode = data.mode ?? 'battle';
    this.world = generateWorld(this);
    (window as any).__phase = 'world-generated';
    this.cameras.main.setBackgroundColor('#9fd8ff');
    // sky gradient via full-screen image
    const sky = this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x7cc4f0).setDepth(-30).setOrigin(0, 0);
    sky.setFillStyle(0x7cc4f0, 1);
    this.drawSky();

    // custom physics (no arcade world for entities)

    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.buildPieces = [];

    // player
    const skins = ['jonesy', 'bandit', 'reaper', 'royale'] as const;
    const skin = skins[Math.floor(Math.random() * skins.length)];
    this.player = new Player(this, this.world, skin, this.world.playerSpawn.x, this.world.playerSpawn.y);
    this.player.ammo['light'] = 20;
    this.player.ammo['medium'] = 10;
    this.player.resources = { wood: 50, stone: 10, metal: 0 };
    // starting weapon: pickaxe represented by slot 0 (consumable-less, no weapon)
    // spawn enemies
    this.spawnEnemies();

    // chests & loots
    this.spawnWorldPickups();

    // HUD
    this.hud = new HUD(this);

    // camera
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.12);
    // keep above terrain
    this.cameras.main.setDeadzone(80, 40);

    // initial player weapons (from nearest loot)
    this.giveStarterGear();

    // storm
    this.stormCenterX = 108 * 64;
    this.stormRadius = this.stormMaxRadius;
    this.stormPhase = 0;
    this.stormTimer = this.stormPhaseTimers[0];

    this.gridGfx = this.add.graphics().setDepth(9);
    this.previewSprite = this.add.image(0, 0, 'b_wall_wood').setVisible(false).setAlpha(0.55).setDepth(8);
    this.stormGfx = this.add.graphics().setDepth(-5);

    this.setupInput();
    this.drawStorm();

    this.cameras.main.on('camerafadeincomplete', () => {});
    this.cameras.main.fadeIn(700, 0, 0, 0);
    this.cameras.main.flash(400, 200, 230, 255);

    this.stormLabel = `Storm closing in ${Math.ceil(this.stormTimer)}s`;

    // intro message
    this.hud.notify('Harvest, build, survive. Last one standing wins!', '#ffe45e', 3000);
  }

  drawSky() {
    // big sky gradient image (cheap) - using rectangle in camera bounds is cheaper; overlay colors via camera bg
    // clouds
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * WORLD_W;
      const y = Math.random() * 140 + 40;
      const cloud = this.add.ellipse(x, y, 120 + Math.random() * 160, 30 + Math.random() * 18, 0xffffff, 0.85).setDepth(-28);
      const cloud2 = this.add.ellipse(x + 40 + Math.random() * 60, y - 8, 90 + Math.random() * 80, 22, 0xfff, 0.8).setDepth(-28);
      cloud.setBlendMode(Phaser.BlendModes.NORMAL);
      cloud2.setBlendMode(Phaser.BlendModes.NORMAL);
    }
  }

  setupInput() {
    this.keys = this.input.keyboard!.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      ctrl: Phaser.Input.Keyboard.KeyCodes.CTRL,
      c: Phaser.Input.Keyboard.KeyCodes.C,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      f: Phaser.Input.Keyboard.KeyCodes.F,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      b: Phaser.Input.Keyboard.KeyCodes.B,
      tab: Phaser.Input.Keyboard.KeyCodes.TAB,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      four: Phaser.Input.Keyboard.KeyCodes.FOUR,
      five: Phaser.Input.Keyboard.KeyCodes.FIVE,
      x: Phaser.Input.Keyboard.KeyCodes.X,
      m: Phaser.Input.Keyboard.KeyCodes.M,
    }) as any;

    this.input.keyboard!.on('keydown-SPACE', () => {
      this.player.tryJump();
      this.player.jumpHeld = true;
    });
    this.input.keyboard!.on('keyup-SPACE', () => {
      this.player.jumpHeld = false;
    });
    this.input.keyboard!.on('keydown-W', () => {
      if (this.player.onGround) {
        this.player.tryJump();
        this.player.jumpHeld = true;
      }
    });
    this.input.keyboard!.on('keyup-W', () => (this.player.jumpHeld = false));
    this.input.keyboard!.on('keydown-UP', () => this.player.tryJump());
    this.input.keyboard!.on('keydown-SHIFT', () => this.player.setWantSprint(true));
    this.input.keyboard!.on('keyup-SHIFT', () => this.player.setWantSprint(false));
    this.input.keyboard!.on('keydown-CTRL', () => this.player.setCrouch(true));
    this.input.keyboard!.on('keyup-CTRL', () => this.player.setCrouch(false));
    this.input.keyboard!.on('keydown-C', () => this.player.setCrouch(true));
    this.input.keyboard!.on('keyup-C', () => this.player.setCrouch(false));
    this.input.keyboard!.on('keydown-R', () => this.player.tryReload());

    this.input.keyboard!.on('keydown-ONE', () => this.player.selectSlot(0));
    this.input.keyboard!.on('keydown-TWO', () => this.player.selectSlot(1));
    this.input.keyboard!.on('keydown-THREE', () => this.player.selectSlot(2));
    this.input.keyboard!.on('keydown-FOUR', () => this.player.selectSlot(3));
    this.input.keyboard!.on('keydown-FIVE', () => this.player.selectSlot(4));
    this.input.keyboard!.on('keydown-Q', () => this.cycleSlot(-1));
    this.input.keyboard!.on('keydown-X', () => this.cycleSlot(1));
    this.input.keyboard!.on('keydown-TAB', () => this.cycleSlot(1));

    this.input.keyboard!.on('keydown-B', () => this.player.setBuildMode(!this.player.buildMode));
    this.input.keyboard!.on('keydown-F', () => {
      if (this.player.buildMode) this.player.switchBuildPiece(1);
    });
    this.input.keyboard!.on('keydown-E', () => this.interact());

    this.input.on('pointermove', () => this.updateAim());
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() || pointer.button === 2) {
        if (this.player.buildMode) this.placeBuild();
        else this.player.setBuildMode(true);
      } else {
        this.player.jumpHeld = true;
        this.player.tryJump();
        this.player.setWantSprint(true);
      }
    });
    this.input.on('pointerup', () => {
      this.player.jumpHeld = false;
      this.player.setWantSprint(false);
    });

    this.input.mouse?.disableContextMenu();
  }

  cycleSlot(dir: number) {
    if (this.player.buildMode) this.player.switchBuildPiece(dir);
    else this.player.cycleSlot(dir);
  }

  updateAim() {
    const mp = this.mouse;
    if (!mp) return;
    const worldPt = this.cameras.main.getWorldPoint(mp.x, mp.y);
    const dx = worldPt.x - this.player.sprite.x;
    const dy = worldPt.y - this.player.sprite.y;
    this.player.setAim(Math.atan2(dy, dx));
    if (Math.abs(dx) > 6) this.player.face = Math.sign(dx);
  }

  interact() {
    const p = this.player;
    // chests
    for (const c of this.world.chests) {
      if (Math.abs(p.physX - c.x) < 60 && Math.abs(p.physY - c.y) < 70) {
        this.openChest(c);
        return;
      }
    }
    // pickups
    for (const pk of this.pickups) {
      if (Math.abs(p.physX - pk.sprite.x) < 46 && Math.abs(p.physY - pk.sprite.y) < 50) {
        this.collectPickup(pk);
        return;
      }
    }
  }

  spawnEnemies() {
    const names = ['Volt', 'Cinder', 'Sage', 'Nova', 'Riza', 'Jax', 'Rook', 'Drako', 'Elara', 'Finn', 'Kite', 'Marlo', 'Zara', 'Onyx', 'Bolt'];
    let ni = 0;
    for (const e of this.world.enemySpawns) {
      const name = names[ni++ % names.length];
      const enemy = new Enemy(this, this.world, e.skin, e.weaponId, e.rarity as RarityKey, e.x, e.y, e.patrol, name);
      this.enemies.push(enemy);
      this.enemyAmmo[ammoC(e.weaponId)] = (this.enemyAmmo[ammoC(e.weaponId)] || 0) + 500;
    }
    this.aliveCount = 1 + this.enemies.length;
  }

  spawnWorldPickups() {
    for (const chestDef of this.world.chests) {
      this.addChestSprite(chestDef);
    }
    for (const loot of this.world.floorLoot) {
      this.addPickup(loot);
    }
    for (const hv of this.world.harvestables) {
      this.addHarvestSprite(hv);
    }
  }

  addChestSprite(def: { x: number; y: number; tier: number; id: number }) {
    const spr = this.add.image(def.x, def.y, 't_chest').setDepth(4);
    spr.setScale(1.2);
    const tierCol = def.tier === 3 ? '#ffd23f' : def.tier === 2 ? '#b04cf0' : '#2f9bf4';
    const halo = this.add.ellipse(def.x, def.y - 6, 60, 26, 0xffffff, 0.25).setDepth(3);
    halo.setStrokeStyle(2, parseInt(tierCol.replace('#', ''), 16), 0.8);
    (spr as any).chestDef = def;
    (spr as any).chestHalo = halo;
    (spr as any).opened = false;
  }

  addPickup(def: FloorLootDef) {
    const key =
      def.kind === 'weapon'
        ? `w_${def.weaponId}_${def.rarity}`
        : `i_${def.consumableId}`;
    if (!this.textures.exists(key)) return;
    const spr = this.add.image(def.x, def.y, key).setDepth(3);
    spr.setScale(1);
    // glow
    const col = def.kind === 'weapon' ? rarityCol(def.rarity) : 0x9ad8ff;
    const glow = this.add.ellipse(def.x, def.y, 40, 20, col, 0.2).setDepth(2);
    const pk: Pickup = {
      sprite: spr,
      kind: def.kind,
      weaponId: def.weaponId,
      rarity: def.rarity as RarityKey,
      consumableId: def.consumableId,
      count: def.count,
      life: 120,
      bobT: Math.random() * 10,
    };
    this.pickups.push(pk);
    (pk.sprite as any).pickupRef = pk;
    (pk.sprite as any).glowRef = glow;
  }

  addHarvestSprite(def: { x: number; y: number; kind: string; resource: string; hp: number; maxHp: number; id: number; scale?: number }) {
    let key: string;
    let depth = 4;
    switch (def.kind) {
      case 'tree_oak': key = 'tree_oak'; depth = 4; break;
      case 'tree_pine': key = 'tree_pine'; depth = 4; break;
      case 'tree_palm': key = 'tree_palm'; depth = 4; break;
      case 'rock': key = 't_rock'; depth = 4; break;
      case 'bush': key = 't_bush'; depth = 3; break;
      case 'flower': key = ['t_flower_y', 't_flower_r'][def.id % 2]; depth = 3; break;
      case 'car': key = 't_car'; depth = 4; break;
      case 'crate': key = 't_crate'; depth = 3; break;
      case 'ammocrate': key = 't_ammocrate'; depth = 3; break;
      default: key = 't_bush';
    }
    const spr = this.add.image(def.x, def.y, key).setDepth(depth);
    if (def.scale) spr.setScale(def.scale);
    if (def.kind === 'rock') spr.setOrigin(0.5, 1).setY(def.y - 0);
    (spr as any).harvestDef = def;
  }

  giveStarterGear() {
    // nearest loot gets auto-equipped
    const sorted = [...this.world.floorLoot].filter((l) => l.kind === 'weapon').sort(
      (a, b) => Math.abs(a.x - this.player.physX) - Math.abs(b.x - this.player.physX)
    );
    if (sorted[0]) {
      // make it visible pickup
    }
    // give player a pistol in slot 0
    this.player.items[0] = { weaponId: 'pistol', rarity: 'common' as RarityKey, count: 1 };
    this.player.selectSlot(0);
    // second slot SMG
    this.player.items[4] = { weaponId: 'assault', rarity: 'common' as RarityKey, count: 1 };
  }

  update(time: number, delta: number) {
    const p = this.player;
    if (p) {
      (window as any).__gameState = {
        px: p.sprite.x,
        py: p.sprite.y,
        hp: p.health,
        sh: p.shield,
        sp: p.spawnProtect,
        w: p.weapon?.def.id ?? null,
        buildMode: p.buildMode,
        slot: p.currentSlot,
        enemies: this.enemies.length,
        pickups: this.pickups.length,
        wood: p.resources.wood,
        cam: Math.round(this.cameras.main.scrollX) + ',' + Math.round(this.cameras.main.scrollY),
        screen: (() => {
          const sp = this.cameras.main.getWorldPoint(0, 0);
          return { x: p.sprite.x - sp.x, y: p.sprite.y - sp.y };
        })(),
        spriteInfo: (p.sprite.visible ? 'V' : 'H') + ' a=' + p.sprite.alpha.toFixed(2) + ' d=' + p.sprite.depth + ' ' + (p.sprite as any).texture?.key + ' ' + (p.sprite.anims?.currentAnim?.key ?? '-') + ' frame=' + (p.sprite as any).frame?.name + ' rend=' + (p.sprite as any).renderable + ' scl=' + p.sprite.scale + ' fw=' + (p.sprite as any).width + ' fh=' + (p.sprite as any).height + ' cams=' + this.cameras.cameras.length + ' cview=' + Math.round(this.cameras.main.worldView.x) + ',' + Math.round(this.cameras.main.worldView.y) + ',' + Math.round(this.cameras.main.worldView.width) + ',' + Math.round(this.cameras.main.worldView.height),
        phy: 'vy=' + Math.round(p.vy) + ' g=' + Math.round(groundAt(this.world, p.physX)) + ' onG=' + p.onGround + ' dead=' + p.dead,
        nearEnemy: (() => {
          let best: { d: number; n: string; s: string } | null = null;
          for (const e of this.enemies) {
            if (e.dead) continue;
            const d = Math.abs(e.physX - p.physX);
            if (!best || d < best.d) best = { d, n: e.name, s: e.state };
          }
          return best ? `${best.n}/${best.s}/@${Math.round(best.d)}px` : '-';
        })(),
      };
    }
    if (this.player.dead || this.gameOver) return;
    const dt = Math.min(delta / 1000, 0.033);

    // ---- input ----
    const left = !!this.keys.left.isDown || !!this.keys.a.isDown;
    const right = !!this.keys.right.isDown || !!this.keys.d.isDown;
    p.setMoveDir((right ? 1 : 0) - (left ? 1 : 0));

    // fire with mouse held
    const mouse = this.mouse = this.input.activePointer;
    if (p.buildMode) {
      this.updateBuild(p, dt);
    } else {
      if (mouse.isDown) {
        // if combustable equipped? if weapon fire
        if (p.equipped === 'weapon') p.fireWeapon(true);
        else if (p.equipped === 'consumable') p.useConsumable();
      }
    }

    p.update(delta, { left, right });
    p.postPhysics();

    // pickup proximity (auto)
    for (const pk of this.pickups) {
      if (Math.abs(p.physX - pk.sprite.x) < 32 && Math.abs(p.physY - pk.sprite.y) < 44) {
        this.collectPickup(pk);
      }
    }

    // platform world bounds
    this.enforceBounds();

    // enemies
    for (const e of this.enemies) e.update(delta);

    // projectiles
    this.updateProjectiles(delta);

    // pickups animation
    for (const pk of this.pickups) {
      pk.bobT += dt * 2;
      pk.sprite.y = pk.sprite.y + Math.sin(pk.bobT * 2) * 0.15;
      pk.life -= dt;
      if (pk.life <= 0) this.destroyPickup(pk);
    }

    // build pieces forming-up
    for (const bp of this.buildPieces) {
      if (bp.buildT < bp.maxBuildT) {
        bp.buildT += dt;
        bp.sprite.alpha = 0.55 + 0.45 * Math.min(1, bp.buildT / bp.maxBuildT);
        bp.body.hp = Math.round(bp.maxHp * (0.5 + 0.5 * Math.min(1, bp.buildT / bp.maxBuildT)));
        const mat = MATERIALS[bp.material];
        bp.sprite.setTint(mat.color);
      }
      if (bp.hitFlashT > 0) {
        bp.hitFlashT -= dt;
        bp.sprite.setTint(0xffffff);
      }
    }

    // storm
    this.updateStorm(delta);

    // camera follow + shake
    this.updateCamera(delta);

    // HUD
    this.hud.updateHUD();
    this.hud.updateKillFeed(delta);

    // kill check
    if (this.enemies.every((e) => e.dead)) {
      this.winGame();
    }
  }

  enforceBounds() {
    const p = this.player;
    if (p.sprite.x < 40) p.sprite.x = 40;
    if (p.sprite.x > WORLD_W - 40) p.sprite.x = WORLD_W - 40;
    if (p.sprite.y > WORLD_H - 20) {
      p.sprite.y = WORLD_H - 20;
      p.vy = 0;
    }
    for (const e of this.enemies) {
      if (e.sprite.x < 30) e.sprite.x = 30;
      if (e.sprite.x > WORLD_W - 30) e.sprite.x = WORLD_W - 30;
    }
  }

  updateCamera(delta: number) {
    const p = this.player;
    const cam = this.cameras.main;
    // aim lookahead
    const lookX = Math.cos(p.aimAngle) * 40;
    const lookY = Math.sin(p.aimAngle) * 30;
    this.cameraTargetX = p.sprite.x + lookX;
    this.cameraTargetY = p.sprite.y + lookY - 10;
    if (this.cameraShakeT > 0) {
      this.cameraShakeT -= Math.min(delta / 1000, 0.033);
      const amp = this.cameraShakeAmp * this.cameraShakeT;
      cam.setScroll(cam.scrollX + (Math.random() - 0.5) * amp, cam.scrollY + (Math.random() - 0.5) * amp);
    }
  }

  updateStorm(delta: number) {
    this.stormTimer -= Math.min(delta / 1000, 0.033);
    if (this.stormTimer <= 0) {
      this.advanceStorm();
    }
  }

  advanceStorm() {
    this.stormPhase++;
    if (this.stormPhase >= this.stormPhaseTimers.length) {
      // final storm: everyone outside takes heavy
      this.stormPhase = this.stormPhaseTimers.length;
      this.stormTimer = Infinity;
    } else {
      this.stormTimer = this.stormPhaseTimers[this.stormPhase];
      this.stormRadius *= 0.72;
    }
    audio.stormWarning();
    this.cameras.main.flash(300, 150, 30, 60);
    this.hud.notify(this.stormPhase < 5 ? 'STORM SHRINKING!' : 'FINAL STORM!', '#ff6a5a', 2000);
    this.drawStorm();
  }

  drawStorm() {
    this.stormGfx.clear();
    const left = this.stormCenterX - this.stormRadius;
    const right = this.stormCenterX + this.stormRadius;
    const top = -200;
    const bottom = WORLD_H + 200;
    this.stormGfx.fillStyle(0x3a4a7a, 0.18);
    if (left > 0) this.stormGfx.fillRect(0, top, left, bottom - top);
    if (right < WORLD_W) this.stormGfx.fillRect(right, top, WORLD_W - right, bottom - top);
    // draw vertical storm edge lines
    this.stormGfx.lineStyle(6, 0x8ad4ff, 0.5);
    this.stormGfx.beginPath();
    this.stormGfx.moveTo(left, 0);
    this.stormGfx.lineTo(left, WORLD_H);
    this.stormGfx.strokePath();
    this.stormGfx.beginPath();
    this.stormGfx.moveTo(right, 0);
    this.stormGfx.lineTo(right, WORLD_H);
    this.stormGfx.strokePath();
    this.stormRadius = Math.max(this.stormRadius, 400);
  }

  updateBuild(p: Player, dt: number) {
    this.buildKeyTimer -= dt;
    // material cycle on Middle or F
    const cycleKey = this.input.keyboard!.checkDown(this.keys.f as any, 150);
    if (cycleKey) {
      const mats = ['wood', 'stone', 'metal'] as const;
      const idx = mats.indexOf(this.buildMaterial);
      this.buildMaterial = mats[(idx + 1) % 3];
      audio.uiHover();
    }
    const pDef = PIECES[PIECE_KEYS[p.buildingPiece]];
    const mat = MATERIALS[this.buildMaterial];
    this.previewSprite.setTexture(`b_${pDef.key}_${this.buildMaterial}`);
    // grid snap to 64
    const c = this.cameras.main;
    const mp = this.input.activePointer;
    const wp = c.getWorldPoint(mp.x, mp.y);
    const tx = Math.floor(wp.x / 64) * 64 + 32;
    const gy = Math.floor(wp.y / 64) * 64 + 32;
    let px = tx;
    let py = gy;
    if (pDef.key === 'floor') {
      py = Math.floor(wp.y / 16) * 16 + 8;
    }
    if (pDef.key === 'ramp') {
      px = Math.floor(wp.x / 64) * 64 + 32;
      py = Math.floor(wp.y / 64) * 64 + 32;
    }
    this.previewSprite.setPosition(px, py);
    this.previewSprite.setVisible(true);

    this.previewValid = this.canPlace(px, py, pDef.key);
    this.previewSprite.setTint(this.previewValid ? 0x59d95c : 0xff5050);
    this.previewSprite.setAlpha(this.previewValid ? 0.6 : 0.35);

    if (p.resources[this.buildMaterial] < RESOURCE_COST) this.previewValid = false;
  }

  canPlace(px: number, py: number, piece: PieceType): boolean {
    const box = this.pieceBounds(px, py, piece);
    if (this.player.isSolid(box.x, box.y, box.w, box.h)) return false;
    // overlap build pieces
    for (const bp of this.buildPieces) {
      const b = bp.body;
      if (box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y) return false;
    }
    // must not be too high above ground or floating free (allow floor anywhere in air? require within 250 of any support)
    return true;
  }

  pieceBounds(px: number, py: number, piece: PieceType): AABB {
    if (piece === 'wall') return { x: px - 32, y: py - 32, w: 64, h: 64 };
    if (piece === 'floor') return { x: px - 32, y: py - 8, w: 64, h: 16 };
    // ramp: approximate solid block lower half + slope visual; physics use a block that sinks bottom-right
    return { x: px - 32, y: py - 16, w: 64, h: 48 };
  }

  placeBuild() {
    const p = this.player;
    const pieceDef = PIECES[PIECE_KEYS[p.buildingPiece]];
    const mat = MATERIALS[this.buildMaterial];
    if (!this.previewValid || p.resources[this.buildMaterial] < RESOURCE_COST) {
      audio.buildInvalid();
      return;
    }
    p.resources[this.buildMaterial] -= RESOURCE_COST;
    const px = this.previewSprite.x;
    const py = this.previewSprite.y;
    const bounds = this.pieceBounds(px, py, pieceDef.key);
    const key = `b_${pieceDef.key}_${this.buildMaterial}`;
    const spr = this.add.image(px, py, key).setDepth(4);
    const body: SolidDef = { ...bounds, material: this.buildMaterial, isBuild: true, hp: mat.maxHp, maxHp: mat.maxHp };
    if (pieceDef.key === 'floor') {
      // floor: thin; y at top
      body.y = py - 8;
      body.h = 12;
    } else if (pieceDef.key === 'wall') {
      body.y = py - 32;
      body.h = 64;
    } else {
      body.y = py - 16;
      body.h = 48;
    }
    this.world.solids.push(body);
    this.buildPieces.push({
      sprite: spr,
      body,
      piece: pieceDef.key,
      material: this.buildMaterial,
      hp: mat.minHp,
      maxHp: mat.maxHp,
      buildT: 0,
      maxBuildT: mat.buildTime,
      breaking: false,
      breakT: 0,
      hitFlashT: 0,
    });
    audio.buildPlace();
    this.spawnDebris(px, py, mat.color, 6);
    this.cameraShake(0.1, 180);
  }

  cameraShake(duration: number, amp: number) {
    this.cameraShakeT = duration;
    this.cameraShakeAmp = amp;
  }

  spawnDebris(x: number, y: number, col: number, count: number) {
    for (let i = 0; i < count; i++) {
      const r = this.add.rectangle(x, y, 4 + Math.random() * 5, 4 + Math.random() * 5, col).setDepth(6);
      this.tweens.add({
        targets: r,
        y: y - 30 - Math.random() * 40,
        x: x + (Math.random() - 0.5) * 60,
        alpha: 0,
        angle: (Math.random() - 0.5) * 360,
        duration: 500 + Math.random() * 400,
        onComplete: () => r.destroy(),
      });
    }
  }

  fireProjectile(from: Player | Enemy, angle: number, def: WeaponDef, fromEnemy = false) {
    if (!fromEnemy) {
      const p = from as Player;
      const sx = p.sprite.x + Math.cos(angle) * 24;
      const sy = p.sprite.y - 2 + Math.sin(angle) * 24;
      if (def.category === 'rocket') this.spawnRocket(sx, sy, angle, def, p, false);
      else this.spawnBullet(sx, sy, angle, def, p, false);
    } else {
      const e = from as Enemy;
      const sx = e.sprite.x + Math.cos(angle) * 22;
      const sy = e.sprite.y - 4 + Math.sin(angle) * 22;
      if (def.category === 'rocket') this.spawnRocket(sx, sy, angle, def, e, true);
      else this.spawnBullet(sx, sy, angle, def, e, true);
    }
  }

  private bulletTail!: Phaser.GameObjects.Line;

  spawnBullet(x: number, y: number, angle: number, def: WeaponDef, from: Player | Enemy, enemy: boolean) {
    const speed = def.category === 'sniper' ? 4200 : def.category === 'shotgun' ? 1900 : 2600;
    const stats = getWeaponStats(def, from instanceof Player ? from.weapon?.rarity ?? 'common' : (from as Enemy).rarity);
    const img = this.add.image(x, y, 'glow_dot').setDepth(6).setTint(0xffe070).setScale(0.8);
    img.setRotation(angle);
    const srcRar = from instanceof Player ? from.weapon?.rarity ?? 'common' : (from as Enemy).rarity;
    const pr: Projectile = {
      sprite: img,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      dmg: stats.damage,
      fromPlayer: !enemy,
      fromEnemy: enemy ? (from as Enemy) : undefined,
      kind: 'bullet',
      radius: 6,
      def,
      life: 1.6,
    };
    this.projectiles.push(pr);
  }

  spawnRocket(x: number, y: number, angle: number, def: WeaponDef, from: Player | Enemy, enemy: boolean) {
    const stats = getWeaponStats(def, from instanceof Player ? (from.weapon?.rarity ?? "epic") : (from as Enemy).rarity);
    const img = this.add.image(x, y, 'glow_dot').setDepth(6).setTint(0xff5030).setScale(1.4);
    const pr: Projectile = {
      sprite: img,
      vx: Math.cos(angle) * 560,
      vy: Math.sin(angle) * 560,
      dmg: stats.damage,
      fromPlayer: !enemy,
      fromEnemy: enemy ? (from as Enemy) : undefined,
      kind: 'rocket',
      radius: 14,
      def,
      life: 2.4,
    };
    this.projectiles.push(pr);
  }

  updateProjectiles(delta: number) {
    const dt = Math.min(delta / 1000, 0.033);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      if (p.kind === 'rocket') {
        // trail
        const trail = this.add.circle(p.sprite.x, p.sprite.y, 3, 0xffa060, 0.6).setDepth(5);
        this.tweens.add({ targets: trail, alpha: 0, scale: 2, duration: 200, onComplete: () => trail.destroy() });
      }
      p.life -= dt;
      let dead = p.life <= 0;
      if (!dead) {
        // terrain collision
        const ground = groundAt(this.world, p.sprite.x);
        if (p.sprite.y > ground) {
          if (p.kind === 'rocket') this.explode(p);
          else this.impact(p);
          dead = true;
        }
        // solid collision
        for (const b of this.world.solids) {
          if (p.sprite.x > b.x && p.sprite.x < b.x + b.w && p.sprite.y > b.y && p.sprite.y < b.y + b.h) {
            if (p.kind === 'rocket') this.explode(p);
            else this.impact(p);
            this.hitBuild(p, b);
            dead = true;
            break;
          }
        }
      }
      // hit entities
      if (!dead && p.fromPlayer) {
        const dmg = p.dmg;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const hw = 14;
          const hh = 26;
          if (
            Math.abs(p.sprite.x - e.sprite.x) < hw + p.radius &&
            Math.abs(p.sprite.y - (e.sprite.y - 2)) < hh + p.radius
          ) {
            if (p.kind === 'rocket') {
              this.explode(p);
              dead = true;
              break;
            }
            // headshot check
            const headshot = Math.abs(p.sprite.y - (e.sprite.y - 22)) < 12;
            const dmgFinal = headshot ? Math.round(dmg * (p.def.headshotMult || 2)) : dmg;
            e.damage(dmgFinal, p.sprite.x, headshot);
            this.impact(p);
            dead = true;
            break;
          }
        }
      } else if (!dead && p.fromEnemy) {
        const player = this.player;
        if (!player.dead) {
          const hw = 12;
          const hh = 24;
          if (
            Math.abs(p.sprite.x - player.sprite.x) < hw + p.radius &&
            Math.abs(p.sprite.y - (player.sprite.y) + 4) < hh + p.radius
          ) {
            if (p.kind === 'rocket') {
              this.explode(p);
              dead = true;
            } else {
              player.damage(p.dmg, p.sprite.x);
              this.impact(p);
              dead = true;
              this.hud.notify(`Hit by ${p.fromEnemy.name}`, '#ff6a5a', 900);
            }
          }
        }
      }
      if (dead) {
        p.sprite.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  hitBuild(proj: Projectile, body: SolidDef) {
    if (!body.isBuild) return;
    const bp = this.buildPieces.find((b) => b.body === body);
    if (!bp) return;
    const dmg = proj.dmg * 0.6;
    this.damageBuild(bp, dmg);
  }

  explode(pr: Projectile) {
    const stats = pr.def ? getWeaponStats(pr.def, pr.fromPlayer ? 'epic' : 'rare') : { damage: 100, aoeRadius: 130 };
    const r = stats.aoeRadius || 130;
    audio.explosion();
    this.cameraShake(0.35, 560);
    // visuals
    const boom = this.add.image(pr.sprite.x, pr.sprite.y, 'glow_dot').setDepth(7).setTint(0xffa040).setScale(4);
    this.tweens.add({ targets: boom, scale: 8, alpha: 0, duration: 300, onComplete: () => boom.destroy() });
    for (let i = 0; i < 16; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 260;
      const pr2 = this.add.rectangle(pr.sprite.x, pr.sprite.y, 4, 4, [0xffa040, 0xff6040, 0xffc080][i % 3]).setDepth(6);
      this.tweens.add({
        targets: pr2,
        x: pr2.x + Math.cos(ang) * sp,
        y: pr2.y + Math.sin(ang) * sp + 40,
        alpha: 0,
        angle: Math.random() * 200,
        duration: 400 + Math.random() * 300,
        onComplete: () => pr2.destroy(),
      });
    }
    // damage all enemies in radius
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.sprite.x - pr.sprite.x, e.sprite.y - pr.sprite.y);
      if (d < r) {
        const fall = 1 - d / r;
        e.damage(Math.round(stats.damage * (0.5 + fall * 0.7)), pr.sprite.x);
      }
    }
    // damage player if from enemy
    if (pr.fromEnemy) {
      const d = Math.hypot(this.player.sprite.x - pr.sprite.x, this.player.sprite.y - pr.sprite.y);
      if (d < r) {
        const fall = 1 - d / r;
        this.player.damage(Math.round(stats.damage * (0.5 + fall * 0.7)), pr.sprite.x);
        this.hud.notify(`Hit by ${pr.fromEnemy.name}`, '#ff6a5a', 900);
      }
    }
    // damage builds
    for (const bp of [...this.buildPieces]) {
      const b = bp.body;
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const d = Math.hypot(cx - pr.sprite.x, cy - pr.sprite.y);
      if (d < r + b.w / 2) {
        this.damageBuild(bp, stats.damage * (1 - d / (r + b.w / 2)) * 1.2);
      }
    }
  }

  impact(pr: Projectile) {
    const spark = this.add.rectangle(pr.sprite.x, pr.sprite.y, 5, 5, 0xffe060).setDepth(6);
    this.tweens.add({ targets: spark, alpha: 0, scale: 0.4, duration: 150, onComplete: () => spark.destroy() });
    // micro debris
    for (let i = 0; i < 3; i++) {
      const d = this.add.rectangle(pr.sprite.x, pr.sprite.y, 3, 3, 0xc8b898).setDepth(5);
      this.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 30, y: d.y - 20 - Math.random() * 20, alpha: 0, duration: 250, onComplete: () => d.destroy() });
    }
  }

  damageBuild(bp: BuildPiece, dmg: number) {
    if (bp.breaking) return;
    bp.hp -= dmg;
    bp.hitFlashT = 0.1;
    bp.sprite.setTint(0xffffff);
    if (bp.hp <= 0) {
      this.destroyBuild(bp);
    } else {
      bp.sprite.setAlpha(0.7 + 0.3 * (bp.hp / bp.maxHp));
    }
    audio.buildBreak();
  }

  destroyBuild(bp: BuildPiece) {
    bp.breaking = true;
    bp.breakT = 0;
    this.spawnDebris(bp.sprite.x, bp.sprite.y, MATERIALS[bp.material].color, 10);
    const idx = this.world.solids.indexOf(bp.body);
    if (idx >= 0) this.world.solids.splice(idx, 1);
    this.buildPieces = this.buildPieces.filter((b) => b !== bp);
    bp.sprite.destroy();
  }

  spawnMuzzle(x: number, y: number, cat: string) {
    const key = cat === 'shotgun' ? 'm_shell' : cat === 'sniper' ? 'm_heavy' : cat === 'rocket' ? 'm_rocket' : 'm_light';
    const m = this.add.image(x, y, key).setDepth(7).setScale(1.6).setAngle(Math.random() * 20);
    this.tweens.add({ targets: m, alpha: 0, scale: 2.2, duration: 90, onComplete: () => m.destroy() });
  }

  harvestAt(hx: number, hy: number, player: Player) {
    // find nearest harvestable within range
    let best: (typeof this.world.harvestables)[number] | null = null;
    let bestD = 70;
    for (const h of this.world.harvestables) {
      const d = Math.hypot(h.x - hx, h.y - hy);
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    if (!best) return;
    // damage it
    best.hp -= 34;
    // spawn hit particles
    const spr = this.findHarvestSprite(best.id);
    this.spawnDebris(best.x, best.y - 20, 0x8a5a2a, 3);
    if (spr) {
      spr.setTint(0xffffff);
      this.tweens.add({ targets: spr, alpha: 0.6, duration: 50, yoyo: true, onComplete: () => spr.setAlpha(1) });
    }
    if (best.hp <= 0) {
      this.destroyHarvest(best);
    } else {
      // resource tick
      const getAmt = Math.round(8 + Math.random() * 6);
      if (best.resource === 'wood') player.addResources('wood', getAmt);
      else if (best.resource === 'stone') player.addResources('stone', getAmt);
      else if (best.resource === 'metal') player.addResources('metal', getAmt);
      this.showFloating(best.x, best.y - 40, `+${getAmt} ${best.resource === 'wood' ? 'wood' : best.resource === 'stone' ? 'stone' : best.resource === 'metal' ? 'metal' : ''}`, resourceColor(best.resource));
    }
  }

  findHarvestSprite(id: number): Phaser.GameObjects.Image | null {
    for (const child of this.children.list) {
      if ((child as any).harvestDef && (child as any).harvestDef.id === id) return child as Phaser.GameObjects.Image;
    }
    return null;
  }

  destroyHarvest(def: { x: number; y: number; kind: string; resource: string; hp: number; maxHp: number; id: number }) {
    const idx = this.world.harvestables.indexOf(def as any);
    if (idx >= 0) this.world.harvestables.splice(idx, 1);
    const spr = this.findHarvestSprite(def.id);
    if (spr) {
      spr.destroy();
    }
    // tree falls
    if (def.kind.startsWith('tree')) {
      audio.treeBreak();
      const fall = this.add.image(def.x, def.y, def.kind === 'tree_pine' ? 'tree_pine' : def.kind === 'tree_palm' ? 'tree_palm' : 'tree_oak').setDepth(2);
      fall.setOrigin(0.5, 0.5);
      // fall animation
      this.tweens.add({
        targets: fall,
        angle: -85,
        duration: 500,
        ease: 'Bounce.easeOut',
        x: def.x + (Math.random() < 0.5 ? -1 : 1) * 60,
        onComplete: () => {
          fall.destroy();
          this.spawnDebris(def.x, def.y, 0x6b4426, 8);
        },
      });
    }
    // drops
    const woodAmt = def.resource === 'wood' ? 30 + Math.random() * 30 : 0;
    const stoneAmt = def.resource === 'stone' ? 25 + Math.random() * 25 : 0;
    const metalAmt = def.resource === 'metal' ? 25 + Math.random() * 25 : 0;
    if (woodAmt > 0) this.spawnMaterialDrop(def.x, def.y, 'wood', Math.round(woodAmt));
    if (stoneAmt > 0) this.spawnMaterialDrop(def.x, def.y, 'stone', Math.round(stoneAmt));
    if (metalAmt > 0) this.spawnMaterialDrop(def.x, def.y, 'metal', Math.round(metalAmt));
    this.spawnDebris(def.x, def.y, def.kind === 'rock' ? 0x8a8f9a : 0x6b4426, 6);
  }

  spawnWeaponDrop(x: number, y: number, weaponId: string, rarity: RarityKey) {
    const key = `w_${weaponId}_${rarity}`;
    if (!this.textures.exists(key)) return;
    const spr = this.add.image(x, y, key).setDepth(3);
    const pk: Pickup = {
      sprite: spr,
      kind: 'weapon',
      weaponId,
      rarity,
      life: 60,
      bobT: Math.random() * 10,
    };
    this.pickups.push(pk);
    (spr as any).glowRef = this.add.ellipse(x, y, 40, 18, rarityCol(rarity), 0.2).setDepth(2);
  }

  spawnConsumableDrop(x: number, y: number, id: string, count = 1) {
    const key = `i_${id}`;
    if (!this.textures.exists(key)) return;
    const spr = this.add.image(x, y, key).setDepth(3);
    const pk: Pickup = {
      sprite: spr,
      kind: 'consumable',
      consumableId: id,
      count,
      life: 60,
      bobT: Math.random() * 10,
    };
    this.pickups.push(pk);
    (spr as any).glowRef = this.add.ellipse(x, y, 36, 16, 0x9ad8ff, 0.2).setDepth(2);
  }

  spawnMaterialDrop(x: number, y: number, mat: 'wood' | 'stone' | 'metal', count: number) {
    const spr = this.add.image(x, y, `m_${mat}`).setDepth(3);
    const pk: Pickup = {
      sprite: spr,
      kind: 'material',
      material: mat,
      count,
      life: 50,
      bobT: Math.random() * 10,
    };
    this.pickups.push(pk);
    (spr as any).glowRef = this.add.ellipse(x, y, 30, 14, MATERIALS[mat].color, 0.25).setDepth(2);
  }

  destroyPickup(pk: Pickup) {
    const glow = (pk.sprite as any).glowRef;
    if (glow) glow.destroy();
    pk.sprite.destroy();
    this.pickups = this.pickups.filter((p) => p !== pk);
  }

  collectPickup(pk: Pickup) {
    const p = this.player;
    if (pk.kind === 'weapon') {
      p.pickupItem({ weaponId: pk.weaponId, rarity: pk.rarity });
      this.showFloating(p.sprite.x, p.sprite.y - 46, pk.weaponId!, rarityCss(pk.rarity!));
      audio.pickup();
    } else if (pk.kind === 'consumable') {
      p.pickupItem({ consumableId: pk.consumableId, count: pk.count });
      this.showFloating(p.sprite.x, p.sprite.y - 46, CONSUMABLES[pk.consumableId!].name, '#9ad8ff');
      audio.pickup();
    } else if (pk.kind === 'material') {
      p.addResources(pk.material!, pk.count!);
      this.showFloating(p.sprite.x, p.sprite.y - 46, `+${pk.count} ${pk.material}`, MATERIALS[pk.material!].css);
    }
    this.destroyPickup(pk);
  }

  openChest(def: { x: number; y: number; tier: number; id: number }) {
    const spr = this.findSpriteWith((s) => (s as any).chestDef?.id === def.id);
    if (!spr) return;
    if ((spr as any).opened) return;
    (spr as any).opened = true;
    spr.setTexture('t_chest_open');
    audio.chestOpen();
    this.cameraShake(0.15, 200);
    const halo = (spr as any).chestHalo;
    if (halo) halo.destroy();
    // loot based on tier
    const rolls = def.tier === 3 ? 3 : def.tier === 2 ? 2 : 1;
    const poolWeapons = ['pistol', 'smg', 'assault', 'shotgun'];
    const rarityRoll = def.tier === 3
      ? ['epic', 'rare', 'legendary']
      : def.tier === 2
        ? ['rare', 'uncommon', 'rare']
        : ['uncommon', 'common', 'rare'];
    const rewards: Array<{ weaponId?: string; rarity?: string; consumableId?: string; count?: number }> = [];
    for (let i = 0; i < rolls; i++) {
      const r = rarityRoll[Math.floor(Math.random() * rarityRoll.length)];
      if (Math.random() < 0.7) {
        const w = poolWeapons[Math.floor(Math.random() * poolWeapons.length)];
        rewards.push({ weaponId: w, rarity: r });
      } else {
        const cons = ['bandage', 'shieldpot', 'smallshield'][Math.floor(Math.random() * 3)];
        rewards.push({ consumableId: cons, count: cons === 'bandage' ? 5 : cons === 'shieldpot' ? 2 : 3, rarity: r });
      }
    }
    // ammo bundle
    rewards.unshift({ consumableId: 'ammobundle', count: def.tier * 30, rarity: 'common' });
    // spawn pickups
    let n = 0;
    for (const r of rewards) {
      setTimeout(() => {
        if (r.weaponId) this.spawnWeaponDrop(def.x + Math.cos((n / rewards.length) * Math.PI * 2) * 20, def.y + Math.sin((n / rewards.length) * Math.PI) * 14, r.weaponId!, r.rarity as RarityKey);
        else if (r.consumableId === 'ammobundle') {
          // give ammo directly
          this.player.addAmmo('light', Math.floor((r.count || 0) / 2));
          this.player.addAmmo('medium', Math.floor((r.count || 0) / 2));
          this.showFloating(this.player.sprite.x, this.player.sprite.y - 46, `+${r.count} ammo`, '#b8e8ff');
        } else this.spawnConsumableDrop(def.x + Math.cos((n / rewards.length) * Math.PI * 2) * 20, def.y + Math.sin((n / rewards.length) * Math.PI) * 14, r.consumableId!, r.count);
        n++;
      }, 150 * n);
    }
  }

  findSpriteWith(pred: (s: Phaser.GameObjects.GameObject) => boolean): Phaser.GameObjects.Image | null {
    for (const child of this.children.list) {
      if (pred(child)) return child as Phaser.GameObjects.Image;
    }
    return null;
  }

  showFloating(x: number, y: number, text: string, color: string) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: '20px',
        color,
        stroke: '#0a121e',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(120);
    this.tweens.add({
      targets: t,
      y: y - 42,
      alpha: 0,
      duration: 780,
      onComplete: () => t.destroy(),
    });
  }

  onEnemyKilled(enemy: Enemy) {
    this.aliveCount = Math.max(0, this.aliveCount - 1);
    this.hud.addKill('You', enemy.name, enemy.weaponDef.name);
    this.hud.notify(`${enemy.name} eliminated!`, '#59d95c', 1600);
    audio.kill();
    if (this.enemies.every((e) => e.dead)) this.winGame();
  }

  onPlayerDied() {
    this.gameOver = true;
    audio.defeat();
    this.hud.notify('ELIMINATED', '#ff6a5a', 3000);
    this.time.delayedCall(2200, () => {
      this.scene.start('gameover', { won: false });
    });
  }

  winGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    audio.victory();
    this.time.delayedCall(600, () => {
      this.scene.start('gameover', { won: true });
    });
  }

  get enemyAmmoPool() {
    return this.enemyAmmo;
  }

  getEnemyAmmo(cat: string): number {
    return this.enemyAmmo[ammoC(cat)] || 0;
  }

  // HUD-facing
  get stormGfxRef() { return this.stormGfx; }
}

function ammoC(cat: string): string {
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

function rarityCol(r: string): number {
  const map: Record<string, number> = {
    common: 0xd7d7d7,
    uncommon: 0x51b03d,
    rare: 0x2f9bf4,
    epic: 0xb04cf0,
    legendary: 0xffc91a,
  };
  return map[r] || 0xd7d7d7;
}

function rarityCss(r: string): string {
  const map: Record<string, string> = {
    common: '#d7d7d7',
    uncommon: '#51b03d',
    rare: '#2f9bf4',
    epic: '#b04cf0',
    legendary: '#ffc91a',
  };
  return map[r] || '#ffffff';
}

function resourceColor(r: string): string {
  switch (r) {
    case 'wood': return '#c89a5c';
    case 'stone': return '#c8c7cf';
    case 'metal': return '#b9c6d0';
    default: return '#fff';
  }
}