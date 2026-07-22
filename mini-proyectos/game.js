// Web Audio API State
let audioCtx = null;
let buzzerOsc = null;
let buzzerGain = null;
let isAudioInitialized = false;

// Game State Constants
const GAME_MODES = {
  EXAM: 'exam',
  TRAINING: 'training'
};

const DIFFICULTY_SETTINGS = {
  easy: { speed: 130, laneWidth: 80, curveFrequency: 0.8, curveAmplitude: 0.7 },
  medium: { speed: 190, laneWidth: 60, curveFrequency: 1.0, curveAmplitude: 1.0 },
  hard: { speed: 270, laneWidth: 46, curveFrequency: 1.25, curveAmplitude: 1.3 }
};

// Game Configuration & State
let gameConfig = {
  mode: GAME_MODES.EXAM,
  difficulty: 'medium',
  soundEnabled: true,
  duration: 60 // seconds for exam
};

let gameState = {
  isPlaying: false,
  isPaused: false,
  isCountingDown: false,
  scrollY: 0,
  elapsedTime: 0, // seconds
  startTime: null,
  countdownTime: 3,
  
  // Game metrics
  mistakes: 0,
  leftMistakes: 0,
  rightMistakes: 0,
  leftTimeOut: 0, // ms
  rightTimeOut: 0, // ms
  totalFrames: 0,
  offTrackFrames: 0,
  
  // Last frame timing
  lastTime: 0
};

// Player Cursors
const carSize = 16;
let playerLeft = {
  x: 150,
  vx: 0,
  isOut: false,
  color: 'hsl(190, 100%, 50%)',
  glowColor: 'hsla(190, 100%, 50%, 0.8)',
  trail: []
};

let playerRight = {
  x: 450,
  vx: 0,
  isOut: false,
  color: 'hsl(325, 100%, 55%)',
  glowColor: 'hsla(325, 100%, 55%, 0.8)',
  trail: []
};

// Keyboard inputs
const keys = {
  a: false,
  d: false,
  ArrowLeft: false,
  ArrowRight: false
};

// Spark Particles
let particles = [];

// DOM Elements
let canvas, ctx;
let menuScreen, gameScreen, resultsScreen;
let startBtn, restartBtn, menuBtn, exitGameBtn;
let modeSelector, difficultyGroup, difficultySelect, soundToggle;
let hudTime, hudMistakes, hudAccuracy;
let countdownOverlay, countdownText;
let resultStatus, resAccuracy, resMistakes, resTime, resLeftMistakes, resLeftTime, resRightMistakes, resRightTime, resultsFeedback;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initDOM();
  setupEventListeners();
  resizeCanvas();
  
  // Handle window resizing
  window.addEventListener('resize', resizeCanvas);
});

function initDOM() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  menuScreen = document.getElementById('menuScreen');
  gameScreen = document.getElementById('gameScreen');
  resultsScreen = document.getElementById('resultsScreen');
  
  startBtn = document.getElementById('startBtn');
  restartBtn = document.getElementById('restartBtn');
  menuBtn = document.getElementById('menuBtn');
  exitGameBtn = document.getElementById('exitGameBtn');
  
  modeSelector = document.getElementById('modeSelector');
  difficultyGroup = document.getElementById('difficultyGroup');
  difficultySelect = document.getElementById('difficulty');
  soundToggle = document.getElementById('soundToggle');
  
  hudTime = document.getElementById('hudTime');
  hudMistakes = document.getElementById('hudMistakes');
  hudAccuracy = document.getElementById('hudAccuracy');
  
  countdownOverlay = document.getElementById('countdownOverlay');
  countdownText = document.getElementById('countdownText');
  
  resultStatus = document.getElementById('resultStatus');
  resAccuracy = document.getElementById('resAccuracy');
  resMistakes = document.getElementById('resMistakes');
  resTime = document.getElementById('resTime');
  resLeftMistakes = document.getElementById('resLeftMistakes');
  resLeftTime = document.getElementById('resLeftTime');
  resRightMistakes = document.getElementById('resRightMistakes');
  resRightTime = document.getElementById('resRightTime');
  resultsFeedback = document.getElementById('resultsFeedback');
}

function setupEventListeners() {
  // Mode Selector Toggle
  modeSelector.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modeSelector.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const mode = btn.getAttribute('data-mode');
      gameConfig.mode = mode;
      
      if (mode === GAME_MODES.TRAINING) {
        difficultyGroup.style.display = 'block';
      } else {
        difficultyGroup.style.display = 'none';
      }
    });
  });
  
  // Difficulty Selection
  difficultySelect.addEventListener('change', (e) => {
    gameConfig.difficulty = e.target.value;
  });
  
  // Sound Selector Toggle
  soundToggle.addEventListener('change', (e) => {
    gameConfig.soundEnabled = e.target.checked;
    if (!gameConfig.soundEnabled && buzzerGain) {
      buzzerGain.gain.setValueAtTime(0, audioCtx.currentTime);
    }
  });
  
  // Game Control Buttons
  startBtn.addEventListener('click', startNewGame);
  restartBtn.addEventListener('click', startNewGame);
  menuBtn.addEventListener('click', showMenu);
  exitGameBtn.addEventListener('click', showMenu);
  
  // Key Listeners
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
}

function resizeCanvas() {
  if (!canvas) return;
  // Set fixed resolution internally, and let CSS handle resizing
  canvas.width = 600;
  canvas.height = 700;
}

// Initialize Web Audio API
function initAudio() {
  if (isAudioInitialized) return;
  
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Create gain node for volume control
    buzzerGain = audioCtx.createGain();
    buzzerGain.gain.setValueAtTime(0, audioCtx.currentTime);
    
    // Create low pitch buzzer oscillator (sawtooth/triangle works best for "buzzer" sound)
    buzzerOsc = audioCtx.createOscillator();
    buzzerOsc.type = 'sawtooth';
    buzzerOsc.frequency.setValueAtTime(140, audioCtx.currentTime); // Low buzz frequency
    
    // Filter to make it less harsh and more robotic
    const biquadFilter = audioCtx.createBiquadFilter();
    biquadFilter.type = 'lowpass';
    biquadFilter.frequency.setValueAtTime(800, audioCtx.currentTime);
    
    buzzerOsc.connect(biquadFilter);
    biquadFilter.connect(buzzerGain);
    buzzerGain.connect(audioCtx.destination);
    
    buzzerOsc.start();
    isAudioInitialized = true;
  } catch (error) {
    console.warn("Web Audio API not supported or blocked by browser policies.", error);
  }
}

function handleKeyDown(e) {
  const key = e.key.toLowerCase();
  
  // Left side keys
  if (key === 'a') keys.a = true;
  if (key === 'd') keys.d = true;
  
  // Right side keys
  if (e.key === 'ArrowLeft') keys.ArrowLeft = true;
  if (e.key === 'ArrowRight') keys.ArrowRight = true;
  
  // Prevent spacebar or arrows scrolling the page
  if ([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
}

function handleKeyUp(e) {
  const key = e.key.toLowerCase();
  
  if (key === 'a') keys.a = false;
  if (key === 'd') keys.d = false;
  
  if (e.key === 'ArrowLeft') keys.ArrowLeft = false;
  if (e.key === 'ArrowRight') keys.ArrowRight = false;
}

// Generate procedurally generated center offsets for Left (lane 0) and Right (lane 1) lanes
function getLaneOffset(y, scrollY, laneIndex, difficulty) {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const freqScale = settings.curveFrequency;
  const ampScale = settings.curveAmplitude;
  
  // Different seeds to ensure different shapes for left/right
  const seed = laneIndex === 0 ? 0.8 : 3.5;
  const t = (y + scrollY) * 0.0015 * freqScale;
  
  // Compound sine waves for organic curve shape
  let offset = Math.sin(t * 1.8 + seed) * 45 +
                 Math.sin(t * 3.6 + seed * 2) * 20 +
                 Math.cos(t * 0.9 - seed) * 12;
                 
  offset *= ampScale;
  
  // Restrict bounds so it does not bleed into other half
  // Lane X goes from 0-300 (left) and 300-600 (right).
  // With laneWidth up to 80, the offset should stay within [-80, 80] to remain safe.
  const limitX = 95 - (settings.laneWidth / 2);
  return Math.max(-limitX, Math.min(limitX, offset));
}

// Main Game Loop Functions
function startNewGame() {
  // Activate audio on first interaction
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  // Reset screen states
  menuScreen.classList.remove('active');
  resultsScreen.classList.remove('active');
  gameScreen.classList.add('active');
  
  // Reset Game States
  const currentDiff = gameConfig.mode === GAME_MODES.EXAM ? 'medium' : gameConfig.difficulty;
  
  gameState = {
    isPlaying: false,
    isPaused: false,
    isCountingDown: true,
    scrollY: 0,
    elapsedTime: 0,
    startTime: null,
    countdownTime: 3,
    mistakes: 0,
    leftMistakes: 0,
    rightMistakes: 0,
    leftTimeOut: 0,
    rightTimeOut: 0,
    totalFrames: 0,
    offTrackFrames: 0,
    lastTime: performance.now()
  };
  
  // Set players to default centered positions in their tracks
  const roadWidth = DIFFICULTY_SETTINGS[currentDiff].laneWidth;
  const initialScrollY = 0;
  const playerY = canvas.height - 120;
  
  playerLeft = {
    x: 150 + getLaneOffset(playerY, initialScrollY, 0, currentDiff),
    vx: 0,
    isOut: false,
    color: 'hsl(190, 100%, 50%)',
    glowColor: 'hsla(190, 100%, 50%, 0.8)',
    trail: []
  };
  
  playerRight = {
    x: 450 + getLaneOffset(playerY, initialScrollY, 1, currentDiff),
    vx: 0,
    isOut: false,
    color: 'hsl(325, 100%, 55%)',
    glowColor: 'hsla(325, 100%, 55%, 0.8)',
    trail: []
  };
  
  // Clear lists
  particles = [];
  keys.a = false;
  keys.d = false;
  keys.ArrowLeft = false;
  keys.ArrowRight = false;
  
  // Update HUD values initially
  updateHUD();
  
  // Start countdown overlay
  startCountdown();
  
  // Start drawing loops
  requestAnimationFrame(gameLoop);
}

function startCountdown() {
  countdownOverlay.classList.add('active');
  countdownText.innerText = gameState.countdownTime;
  
  const timer = setInterval(() => {
    gameState.countdownTime--;
    if (gameState.countdownTime > 0) {
      countdownText.innerText = gameState.countdownTime;
    } else if (gameState.countdownTime === 0) {
      countdownText.innerText = "¡YA!";
    } else {
      clearInterval(timer);
      countdownOverlay.classList.remove('active');
      gameState.isCountingDown = false;
      gameState.isPlaying = true;
      gameState.startTime = performance.now();
    }
  }, 1000);
}

function gameLoop(timestamp) {
  if (!gameScreen.classList.contains('active')) return;
  
  const dt = (timestamp - gameState.lastTime) / 1000; // in seconds
  gameState.lastTime = timestamp;
  
  // Clear and update the frame
  update(dt);
  render();
  
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  if (gameState.isCountingDown || !gameState.isPlaying || gameState.isPaused) {
    return;
  }
  
  // Get current difficulty configuration
  const currentDiff = gameConfig.mode === GAME_MODES.EXAM ? 'medium' : gameConfig.difficulty;
  const settings = DIFFICULTY_SETTINGS[currentDiff];
  
  // 1. Update Game Time
  if (gameConfig.mode === GAME_MODES.EXAM) {
    const elapsed = (performance.now() - gameState.startTime) / 1000;
    gameState.elapsedTime = Math.min(gameConfig.duration, elapsed);
    if (gameState.elapsedTime >= gameConfig.duration) {
      endGame();
      return;
    }
  } else {
    gameState.elapsedTime = (performance.now() - gameState.startTime) / 1000;
  }
  
  // 2. Scroll roads downwards
  gameState.scrollY += settings.speed * dt;
  
  // 3. Physics & Controls
  // Physics config
  const accel = 950 * dt;     // Acceleration rate
  const friction = Math.pow(0.005, dt); // Smooth frame-rate independent friction
  const maxSpeed = 380;       // Max velocity px/sec
  
  // Left Hand Player (A/D)
  if (keys.a) playerLeft.vx -= accel;
  if (keys.d) playerLeft.vx += accel;
  playerLeft.vx *= friction;
  playerLeft.vx = Math.max(-maxSpeed, Math.min(maxSpeed, playerLeft.vx));
  playerLeft.x += playerLeft.vx * dt;
  
  // Keep left player within bounds [carSize/2, 300 - carSize/2]
  playerLeft.x = Math.max(carSize / 2, Math.min(300 - carSize / 2, playerLeft.x));
  
  // Right Hand Player (Left/Right Arrows)
  if (keys.ArrowLeft) playerRight.vx -= accel;
  if (keys.ArrowRight) playerRight.vx += accel;
  playerRight.vx *= friction;
  playerRight.vx = Math.max(-maxSpeed, Math.min(maxSpeed, playerRight.vx));
  playerRight.x += playerRight.vx * dt;
  
  // Keep right player within bounds [300 + carSize/2, 600 - carSize/2]
  playerRight.x = Math.max(300 + carSize / 2, Math.min(600 - carSize / 2, playerRight.x));
  
  // Update trails for aesthetics
  updatePlayerTrail(playerLeft);
  updatePlayerTrail(playerRight);
  
  // 4. Collision / Out-of-bounds Check
  const playerY = canvas.height - 120;
  
  // Left Road Check
  const leftRoadCenter = 150 + getLaneOffset(playerY, gameState.scrollY, 0, currentDiff);
  const leftIsOutside = Math.abs(playerLeft.x - leftRoadCenter) > (settings.laneWidth - carSize) / 2;
  
  if (leftIsOutside) {
    if (!playerLeft.isOut) {
      gameState.mistakes++;
      gameState.leftMistakes++;
      playerLeft.isOut = true;
    }
    gameState.leftTimeOut += dt * 1000;
    spawnGlitchParticles(playerLeft.x, playerY, playerLeft.color);
  } else {
    playerLeft.isOut = false;
    spawnAmbientParticles(playerLeft.x, playerY, playerLeft.color);
  }
  
  // Right Road Check
  const rightRoadCenter = 450 + getLaneOffset(playerY, gameState.scrollY, 1, currentDiff);
  const rightIsOutside = Math.abs(playerRight.x - rightRoadCenter) > (settings.laneWidth - carSize) / 2;
  
  if (rightIsOutside) {
    if (!playerRight.isOut) {
      gameState.mistakes++;
      gameState.rightMistakes++;
      playerRight.isOut = true;
    }
    gameState.rightTimeOut += dt * 1000;
    spawnGlitchParticles(playerRight.x, playerY, playerRight.color);
  } else {
    playerRight.isOut = false;
    spawnAmbientParticles(playerRight.x, playerY, playerRight.color);
  }
  
  // Update overall frame accuracy counters
  gameState.totalFrames++;
  if (leftIsOutside || rightIsOutside) {
    gameState.offTrackFrames++;
  }
  
  // 5. Sound Control
  if (gameConfig.soundEnabled && isAudioInitialized && (leftIsOutside || rightIsOutside)) {
    // Ramp volume slightly to avoid clicking
    buzzerGain.gain.setTargetAtTime(0.18, audioCtx.currentTime, 0.03);
  } else if (buzzerGain) {
    buzzerGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.03);
  }
  
  // 6. Update Particle Systems
  updateParticles(dt);
  
  // 7. Update HUD UI
  updateHUD();
}

function updatePlayerTrail(player) {
  player.trail.push({ x: player.x, y: canvas.height - 120 });
  if (player.trail.length > 8) {
    player.trail.shift();
  }
}

// Particle spawning
function spawnAmbientParticles(x, y, color) {
  // Emit slow drifting spark particles when cursor is inside the track
  if (Math.random() < 0.25) {
    particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + 8,
      vx: (Math.random() - 0.5) * 20,
      vy: Math.random() * 40 + 20, // Drift upwards in relative scrolling frame
      alpha: 1.0,
      decay: Math.random() * 0.8 + 0.6,
      size: Math.random() * 2 + 1,
      color: color
    });
  }
}

function spawnGlitchParticles(x, y, color) {
  // Spawns burst of dramatic particles when cursor is out of track
  for (let i = 0; i < 2; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 12,
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 80,
      alpha: 1.0,
      decay: Math.random() * 1.5 + 1.2,
      size: Math.random() * 3 + 1.5,
      color: '#ff3b30' // Out of bounds red
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.alpha -= p.decay * dt;
    
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

// UI Updating
function updateHUD() {
  // 1. Update Timer
  if (gameConfig.mode === GAME_MODES.EXAM) {
    const remaining = Math.max(0, gameConfig.duration - gameState.elapsedTime);
    hudTime.innerText = remaining.toFixed(1) + 's';
  } else {
    hudTime.innerText = gameState.elapsedTime.toFixed(1) + 's';
  }
  
  // 2. Mistakes Count
  hudMistakes.innerText = gameState.mistakes;
  
  // 3. Accuracy %
  let accuracy = 100.0;
  if (gameState.totalFrames > 0) {
    accuracy = ((gameState.totalFrames - gameState.offTrackFrames) / gameState.totalFrames) * 100;
  }
  hudAccuracy.innerText = accuracy.toFixed(1) + '%';
  
  // Color code accuracy
  if (accuracy >= 95) {
    hudAccuracy.style.color = 'var(--neon-green)';
  } else if (accuracy >= 90) {
    hudAccuracy.style.color = '#e6c384';
  } else {
    hudAccuracy.style.color = 'var(--neon-red)';
  }
}

// Rendering Logic
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 1. Draw grid backdrop (gives a sense of forward motion)
  drawGrid();
  
  const currentDiff = gameConfig.mode === GAME_MODES.EXAM ? 'medium' : gameConfig.difficulty;
  
  // 2. Draw Left Lane & Right Lane
  drawLane(0, currentDiff);
  drawLane(1, currentDiff);
  
  // 3. Draw Player Trails
  drawPlayerTrail(playerLeft);
  drawPlayerTrail(playerRight);
  
  // 4. Draw Player Cars (Cursors)
  drawPlayer(playerLeft, canvas.height - 120);
  drawPlayer(playerRight, canvas.height - 120);
  
  // 5. Draw Particles
  drawParticles();
  
  // 6. Draw Glitch screen overlay flash if player is out of bounds
  if (playerLeft.isOut || playerRight.isOut) {
    drawGlitchOverlay();
  }
}

function drawGrid() {
  const gridSpacing = 40;
  const speedScale = 0.4; // Grid moves slower than roads (parallax effect)
  const currentDiff = gameConfig.mode === GAME_MODES.EXAM ? 'medium' : gameConfig.difficulty;
  const scrollOffset = (gameState.scrollY * speedScale) % gridSpacing;
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
  ctx.lineWidth = 1;
  
  // Vertical lines
  for (let x = 0; x < canvas.width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // Horizontal lines (scrolling)
  for (let y = scrollOffset; y < canvas.height; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  // Draw center boundary line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.moveTo(300, 0);
  ctx.lineTo(300, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLane(laneIndex, difficulty) {
  const width = DIFFICULTY_SETTINGS[difficulty].laneWidth;
  const baseCenterX = laneIndex === 0 ? 150 : 450;
  const glowColor = laneIndex === 0 ? 'rgba(0, 242, 254, 0.4)' : 'rgba(255, 0, 127, 0.4)';
  const baseColor = laneIndex === 0 ? 'rgba(0, 242, 254, 0.07)' : 'rgba(255, 0, 127, 0.07)';
  const borderStroke = laneIndex === 0 ? 'rgba(0, 242, 254, 0.9)' : 'rgba(255, 0, 127, 0.9)';
  
  const isOut = laneIndex === 0 ? playerLeft.isOut : playerRight.isOut;
  
  // Calculate points along the lane
  const points = [];
  const step = 8; // Step size for sampling curves
  
  for (let y = -20; y <= canvas.height + 20; y += step) {
    const center = baseCenterX + getLaneOffset(y, gameState.scrollY, laneIndex, difficulty);
    points.push({ y, center });
  }
  
  // 1. Draw Lane Background Fill
  ctx.fillStyle = isOut ? 'rgba(231, 76, 60, 0.06)' : baseColor;
  ctx.beginPath();
  
  // Draw left border going down
  ctx.moveTo(points[0].center - width / 2, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].center - width / 2, points[i].y);
  }
  
  // Draw right border going back up
  for (let i = points.length - 1; i >= 0; i--) {
    ctx.lineTo(points[i].center + width / 2, points[i].y);
  }
  
  ctx.closePath();
  ctx.fill();
  
  // 2. Draw Lane Borders (Glow effect & Line)
  ctx.lineWidth = 1.5;
  
  // Left border path
  ctx.beginPath();
  ctx.moveTo(points[0].center - width / 2, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].center - width / 2, points[i].y);
  }
  
  ctx.strokeStyle = isOut ? 'rgba(231, 76, 60, 0.9)' : borderStroke;
  // Visual neon glow (thick blurred line below thin sharp line)
  ctx.shadowColor = isOut ? 'rgba(231, 76, 60, 0.8)' : glowColor;
  ctx.shadowBlur = 10;
  ctx.stroke();
  
  // Right border path
  ctx.beginPath();
  ctx.moveTo(points[0].center + width / 2, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].center + width / 2, points[i].y);
  }
  
  ctx.stroke();
  
  // Reset shadow effects to not degrade text/player rendering performance
  ctx.shadowBlur = 0;
}

function drawPlayerTrail(player) {
  if (player.trail.length < 2) return;
  
  ctx.beginPath();
  ctx.moveTo(player.trail[0].x, player.trail[0].y);
  
  for (let i = 1; i < player.trail.length; i++) {
    ctx.lineTo(player.trail[i].x, player.trail[i].y);
  }
  
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.25;
  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

function drawPlayer(player, y) {
  ctx.save();
  ctx.translate(player.x, y);
  
  const pulseScale = 1.0 + Math.sin(performance.now() * 0.01) * 0.08;
  const size = carSize * pulseScale;
  
  // Outer Neon Glow Ring
  ctx.shadowColor = player.isOut ? 'rgba(231, 76, 60, 0.9)' : player.glowColor;
  ctx.shadowBlur = 16;
  
  ctx.strokeStyle = player.isOut ? 'hsl(355, 85%, 55%)' : player.color;
  ctx.lineWidth = 2.5;
  
  // Draw glowing diamond shape (looks more futuristic/premium)
  ctx.beginPath();
  ctx.moveTo(0, -size / 2);
  ctx.lineTo(size / 2, 0);
  ctx.lineTo(0, size / 2);
  ctx.lineTo(-size / 2, 0);
  ctx.closePath();
  ctx.stroke();
  
  ctx.shadowBlur = 0;
  
  // Solid Core Inner Shape
  ctx.fillStyle = player.isOut ? '#ff3b30' : '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -size / 4);
  ctx.lineTo(size / 4, 0);
  ctx.lineTo(0, size / 4);
  ctx.lineTo(-size / 4, 0);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

function drawParticles() {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawGlitchOverlay() {
  // Screen flash when off track
  ctx.fillStyle = 'rgba(231, 76, 60, 0.02)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw subtle digital glitch bars
  if (Math.random() < 0.15) {
    ctx.fillStyle = 'rgba(231, 76, 60, 0.15)';
    const barY = Math.random() * canvas.height;
    const barH = Math.random() * 20 + 5;
    ctx.fillRect(0, barY, canvas.width, barH);
  }
}

// Post-Game Flow
function endGame() {
  gameState.isPlaying = false;
  
  // Stop buzzer sound
  if (buzzerGain) {
    buzzerGain.gain.setValueAtTime(0, audioCtx.currentTime);
  }
  
  // Calculate stats
  let totalAccuracy = 100.0;
  if (gameState.totalFrames > 0) {
    totalAccuracy = ((gameState.totalFrames - gameState.offTrackFrames) / gameState.totalFrames) * 100;
  }
  
  // Determine APTO vs NO APTO
  // Criteria: Official test APTO if accuracy >= 95% (meaning time out-of-lane < 5% of total time)
  const isApto = totalAccuracy >= 95.0;
  
  // Show Results Screen
  gameScreen.classList.remove('active');
  resultsScreen.classList.add('active');
  
  // Update Results UI
  resultStatus.innerText = isApto ? "APTO" : "NO APTO";
  resultStatus.className = isApto ? "result-badge apto" : "result-badge no-apto";
  
  resAccuracy.innerText = totalAccuracy.toFixed(1) + "%";
  resMistakes.innerText = gameState.mistakes;
  resTime.innerText = gameState.elapsedTime.toFixed(0) + "s";
  
  resLeftMistakes.innerText = gameState.leftMistakes;
  resLeftTime.innerText = (gameState.leftTimeOut / 1000).toFixed(2) + "s";
  
  resRightMistakes.innerText = gameState.rightMistakes;
  resRightTime.innerText = (gameState.rightTimeOut / 1000).toFixed(2) + "s";
  
  // Feedback message
  if (gameConfig.mode === GAME_MODES.EXAM) {
    if (isApto) {
      resultsFeedback.innerText = "¡Excelente! Has superado el examen psicotécnico con una precisión impecable. Estás listo para el centro de reconocimiento.";
      resultsFeedback.style.color = 'var(--neon-green)';
    } else {
      resultsFeedback.innerText = "No has superado el límite mínimo del 95% de precisión. Recomenda practicar con el modo Entrenamiento para mejorar tu coordinación bimanual.";
      resultsFeedback.style.color = '#e6c384';
    }
  } else {
    // Training mode feedback
    resultsFeedback.innerText = `Práctica finalizada en dificultad ${gameConfig.difficulty.toUpperCase()}. ¡Sigue entrenando para perfeccionar tus reflejos!`;
    resultsFeedback.style.color = 'var(--color-text-main)';
  }
}

function showMenu() {
  // Stop gameplay elements
  gameState.isPlaying = false;
  
  // Stop buzzer sound
  if (buzzerGain) {
    buzzerGain.gain.setValueAtTime(0, audioCtx.currentTime);
  }
  
  // Swap screens
  gameScreen.classList.remove('active');
  resultsScreen.classList.remove('active');
  menuScreen.classList.add('active');
}
