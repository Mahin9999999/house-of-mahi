// ============================================================
// AETHER — Player (Phaser 3)
// ============================================================
class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({ W:'W', A:'A', S:'S', D:'D', SPACE:'SPACE', SHIFT:'SHIFT', X:'X', Z:'Z' });
    // State
    this.onGround = false; this.facing = 1;
    this.jumpsLeft = 2; this.maxJumps = 2;
    this.dashCooldown = 0; this.dashTimer = 0;
    this.wallSliding = false; this.wallDir = 0;
    this.invincible = 0; this.alive = true;
    this.trail = [];
    this.squash = 1; this.targetSquash = 1;
    this.walkCycle = 0;
    // Touch
    this.touch = { left:false, right:false, jump:false, dash:false, jumpConsumed:false, dashConsumed:false };
    // Create texture
    this.createTexture(scene);
  }
  createTexture(scene) {
    const g = scene.make.graphics({ x:0, y:0, add:false });
    // Body (glowing cyan)
    g.fillStyle(0x00ffff, 1); g.fillEllipse(16, 20, 20, 28);
    // Core
    g.fillStyle(0xffffff, 1); g.fillEllipse(16, 20, 10, 14);
    // Eyes
    g.fillStyle(0x003344, 1); g.fillCircle(13, 16, 2.5); g.fillCircle(19, 16, 2.5);
    g.fillStyle(0xffffff, 1); g.fillCircle(12, 15, 1); g.fillCircle(18, 15, 1);
    g.generateTexture('player', 32, 32);
    g.destroy();
    this.sprite.setTexture('player');
  }
  update(dt) {
    if (!this.alive) return;
    const body = this.sprite.body;
    const onGround = body.blocked.down || body.touching.down;
    if (onGround && !this.onGround) { this.jumpsLeft = this.maxJumps; this.targetSquash = 0.8; }
    this.onGround = onGround;
    // Coyote time
    // Movement
    const left = this.cursors.left.isDown || this.keys.A.isDown || this.touch.left;
    const right = this.cursors.right.isDown || this.keys.D.isDown || this.touch.right;
    if (left) { body.setVelocityX(-C.PLAYER_SPEED); this.facing = -1; this.sprite.setFlipX(true); }
    else if (right) { body.setVelocityX(C.PLAYER_SPEED); this.facing = 1; this.sprite.setFlipX(false); }
    else { body.setVelocityX(body.velocity.x * 0.8); if (Math.abs(body.velocity.x) < 5) body.setVelocityX(0); }
    // Jump
    const jumpPressed = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown || this.touch.jump;
    if ((jumpPressed || this.touch.jumpConsumed) && this.jumpsLeft > 0 && this.dashTimer <= 0) {
      body.setVelocityY(C.PLAYER_JUMP); this.jumpsLeft--; this.touch.jumpConsumed = false;
      this.targetSquash = 1.3;
      this.scene.particles.emit(this.sprite.x, this.sprite.y + 14, 10, 0x00ffff, 100);
      window.game.audio.jump();
    }
    // Dash
    const dashPressed = this.keys.SHIFT.isDown || this.keys.X.isDown || this.keys.Z.isDown || this.touch.dash;
    if ((dashPressed || this.touch.dashConsumed) && this.dashCooldown <= 0 && this.dashTimer <= 0) {
      this.dashTimer = 150; this.dashCooldown = C.DASH_COOLDOWN;
      body.setVelocityX(this.facing * C.PLAYER_DASH); body.setVelocityY(0);
      this.touch.dashConsumed = false;
      this.targetSquash = 0.7;
      this.scene.particles.emitDir(this.sprite.x, this.sprite.y, 15, 0x00ffff, this.facing > 0 ? 0 : Math.PI, 0.4, 180, 0.4, 4);
      window.game.audio.dash();
      Utils.triggerShake(3);
    }
    if (this.dashTimer > 0) { this.dashTimer -= dt * 1000; if (this.dashTimer <= 0) { body.setVelocityX(body.velocity.x * 0.3); } }
    if (this.dashCooldown > 0) this.dashCooldown -= dt * 1000;
    // Invincible
    if (this.invincible > 0) { this.invincible -= dt * 1000; this.sprite.alpha = Math.sin(this.invincible * 0.05) > 0 ? 0.5 : 1; }
    else this.sprite.alpha = 1;
    // Trail
    this.trail.push({ x: this.sprite.x, y: this.sprite.y, age: 0 });
    if (this.trail.length > 15) this.trail.shift();
    this.trail.forEach(t => t.age += dt);
    this.trail = this.trail.filter(t => t.age < 0.5);
    // Squash recovery
    this.squash += (this.targetSquash - this.squash) * 0.15;
    this.targetSquash += (1 - this.targetSquash) * 0.1;
    this.sprite.setScale(2 - this.squash, this.squash);
    // Walk cycle
    if (onGround && Math.abs(body.velocity.x) > 10) this.walkCycle += dt * 12;
    else this.walkCycle = 0;
    // Fall death
    if (this.sprite.y > (this.scene.levelHeight || 700) + 200) this.die();
  }
  die() {
    if (!this.alive || this.invincible > 0) return;
    this.alive = false;
    this.scene.particles.emit(this.sprite.x, this.sprite.y, 30, 0x00ffff, 200, 0.6, 5);
    Utils.triggerShake(10);
    window.game.audio.death();
    this.scene.time.delayedCall(800, () => this.respawn());
  }
  respawn() {
    const spawn = this.scene.checkpoint || this.scene.playerStart;
    this.sprite.setPosition(spawn.x, spawn.y);
    this.sprite.body.setVelocity(0, 0);
    this.alive = true; this.invincible = 2000;
    this.jumpsLeft = this.maxJumps; this.trail = [];
  }
  takeDamage() {
    if (this.invincible > 0) return;
    this.die();
  }
}