// ============================================================
// LUMEN — Audio System (Web Audio API, procedural, no files)
// ============================================================
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
    this.musicGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.3;
      this.musicGain.connect(this.masterGain);
      this.initialized = true;
    } catch (e) {
      this.enabled = false;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.masterGain) this.masterGain.gain.value = this.enabled ? 0.7 : 0;
  }

  // Play a tone
  playTone(freq, duration, type = 'sine', volume = 0.3, attack = 0.01, decay = 0.1) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  // Sound effects
  jump() { this.playTone(400, 0.15, 'sine', 0.25); this.playTone(600, 0.1, 'sine', 0.15); }
  dash() { this.playTone(200, 0.2, 'sawtooth', 0.2); this.playTone(800, 0.15, 'square', 0.1); }
  collect() { this.playTone(880, 0.12, 'sine', 0.3); this.playTone(1320, 0.1, 'sine', 0.2); }
  death() {
    this.playTone(300, 0.3, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(200, 0.4, 'sawtooth', 0.25), 100);
    setTimeout(() => this.playTone(100, 0.5, 'sawtooth', 0.2), 200);
  }
  checkpoint() { this.playTone(660, 0.15, 'sine', 0.25); this.playTone(880, 0.15, 'sine', 0.2); }
  levelComplete() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => this.playTone(n, 0.2, 'sine', 0.3), i * 120));
  }
  enemyAlert() { this.playTone(150, 0.3, 'square', 0.15); }
  menuSelect() { this.playTone(500, 0.08, 'sine', 0.2); }
  bossHit() { this.playTone(200, 0.2, 'square', 0.3); this.playTone(100, 0.3, 'sawtooth', 0.2); }

  // Ambient music (simple loop)
  startMusic() {
    if (!this.enabled || !this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.musicLoop();
  }
  stopMusic() { this.musicPlaying = false; }
  musicLoop() {
    if (!this.musicPlaying || !this.ctx) return;
    const baseFreq = 220;
    const melody = [0, 4, 7, 12, 7, 4, 0, -5];
    let i = 0;
    const playNext = () => {
      if (!this.musicPlaying) return;
      const freq = baseFreq * Math.pow(2, melody[i % melody.length] / 12);
      this.playTone(freq, 0.4, 'sine', 0.08);
      i++;
      setTimeout(playNext, 500);
    };
    playNext();
  }
}