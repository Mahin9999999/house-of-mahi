// ============================================================
// AETHER — The Last Light — Main Game
// ============================================================
const STATE = { SPLASH:'splash', MENU:'menu', LEVEL_SELECT:'level_select', SETTINGS:'settings', PLAYING:'playing', PAUSED:'paused', LEVEL_COMPLETE:'level_complete', GAME_OVER:'game_over', VICTORY:'victory', STORY:'story' };

class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = true;
    this.input = new InputSystem(); this.audio = new AudioSystem();
    this.particles = new ParticleSystem();
    this.state = STATE.SPLASH; this.splashTimer = 0;
    this.currentLevel = 0; this.unlockedLevels = JSON.parse(localStorage.getItem('aether_unlocked') || '[0]');
    this.levelData = null; this.platforms = []; this.enemies = [];
    this.player = null; this.camera = {x:0,y:0};
    this.crystals = 0; this.totalCrystals = 0; this.levelCrystals = 0;
    this.levelTime = 0; this.bestTimes = JSON.parse(localStorage.getItem('aether_best') || '{}');
    this.soundEnabled = localStorage.getItem('aether_sound') !== 'false';
    this.audio.enabled = this.soundEnabled;
    this.boss = null; this.checkpoint = null; this.collectedLore = JSON.parse(localStorage.getItem('aether_lore') || '[]');
    this.achievements = JSON.parse(localStorage.getItem('aether_ach') || '[]');
    this.transition = {active:false, alpha:0, target:null, cb:null, fading:'in'};
    this.shake = Utils.shake;
    this.powerups = []; this.projectiles = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.audio.init();
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.touchControls = {left:false,right:false,jump:false,dash:false};
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr; this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth+'px'; this.canvas.style.height = window.innerHeight+'px';
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.W = window.innerWidth; this.H = window.innerHeight;
  }

  startGame() { this.audio.init(); this.audio.startMusic(0); this.goToLevel(0); }

  goToLevel(i) {
    this.currentLevel = i; this.loadLevel(i);
    this.transitionTo(STATE.PLAYING);
  }

  loadLevel(i) {
    const d = getLevel(i); if (!d) { this.state = STATE.VICTORY; return; }
    this.levelData = d;
    this.platforms = d.platforms.map(p => ({...p, broken:false, breakTimer:0, movePhase:Math.random()*Math.PI*2, collected:false, activated:false}));
    this.enemies = d.enemies.map(e => new Enemy(e.x, e.y, e.type, e));
    this.boss = d.boss ? {...d.boss, alive:true, hitTimer:0, pulsePhase:0, maxHp:d.boss.hp} : null;
    this.player = new Player(d.playerStart.x, d.playerStart.y);
    this.player.game = this;
    this.camera = {x:0,y:0}; this.crystals = 0;
    this.levelCrystals = d.platforms.filter(p=>p.type==='crystal').length;
    this.levelTime = 0; this.checkpoint = null; this.particles.clear();
    this.powerups = []; this.projectiles = [];
    // Generate powerups randomly
    if (Math.random() > 0.5) {
      const solidPlats = this.platforms.filter(p=>p.type==='solid' && p.w > 80);
      if (solidPlats.length) {
        const p = solidPlats[Math.floor(Math.random()*solidPlats.length)];
        this.powerups.push({x:p.x+p.w/2-8, y:p.y-20, w:16, h:16, type: Math.random()>0.5?'speed':'shield', collected:false, phase:Math.random()*Math.PI*2});
      }
    }
  }

  transitionTo(s, cb) { this.transition = {active:true, alpha:0, target:s, cb, fading:'in'}; }

  update(dt) {
    dt = Math.min(dt, 0.016);
    // Transition
    if (this.transition.active) {
      if (this.transition.fading === 'in') {
        this.transition.alpha += dt*4;
        if (this.transition.alpha >= 1) { this.transition.alpha=1; this.state=this.transition.target; if(this.transition.cb) this.transition.cb(); this.transition.fading='out'; }
      } else { this.transition.alpha -= dt*4; if (this.transition.alpha <= 0) { this.transition.alpha=0; this.transition.active=false; } }
      return;
    }
    if (this.state === STATE.SPLASH) {
      this.splashTimer += dt;
      if (this.splashTimer > 2.5 || this.input.consumeJump() || this.input.consumeDash()) this.transitionTo(STATE.MENU);
      return;
    }
    if (this.state === STATE.MENU || this.state===STATE.LEVEL_SELECT || this.state===STATE.SETTINGS || this.state===STATE.VICTORY) {
      this.particles.update(dt); Utils.updateShake();
      if (this.state===STATE.MENU && (this.input.consumeJump())) { this.audio.menuSelect(); this.startGame(); }
      if (this.state===STATE.SETTINGS && this.input.keys['KeyS']) { this.soundEnabled=!this.soundEnabled; this.audio.enabled=this.soundEnabled; localStorage.setItem('aether_sound',this.soundEnabled); this.input.keys['KeyS']=false; }
      if ((this.state===STATE.LEVEL_SELECT||this.state===STATE.SETTINGS) && this.input.keys['Escape']) { this.input.keys['Escape']=false; this.transitionTo(STATE.MENU); }
      return;
    }
    if (this.state === STATE.PAUSED) {
      if (this.input.keys['Escape']) { this.input.keys['Escape']=false; this.state=STATE.PLAYING; }
      return;
    }
    if (this.state === STATE.PLAYING) this.updatePlaying(dt);
    else if (this.state === STATE.LEVEL_COMPLETE) {
      this.particles.update(dt); Utils.updateShake();
      if (this.input.consumeJump() || this.input.consumeDash()) {
        if (this.currentLevel < getTotalLevels()-1) this.goToLevel(this.currentLevel+1);
        else this.transitionTo(STATE.VICTORY);
      }
    } else if (this.state === STATE.GAME_OVER) {
      this.particles.update(dt); Utils.updateShake();
      if (this.input.consumeJump() || this.input.consumeDash()) this.goToLevel(this.currentLevel);
    } else if (this.state === STATE.VICTORY) {
      this.particles.update(dt); Utils.updateShake();
      if (this.input.consumeJump() || this.input.consumeDash()) this.transitionTo(STATE.MENU);
    }
  }

  updatePlaying(dt) {
    const level = this.levelData; if (!level) return;
    this.levelTime += dt;
    // Moving platforms
    for (const p of this.platforms) {
      if (p.type === 'moving') {
        p.movePhase += dt*(p.moveSpeed||60)/50;
        if (p.moveAxis==='x'){ p._ox=p._ox||p.x; p.x=p._ox+Math.sin(p.movePhase)*(p.moveRange||60); }
        else { p._oy=p._oy||p.y; p.y=p._oy+Math.sin(p.movePhase)*(p.moveRange||60); }
      }
      if (p.type==='breakable' && p.broken) { p.breakTimer-=dt; if(p.breakTimer<=0){p.broken=false;p.breakTimer=0;} }
    }
    // Light system removed - using player trail instead
    // Player
    this.player.update(dt, this.input, level, this.platforms, this.particles, this);
    // Boss dash collision (before platform collision)
    if (this.boss && this.boss.alive && this.player.state==='dash' && Utils.aabb({x:this.player.x,y:this.player.y,w:this.player.w,h:this.player.h},{x:this.boss.x,y:this.boss.y,w:this.boss.w,h:this.boss.h})) {
      this.boss.hp--; this.boss.hitTimer=0.5;
      this.particles.emit(this.boss.x+this.boss.w/2,this.boss.y+this.boss.h/2,25,'#ffdd00',250,0.6,5);
      Utils.triggerShake(8); this.audio.bossHit(); this.player.vx*=-0.5;
      if (this.boss.hp<=0){this.boss.alive=false; this.particles.emit(this.boss.x+this.boss.w/2,this.boss.y+this.boss.h/2,60,'#ffdd00',350,1.2,7); Utils.triggerShake(15); this.audio.victory(); this.unlockAchievement('boss_slayer');}
    }
    // Platform collision
    this.resolveCollisions(this.player, this.platforms);
    // Collectibles
    for (const p of this.platforms) {
      if (p.collected) continue;
      if (p.type==='crystal' && Utils.aabb({x:this.player.x,y:this.player.y,w:this.player.w,h:this.player.h},{x:p.x,y:p.y,w:p.w,h:p.h})) {
        p.collected=true; this.crystals++; this.totalCrystals++; this.particles.emit(p.x+p.w/2,p.y+p.h/2,15,level.theme.platform,150,0.5,4); this.audio.crystal();
        if (this.totalCrystals >= 50) this.unlockAchievement('crystal_collector');
      }
      if (p.type==='orb' && Utils.aabb({x:this.player.x,y:this.player.y,w:this.player.w,h:this.player.h},{x:p.x,y:p.y,w:p.w,h:p.h})) {
        p.collected=true; this.player.shield=true; this.player.shieldTimer=8; this.particles.emit(p.x+p.w/2,p.y+p.h/2,20,'#00ffff',180,0.6,5); this.audio.powerup();
      }
      if (p.type==='checkpoint' && !p.activated && Utils.aabb({x:this.player.x,y:this.player.y,w:this.player.w,h:this.player.h},{x:p.x,y:p.y,w:p.w,h:p.h})) {
        p.activated=true; this.checkpoint={x:p.x,y:p.y-20}; this.particles.emit(p.x+p.w/2,p.y+p.h/2,12,'#00ff88',120,0.4,3); this.audio.checkpoint();
      }
    }
    // Powerups
    for (const pu of this.powerups) {
      if (pu.collected) continue;
      if (Utils.aabb({x:this.player.x,y:this.player.y,w:this.player.w,h:this.player.h},{x:pu.x,y:pu.y,w:pu.w,h:pu.h})) {
        pu.collected=true;
        if (pu.type==='speed') { this.player.speedBoost=true; this.player.speedBoostTimer=6; }
        else if (pu.type==='shield') { this.player.shield=true; this.player.shieldTimer=8; }
        this.particles.emit(pu.x+pu.w/2,pu.y+pu.h/2,18,'#ffdd00',160,0.5,4); this.audio.powerup();
      }
      pu.phase += dt*3;
    }
    // Breakable platforms
    for (const p of this.platforms) {
      if (p.type==='breakable' && !p.broken) {
        const pb = this.player.y+this.player.h;
        const onP = this.player.x+this.player.w>p.x && this.player.x<p.x+p.w && pb>=p.y && pb<=p.y+8 && this.player.vy>=0;
        if (onP) { if(!p.breakTimer) p.breakTimer=p.breakTime||1.5; p.breakTimer-=dt; if(p.breakTimer<=0){p.broken=true; this.particles.emit(p.x+p.w/2,p.y+p.h/2,15,level.theme.platform,150,0.4,3); Utils.triggerShake(2);} }
        else p.breakTimer=0;
      }
    }
    // Enemies
    for (const e of this.enemies) {
      e.update(dt, this.player, this.platforms, this.particles);
      if (e.collidesWithPlayer(this.player) && this.player.invincible<=0) {
        if (this.player.state==='dash') { if(e.takeDamage()){ this.particles.emit(e.x+e.w/2,e.y+e.h/2,20,'#ff4444',180,0.5,4); Utils.triggerShake(4); this.audio.enemyHit(); } }
        else { this.player.die(this.particles); }
      }
    }
    // Boss
    if (this.boss && this.boss.alive) {
      this.boss.pulsePhase += dt*2;
      const dx=(this.player.x+this.player.w/2)-(this.boss.x+this.boss.w/2);
      const dy=(this.player.y+this.player.h/2)-(this.boss.y+this.boss.h/2);
      const d=Math.sqrt(dx*dx+dy*dy);
      if (d>1){this.boss.x+=(dx/d)*this.boss.speed*dt; this.boss.y+=(dy/d)*this.boss.speed*dt*0.4;}
      if (this.boss.hitTimer>0) this.boss.hitTimer-=dt;
      if (this.boss.alive && Utils.aabb({x:this.player.x,y:this.player.y,w:this.player.w,h:this.player.h},{x:this.boss.x,y:this.boss.y,w:this.boss.w,h:this.boss.h}) && this.player.invincible<=0 && this.player.state!=='dash') {
        this.player.die(this.particles);
      }
    }
    // Player death respawn
    if (!this.player.alive) {
      const spawn = this.checkpoint || this.levelData.playerStart;
      this.player.respawn(spawn.x, spawn.y);
      this.enemies = this.levelData.enemies.map(e=>new Enemy(e.x,e.y,e.type,e));
      this.boss = this.levelData.boss ? {...this.levelData.boss,alive:true,hitTimer:0,pulsePhase:0,maxHp:this.levelData.boss.hp} : null;
      for (const p of this.platforms) { if(p.type==='breakable'){p.broken=false;p.breakTimer=0;} if(p.type==='moving'){p._ox=undefined;p._oy=undefined;} }
    }
    // Exit check
    const exit = this.levelData.exit;
    if (Utils.aabb({x:this.player.x,y:this.player.y,w:this.player.w,h:this.player.h},{x:exit.x,y:exit.y,w:exit.w,h:exit.h})) {
      const best=this.bestTimes[this.currentLevel];
      if (!best || this.levelTime < best) { this.bestTimes[this.currentLevel]=this.levelTime; localStorage.setItem('aether_best',JSON.stringify(this.bestTimes)); }
      this.state=STATE.LEVEL_COMPLETE; this.particles.emit(this.player.x+this.player.w/2,this.player.y+this.player.h/2,50,level.theme.platform,300,1.0,6); Utils.triggerShake(8); this.audio.levelComplete();
      if (this.currentLevel+1 < getTotalLevels() && !this.unlockedLevels.includes(this.currentLevel+1)) { this.unlockedLevels.push(this.currentLevel+1); localStorage.setItem('aether_unlocked',JSON.stringify(this.unlockedLevels)); }
      if (this.currentLevel === getTotalLevels()-1) this.unlockAchievement('game_complete');
      if (this.crystals >= this.levelCrystals) this.unlockAchievement('perfect_level');
    }
    // Particles
    this.particles.update(dt);
    // Camera
    this.updateCamera();
    // Shake
    Utils.updateShake();
    // HUD
    if (this.player.invincible > 0) {}
  }

  resolveCollisions(player, platforms) {
    player.onGround = false;
    for (const p of platforms) {
      if (p.broken) continue;
      if (['invisible','crystal','orb','checkpoint'].includes(p.type)) {
        if (p.type==='invisible') { const cx=p.x+p.w/2, cy=p.y+p.h/2; const d=Utils.dist(cx,cy,player.x+player.w/2,player.y+player.h/2); if (d>160) continue; }
        else continue;
      }
      if (Utils.aabb({x:player.x,y:player.y,w:player.w,h:player.h},{x:p.x,y:p.y,w:p.w,h:p.h})) {
        const ol=(player.x+player.w)-p.x, or=(p.x+p.w)-player.x;
        const ot=(player.y+player.h)-p.y, ob=(p.y+p.h)-player.y;
        const min=Math.min(ol,or,ot,ob);
        if (min===ot && player.vy>=0) { player.y=p.y-player.h; player.vy=0; player.onGround=true; player.doubleJumpUsed=false; if(player.groundPound){player.groundPound=false;player.groundPoundTimer=0;Utils.triggerShake(5);this.particles.emit(player.x+player.w/2,p.y,20,level.theme.platform,200,0.4,4);} }
        else if (min===ob && player.vy<0) { player.y=p.y+p.h; player.vy=0; }
        else if (min===ol) { player.x=p.x-player.w; player.vx=0; }
        else if (min===or) { player.x=p.x+p.w; player.vx=0; }
      }
    }
  }

  updateCamera() {
    const targetX = this.player.x+this.player.w/2-this.W/2;
    const targetY = this.player.y+this.player.h/2-this.H/2;
    this.camera.x = Utils.lerp(this.camera.x, targetX, 0.1);
    this.camera.y = Utils.lerp(this.camera.y, targetY, 0.1);
    const lw = this.levelData.width||2000, lh = this.levelData.height||700;
    this.camera.x = Utils.clamp(this.camera.x, 0, Math.max(0, lw-this.W));
    this.camera.y = Utils.clamp(this.camera.y, 0, Math.max(0, lh-this.H));
  }

  unlockAchievement(id) {
    if (!this.achievements.includes(id)) { this.achievements.push(id); localStorage.setItem('aether_ach', JSON.stringify(this.achievements)); }
  }

  handleMouseClick(mx, my) {
    if (this.state===STATE.MENU) {
      const cx=this.W/2, cy=this.H/2;
      ['Play','Level Select','Settings'].forEach((opt,i) => {
        const y=cy+30+i*55;
        if (Math.abs(mx-cx)<120 && Math.abs(my-y)<25) { this.audio.menuSelect(); if(opt==='Play')this.startGame(); else if(opt==='Level Select')this.transitionTo(STATE.LEVEL_SELECT); else if(opt==='Settings')this.transitionTo(STATE.SETTINGS); }
      });
    } else if (this.state===STATE.LEVEL_SELECT) {
      const cols=3, bw=160, bh=70, gap=15;
      const sx=(this.W-(cols*bw+(cols-1)*gap))/2, sy=120;
      for (let i=0;i<getTotalLevels();i++) {
        const c=i%cols, r=Math.floor(i/cols);
        const x=sx+c*(bw+gap), y=sy+r*(bh+gap);
        if (mx>=x && mx<=x+bw && my>=y && my<=y+bh && this.unlockedLevels.includes(i)) { this.audio.menuSelect(); this.goToLevel(i); }
      }
    }
  }

  handlePause() {
    if (this.state===STATE.PLAYING) this.state=STATE.PAUSED;
    else if (this.state===STATE.PAUSED) this.state=STATE.PLAYING;
  }

  // ---- DRAWING ----
  draw() {
    const ctx=this.ctx, W=this.W, H=this.H, level=this.levelData;
    // Background gradient
    if (level) {
      const grad = ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0, level.theme.bg1); grad.addColorStop(1, level.theme.bg2);
      ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    } else { ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H); }

    if (this.state===STATE.SPLASH) { this.drawSplash(ctx,W,H); return; }
    if (this.state===STATE.MENU) { this.drawMenu(ctx,W,H); return; }
    if (this.state===STATE.LEVEL_SELECT) { this.drawLevelSelect(ctx,W,H); return; }
    if (this.state===STATE.SETTINGS) { this.drawSettings(ctx,W,H); return; }
    if (this.state===STATE.VICTORY) { this.drawVictory(ctx,W,H); return; }

    // Game world
    ctx.save();
    ctx.translate(-this.camera.x+Utils.shake.x, -this.camera.y+Utils.shake.y);
    this.drawParallax(ctx, level);
    this.drawPlatforms(ctx, level);
    this.drawLightTrail(ctx);
    this.drawCollectibles(ctx, level);
    this.drawPowerups(ctx);
    for (const e of this.enemies) e.draw(ctx, this.camera, level.theme);
    if (this.boss && this.boss.alive) this.drawBoss(ctx);
    this.drawExit(ctx, level.exit);
    if (this.player) this.player.draw(ctx, this.camera);
    this.particles.draw(ctx);
    ctx.restore();

    // HUD
    this.drawHUD(ctx, W, H, level);
    if (this.state===STATE.LEVEL_COMPLETE) this.drawLevelComplete(ctx,W,H);
    if (this.state===STATE.GAME_OVER) this.drawGameOver(ctx,W,H);
    if (this.state===STATE.PAUSED) this.drawPaused(ctx,W,H);

    // Transition
    if (this.transition.active) {
      ctx.fillStyle = `rgba(0,0,0,${this.transition.alpha})`;
      ctx.fillRect(0,0,W,H);
    }
  }

  drawParallax(ctx, level) {
    const stars = level.bgStars || 100;
    const seed = this.currentLevel * 7919;
    for (let i=0; i<stars; i++) {
      const x = (Math.sin(seed+i*127.1)*0.5+0.5)*2000;
      const y = (Math.cos(seed+i*311.7)*0.5+0.5)*(level.height||700);
      const size = (Math.sin(seed+i*73.3)*0.5+0.5)*1.8+0.3;
      const twinkle = Math.sin(Date.now()*0.002 + i)*0.3+0.7;
      ctx.globalAlpha = twinkle*0.5;
      ctx.fillStyle = level.theme.platform;
      ctx.fillRect(x-this.camera.x*0.2, y-this.camera.y*0.2, size, size);
    }
    ctx.globalAlpha = 1;
    // Distant mountains/hills
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i=0; i<5; i++) {
      const mx = i*500 - this.camera.x*0.4;
      const mh = 80 + Math.sin(i*1.5)*40;
      ctx.beginPath(); ctx.moveTo(mx, level.height||700); ctx.lineTo(mx+250, (level.height||700)-mh); ctx.lineTo(mx+500, level.height||700); ctx.fill();
    }
  }

  drawPlatforms(ctx, level) {
    for (const p of this.platforms) {
      if (p.broken) continue;
      if (p.type==='invisible') {
        const cx=p.x+p.w/2, cy=p.y+p.h/2;
        const d=Utils.dist(cx,cy,this.player.x+this.player.w/2,this.player.y+this.player.h/2);
        if (d>160) continue;
        ctx.globalAlpha=0.5;
      }
      if (['crystal','orb','checkpoint'].includes(p.type)) continue;
      let color = level.theme.platform;
      if (p.type==='breakable') { const r = p.breakTimer>0 ? p.breakTimer/(p.breakTime||1.5) : 1; color = `rgba(${level.theme.glow.split(',')[0]},${level.theme.glow.split(',')[1]},${level.theme.glow.split(',')[2]},${0.4+r*0.6})`; }
      if (p.type==='moving') color = level.theme.accent;
      ctx.fillStyle = color; ctx.shadowColor = level.theme.platform; ctx.shadowBlur = 10;
      // Rounded platform
      const r = 4;
      ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, r); ctx.fill(); ctx.shadowBlur=0;
      // Top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(p.x+2, p.y, p.w-4, 2);
      ctx.globalAlpha = 1;
    }
  }

  drawLightTrail(ctx) {
    if (!this.player) return;
    const level = this.levelData;
    const trail = this.player.trail;
    for (let i=0; i<trail.length; i++) {
      const t = trail[i]; const alpha = (1-t.age/0.6)*0.5;
      const r = 15*(1-t.age/0.6);
      const grad = ctx.createRadialGradient(t.x-this.camera.x, t.y-this.camera.y, 0, t.x-this.camera.x, t.y-this.camera.y, r);
      grad.addColorStop(0, `rgba(0,255,200,${alpha})`); grad.addColorStop(1, 'rgba(0,255,200,0)');
      ctx.fillStyle = grad; ctx.fillRect(t.x-this.camera.x-r, t.y-this.camera.y-r, r*2, r*2);
    }
    // Player glow
    const px = this.player.x+this.player.w/2-this.camera.x;
    const py = this.player.y+this.player.h/2-this.camera.y;
    const gr = 150;
    const grad = ctx.createRadialGradient(px,py,0,px,py,gr);
    grad.addColorStop(0, `rgba(${level.theme.glow},0.25)`);
    grad.addColorStop(0.4, `rgba(${level.theme.glow},0.08)`);
    grad.addColorStop(1, `rgba(${level.theme.glow},0)`);
    ctx.fillStyle = grad; ctx.fillRect(px-gr, py-gr, gr*2, gr*2);
  }

  drawCollectibles(ctx, level) {
    for (const p of this.platforms) {
      if (p.collected) continue;
      const cx = p.x+p.w/2, cy = p.y+p.h/2;
      if (p.type==='crystal') {
        const glow = Math.sin(Date.now()*0.005)*0.3+0.7;
        ctx.shadowColor='#ffdd00'; ctx.shadowBlur=12;
        ctx.fillStyle=`rgba(255,221,0,${glow})`;
        ctx.beginPath(); ctx.moveTo(cx,cy-9); ctx.lineTo(cx+7,cy); ctx.lineTo(cx,cy+9); ctx.lineTo(cx-7,cy); ctx.closePath(); ctx.fill();
        ctx.shadowBlur=0;
      } else if (p.type==='orb') {
        const glow = Math.sin(Date.now()*0.008)*0.4+0.6;
        ctx.shadowColor='#00ffff'; ctx.shadowBlur=14;
        ctx.fillStyle=`rgba(0,255,255,${glow})`;
        ctx.beginPath(); ctx.arc(cx,cy,9,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
      } else if (p.type==='checkpoint') {
        ctx.fillStyle = p.activated ? '#00ff88' : '#444';
        ctx.shadowColor = p.activated ? '#00ff88' : 'transparent'; ctx.shadowBlur = p.activated?10:0;
        ctx.fillRect(p.x,p.y,p.w,p.h);
        if (p.activated) { ctx.fillStyle='#fff'; ctx.font='bold 10px sans-serif'; ctx.textAlign='center'; ctx.fillText('✓',p.x+p.w/2,p.y+20); }
        ctx.shadowBlur=0;
      }
    }
  }

  drawPowerups(ctx) {
    for (const pu of this.powerups) {
      if (pu.collected) continue;
      const cx = pu.x+pu.w/2, cy = pu.y+pu.h/2 + Math.sin(pu.phase)*4;
      const color = pu.type==='speed' ? '#ffdd00' : '#00ffff';
      ctx.shadowColor=color; ctx.shadowBlur=12;
      ctx.fillStyle=color;
      ctx.beginPath(); ctx.arc(cx,cy,8,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0; ctx.fillStyle='#000'; ctx.font='bold 10px sans-serif'; ctx.textAlign='center';
      ctx.fillText(pu.type==='speed'?'S':'H', cx, cy+4);
    }
  }

  drawExit(ctx, exit) {
    const cx=exit.x+exit.w/2, cy=exit.y+exit.h/2;
    const glow = Math.sin(Date.now()*0.006)*0.3+0.7;
    ctx.shadowColor='#ffffff'; ctx.shadowBlur=25;
    ctx.fillStyle=`rgba(255,255,255,${glow})`;
    ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(0,255,200,0.9)'; ctx.beginPath(); ctx.arc(cx,cy,14,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.fillStyle='#000'; ctx.font='bold 18px sans-serif'; ctx.textAlign='center'; ctx.fillText('→',cx,cy+6);
  }

  drawBoss(ctx) {
    const b=this.boss; const cx=b.x+b.w/2-this.camera.x, cy=b.y+b.h/2-this.camera.y;
    const pulse=1+Math.sin(b.pulsePhase)*0.12; const flash=b.hitTimer>0;
    ctx.save(); ctx.shadowColor='#ff0044'; ctx.shadowBlur=40;
    ctx.fillStyle=flash?'#fff':`rgba(180,0,40,${0.85*pulse})`;
    ctx.beginPath(); ctx.arc(cx,cy,b.w/2*pulse,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.fillStyle='#ff0044';
    ctx.beginPath(); ctx.arc(cx-10,cy-6,7,0,Math.PI*2); ctx.arc(cx+10,cy-6,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx-10,cy-6,3,0,Math.PI*2); ctx.arc(cx+10,cy-6,3,0,Math.PI*2); ctx.fill();
    // HP bar
    const hw=100, hr=b.hp/b.maxHp;
    ctx.fillStyle='rgba(255,0,0,0.3)'; ctx.fillRect(cx-hw/2,cy-b.w/2-20,hw,8);
    ctx.fillStyle='#ff0044'; ctx.fillRect(cx-hw/2,cy-b.w/2-20,hw*hr,8);
    ctx.restore();
  }

  drawHUD(ctx,W,H,level) {
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(0,0,W,36);
    ctx.fillStyle=level.theme.platform; ctx.font='bold 13px sans-serif'; ctx.textAlign='left';
    ctx.fillText(`Lv.${this.currentLevel+1} ${level.name}`, 12, 23);
    ctx.fillStyle='#ffdd00'; ctx.textAlign='right'; ctx.fillText(`★ ${this.crystals}/${this.levelCrystals}`, W-12, 23);
    ctx.fillStyle='#888'; ctx.textAlign='center'; ctx.font='12px sans-serif';
    const m=Math.floor(this.levelTime/60), s=Math.floor(this.levelTime%60);
    ctx.fillText(`${m}:${s.toString().padStart(2,'0')}`, W/2, 23);
    // Powerup indicators
    if (this.player.shield) { ctx.fillStyle='#00ffff'; ctx.font='11px sans-serif'; ctx.textAlign='left'; ctx.fillText(`🛡 ${Math.ceil(this.player.shieldTimer)}s`, 12, H-12); }
    if (this.player.speedBoost) { ctx.fillStyle='#ffdd00'; ctx.font='11px sans-serif'; ctx.textAlign='left'; ctx.fillText(`⚡ ${Math.ceil(this.player.speedBoostTimer)}s`, 80, H-12); }
    // Mobile controls
    if (this.isMobile) this.drawTouchControls(ctx,W,H);
  }

  drawTouchControls(ctx,W,H) {
    const bs=56, mg=16, a=0.25;
    const drawBtn=(x,y,color,sym)=>{ ctx.globalAlpha=a; ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,bs/2,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=0.6; ctx.fillStyle='#000'; ctx.font='bold 20px sans-serif'; ctx.textAlign='center'; ctx.fillText(sym,x,y+7); ctx.globalAlpha=1; };
    drawBtn(mg+bs/2, H-mg-bs/2, '#00ffff','◀');
    drawBtn(mg+bs*1.6, H-mg-bs/2, '#00ffff','▶');
    drawBtn(W-mg-bs/2, H-mg-bs/2, '#00ff88','▲');
    drawBtn(W-mg-bs*1.6, H-mg-bs/2, '#ff8800','»');
  }

  // ---- Screens ----
  drawSplash(ctx,W,H) {
    ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
    this.drawParallax(ctx, {bgStars:200, height:H, theme:{platform:'#00ffff'}});
    const t=this.splashTimer, glow=Math.sin(t*2)*0.2+0.8;
    const cx=W/2, cy=H/2;
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,180*glow);
    g.addColorStop(0,'rgba(0,255,255,0.3)'); g.addColorStop(1,'rgba(0,255,255,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=Math.min(1,t*2);
    ctx.fillStyle='#00ffff'; ctx.font='bold 72px sans-serif'; ctx.textAlign='center';
    ctx.shadowColor='#00ffff'; ctx.shadowBlur=40; ctx.fillText('AETHER',cx,cy-20); ctx.shadowBlur=0;
    ctx.font='16px sans-serif'; ctx.fillStyle='#888'; ctx.fillText('The Last Light',cx,cy+20);
    ctx.globalAlpha=1;
    if (t>1.5){ ctx.globalAlpha=Math.sin(t*4)*0.3+0.5; ctx.fillStyle='#555'; ctx.font='14px sans-serif'; ctx.fillText('Press SPACE to begin',cx,cy+80); ctx.globalAlpha=1; }
  }

  drawMenu(ctx,W,H) {
    ctx.fillStyle='#050510'; ctx.fillRect(0,0,W,H);
    this.drawParallax(ctx, {bgStars:150, height:H, theme:{platform:'#00ffff'}});
    const cx=W/2, cy=H/2;
    const g=ctx.createRadialGradient(cx,cy-60,0,cx,cy-60,250);
    g.addColorStop(0,'rgba(0,255,255,0.12)'); g.addColorStop(1,'rgba(0,255,255,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#00ffff'; ctx.font='bold 64px sans-serif'; ctx.textAlign='center';
    ctx.shadowColor='#00ffff'; ctx.shadowBlur=30; ctx.fillText('AETHER',cx,cy-90); ctx.shadowBlur=0;
    ctx.font='14px sans-serif'; ctx.fillStyle='#888'; ctx.fillText('The Last Light',cx,cy-50);
    const opts=['Play','Level Select','Settings'];
    opts.forEach((o,i)=>{
      const y=cy+10+i*50;
      ctx.fillStyle=i===0?'#00ffff':'#555'; ctx.font='bold 20px sans-serif'; ctx.fillText(o,cx,y);
    });
    ctx.fillStyle='#444'; ctx.font='12px sans-serif'; ctx.fillText('↑↓ Navigate  •  Enter Select  •  Click to choose',cx,H-30);
  }

  drawLevelSelect(ctx,W,H) {
    ctx.fillStyle='#050510'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#00ffff'; ctx.font='bold 32px sans-serif'; ctx.textAlign='center'; ctx.fillText('Level Select',W/2,50);
    const cols=3, bw=170, bh=75, gap=18;
    const sx=(W-(cols*bw+(cols-1)*gap))/2, sy=100;
    for (let i=0;i<getTotalLevels();i++) {
      const c=i%cols, r=Math.floor(i/cols);
      const x=sx+c*(bw+gap), y=sy+r*(bh+gap);
      const unlocked=this.unlockedLevels.includes(i);
      const best=this.bestTimes[i]; const lvl=getLevel(i);
      ctx.fillStyle=unlocked?'rgba(0,255,255,0.08)':'rgba(40,40,40,0.5)';
      ctx.strokeStyle=unlocked?'#00ffff':'#333'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(x,y,bw,bh,8); ctx.fill(); ctx.stroke();
      ctx.fillStyle=unlocked?'#00ffff':'#555'; ctx.font='bold 15px sans-serif'; ctx.textAlign='center'; ctx.fillText(`Level ${i+1}`,x+bw/2,y+28);
      ctx.font='11px sans-serif'; ctx.fillStyle=unlocked?'#888':'#333'; ctx.fillText(lvl.name,x+bw/2,y+48);
      if (best&&unlocked){const m=Math.floor(best/60),s=Math.floor(best%60); ctx.fillStyle='#ffdd00'; ctx.font='10px sans-serif'; ctx.fillText(`Best: ${m}:${s.toString().padStart(2,'0')}`,x+bw/2,y+64);}
      if (!unlocked){ctx.fillStyle='#555'; ctx.font='22px sans-serif'; ctx.fillText('🔒',x+bw/2,y+55);}
    }
    ctx.fillStyle='#444'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText('Click a level  •  ESC to go back',W/2,H-25);
  }

  drawSettings(ctx,W,H) {
    ctx.fillStyle='#050510'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#00ffff'; ctx.font='bold 32px sans-serif'; ctx.textAlign='center'; ctx.fillText('Settings',W/2,80);
    ctx.fillStyle='#888'; ctx.font='16px sans-serif'; ctx.fillText(`Sound: ${this.soundEnabled?'ON':'OFF'}`,W/2,160);
    ctx.fillText('Press S to toggle',W/2,190);
    ctx.fillStyle='#444'; ctx.font='12px sans-serif'; ctx.fillText('ESC to go back',W/2,H-30);
  }

  drawLevelComplete(ctx,W,H) {
    ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#00ffff'; ctx.font='bold 44px sans-serif'; ctx.textAlign='center'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=20;
    ctx.fillText('Level Complete!',W/2,H/2-50); ctx.shadowBlur=0;
    ctx.fillStyle='#ffdd00'; ctx.font='20px sans-serif'; ctx.fillText(`Crystals: ${this.crystals}/${this.levelCrystals}`,W/2,H/2);
    const best=this.bestTimes[this.currentLevel];
    if (best){const m=Math.floor(best/60),s=Math.floor(best%60); ctx.fillStyle='#888'; ctx.font='16px sans-serif'; ctx.fillText(`Best: ${m}:${s.toString().padStart(2,'0')}`,W/2,H/2+35);}
    ctx.fillStyle='#888'; ctx.font='14px sans-serif'; ctx.fillText('Press SPACE for next level',W/2,H/2+80);
  }

  drawGameOver(ctx,W,H) {
    ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ff4444'; ctx.font='bold 48px sans-serif'; ctx.textAlign='center'; ctx.shadowColor='#ff4444'; ctx.shadowBlur=20;
    ctx.fillText('Game Over',W/2,H/2-20); ctx.shadowBlur=0;
    ctx.fillStyle='#888'; ctx.font='16px sans-serif'; ctx.fillText('Press SPACE to retry',W/2,H/2+40);
  }

  drawVictory(ctx,W,H) {
    ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
    const g=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,400); g.addColorStop(0,'rgba(255,221,0,0.2)'); g.addColorStop(1,'rgba(255,221,0,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffdd00'; ctx.font='bold 60px sans-serif'; ctx.textAlign='center'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=40;
    ctx.fillText('VICTORY!',W/2,H/2-80); ctx.shadowBlur=0;
    ctx.fillStyle='#00ffff'; ctx.font='22px sans-serif'; ctx.fillText(`Total Crystals: ${this.totalCrystals}`,W/2,H/2-20);
    ctx.fillStyle='#888'; ctx.font='16px sans-serif'; ctx.fillText('You restored the light.',W/2,H/2+20);
    ctx.fillText('Press SPACE to return to menu',W/2,H/2+70);
  }

  drawPaused(ctx,W,H) {
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#00ffff'; ctx.font='bold 48px sans-serif'; ctx.textAlign='center'; ctx.fillText('PAUSED',W/2,H/2);
    ctx.fillStyle='#888'; ctx.font='16px sans-serif'; ctx.fillText('Press ESC to resume',W/2,H/2+40);
  }
}

// (Bootstrap is in index.html)