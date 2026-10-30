// ============================================================
// AETHER — Player Entity (Double Jump, Wall Slide, Dash)
// ============================================================
class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 22; this.h = 30;
    this.vx = 0; this.vy = 0; this.onGround = false;
    this.facing = 1; this.state = 'idle';
    this.dashTimer = 0; this.dashCooldown = 0;
    this.jumpBuffer = 0; this.coyoteTimer = 0;
    this.doubleJumpUsed = false;
    this.wallSliding = false; this.wallDir = 0;
    this.squash = 1; this.targetSquash = 1;
    this.walkCycle = 0; this.trail = [];
    this.invincible = 0; this.alive = true;
    this.groundPound = false; this.groundPoundTimer = 0;
    this.shield = false; this.shieldTimer = 0;
    this.speedBoost = false; this.speedBoostTimer = 0;
  }

  update(dt, input, level, platforms, particles, game) {
    if (!this.alive) return;
    const GRAVITY = 1100, MOVE_SPEED = this.speedBoost ? 320 : 230;
    const JUMP_FORCE = -460, DASH_SPEED = 550;
    const DASH_DUR = 0.15, DASH_CD = 0.5;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
    if (this.dashTimer > 0) { this.dashTimer -= dt; if (this.dashTimer <= 0) { this.vx *= 0.3; this.state = 'fall'; } }
    if (this.groundPoundTimer > 0) { this.groundPoundTimer -= dt; if (this.groundPoundTimer <= 0) { this.groundPound = false; this.vy = 0; } }
    if (this.shieldTimer > 0) { this.shieldTimer -= dt; if (this.shieldTimer <= 0) this.shield = false; }
    if (this.speedBoostTimer > 0) { this.speedBoostTimer -= dt; if (this.speedBoostTimer <= 0) this.speedBoost = false; }

    // Wall slide detection
    this.wallSliding = false; this.wallDir = 0;
    if (!this.onGround && this.dashTimer <= 0) {
      // Check wall left
      if (this.checkWall(-1, platforms, level)) { this.wallSliding = true; this.wallDir = -1; this.facing = -1; }
      else if (this.checkWall(1, platforms, level)) { this.wallSliding = true; this.wallDir = 1; this.facing = 1; }
    }

    // Movement
    if (this.dashTimer <= 0 && !this.groundPound) {
      if (input.moveLeft) { this.vx = -MOVE_SPEED; this.facing = -1; this.state = this.onGround ? 'run' : 'jump'; }
      else if (input.moveRight) { this.vx = MOVE_SPEED; this.facing = 1; this.state = this.onGround ? 'run' : 'jump'; }
      else { this.vx *= 0.75; if (Math.abs(this.vx) < 1) this.vx = 0; if (this.onGround) this.state = 'idle'; }
    }

    // Wall slide friction
    if (this.wallSliding && this.vy > 0) {
      this.vy = Math.min(this.vy, 80);
      this.state = 'wallslide';
      if (Math.random() < 0.3) particles.emitDir(this.x + (this.wallDir > 0 ? this.w : 0), this.y + this.h/2, 1, '#ffffff', this.wallDir > 0 ? Math.PI : 0, 0.5, 30, 0.2, 2);
    }

    // Jump buffer
    if (input.consumeJump()) this.jumpBuffer = 0.12;

    // Jump execution
    if (this.jumpBuffer > 0) {
      if (this.onGround || this.coyoteTimer > 0) {
        this.vy = JUMP_FORCE; this.onGround = false; this.coyoteTimer = 0; this.jumpBuffer = 0;
        this.state = 'jump'; this.targetSquash = 1.3; this.doubleJumpUsed = false;
        particles.emitDir(this.x + this.w/2, this.y + this.h, 10, '#00ffff', -Math.PI/2, 0.8, 100, 0.3, 3);
        if (window.game && window.game.audio) window.game.audio.jump();
      } else if (this.wallSliding && !this.doubleJumpUsed) {
        // Wall jump
        this.vy = JUMP_FORCE; this.vx = -this.wallDir * 300;
        this.wallSliding = false; this.jumpBuffer = 0; this.doubleJumpUsed = true;
        this.state = 'jump'; this.targetSquash = 1.3;
        particles.emitDir(this.x + this.w/2, this.y + this.h/2, 12, '#00ffff', this.wallDir > 0 ? Math.PI : 0, 0.6, 120, 0.3, 3);
        if (window.game && window.game.audio) window.game.audio.jump();
      } else if (!this.onGround && !this.doubleJumpUsed) {
        // Double jump
        this.vy = JUMP_FORCE * 0.85; this.doubleJumpUsed = true;
        this.state = 'jump'; this.targetSquash = 1.2;
        particles.emitDir(this.x + this.w/2, this.y + this.h/2, 15, '#ffdd00', -Math.PI/2, 1.2, 120, 0.4, 3);
        if (window.game && window.game.audio) window.game.audio.doubleJump();
      }
    }

    // Dash
    if (input.consumeDash() && this.dashCooldown <= 0 && this.dashTimer <= 0 && !this.groundPound) {
      this.dashTimer = DASH_DUR; this.dashCooldown = DASH_CD;
      this.vx = this.facing * DASH_SPEED; this.vy = 0;
      this.state = 'dash'; this.targetSquash = 0.7;
      particles.emitDir(this.x + this.w/2, this.y + this.h/2, 18, '#00ffff', this.facing > 0 ? 0 : Math.PI, 0.4, 180, 0.4, 4);
      if (window.game && window.game.audio) window.game.audio.dash();
      Utils.triggerShake(3);
    }

    // Ground pound (down + jump in air)
    if (!this.onGround && input.moveLeft === false && input.moveRight === false && this.keys && this.keys['ArrowDown'] && input.consumeJump()) {
      this.groundPound = true; this.groundPoundTimer = 0.3; this.vy = 600; this.vx = 0;
      this.state = 'groundpound';
    }

    // Gravity
    if (this.dashTimer <= 0 && !this.groundPound) {
      this.vy += GRAVITY * dt;
      if (this.vy > 600) this.vy = 600;
    }
    if (this.groundPound) { this.vy = 800; }

    // Apply velocity
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Track state
    if (!this.onGround && this.vy > 0 && !this.wallSliding && !this.groundPound) this.state = 'fall';

    // Walk cycle
    if (this.state === 'run') this.walkCycle += dt * 14;
    else this.walkCycle = 0;

    // Squash recovery
    this.squash = Utils.lerp(this.squash, this.targetSquash, dt * 15);
    this.targetSquash = Utils.lerp(this.targetSquash, 1, dt * 8);

    // Trail
    this.trail.push({ x: this.x + this.w/2, y: this.y + this.h/2, age: 0 });
    if (this.trail.length > 25) this.trail.shift();
    for (const t of this.trail) t.age += dt;
    this.trail = this.trail.filter(t => t.age < 0.6);

    // Level bounds
    if (this.x < 0) this.x = 0;
    // Fall death
    const lh = (level && level.height) ? level.height : 700;
    if (this.y > lh + 200) {
      this.die(particles);
    }

    // Invincible timer
    if (this.invincible > 0) this.invincible -= dt;

    // Shield timer
    if (this.shieldTimer > 0) { this.shieldTimer -= dt; if (this.shieldTimer <= 0) this.shield = false; }

    // Speed boost timer
    if (this.speedBoostTimer > 0) { this.speedBoostTimer -= dt; if (this.speedBoostTimer <= 0) this.speedBoost = false; }
  }

  checkWall(dir, platforms, level) {
    const checkX = dir > 0 ? this.x + this.w + 2 : this.x - 2;
    for (const p of platforms) {
      if (p.broken) continue;
      if (p.type === 'invisible' || p.type === 'crystal' || p.type === 'orb' || p.type === 'checkpoint') continue;
      if (checkX >= p.x && checkX <= p.x + p.w && this.y + this.h > p.y && this.y < p.y + p.h) return true;
    }
    return false;
  }

  die(particles) {
    if (!this.alive || this.invincible > 0) return;
    if (this.shield) { this.shield = false; this.invincible = 1.0; particles.emit(this.x+this.w/2, this.y+this.h/2, 15, '#00ffff', 150, 0.4, 4); return; }
    this.alive = false;
    particles.emit(this.x + this.w/2, this.y + this.h/2, 40, '#ff4444', 250, 0.8, 5);
    Utils.triggerShake(10);
    if (window.game && window.game.audio) window.game.audio.death();
  }

  respawn(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.alive = true; this.invincible = 2.0; this.trail = [];
    this.doubleJumpUsed = false; this.wallSliding = false;
  }

  draw(ctx, camera) {
    if (!this.alive) return;
    const cx = this.x + this.w/2 - camera.x;
    const cy = this.y + this.h/2 - camera.y;
    const inv = this.invincible > 0 ? (Math.sin(this.invincible*20) > 0 ? 0.4 : 1) : 1;
    ctx.save(); ctx.globalAlpha = inv;

    const sw = this.w * (2 - this.squash) * 0.5;
    const sh = this.h * this.squash;

    // Shield
    if (this.shield) {
      ctx.strokeStyle = 'rgba(0,255,255,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy + this.h/2 - sh/2, 22, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = 'rgba(0,255,255,0.08)'; ctx.fill();
    }

    // Speed boost trail
    if (this.speedBoost) {
      ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 15;
    } else {
      ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 20;
    }

    // Body
    ctx.fillStyle = this.speedBoost ? '#ffdd00' : '#00ffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy + this.h/2 - sh/2, sw/2, sh/2, 0, 0, Math.PI*2);
    ctx.fill();

    // Core
    ctx.shadowBlur = 10; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(cx, cy + this.h/2 - sh/2, sw/4, sh/4, 0, 0, Math.PI*2); ctx.fill();

    // Eyes
    ctx.shadowBlur = 0; ctx.fillStyle = '#003344';
    const eyeOff = this.facing * 3;
    ctx.beginPath();
    ctx.arc(cx + eyeOff - 3, cy + this.h/2 - sh/2 - 2, 2.5, 0, Math.PI*2);
    ctx.arc(cx + eyeOff + 3, cy + this.h/2 - sh/2 - 2, 2.5, 0, Math.PI*2);
    ctx.fill();

    // Walk legs
    if (this.state === 'run') {
      const lp = Math.sin(this.walkCycle) * 5;
      ctx.strokeStyle = this.speedBoost ? '#ffdd00' : '#00ffff'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx-4, cy+this.h/2+sh/2-5); ctx.lineTo(cx-4+lp, cy+this.h/2+sh/2+5);
      ctx.moveTo(cx+4, cy+this.h/2+sh/2-5); ctx.lineTo(cx+4-lp, cy+this.h/2+sh/2+5);
      ctx.stroke();
    }

    // Wall slide indicator
    if (this.wallSliding) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(cx + this.wallDir*8 - 2, cy + this.h/2 - sh/2 - 8 + i*8, 4, 4);
      }
    }

    ctx.restore();
  }
}