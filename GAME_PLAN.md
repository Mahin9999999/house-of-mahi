# 🎮 Game Design Document — "LUMEN"

## 1. Game Concept

**Title:** Lumen: Light in the Dark
**Genre:** 2D Platformer (Puzzle-Action)
**Platform:** Web (HTML5 Canvas) → Playable in browser, mobile-friendly
**Target:** Casual gamers, all ages
**Session length:** 2-5 minutes per level
**Total playtime:** ~30 minutes (5 levels)

### Core Hook (Why it's addictive)
You control a tiny creature made of **pure light** in a world of darkness. Every step you take **creates light** — revealing hidden platforms, enemies, and secrets. But light also **attracts shadow enemies**. The tension between "explore more" and "stay hidden" creates addictive risk/reward gameplay.

### Unique Selling Point
- **Light painting mechanic**: Your movement trail glows and reveals invisible platforms
- **Shadow enemies**: They're attracted to light — stay still and they lose you
- **Risk/reward**: More exploration = more light = more danger
- **One-more-try feeling**: Death is instant restart, no loading screens

---

## 2. Core Mechanics

### Movement
- **Arrow keys / WASD**: Move left/right
- **Space / Up**: Jump (variable height — hold for higher)
- **Shift**: Dash (short burst, 0.5s cooldown)
- **Mobile:** On-screen touch buttons (left, right, jump, dash)

### Light System
- Player emits a **glow radius** (120px) that reveals hidden platforms
- Movement creates a **light trail** that fades over 2 seconds
- Standing still dims the glow (enemies lose interest)
- Light trail reveals: invisible platforms, hidden crystals, secret paths

### Shadow Enemies
- Spawn in dark areas, **attracted to light**
- Move toward nearest light source (player or trail)
- If they touch player → instant death → level restart
- Can be "dispersed" by dashing through them (1 hit)
- Respawn after 3 seconds

### Collectibles
- **Crystals** (★): Collect for score, 100 = 1 extra life
- **Light Orbs** (○): Expand glow radius temporarily
- **Checkpoints** (◆): Save progress within level

### Win Condition
- Reach the **exit portal** at the end of each level
- Collect crystals for bonus score
- Complete all 5 levels to finish the game

---

## 3. Level Design

### Level 1: "Awakening" (Tutorial)
- **Theme:** Soft blue glow, gentle introduction
- **Mechanics:** Basic movement, jump, light reveal
- **Enemies:** 1 slow shadow (teaches danger)
- **Secrets:** 1 hidden crystal behind invisible platform
- **Difficulty:** ★☆☆☆☆

### Level 2: "The Descent" (Vertical)
- **Theme:** Green glow, vertical drop
- **Mechanics:** Dash, light orbs, falling platforms
- **Enemies:** 2 shadows, moving platforms
- **Secrets:** 2 hidden crystals
- **Difficulty:** ★★☆☆☆

### Level 3: "Labyrinth" (Puzzle)
- **Theme:** Purple glow, maze-like
- **Mechanics:** Switches, doors, key crystals
- **Enemies:** 3 shadows, patrol patterns
- **Secrets:** 3 hidden crystals, 1 secret room
- **Difficulty:** ★★★☆☆

### Level 4: "The Chase" (Speed)
- **Theme:** Orange glow, collapsing platforms
- **Mechanics:** Timed platforms, dash chains, speed
- **Enemies:** 4 shadows, chase sequence
- **Secrets:** 2 hidden crystals
- **Difficulty:** ★★★★☆

### Level 5: "The Source" (Boss)
- **Theme:** White/gold glow, final challenge
- **Mechanics:** All combined, shadow boss
- **Enemies:** Shadow boss (requires 5 light pulses to defeat)
- **Secrets:** 5 hidden crystals, perfect run bonus
- **Difficulty:** ★★★★★

---

## 4. Visual Design

### Art Style
- **Minimalist neon**: Dark background (#0a0a1a), glowing player (#00ffff)
- **Color palette per level:**
  - Level 1: Cyan (#00ffff) on dark blue
  - Level 2: Green (#00ff88) on dark green
  - Level 3: Purple (#aa44ff) on dark purple
  - Level 4: Orange (#ff8800) on dark red
  - Level 5: Gold (#ffdd00) on pure black

### Visual Effects
- **Glow**: Radial gradient around player (Canvas shadowBlur)
- **Light trail**: Fading line segments with decreasing opacity
- **Particles**: On jump (dust), on dash (speed lines), on death (explosion)
- **Screen shake**: On death, on dash
- **Parallax background**: 3 layers of distant stars/dots

### Animations
- **Player idle**: Gentle breathing (scale pulse)
- **Player walk**: 4-frame sprite (procedural, not image-based)
- **Player jump**: Stretch and squash
- **Player dash**: Elongate in dash direction
- **Enemy idle**: Pulsing shadow blob
- **Enemy chase**: Elongate toward player
- **Death**: Particle burst + screen flash
- **Level complete**: Light explosion + "Level Clear" text with score

---

## 5. Audio Design

### Music
- **Ambient synth**: Lo-fi, atmospheric, loopable
- **Per level**: Slightly different melody, same tempo (120 BPM)
- **Boss level**: More intense, faster tempo

### Sound Effects (Web Audio API — no external files)
- Jump: sine wave sweep up
- Dash: white noise burst
- Collect crystal: high-pitched chime
- Death: descending sawtooth
- Level complete: ascending arpeggio
- Enemy alert: low rumble
- Checkpoint: soft ping

---

## 6. UI/UX

### Screens
1. **Splash/Loading**: "LUMEN" logo with light animation (3s)
2. **Main Menu**: 
   - "Play" (continue from last level)
   - "Level Select" (unlock progressively)
   - "Settings" (sound on/off, controls)
   - "High Score" (best time per level)
3. **In-Game HUD**:
   - Top-left: Level name + number
   - Top-right: Crystals collected (★ 0/5)
   - Bottom: Light meter (glow radius)
   - Center: "Level Clear!" overlay on completion
4. **Pause Menu**: Resume, Restart, Main Menu
5. **Game Over**: "Try Again" (instant restart, no loading)
6. **Victory Screen**: Total time, crystals collected, "Play Again"

### Transitions
- Fade to black (0.3s) between screens
- Light wipe transition between levels
- No loading screens (everything is procedural/generated)

---

## 7. Technical Architecture

### Tech Stack
- **HTML5 Canvas** (rendering)
- **Vanilla JavaScript** (no framework — maximum performance)
- **Web Audio API** (sound effects — procedural, no files)
- **localStorage** (save progress, high scores)
- **requestAnimationFrame** (60 FPS game loop)

### File Structure
```
lumen-game/
├── index.html          (entry point)
├── css/
│   └── style.css       (UI styling)
├── js/
│   ├── game.js         (main game loop, state machine)
│   ├── player.js       (player entity, movement, physics)
│   ├── enemy.js        (shadow enemy AI)
│   ├── level.js        (level data, platform generation)
│   ├── light.js        (light system, trail, glow)
│   ├── particle.js     (particle effects)
│   ├── audio.js        (Web Audio API sounds)
│   ├── input.js        (keyboard + touch input)
│   ├── ui.js           (menus, HUD, transitions)
│   └── utils.js        (math, collision, helpers)
└── assets/
    └── (none — everything is procedural)
```

### Performance Targets
- **60 FPS** on desktop and mobile
- **< 100KB** total file size (no assets)
- **Instant load** — no external resources
- **Mobile-friendly** — touch controls, responsive canvas

### Play Store Readiness
- Wrap in **Capacitor** or **Cordova** for Android APK
- Add app icon, splash screen
- Add Google Play Games (leaderboards, achievements)
- Estimated effort: 1-2 days additional work
- Revenue model: Free with ads (AdMob) or $1.99 premium

---

## 8. Development Plan

### Phase 1: Core (Day 1)
- [ ] Game loop + canvas setup
- [ ] Player movement + physics (gravity, jump, dash)
- [ ] Basic collision detection (AABB)
- [ ] Light system (glow + trail)
- [ ] 1 test level with platforms

### Phase 2: Gameplay (Day 2)
- [ ] Shadow enemy AI (attraction to light)
- [ ] Crystal collectibles
- [ ] Checkpoints
- [ ] Level complete detection
- [ ] Death + restart

### Phase 3: Content (Day 3)
- [ ] Design all 5 levels
- [ ] Parallax background
- [ ] Particle effects
- [ ] Sound effects (Web Audio API)

### Phase 4: Polish (Day 4)
- [ ] Main menu + level select
- [ ] Pause menu
- [ ] Victory screen
- [ ] Mobile touch controls
- [ ] Screen shake + transitions
- [ ] High score (localStorage)

### Phase 5: Testing & Deploy (Day 5)
- [ ] Playtest all levels
- [ ] Balance difficulty
- [ ] Fix bugs
- [ ] Deploy to web
- [ ] Play Store prep (Capacitor wrap)

---

## 9. Success Metrics
- **Retention**: 40%+ day-1 retention (addictive core loop)
- **Completion**: 20%+ finish all 5 levels
- **Share rate**: 10%+ share after completing
- **Revenue**: $0.50-1.00 per user (ads) or $1.99 (premium)

---

*Ready to build? Say "build it" and I'll start Phase 1.*
