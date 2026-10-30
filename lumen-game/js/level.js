// ============================================================
// LUMEN — Level Data
// ============================================================
// Platform: {x, y, w, h, type, color}
// type: 'solid', 'invisible' (revealed by light), 'moving', 'breakable', 'checkpoint', 'crystal', 'orb', 'exit'
// Enemy: {x, y, speed, patrol: {minX, maxX}}

const LEVELS = [
  // ==================== LEVEL 1: Awakening ====================
  {
    width: 2000, height: 600,
    name: 'Awakening',
    theme: { bg: '#0a0a1a', platform: '#00ffff', glow: '0,255,255', accent: '#0088aa' },
    playerStart: { x: 80, y: 400 },
    exit: { x: 1800, y: 300, w: 40, h: 60 },
    platforms: [
      { x: 0, y: 500, w: 300, h: 40, type: 'solid' },
      { x: 350, y: 450, w: 120, h: 20, type: 'solid' },
      { x: 520, y: 400, w: 100, h: 20, type: 'solid' },
      { x: 680, y: 350, w: 120, h: 20, type: 'solid' },
      { x: 850, y: 300, w: 100, h: 20, type: 'solid' },
      { x: 1000, y: 350, w: 150, h: 20, type: 'solid' },
      { x: 1200, y: 400, w: 100, h: 20, type: 'solid' },
      { x: 1350, y: 350, w: 120, h: 20, type: 'solid' },
      { x: 1520, y: 300, w: 200, h: 20, type: 'solid' },
      { x: 1750, y: 350, w: 100, h: 20, type: 'solid' },
      // Invisible platforms (revealed by light)
      { x: 480, y: 320, w: 80, h: 20, type: 'invisible' },
      { x: 750, y: 250, w: 100, h: 20, type: 'invisible' },
      { x: 1100, y: 280, w: 80, h: 20, type: 'invisible' },
      // Crystals
      { x: 400, y: 420, w: 16, h: 16, type: 'crystal' },
      { x: 700, y: 320, w: 16, h: 16, type: 'crystal' },
      { x: 900, y: 270, w: 16, h: 16, type: 'crystal' },
      { x: 1250, y: 370, w: 16, h: 16, type: 'crystal' },
      { x: 1600, y: 270, w: 16, h: 16, type: 'crystal' },
      // Checkpoint
      { x: 900, y: 280, w: 20, h: 30, type: 'checkpoint' },
      // Orb
      { x: 600, y: 370, w: 16, h: 16, type: 'orb' },
    ],
    enemies: [
      { x: 1100, y: 330, speed: 50, patrol: { minX: 1050, maxX: 1250 } }
    ],
    bgStars: 80,
  },

  // ==================== LEVEL 2: The Descent ====================
  {
    width: 2000, height: 2000,
    name: 'The Descent',
    theme: { bg: '#0a1a0a', platform: '#00ff88', glow: '0,255,136', accent: '#00aa55' },
    playerStart: { x: 80, y: 100 },
    exit: { x: 1900, y: 1800, w: 40, h: 60 },
    platforms: [
      // Top section
      { x: 0, y: 200, w: 200, h: 30, type: 'solid' },
      { x: 250, y: 180, w: 100, h: 20, type: 'solid' },
      { x: 400, y: 220, w: 120, h: 20, type: 'solid' },
      { x: 570, y: 180, w: 100, h: 20, type: 'solid' },
      { x: 720, y: 250, w: 150, h: 20, type: 'solid' },
      // Moving platforms
      { x: 900, y: 300, w: 100, h: 20, type: 'moving', moveAxis: 'y', moveRange: 80, moveSpeed: 60 },
      { x: 1050, y: 400, w: 100, h: 20, type: 'moving', moveAxis: 'x', moveRange: 120, moveSpeed: 80 },
      // Mid section
      { x: 1200, y: 500, w: 150, h: 20, type: 'solid' },
      { x: 1400, y: 550, w: 100, h: 20, type: 'solid' },
      { x: 1550, y: 600, w: 120, h: 20, type: 'solid' },
      { x: 1700, y: 550, w: 100, h: 20, type: 'solid' },
      { x: 1850, y: 500, w: 150, h: 20, type: 'solid' },
      // Lower section
      { x: 0, y: 700, w: 200, h: 30, type: 'solid' },
      { x: 250, y: 750, w: 100, h: 20, type: 'solid' },
      { x: 400, y: 800, w: 120, h: 20, type: 'solid' },
      { x: 570, y: 850, w: 100, h: 20, type: 'solid' },
      { x: 720, y: 900, w: 150, h: 20, type: 'solid' },
      { x: 900, y: 950, w: 100, h: 20, type: 'solid' },
      { x: 1050, y: 1000, w: 120, h: 20, type: 'solid' },
      { x: 1200, y: 1050, w: 150, h: 20, type: 'solid' },
      { x: 1400, y: 1100, w: 100, h: 20, type: 'solid' },
      { x: 1550, y: 1150, w: 120, h: 20, type: 'solid' },
      { x: 1700, y: 1200, w: 100, h: 20, type: 'solid' },
      { x: 1850, y: 1250, w: 150, h: 20, type: 'solid' },
      // Bottom
      { x: 0, y: 1700, w: 2000, h: 40, type: 'solid' },
      // Invisible
      { x: 300, y: 650, w: 80, h: 20, type: 'invisible' },
      { x: 800, y: 1000, w: 100, h: 20, type: 'invisible' },
      { x: 1300, y: 1300, w: 80, h: 20, type: 'invisible' },
      // Crystals
      { x: 280, y: 150, w: 16, h: 16, type: 'crystal' },
      { x: 600, y: 220, w: 16, h: 16, type: 'crystal' },
      { x: 950, y: 280, w: 16, h: 16, type: 'crystal' },
      { x: 1250, y: 470, w: 16, h: 16, type: 'crystal' },
      { x: 1600, y: 520, w: 16, h: 16, type: 'crystal' },
      { x: 300, y: 720, w: 16, h: 16, type: 'crystal' },
      { x: 950, y: 920, w: 16, h: 16, type: 'crystal' },
      { x: 1600, y: 1120, w: 16, h: 16, type: 'crystal' },
      // Checkpoint
      { x: 700, y: 230, w: 20, h: 30, type: 'checkpoint' },
      { x: 1400, y: 1080, w: 20, h: 30, type: 'checkpoint' },
      // Orbs
      { x: 500, y: 190, w: 16, h: 16, type: 'orb' },
      { x: 1100, y: 970, w: 16, h: 16, type: 'orb' },
    ],
    enemies: [
      { x: 450, y: 190, speed: 60, patrol: { minX: 400, maxX: 550 } },
      { x: 1300, y: 520, speed: 70, patrol: { minX: 1250, maxX: 1450 } },
      { x: 800, y: 870, speed: 65, patrol: { minX: 750, maxX: 900 } },
    ],
    bgStars: 120,
  },

  // ==================== LEVEL 3: Labyrinth ====================
  {
    width: 2000, height: 600,
    name: 'Labyrinth',
    theme: { bg: '#1a0a1a', platform: '#aa44ff', glow: '170,68,255', accent: '#7722cc' },
    playerStart: { x: 80, y: 100 },
    exit: { x: 1900, y: 300, w: 40, h: 60 },
    platforms: [
      // Maze walls
      { x: 0, y: 500, w: 2000, h: 40, type: 'solid' },
      { x: 0, y: 0, w: 40, h: 540, type: 'solid' },
      { x: 1960, y: 0, w: 40, h: 540, type: 'solid' },
      // Horizontal barriers
      { x: 200, y: 100, w: 300, h: 20, type: 'solid' },
      { x: 600, y: 200, w: 400, h: 20, type: 'solid' },
      { x: 1100, y: 100, w: 300, h: 20, type: 'solid' },
      { x: 1500, y: 200, w: 400, h: 20, type: 'solid' },
      { x: 200, y: 300, w: 400, h: 20, type: 'solid' },
      { x: 700, y: 400, w: 500, h: 20, type: 'solid' },
      { x: 1300, y: 300, w: 400, h: 20, type: 'solid' },
      // Platforms
      { x: 100, y: 450, w: 80, h: 20, type: 'solid' },
      { x: 300, y: 380, w: 80, h: 20, type: 'solid' },
      { x: 500, y: 320, w: 80, h: 20, type: 'solid' },
      { x: 750, y: 450, w: 80, h: 20, type: 'solid' },
      { x: 950, y: 380, w: 80, h: 20, type: 'solid' },
      { x: 1150, y: 320, w: 80, h: 20, type: 'solid' },
      { x: 1350, y: 450, w: 80, h: 20, type: 'solid' },
      { x: 1550, y: 380, w: 80, h: 20, type: 'solid' },
      { x: 1750, y: 320, w: 80, h: 20, type: 'solid' },
      // Switches (invisible, revealed by light)
      { x: 450, y: 300, w: 30, h: 30, type: 'invisible' },
      { x: 1050, y: 280, w: 30, h: 30, type: 'invisible' },
      { x: 1650, y: 280, w: 30, h: 30, type: 'invisible' },
      // Crystals
      { x: 150, y: 420, w: 16, h: 16, type: 'crystal' },
      { x: 350, y: 350, w: 16, h: 16, type: 'crystal' },
      { x: 550, y: 290, w: 16, h: 16, type: 'crystal' },
      { x: 800, y: 420, w: 16, h: 16, type: 'crystal' },
      { x: 1000, y: 350, w: 16, h: 16, type: 'crystal' },
      { x: 1200, y: 290, w: 16, h: 16, type: 'crystal' },
      { x: 1400, y: 420, w: 16, h: 16, type: 'crystal' },
      { x: 1600, y: 350, w: 16, h: 16, type: 'crystal' },
      { x: 1800, y: 290, w: 16, h: 16, type: 'crystal' },
      // Checkpoint
      { x: 900, y: 360, w: 20, h: 30, type: 'checkpoint' },
      // Orb
      { x: 600, y: 180, w: 16, h: 16, type: 'orb' },
      { x: 1200, y: 180, w: 16, h: 16, type: 'orb' },
    ],
    enemies: [
      { x: 300, y: 470, speed: 55, patrol: { minX: 250, maxX: 500 } },
      { x: 800, y: 470, speed: 60, patrol: { minX: 750, maxX: 950 } },
      { x: 1400, y: 470, speed: 65, patrol: { minX: 1350, maxX: 1550 } },
    ],
    bgStars: 100,
  },

  // ==================== LEVEL 4: The Chase ====================
  {
    width: 2000, height: 600,
    name: 'The Chase',
    theme: { bg: '#1a0a0a', platform: '#ff8800', glow: '255,136,0', accent: '#cc5500' },
    playerStart: { x: 80, y: 400 },
    exit: { x: 1900, y: 300, w: 40, h: 60 },
    platforms: [
      { x: 0, y: 500, w: 250, h: 40, type: 'solid' },
      { x: 300, y: 450, w: 100, h: 20, type: 'solid' },
      { x: 450, y: 400, w: 100, h: 20, type: 'solid' },
      { x: 600, y: 350, w: 100, h: 20, type: 'solid' },
      { x: 750, y: 300, w: 100, h: 20, type: 'solid' },
      { x: 900, y: 350, w: 100, h: 20, type: 'solid' },
      { x: 1050, y: 400, w: 100, h: 20, type: 'solid' },
      { x: 1200, y: 350, w: 100, h: 20, type: 'solid' },
      { x: 1350, y: 300, w: 100, h: 20, type: 'solid' },
      { x: 1500, y: 350, w: 100, h: 20, type: 'solid' },
      { x: 1650, y: 400, w: 100, h: 20, type: 'solid' },
      { x: 1800, y: 350, w: 200, h: 20, type: 'solid' },
      // Breakable platforms (disappear after 1.5s)
      { x: 320, y: 420, w: 80, h: 20, type: 'breakable', breakTime: 1.5 },
      { x: 470, y: 370, w: 80, h: 20, type: 'breakable', breakTime: 1.5 },
      { x: 620, y: 320, w: 80, h: 20, type: 'breakable', breakTime: 1.5 },
      { x: 770, y: 270, w: 80, h: 20, type: 'breakable', breakTime: 1.5 },
      // Moving platforms
      { x: 950, y: 320, w: 100, h: 20, type: 'moving', moveAxis: 'x', moveRange: 100, moveSpeed: 120 },
      { x: 1100, y: 370, w: 100, h: 20, type: 'moving', moveAxis: 'y', moveRange: 60, moveSpeed: 100 },
      // Invisible
      { x: 400, y: 250, w: 80, h: 20, type: 'invisible' },
      { x: 650, y: 200, w: 80, h: 20, type: 'invisible' },
      { x: 900, y: 250, w: 80, h: 20, type: 'invisible' },
      { x: 1150, y: 200, w: 80, h: 20, type: 'invisible' },
      { x: 1400, y: 250, w: 80, h: 20, type: 'invisible' },
      // Crystals
      { x: 330, y: 430, w: 16, h: 16, type: 'crystal' },
      { x: 480, y: 380, w: 16, h: 16, type: 'crystal' },
      { x: 630, y: 330, w: 16, h: 16, type: 'crystal' },
      { x: 780, y: 280, w: 16, h: 16, type: 'crystal' },
      { x: 950, y: 290, w: 16, h: 16, type: 'crystal' },
      { x: 1100, y: 340, w: 16, h: 16, type: 'crystal' },
      { x: 1250, y: 320, w: 16, h: 16, type: 'crystal' },
      { x: 1400, y: 260, w: 16, h: 16, type: 'crystal' },
      { x: 1550, y: 320, w: 16, h: 16, type: 'crystal' },
      { x: 1700, y: 370, w: 16, h: 16, type: 'crystal' },
      // Checkpoint
      { x: 900, y: 330, w: 20, h: 30, type: 'checkpoint' },
      // Orb
      { x: 500, y: 370, w: 16, h: 16, type: 'orb' },
      { x: 1000, y: 320, w: 16, h: 16, type: 'orb' },
      { x: 1500, y: 320, w: 16, h: 16, type: 'orb' },
    ],
    enemies: [
      { x: 400, y: 470, speed: 80, patrol: { minX: 350, maxX: 550 } },
      { x: 700, y: 470, speed: 90, patrol: { minX: 650, maxX: 850 } },
      { x: 1000, y: 470, speed: 100, patrol: { minX: 950, maxX: 1150 } },
      { x: 1300, y: 470, speed: 110, patrol: { minX: 1250, maxX: 1450 } },
    ],
    bgStars: 150,
  },

  // ==================== LEVEL 5: The Source (Boss) ====================
  {
    width: 2000, height: 600,
    name: 'The Source',
    theme: { bg: '#000000', platform: '#ffdd00', glow: '255,221,0', accent: '#ccaa00' },
    playerStart: { x: 80, y: 400 },
    exit: { x: 1900, y: 300, w: 40, h: 60 },
    platforms: [
      { x: 0, y: 500, w: 300, h: 40, type: 'solid' },
      { x: 350, y: 450, w: 120, h: 20, type: 'solid' },
      { x: 520, y: 400, w: 100, h: 20, type: 'solid' },
      { x: 680, y: 350, w: 120, h: 20, type: 'solid' },
      { x: 850, y: 300, w: 100, h: 20, type: 'solid' },
      { x: 1000, y: 350, w: 150, h: 20, type: 'solid' },
      { x: 1200, y: 400, w: 100, h: 20, type: 'solid' },
      { x: 1350, y: 350, w: 120, h: 20, type: 'solid' },
      { x: 1520, y: 300, w: 200, h: 20, type: 'solid' },
      { x: 1750, y: 350, w: 250, h: 20, type: 'solid' },
      // Invisible
      { x: 480, y: 320, w: 80, h: 20, type: 'invisible' },
      { x: 750, y: 250, w: 100, h: 20, type: 'invisible' },
      { x: 1100, y: 280, w: 80, h: 20, type: 'invisible' },
      { x: 1400, y: 250, w: 100, h: 20, type: 'invisible' },
      // Breakable
      { x: 320, y: 420, w: 80, h: 20, type: 'breakable', breakTime: 1.2 },
      { x: 470, y: 370, w: 80, h: 20, type: 'breakable', breakTime: 1.2 },
      { x: 620, y: 320, w: 80, h: 20, type: 'breakable', breakTime: 1.2 },
      // Crystals
      { x: 400, y: 420, w: 16, h: 16, type: 'crystal' },
      { x: 700, y: 320, w: 16, h: 16, type: 'crystal' },
      { x: 900, y: 270, w: 16, h: 16, type: 'crystal' },
      { x: 1250, y: 370, w: 16, h: 16, type: 'crystal' },
      { x: 1600, y: 270, w: 16, h: 16, type: 'crystal' },
      // Checkpoint
      { x: 900, y: 280, w: 20, h: 30, type: 'checkpoint' },
      { x: 1400, y: 280, w: 20, h: 30, type: 'checkpoint' },
      // Orb
      { x: 600, y: 370, w: 16, h: 16, type: 'orb' },
      { x: 1100, y: 320, w: 16, h: 16, type: 'orb' },
      { x: 1600, y: 270, w: 16, h: 16, type: 'orb' },
    ],
    enemies: [
      { x: 1100, y: 330, speed: 50, patrol: { minX: 1050, maxX: 1250 } },
      { x: 1500, y: 280, speed: 60, patrol: { minX: 1450, maxX: 1700 } },
    ],
    boss: { x: 1700, y: 280, w: 60, h: 60, hp: 5, speed: 40 },
    bgStars: 200,
  }
];

// Level helper
function getLevel(index) {
  return LEVELS[index] || null;
}

function getTotalLevels() {
  return LEVELS.length;
}