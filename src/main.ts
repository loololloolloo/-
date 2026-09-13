import Phaser from 'phaser';
import { AssetScene } from './scenes/assetScene';
import { BootScene } from './scenes/bootScene';
import { MenuScene } from './scenes/menuScene';
import { GameScene } from './scenes/gameScene';
import { GameOverScene } from './scenes/gameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0b1120',
  width: 1280,
  height: 720,
  pixelArt: true,
  roundPixels: true,
  zoom: 1,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 2300 },
      debug: false,
    },
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [AssetScene, BootScene, MenuScene, GameScene, GameOverScene],
};

const game = new Phaser.Game(config);
(window as any).__game = game;

// debug: surface game state + errors into a fixed-position DOM overlay
setInterval(() => {
  const dbg = document.getElementById('dbg');
  if (!dbg) return;
  const w = window as any;
  let txt = '';
  if (w.__errors && w.__errors.length) {
    txt += 'ERRORS:\n' + w.__errors.slice(-3).join('\n') + '\n';
  }
  txt += 'scene=' + (w.__activeScene || '?') + '\n';
  txt += 'phase=' + (w.__phase || '-') + '\n';
  if (w.__gameState) {
    const s = w.__gameState;
    txt += 'player=' + Math.round(s.px) + ',' + Math.round(s.py) + ' hp=' + s.hp +
      ' sh=' + s.sh + ' w=' + (s.w || 'none') + ' bt=' + s.buildMode + ' slot=' + s.slot +
      (s.sp ? ' sp=' + s.sp : '') + '\n';
    if (s.screen) txt += 'screen=' + Math.round(s.screen.x) + ',' + Math.round(s.screen.y) + ' cam=' + s.cam + '\n';
    if (s.spriteInfo) txt += 'spr=' + s.spriteInfo + '\n';
    if (s.nearEnemy) txt += 'enemy=' + s.nearEnemy;
    if (s.phy) txt += ' | ' + s.phy;
  }
  dbg.textContent = txt;
}, 500);

setInterval(() => {
  const cv = document.querySelector('#app canvas');
  const r = cv?.getBoundingClientRect();
  const el = document.getElementById('dbg2');
  if (el && r) el.textContent = 'canvas=' + Math.round(r.x) + ',' + Math.round(r.y) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' cssW=' + (cv as HTMLCanvasElement).width + ' cssH=' + (cv as HTMLCanvasElement).height;
}, 1000);

setInterval(() => {
  const el = document.getElementById('dbg3');
  if (!el) return;
  const w = window as any;
  const g = w.__game;
  if (!g) return;
  const sc = g.scene.getScene('game') as any;
  if (!sc || !sc.player) return;
  const s = sc.player.sprite as any;
  const tex: any = s?.texture;
  const fr: any = s?.frame;
  const gl = g.renderer.gl as WebGLRenderingContext | undefined;
  let txt = 'texSrc=' + (tex?.source?.[0]?.width ?? '-') + 'x' + (tex?.source?.[0]?.height ?? '-');
  txt += ' texFrame=' + (tex?.frame?.width ?? '-') + 'x' + (tex?.frame?.height ?? '-');
  txt += ' frCfg=' + (fr?.sourceSize ? fr.sourceSize.width + 'x' + fr.sourceSize.height : '-');
  txt += ' frCut=' + (fr?.cutWidth && fr?.cutHeight ? fr.cutWidth + 'x' + fr.cutHeight : '-');
  txt += ' xy=' + Math.round(s.displayOriginX) + ',' + Math.round(s.displayOriginY);
  txt += ' w=' + s.displayWidth.toFixed(0) + ' h=' + s.displayHeight.toFixed(0);
  txt += ' vPym=' + g.renderer?.width + 'x' + g.renderer?.height;
  txt += ' renderType=' + (gl ? 'WebGL' : 'Canvas2D');
  el.textContent = txt;
}, 1000);