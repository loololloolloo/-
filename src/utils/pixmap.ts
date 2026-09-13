// Minimal pixel-map canvas for procedural pixel-art generation.
// Colors are 32-bit AARRGGBB. 0 = transparent.

export type Color = number;

export const c = (r: number, g: number, b: number, a = 255): Color =>
  ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;

export class Pixmap {
  w: number;
  h: number;
  data: Uint32Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint32Array(w * h);
  }

  inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x: number, y: number, color: Color) {
    x = Math.round(x);
    y = Math.round(y);
    if (this.inBounds(x, y)) {
      // Sparse raw hex (0xRRGGBB) has alpha byte 0 but is meant to be opaque.
      if (((color >>> 24) & 0xff) === 0 && (color & 0xffffff) !== 0) color |= 0xff000000;
      this.data[y * this.w + x] = color;
    }
  }

  get(x: number, y: number): Color {
    if (!this.inBounds(x, y)) return 0;
    return this.data[y * this.w + x];
  }

  blend(x: number, y: number, color: Color) {
    const dst = this.get(x, y);
    const sa = ((color >>> 24) & 0xff) / 255;
    if (sa >= 1) return this.set(x, y, color);
    if (sa <= 0) return;
    const sr = (color >>> 16) & 0xff;
    const sg = (color >>> 8) & 0xff;
    const sb = color & 0xff;
    const dr = (dst >>> 16) & 0xff;
    const dg = (dst >>> 8) & 0xff;
    const db = dst & 0xff;
    const da = ((dst >>> 24) & 0xff) / 255;
    const oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    this.set(
      x,
      y,
      c(
        Math.round((sr * sa + dr * da * (1 - sa)) / oa),
        Math.round((sg * sa + dg * da * (1 - sa)) / oa),
        Math.round((sb * sa + db * da * (1 - sa)) / oa),
        Math.round(oa * 255)
      )
    );
  }

  rect(x: number, y: number, w: number, h: number, color: Color) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) this.set(x + i, y + j, color);
  }

  fillRect(x: number, y: number, w: number, h: number, color: Color) {
    this.rect(x, y, w, h, color);
  }

  line(x0: number, y0: number, x1: number, y1: number, color: Color) {
    let dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: Color, outline = false) {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        const v = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        if (outline) {
          if (v > 0.55 && v <= 1.15) this.set(cx + x, cy + y, color);
        } else if (v <= 1.0) {
          this.set(cx + x, cy + y, color);
        }
      }
    }
  }

  circle(cx: number, cy: number, r: number, color: Color, outline = false) {
    this.ellipse(cx, cy, r, r, color, outline);
  }

  blit(src: Pixmap, x: number, y: number, flipX = false, flipY = false) {
    for (let j = 0; j < src.h; j++) {
      for (let i = 0; i < src.w; i++) {
        const col = src.data[j * src.w + i];
        if (!col) continue;
        const sx = flipX ? src.w - 1 - i : i;
        const sy = flipY ? src.h - 1 - j : j;
        this.set(x + sx, y + sy, col);
      }
    }
  }

  clone(): Pixmap {
    const p = new Pixmap(this.w, this.h);
    p.data.set(this.data);
    return p;
  }

  toCanvas(scale = 1): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w * scale;
    cv.height = this.h * scale;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    const d = img.data;
    for (let i = 0; i < this.w * this.h; i++) {
      let px = this.data[i];
      d[i * 4] = (px >>> 16) & 0xff;
      d[i * 4 + 1] = (px >>> 8) & 0xff;
      d[i * 4 + 2] = px & 0xff;
      d[i * 4 + 3] = (px >>> 24) & 0xff;
    }
    ctx.putImageData(img, 0, 0);
    if (scale > 1) {
      const scaled = document.createElement('canvas');
      scaled.width = this.w * scale;
      scaled.height = this.h * scale;
      const sctx = scaled.getContext('2d')!;
      sctx.imageSmoothingEnabled = false;
      sctx.drawImage(cv, 0, 0, scaled.width, scaled.height);
      return scaled;
    }
    return cv;
  }

  // Build sprite from an ASCII map: each char maps to a palette entry.
  static fromAscii(rows: string[], palette: Record<string, Color>): Pixmap {
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const p = new Pixmap(w, h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < rows[j].length; i++) {
        const ch = rows[j][i];
        if (ch === ' ' || ch === '.') continue;
        const col = palette[ch];
        if (col !== undefined) p.set(i, j, col);
      }
    }
    return p;
  }
}

export function registerPixmapTexture(
  scene: Phaser.Scene,
  key: string,
  pm: Pixmap,
  scale = 1
): void {
  const cv = pm.toCanvas(scale);
  scene.textures.addCanvas(key, cv);
}