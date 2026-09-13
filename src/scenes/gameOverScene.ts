import Phaser from 'phaser';
import { audio } from './bootScene';

export class GameOverScene extends Phaser.Scene {
  private won = false;
  private ui: HTMLDivElement | null = null;

  constructor() {
    super('gameover');
  }

  init(data: { won?: boolean }) {
    this.won = !!data.won;
  }

  create() {
    audio.init();
    this.render();
    this.events.once('shutdown', () => this.ui?.remove());
  }

  render() {
    const gl = window.document;
    const root = gl.createElement('div');
    root.id = 'fn-gameover';
    root.style.cssText = `
      position:absolute;inset:0;z-index:50;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:18px;
      background:radial-gradient(ellipse at center, rgba(12,22,52,0.6) 0%, rgba(6,10,24,0.92) 100%);
      font-family:'Luckiest Guy',sans-serif;
    `;

    // confetti/emote background
    const cv = gl.createElement('canvas');
    cv.width = 800;
    cv.height = 450;
    Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', opacity: '0.35' });
    const ctx = cv.getContext('2d')!;
    if (this.won) {
      const colors = ['#ffd23f', '#ff6aa0', '#4ad8ff', '#59d95c', '#b04cf0'];
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.save();
        ctx.translate(Math.random() * 800, Math.random() * 450);
        ctx.rotate(Math.random() * 3);
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
      }
      void cv;
    }
    root.appendChild(cv);

    const title = gl.createElement('div');
    title.textContent = this.won ? 'VICTORY ROYALE!' : 'ELIMINATED';
    title.style.cssText = `
      font-size:84px;letter-spacing:4px;
      color:${this.won ? '#ffd23f' : '#ff6a5a'};
      text-shadow:${this.won ? '0 0 30px rgba(255,210,63,0.6), 6px 6px 0 #5a3a00, 10px 10px 0 rgba(0,0,0,0.3)' : '0 0 30px rgba(255,106,90,0.5), 6px 6px 0 #3a0c0c'};
      transform:rotate(-2deg);
      text-align:center;
    `;
    const sub = gl.createElement('div');
    sub.textContent = this.won
      ? 'You outlasted every opponent on the island!'
      : 'The storm closed in. Drop in for another round.';
    sub.style.cssText = `
      font-family:'Rajdhani',sans-serif;font-weight:700;font-size:20px;letter-spacing:2px;
      color:#cfd8e8;text-align:center;
    `;
    const btn = gl.createElement('button');
    btn.textContent = this.won ? 'PLAY AGAIN' : 'REBOOT & DROP IN';
    btn.style.cssText = `
      font-family:'Luckiest Guy',sans-serif;font-size:22px;letter-spacing:2px;color:#0b1120;
      background:linear-gradient(180deg,#fff6c0,#ffd23f);
      border:none;padding:16px 56px;border-radius:40px;cursor:pointer;
      box-shadow:0 6px 0 rgba(0,0,0,0.3);margin-top:14px;transition:all .15s;
      border:3px solid #ffe45e;
    `;
    btn.onmouseenter = () => {
      btn.style.transform = 'translateY(-3px)';
      btn.style.filter = 'brightness(1.1)';
      audio.uiHover();
    };
    btn.onmouseleave = () => {
      btn.style.transform = '';
      btn.style.filter = '';
    };
    btn.onclick = () => {
      audio.uiClick();
      this.ui?.remove();
      this.scene.start('game');
    };
    root.appendChild(title);
    root.appendChild(sub);
    root.appendChild(btn);

    const back = gl.createElement('button');
    back.textContent = 'MAIN MENU';
    back.style.cssText = `
      font-family:'Rajdhani';font-weight:700;font-size:15px;letter-spacing:2px;
      background:rgba(40,60,100,0.6);color:#dfe8ff;border:2px solid rgba(255,255,255,0.2);
      padding:10px 30px;border-radius:30px;cursor:pointer;margin-top:8px;
    `;
    back.onclick = () => {
      audio.uiClick();
      this.ui?.remove();
      this.scene.start('menu');
    };
    root.appendChild(back);

    this.ui = root;
    gl.body.appendChild(root);
  }
}