// Game constants and configuration
const GAME_CONFIG = {
    GRAVITY: 0.5,
    SPEED: 5,
    BIRD_SIZE: [51, 36],
    JUMP_FORCE: -11.5,
    PIPE_WIDTH: 78,
    PIPE_GAP: 270,
    DIFFICULTY_INCREASE_INTERVAL: 1000, // Increase difficulty every 1000ms
    POWERUP_SPAWN_CHANCE: 0.1, // 10% chance of powerup spawning
};

class Bird {
    constructor(canvas, sprite) {
    this.canvas = canvas;
    this.sprite = sprite;
    this.width = GAME_CONFIG.BIRD_SIZE[0];
    this.height = GAME_CONFIG.BIRD_SIZE[1];
    this.x = (canvas.width / 10);
    this.reset();
    }

    reset() {
    this.flight = GAME_CONFIG.JUMP_FORCE;
    this.flyHeight = (this.canvas.height / 2) - (this.height / 2);
    this.isInvincible = false;
    this.hasShield = false;
    }

    update() {
    this.flight += GAME_CONFIG.GRAVITY;
    this.flyHeight = Math.min(
        this.flyHeight + this.flight,
        this.canvas.height - this.height
    );
    }

    jump() {
    this.flight = GAME_CONFIG.JUMP_FORCE;
    }

    draw(ctx, index) {
    const spriteY = Math.floor((index % 9) / 3) * this.height;
    ctx.drawImage(
        this.sprite,
        432,
        spriteY,
        this.width,
        this.height,
        this.x,
        this.flyHeight,
        this.width,
        this.height
    );

    // Draw shield effect if active
    if (this.hasShield) {
        ctx.beginPath();
        ctx.arc(
        this.x + this.width / 2,
        this.flyHeight + this.height / 2,
        Math.max(this.width, this.height),
        0,
        Math.PI * 2
        );
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    }
}

class Powerup {
    constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 30;
    this.type = Math.random() < 0.5 ? 'shield' : 'slowTime';
    }

    draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = this.type === 'shield' ? '#00ffff' : '#ffff00';
    ctx.fill();
    }
}

class Game {
    constructor() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.spriteSheet = new Image();
    this.spriteSheet.src = "./Image/flappy-bird-set.png";

    this.bird = new Bird(this.canvas, this.spriteSheet);
    this.pipes = [];
    this.powerups = [];
    this.index = 0;
    this.currentScore = 0;
    this.bestScore = localStorage.getItem('bestScore') || 0;
    this.gameSpeed = GAME_CONFIG.SPEED;
    this.isPlaying = false;
    this.difficultyTimer = 0;

    this.setupEventListeners();
    this.reset();
    }

    setupEventListeners() {
    document.addEventListener('click', () => {
        if (!this.isPlaying) {
        this.start();
        }
        this.bird.jump();
    });

    // Add keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
        if (!this.isPlaying) {
            this.start();
        }
        this.bird.jump();
        }
        if (e.code === 'KeyP') {
        this.togglePause();
        }
    });
    }

    togglePause() {
    if (this.isPlaying) {
        this.isPlaying = false;
        this.showMessage('PAUSED', 'Press P to continue');
    } else {
        this.isPlaying = true;
        this.render();
    }
    }

    showMessage(title, subtitle) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 28px "Press Start 2P"';
    this.ctx.fillText(title, this.canvas.width / 2 - 140, this.canvas.height / 2);
    
    this.ctx.font = '19px "Press Start 2P"';
    this.ctx.fillText(subtitle, this.canvas.width / 2 - 190, this.canvas.height / 2 + 50);
    }

    reset() {
    this.bird.reset();
    this.pipes = Array(3).fill().map((_, i) => ({
        x: this.canvas.width + (i * (GAME_CONFIG.PIPE_GAP + GAME_CONFIG.PIPE_WIDTH)),
        height: this.getRandomPipeHeight(),
    }));
    this.powerups = [];
    this.currentScore = 0;
    this.gameSpeed = GAME_CONFIG.SPEED;
    this.difficultyTimer = 0;
    }

    start() {
    this.isPlaying = true;
    this.reset();
    this.render();
    }

    getRandomPipeHeight() {
    return (Math.random() * (
        (this.canvas.height - (GAME_CONFIG.PIPE_GAP + GAME_CONFIG.PIPE_WIDTH)) - GAME_CONFIG.PIPE_WIDTH
    )) + GAME_CONFIG.PIPE_WIDTH;
    }

    spawnPowerup(x, y) {
    if (Math.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE) {
        this.powerups.push(new Powerup(x, y + GAME_CONFIG.PIPE_GAP / 2));
    }
    }

    checkCollisions() {
    // Check pipe collisions
    return this.pipes.some(pipe => {
        const birdBox = {
        left: this.bird.x,
        right: this.bird.x + this.bird.width,
        top: this.bird.flyHeight,
        bottom: this.bird.flyHeight + this.bird.height
        };

        const pipeBox = {
        left: pipe.x,
        right: pipe.x + GAME_CONFIG.PIPE_WIDTH,
        topBottom: pipe.height,
        bottomTop: pipe.height + GAME_CONFIG.PIPE_GAP
        };

        if (this.bird.hasShield) {
        return false;
        }

        return (
        birdBox.right > pipeBox.left &&
        birdBox.left < pipeBox.right &&
        (birdBox.top < pipeBox.topBottom || birdBox.bottom > pipeBox.bottomTop)
        );
    });
    }

    checkPowerupCollisions() {
    this.powerups = this.powerups.filter(powerup => {
        const collision = (
        this.bird.x < powerup.x + powerup.width &&
        this.bird.x + this.bird.width > powerup.x &&
        this.bird.flyHeight < powerup.y + powerup.height &&
        this.bird.flyHeight + this.bird.height > powerup.y
        );

        if (collision) {
        this.activatePowerup(powerup.type);
        return false;
        }
        return true;
    });
    }

    activatePowerup(type) {
    switch (type) {
        case 'shield':
        this.bird.hasShield = true;
        setTimeout(() => this.bird.hasShield = false, 5000);
        break;
        case 'slowTime':
        const originalSpeed = this.gameSpeed;
        this.gameSpeed = this.gameSpeed / 2;
        setTimeout(() => this.gameSpeed = originalSpeed, 3000);
        break;
    }
    }

    updateGameState() {
    this.difficultyTimer++;
    if (this.difficultyTimer % GAME_CONFIG.DIFFICULTY_INCREASE_INTERVAL === 0) {
        this.gameSpeed += 0.1;
    }

    // Update bird
    this.bird.update();

    // Update pipes
    this.pipes.forEach((pipe, i) => {
        pipe.x -= this.gameSpeed;

        // Score and create new pipe
        if (pipe.x <= -GAME_CONFIG.PIPE_WIDTH) {
        this.currentScore++;
        if (this.currentScore > this.bestScore) {
            this.bestScore = this.currentScore;
            localStorage.setItem('bestScore', this.bestScore);
        }

        this.pipes = [
            ...this.pipes.slice(1),
            {
            x: this.pipes[this.pipes.length - 1].x + GAME_CONFIG.PIPE_GAP + GAME_CONFIG.PIPE_WIDTH,
            height: this.getRandomPipeHeight()
            }
        ];

        this.spawnPowerup(pipe.x, pipe.height);
        }
    });

    // Update powerups
    this.powerups = this.powerups.filter(powerup => {
        powerup.x -= this.gameSpeed;
        return powerup.x > -powerup.width;
    });
    }

    render = () => {
    this.index++;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    const bgOffset = (this.index * (this.gameSpeed / 2)) % this.canvas.width;
    this.ctx.drawImage(this.spriteSheet, 0, 0, this.canvas.width, this.canvas.height,
        -bgOffset + this.canvas.width, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.spriteSheet, 0, 0, this.canvas.width, this.canvas.height,
        -bgOffset, 0, this.canvas.width, this.canvas.height);

    if (this.isPlaying) {
        this.updateGameState();

        // Draw pipes
        this.pipes.forEach(pipe => {
        this.ctx.drawImage(this.spriteSheet, 432, 588 - pipe.height,
            GAME_CONFIG.PIPE_WIDTH, pipe.height, pipe.x, 0,
            GAME_CONFIG.PIPE_WIDTH, pipe.height);
        this.ctx.drawImage(this.spriteSheet, 432 + GAME_CONFIG.PIPE_WIDTH, 108,
            GAME_CONFIG.PIPE_WIDTH, this.canvas.height - pipe.height + GAME_CONFIG.PIPE_GAP,
            pipe.x, pipe.height + GAME_CONFIG.PIPE_GAP,
            GAME_CONFIG.PIPE_WIDTH, this.canvas.height - pipe.height + GAME_CONFIG.PIPE_GAP);
        });

        // Draw powerups
        this.powerups.forEach(powerup => powerup.draw(this.ctx));

        // Check collisions
        if (this.checkCollisions()) {
        this.isPlaying = false;
        this.showMessage('GAME OVER', 'Click to play again');
        }

        this.checkPowerupCollisions();
    }

    // Draw bird
    this.bird.draw(this.ctx, this.index);

    // Update score displays
    document.getElementById('bestScore').innerHTML = `Best: ${this.bestScore}`;
    document.getElementById('currentScore').innerHTML = `Current: ${this.currentScore}`;

    if (this.isPlaying) {
        window.requestAnimationFrame(this.render);
    }
    }
}

// Initialize game when sprite sheet is loaded
const game = new Game();