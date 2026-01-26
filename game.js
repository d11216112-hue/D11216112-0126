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
let grassTexture = null; // Cache for grass texture

// Word list for the game
const WORD_LIST = ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'MELON', 'PEACH', 'LEMON', 'CHERRY'];

// Generate grass texture once and cache it
function generateGrassTexture() {
    if (grassTexture) return grassTexture;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_WIDTH;
    tempCanvas.height = CANVAS_HEIGHT;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Base grass color
    tempCtx.fillStyle = '#7CB342';
    tempCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Add grass texture variation
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * CANVAS_WIDTH;
        const y = Math.random() * CANVAS_HEIGHT;
        tempCtx.fillStyle = Math.random() > 0.5 ? '#8BC34A' : '#689F38';
        tempCtx.fillRect(x, y, 2, 2);
    }
    
    grassTexture = tempCanvas;
    return grassTexture;
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Generate grass texture
    generateGrassTexture();
    
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
        const px = this.x * GRID_SIZE;
        const py = this.y * GRID_SIZE;
        
        // Draw pixel art player character (green outfit)
        // Head outline
        ctx.fillStyle = '#000';
        ctx.fillRect(px + 12, py + 4, 16, 16);
        // Face
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(px + 14, py + 6, 12, 12);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(px + 16, py + 10, 3, 3);
        ctx.fillRect(px + 23, py + 10, 3, 3);
        // Hair/hood
        ctx.fillStyle = '#fff';
        ctx.fillRect(px + 10, py + 2, 20, 6);
        ctx.fillRect(px + 8, py + 6, 24, 4);
        // Body (green)
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(px + 10, py + 20, 20, 12);
        // Arms
        ctx.fillRect(px + 6, py + 22, 4, 8);
        ctx.fillRect(px + 30, py + 22, 4, 8);
        // Legs
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(px + 14, py + 32, 6, 6);
        ctx.fillRect(px + 22, py + 32, 6, 6);
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
        const px = this.x * GRID_SIZE;
        const py = this.y * GRID_SIZE;
        
        // Draw pixel art monster/creature
        // Body
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(px + 8, py + 16, 24, 20);
        // Head
        ctx.fillRect(px + 10, py + 8, 20, 12);
        // Ears
        ctx.fillRect(px + 8, py + 6, 6, 8);
        ctx.fillRect(px + 26, py + 6, 6, 8);
        // Eyes (angry)
        ctx.fillStyle = '#fff';
        ctx.fillRect(px + 12, py + 10, 6, 4);
        ctx.fillRect(px + 22, py + 10, 6, 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(px + 14, py + 11, 3, 3);
        ctx.fillRect(px + 24, py + 11, 3, 3);
        // Mouth
        ctx.fillStyle = '#000';
        ctx.fillRect(px + 16, py + 16, 8, 2);
        // Teeth
        ctx.fillStyle = '#fff';
        ctx.fillRect(px + 16, py + 18, 2, 3);
        ctx.fillRect(px + 20, py + 18, 2, 3);
        ctx.fillRect(px + 24, py + 18, 2, 3);
        // Arms
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(px + 4, py + 20, 4, 10);
        ctx.fillRect(px + 32, py + 20, 4, 10);
        // Legs
        ctx.fillRect(px + 12, py + 36, 6, 4);
        ctx.fillRect(px + 22, py + 36, 6, 4);
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
        
        // Only move if not obstacle and within bounds
        if (!isObstacle(newX, newY) && 
            newX >= 0 && newX < GRID_COLS && 
            newY >= 0 && newY < GRID_ROWS) {
            this.x = newX;
            this.y = newY;
        } else {
            // Try alternative move with boundary checking
            const altY = this.y + (dy > 0 ? 1 : -1);
            const altX = this.x + (dx > 0 ? 1 : -1);
            
            if (moveX !== 0 && altY >= 0 && altY < GRID_ROWS && !isObstacle(this.x, altY)) {
                this.y = altY;
            } else if (moveY !== 0 && altX >= 0 && altX < GRID_COLS && !isObstacle(altX, this.y)) {
                this.x = altX;
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
        
        const px = this.x * GRID_SIZE;
        const py = this.y * GRID_SIZE;
        
        // Draw pixel art letter on ground
        // Shadow/base
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(px + 4, py + 34, 32, 4);
        
        // Letter background (golden shoe/item style)
        ctx.fillStyle = '#D4A574';
        ctx.fillRect(px + 6, py + 18, 28, 16);
        ctx.fillStyle = '#F4C794';
        ctx.fillRect(px + 8, py + 20, 24, 12);
        
        // Letter itself with pixel art style
        ctx.fillStyle = '#000';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.char, px + GRID_SIZE / 2, py + 30);
        ctx.textAlign = 'left';
        
        // Shine effect
        ctx.fillStyle = '#fff';
        ctx.fillRect(px + 10, py + 22, 4, 2);
    }
}

// Obstacle class
class Obstacle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.size = GRID_SIZE - 4;
        this.type = type || Math.floor(Math.random() * 3); // 0: tree, 1: house, 2: rock
    }
    
    draw() {
        const px = this.x * GRID_SIZE;
        const py = this.y * GRID_SIZE;
        
        if (this.type === 0) {
            // Tree
            // Trunk
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(px + 16, py + 24, 8, 12);
            // Leaves (3D effect)
            ctx.fillStyle = '#228B22';
            ctx.fillRect(px + 8, py + 12, 24, 16);
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(px + 10, py + 8, 20, 12);
            ctx.fillRect(px + 12, py + 14, 16, 12);
            // Highlight
            ctx.fillStyle = '#90EE90';
            ctx.fillRect(px + 14, py + 10, 8, 6);
        } else if (this.type === 1) {
            // House
            // Base
            ctx.fillStyle = '#D2691E';
            ctx.fillRect(px + 8, py + 20, 24, 16);
            // Roof
            ctx.fillStyle = '#4682B4';
            ctx.fillRect(px + 6, py + 14, 28, 8);
            ctx.fillRect(px + 8, py + 10, 24, 6);
            // Window
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(px + 14, py + 24, 6, 6);
            ctx.fillRect(px + 22, py + 24, 6, 6);
            // Door
            ctx.fillStyle = '#654321';
            ctx.fillRect(px + 17, py + 30, 6, 6);
        } else {
            // Rock/Boulder
            ctx.fillStyle = '#696969';
            ctx.fillRect(px + 10, py + 20, 20, 14);
            ctx.fillRect(px + 12, py + 18, 16, 4);
            ctx.fillRect(px + 8, py + 22, 4, 8);
            ctx.fillRect(px + 28, py + 24, 4, 8);
            // Highlight
            ctx.fillStyle = '#A9A9A9';
            ctx.fillRect(px + 14, py + 22, 8, 6);
        }
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
    const maxAttempts = 100;
    
    do {
        pos = getRandomPosition();
        attempts++;
        if (attempts > maxAttempts) {
            // Scan grid for first free position as last resort
            for (let y = 0; y < GRID_ROWS; y++) {
                for (let x = 0; x < GRID_COLS; x++) {
                    if (!isPositionOccupied(x, y)) {
                        return { x, y };
                    }
                }
            }
            // If truly no space, return random (edge case)
            return getRandomPosition();
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
    
    // Draw background with cached grass texture
    ctx.drawImage(grassTexture, 0, 0);
    
    // Draw a vertical road in the middle
    const roadX = Math.floor(GRID_COLS / 2) * GRID_SIZE - GRID_SIZE;
    ctx.fillStyle = '#757575';
    ctx.fillRect(roadX, 0, GRID_SIZE * 2, CANVAS_HEIGHT);
    
    // Road lines
    ctx.fillStyle = '#fff';
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.fillRect(roadX + GRID_SIZE - 2, y, 4, 20);
    }
    
    // Draw grid - lighter for better visibility
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= GRID_COLS; x++) {
        ctx.moveTo(x * GRID_SIZE, 0);
        ctx.lineTo(x * GRID_SIZE, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
        ctx.moveTo(0, y * GRID_SIZE);
        ctx.lineTo(CANVAS_WIDTH, y * GRID_SIZE);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    
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
    
    // Collision check happens in game loop, no need to duplicate here
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
    // Draw background with cached grass texture
    ctx.drawImage(grassTexture, 0, 0);
    
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
