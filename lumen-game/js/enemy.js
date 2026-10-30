// ============================================================
// LUMEN — Shadow Enemy AI
// ============================================================
class ShadowEnemy {
  constructor(x, y, speed, patrol) {
    this.x = x; this.y = y;
    this.w = 24; this.h = 24;
    this.vx = 0; this.vy = 0;
    this.speed = speed || 60;
    this.patrol = patrol || null; // {minX, maxX} or null
    this.patrolDir = 1;
    this.alive = true;
    this.respawnTimer = 0;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.targetX = x; this.targetY = y;
  }

  update(dt, player, lightSystem) {
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.alive = true;
      return;
    }

    this.pulsePhase += dt * 3;

    // Attracted to light
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const distToPlayer = Utils.dist(this.x + this.w/2, this.y + this.h/2, px, py);

    // Check if player is lit (glow)
    const playerLit = distToPlayer < lightSystem.glowRadius;

    if (playerLit) {
      // Chase player
      this.targetX = px;
      this.targetY = py;
      Utils.triggerShake(0); // no shake for chase
    } else if (this.patrol) {
      // Patrol
      this.targetX = this.x + this.patrolDir * this.speed * dt;
      if (this.x < this.patrol.minX) { this.patrolDir = 1; }
      if (this.x > this.patrol.maxX) { this.patrolDir = -1; }
      this.targetX = this.x + this.patrolDir * 50;
    } else {
      // Idle
      this.targetX = this.x;
      this.targetY = this.y;
    }

    // Move toward target
    const dx = this.targetX - (this.x + this.w/2);
    const dy = this.targetY - (this.y + this.h/2);
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d > 1) {
      const moveSpeed = playerLit ? this.speed * 1.5 : this.speed * 0.5;
      this.vx = (dx / d) * moveSpeed;
      this.vy = (dy / d) * moveSpeed * 0.3;
    } else {
      this.vx *= 0.9; this.vy *= 0.9;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Gravity
    this.vy += 300 * dt;
    // Keep on ground (simple: clamp y)
  }

  draw(ctx, camera) {
    if (!this.alive) return;
    const cx = this.x + this.w/2 - camera.x;
    const cy = this.y + this.h/2 - camera.y;
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.2;

    ctx.save();
    ctx.globalAlpha = 0.8;
    // Shadow blob
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.w * pulse);
    grad.addColorStop(0, 'rgba(80, 0, 120, 0.9)');
    grad.addColorStop(0.5, 'rgba(40, 0, 80, 0.6)');
    grad.addColorStop(1, 'rgba(20, 0, 40, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, this.w * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'rgba(255, 100, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 2, 3, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  collidesWithPlayer(player) {
    if (!this.alive) return false;
    return Utils.aabb(
      { x: this.x, y: this.y, w: this.w, h: this.h },
      { x: player.x, y: player.y, w: player.w, h: player.h }
    );
  }

  disperse() {
    this.alive = false;
    this.respawnTimer = 3.0;
  }
}