/**
 * Urban Hoops - Game Engine
 * Features: Physics, Slingshot Launcher, Collision Detection, Scoring
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const livesEl = document.querySelectorAll('.dot');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const menuOverlay = document.getElementById('menu-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreEl = document.getElementById('final-score');
const highScoreEl = document.getElementById('high-score');
const feedbackEl = document.getElementById('feedback-text');

// Constants
const GRAVITY = 0.25;
const FRICTION = 0.98;
const BOUNCE = 0.7;
const RIM_BOUNCE = 0.5;

// Game State
let gameState = {
    score: 0,
    highScore: localStorage.getItem('urbanHoops_highScore') || 0,
    lives: 3,
    timeLeft: 60,
    distanceLevel: 0,
    isPlaying: false,
    timerInterval: null
};

// Physics Objects
let ball = {
    x: 0,
    y: 0,
    radius: 30,
    vx: 0,
    vy: 0,
    isFlying: false,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragEnd: { x: 0, y: 0 },
    touchedBoard: false,
    color: '#FF5E00'
};

let hoop = {
    boardWidth: 120,
    boardHeight: 80,
    rimWidth: 80,
    rimHeight: 10,
    x: 0, // Will be set in resize
    y: 0,
    depth: 40 // distance between board and rim front
};

// Audio context (lazy init)
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'bounce') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'swish') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'buzzer') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
        osc.start(now);
        osc.stop(now + 1);
    }
}

// Setup Responsiveness
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Position hoop relative to screen
    hoop.x = canvas.width * 0.8;
    hoop.y = canvas.height * 0.3;

    resetBall();
}

function resetBall() {
    ball.isFlying = false;
    ball.isDragging = false;
    ball.vx = 0;
    ball.vy = 0;
    ball.touchedBoard = false;

    // Difficulty progression shifts the ball horizontally
    const offset = gameState.distanceLevel * 40;
    ball.x = canvas.width * 0.2 - offset;
    ball.y = canvas.height * 0.7;
}

// Input Handlers
function handleStart(e) {
    if (!gameState.isPlaying || ball.isFlying) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dist = Math.hypot(clientX - ball.x, clientY - ball.y);
    if (dist < ball.radius * 2) {
        ball.isDragging = true;
        ball.dragStart = { x: clientX, y: clientY };
        ball.dragEnd = { x: clientX, y: clientY };
    }
}

function handleMove(e) {
    if (!ball.isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ball.dragEnd = { x: clientX, y: clientY };
}

function handleEnd() {
    if (!ball.isDragging) return;

    const dx = ball.dragStart.x - ball.dragEnd.x;
    const dy = ball.dragStart.y - ball.dragEnd.y;

    // Launch speed capping
    const maxSpeed = 25;
    ball.vx = Math.min(Math.max(dx * 0.15, -maxSpeed), maxSpeed);
    ball.vy = Math.min(Math.max(dy * 0.15, -maxSpeed), maxSpeed);

    if (Math.abs(ball.vx) > 1 || Math.abs(ball.vy) > 1) {
        ball.isFlying = true;
    }

    ball.isDragging = false;
}

// Game Logic
function startGame() {
    initAudio();
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.lives = 3;
    gameState.timeLeft = 60;
    gameState.distanceLevel = 0;
    updateUI();

    menuOverlay.classList.remove('active');
    gameOverOverlay.classList.remove('active');

    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--;
        if (gameState.timeLeft <= 0) endGame();
        updateUI();
    }, 1000);

    resetBall();
    requestAnimationFrame(update);
}

function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timerInterval);
    playSound('buzzer');

    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('urbanHoops_highScore', gameState.highScore);
    }

    finalScoreEl.innerText = gameState.score;
    highScoreEl.innerText = gameState.highScore;
    gameOverOverlay.classList.add('active');
}

function updateUI() {
    scoreEl.innerText = gameState.score;
    timerEl.innerText = gameState.timeLeft;
    livesEl.forEach((dot, i) => {
        if (i < gameState.lives) dot.classList.add('active');
        else dot.classList.remove('active');
    });
}

function showFeedback(text, color) {
    feedbackEl.innerText = text;
    feedbackEl.style.color = color;
    feedbackEl.classList.add('show');
    setTimeout(() => feedbackEl.classList.remove('show'), 1000);
}

// Physics Loop
function update() {
    if (!gameState.isPlaying) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawHoop();
    drawBall();
    if (ball.isDragging) drawAimLine();

    if (ball.isFlying) {
        // Apply Physics
        ball.vy += GRAVITY;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall Bounce
        if (ball.y + ball.radius > canvas.height) {
            ball.y = canvas.height - ball.radius;
            ball.vy *= -BOUNCE;
            playSound('bounce');
        }
        if (ball.x + ball.radius > canvas.width) {
            ball.x = canvas.width - ball.radius;
            ball.vx *= -BOUNCE;
            playSound('bounce');
        }
        if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.vx *= -BOUNCE;
            playSound('bounce');
        }

        checkCollision();
    }

    requestAnimationFrame(update);
}

function checkCollision() {
    // 1. Backboard Collision
    const bx = hoop.x + 50; // Board back
    if (ball.x + ball.radius > bx && ball.x - ball.radius < bx + 10 &&
        ball.y > hoop.y - hoop.boardHeight / 2 && ball.y < hoop.y + hoop.boardHeight / 2) {
        ball.x = bx - ball.radius;
        ball.vx *= -BOUNCE;
        ball.touchedBoard = true;
        playSound('bounce');
    }

    // 2. Rim Collision (simplified to two points)
    const rimLeft = hoop.x - hoop.rimWidth + 50;
    const rimRight = hoop.x + 50;
    const rimY = hoop.y + 20;

    // Front rim point
    const dFront = Math.hypot(ball.x - rimLeft, ball.y - rimY);
    if (dFront < ball.radius) {
        let angle = Math.atan2(ball.y - rimY, ball.x - rimLeft);
        ball.vx = Math.cos(angle) * 5;
        ball.vy = Math.sin(angle) * 5;
        playSound('bounce');
    }

    // Back rim point
    const dBack = Math.hypot(ball.x - rimRight, ball.y - rimY);
    if (dBack < ball.radius) {
        let angle = Math.atan2(ball.y - rimY, ball.x - rimRight);
        ball.vx = Math.cos(angle) * 5;
        ball.vy = Math.sin(angle) * 5;
        playSound('bounce');
    }

    // 3. Goal Detection (Net area)
    if (ball.y > rimY && ball.y < rimY + 20 && ball.x > rimLeft && ball.x < rimRight && ball.vy > 0) {
        scoreBasket();
    }

    // 4. Miss Detection (Off screen or stopped)
    if (ball.x > canvas.width || (ball.isFlying && Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1 && ball.y > canvas.height - 100)) {
        missBasket();
    }
}

function scoreBasket() {
    if (!ball.isFlying) return;

    const points = ball.touchedBoard ? 2 : 3;
    gameState.score += points;

    if (points === 3) {
        showFeedback('SWISH! +3', '#00E5FF');
        playSound('swish');
    } else {
        showFeedback('GOAL! +2', '#FFD600');
        playSound('swish');
    }

    // Progress difficulty
    if (gameState.score % 10 === 0) {
        gameState.distanceLevel++;
    }

    updateUI();
    resetBall();
}

function missBasket() {
    gameState.lives--;
    showFeedback('MISS...', '#FF1744');
    updateUI();

    if (gameState.lives <= 0) {
        endGame();
    } else {
        resetBall();
    }
}

// Drawing Functions
function drawBall() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = ball.color;
    ctx.fill();

    // Ball texture (lines)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
    ctx.restore();
}

function drawAimLine() {
    const dx = ball.dragStart.x - ball.dragEnd.x;
    const dy = ball.dragStart.y - ball.dragEnd.y;

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x + dx, ball.y + dy);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawHoop() {
    // Backboard
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.strokeRect(hoop.x + 50, hoop.y - hoop.boardHeight / 2, 10, hoop.boardHeight);
    ctx.fillRect(hoop.x + 50, hoop.y - hoop.boardHeight / 2, 10, hoop.boardHeight);

    // Rim
    ctx.strokeStyle = '#FF3D00';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(hoop.x - hoop.rimWidth + 50, hoop.y + 20);
    ctx.lineTo(hoop.x + 50, hoop.y + 20);
    ctx.stroke();

    // Net (V-shape)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 5; i++) {
        const xPos = hoop.x - hoop.rimWidth + 50 + (i * hoop.rimWidth / 5);
        ctx.beginPath();
        ctx.moveTo(xPos, hoop.y + 20);
        ctx.lineTo(hoop.x - hoop.rimWidth / 2 + 50, hoop.y + 60);
        ctx.stroke();
    }
}

// Event Listeners
window.addEventListener('resize', resize);
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', handleEnd);

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(e); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMove(e); });
window.addEventListener('touchend', handleEnd);

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initialize
resize();
updateUI();
