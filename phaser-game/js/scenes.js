// ============================================================
// AETHER — Phaser 3 Scenes
// ============================================================
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload() {
    // Create all textures programmatically
    const g = this.make.graphics({ x:0, y:0, add:false });
    // Player
    g.fillStyle(0x00ffff,1); g.fillEllipse(16,20,20,28);
    g.fillStyle(0xffffff,1); g.fillEllipse(16,20,10,14);
    g.fillStyle(0x003344,1); g.fillCircle(13,16,2.5); g.fillCircle(19,16,2.5);
    g.fillStyle(0xffffff,1); g.fillCircle(12,15,1); g.fillCircle(18,15,1);
    g.generateTexture('player',32,32); g.clear();
    // Platform
    g.fillStyle(0x00ff88,1); g.fillRect(0,0,32,32);
    g.fillStyle(0xffffff,0.3); g.fillRect(0,0,32,4);
    g.generateTexture('platform',32,32); g.clear();
    // Crystal
    g.fillStyle(0xffdd00,1); g.fillTriangle(8,0,16,16,0,16); g.fillTriangle(8,16,16,0,16,16);
    g.generateTexture('crystal',16,16); g.clear();
    // Orb
    g.fillStyle(0x00ffff,1); g.fillCircle(8,8,8); g.fillStyle(0xffffff,0.5); g.fillCircle(6,6,3);
    g.generateTexture('orb',16,16); g.clear();
    // Checkpoint
    g.fillStyle(0x555555,1); g.fillRect(4,0,8,24); g.fillStyle(0x00ff88,1); g.fillCircle(12,6,6);
    g.generateTexture('checkpoint',16,24); g.clear();
    // Exit
    g.fillStyle(0xffffff,1); g.fillCircle(16,16,16); g.fillStyle(0x00ffff,1); g.fillCircle(16,16,10);
    g.generateTexture('exit',32,32); g.clear();
    // Star bg
    g.fillStyle(0xffffff,1); g.fillCircle(2,2,2);
    g.generateTexture('star',4,4); g.clear();
  }
  create() {
    console.log('BootScene create called');
    this.time.delayedCall(100, () => {
      this.scene.stop('BootScene');
      this.scene.start('MenuScene');
    });
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }
  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#050510');
    // Stars
    for (let i=0;i<100;i++) {
      const star = this.add.image(Phaser.Math.Between(0,W), Phaser.Math.Between(0,H), 'star');
      star.setAlpha(Phaser.Math.FloatBetween(0.1,0.5));
      this.tweens.add({ targets:star, alpha:0.1, duration:Phaser.Math.Between(1000,3000), yoyo:true, repeat:-1 });
    }
    // Title
    const title = this.add.text(W/2, H/2-80, 'AETHER', { fontSize:'64px', fontFamily:'sans-serif', color:'#00ffff', fontStyle:'bold' }).setOrigin(0.5);
    title.setShadow(0,0,'#00ffff',20,true,true);
    this.add.text(W/2, H/2-30, 'The Last Light', { fontSize:'16px', color:'#888' }).setOrigin(0.5);
    // Buttons
    const btns = ['Play', 'Level Select', 'Settings'];
    btns.forEach((b,i) => {
      const y = H/2 + 30 + i*50;
      const txt = this.add.text(W/2, y, b, { fontSize:'22px', color:'#555', fontStyle:'bold' }).setOrigin(0.5).setInteractive();
      txt.on('pointerover', () => txt.setStyle({ color:'#00ffff' }));
      txt.on('pointerout', () => txt.setStyle({ color:'#555' }));
      txt.on('pointerdown', () => { window.game.audio.menuSelect(); if(b==='Play') this.scene.start('GameScene',{level:0}); else if(b==='Level Select') this.scene.start('LevelSelectScene'); else if(b==='Settings') this.scene.start('SettingsScene'); });
    });
    // High score
    const best = JSON.parse(localStorage.getItem('aether_best')||'{}');
    const total = Object.values(best).reduce((a,b)=>a+b,0);
    if (total > 0) this.add.text(W/2, H-40, `Best Total Time: ${Math.floor(total/60)}:${Math.floor(total%60).toString().padStart(2,'0')}`, { fontSize:'12px', color:'#444' }).setOrigin(0.5);
  }
}

class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }
  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#050510');
    this.add.text(W/2, 40, 'Level Select', { fontSize:'32px', color:'#00ffff', fontStyle:'bold' }).setOrigin(0.5);
    const unlocked = JSON.parse(localStorage.getItem('aether_unlocked')||'[0]');
    const best = JSON.parse(localStorage.getItem('aether_best')||'{}');
    const cols = 3, bw=160, bh=70, gap=15;
    const sx = (W-(cols*bw+(cols-1)*gap))/2, sy = 100;
    for (let i=0; i<getTotalLevels(); i++) {
      const c = i%cols, r = Math.floor(i/cols);
      const x = sx+c*(bw+gap), y = sy+r*(bh+gap);
      const level = getLevel(i);
      const isUnlocked = unlocked.includes(i);
      const bestTime = best[i];
      const bg = this.add.rectangle(x+bw/2, y+bh/2, bw, bh, isUnlocked ? 0x001a1a : 0x1a1a1a).setStrokeStyle(2, isUnlocked ? 0x00ffff : 0x333);
      if (isUnlocked) {
        const txt = this.add.text(x+bw/2, y+25, `Level ${i+1}`, { fontSize:'16px', color:'#00ffff', fontStyle:'bold' }).setOrigin(0.5);
        this.add.text(x+bw/2, y+45, level.name, { fontSize:'11px', color:'#888' }).setOrigin(0.5);
        if (bestTime) { const m=Math.floor(bestTime/60), s=Math.floor(bestTime%60); this.add.text(x+bw/2, y+62, `Best: ${m}:${s.toString().padStart(2,'0')}`, { fontSize:'10px', color:'#ffdd00' }).setOrigin(0.5); }
        bg.setInteractive().on('pointerdown', () => { window.game.audio.menuSelect(); this.scene.start('GameScene', {level:i}); });
        bg.on('pointerover', () => bg.setFillStyle(0x003333));
        bg.on('pointerout', () => bg.setFillStyle(0x001a1a));
      } else {
        this.add.text(x+bw/2, y+bh/2, '🔒', { fontSize:'24px' }).setOrigin(0.5);
      }
    }
    const back = this.add.text(W/2, H-30, 'ESC to go back', { fontSize:'12px', color:'#444' }).setOrigin(0.5);
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));
  }
}

class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }
  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#050510');
    this.add.text(W/2, 80, 'Settings', { fontSize:'32px', color:'#00ffff', fontStyle:'bold' }).setOrigin(0.5);
    const soundText = this.add.text(W/2, 160, `Sound: ${window.game.audio.enabled?'ON':'OFF'}`, { fontSize:'18px', color:'#888' }).setOrigin(0.5).setInteractive();
    soundText.on('pointerdown', () => { window.game.audio.toggle(); soundText.setText(`Sound: ${window.game.audio.enabled?'ON':'OFF'}`); });
    this.add.text(W/2, H-30, 'ESC to go back', { fontSize:'12px', color:'#444' }).setOrigin(0.5);
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));
    this.input.keyboard.on('keydown-S', () => { window.game.audio.toggle(); soundText.setText(`Sound: ${window.game.audio.enabled?'ON':'OFF'}`); });
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }
  init(data) { this.levelIndex = data.level || 0; }
  create() {
    const level = getLevel(this.levelIndex);
    this.level = level;
    this.cameras.main.setBackgroundColor(level.bgColor || '#050510');
    this.levelWidth = level.width; this.levelHeight = level.height;
    // Physics world bounds
    this.physics.world.setBounds(0, 0, level.width, level.height);
    this.cameras.main.setBounds(0, 0, level.width, level.height);
    // Player
    this.player = new Player(this, level.playerStart.x, level.playerStart.y);
    this.checkpoint = level.playerStart;
    // Platforms
    this.platforms = this.physics.add.staticGroup();
    level.platforms.forEach(p => {
      const plat = this.platforms.create(p.x + p.w/2, p.y + p.h/2, 'platform');
      plat.setDisplaySize(p.w, p.h); plat.refreshBody();
      plat.setData('type', p.type || 'solid');
      plat.setData('breakTime', p.breakTime || 0);
      plat.setData('moveAxis', p.moveAxis);
      plat.setData('moveRange', p.moveRange);
      plat.setData('moveSpeed', p.moveSpeed);
      plat.setData('origX', p.x + p.w/2);
      plat.setData('origY', p.y + p.h/2);
      if (p.type === 'invisible') plat.setAlpha(0.3);
      if (p.type === 'breakable') plat.setTint(0xff8844);
      if (p.type === 'moving') plat.setTint(0x44aaff);
    });
    // Collisions
    this.physics.add.collider(this.player.sprite, this.platforms, (player, plat) => {
      if (plat.getData('type') === 'breakable') {
        if (!plat.getData('breaking')) {
          plat.setData('breaking', true);
          plat.setData('breakTimer', plat.getData('breakTime') || 1.5);
        }
      }
    });
    // Crystals
    this.crystals = this.physics.add.group();
    (level.crystals || []).forEach(c => {
      const cr = this.crystals.create(c.x, c.y, 'crystal');
      cr.body.allowGravity = false;
      this.tweens.add({ targets:cr, y: c.y - 5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    this.physics.add.overlap(this.player.sprite, this.crystals, (p, c) => { c.destroy(); this.crystalCount++; window.game.audio.crystal(); this.particles.emit(c.x, c.y, 12, 0xffdd00, 120, 0.4, 3); });
    // Orbs
    this.orbs = this.physics.add.group();
    (level.orbs || []).forEach(o => {
      const orb = this.orbs.create(o.x, o.y, 'orb');
      orb.body.allowGravity = false;
      this.tweens.add({ targets:orb, y: o.y - 5, duration: 600, yoyo: true, repeat: -1 });
    });
    this.physics.add.overlap(this.player.sprite, this.orbs, (p, o) => { o.destroy(); this.player.sprite.shield = true; this.player.sprite.shieldTimer = 8000; window.game.audio.powerup(); this.particles.emit(o.x, o.y, 15, 0x00ffff, 150, 0.5, 4); });
    // Checkpoints
    this.checkpoints = this.physics.add.staticGroup();
    (level.checkpoints || []).forEach(cp => {
      const c = this.checkpoints.create(cp.x, cp.y, 'checkpoint');
      c.body.allowGravity = false;
    });
    this.physics.add.overlap(this.player.sprite, this.checkpoints, (p, cp) => {
      if (!cp.getData('activated')) {
        cp.setData('activated', true); cp.setTint(0x00ff88);
        this.checkpoint = { x: cp.x, y: cp.y - 20 };
        window.game.audio.checkpoint(); this.particles.emit(cp.x, cp.y, 10, 0x00ff88, 100, 0.4, 3);
      }
    });
    // Exit
    this.exit = this.physics.add.staticSprite(level.exit.x, level.exit.y, 'exit');
    this.exit.body.allowGravity = false;
    this.physics.add.overlap(this.player.sprite, this.exit, () => this.levelComplete());
    // Enemies
    this.enemies = [];
    (level.enemies || []).forEach(e => {
      const enemy = new Enemy(this, e.x, e.y, e.type, e);
      this.enemies.push(enemy);
    });
    // Boss
    if (level.boss) {
      this.boss = { ...level.boss, alive: true, sprite: null, hitTimer: 0 };
      const bossG = this.make.graphics({ x:0, y:0, add:false });
      bossG.fillStyle(0xff0044, 1); bossG.fillCircle(30, 30, 30);
      bossG.fillStyle(0xffffff, 1); bossG.fillCircle(22, 22, 6); bossG.fillCircle(38, 22, 6);
      bossG.fillStyle(0x000, 1); bossG.fillCircle(22, 22, 3); bossG.fillCircle(38, 22, 3);
      bossG.generateTexture('boss', 60, 60); bossG.destroy();
      this.boss.sprite = this.physics.add.sprite(level.boss.x, level.boss.y, 'boss');
      this.boss.sprite.body.setSize(50, 50);
      this.boss.sprite.setDepth(8);
      this.physics.add.overlap(this.player.sprite, this.boss.sprite, () => {
        if (this.player.sprite.dashTimer > 0) {
          this.boss.hp--; this.boss.hitTimer = 300; this.boss.sprite.setTint(0xffffff);
          window.game.audio.bossHit(); Utils.triggerShake(6);
          this.particles.emit(this.boss.sprite.x, this.boss.sprite.y, 20, 0xffdd00, 200, 0.5, 5);
          if (this.boss.hp <= 0) { this.boss.alive = false; this.boss.sprite.destroy(); this.particles.emit(this.boss.sprite.x, this.boss.sprite.y, 50, 0xffdd00, 300, 1.0, 6); window.game.audio.victory(); }
        } else if (this.player.sprite.invincible <= 0) {
          this.player.die();
        }
      });
    }
    // Particles
    this.particles = this.add.particles(0, 0, 'star', {
      speed: { min: 50, max: 150 }, angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 }, lifespan: 400, blendMode: 'ADD',
      emitting: false
    });
    this.particles.setDepth(20);
    window.game.scene = this;
    // Camera
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(100, 50);
    // HUD
    this.crystalCount = 0;
    this.crystalText = this.add.text(16, 16, '★ 0', { fontSize:'18px', color:'#ffdd00', fontStyle:'bold' }).setScrollFactor(0).setDepth(100);
    this.levelText = this.add.text(16, 40, `Level ${this.levelIndex+1}: ${level.name}`, { fontSize:'14px', color:'#00ffff' }).setScrollFactor(0).setDepth(100);
    this.timeText = this.add.text(this.scale.width-16, 16, '0:00', { fontSize:'14px', color:'#888' }).setOrigin(1,0).setScrollFactor(0).setDepth(100);
    this.levelTime = 0;
    // Stars background
    for (let i=0;i<100;i++) {
      const star = this.add.image(Phaser.Math.Between(0,level.width), Phaser.Math.Between(0,level.height), 'star');
      star.setAlpha(Phaser.Math.FloatBetween(0.1,0.5));
      this.tweens.add({ targets:star, alpha:0.1, duration:Phaser.Math.Between(1000,3000), yoyo:true, repeat:-1 });
    }
    // Touch controls
    if ('ontouchstart' in window) this.createTouchControls();
    // Music
    window.game.audio.startMusic(level.biome);
  }
  update(time, delta) {
    const dt = delta / 1000;
    this.levelTime += dt;
    const mins = Math.floor(this.levelTime/60), secs = Math.floor(this.levelTime%60);
    this.timeText.setText(`${mins}:${secs.toString().padStart(2,'0')}`);
    this.crystalText.setText(`★ ${this.crystalCount}`);
    // Player update
    this.player.update(delta);
    // Moving platforms
    this.platforms.getChildren().forEach(p => {
      if (p.getData('type') === 'moving') {
        const axis = p.getData('moveAxis'), range = p.getData('moveRange') || 60, speed = p.getData('moveSpeed') || 60;
        const orig = axis === 'x' ? p.getData('origX') : p.getData('origY');
        const phase = (time * 0.001 * speed / 50);
        const offset = Math.sin(phase) * range;
        if (axis === 'x') p.x = orig + offset; else p.y = orig + offset;
        p.refreshBody();
      }
      if (p.getData('type') === 'breakable' && p.getData('breaking')) {
        let t = p.getData('breakTimer') - dt;
        p.setData('breakTimer', t);
        if (t <= 0) { p.destroy(); }
      }
    });
    // Enemies
    this.enemies.forEach(e => e.update(this.player));
    // Boss
    if (this.boss && this.boss.alive) {
      const dx = this.player.sprite.x - this.boss.sprite.x, dy = this.player.sprite.y - this.boss.sprite.y;
      const d = Math.sqrt(dx*dx+dy*dy);
      if (d > 1) { this.boss.sprite.x += (dx/d)*this.boss.speed*(dt); this.boss.sprite.y += (dy/d)*this.boss.speed*dt*0.4; }
      if (this.boss.hitTimer > 0) this.boss.hitTimer -= delta;
    }
    // Camera follow
    this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, this.player.sprite.x - this.scale.width/2, 0.1);
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, this.player.sprite.y - this.scale.height/2, 0.1);
  }
  levelComplete() {
    const best = JSON.parse(localStorage.getItem('aether_best')||'{}');
    if (!best[this.levelIndex] || this.levelTime < best[this.levelIndex]) {
      best[this.levelIndex] = this.levelTime; localStorage.setItem('aether_best', JSON.stringify(best));
    }
    const unlocked = JSON.parse(localStorage.getItem('aether_unlocked')||'[0]');
    if (!unlocked.includes(this.levelIndex+1) && this.levelIndex+1 < getTotalLevels()) { unlocked.push(this.levelIndex+1); localStorage.setItem('aether_unlocked', JSON.stringify(unlocked)); }
    this.scene.start('LevelCompleteScene', { level: this.levelIndex, crystals: this.crystalCount, time: this.levelTime });
  }
  createTouchControls() {
    const W = this.scale.width, H = this.scale.height;
    const makeBtn = (x, y, color, label, key) => {
      const btn = this.add.circle(x, y, 35, color, 0.3).setScrollFactor(0).setDepth(100).setInteractive();
      this.add.text(x, y, label, { fontSize:'20px', color:'#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
      btn.on('pointerdown', () => { this.player.touch[key] = true; if(key==='jump') this.player.touch.jumpConsumed=true; if(key==='dash') this.player.touch.dashConsumed=true; });
      btn.on('pointerup', () => { this.player.touch[key] = false; });
    };
    makeBtn(60, H-60, 0x00ffff, '◀', 'left');
    makeBtn(130, H-60, 0x00ffff, '▶', 'right');
    makeBtn(W-60, H-60, 0x00ff88, '▲', 'jump');
    makeBtn(W-130, H-60, 0xff8800, '»', 'dash');
  }
}

class LevelCompleteScene extends Phaser.Scene {
  constructor() { super('LevelCompleteScene'); }
  init(data) { this.level = data.level; this.crystals = data.crystals; this.time = data.time; }
  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0.8)');
    this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.7);
    this.add.text(W/2, H/2-60, 'Level Complete!', { fontSize:'40px', color:'#00ffff', fontStyle:'bold' }).setOrigin(0.5);
    this.add.text(W/2, H/2, `Crystals: ${this.crystals}`, { fontSize:'20px', color:'#ffdd00' }).setOrigin(0.5);
    const m = Math.floor(this.time/60), s = Math.floor(this.time%60);
    this.add.text(W/2, H/2+30, `Time: ${m}:${s.toString().padStart(2,'0')}`, { fontSize:'16px', color:'#888' }).setOrigin(0.5);
    this.add.text(W/2, H/2+80, 'Press SPACE for next level', { fontSize:'14px', color:'#555' }).setOrigin(0.5);
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.level+1 < getTotalLevels()) this.scene.start('GameScene', {level: this.level+1});
      else this.scene.start('VictoryScene');
    });
  }
}

class VictoryScene extends Phaser.Scene {
  constructor() { super('VictoryScene'); }
  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#000');
    this.add.text(W/2, H/2-60, 'VICTORY!', { fontSize:'60px', color:'#ffdd00', fontStyle:'bold' }).setOrigin(0.5);
    this.add.text(W/2, H/2, 'You restored the light.', { fontSize:'20px', color:'#00ffff' }).setOrigin(0.5);
    this.add.text(W/2, H/2+60, 'Press SPACE to return to menu', { fontSize:'14px', color:'#555' }).setOrigin(0.5);
    this.input.keyboard.on('keydown-SPACE', () => this.scene.start('MenuScene'));
  }
}

class SettingsScene2 extends Phaser.Scene {
  constructor() { super('SettingsScene'); }
  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#050510');
    this.add.text(W/2, 80, 'Settings', { fontSize:'32px', color:'#00ffff', fontStyle:'bold' }).setOrigin(0.5);
    const soundText = this.add.text(W/2, 160, `Sound: ${window.game.audio.enabled?'ON':'OFF'}`, { fontSize:'18px', color:'#888' }).setOrigin(0.5).setInteractive();
    soundText.on('pointerdown', () => { window.game.audio.toggle(); soundText.setText(`Sound: ${window.game.audio.enabled?'ON':'OFF'}`); });
    this.add.text(W/2, H-30, 'ESC to go back', { fontSize:'12px', color:'#444' }).setOrigin(0.5);
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));
  }
}