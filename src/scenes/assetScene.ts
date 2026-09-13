import Phaser from 'phaser';
import { buildSkinFrames, CHAR_W, CHAR_H, PLAYER_ANIMS, type AnimName, type Skin } from '../art/characters';
import { Pixmap } from '../utils/pixmap';
import { buildTileset, buildTreeSprite, buildRockSprite, buildBushSprite, buildFlowerSprites, buildChestSprite, buildChestOpenSprite, buildAmmoCrate, buildVehicles, buildCrateSprite } from '../art/environment';
import { buildWeaponSprites, buildPickaxeSprite, buildHealSprites, buildMaterialIcons, buildAmmoIcons } from '../art/weapons';
import { buildWallTexture, buildFloorTexture, buildRampTexture, buildPieceIcons, buildGlowDot, buildMuzzle, buildCrosshairShapes } from '../art/builds';
import { MATERIALS } from '../data/materials';

export const SKIN_KEYS: Skin[] = ['jonesy', 'bandit', 'reaper', 'royale'];

export class AssetScene extends Phaser.Scene {
  constructor() {
    super('assets');
  }

  create() {
    this.generate();
    this.scene.start('boot');
  }

  generate() {
    const sa = (k: string, w: number, h: number, draw: (p: Pixmap) => void, scale = 1) => {
      const p = new Pixmap(w, h);
      draw(p);
      this.textures.addCanvas(k, p.toCanvas(scale));
    };

    // characters: sprite sheets
    for (const skin of SKIN_KEYS) {
      const frames = buildSkinFrames(skin);
      const cols = 8;
      const rows = Math.ceil(frames.length / cols);
      const sheet = new Pixmap(cols * CHAR_W, rows * CHAR_H);
      frames.forEach((f, i) => sheet.blit(f, (i % cols) * CHAR_W, Math.floor(i / cols) * CHAR_H));
      this.textures.addSpriteSheet(`charsheet_${skin}`, sheet.toCanvas(2) as unknown as HTMLImageElement, {
        frameWidth: CHAR_W * 2,
        frameHeight: CHAR_H * 2,
      });
      if (!this.anims.exists(`char_${skin}_idle`)) {
        for (const anim of PLAYER_ANIMS) {
          this.anims.create({
            key: `char_${skin}_${anim.name}`,
            frames: this.anims.generateFrameNumbers(`charsheet_${skin}`, {
              start: anim.start,
              end: anim.start + anim.count - 1,
            }),
            frameRate: anim.frameRate,
            repeat: anim.repeat,
          });
        }
      }
    }

    // dead sprite is separate (only frame 24) - build standalone texture
    for (const skin of SKIN_KEYS) {
      const fr = buildSkinFrames(skin);
      const dead = new Pixmap(CHAR_W, CHAR_H);
      dead.blit(fr[24], 0, 0);
      this.textures.addCanvas(`dead_${skin}`, dead.toCanvas(2));
    }

    buildTileset(this);
    buildTreeSprite(this, 'tree_oak', 'oak');
    buildTreeSprite(this, 'tree_pine', 'pine');
    buildTreeSprite(this, 'tree_palm', 'palm');
    buildRockSprite(this);
    buildBushSprite(this);
    buildFlowerSprites(this);
    buildChestSprite(this);
    buildChestOpenSprite(this);
    buildAmmoCrate(this);
    buildVehicles(this);
    buildCrateSprite(this);

    buildWeaponSprites(this);
    buildPickaxeSprite(this);
    buildHealSprites(this);
    buildMaterialIcons(this);
    buildAmmoIcons(this);

    for (const m of Object.values(MATERIALS)) {
      buildWallTexture(this, m);
      buildFloorTexture(this, m);
      buildRampTexture(this, m);
    }
    buildPieceIcons(this);
    buildGlowDot(this);
    buildMuzzle(this);
    buildCrosshairShapes(this);
  }
}