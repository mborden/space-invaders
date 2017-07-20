/**
 * Initialize the Game and start it.
 */
var avgFramerate = 0;
var frameCount = 0;
var elapsedCounter = 0;
var lastFrame = Date.now();
var thisFrame;
var elapsed;
var game = new Game();

function init() {
	if(game.init())
		game.start();
}


/**
 * Define singleton object to hold our game images 
 */
var imageRepository = new function() {
	// Define images
	this.empty = null;
	this.background = new Image();
	this.spaceship = new Image();
	this.bullet = new Image();
	this.enemy = new Image();
	this.enemyBullet = new Image();
	this.boss = new Image();
	
	// Check that all images are loaded
	var numImages = 5;
	var numLoaded = 0;
	function imageLoaded() {
		numLoaded++;
		if (numLoaded === numImages) {
			window.init();
		}
	}
	this.background.onload = function() {
		imageLoaded();
	}
	this.spaceship.onload = function() {
		imageLoaded();
	}
	this.bullet.onload = function() {
		imageLoaded();
	}
	this.enemy.onload = function() {
		imageLoaded();
	}
	this.enemyBullet.onload = function() {
		imageLoaded();
	}

	// Get image
	this.background.src = "bg.png";
	this.spaceship.src = "ship.png";
	this.bullet.src = "bullet.png";
	this.enemy.src = "enemy.png";
	this.enemyBullet.src = "bullet_enemy.png";
	this.boss.src = "boss.png";
}

function QuadTree(boundBox, lvl) {
	var maxObjects = 10;
	this.bounds = boundBox || {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
	var objects = [];
	this.nodes = [];
	var level = lvl || 0;
	var maxLevels = 25;
	
	// Clear quadTree
	this.clear = function() {
		objects = [];
		
		for (var i = 0; i < this.nodes.length; i++) {
			this.nodes[i].clear();
		}
		
		this.nodes = [];
	};
	
	/*
	 * Get all objects in the quadTree
	 */	
	this.getAllObjects = function(returnedObjects) {
		for (var i = 0; i < this.nodes.length; i++) {
			this.nodes[i].getAllObjects(returnedObjects);
		}
		
		for (var i = 0, len = objects.length; i < len; i++) {
			returnedObjects.push(objects[i]);
		}
		
		return returnedObjects;		
	};
	

	this.findObjects = function(returnedObjects, obj) {
		if (typeof obj === "undefined") {
			console.log("UNDEFINED OBJECT");
			return;
		}
		
		var index = this.getIndex(obj);
		if (index != -1 && this.nodes.length) {
			this.nodes[index].findObjects(returnedObjects, obj);
		}
		
		for (var i = 0, len = objects.length; i < len; i++) {
			returnedObjects.push(objects[i]);
		}
		
		return returnedObjects;		
	};
		
	/*
	 * Insert object ino quadTree. 
	 */
	this.insert = function(obj) {
		if (typeof obj === "undefined") {
			return;
		}
		
		if (obj instanceof Array) {
			for (var i = 0, len = obj.length; i < len; i++) {
				this.insert(obj[i]);
			}
			
			return;
		}
		
		if (this.nodes.length) {
			var index = this.getIndex(obj);
			if (index != -1) {
				this.nodes[index].insert(obj);
				
				return;
			}
		}
		
		objects.push(obj);
		
		// Prevent infinite splitting
		if (objects.length > maxObjects && level < maxLevels) {
			this.split();
			
			var i = 0;
			while (i < objects.length) {
				
				var index = this.getIndex(objects[i]);
				if (index != -1) {
					this.nodes[index].insert((objects.splice(i,1))[0]);
				}
				else {
					i++;
				}
			}
		}
	};
	
	this.getIndex = function(obj) {
		
		var index = -1;
		var verticalMidpoint = this.bounds.x + this.bounds.width / 2;
		var horizontalMidpoint = this.bounds.y + this.bounds.height / 2;
		
		// Object fits in top quadrant
		var topQuadrant = (obj.y < horizontalMidpoint && obj.y + obj.height < horizontalMidpoint);
		// Object fits in bottom quandrant
		var bottomQuadrant = (obj.y > horizontalMidpoint);
	
		// Object fits in left quadrants
		if (obj.x < verticalMidpoint && 
				obj.x + obj.width < verticalMidpoint) {
			if (topQuadrant) {
				index = 1;
			}
			else if (bottomQuadrant) {
				index = 2;
			}
		}
		// Object fits in right quandrant
		else if (obj.x > verticalMidpoint) {
			if (topQuadrant) {
				index = 0;
			}
			else if (bottomQuadrant) {
				index = 3;
			}
		}
		
		return index;		
	};
	
	/* 
	 * Split our quadTree into 4 subnodes
	 */
	this.split = function() {	
		// Bitwise or [html5rocks]
		var subWidth = (this.bounds.width / 2) | 0;
		var subHeight = (this.bounds.height / 2) | 0;
		
		this.nodes[0] = new QuadTree({
			x: this.bounds.x + subWidth,
			y: this.bounds.y,
			width: subWidth,
			height: subHeight
		}, level+1);
		this.nodes[1] = new QuadTree({
			x: this.bounds.x,
			y: this.bounds.y,
			width: subWidth,
			height: subHeight
		}, level+1);
		this.nodes[2] = new QuadTree({
			x: this.bounds.x,
			y: this.bounds.y + subHeight,
			width: subWidth,
			height: subHeight
		}, level+1);
		this.nodes[3] = new QuadTree({
			x: this.bounds.x + subWidth,
			y: this.bounds.y + subHeight,
			width: subWidth,
			height: subHeight
		}, level+1);
	};
}
 

/**
 * Pool Object for bullet collection; managed to prevent
 * garbage collection. 
 */
function Pool(maxSize) {
	var size = maxSize; 
	var pool = []; //set empty array for bullets; infinite bullets 
	
	this.getPool = function() {
		var obj = [];
		for (var i = 0; i < size; i++) {
			if (pool[i].alive) {
				obj.push(pool[i]);
			}
		}
		return obj;
	}
	
	//populate pool array
	this.init = function(object) {
		if (object == "bullet") {
			for (var i = 0; i < size; i++) {
			
				var bullet = new Bullet("bullet");
				bullet.init(0,0, imageRepository.bullet.width,
										imageRepository.bullet.height);
				bullet.collidableWith = "enemy";
				bullet.type = "bullet";
				pool[i] = bullet;
			}
		}
		else if (object == "shockBullet") {
			for (var i = 0; i < size; i++) {
				// Initalize the object
				var bullet = new Bullet("shockBullet");
				bullet.init(0,0, imageRepository.shockBullet.width,
										imageRepository.shockBullet.height);
				bullet.collidableWith = "enemy";
				bullet.type = "bullet";
				pool[i] = bullet;
			}
		}
		else if (object == "enemy") {
			for (var i = 0; i < size; i++) {
				var enemy = new Enemy();
				enemy.init(0,0, imageRepository.enemy.width,
									 imageRepository.enemy.height);
				pool[i] = enemy;
			}
		}
		else if (object == "enemyBullet") {
			for (var i = 0; i < size; i++) {
				var bullet = new Bullet("enemyBullet");
				bullet.init(0,0, imageRepository.enemyBullet.width,
										imageRepository.enemyBullet.height);
				bullet.collidableWith = "ship";
				bullet.type = "enemyBullet";
				pool[i] = bullet;
			}
		}
	};
	
	/*
	 * Grabs the last bullet in list and pops it off the stack. --> back to front of array
	 */
	this.get = function(x, y, velocity, rotation) {
		if(!pool[size - 1].alive) {
			pool[size - 1].spawn(x, y, velocity, rotation);
			pool.unshift(pool.pop());
		}
	};
	
	/*
	 * Used for the ship to be able to get two bullets at once. If
	 * only the get() function is used twice, the ship is able to
	 * fire and only have 1 bullet spawn instead of 2.
	 */
	this.getTwo = function(x1, y1, velocity1, x2, y2, velocity2) {
		if(!pool[size - 1].alive && !pool[size - 2].alive) {
			this.get(x1, y1, velocity1);
			this.get(x2, y2, velocity2);
		}
	};
	
	/*
	 * Draws any in use Bullets. If a bullet goes off the screen,
	 * clears it and pushes it to the front of the array.
	 */
	this.animate = function() {
		for (var i = 0; i < size; i++) {
			// Only draw until we find a bullet that is not alive
			if (pool[i].alive) {
				if (pool[i].draw()) {
					pool[i].clear();
					pool.push((pool.splice(i,1))[0]);
				}
			}
			else
				break;
		}
	};
}


/**
 * Creates base class for all drawable objects 
 */
function Drawable() {
	this.init = function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
	
	this.velocity = {'x': 0, 'y': 0};
	this.canvasWidth = 0;
	this.canvasHeight = 0;
	this.collidableWith = "";
	this.isColliding = false;
	this.type = "";

	// Define abstract function on child
	this.draw = function() {
	};
	this.move = function() {
	};
	this.isCollidableWith = function(object) {
		return (this.collidableWith === object.type);
	};
}


/**
 * Creates the Background object and illusion of moving. Drawn on background canvas 
 */
function Background() {
	this.velocity = {'x': 0, 'y': 1}; // Panning speed 
	this.velocity2 = {'x': 0, 'y': .1}; //bg2 panning speed 
	this.y2 = 0;

	// Implement abstract function
	this.draw = function() {
		// Pan background
		this.y += this.velocity.y;
		this.y2 += this.velocity2.y;
	
		this.context.drawImage(imageRepository.background, this.x, this.y);

		this.context.drawImage(imageRepository.background, this.x, this.y - this.canvasHeight);

		// If the image scrolled off the screen, reset
		if (this.y >= this.canvasHeight)
			this.y = 0;
		
	};
}
// background inherits drawable
Background.prototype = new Drawable();


/**
 * Normal weapon
 */
function normalWeapon() {
	this.fireRate = 15;
	this.counter = 0;
	var range;

	this.fire = function() {
		game.bulletPool.get(game.ship.x + game.ship.width / 2, game.ship.y, {'x': 0, 'y': -3});
		game.laser.get();
		this.counter = 0;
	}
}
var normalWeapon = new normalWeapon();

/**
 * Clone weapon
 */
function cloneWeapon() {
	this.fireRate = 15;
	this.counter = 0;
	var range;

	this.fire = function() {
		game.bulletPool.get(game.ship.x + 6, game.ship.y, {'x': 0, 'y': -3});
		game.bulletPool.get(game.ship.x + 33, game.ship.y, {'x': 0, 'y': -3});
		game.laser.get();
		this.counter = 0;
	}
} 
var cloneWeapon = new cloneWeapon();

/**
 * Fork weapon
 */
function forkWeapon() {
	this.fireRate = 15;
	this.counter = 0;
	var range;

	this.fire = function() {
		game.bulletPool.get(game.ship.x + game.ship.width / 2, game.ship.y, {'x': 1, 'y': -3}, 15);
		game.bulletPool.get(game.ship.x + game.ship.width / 2, game.ship.y, {'x': -1, 'y': -3}, -15);
		game.laser.get();
		this.counter = 0;
	}
} 
var forkWeapon = new forkWeapon();

/**
 * Create the Bullet object 
 */
function Bullet(object) {	
	//true when in use
	this.alive = false; 
	var self = object;
	this.rotation = 0;
	this.hitBox = {'x': 0, 'y': 0, 'width': imageRepository.bullet.width, 'height': imageRepository.bullet.height};

	this.spawn = function(x, y, velocity, rotation) {
		this.x = x;
		this.y = y;
		this.velocity = velocity;
		this.alive = true;
		this.rotation = rotation;
	};

	/*
	 * If bullet moves off screen, pool is cleared by pool by using "dirty rectangle"
	 */
	this.draw = function() {
		this.context.save();
		this.context.translate(this.x + this.width / 2, this.y + this.height / 2);
		this.context.rotate(this.rotation * Math.PI / 180);
		this.context.clearRect(-this.width / 2 - 1, -this.height / 2 - 1, this.width+2, this.height+2);
		this.context.restore();

		this.y += this.velocity.y
		this.x += this.velocity.x
		
		if (this.isColliding) {
			return true;
		}
		else if (self === "bullet" && this.y <= 0 - this.height) {
			return true;
		}
		else if (self === "enemyBullet" && this.y >= this.canvasHeight) {
			return true;
		}
		else {
			this.context.save();
			this.context.translate(this.x + this.width / 2, this.y + this.height / 2);
			this.context.rotate(this.rotation * Math.PI / 180);

			if (self === "bullet") {
				this.context.drawImage(imageRepository.bullet, -this.width / 2, -this.height / 2);
			}
			else if (self === "shockBullet") {
				this.context.drawImage(imageRepository.shockBullet, -this.width / 2, -this.height / 2);
			}
			else if (self === "enemyBullet") {
				this.context.drawImage(imageRepository.enemyBullet, -this.width / 2, -this.height / 2);
			}
			
			this.context.restore();	
			return false;
		}
	};
	
	/*
	 * Reset 
	 */
	this.clear = function() {
		this.x = 0;
		this.y = 0;
		this.velocity = {'x': 0, 'y': 0};;
		this.alive = false;
		this.isColliding = false;
	};
}
Bullet.prototype = new Drawable();


/**
 * Create the Ship object using "dirty rectangles" on the canvas 
 */
function Ship() {
	this.velocity = {'x': 3, 'y': 3};
	this.collidableWith = "enemyBullet";
	this.type = "ship";
	this.weapon = {};
	this.hitBox = {'x': 4, 'y': 7, 'width': 32, 'height': 18};
	
	this.init = function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.alive = true;
		this.isColliding = false;
		this.weapon = normalWeapon;
	}
	
	this.draw = function() {
		this.context.drawImage(imageRepository.spaceship, this.x, this.y);
	};
	this.move = function() {	
		this.weapon.counter++;
		// Determine if the action is move action
		if (KEY_STATUS.left || KEY_STATUS.right ||
				KEY_STATUS.down || KEY_STATUS.up) {
			// The ship moved, so erase it's current image so it can
			// be redrawn in it's new location
			this.context.clearRect(this.x, this.y, this.width, this.height);
			
			// Update x and y according to the direction of move 
			if (KEY_STATUS.left) {
				this.x -= this.velocity.x;
				if (this.x <= 0) // Kep player within the screen
					this.x = 0;
			} else if (KEY_STATUS.right) {
				this.x += this.velocity.x;
				if (this.x >= this.canvasWidth - this.width)
					this.x = this.canvasWidth - this.width;
			} else if (KEY_STATUS.up) {
				this.y -= this.velocity.y;
				if (this.y <= this.canvasHeight/4*3)
					this.y = this.canvasHeight/4*3;
			} else if (KEY_STATUS.down) {
				this.y += this.velocity.y;
				if (this.y >= this.canvasHeight - this.height)
					this.y = this.canvasHeight - this.height;
			}
		}
		
		if (KEY_STATUS.one) {
			this.weapon = normalWeapon;
		} else if (KEY_STATUS.two) {
			this.weapon = cloneWeapon;
		} else if (KEY_STATUS.three) {
			this.weapon = forkWeapon;
		} else if (KEY_STATUS.four) {
			this.weapon = branchWeapon;
		}

		// Redraw ship
		if (!this.isColliding) {
			this.draw();
		}
		else {
			this.alive = false;
			game.gameOver();
		}
		
		if (KEY_STATUS.space && this.weapon.counter >= this.weapon.fireRate && !this.isColliding) {
			this.weapon.fire();
		}
	};
}
Ship.prototype = new Drawable();


/**
 * Create Enemy ship object. 
 */
function Enemy() {
	var percentFire = .01;
	var chance = 0;
	this.alive = false;
	this.collidableWith = "bullet";
	this.type = "enemy";
	this.hitBox = {'x': 4, 'y': 3, 'width': 33, 'height': 22};
	
	/*
	 * Sets enemy values
	 */
	this.spawn = function(x, y, velocity) {
		this.x = x;
		this.y = y;
		this.velocity = velocity;
		this.alive = true;
		this.leftEdge = this.x - 90;
		this.rightEdge = this.x + 90;
		this.bottomEdge = this.y + 140;
	};

	this.draw = function() {
		this.context.clearRect(this.x-1, this.y, this.width+2, this.height);
		this.x += this.velocity.x;
		this.y += this.velocity.y;
		if (this.x <= this.leftEdge) {
			this.velocity.x = -this.velocity.x;
		}
		else if (this.x >= this.rightEdge + this.width) {
			this.velocity.x = -this.velocity.x;
		}
		else if (this.y >= this.bottomEdge) {
			this.velocity.x = 1.5;
			this.velocity.y = 0;
			this.y -= 5;
		}
		
		if (!this.isColliding) {
			this.context.drawImage(imageRepository.enemy, this.x, this.y);
		
			// equation to give enemy ability to shoot at any moment
			chance = Math.floor(Math.random()*101);
			if (chance/100 < percentFire) {
				this.fire();
			}
			
			return false;
		}
		else {
			game.playerScore += 5;
			game.explosion.get();
			return true;
		}
	};
	
	this.fire = function() {
		game.enemyBulletPool.get(this.x+this.width/2, this.y+this.height, {'x': 0, 'y':2.5});
	};
	
	/*
	 * Resets values 
	 */
	this.clear = function() {
		this.x = 0;
		this.y = 0;
		this.velocity = {'x': 0, 'y': 0};
		this.alive = false;
		this.isColliding = false;
	};
}
Enemy.prototype = new Drawable();


 /**
 * Creates the Game object to hold all objects and data. 
 */
function Game() {
	/*
	 * Get canvas information and set up game objects 
	 */
	this.init = function() {
		this.bgCanvas = document.getElementById('background');
		this.shipCanvas = document.getElementById('ship');
		this.mainCanvas = document.getElementById('main');
		
		// Test to see if canvas is supported. 
		if (this.bgCanvas.getContext) {
			this.bgContext = this.bgCanvas.getContext('2d');
			this.shipContext = this.shipCanvas.getContext('2d');
			this.mainContext = this.mainCanvas.getContext('2d');
		
			// set objects to context and corresponding canvas
			Background.prototype.context = this.bgContext;
			Background.prototype.canvasWidth = this.bgCanvas.width;
			Background.prototype.canvasHeight = this.bgCanvas.height;
			
			Ship.prototype.context = this.shipContext;
			Ship.prototype.canvasWidth = this.shipCanvas.width;
			Ship.prototype.canvasHeight = this.shipCanvas.height;
			
			Bullet.prototype.context = this.mainContext;
			Bullet.prototype.canvasWidth = this.mainCanvas.width;
			Bullet.prototype.canvasHeight = this.mainCanvas.height;
			
			Enemy.prototype.context = this.mainContext;
			Enemy.prototype.canvasWidth = this.mainCanvas.width;
			Enemy.prototype.canvasHeight = this.mainCanvas.height;
			
			// Initialize background object
			this.background = new Background();
			this.background.init(0,0); // Set draw point to 0,0
			
			// Initialize ship object
			this.ship = new Ship();
			this.shipStartX = this.shipCanvas.width/2 - imageRepository.spaceship.width;
			this.shipStartY = this.shipCanvas.height/4*3 + imageRepository.spaceship.height*2;
			this.ship.init(this.shipStartX, this.shipStartY, 
			               imageRepository.spaceship.width, imageRepository.spaceship.height);
			
			// Initialize ship bullets
			this.bulletPool = new Pool(30);
			this.bulletPool.init("bullet");

			// Initialize the enemy pool object
			this.enemyPool = new Pool(30);
			this.enemyPool.init("enemy");
			this.spawnWave();
			
			this.enemyBulletPool = new Pool(50);
			this.enemyBulletPool.init("enemyBullet");
			
			// Call QuadTree
			this.quadTree = new QuadTree({x:0,y:0,width:this.mainCanvas.width,height:this.mainCanvas.height});
			
			this.playerScore = 0;

			// Added Sound
			this.laser = new SoundPool(10);
			this.laser.init("laser");
			
			this.explosion = new SoundPool(20);
			this.explosion.init("explosion");
			
			this.backgroundAudio = new Audio("Kick_Shock.wav");
			this.backgroundAudio.autoplay = true;
			this.backgroundAudio.loop = true;
			this.backgroundAudio.volume = .25;
			
			this.gameOverAudio = new Audio("game_over.wav");
			this.gameOverAudio.loop = true;
			this.gameOverAudio.volume = .25;
			
			return true;
		} else {
			return false;
		}
	};
	
	// create more enemies
	this.spawnWave = function() {
		var height = imageRepository.enemy.height;
		var width = imageRepository.enemy.width;
		var x = 100;
		var y = -height;
		var spacer = y * 1.5;
		for (var i = 1; i <= 18; i++) {
			this.enemyPool.get(x,y,{'x': 0, 'y': 2});
			x += width + 25;
			if (i % 6 == 0) {
				x = 100;
				y += spacer
			}
		}
	}
	
	// Start the animation loop
	this.start = function() {
		this.ship.draw();
		animate();
	};
	
	// Restart the game
	this.restart = function() {
		this.gameOverAudio.pause();
		
		document.getElementById('game-over').style.display = "none";
		this.bgContext.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
		this.shipContext.clearRect(0, 0, this.shipCanvas.width, this.shipCanvas.height);
		this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
		
		this.quadTree.clear();
		
		this.background.init(0,0);
		this.background.y2 = 0;
		this.ship.init(this.shipStartX, this.shipStartY, 
		               imageRepository.spaceship.width, imageRepository.spaceship.height);
		
		this.bulletPool.init("bullet");
		this.enemyPool.init("enemy");
		this.spawnWave();
		this.enemyBulletPool.init("enemyBullet");
		
		this.playerScore = 0;
		
		this.laser.init("laser");
		
		this.explosion.init("explosion");
		
		this.backgroundAudio.currentTime = 0;
		//this.backgroundAudio.play();
		
		this.start();
	};
	
	// Game over
	this.gameOver = function() {
		this.backgroundAudio.pause();
		this.gameOverAudio.currentTime = 0;
		//this.gameOverAudio.play();
		document.getElementById('game-over').style.display = "block";
	};
}


/**
 * A sound pool to use for the sound effects
 **/
function SoundPool(maxSize) {
	var size = maxSize; // Max bullets allowed in the pool
	var pool = [];
	this.pool = pool;
	
	/*
	 * Populates the pool array with the given object
	 */
	this.init = function(object) {
		if (object == "laser") {
			for (var i = 0; i < size; i++) {
				// Initalize the object
				laser = new Audio("laser.wav");
				laser.volume = .12;
				laser.addEventListener('ended', this.clear(laser));
				pool[i] = laser;
			}
		}
		else if (object == "explosion") {
			for (var i = 0; i < size; i++) {
				var explosion = new Audio("explosion.wav");
				explosion.volume = .1;
				explosion.addEventListener('ended', this.clear(explosion));
				pool[i] = explosion;
			}
		}
	};
	
	/*
	 * Grab last item in the list push to front
	 */
	this.get = function() {
		if(pool[size - 1].currentTime == 0 || pool[size - 1].ended) {
			pool[size - 1].play();
			pool.unshift(pool.pop());
		}
	};
	
	this.clear = function(obj) {
		for (var i = 0; i < size; i++) {
			// Only draw until we find a bullet that is not alive
			if (pool[i] === obj) {
				pool.push((pool.splice(i,1))[0]);
				break;
			}
		}
	};
}


/**
 * Call to shim for animation loop where game loop is optimized 
 */
function animate() {
	thisFrame = Date.now();
	elapsed = thisFrame - lastFrame;
	lastFrame = thisFrame;
	document.getElementById('fps').innerHTML = avgFramerate;
	document.getElementById('score').innerHTML = game.playerScore;

	game.quadTree.clear();
	game.quadTree.insert(game.ship);
	game.quadTree.insert(game.bulletPool.getPool());
	game.quadTree.insert(game.enemyPool.getPool());
	game.quadTree.insert(game.enemyBulletPool.getPool());
	
	detectCollision();
	
	// No more enemies
	if (game.enemyPool.getPool().length === 0) {
		game.spawnWave();
	}

	if (game.ship.alive) {
		requestAnimFrame( animate );
		
		game.background.draw();
		game.ship.move();
		game.bulletPool.animate();
		game.enemyPool.animate();
		game.enemyBulletPool.animate();
		
		frameCount++;
		elapsedCounter += elapsed;
		if (elapsedCounter > 1000) {
			elapsedCounter -= 1000;
			avgFramerate = frameCount;
			frameCount = 0;
		}
	}
}

/* detection algorithm researched from https://hal.archives-ouvertes.fr/hal-00979197/ */
function detectCollision() {
	var objects = [], obj1, obj2;
	game.quadTree.getAllObjects(objects);

	for (var x = 0, len = objects.length; x < len; x++) {		
		game.quadTree.findObjects(obj = [], objects[x]);
		
		for (y = 0, length = obj.length; y < length; y++) {
			obj1 = objects[x];
			obj2 = obj[y];
			//DETECT COLLISION ALGORITHM
			if (((obj1.x + obj1.hitBox.x)                      < (obj2.x + obj2.hitBox.x+ obj2.hitBox.width)   &&
			     (obj1.x + obj1.hitBox.x + obj1.hitBox.width)  > (obj2.x + obj2.hitBox.x)                      &&
				 (obj1.y + obj1.hitBox.y)                      < (obj2.y + obj2.hitBox.y + obj2.hitBox.height) &&
				 (obj1.y + obj1.hitBox.y + obj1.hitBox.height) > (obj2.y + obj2.hitBox.y))                     &&
				 obj1.collidableWith === obj2.type) {
			// if ((obj1.x                      < obj2.x + obj2.width  &&
			//      obj1.x + obj1.width  > obj2.x                      &&
			// 	 obj1.y                      < obj2.y + obj2.height &&
			// 	 obj1.y + obj1.height > obj2.y)                     &&
			// 	 obj1.collidableWith === obj2.type) {
				objects[x].isColliding = true;
				obj[y].isColliding = true;
		  }
		}
	}
};


// The keycodes that will be mapped when a user presses a button.
// Original code by Doug McInnes
KEY_CODES = {
  32: 'space',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
  49: 'one',
  50: 'two',
  51: 'three',
  52: 'four'
}

// Creates the array to hold the KEY_CODES and sets all their values
// to true. Checking true/flase is the quickest way to check status
// of a key press and which one was pressed when determining
// when to move and which direction.
KEY_STATUS = {};
for (code in KEY_CODES) {
  KEY_STATUS[KEY_CODES[code]] = false;
}
/**
 * Sets up the document to listen to onkeydown events (fired when
 * any key on the keyboard is pressed down). When a key is pressed,
 * it sets the appropriate direction to true to let us know which
 * key it was.
 */
document.onkeydown = function(e) {
	// Firefox and opera use charCode instead of keyCode to
	// return which key was pressed.
	var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
  	if (KEY_CODES[keyCode] && keyCode < 49) {
		e.preventDefault();
    	KEY_STATUS[KEY_CODES[keyCode]] = true;
 	} else if (KEY_CODES[keyCode]) {
 		e.preventDefault();
 		for (var i = 49; i <= 52; i++)
 			KEY_STATUS[KEY_CODES[i]] = false;
 		KEY_STATUS[KEY_CODES[keyCode]] = true;
 	}
}
/**
 * Sets up the document to listen to ownkeyup events (fired when
 * any key on the keyboard is released). When a key is released,
 * it sets teh appropriate direction to false to let us know which
 * key it was.
 */
document.onkeyup = function(e) {
  var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
  if (KEY_CODES[keyCode] && keyCode < 49) {
	e.preventDefault();
    KEY_STATUS[KEY_CODES[keyCode]] = false;
  }
}


/**	
 * requestAnim shim layer by Paul Irish
 * Finds the first API that works to optimize the animation loop, 
 * otherwise defaults to setTimeout().
 */
window.requestAnimFrame = (function(){
	return window.requestAnimationFrame    || 
			window.webkitRequestAnimationFrame || 
			window.mozRequestAnimationFrame    || 
			window.oRequestAnimationFrame      || 
			window.msRequestAnimationFrame     || 
			function(/* function */ callback, /* DOMElement */ element){
				window.setTimeout(callback, 1000 / 60);
			};
})();