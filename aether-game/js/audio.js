// ============================================================
// AETHER — Audio System (Procedural Web Audio API)
// ============================================================
class AudioSystem {
  constructor() {
    this.ctx = null; this.enabled = true; this.initialized = false;
    this.masterGain = null; this.musicGain = null; this.musicPlaying = false;
    this.musicNodes = [];
  }
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain(); this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.25;
      this.musicGain.connect(this.masterGain);
      this.initialized = true;
    } catch(e) { this.enabled = false; }
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.masterGain) this.masterGain.gain.value = this.enabled ? 0.6 : 0;
  }
  playTone(freq, dur, type='sine', vol=0.3, attack=0.01) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + dur);
  }
  // SFX
  jump() { this.playTone(440,0.12,'sine',0.2); this.playTone(660,0.08,'sine',0.12); }
  doubleJump() { this.playTone(550,0.1,'sine',0.2); this.playTone(880,0.08,'sine',0.15); }
  dash() { this.playTone(300,0.15,'sawtooth',0.15); this.playTone(900,0.1,'square',0.08); }
  collect() { this.playTone(880,0.1,'sine',0.25); this.playTone(1320,0.08,'sine',0.15); this.playTone(1760,0.06,'sine',0.1); }
  crystal() { this.playTone(660,0.12,'sine',0.2); this.playTone(990,0.1,'sine',0.15); }
  death() { this.playTone(300,0.3,'sawtooth',0.3); setTimeout(()=>this.playTone(180,0.4,'sawtooth',0.25),120); setTimeout(()=>this.playTone(90,0.5,'sawtooth',0.2),240); }
  checkpoint() { this.playTone(523,0.1,'sine',0.2); this.playTone(659,0.1,'sine',0.2); this.playTone(784,0.15,'sine',0.25); }
  enemyHit() { this.playTone(200,0.2,'square',0.2); this.playTone(100,0.3,'sawtooth',0.15); }
  bossHit() { this.playTone(150,0.25,'square',0.3); this.playTone(80,0.35,'sawtooth',0.2); }
  levelComplete() { [523,659,784,1047].forEach((n,i)=>setTimeout(()=>this.playTone(n,0.2,'sine',0.3),i*100)); }
  victory() { [523,659,784,1047,1319,1568].forEach((n,i)=>setTimeout(()=>this.playTone(n,0.25,'sine',0.3),i*120)); }
  menuSelect() { this.playTone(600,0.06,'sine',0.15); }
  wallSlide() { this.playTone(120,0.05,'sawtooth',0.05); }
  powerup() { this.playTone(440,0.1,'sine',0.2); this.playTone(660,0.1,'sine',0.2); this.playTone(880,0.15,'sine',0.25); }
  // Ambient music
  startMusic(biome) {
    if (!this.enabled || !this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.currentBiome = biome || 0;
    this.musicTimer = 0;
    this.scheduleMusic();
  }
  stopMusic() { this.musicPlaying = false; clearTimeout(this.musicTimeout); }
  scheduleMusic() {
    if (!this.musicPlaying) return;
    const scales = [[0,2,4,5,7,9,11],[0,3,5,7,10],[0,2,3,5,7,8,10]];
    const scale = scales[this.currentBiome % 3];
    const base = [220, 196, 246][this.currentBiome % 3];
    const melody = [];
    for (let i = 0; i < 8; i++) melody.push(scale[Math.floor(Math.random()*scale.length)]);
    let i = 0;
    const play = () => {
      if (!this.musicPlaying) return;
      const note = base * Math.pow(2, melody[i % melody.length] / 12);
      this.playTone(note, 0.35, 'sine', 0.06);
      if (i % 4 === 0) this.playTone(base/2, 0.5, 'sine', 0.03);
      i++;
      this.musicTimeout = setTimeout(play, 400);
    };
    play();
  }
}