// ============================================================
// AETHER — Enemy AI (Patrol, Chaser, Flyer)
// ============================================================
class Enemy {
  constructor(x, y, type, config) {
    this.x=x; this.y=y; this.type=type||'patrol';
    this.w=24; this.h=24; this.vx=0; this.vy=0; this.alive=true;
    this.respawnTimer=0; this.pulsePhase=Math.random()*Math.PI*2;
    this.config=config||{}; this.speed=this.config.speed||60;
    this.patrol=this.config.patrol||null; this.patrolDir=1;
    this.hp=this.config.hp||1; this.facing=1;
  }
  update(dt, player, platforms, particles) {
    if (!this.alive) { this.respawnTimer-=dt; if(this.respawnTimer<=0) this.alive=true; return; }
    this.pulsePhase += dt*2.5;
    const px=player.x+player.w/2, py=player.y+player.h/2;
    const ex=this.x+this.w/2, ey=this.y+this.h/2;
    const dist=Utils.dist(ex,ey,px,py);
    if (this.type==='patrol') {
      if (this.patrol) {
        this.x += this.patrolDir*this.speed*dt;
        if (this.x<this.patrol.minX) this.patrolDir=1;
        if (this.x>this.patrol.maxX) this.patrolDir=-1;
        this.facing=this.patrolDir;
      }
    } else if (this.type==='chaser') {
      if (dist<400) {
        const dx=px-ex, dy=py-ey, d=Math.sqrt(dx*dx+dy*dy);
        if (d>1){ this.vx=(dx/d)*this.speed*1.3; this.vy=(dy/d)*this.speed*0.5; this.facing=dx>0?1:-1; }
        this.x+=this.vx*dt; this.y+=this.vy*dt;
      } else { this.vx*=0.9; this.vy*=0.9; }
    } else if (this.type==='flyer') {
      this.x += this.speed*dt*(this.patrolDir||1);
      if (this.patrol) { if(this.x<this.patrol.minX) this.patrolDir=1; if(this.x>this.patrol.maxX) this.patrolDir=-1; }
      this.y += Math.sin(this.pulsePhase*2)*30*dt;
      this.facing = this.patrolDir>0?1:-1;
    }
    if (this.type!=='flyer') {
      this.vy += 500*dt; this.y += this.vy*dt;
      for (const p of platforms) {
        if (p.broken||p.type==='invisible'||p.type==='crystal'||p.type==='orb'||p.type==='checkpoint') continue;
        if (Utils.aabb({x:this.x,y:this.y,w:this.w,h:this.h},{x:p.x,y:p.y,w:p.w,h:p.h})) {
          if (this.vy>0){this.y=p.y-this.h;this.vy=0;}
        }
      }
    }
    if (this.x<0) this.x=0;
  }
  draw(ctx,camera,theme) {
    if (!this.alive) return;
    const cx=this.x+this.w/2-camera.x, cy=this.y+this.h/2-camera.y;
    const pulse=1+Math.sin(this.pulsePhase)*0.15;
    const color = theme?theme.platform:'#ff4444';
    ctx.save(); ctx.globalAlpha=0.85;
    if (this.type==='patrol') {
      ctx.shadowColor=color; ctx.shadowBlur=15; ctx.fillStyle=color;
      ctx.beginPath(); ctx.ellipse(cx,cy,this.w/2*pulse,this.h/2*pulse,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0; ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(cx+this.facing*4-3,cy-3,3,0,Math.PI*2); ctx.arc(cx+this.facing*4+3,cy-3,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(cx+this.facing*4-3,cy-3,1.5,0,Math.PI*2); ctx.arc(cx+this.facing*4+3,cy-3,1.5,0,Math.PI*2); ctx.fill();
    } else if (this.type==='chaser') {
      ctx.shadowColor='#ff0044'; ctx.shadowBlur=20; ctx.fillStyle='#ff0044';
      ctx.beginPath();
      for (let i=0;i<6;i++){const a=(i/6)*Math.PI*2+this.pulsePhase; const r=(i%2===0?this.w/2:this.w/3)*pulse; const px=cx+Math.cos(a)*r, py=cy+Math.sin(a)*r; if(i===0)ctx.moveTo(px,py); else ctx.lineTo(px,py);}
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2); ctx.fill();
    } else if (this.type==='flyer') {
      ctx.shadowColor='#ffaa00'; ctx.shadowBlur=15; ctx.fillStyle='#ffaa00';
      ctx.beginPath(); ctx.ellipse(cx,cy,8,6,0,0,Math.PI*2); ctx.fill();
      const wf=Math.sin(this.pulsePhase*4)*8;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx-18,cy-5+wf); ctx.lineTo(cx-12,cy+5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+18,cy-5+wf); ctx.lineTo(cx+12,cy+5); ctx.closePath(); ctx.fill();
      ctx.shadowBlur=0; ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(cx,cy,2,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  collidesWithPlayer(player) {
    if (!this.alive) return false;
    return Utils.aabb({x:this.x,y:this.y,w:this.w,h:this.h},{x:player.x,y:player.y,w:player.w,h:player.h});
  }
  takeDamage() { this.hp--; if (this.hp<=0){this.alive=false;this.respawnTimer=4.0;} return this.hp<=0; }
  disperse() { this.alive=false; this.respawnTimer=3.0; }
}