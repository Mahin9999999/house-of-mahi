// ============================================================
// LUMEN — Input System (Keyboard + Touch)
// ============================================================
class InputSystem {
  constructor() {
    this.keys = {};
    this.touch = { left: false, right: false, jump: false, dash: false };
    this.jumpPressed = false;
    this.dashPressed = false;
    this.setupKeyboard();
    this.setupTouch();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!this.jumpPressed) this.jumpPressed = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') {
        if (!this.dashPressed) this.dashPressed = true;
      }
      // Prevent scrolling
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.jumpPressed = false;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') {
        this.dashPressed = false;
      }
    });
  }

  setupTouch() {
    // Touch controls will be created in UI
  }

  // Get movement direction
  get moveLeft() {
    return this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touch.left;
  }
  get moveRight() {
    return this.keys['ArrowRight'] || this.keys['KeyD'] || this.touch.right;
  }
  get jump() {
    return this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW'] || this.touch.jump;
  }
  get dash() {
    return this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyX'] || this.touch.dash;
  }

  // Consume one-shot presses
  consumeJump() {
    if (this.jumpPressed) { this.jumpPressed = false; return true; }
    return false;
  }
  consumeDash() {
    if (this.dashPressed) { this.dashPressed = false; return true; }
    return false;
  }

  reset() {
    this.keys = {};
    this.touch = { left: false, right: false, jump: false, dash: false };
    this.jumpPressed = false;
    this.dashPressed = false;
  }
}