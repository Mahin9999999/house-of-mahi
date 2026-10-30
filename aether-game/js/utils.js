// ============================================================
// AETHER — The Last Light — Utility Functions
// ============================================================

const Utils = {
  clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
  lerp(a, b, t) { return a + (b - a) * t; },
  dist(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },
  rand(min, max) { return Math.random() * (max - min) + min; },
  randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  angle(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); },
  aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  },
  shake: { x: 0, y: 0, intensity: 0, decay: 0.88 },
  triggerShake(intensity) {
    this.shake.intensity = Math.max(this.shake.intensity, intensity);
  },
  updateShake() {
    this.shake.x = (Math.random() - 0.5) * this.shake.intensity;
    this.shake.y = (Math.random() - 0.5) * this.shake.intensity;
    this.shake.intensity *= this.shake.decay;
    if (this.shake.intensity < 0.1) this.shake.intensity = 0;
  },
  rgba(r, g, b, a) { return `rgba(${r},${g},${b},${a})`; },
  hsla(h, s, l, a) { return `hsla(${h},${s}%,${l}%,${a})`; },
};

class Particle {
  constructor(x, y, vx, vy, color, life, size, gravity = 200) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.life = life; this.maxLife = life;
    this.size = size; this.gravity = gravity; this.dead = false;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.vx *= 0.97;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.1, this.size * alpha), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class ParticleSystem {
  constructor() { this.particles = []; }
  emit(x, y, count, color, speed, life, size, gravity) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = Math.random() * speed;
      this.particles.push(new Particle(x, y, Math.cos(angle)*s, Math.sin(angle)*s - speed*0.3, color, life + Math.random()*0.2, size + Math.random()*2, gravity));
    }
  }
  emitDir(x, y, count, color, angle, spread, speed, life, size) {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = Math.random() * speed + speed * 0.5;
      this.particles.push(new Particle(x, y, Math.cos(a)*s, Math.sin(a)*s, color, life + Math.random()*0.15, size + Math.random()));
    }
  }
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].dead) this.particles.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const p of this.particles) p.draw(ctx);
  }
  clear() { this.particles = []; }
}