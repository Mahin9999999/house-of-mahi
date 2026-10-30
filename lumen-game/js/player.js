// ============================================================
// LUMEN — Player Entity
// ============================================================
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 20; this.h = 28;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.facing = 1; // 1 = right, -1 = left
    this.state = 'idle'; // idle, run, jump, fall, dash
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.jumpBuffer = 0;
    this.coyoteTimer = 0;
    this.squash = 1; // visual squash/stretch
    this.targetSquash = 1;
    this.walkCycle = 0;
    this.trail = [];
    this.invincible = 0;
    this.alive = true;
  }

  update(dt, input, level, platforms, particles) {
    if (!this.alive) return;

    const GRAVITY = 1200;
    const MOVE_SPEED = 240;
    const JUMP_FORCE = -480;
    const DASH_SPEED = 500;
    const DASH_DURATION = 0.15;
    const DASH_COOLDOWN = 0.6;

    // Timers
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;

    // Dash cooldown
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.vx *= 0.3;
        this.state = 'fall';
      }
    }

    // Movement (not during dash)
    if (this.dashTimer <= 0) {
      if (input.moveLeft) {
        this.vx = -MOVE_SPEED;
        this.facing = -1;
        this.state = this.onGround ? 'run' : 'jump';
      } else if (input.moveRight) {
        this.vx = MOVE_SPEED;
        this.facing = 1;
        this.state = this.onGround ? 'run' : 'jump';
      } else {
        this.vx *= 0.8;
        if (Math.abs(this.vx) < 1) this.vx = 0;
        if (this.onGround) this.state = 'idle';
      }
    }

    // Jump buffer
    if (input.consumeJump()) this.jumpBuffer = 0.1;

    // Jump execution
    if (this.jumpBuffer > 0 && (this.onGround || this.coyoteTimer > 0)) {
      this.vy = JUMP_FORCE;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBuffer = 0;
      this.state = 'jump';
      this.targetSquash = 1.3;
      particles.emitDirectional(this.x + this.w/2, this.y + this.h, 8, '#00ffff', -Math.PI/2, 0.8, 80, 0.3, 3);
      if (window.game && window.game.audio) window.game.audio.jump();
    }

    // Dash
    if (input.consumeDash() && this.dashCooldown <= 0 && this.dashTimer <= 0) {
      this.dashTimer = DASH_DURATION;
      this.dashCooldown = DASH_COOLDOWN;
      this.vx = this.facing * DASH_SPEED;
      this.vy = 0;
      this.state = 'dash';
      this.targetSquash = 0.7;
      particles.emitDirectional(this.x + this.w/2, this.y + this.h/2, 15, '#00ffff', this.facing > 0 ? 0 : Math.PI, 0.5, 150, 0.4, 4);
      if (window.game && window.game.audio) window.game.audio.dash();
      Utils.triggerShake(3);
    }

    // Gravity
    if (this.dashTimer <= 0) {
      this.vy += GRAVITY * dt;
      if (this.vy > 800) this.vy = 800;
    }

    // Apply velocity
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Track state
    if (!this.onGround && this.vy > 0) this.state = 'fall';

    // Walk cycle
    if (this.state === 'run') {
      this.walkCycle += dt * 12;
    } else {
      this.walkCycle = 0;
    }

    // Squash/stretch recovery
    this.squash = Utils.lerp(this.squash, this.targetSquash, dt * 15);
    this.targetSquash = Utils.lerp(this.targetSquash, 1, dt * 8);

    // Trail for light
    this.trail.push({ x: this.x + this.w/2, y: this.y + this.h/2, age: 0 });
    if (this.trail.length > 20) this.trail.shift();
    for (const t of this.trail) t.age += dt;
    this.trail = this.trail.filter(t => t.age < 0.5);

    // Level bounds
    if (this.x < 0) this.x = 0;
    if (this.x > level.width - this.w) this.x = level.width - this.w;
    if (this.y > level.height + 200) {
      // Fell off
      this.die(particles);
    }
  }

  die(particles) {
    if (!this.alive) return;
    this.alive = false;
    particles.emit(this.x + this.w/2, this.y + this.h/2, 30, '#00ffff', 200, 0.6, 4);
    Utils.triggerShake(8);
    if (window.game && window.game.audio) window.game.audio.death();
  }

  respawn(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.alive = true;
    this.invincible = 1.5;
    this.trail = [];
  }

  draw(ctx, camera) {
    if (!this.alive) return;
    const cx = this.x + this.w / 2 - camera.x;
    const cy = this.y + this.h / 2 - camera.y;
    const inv = this.invincible > 0 ? (Math.sin(this.invincible * 20) > 0 ? 0.5 : 1) : 1;

    ctx.save();
    ctx.globalAlpha = inv;

    // Squash/stretch
    const sw = this.w * (2 - this.squash) * 0.5;
    const sh = this.h * this.squash;

    // Glow
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;

    // Body (ellipse)
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy + this.h/2 - sh/2, sw/2, sh/2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy + this.h/2 - sh/2, sw/4, sh/4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#003344';
    const eyeOffset = this.facing * 3;
    ctx.beginPath();
    ctx.arc(cx + eyeOffset - 3, cy + this.h/2 - sh/2 - 2, 2, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffset + 3, cy + this.h/2 - sh/2 - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Walk animation legs
    if (this.state === 'run') {
      const legPhase = Math.sin(this.walkCycle) * 4;
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy + this.h/2 + sh/2 - 4);
      ctx.lineTo(cx - 3 + legPhase, cy + this.h/2 + sh/2 + 4);
      ctx.moveTo(cx + 3, cy + this.h/2 + sh/2 - 4);
      ctx.lineTo(cx + 3 - legPhase, cy + this.h/2 + sh/2 + 4);
      ctx.stroke();
    }

    ctx.restore();
  }
}