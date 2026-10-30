// ============================================================
// AETHER — Phaser 3 Game Entry Point
// ============================================================
window.game = {
  audio: new AudioSystem(),
  scene: null
};

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#050510',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 900 }, debug: false }
  },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MenuScene, LevelSelectScene, SettingsScene, GameScene, LevelCompleteScene, VictoryScene]
};

window.phaserGame = new Phaser.Game(config);

// Handle resize
window.addEventListener('resize', () => {
  phaserGame.scale.resize(window.innerWidth, window.innerHeight);
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    const scene = phaserGame.scene.getScene('GameScene');
    if (scene && scene.scene.isActive()) {
      // pause logic
    }
  }
});