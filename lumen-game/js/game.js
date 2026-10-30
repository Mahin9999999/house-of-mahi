// ============================================================
// LUMEN — Main Game (State Machine, Loop, Rendering)
// ============================================================
const GAME_STATE = {
  SPLASH: 'splash',
  MENU: 'menu',
  LEVEL_SELECT: 'level_select',
  SETTINGS: 'settings',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL_COMPLETE: 'level_complete',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
};

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Systems
    this.input = new InputSystem();
    this.audio = new AudioSystem();
    this.light = new LightSystem();
    this.particles = new ParticleSystem();

    // State
    this.state = GAME_STATE.SPLASH;
    this.splashTimer = 0;
    this.currentLevel = 0;
    this.unlockedLevels = [0]; // level 0 unlocked
    this.levelData = null;
    this.platforms = [];
    this.enemies = [];
    this.player = null;
    this.camera = { x: 0, y: 0 };
    this.crystals = 0;
    this.totalCrystals = 0;
    this.levelCrystals = 0;
    this.levelTime = 0;
    this.bestTimes = JSON.parse(localStorage.getItem('lumen_best') || '{}');
    this.soundEnabled = localStorage.getItem('lumen_sound') !== 'false';
    this.audio.enabled = this.soundEnabled;

    // Boss
    this.boss = null;
    this.bossHits = 0;

    // Moving platform state
    this.movingPlatforms = [];

    // Breakable platform state
    this.breakableTimers = new Map();

    // Checkpoint
    this.checkpoint = null;

    // Screen transition
    this.transition = { active: false, alpha: 0, target: null, callback: null };

    // Resize
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Touch controls
    this.setupTouchControls();

    // Start splash
    this.audio.init();
    this.state = GAME_STATE.SPLASH;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(dpr, dpr);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
  }

  setupTouchControls() {
    // Created dynamically in UI
  }

  // ---- State transitions ----
  startGame() {
    this.audio.init();
    this.audio.startMusic();
    this.goToLevel(0);
  }

  goToLevel(index) {
    this.currentLevel = index;
    this.loadLevel(index);
    this.transitionTo(GAME_STATE.PLAYING);
  }

  loadLevel(index) {
    const data = getLevel(index);
    if (!data) { this.state = GAME_STATE.VICTORY; return; }
    this.levelData = data;
    this.platforms = data.platforms.map(p => ({ ...p, broken: false, breakTimer: 0, movePhase: Math.random() * Math.PI * 2 }));
    this.enemies = data.enemies.map(e => new ShadowEnemy(e.x, e.y, e.speed, e.patrol));
    this.boss = data.boss ? { ...data.boss, alive: true, hitTimer: 0, pulsePhase: 0 } : null;
    this.bossHits = 0;
    this.player = new Player(data.playerStart.x, data.playerStart.y);
    this.camera = { x: 0, y: 0 };
    this.crystals = 0;
    this.levelCrystals = data.platforms.filter(p => p.type === 'crystal').length;
    this.levelTime = 0;
    this.checkpoint = null;
    this.particles.clear();
    this.light.trail = [];
    this.light.glowRadius = this.light.baseGlow;
    this.breakableTimers.clear();
    this.movingPlatforms = this.platforms.filter(p => p.type === 'moving');
  }

  transitionTo(newState, callback) {
    this.transition = { active: true, alpha: 0, target: newState, callback, fading: 'in' };
  }

  // ---- Update ----
  update(dt) {
    // Cap dt
    dt = Math.min(dt, 0.05);

    // Transition (check first, before state-specific logic)
    if (this.transition.active) {
      if (this.transition.fading === 'in') {
        this.transition.alpha += dt * 3;
        if (this.transition.alpha >= 1) {
          this.transition.alpha = 1;
          this.state = this.transition.target;
          if (this.transition.callback) this.transition.callback();
          this.transition.fading = 'out';
        }
      } else {
        this.transition.alpha -= dt * 3;
        if (this.transition.alpha <= 0) {
          this.transition.alpha = 0;
          this.transition.active = false;
        }
      }
      return;
    }

    // Splash
    if (this.state === GAME_STATE.SPLASH) {
      this.splashTimer += dt;
      if (this.splashTimer > 3.0 || this.input.consumeJump() || this.input.consumeDash()) {
        this.transitionTo(GAME_STATE.MENU);
      }
      return;
    }

    // Menu / Level Select / Settings — handled by UI, just update particles
    if (this.state === GAME_STATE.MENU || this.state === GAME_STATE.LEVEL_SELECT || this.state === GAME_STATE.SETTINGS) {
      this.particles.update(dt);
      this.handleMenuInput();
      // ESC to go back to menu
      if (this.input.keys['Escape']) {
        this.input.keys['Escape'] = false;
        if (this.state !== GAME_STATE.MENU) this.transitionTo(GAME_STATE.MENU);
      }
      return;
    }

    if (this.state === GAME_STATE.PLAYING) {
      this.updatePlaying(dt);
    } else if (this.state === GAME_STATE.PAUSED) {
      // nothing
    } else if (this.state === GAME_STATE.LEVEL_COMPLETE) {
      this.particles.update(dt);
      if (this.input.consumeJump() || this.input.consumeDash()) {
        if (this.currentLevel < getTotalLevels() - 1) {
          this.goToLevel(this.currentLevel + 1);
        } else {
          this.transitionTo(GAME_STATE.VICTORY);
        }
      }
    } else if (this.state === GAME_STATE.GAME_OVER) {
      this.particles.update(dt);
      if (this.input.consumeJump() || this.input.consumeDash()) {
        this.goToLevel(this.currentLevel);
      }
    } else if (this.state === GAME_STATE.VICTORY) {
      this.particles.update(dt);
      if (this.input.consumeJump() || this.input.consumeDash()) {
        this.transitionTo(GAME_STATE.MENU);
      }
    }
  }

  updatePlaying(dt) {
    const level = this.levelData;
    if (!level) return;

    this.levelTime += dt;

    // Update moving platforms
    for (const p of this.platforms) {
      if (p.type === 'moving') {
        p.movePhase += dt * (p.moveSpeed || 60) / 50;
        if (p.moveAxis === 'x') {
          p._origX = p._origX || p.x;
          p.x = p._origX + Math.sin(p.movePhase) * (p.moveRange || 60);
        } else {
          p._origY = p._origY || p.y;
          p.y = p._origY + Math.sin(p.movePhase) * (p.moveRange || 60);
        }
      }
      // Breakable platforms
      if (p.type === 'breakable' && p.broken) {
        p.breakTimer -= dt;
        if (p.breakTimer <= 0) {
          p.broken = false;
          p.breakTimer = 0;
        }
      }
    }

    // Update light
    this.light.update(dt, this.player);

    // Update player
    this.player.update(dt, this.input, level, this.platforms, this.particles);

    // Boss dash collision (check before platform collision resolution)
    if (this.boss && this.boss.alive && this.player.state === 'dash' && Utils.aabb(
      { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h },
      { x: this.boss.x, y: this.boss.y, w: this.boss.w, h: this.boss.h }
    )) {
      this.boss.hp--;
      this.boss.hitTimer = 0.5;
      this.particles.emit(this.boss.x + this.boss.w/2, this.boss.y + this.boss.h/2, 20, '#ffdd00', 200, 0.5, 5);
      Utils.triggerShake(6);
      this.audio.bossHit();
      this.player.vx *= -0.5;
      if (this.boss.hp <= 0) {
        this.boss.alive = false;
        this.particles.emit(this.boss.x + this.boss.w/2, this.boss.y + this.boss.h/2, 50, '#ffdd00', 300, 1.0, 6);
        Utils.triggerShake(10);
        this.audio.levelComplete();
      }
    }

    // Collision with platforms
    this.resolveCollisions(this.player, this.platforms);

    // Collect crystals
    for (const p of this.platforms) {
      if (p.type === 'crystal' && !p.collected) {
        if (Utils.aabb({ x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h },
                      { x: p.x, y: p.y, w: p.w, h: p.h })) {
          p.collected = true;
          this.crystals++;
          this.totalCrystals++;
          this.particles.emit(p.x + p.w/2, p.y + p.h/2, 12, level.theme.platform, 120, 0.4, 3);
          this.audio.collect();
        }
      }
      if (p.type === 'orb' && !p.collected) {
        if (Utils.aabb({ x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h },
                      { x: p.x, y: p.y, w: p.w, h: p.h })) {
          p.collected = true;
          this.light.addBoost(5.0);
          this.particles.emit(p.x + p.w/2, p.y + p.h/2, 15, '#ffff00', 150, 0.5, 4);
          this.audio.collect();
        }
      }
      if (p.type === 'checkpoint' && !p.activated) {
        if (Utils.aabb({ x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h },
                      { x: p.x, y: p.y, w: p.w, h: p.h })) {
          p.activated = true;
          this.checkpoint = { x: p.x, y: p.y - 20 };
          this.particles.emit(p.x + p.w/2, p.y + p.h/2, 10, '#00ff88', 100, 0.4, 3);
          this.audio.checkpoint();
        }
      }
    }

    // Breakable platform timer
    for (const p of this.platforms) {
      if (p.type === 'breakable' && !p.broken) {
        // Check if player standing on it
        const playerBottom = this.player.y + this.player.h;
        const onPlatform = this.player.x + this.player.w > p.x && this.player.x < p.x + p.w &&
                           playerBottom >= p.y && playerBottom <= p.y + 5 && this.player.vy >= 0;
        if (onPlatform) {
          if (!p.breakTimer) p.breakTimer = p.breakTime || 1.5;
          p.breakTimer -= dt;
          if (p.breakTimer <= 0) {
            p.broken = true;
            this.particles.emit(p.x + p.w/2, p.y + p.h/2, 15, level.theme.platform, 150, 0.4, 3);
            Utils.triggerShake(2);
          }
        } else {
          p.breakTimer = 0;
        }
      }
    }

    // Update enemies
    for (const e of this.enemies) {
      e.update(dt, this.player, this.light);
      // Check dash collision
      if (this.player.state === 'dash' && e.collidesWithPlayer(this.player)) {
        e.disperse();
        this.particles.emit(e.x + e.w/2, e.y + e.h/2, 20, '#8800ff', 150, 0.5, 4);
        Utils.triggerShake(3);
        this.audio.enemyAlert();
      }
      // Check death collision
      if (e.collidesWithPlayer(this.player) && this.player.invincible <= 0) {
        this.player.die(this.particles);
      }
    }

    // Boss
    if (this.boss && this.boss.alive) {
      this.updateBoss(dt);
    }

    // Check player death
    if (!this.player.alive) {
      // Respawn
      const spawn = this.checkpoint || this.levelData.playerStart;
      this.player.respawn(spawn.x, spawn.y);
      this.enemies = this.levelData.enemies.map(e => new ShadowEnemy(e.x, e.y, e.speed, e.patrol));
      this.boss = this.levelData.boss ? { ...this.levelData.boss, alive: true, hitTimer: 0, pulsePhase: 0 } : null;
      this.bossHits = 0;
      // Reset breakable platforms
      for (const p of this.platforms) {
        if (p.type === 'breakable') { p.broken = false; p.breakTimer = 0; }
        if (p.type === 'moving') { p._origX = undefined; p._origY = undefined; }
      }
    }

    // Check exit
    const exit = this.levelData.exit;
    if (Utils.aabb(
      { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h },
      { x: exit.x, y: exit.y, w: exit.w, h: exit.h }
    )) {
      // Level complete
      const bestTime = this.bestTimes[this.currentLevel];
      if (!bestTime || this.levelTime < bestTime) {
        this.bestTimes[this.currentLevel] = this.levelTime;
        localStorage.setItem('lumen_best', JSON.stringify(this.bestTimes));
      }
      this.state = GAME_STATE.LEVEL_COMPLETE;
      this.particles.emit(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 40, level.theme.platform, 250, 0.8, 5);
      Utils.triggerShake(5);
      this.audio.levelComplete();
      if (this.currentLevel + 1 < getTotalLevels() && !this.unlockedLevels.includes(this.currentLevel + 1)) {
        this.unlockedLevels.push(this.currentLevel + 1);
        localStorage.setItem('lumen_unlocked', JSON.stringify(this.unlockedLevels));
      }
    }

    // Update particles
    this.particles.update(dt);

    // Update camera
    this.updateCamera();

    // Update shake
    Utils.updateShake();
  }

  updateBoss(dt) {
    const boss = this.boss;
    boss.pulsePhase += dt * 2;
    // Boss moves toward player slowly
    const dx = (this.player.x + this.player.w/2) - (boss.x + boss.w/2);
    const dy = (this.player.y + this.player.h/2) - (boss.y + boss.h/2);
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d > 1) {
      boss.x += (dx / d) * boss.speed * dt;
      boss.y += (dy / d) * boss.speed * dt * 0.5;
    }
    if (boss.hitTimer > 0) boss.hitTimer -= dt;

    // Boss touches player = death
    if (boss.alive && Utils.aabb(
      { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h },
      { x: boss.x, y: boss.y, w: boss.w, h: boss.h }
    ) && this.player.invincible <= 0) {
      this.player.die(this.particles);
    }
  }

  resolveCollisions(player, platforms) {
    player.onGround = false;
    for (const p of platforms) {
      if (p.broken) continue;
      if (p.type === 'invisible') {
        // Only solid if lit
        const centerX = p.x + p.w/2;
        const centerY = p.y + p.h/2;
        if (!this.light.isLit(centerX, centerY, player)) continue;
      }
      if (p.type === 'crystal' || p.type === 'orb' || p.type === 'checkpoint' || p.type === 'exit') continue;

      // Platform collision
      if (Utils.aabb({ x: player.x, y: player.y, w: player.w, h: player.h },
                     { x: p.x, y: p.y, w: p.w, h: p.h })) {
        // Determine overlap
        const overlapLeft = (player.x + player.w) - p.x;
        const overlapRight = (p.x + p.w) - player.x;
        const overlapTop = (player.y + player.h) - p.y;
        const overlapBottom = (p.y + p.h) - player.y;

        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapTop && player.vy >= 0) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
        } else if (minOverlap === overlapBottom && player.vy < 0) {
          player.y = p.y + p.h;
          player.vy = 0;
        } else if (minOverlap === overlapLeft) {
          player.x = p.x - player.w;
          player.vx = 0;
        } else if (minOverlap === overlapRight) {
          player.x = p.x + p.w;
          player.vx = 0;
        }
      }
    }
  }

  updateCamera() {
    const targetX = this.player.x + this.player.w/2 - this.W/2;
    const targetY = this.player.y + this.player.h/2 - this.H/2;
    this.camera.x = Utils.lerp(this.camera.x, targetX, 0.08);
    this.camera.y = Utils.lerp(this.camera.y, targetY, 0.08);
    // Clamp camera to level bounds
    this.camera.x = Utils.clamp(this.camera.x, 0, Math.max(0, this.levelData.width || 2000 - this.W));
    this.camera.y = Utils.clamp(this.camera.y, 0, Math.max(0, (this.levelData.height || 600) - this.H));
  }

  // ---- Draw ----
  draw() {
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    const level = this.levelData;

    // Background
    ctx.fillStyle = level ? level.theme.bg : '#000';
    ctx.fillRect(0, 0, W, H);

    // Parallax stars
    if (level) {
      this.drawStars(ctx, level);
    }

    // Transition fade
    if (this.transition.active) {
      ctx.fillStyle = `rgba(0,0,0,${this.transition.alpha})`;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    // State-specific rendering
    if (this.state === GAME_STATE.SPLASH) {
      this.drawSplash(ctx, W, H);
      return;
    }
    if (this.state === GAME_STATE.MENU) {
      this.drawMenu(ctx, W, H);
      return;
    }
    if (this.state === GAME_STATE.LEVEL_SELECT) {
      this.drawLevelSelect(ctx, W, H);
      return;
    }
    if (this.state === GAME_STATE.SETTINGS) {
      this.drawSettings(ctx, W, H);
      return;
    }
    if (this.state === GAME_STATE.VICTORY) {
      this.drawVictory(ctx, W, H);
      return;
    }

    // Game rendering
    ctx.save();
    ctx.translate(-this.camera.x + Utils.shake.x, -this.camera.y + Utils.shake.y);

    // Draw platforms
    this.drawPlatforms(ctx, level);

    // Draw light system
    this.light.draw(ctx, this.player, this.camera);

    // Draw crystals, orbs, checkpoints
    this.drawCollectibles(ctx, level);

    // Draw enemies
    for (const e of this.enemies) e.draw(ctx, this.camera);

    // Draw boss
    if (this.boss && this.boss.alive) this.drawBoss(ctx);

    // Draw exit
    this.drawExit(ctx, level.exit);

    // Draw player
    if (this.player) this.player.draw(ctx, this.camera);

    // Draw particles
    this.particles.draw(ctx);

    ctx.restore();

    // HUD
    this.drawHUD(ctx, W, H, level);

    // Level complete overlay
    if (this.state === GAME_STATE.LEVEL_COMPLETE) {
      this.drawLevelComplete(ctx, W, H);
    }
    if (this.state === GAME_STATE.GAME_OVER) {
      this.drawGameOver(ctx, W, H);
    }
    if (this.state === GAME_STATE.PAUSED) {
      this.drawPaused(ctx, W, H);
    }
  }

  drawStars(ctx, level) {
    const count = (level && level.bgStars) || 80;
    const height = (level && level.height) || 600;
    const seed = this.currentLevel * 1000;
    const color = (level && level.theme && level.theme.platform) || '#00ffff';
    for (let i = 0; i < count; i++) {
      const x = (Math.sin(seed + i * 127.1) * 0.5 + 0.5) * 2000;
      const y = (Math.cos(seed + i * 311.7) * 0.5 + 0.5) * height;
      const size = (Math.sin(seed + i * 73.3) * 0.5 + 0.5) * 1.5 + 0.5;
      const alpha = (Math.sin(seed + i * 197.3 + Date.now() * 0.001) * 0.5 + 0.5) * 0.4 + 0.1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x - this.camera.x * 0.3, y - this.camera.y * 0.3, size, size);
    }
    ctx.globalAlpha = 1;
  }

  drawPlatforms(ctx, level) {
    for (const p of this.platforms) {
      if (p.broken) continue;
      if (p.type === 'invisible') {
        const cx = p.x + p.w/2;
        const cy = p.y + p.h/2;
        if (!this.light.isLit(cx, cy, this.player)) continue;
        ctx.globalAlpha = 0.6;
      }
      if (p.type === 'crystal' || p.type === 'orb' || p.type === 'checkpoint' || p.type === 'exit') continue;

      // Platform color
      let color = level.theme.platform;
      if (p.type === 'breakable') {
        const ratio = p.breakTimer > 0 ? p.breakTimer / (p.breakTime || 1.5) : 1;
        color = `rgba(${parseInt(level.theme.glow)}, ${ratio * 0.8 + 0.2})`;
      }
      if (p.type === 'moving') {
        color = level.theme.accent;
      }

      ctx.fillStyle = color;
      ctx.shadowColor = level.theme.platform;
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.shadowBlur = 0;

      // Platform top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(p.x, p.y, p.w, 2);

      ctx.globalAlpha = 1;
    }
  }

  drawCollectibles(ctx, level) {
    for (const p of this.platforms) {
      if (p.collected) continue;
      const cx = p.x + p.w/2;
      const cy = p.y + p.h/2;
      if (p.type === 'crystal') {
        const glow = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(255, 221, 0, ${glow})`;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx + 6, cy);
        ctx.lineTo(cx, cy + 8);
        ctx.lineTo(cx - 6, cy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === 'orb') {
        const glow = Math.sin(Date.now() * 0.008) * 0.4 + 0.6;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 12;
        ctx.fillStyle = `rgba(0, 255, 136, ${glow})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === 'checkpoint') {
        if (p.activated) {
          ctx.fillStyle = '#00ff88';
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = '#555';
          ctx.shadowBlur = 0;
        }
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.shadowBlur = 0;
      }
    }
  }

  drawExit(ctx, exit) {
    const cx = exit.x + exit.w/2;
    const cy = exit.y + exit.h/2;
    const glow = Math.sin(Date.now() * 0.006) * 0.3 + 0.7;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255, 255, 255, ${glow})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Arrow
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('→', cx, cy + 6);
  }

  drawBoss(ctx) {
    const b = this.boss;
    const cx = b.x + b.w/2 - this.camera.x;
    const cy = b.y + b.h/2 - this.camera.y;
    const pulse = 1 + Math.sin(b.pulsePhase) * 0.15;
    const hitFlash = b.hitTimer > 0 ? 1 : 0;

    ctx.save();
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 30;
    ctx.fillStyle = hitFlash ? '#ffffff' : `rgba(120, 0, 0, ${0.8 * pulse})`;
    ctx.beginPath();
    ctx.arc(cx, cy, b.w/2 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Boss eyes
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 5, 6, 0, Math.PI * 2);
    ctx.arc(cx + 8, cy - 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 5, 3, 0, Math.PI * 2);
    ctx.arc(cx + 8, cy - 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // HP bar
    const hpWidth = 80;
    const hpRatio = b.hp / 5;
    ctx.fillStyle = 'rgba(255,0,0,0.3)';
    ctx.fillRect(cx - hpWidth/2, cy - b.w/2 - 15, hpWidth, 6);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(cx - hpWidth/2, cy - b.w/2 - 15, hpWidth * hpRatio, 6);
    ctx.restore();
  }

  drawHUD(ctx, W, H, level) {
    // Top bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 40);

    // Level name
    ctx.fillStyle = level.theme.platform;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${this.currentLevel + 1}: ${level.name}`, 15, 25);

    // Crystals
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`★ ${this.crystals}/${this.levelCrystals}`, W - 15, 25);

    // Time
    ctx.fillStyle = '#888';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    const mins = Math.floor(this.levelTime / 60);
    const secs = Math.floor(this.levelTime % 60);
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, W/2, 25);

    // Mobile touch controls
    if (this.isMobile) this.drawTouchControls(ctx, W, H);
  }

  drawTouchControls(ctx, W, H) {
    const btnSize = 60;
    const margin = 20;
    const alpha = 0.3;

    // Left
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(margin + btnSize/2, H - margin - btnSize/2, btnSize/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◀', margin + btnSize/2, H - margin - btnSize/2 + 8);

    // Right
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(margin + btnSize * 1.5 + 10, H - margin - btnSize/2, btnSize/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillText('▶', margin + btnSize * 1.5 + 10, H - margin - btnSize/2 + 8);

    // Jump
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(W - margin - btnSize/2, H - margin - btnSize/2, btnSize/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillText('▲', W - margin - btnSize/2, H - margin - btnSize/2 + 8);

    // Dash
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.arc(W - margin - btnSize * 1.5 - 10, H - margin - btnSize/2, btnSize/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillText('»', W - margin - btnSize * 1.5 - 10, H - margin - btnSize/2 + 8);

    ctx.globalAlpha = 1;
  }

  drawSplash(ctx, W, H) {
    const t = this.splashTimer;
    const alpha = Math.min(1, t * 2);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Animated light
    const glow = Math.sin(t * 3) * 0.3 + 0.7;
    const cx = W/2, cy = H/2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150 * glow);
    grad.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
    grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.1)');
    grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 30;
    ctx.fillText('LUMEN', W/2, H/2 - 20);
    ctx.shadowBlur = 0;
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Light in the Dark', W/2, H/2 + 20);
    ctx.globalAlpha = 1;

    if (t > 1.5) {
      ctx.globalAlpha = Math.sin(t * 4) * 0.3 + 0.5;
      ctx.fillStyle = '#555';
      ctx.font = '14px sans-serif';
      ctx.fillText('Press SPACE to start', W/2, H/2 + 80);
      ctx.globalAlpha = 1;
    }
  }

  drawMenu(ctx, W, H) {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    this.drawStars(ctx, { bgStars: 100 });

    const cx = W/2, cy = H/2;
    const grad = ctx.createRadialGradient(cx, cy - 50, 0, cx, cy - 50, 200);
    grad.addColorStop(0, 'rgba(0, 255, 255, 0.15)');
    grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 25;
    ctx.fillText('LUMEN', cx, cy - 80);
    ctx.shadowBlur = 0;

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Light in the Dark', cx, cy - 45);

    // Menu options
    const options = ['Play', 'Level Select', 'Settings'];
    options.forEach((opt, i) => {
      const y = cy + 20 + i * 50;
      ctx.fillStyle = i === 0 ? '#00ffff' : '#555';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(opt, cx, y);
    });

    ctx.fillStyle = '#444';
    ctx.font = '12px sans-serif';
    ctx.fillText('Arrow keys to navigate • Enter to select', cx, H - 40);
  }

  drawLevelSelect(ctx, W, H) {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Level Select', W/2, 60);

    const cols = 3;
    const btnW = 180, btnH = 80;
    const gap = 20;
    const startX = (W - (cols * btnW + (cols-1) * gap)) / 2;
    const startY = 120;

    for (let i = 0; i < getTotalLevels(); i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gap);
      const y = startY + row * (btnH + gap);
      const unlocked = this.unlockedLevels.includes(i);
      const best = this.bestTimes[i];

      ctx.fillStyle = unlocked ? 'rgba(0,255,255,0.1)' : 'rgba(50,50,50,0.5)';
      ctx.strokeStyle = unlocked ? '#00ffff' : '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, btnW, btnH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = unlocked ? '#00ffff' : '#555';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Level ${i+1}`, x + btnW/2, y + 30);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = unlocked ? '#888' : '#333';
      ctx.fillText(getLevel(i).name, x + btnW/2, y + 50);
      if (best && unlocked) {
        const m = Math.floor(best / 60);
        const s = Math.floor(best % 60);
        ctx.fillStyle = '#ffdd00';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Best: ${m}:${s.toString().padStart(2,'0')}`, x + btnW/2, y + 68);
      }
      if (!unlocked) {
        ctx.fillStyle = '#555';
        ctx.font = '20px sans-serif';
        ctx.fillText('🔒', x + btnW/2, y + 55);
      }
    }

    ctx.fillStyle = '#444';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click a level to play • ESC to go back', W/2, H - 40);
  }

  drawSettings(ctx, W, H) {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Settings', W/2, 80);

    ctx.fillStyle = '#888';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Sound: ${this.soundEnabled ? 'ON' : 'OFF'}`, W/2, 160);
    ctx.fillText('Press S to toggle sound', W/2, 190);

    ctx.fillStyle = '#444';
    ctx.font = '12px sans-serif';
    ctx.fillText('ESC to go back', W/2, H - 40);
  }

  drawLevelComplete(ctx, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.fillText('Level Complete!', W/2, H/2 - 40);
    ctx.shadowBlur = 0;

    const best = this.bestTimes[this.currentLevel];
    ctx.fillStyle = '#ffdd00';
    ctx.font = '20px sans-serif';
    ctx.fillText(`Crystals: ${this.crystals}/${this.levelCrystals}`, W/2, H/2 + 10);
    if (best) {
      const m = Math.floor(best / 60);
      const s = Math.floor(best % 60);
      ctx.fillText(`Best Time: ${m}:${s.toString().padStart(2,'0')}`, W/2, H/2 + 40);
    }

    ctx.fillStyle = '#888';
    ctx.font = '16px sans-serif';
    ctx.fillText('Press SPACE for next level', W/2, H/2 + 90);
  }

  drawGameOver(ctx, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 20;
    ctx.fillText('Game Over', W/2, H/2 - 20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#888';
    ctx.font = '16px sans-serif';
    ctx.fillText('Press SPACE to retry', W/2, H/2 + 40);
  }

  drawVictory(ctx, W, H) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 300);
    grad.addColorStop(0, 'rgba(255, 221, 0, 0.3)');
    grad.addColorStop(1, 'rgba(255, 221, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur = 30;
    ctx.fillText('YOU WIN!', W/2, H/2 - 60);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#00ffff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`Total Crystals: ${this.totalCrystals}`, W/2, H/2);
    ctx.fillStyle = '#888';
    ctx.font = '16px sans-serif';
    ctx.fillText('Press SPACE to return to menu', W/2, H/2 + 60);
  }

  drawPaused(ctx, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W/2, H/2);
    ctx.fillStyle = '#888';
    ctx.font = '16px sans-serif';
    ctx.fillText('Press ESC to resume', W/2, H/2 + 40);
  }

  // ---- Menu navigation ----
  handleMenuInput() {
    if (this.state === GAME_STATE.MENU) {
      if (this.input.consumeJump()) {
        this.audio.menuSelect();
        this.startGame();
      }
    } else if (this.state === GAME_STATE.LEVEL_SELECT) {
      // Click handled by mouse
    } else if (this.state === GAME_STATE.SETTINGS) {
      if (this.input.keys['KeyS']) {
        this.soundEnabled = !this.soundEnabled;
        this.audio.enabled = this.soundEnabled;
        localStorage.setItem('lumen_sound', this.soundEnabled);
        this.input.keys['KeyS'] = false;
      }
    }
  }

  handleMouseClick(mx, my) {
    if (this.state === GAME_STATE.MENU) {
      const cx = this.W/2, cy = this.H/2;
      const options = ['Play', 'Level Select', 'Settings'];
      options.forEach((opt, i) => {
        const y = cy + 20 + i * 50;
        if (Math.abs(mx - cx) < 100 && Math.abs(my - y) < 25) {
          this.audio.menuSelect();
          if (opt === 'Play') this.startGame();
          else if (opt === 'Level Select') this.transitionTo(GAME_STATE.LEVEL_SELECT);
          else if (opt === 'Settings') this.transitionTo(GAME_STATE.SETTINGS);
        }
      });
    } else if (this.state === GAME_STATE.LEVEL_SELECT) {
      const cols = 3;
      const btnW = 180, btnH = 80, gap = 20;
      const startX = (this.W - (cols * btnW + (cols-1) * gap)) / 2;
      const startY = 120;
      for (let i = 0; i < getTotalLevels(); i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (btnW + gap);
        const y = startY + row * (btnH + gap);
        if (mx >= x && mx <= x + btnW && my >= y && my <= y + btnH && this.unlockedLevels.includes(i)) {
          this.audio.menuSelect();
          this.goToLevel(i);
        }
      }
    }
  }

  handlePause() {
    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.PAUSED;
    } else if (this.state === GAME_STATE.PAUSED) {
      this.state = GAME_STATE.PLAYING;
    }
  }
}