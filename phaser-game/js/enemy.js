// ============================================================
// AETHER — Enemy (Phaser 3)
// ============================================================
class Enemy {
  constructor(scene, x, y, type, config) {
    this.scene = scene; this.type = type || 'patrol';
    this.config = config || {};
    this.speed = this.config.speed || 80;
    this.hp = this.config.hp || 1;
    this.alive = true;
    this.facing = 1;
    this.sprite = scene.physics.add.sprite(x, y, 'enemy_' + this.type);
    this.sprite.body.setSize(20, 20);
    this.sprite.setDepth(5);
    this.patrol = this.config.patrol || null;
    this.patrolDir = 1;
    this.createTexture(scene, type);
    this.sprite.setTexture('enemy_' + type);
  }
  createTexture(scene, type) {
    const key = 'enemy_' + type;
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x:0, y:0, add:false });
    if (type === 'patrol') {
      g.fillStyle(0xff4444, 1); g.fillCircle(16, 16, 12);
      g.fillStyle(0xffffff, 1); g.fillCircle(13, 13, 3); g.fillCircle(19, 13, 3);
      g.fillStyle(0x000, 1); g.fillCircle(13, 13, 1.5); g.fillCircle(19, 13, 1.5);
    } else if (type === 'chaser') {
      g.fillStyle(0xff0044, 1); g.fillTriangle(16, 4, 4, 28, 28, 28);
      g.fillStyle(0xffffff, 1); g.fillCircle(16, 18, 3);
    } else if (type === 'flyer') {
      g.fillStyle(0xffaa00, 1); g.fillEllipse(16, 16, 16, 10);
      g.fillStyle(0xff8800, 1); g.fillTriangle(4, 16, 0, 8, 8, 16); g.fillTriangle(28, 16, 32, 8, 24, 16);
      g.fillStyle(0x000, 1); g.fillCircle(16, 16, 2);
    }
    g.generateTexture(key, 32, 32); g.destroy();
  }
  update(player) {
    if (!this.alive) return;
    const body = this.sprite.body;
    if (this.type === 'patrol' && this.patrol) {
      this.sprite.x += this.patrolDir * this.speed * (1/60);
      if (this.sprite.x < this.patrol.minX) this.patrolDir = 1;
      if (this.sprite.x > this.patrol.maxX) this.patrolDir = -1;
      this.sprite.setFlipX(this.patrolDir < 0);
    } else if (this.type === 'chaser') {
      const dx = player.sprite.x - this.sprite.x, dy = player.sprite.y - this.sprite.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < 400 && d > 1) {
        body.setVelocityX((dx/d) * this.speed * 1.3);
        body.setVelocityY((dy/d) * this.speed * 0.5);
        this.sprite.setFlipX(dx < 0);
      } else { body.setVelocity(0, 0); }
    } else if (this.type === 'flyer') {
      this.sprite.x += this.patrolDir * this.speed * (1/60);
      this.sprite.y += Math.sin(Date.now() * 0.003) * 0.8;
      if (this.patrol) { if (this.sprite.x < this.patrol.minX) this.patrolDir = 1; if (this.sprite.x > this.patrol.maxX) this.patrolDir = -1; }
      this.sprite.setFlipX(this.patrolDir < 0);
    }
    // Gravity for non-flyers
    if (this.type !== 'flyer') {
      // handled by arcade physics
    }
  }
  takeDamage() {
    this.hp--;
    if (this.hp <= 0) {
      this.alive = false;
      this.sprite.setVisible(false);
      this.sprite.body.enable = false;
      window.game.scene.particles.emit(this.sprite.x, this.sprite.y, 20, 0xff4444, 150, 0.5, 4);
      window.game.audio.enemyHit();
    }
    return this.hp <= 0;
  }
  respawn() {
    this.alive = true; this.hp = this.config.hp || 1;
    this.sprite.setVisible(true); this.sprite.body.enable = true;
  }
}