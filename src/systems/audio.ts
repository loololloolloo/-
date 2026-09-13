export class AudioSys {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  constructor() {
    this.enabled = typeof window !== 'undefined' && 'AudioContext' in window;
  }

  init() {
    if (!this.enabled) return;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    this.init();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.5 : 0;
  }

  private now() {
    return this.ctx!.currentTime;
  }

  private env(
    type: OscillatorType | 'noise',
    freq: number,
    freq2: number,
    dur: number,
    vol: number,
    delay = 0
  ) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t0 = this.now() + delay;
    let osc: AudioBufferSourceNode | OscillatorNode;
    if (type === 'noise') {
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      osc = this.ctx.createBufferSource();
      osc.buffer = buf;
    } else {
      osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), t0 + dur);
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFreq: number, delay = 0) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t0 = this.now() + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  shot(cat: string) {
    if (cat === 'shotgun') {
      this.noise(0.18, 0.9, 900);
      this.env('noise', 120, 60, 0.14, 0.4);
    } else if (cat === 'sniper') {
      this.noise(0.32, 1.0, 2600);
      this.env('square', 180, 40, 0.24, 0.4);
    } else if (cat === 'rocket') {
      this.noise(0.4, 0.8, 500);
      this.env('sawtooth', 90, 30, 0.35, 0.35);
    } else if (cat === 'smg') {
      this.noise(0.08, 0.5, 2200);
    } else {
      this.noise(0.12, 0.65, 1600);
      this.env('triangle', 220, 80, 0.08, 0.2);
    }
  }

  reloadStart() {
    this.env('square', 400, 300, 0.06, 0.15);
  }

  reloadTick() {
    this.env('square', 900, 600, 0.04, 0.2);
    this.noise(0.02, 0.1, 4000);
  }

  reloadEnd() {
    this.env('square', 500, 900, 0.08, 0.25);
  }

  dryFire() {
    this.env('square', 200, 120, 0.05, 0.2);
  }

  equip() {
    this.env('triangle', 400, 600, 0.06, 0.2);
    this.noise(0.03, 0.15, 3000);
  }

  pickup() {
    this.env('triangle', 600, 900, 0.1, 0.3);
    this.env('triangle', 900, 1200, 0.08, 0.2, 0.06);
  }

  chestOpen() {
    const notes = [440, 550, 660, 880];
    notes.forEach((fr, i) => this.env('triangle', fr, fr * 1.01, 0.18, 0.3, i * 0.09));
  }

  chestClose() {
    const notes = [880, 660, 550];
    notes.forEach((fr, i) => this.env('triangle', fr, fr * 0.9, 0.15, 0.2, i * 0.07));
  }

  hit() {
    this.env('square', 300, 150, 0.06, 0.25);
    this.noise(0.04, 0.3, 800);
  }

  hurt() {
    this.env('square', 200, 100, 0.2, 0.4);
    this.noise(0.1, 0.3, 500);
  }

  kill() {
    this.env('sawtooth', 700, 200, 0.25, 0.3);
    this.env('triangle', 1000, 300, 0.2, 0.2, 0.05);
  }

  harvest() {
    this.env('square', 700, 350, 0.07, 0.3);
    this.noise(0.05, 0.3, 1800);
  }

  treeBreak() {
    this.noise(0.4, 0.5, 400);
    this.env('triangle', 200, 60, 0.4, 0.2);
  }

  buildPlace() {
    this.noise(0.12, 0.6, 700);
    this.env('square', 150, 80, 0.12, 0.3);
  }

  buildBreak() {
    this.noise(0.25, 0.6, 900);
    this.env('square', 250, 100, 0.18, 0.3);
  }

  buildInvalid() {
    this.env('square', 150, 110, 0.12, 0.2);
  }

  jump() {
    this.env('triangle', 300, 500, 0.08, 0.15);
  }

  land() {
    this.noise(0.08, 0.3, 500);
  }

  step() {
    this.noise(0.04, 0.1, 600);
  }

  shootWhiff() {
    this.noise(0.05, 0.05, 1000);
  }

  explosion() {
    this.noise(0.6, 1.0, 300);
    this.env('sine', 80, 30, 0.5, 0.6);
  }

  drink() {
    this.env('triangle', 500, 300, 0.3, 0.2);
    this.noise(0.2, 0.1, 800);
  }

  healDone() {
    this.env('triangle', 600, 900, 0.15, 0.3);
  }

  uiClick() {
    this.env('square', 800, 700, 0.05, 0.2);
  }

  uiHover() {
    this.env('triangle', 700, 800, 0.04, 0.12);
  }

  menuOpen() {
    this.env('triangle', 500, 700, 0.12, 0.25);
  }

  victory() {
    const nn = [523, 659, 784, 1047];
    nn.forEach((f, i) => {
      this.env('triangle', f, f, 0.3, 0.3, i * 0.15);
      this.env('triangle', f * 1.5, f * 1.5, 0.2, 0.1, i * 0.15 + 0.05);
    });
  }

  defeat() {
    const nn = [400, 350, 300, 220];
    nn.forEach((f, i) => this.env('triangle', f, f * 0.9, 0.35, 0.3, i * 0.2));
  }

  stormTick() {
    this.env('sawtooth', 100, 60, 0.2, 0.15);
  }

  stormWarning() {
    this.env('sawtooth', 500, 300, 0.4, 0.2);
  }

  lootDrop() {
    this.env('triangle', 800, 1200, 0.15, 0.25);
    this.env('triangle', 1200, 1600, 0.12, 0.18, 0.08);
  }

  ammoPickup() {
    this.env('triangle', 1000, 1400, 0.08, 0.2);
  }

  materialTick() {
    this.env('square', 900, 700, 0.05, 0.15);
  }

  gliderOpen() {
    this.noise(0.5, 0.3, 400);
    this.env('triangle', 300, 500, 0.4, 0.1);
  }

  landing() {
    this.noise(0.2, 0.5, 300);
  }

  ambientWind = () => {
    // long-wind loop via noise - keep quiet
    this.noise(2.0, 0.05, 200);
  };

  countdown(n: number) {
    this.env('square', n === 0 ? 1000 : 600, n === 0 ? 1200 : 500, 0.15, 0.25);
  }
}