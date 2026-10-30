// ============================================================
// AETHER — Phaser 3 Configuration
// ============================================================
const GAME_CONFIG = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#050510',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [] // populated later
};

// Game constants
const C = {
  PLAYER_SPEED: 220,
  PLAYER_JUMP: -480,
  PLAYER_DASH: 500,
  DASH_COOLDOWN: 600,
  GRAVITY: 900,
  TILE_SIZE: 32,
  COLORS: {
    cyan: 0x00ffff,
    green: 0x00ff88,
    purple: 0xaa44ff,
    orange: 0xff8800,
    gold: 0xffdd00,
    red: 0xff4444,
    white: 0xffffff,
    dark: 0x0a0a1a
  }
};

// Level data
const LEVELS = [
  { name: 'Awakening', biome: 0, color: 0x00ffff, accent: 0x0088aa, width: 2400, height: 700, playerStart: {x:100, y:400}, exit: {x:2250, y:300}, crystals: 6, enemies: 1, theme: 'forest' },
  { name: 'Whispering Woods', biome: 0, color: 0x00ff88, accent: 0x00aa55, width: 2800, height: 800, playerStart: {x:100, y:400}, exit: {x:2650, y:300}, crystals: 11, enemies: 5, theme: 'forest' },
  { name: 'Crystal Cavern', biome: 1, color: 0xaa44ff, accent: 0x7722cc, width: 3000, height: 900, playerStart: {x:100, y:400}, exit: {x:2850, y:300}, crystals: 16, enemies: 8, theme: 'cave' },
  { name: 'Skyward', biome: 2, color: 0xff8800, accent: 0xcc6600, width: 2600, height: 700, playerStart: {x:100, y:400}, exit: {x:2450, y:300}, crystals: 8, enemies: 4, theme: 'sky', boss: true },
  { name: 'The Void', biome: 2, color: 0xffdd00, accent: 0xccaa00, width: 2200, height: 700, playerStart: {x:100, y:400}, exit: {x:2050, y:300}, crystals: 7, enemies: 4, theme: 'void', boss: true },
];

function getLevel(i) { return LEVELS[i] || null; }
function getTotalLevels() { return LEVELS.length; }