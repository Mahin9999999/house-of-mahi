// ============================================================
// AETHER — Input System
// ============================================================
class InputSystem {
  constructor() {
    this.keys = {};
    this.touch = { left:false, right:false, jump:false, dash:false };
    this.jumpPressed = false; this.dashPressed = false;
    this.setupKeyboard(); this.setupTouch();
  }
  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['Space','ArrowUp','KeyW'].includes(e.code) && !this.jumpPressed) this.jumpPressed = true;
      if (['ShiftLeft','ShiftRight','KeyX','KeyZ'].includes(e.code) && !this.dashPressed) this.dashPressed = true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (['Space','ArrowUp','KeyW'].includes(e.code)) this.jumpPressed = false;
      if (['ShiftLeft','ShiftRight','KeyX','KeyZ'].includes(e.code)) this.dashPressed = false;
    });
  }
  setupTouch() {}
  get moveLeft() { return this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touch.left; }
  get moveRight() { return this.keys['ArrowRight'] || this.keys['KeyD'] || this.touch.right; }
  get jump() { return this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW'] || this.touch.jump; }
  get dash() { return this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyX'] || this.keys['KeyZ'] || this.touch.dash; }
  consumeJump() { if (this.jumpPressed) { this.jumpPressed = false; return true; } return false; }
  consumeDash() { if (this.dashPressed) { this.dashPressed = false; return true; } return false; }
  reset() { this.keys = {}; this.touch = {left:false,right:false,jump:false,dash:false}; this.jumpPressed = false; this.dashPressed = false; }
}