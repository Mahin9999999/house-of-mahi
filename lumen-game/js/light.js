// ============================================================
// LUMEN — Light System (Glow, Trail, Reveal)
// ============================================================
class LightSystem {
  constructor() {
    this.trail = []; // {x, y, time, radius}
    this.maxTrail = 60;
    this.glowRadius = 120;
    this.baseGlow = 120;
    this.boostTimer = 0;
  }

  update(dt, player) {
    // Add trail point
    this.trail.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, time: 0 });
    if (this.trail.length > this.maxTrail) this.trail.shift();

    // Age trail
    for (const t of this.trail) t.time += dt;

    // Remove old trail
    this.trail = this.trail.filter(t => t.time < 2.0);

    // Boost timer
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      this.glowRadius = this.baseGlow + 60;
    } else {
      this.glowRadius = this.baseGlow;
    }
  }

  addBoost(duration) { this.boostTimer = duration; }

  // Check if a point is lit (within glow or trail)
  isLit(px, py, player) {
    const d = Utils.dist(px, py, player.x + player.w / 2, player.y + player.h / 2);
    if (d < this.glowRadius) return true;
    for (const t of this.trail) {
      const td = Utils.dist(px, py, t.x, t.y);
      if (td < 40 * (1 - t.time / 2.0)) return true;
    }
    return false;
  }

  draw(ctx, player, camera) {
    const cx = player.x + player.w / 2 - camera.x;
    const cy = player.y + player.h / 2 - camera.y;

    // Glow around player
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.glowRadius);
    grad.addColorStop(0, 'rgba(0, 255, 255, 0.15)');
    grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.05)');
    grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - this.glowRadius, cy - this.glowRadius, this.glowRadius * 2, this.glowRadius * 2);

    // Light trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = (1 - t.time / 2.0) * 0.3;
      const r = 30 * (1 - t.time / 2.0);
      const grad2 = ctx.createRadialGradient(t.x - camera.x, t.y - camera.y, 0, t.x - camera.x, t.y - camera.y, r);
      grad2.addColorStop(0, `rgba(0, 255, 200, ${alpha})`);
      grad2.addColorStop(1, 'rgba(0, 255, 200, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(t.x - camera.x - r, t.y - camera.y - r, r * 2, r * 2);
    }
  }
}