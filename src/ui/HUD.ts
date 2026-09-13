import Phaser from 'phaser';
import type { GameScene } from '../scenes/gameScene';
import type { Player } from '../objects/Player';
import type { RarityKey } from '../data/weapons';
import { RARITY_CSS } from '../data/weapons';
import { CONSUMABLES } from '../data/items';

const FONT_CONDENSED = "'Luckiest Guy', sans-serif";
const FONT_SANS = "'Rajdhani', sans-serif";

export class HUD {
  scene: GameScene;
  container!: Phaser.GameObjects.Container;

  // health / shield
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpSegs: Phaser.GameObjects.Rectangle[] = [];
  private shieldSegs: Phaser.GameObjects.Rectangle[] = [];
  private hpLabel!: Phaser.GameObjects.Text;
  private shieldLabel!: Phaser.GameObjects.Text;
  private healFlash!: Phaser.GameObjects.Rectangle;

  // hotbar
  private hotbarBg!: Phaser.GameObjects.Rectangle;
  private slotBoxes: Phaser.GameObjects.Rectangle[] = [];
  private slotIcons: Phaser.GameObjects.Image[] = [];
  private slotCounts: Phaser.GameObjects.Text[] = [];
  private slotKeys: Phaser.GameObjects.Text[] = [];
  private rarityRims: Phaser.GameObjects.Arc[] = [];

  // ammo
  private ammoBig!: Phaser.GameObjects.Text;
  private ammoReserve!: Phaser.GameObjects.Text;

  // materials
  private matBoxes: Phaser.GameObjects.Container[] = [];
  private matTexts: Phaser.GameObjects.Text[] = [];

  // build mode
  private buildBoxes: Phaser.GameObjects.Container[] = [];
  private buildSelected: number = -1;

  // crosshair
  private crosshair!: Phaser.GameObjects.Image;
  private crosshairL!: Phaser.GameObjects.Rectangle;
  private crosshairR!: Phaser.GameObjects.Rectangle;
  private crosshairU!: Phaser.GameObjects.Rectangle;
  private crosshairD!: Phaser.GameObjects.Rectangle;

  // notifications / prompts
  prompt!: Phaser.GameObjects.Text;
  private notifQueue: Array<{ txt: string; time: number }> = [];
  private notifTimers: Phaser.GameObjects.Text[] = [];

  // storm
  stormWarning!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private aliveText!: Phaser.GameObjects.Text;
  spawnShieldText!: Phaser.GameObjects.Text;

  // kill feed
  private killFeed: Phaser.GameObjects.Text[] = [];
  private killFeedTimers: number[] = [];

  // minimap
  minimap!: Phaser.GameObjects.Graphics;

  constructor(scene: GameScene) {
    this.scene = scene;
    this.build();
  }

  private build() {
    const s = this.scene;
    const W = s.scale.width;
    const H = s.scale.height;

    // Objects created below are HUD chrome and must not scroll with the world camera.
    // Record the current display list length so we can retroactively fix scroll factors.
    const hudStart = s.children.list.length;

    // ---------- HEALTH & SHIELD (segments) ----------
    const hpX = 26;
    const hpY = 34;
    const segW = 16;
    const segH = 12;
    const segGap = 2;

    s.add.graphics().setDepth(100).fillStyle(0x000000, 0.35).fillRoundedRect(hpX - 8, hpY - 8, 10 * (segW + segGap) + 16, 66, 10);

    // shield segs stacked above health
    for (let i = 0; i < 10; i++) {
      const r = s.add.rectangle(hpX + i * (segW + segGap), hpY - 16, segW, segH, 0x4d9ff5).setOrigin(0, 0.5).setDepth(101);
      this.shieldSegs.push(r);
    }
    // health segs
    for (let i = 0; i < 10; i++) {
      const r = s.add.rectangle(hpX + i * (segW + segGap), hpY - 2 + segH, segW, segH, 0xffffff).setOrigin(0, 0.5).setDepth(101);
      this.hpSegs.push(r);
    }
    this.hpLabel = s.add
      .text(hpX + 10 * (segW + segGap) + 14, hpY + segH, '100', {
        fontFamily: FONT_SANS,
        fontSize: '22px',
        color: '#ffffff',
      })
      .setDepth(102);
    this.shieldLabel = s.add
      .text(hpX + 10 * (segW + segGap) + 14, hpY - 16, '0', {
        fontFamily: FONT_SANS,
        fontSize: '16px',
        color: '#4d9ff5',
      })
      .setDepth(102);

    // ---------- STORM / PHASE ----------
    this.phaseText = s.add
      .text(W / 2, 20, '', { fontFamily: FONT_SANS, fontSize: '15px', color: '#cfe8ff' })
      .setOrigin(0.5, 0)
      .setDepth(102);
    this.aliveText = s.add
      .text(W / 2, 40, '', { fontFamily: FONT_SANS, fontSize: '13px', color: '#7ea8d8' })
      .setOrigin(0.5, 0)
      .setDepth(102);

    // ---------- HOTBAR ----------
    const slotSize = 58;
    const totalW = 5 * slotSize + 4 * 4;
    const startX = W / 2 - totalW / 2;
    const barY = H - slotSize - 18;
    this.hotbarBg = s.add.rectangle(W / 2, barY + slotSize / 2, totalW + 14, slotSize + 14, 0x0a121e).setDepth(100).setStrokeStyle(2, 0x3a5a8a, 0.6);
    this.hotbarBg.setFillStyle(0x0a121e, 0.75);

    for (let i = 0; i < 5; i++) {
      const bx = startX + i * (slotSize + 4);
      const box = s.add.rectangle(bx + slotSize / 2, barY + slotSize / 2, slotSize, slotSize, 0x18263c).setDepth(101);
      box.setStrokeStyle(2, 0x4a6a9a, 0.8);
      this.slotBoxes.push(box);
      const icon = s.add.image(bx + slotSize / 2, barY + slotSize / 2 - 4, 'glow_dot').setDepth(102).setVisible(false);
      this.slotIcons.push(icon);
      const count = s.add
        .text(bx + slotSize - 6, barY + slotSize - 6, '', {
          fontFamily: FONT_SANS,
          fontSize: '13px',
          color: '#fff',
        })
        .setOrigin(1, 1)
        .setDepth(102)
        .setVisible(false);
      this.slotCounts.push(count);
      const key = s.add
        .text(bx + 6, barY + 6, `${i + 1}`, {
          fontFamily: FONT_SANS,
          fontSize: '13px',
          color: '#8aa4cc',
        })
        .setOrigin(0, 0)
        .setDepth(102);
      this.slotKeys.push(key);
    }

    // ---------- AMMO ----------
    this.ammoBig = s.add
      .text(W - 26, H - 26, '30', {
        fontFamily: FONT_CONDENSED,
        fontSize: '48px',
        color: '#fff',
      })
      .setOrigin(1, 1)
      .setDepth(102);
    this.ammoReserve = s.add
      .text(W - 34, H - 58, '90', {
        fontFamily: FONT_SANS,
        fontSize: '22px',
        color: '#9abaf0',
      })
      .setOrigin(1, 0.5)
      .setDepth(102);
    const ammoLabelBg = s.add.rectangle(W - 30, H - 84, 120, 22, 0x0a121e).setOrigin(1, 0.5).setDepth(100).setFillStyle(0x0a121e, 0.6);
    void ammoLabelBg;
    // weapon name
    const weaponName = s.add
      .text(W - 120, H - 94, '', {
        fontFamily: FONT_SANS,
        fontSize: '14px',
        color: '#cfd8e8',
      })
      .setOrigin(1, 0.5)
      .setDepth(102);
    this.weaponName = weaponName;

    // ---------- MATERIALS ----------
    const mats: Array<['wood' | 'stone' | 'metal', string]> = [
      ['wood', '#c89a5c'],
      ['stone', '#c8c7cf'],
      ['metal', '#b9c6d0'],
    ];
    const matStartY = H - 330;
    mats.forEach(([k, col], i) => {
      const c = s.add.container(W - 130, matStartY + i * 34);
      const bg = s.add.rectangle(0, 0, 118, 30, 0x0a121e).setStrokeStyle(1, 0x3a5a8a, 0.6).setFillStyle(0x0a121e, 0.65);
      const icon = s.add.image(-42, 0, `m_${k}`);
      const txt = s.add
        .text(36, 0, '999', { fontFamily: FONT_SANS, fontSize: '18px', color: col })
        .setOrigin(0, 0.5);
      c.add([bg, icon, txt]);
      c.setDepth(101);
      this.matBoxes.push(c);
      this.matTexts.push(txt);
    });

    // ---------- BUILD MODE selector (replaces some halo) ----------
    const bStartX = W / 2 - 200;
    const bY = H - 90 - slotSize - 40;
    for (let i = 0; i < 3; i++) {
      const c = s.add.container(bStartX + i * 130, bY);
      const bg = s.add.rectangle(0, 0, 116, 44, 0x18263c).setStrokeStyle(2, 0x4a6a9a, 0.8);
      const icon = s.add.image(-28, 0, ['ico_wall', 'ico_floor', 'ico_ramp'][i]);
      const label = s.add
        .text(30, 0, ['WALL', 'FLOOR', 'RAMP'][i], {
          fontFamily: FONT_SANS,
          fontSize: '13px',
          color: '#cfd8e8',
        })
        .setOrigin(0, 0.5);
      c.add([bg, icon, label]);
      c.setDepth(101);
      this.buildBoxes.push(c);
    }

    // ---------- CROSSHAIR ----------
    this.crosshair = s.add.image(W / 2, H / 2, 'xhair').setDepth(200);
    this.crosshairL = s.add.rectangle(-20, 0, 10, 4, 0xffffff).setDepth(200);
    this.crosshairR = s.add.rectangle(20, 0, 10, 4, 0xffffff).setDepth(200);
    this.crosshairU = s.add.rectangle(0, -20, 4, 10, 0xffffff).setDepth(200);
    this.crosshairD = s.add.rectangle(0, 20, 4, 10, 0xffffff).setDepth(200);
    const group = s.add.container(s.scale.width / 2, s.scale.height / 2, [
      this.crosshair,
      this.crosshairL,
      this.crosshairR,
      this.crosshairU,
      this.crosshairD,
    ]);
    group.setDepth(200);
    this.crosshairGroup = group;

    // ---------- PROMPT ----------
    this.prompt = s.add
      .text(W / 2, H / 2 + 70, '', {
        fontFamily: FONT_SANS,
        fontSize: '18px',
        color: '#fff',
        stroke: '#0a121e',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(150)
      .setVisible(false);

    // storm warning
    this.stormWarning = s.add
      .text(W / 2, H * 0.3, '⚠ STORM INCOMING ⚠', {
        fontFamily: FONT_CONDENSED,
        fontSize: '30px',
        color: '#ff6a5a',
        stroke: '#3a0c0c',
        strokeThickness: 8,
      })
      .setOrigin(0.5, 0)
      .setDepth(150)
      .setVisible(false);

    // spawn protection badge
    this.spawnShieldText = s.add
      .text(hpX, hpY + 66, '', {
        fontFamily: FONT_CONDENSED,
        fontSize: '13px',
        color: '#9fe8ff',
        stroke: '#0a3a5a',
        strokeThickness: 4,
      })
      .setOrigin(0, 0)
      .setDepth(102)
      .setVisible(false);
    this.spawnShieldText.setText('SPAWN SHIELD');

    // ---------- KILL FEED ----------
    // placeholder container position
    this.killFeedY = 90;
    this.killFeedT = s.add.text(0, 0, '', { fontFamily: FONT_SANS, fontSize: '12px', color: '#fff' }).setDepth(150);

    // ---------- MINIMAP ----------
    this.minimap = s.add.graphics().setDepth(150);
    this.minimap.setPosition(W - 170, 16);

    // Fix scroll factors for every object created since the camera started following.
    // Containers propagate to children; per-object also covers graphics/text/images.
    for (let i = hudStart; i < s.children.list.length; i++) {
      const go = s.children.list[i] as Phaser.GameObjects.GameObject & { setScrollFactor?: (f: number) => void };
      if (go && typeof go.setScrollFactor === 'function') {
        go.setScrollFactor(0);
      }
    }
  }

  weaponName!: Phaser.GameObjects.Text;
  crosshairGroup!: Phaser.GameObjects.Container;
  private killFeedY = 0;
  private killFeedT!: Phaser.GameObjects.Text;

  updateHUD() {
    const p: Player = this.scene.player;
    if (!p) return;
    const s = this.scene;

    // health segments
    for (let i = 0; i < 10; i++) {
      const filled = p.health >= (i + 1) * 10;
      const half = p.health >= i * 10 + 5;
      this.hpSegs[i].setFillStyle(0xffffff, filled ? 1 : half ? 0.6 : 0.12);
    }
    for (let i = 0; i < 10; i++) {
      const filled = p.shield >= (i + 1) * 10;
      const half = p.shield >= i * 10 + 5;
      this.shieldSegs[i].setFillStyle(0x4d9ff5, filled ? 1 : half ? 0.6 : 0.12);
    }
    this.hpLabel.setText(`${Math.ceil(p.health)}`);
    this.shieldLabel.setText(`${Math.ceil(p.shield)}`);
    // spawn protection badge + pulsing
    const sp = p.spawnProtect > 0;
    this.spawnShieldText.setVisible(sp);
    if (sp) this.spawnShieldText.setAlpha(0.55 + Math.sin(this.scene.time.now / 160) * 0.35);

    // hotbar
    for (let i = 0; i < 5; i++) {
      const it = p.items[i];
      const box = this.slotBoxes[i];
      if (i === p.currentSlot) {
        box.setStrokeStyle(3, 0xffd23f, 1);
        box.setFillStyle(0x24364f, 0.95);
      } else {
        box.setStrokeStyle(2, 0x4a6a9a, 0.8);
        box.setFillStyle(0x18263c, 1);
      }
      const icon = this.slotIcons[i];
      const cnt = this.slotCounts[i];
      if (it && it.weaponId) {
        icon.setTexture(`w_${it.weaponId}_${it.rarity}`);
        icon.setVisible(true);
        icon.setDepth(102);
        // scale icon to fit slot
        icon.setScale(Math.min(1, 46 / icon.width));
        cnt.setVisible(it.count > 1);
        cnt.setText(`${it.count}`);
        // tint rim with rarity
        this.rarityRim(i, RARITY_CSS[it.rarity as RarityKey] || '#fff');
      } else if (it && it.consumableId) {
        const cd = CONSUMABLES[it.consumableId];
        icon.setTexture(cd.icon.includes('bandage') ? 'i_bandage' : cd.icon.includes('medkit') ? 'i_medkit' : cd.icon.includes('small') ? 'i_smallshield' : cd.icon.includes('shieldpot') ? 'i_shieldpot' : 'i_slurp');
        icon.setVisible(true);
        icon.setScale(1);
        cnt.setVisible(true);
        cnt.setText(`${it.count}`);
        this.rarityRim(i, '#bfe6ff');
      } else {
        icon.setVisible(false);
        cnt.setVisible(false);
        this.rarityRim(i, '#4a6a9a');
      }
    }

    // ammo
    if (p.weapon && !p.buildMode && p.equipped === 'weapon') {
      const w = p.weapon;
      const stats = w.def;
      this.ammoBig.setText(`${w.mag}`);
      this.ammoBig.setColor(w.mag === 0 ? '#ff6a5a' : '#fff');
      const reserve = p.ammo[ammoCat(w.def.category)] || 0;
      this.ammoReserve.setText(`${reserve}`);
      this.weaponName.setText(`${stats.name}`).setColor(RARITY_CSS[w.rarity]);
      this.weaponName.setVisible(true);
    } else {
      this.ammoBig.setText('');
      this.ammoReserve.setText('');
      this.weaponName.setVisible(false);
    }

    // materials
    const mats: Array<'wood' | 'stone' | 'metal'> = ['wood', 'stone', 'metal'];
    mats.forEach((m, i) => {
      this.matTexts[i].setText(`${p.resources[m]}`);
    });

    // build selector visibility
    const bv = p.buildMode;
    this.buildBoxes.forEach((b, i) => {
      b.setVisible(bv);
      const bg = b.list[0] as Phaser.GameObjects.Rectangle;
      if (i === p.buildingPiece && bv) {
        bg.setStrokeStyle(3, 0xffd23f, 1);
      } else {
        bg.setStrokeStyle(2, 0x4a6a9a, 0.8);
      }
    });
    void bv;

    // crosshair positioning from aim
    if (this.crosshairGroup) {
      const cam = s.cameras.main;
      const cx = cam.midPoint.x;
      const cy = cam.midPoint.y;
      this.crosshairGroup.setPosition(cx, cy);
      const spread = 6 + p.bloom * 160;
      this.crosshairL.setPosition(-spread, 0);
      this.crosshairR.setPosition(spread, 0);
      this.crosshairU.setPosition(0, -spread);
      this.crosshairD.setPosition(0, spread);
      // hide on consumable / build
      const show = p.equipped === 'weapon' && !p.buildMode && !p.dead;
      this.crosshairGroup.setVisible(show);
    }

    // alive count
    this.aliveText.setText(`${this.scene.aliveCount} remaining`);
    this.phaseText.setText(this.scene.stormLabel);
  }

  rarityRim(i: number, col: string) {
    const box = this.slotBoxes[i];
    if (col === '#4a6a9a') {
      box.setStrokeStyle(2, 0x4a6a9a, 0.8);
    } else {
      const colNum = parseInt(col.replace('#', ''), 16);
      box.setStrokeStyle(2, colNum, 0.9);
    }
  }

  showPrompt(text: string) {
    this.prompt.setText(text).setVisible(true);
    this.prompt.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2 + 70);
  }

  hidePrompt() {
    this.prompt.setVisible(false);
  }

  notify(text: string, color = '#fff', time = 1600) {
    const s = this.scene;
    const y = 200 + this.notifTimers.length * 34;
    const t = s.add
      .text(s.scale.width / 2, y, text, {
        fontFamily: FONT_SANS,
        fontSize: '17px',
        color,
        stroke: '#0a121e',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(160);
    this.notifTimers.push(t);
    s.time.delayedCall(time, () => {
      t.destroy();
      this.notifTimers.shift();
    });
  }

  addKill(winner: string, loser: string, weaponName: string) {
    const s = this.scene;
    const t = s.add
      .text(s.scale.width - 24, this.killFeedY, '', {
        fontFamily: FONT_SANS,
        fontSize: '13px',
        color: '#fff',
        stroke: '#0a121e',
        strokeThickness: 3,
        align: 'right',
      })
      .setOrigin(1, 0)
      .setDepth(160);
    t.setText(`${winner} » ${loser} [${weaponName}]`);
    this.killFeed.push(t);
    this.killFeedTimers.push(4);
    // fade oldest
    while (this.killFeed.length > 4) {
      const old = this.killFeed.shift()!;
      old.destroy();
      this.killFeedTimers.shift();
    }
    // reposition
    this.killFeed.forEach((tf, i) => {
      tf.setY(this.killFeedY + i * 22);
      tf.setAlpha(1);
    });
  }

  updateKillFeed(delta: number) {
    for (let i = this.killFeedTimers.length - 1; i >= 0; i--) {
      this.killFeedTimers[i] -= Math.min(delta / 1000, 0.033);
      if (this.killFeedTimers[i] <= 0) {
        const t = this.killFeed[i];
        if (t) {
          t.alpha = Math.max(0, t.alpha - 0.1);
          if (t.alpha <= 0) {
            t.destroy();
            this.killFeed.splice(i, 1);
            this.killFeedTimers.splice(i, 1);
          }
        }
      }
    }
  }
}

function ammoCat(cat: string): string {
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