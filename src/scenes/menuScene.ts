import Phaser from 'phaser';
import { audio } from './bootScene';

export class MenuScene extends Phaser.Scene {
  private ui: HTMLDivElement | null = null;

  constructor() {
    super('menu');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1120');
    this.renderLobby();

    // clean input on unmount
    this.events.once('shutdown', () => this.ui?.remove());
  }

  private renderLobby() {
    if (window.document.getElementById('fn-menu')) return;
    const gl = window.document;
    const root = gl.createElement('div');
    root.id = 'fn-menu';
    root.style.cssText = `position:absolute;inset:0;overflow:hidden;font-family:'Luckiest Guy',sans-serif;color:#fff;display:flex;flex-direction:column;`;

    // ---------- animated sky bg ----------
    const sky = gl.createElement('div');
    sky.style.cssText = `
      position:absolute;inset:0;
      background:linear-gradient(180deg,#1a3a8f 0%,#2f6fd0 35%,#7ab8f0 62%,#cfe8ff 78%,#8fd0ff 100%);
      overflow:hidden;
    `;
    root.appendChild(sky);

    // stars cloud layer (canvas)
    const starCv = gl.createElement('canvas');
    starCv.width = 1600;
    starCv.height = 900;
    Object.assign(starCv.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      opacity: '0.5',
    });
    const sctx = starCv.getContext('2d')!;
    sctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 120; i++) {
      sctx.fillRect(Math.random() * 1600, Math.random() * 400, 2, 2);
    }
    for (let i = 0; i < 40; i++) {
      sctx.fillRect(Math.random() * 1600, Math.random() * 900, 3, 3);
    }
    sky.appendChild(starCv);

    // drifting islands (canvas)
    const cv = gl.createElement('canvas');
    cv.width = 1800;
    cv.height = 1000;
    Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    const ctx = cv.getContext('2d')!;
    sky.appendChild(cv);

    const islands: Array<{ x: number; y: number; s: number; r: number; tree: number[]; color: string }> = [];
    const mkIsland = (x: number, y: number, s: number) => {
      const trees: number[] = [];
      if (s > 1) {
        for (let i = 0; i < Math.random() * 3 + 1; i++) trees.push(Math.random());
      }
      islands.push({ x, y, s, r: 90 * s + Math.random() * 30, tree: trees, color: '#4ea24a' });
    };
    mkIsland(-200, 100, 1.5);
    mkIsland(250, 250, 0.8);
    mkIsland(950, -80, 1.9);
    mkIsland(1350, 380, 1.0);
    mkIsland(650, 700, 0.9);
    mkIsland(1500, 780, 1.4);
    mkIsland(0, 900, 1.2);

    const drawFloat = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      const t = performance.now() / 1000;
      for (const isl of islands) {
        const x = isl.x + Math.sin(t * 0.3 + isl.y) * 12;
        const y = isl.y + Math.cos(t * 0.24 + isl.x) * 10;
        // shadow below
        ctx.fillStyle = 'rgba(20,40,90,0.25)';
        ctx.beginPath();
        ctx.ellipse(x + 12, y + isl.s * 78 + 26, isl.r + 14, isl.s * 24, 0, 0, Math.PI * 2);
        ctx.fill();
        // chunk body
        for (const [ox, oy, r2, col] of [
          [-0.6, -0.5, 0.55, '#3f8a3c'],
          [0.6, -0.5, 0.55, '#3f8a3c'],
          [0, -0.55, 0.65, '#57b04e'],
          [-0.4, 0.3, 0.5, '#36752f'],
          [0.4, 0.3, 0.5, '#38903a'],
          [0, 0.15, 0.75, '#4a9a46'],
        ] as Array<[number, number, number, string]>) {
          ctx.beginPath();
          ctx.ellipse(x + ox * isl.r, y + oy * isl.r, isl.r * r2, isl.s * 40 * r2, 0, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
        }
        // dirt bottom
        ctx.fillStyle = '#8a6a3c';
        ctx.beginPath();
        ctx.ellipse(x, y + isl.s * 62, isl.r, isl.s * 14, 0, 0, Math.PI * 2);
        ctx.fill();
        // trees
        isl.tree.forEach((tt, i) => {
          const tx = x - isl.r * 0.3 + tt * isl.r;
          const ty = y - isl.s * 50 - i * 4;
          const s = isl.s * (12 + (i % 3));
          ctx.fillStyle = '#6b4426';
          ctx.fillRect(tx - 1.5 * s * 0.12, ty, s * 0.24, s);
          ctx.fillStyle = i % 2 ? '#2e6a1c' : '#3a8c28';
          for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.moveTo(tx - s * 0.5 * 1.1, ty + s * 0.1 + k * s * 0.28);
            ctx.lineTo(tx + s * 0.5 * 1.1, ty + s * 0.1 + k * s * 0.28);
            ctx.lineTo(tx, ty - s * 0.35 + k * s * 0.23);
            ctx.closePath();
            ctx.fill();
          }
        });
      }
      requestAnimationFrame(drawFloat);
    };
    requestAnimationFrame(drawFloat);

    // ---------- center headline ----------
    const head = gl.createElement('div');
    head.textContent = 'FORTNITE 2D';
    head.style.cssText = `
      position:absolute;top:6%;width:100%;text-align:center;
      font-size:64px;letter-spacing:4px;font-weight:400;
      color:#fff;text-shadow:4px 4px 0 #1a2a4a, 8px 8px 0 rgba(0,0,0,0.25);
      transform:rotate(-2deg);z-index:4;
    `;
    root.appendChild(head);

    const sub = gl.createElement('div');
    sub.textContent = 'PIXEL BATTLE ROYALE';
    sub.style.cssText = `
      position:absolute;top:6%;margin-top:72px;width:100%;text-align:center;
      font-family:'Rajdhani',sans-serif;font-weight:700;font-size:18px;letter-spacing:8px;
      color:#ffd23f;text-shadow:2px 2px 0 #7a5400;z-index:4;
    `;
    root.appendChild(sub);

    // ---------- character on stage ----------
    const charBox = gl.createElement('div');
    charBox.style.cssText = `
      position:absolute;right:14%;bottom:6%;width:280px;height:420px;z-index:3;
      display:flex;align-items:flex-end;justify-content:center;
    `;
    // CSS-drawn chunky character (pixel directory of the default skin)
    const skin = gl.createElement('div');
    skin.innerHTML = `
      <div style="position:relative;width:120px;height:220px;transform-origin:bottom center;animation:bob 3s ease-in-out infinite;">
        <style>
          @keyframes bob { 0%,100%{transform:rotate(0)} 50%{transform:rotate(2deg)} }
        </style>
        <!-- boots -->
        <div style="position:absolute;bottom:0;left:18px;width:34px;height:14px;background:#33302b;border-radius:6px"></div>
        <div style="position:absolute;bottom:0;left:62px;width:34px;height:14px;background:#33302b;border-radius:6px"></div>
        <!-- legs -->
        <div style="position:absolute;bottom:12px;left:24px;width:24px;height:60px;background:#bc9268"></div>
        <div style="position:absolute;bottom:12px;left:70px;width:24px;height:60px;background:#a07e58"></div>
        <!-- torso -->
        <div style="position:absolute;bottom:70px;left:14px;width:92px;height:74px;background:linear-gradient(90deg,#1c4f8f,#2f76c4);border-radius:14px 14px 6px 6px"></div>
        <div style="position:absolute;bottom:128px;left:36px;width:48px;height:16px;background:#16406f"></div>
        <!-- backpack -->
        <div style="position:absolute;bottom:86px;left:0px;width:16px;height:52px;background:#7a6a54;border-radius:8px"></div>
        <!-- arms -->
        <div style="position:absolute;bottom:74px;left:0px;width:20px;height:62px;background:#f2c99a;border-radius:10px"></div>
        <div style="position:absolute;bottom:74px;left:100px;width:20px;height:62px;background:#f2c99a;border-radius:10px"></div>
        <div style="position:absolute;bottom:118px;left:0px;width:20px;height:18px;background:#2f76c4"></div>
        <div style="position:absolute;bottom:118px;left:100px;width:20px;height:18px;background:#2f76c4"></div>
        <!-- head -->
        <div style="position:absolute;bottom:138px;left:24px;width:72px;height:64px;background:#f2c99a;border-radius:40% 40% 30% 30%;border-bottom:4px solid #d9a76f"></div>
        <!-- hair -->
        <div style="position:absolute;bottom:196px;left:24px;width:72px;height:12px;background:#6b4a2b;border-radius:40% 40% 0 0"></div>
        <div style="position:absolute;bottom:192px;left:18px;width:24px;height:22px;background:#6b4a2b;border-radius:50%"></div>
        <div style="position:absolute;bottom:190px;left:82px;width:16px;height:20px;background:#4d311a;border-radius:50%"></div>
        <!-- eye -->
        <div style="position:absolute;bottom:168px;left:60px;width:8px;height:10px;background:#1c1c22;border-radius:2px"></div>
      </div>
    `;
    // highlight glow
    skin.style.cssText = `transform:translateY(0);filter:drop-shadow(0 0 30px rgba(120,200,255,0.35));`;
    charBox.appendChild(skin);
    root.appendChild(charBox);

    // ---------- bottom nav bar (Fortnite lobby) ----------
    const nav = gl.createElement('div');
    nav.style.cssText = `
      position:absolute;bottom:0;left:0;right:0;height:86px;z-index:10;
      background:linear-gradient(180deg, rgba(12,18,32,0) 0%, rgba(9,14,26,0.92) 30%);
      display:flex;align-items:flex-end;justify-content:center;gap:8px;padding-bottom:10px;
    `;
    const tabs = ['HOME', 'LOOT', 'BUILD', 'COMPETE'];
    tabs.forEach((tb, idx) => {
      const b = gl.createElement('button');
      b.textContent = tb;
      b.style.cssText = `
        min-width:170px;height:46px;border:none;cursor:pointer;outline:none;
        font-family:'Luckiest Guy',sans-serif;font-size:20px;letter-spacing:2px;
        color:${idx === 0 ? '#0b1120' : '#cfd8e8'};
        background:${idx === 0 ? 'linear-gradient(180deg,#ffe45e,#e3b505)' : 'rgba(20,32,54,0.75)'};
        border-radius:12px 12px 0 0;
        transform:${idx === 0 ? 'translateY(-6px)' : 'translateY(2px)'};
        border:${idx === 0 ? '3px solid #fff3b0' : '2px solid rgba(255,255,255,0.12)'};
        box-shadow:0 -4px 14px rgba(255,210,63,0.25);
        transition:all .15s;
      `;
      b.onmouseenter = () => {
        audio.uiHover();
        b.style.transform = 'translateY(-4px)';
        b.style.filter = 'brightness(1.15)';
      };
      b.onmouseleave = () => {
        b.style.transform = idx === 0 ? 'translateY(-6px)' : 'translateY(2px)';
        b.style.filter = '';
      };
      b.onclick = () => audio.uiClick();
      nav.appendChild(b);
    });
    root.appendChild(nav);

    this.ui = root;
    gl.body.appendChild(root);

    // ---------- center mode cards ----------
    const cards = gl.createElement('div');
    cards.style.cssText = `
      position:absolute;top:24%;left:10%;width:560px;z-index:5;
      display:flex;flex-direction:column;gap:16px;
    `;
    const modes: Array<[string, string]> = [
      ['BATTLE ROYALE', 'Solo island survival. 12 players. Last one wins.'],
      ['ZERO BUILD', 'No building - fight with weapons only.'],
      ['CREATIVE', 'Practice lanes, warm-up arenas and puzzles.'],
    ];
    modes.forEach(([name, desc], i) => {
      const card = gl.createElement('div');
      card.style.cssText = `
        background:${i === 0 ? 'linear-gradient(135deg, #1f3d7a 0%, #29428f 100%)' : 'rgba(15,24,44,0.72)'};
        border-radius:16px;padding:20px 26px;cursor:pointer;
        border:${i === 0 ? '3px solid #ffe45e' : '2px solid rgba(255,255,255,0.12)'};
        box-shadow:${i === 0 ? '0 10px 40px rgba(255,228,94,0.16)' : '0 8px 30px rgba(0,0,0,0.3)'};
        position:relative;overflow:hidden;transition:all .15s;
        width:420px;
      `;
      if (i === 0) {
        const tag = gl.createElement('div');
        tag.textContent = 'ONLY ON FORTNITE';
        tag.style.cssText = `
          position:absolute;top:0;right:0;background:linear-gradient(90deg,#ffe45e,#e3b505);
          color:#0b1120;font-family:'Rajdhani';font-weight:700;font-size:12px;letter-spacing:2px;
          padding:6px 14px 10px 14px;border-radius:0 10px 0 16px;clip-path:polygon(0 0,100% 0,100% 100%,15% 100%);
        `;
        card.appendChild(tag);
      }
      const title = gl.createElement('div');
      title.textContent = name;
      title.style.cssText = `
        font-size:28px;letter-spacing:2px;color:${i === 0 ? '#ffe45e' : '#e8eeff'};
        text-shadow:2px 2px 0 rgba(0,0,0,0.35);
      `;
      const sub2 = gl.createElement('div');
      sub2.textContent = desc;
      sub2.style.cssText = `font-family:'Rajdhani';font-weight:600;font-size:14px;color:#a8b8d8;margin-top:6px;letter-spacing:0.4px;`;
      const go = gl.createElement('div');
      go.textContent = i === 0 ? '►  MATCHMAKING ● 12 players' : i === 1 ? '►  MATCHMAKING ● 12 players' : '►  COMING SOON';
      go.style.cssText = `
        font-family:'Rajdhani';font-weight:700;font-size:15px;color:#0b1120;
        display:inline-block;margin-top:12px;padding:10px 26px;
        background:${i === 0 ? 'linear-gradient(180deg,#fff6c0,#ffd23f)' : 'linear-gradient(180deg,#8ab0e8,#5a8ad0)'};
        border-radius:60px;box-shadow:0 4px 0 rgba(0,0,0,0.25);
      `;
      card.appendChild(title);
      card.appendChild(sub2);
      card.appendChild(go);
      card.onmouseenter = () => {
        audio.uiHover();
        card.style.transform = 'translateX(6px)';
        card.style.border = '3px solid #ffe45e';
      };
      card.onmouseleave = () => {
        card.style.transform = 'translateX(0)';
        card.style.border = i === 0 ? '3px solid #ffe45e' : '2px solid rgba(255,255,255,0.12)';
      };
      card.onclick = () => {
        try {
          audio.uiClick();
          if (i === 0 || i === 1) this.startMatch(i === 1);
        } catch (err) {
          if ((window as any).__errors) (window as any).__errors.push('MENU CLICK ERR: ' + String(err));
        }
      };
      cards.appendChild(card);
    });
    root.appendChild(cards);

    // ---------- top bar ----------
    const top = gl.createElement('div');
    top.style.cssText = `
      position:absolute;top:0;left:0;right:0;height:52px;z-index:9;
      display:flex;align-items:center;padding:0 22px;justify-content:space-between;
      background:linear-gradient(180deg, rgba(8,14,28,0.4), transparent);
    `;
    const brand = gl.createElement('div');
    brand.style.cssText = `font-size:26px;color:#ffe45e;letter-spacing:2px;text-shadow:2px 2px 0 #1a2a4a;`;
    brand.textContent = 'FN';
    const level = gl.createElement('div');
    level.style.cssText = `
      font-family:'Rajdhani';font-weight:700;font-size:18px;color:#ffd23f;
      background:rgba(12,20,40,0.7);border:2px solid rgba(255,210,63,0.4);
      padding:6px 20px;border-radius:30px;display:flex;align-items:center;gap:10px;
    `;
    level.innerHTML = `<span style="background:#ffd23f;color:#0b1120;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:15px">99</span> LEVEL`;
    const right = gl.createElement('div');
    right.style.cssText = `display:flex;gap:10px;align-items:center;`;
    const vbucks = gl.createElement('div');
    vbucks.innerHTML = `<span style="display:inline-block;width:16px;height:16px;background:linear-gradient(135deg,#7b3fa0,#b04cf0);clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);margin-right:8px"></span><span style="font-size:16px;font-family:'Rajdhani';font-weight:700">1,250</span>`;
    vbucks.style.cssText = `
      background:rgba(12,20,40,0.7);border:2px solid rgba(176,76,240,0.45);
      padding:6px 16px;border-radius:30px;color:#e8d4ff;
    `;
    const sett = gl.createElement('button');
    sett.textContent = '⚙ SETTINGS';
    sett.style.cssText = `
      font-family:'Rajdhani';font-weight:700;font-size:14px;letter-spacing:1px;
      border:2px solid rgba(255,255,255,0.15);background:rgba(12,20,40,0.7);color:#d8e4f8;
      padding:6px 18px;border-radius:30px;cursor:pointer;
    `;
    sett.onclick = () => audio.uiClick();
    right.appendChild(vbucks);
    right.appendChild(sett);
    top.appendChild(brand);
    top.appendChild(level);
    top.appendChild(right);

    // mid-left small "lobby" label
    root.appendChild(top);

    // version watermark
    const ver = gl.createElement('div');
    ver.textContent = 'v39.00 revisited · Fortnite 2D · built with Phaser';
    ver.style.cssText = `
      position:absolute;bottom:92px;right:16px;font-family:'Rajdhani';font-size:12px;
      color:rgba(255,255,255,0.5);letter-spacing:1px;z-index:9;
    `;
    root.appendChild(ver);
  }

  startMatch(zeroBuild: boolean) {
    this.ui?.remove();
    this.scene.start('game', { mode: zeroBuild ? 'zeroBuild' : 'battle' });
  }
}