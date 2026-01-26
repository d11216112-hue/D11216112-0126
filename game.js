// Game Configuration
const GRID_SIZE = 40;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_COLS = Math.floor(CANVAS_WIDTH / GRID_SIZE);
const GRID_ROWS = Math.floor(CANVAS_HEIGHT / GRID_SIZE);
const GAME_DURATION = 60; // seconds

// Game State
let gameState = 'idle'; // idle, playing, win, lose
let canvas, ctx;
let player, npcs = [], letters = [], obstacles = [];
let targetWord = 'APPLE';
let collectedLetters = [];
let timeLeft = GAME_DURATION;
let score = 0;
let gameInterval, timerInterval;

// Word list for the game
const WORD_LIST = ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'MELON', 'PEACH', 'LEMON', 'CHERRY'];

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyPress);
    
    // Initial draw
    drawIdleScreen();
});

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = GRID_SIZE - 4;
        this.color = '#4285f4';
        this.speed = 1;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x * GRID_SIZE + 2, this.y * GRID_SIZE + 2, this.size, this.size);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('P', this.x * GRID_SIZE + 12, this.y * GRID_SIZE + 28);
    }
    
    move(dx, dy) {
        const newX = this.x + dx;
        const newY = this.y + dy;
        
        // Check boundaries
        if (newX < 0 || newX >= GRID_COLS || newY < 0 || newY >= GRID_ROWS) {
            return false;
        }
        
        // Check obstacles
        if (isObstacle(newX, newY)) {
            return false;
        }
        
        this.x = newX;
        this.y = newY;
        return true;
    }
}

// NPC class with chase AI
class NPC {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = GRID_SIZE - 4;
        this.color = '#ea4335';
        this.moveCounter = 0;
        this.moveDelay = 8; // Move every 8 frames (slower than player)
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x * GRID_SIZE + 2, this.y * GRID_SIZE + 2, this.size, this.size);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('👻', this.x * GRID_SIZE + 8, this.y * GRID_SIZE + 28);
    }
    
    chase() {
        this.moveCounter++;
        if (this.moveCounter < this.moveDelay) {
            return;
        }
        this.moveCounter = 0;
        
        // Simple pathfinding - move towards player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        
        let moveX = 0;
        let moveY = 0;
        
        // Prioritize the larger distance
        if (Math.abs(dx) > Math.abs(dy)) {
            moveX = dx > 0 ? 1 : -1;
        } else if (Math.abs(dy) > 0) {
            moveY = dy > 0 ? 1 : -1;
        }
        
        const newX = this.x + moveX;
        const newY = this.y + moveY;
        
        // Only move if not obstacle
        if (!isObstacle(newX, newY) && 
            newX >= 0 && newX < GRID_COLS && 
            newY >= 0 && newY < GRID_ROWS) {
            this.x = newX;
            this.y = newY;
        } else {
            // Try alternative move
            if (moveX !== 0 && !isObstacle(this.x, this.y + (dy > 0 ? 1 : -1))) {
                this.y += dy > 0 ? 1 : -1;
            } else if (moveY !== 0 && !isObstacle(this.x + (dx > 0 ? 1 : -1), this.y)) {
                this.x += dx > 0 ? 1 : -1;
            }
        }
    }
}

// Letter class
class Letter {
    constructor(x, y, char) {
        this.x = x;
        this.y = y;
        this.char = char;
        this.size = GRID_SIZE - 4;
        this.color = '#fbbc04';
        this.collected = false;
    }
    
    draw() {
        if (this.collected) return;
        
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x * GRID_SIZE + 2, this.y * GRID_SIZE + 2, this.size, this.size);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.char, this.x * GRID_SIZE + GRID_SIZE / 2, this.y * GRID_SIZE + 30);
        ctx.textAlign = 'left';
    }
}

// Obstacle class
class Obstacle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = GRID_SIZE - 4;
        this.color = '#5f6368';
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x * GRID_SIZE + 2, this.y * GRID_SIZE + 2, this.size, this.size);
    }
}

// Helper functions
function isObstacle(x, y) {
    return obstacles.some(obs => obs.x === x && obs.y === y);
}

function getRandomPosition() {
    return {
        x: Math.floor(Math.random() * GRID_COLS),
        y: Math.floor(Math.random() * GRID_ROWS)
    };
}

function isPositionOccupied(x, y) {
    if (player && player.x === x && player.y === y) return true;
    if (isObstacle(x, y)) return true;
    if (npcs.some(npc => npc.x === x && npc.y === y)) return true;
    if (letters.some(letter => !letter.collected && letter.x === x && letter.y === y)) return true;
    return false;
}

function getFreePosition() {
    let pos;
    let attempts = 0;
    do {
        pos = getRandomPosition();
        attempts++;
        if (attempts > 100) {
            // Fallback to ensure we don't infinite loop
            return { x: Math.floor(Math.random() * GRID_COLS), y: Math.floor(Math.random() * GRID_ROWS) };
        }
    } while (isPositionOccupied(pos.x, pos.y));
    return pos;
}

// Initialize game objects
function initGame() {
    // Reset state
    collectedLetters = [];
    timeLeft = GAME_DURATION;
    score = 0;
    gameState = 'playing';
    
    // Select random word
    targetWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    
    // Create player
    const playerPos = getFreePosition();
    player = new Player(playerPos.x, playerPos.y);
    
    // Create obstacles
    obstacles = [];
    const obstacleCount = 15;
    for (let i = 0; i < obstacleCount; i++) {
        const pos = getFreePosition();
        obstacles.push(new Obstacle(pos.x, pos.y));
    }
    
    // Create letters
    letters = [];
    for (let char of targetWord) {
        const pos = getFreePosition();
        letters.push(new Letter(pos.x, pos.y, char));
    }
    
    // Create NPCs
    npcs = [];
    const npcCount = 3;
    for (let i = 0; i < npcCount; i++) {
        const pos = getFreePosition();
        npcs.push(new NPC(pos.x, pos.y));
    }
    
    updateUI();
}

// Start game
function startGame() {
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('gameMessage').style.display = 'none';
    document.getElementById('gameMessage').className = 'game-message';
    
    initGame();
    
    // Start game loop
    gameInterval = setInterval(gameLoop, 1000 / 30); // 30 FPS
    
    // Start timer
    timerInterval = setInterval(() => {
        timeLeft--;
        updateUI();
        
        if (timeLeft <= 0) {
            endGame(false, 'Time is up!');
        }
    }, 1000);
}

// Restart game
function restartGame() {
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    startGame();
}

// Game loop
function gameLoop() {
    if (gameState !== 'playing') return;
    
    // Clear canvas
    ctx.fillStyle = '#e8f5e9';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw grid
    ctx.strokeStyle = '#c8e6c9';
    for (let x = 0; x <= GRID_COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * GRID_SIZE, 0);
        ctx.lineTo(x * GRID_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * GRID_SIZE);
        ctx.lineTo(CANVAS_WIDTH, y * GRID_SIZE);
        ctx.stroke();
    }
    
    // Draw obstacles
    obstacles.forEach(obs => obs.draw());
    
    // Draw letters
    letters.forEach(letter => letter.draw());
    
    // Draw NPCs and chase
    npcs.forEach(npc => {
        npc.chase();
        npc.draw();
    });
    
    // Draw player
    player.draw();
    
    // Check collisions
    checkCollisions();
}

// Handle keyboard input
function handleKeyPress(e) {
    if (gameState !== 'playing') return;
    
    let moved = false;
    
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            moved = player.move(0, -1);
            e.preventDefault();
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            moved = player.move(0, 1);
            e.preventDefault();
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            moved = player.move(-1, 0);
            e.preventDefault();
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            moved = player.move(1, 0);
            e.preventDefault();
            break;
    }
    
    if (moved) {
        checkCollisions();
    }
}

// Check collisions
function checkCollisions() {
    // Check NPC collision
    for (let npc of npcs) {
        if (player.x === npc.x && player.y === npc.y) {
            endGame(false, 'Caught by NPC!');
            return;
        }
    }
    
    // Check letter collision
    for (let letter of letters) {
        if (!letter.collected && player.x === letter.x && player.y === letter.y) {
            // Check if it's the correct next letter
            const nextIndex = collectedLetters.length;
            if (letter.char === targetWord[nextIndex]) {
                letter.collected = true;
                collectedLetters.push(letter.char);
                score += 100;
                updateUI();
                
                // Check if word is complete
                if (collectedLetters.length === targetWord.length) {
                    endGame(true, 'Congratulations! Word completed!');
                }
            } else {
                endGame(false, `Wrong letter! Expected ${targetWord[nextIndex]} but collected ${letter.char}`);
            }
            return;
        }
    }
}

// Update UI
function updateUI() {
    document.getElementById('targetWord').textContent = targetWord;
    document.getElementById('collectedLetters').textContent = collectedLetters.join('') || '-';
    document.getElementById('timeLeft').textContent = timeLeft;
    document.getElementById('score').textContent = score;
}

// End game
function endGame(won, message) {
    gameState = won ? 'win' : 'lose';
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    
    const messageDiv = document.getElementById('gameMessage');
    messageDiv.textContent = message;
    messageDiv.className = won ? 'game-message win' : 'game-message lose';
    messageDiv.style.display = 'block';
    
    document.getElementById('restartBtn').style.display = 'inline-block';
    
    if (won) {
        score += timeLeft * 10; // Bonus for remaining time
        updateUI();
    }
}

// Draw idle screen
function drawIdleScreen() {
    ctx.fillStyle = '#e8f5e9';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('English Word Learning Adventure', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
    
    ctx.font = '20px Arial';
    ctx.fillText('Click "Start Game" to begin!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    
    ctx.font = '16px Arial';
    ctx.fillText('Collect letters in order while avoiding NPCs', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    ctx.textAlign = 'left';
}
