/*
Copyright (c) 2013 Fabrice ECAILLE aka Febbweiss

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var Game = {
	id : null,
	type : "offline",
	player : 1,
	
	PACMAN_START_X : 14 * TILE_SIZE,
	PACMAN_START_Y : 24 * TILE_SIZE,

	GHOST_STATE_CHASE : 1,
	GHOST_STATE_SCATTER : 2,
	GHOST_STATE_FRIGHTENED : 3,
	GHOST_STATE_IN_JAIL : 4,
	GHOST_STATE_EATEN : 5,
	GHOST_STATE_FRIGHTENED_BLINK : 6,

	
	GHOST_EVENT_CHASE : "ghost_event_chase",
	GHOST_EVENT_SCATTER : "ghost_event_scatter",
	GHOST_EVENT_DOT_EATEN : "ghost_event_dot_eaten",
	
	DOT_POINTS : 10,
	BIG_DOT_POINTS : 50,
	totalDots : 0,
		
	dots : {},
	timer : null,
	frightTimer : null,
	bonusTimer : null,
	level : -1,
	levelData : null,
	step : 0,
	score : 0,
	eatenDots : 0,
	lives : 3,
	running : false,
	mode : 2, // Game.GHOST_STATE_SCATTER
	frightMode : false,
	eaten: 0,
	
	pacman : null,
	miss : null,
	hero : null,
	blinky : null,
	pinky : null,
	inky : null,
	clyde : null,
	ghosts : new Array(),
	actors : {},
	heroes : new Array(),
	maze : MAZE,

	init : function() {
		
		GUI.updateMessage("READY");
		
		$(".dot.hiddenDot").each( function(incr, elt) {
			Game.dots[elt.id] = "dot";
		});
		$(".dot.hiddenDot").removeClass("hiddenDot");
		
		$(".bigDot.hiddenDot").each( function(incr, elt) {
			Game.dots[elt.id] = "bigDot";
		});
		$(".bigDot.hiddenDot").removeClass("hiddenDot")
		
		Game.totalDots = $(".dot").length + $(".bigDot").length;
		
		SCOREBOARD.init();
		SCOREBOARD.set_score( Game.score );
		
		Game.level++;
		Game.step = 0;
		Game.eatenDots = 0;
		
		GUI.updateLevelNumber( Game.level + 1 );
		
		Game.build(LEVELS[Math.min(Game.level, LEVELS.length)]);
	},
	
	build : function(data) {
		Game.levelData = data;
		Game.addPacman();
		Game.addGhosts();
		Sound.play("opening");
		setTimeout("Game.start();", 4500);
	},
	
	start : function() {
		//if( $.browser.webkit )
		$(document).keydown( function( event ) {
			if( event.which > 36 && event.which < 41 )
				 return false;
		} );
		//	$(document).keypress(scrollPreventFct );
		
		GUI.updateMessage("");
		Game.timer = new PausableTimer(Game.timerManager, Game.levelData.mode[Game.step] * 1000);
		Game.running = true;
	},
	
	levelComplete : function() {
		Game.running = false;
		Game.timer.stop();
		Game.timer = null;
		
		setTimeout("Game.init();", 3000);
	},

	eat : function(type) {
		Game.eatenDots++;
		if( type === "bigDot" ) {
			Game.score += Game.BIG_DOT_POINTS;
//			console.log( "Eating big dot " + Game.score );
			SCOREBOARD.add( Game.BIG_DOT_POINTS );
		} else {
			Game.score += Game.DOT_POINTS;
//			console.log( "Eating dot " + Game.score );
			SCOREBOARD.add( Game.DOT_POINTS );
		}
		
		if( Game.eatenDots == 70 || Game.eatenDots == 170 ) {
			Game.bonusTimer = setTimeout("Game.hideBonus();", ( 9 + Math.random() ) * 1000 );
			$("#" + Game.maze.bonus_target).addClass( Game.levelData.bonus.type);
		}
		
		if( Game.eatenDots === Game.totalDots )
			Game.levelComplete();
	},
	
	eatGhost : function(ghost) {
		Sound.play("ghost");
		Game.eaten++;
		var points = Game.eaten * 200;
		Game.score += points;
//		console.log(new Date() + " Eating " + ghost.id + " " + (Game.eaten * 200) + " "+ Game.score );
		SCOREBOARD.add( points );
	},
	
	hideBonus : function() {
		$("#" + Game.maze.bonus_target).removeClass( Game.levelData.bonus.type);
		Game.bonusTimer = null;
	},
	
	die : function() {
		Game.running = false;
		$.each( Game.actors, function(index, actor) { 
			actor.speed = 0;
		})
		Game.pacman.die();
		Game.timer.stop();
		Game.step = 0;
		Game.timer = null;
		$("#life" + Game.lives).effect( "pulsate", {times:3, mode:"hide"}, 500 );
		Game.lives--;
		if( Game.lives > 0 )
			setTimeout( "Game.startAfterDie();", 3000);
		else {
			GUI.drawText( $("#message"), "GAME OVER", true );
			Game.show_game_over();
		}
	},
	
	show_game_over: function() {
	},
	
	startAfterDie : function() {
		var dotsCounters = new Array();
		$.each(Game.ghosts, function(index, ghost ) {
			dotsCounters[index] = ghost.dotsCounter;
		});
		
		Game.addGhosts();
		Game.addPacman();
		//Game.addMissPacman();

		$.each(Game.ghosts, function(index, ghost ) {
			ghost.dotsCounter = dotsCounters[index];
			if( ghost.dotsCounter >= ghost.dotsLimits[Math.min(Game.level, ghost.dotsLimits.length - 1)] ) {
				ghost.speed = ghost.initialSpeed;
				ghost.state_to(Game.GHOST_STATE_SCATTER);
			}
		});
		
		Game.running = true;
		Game.step = 0;
		Game.timer = new PausableTimer(Game.timerManager, Game.levelData.mode[Game.step] * 1000);
	},

	timerManager : function() {
		Game.step++;
		if( Game.step % 2 == 1 ) {
			$(".actor").trigger(Game.GHOST_EVENT_CHASE);
			Game.mode = Game.GHOST_STATE_CHASE;
		} else {
			$(".actor").trigger(Game.GHOST_EVENT_SCATTER);
			Game.mode = Game.GHOST_STATE_SCATTER;
		}
		if( Game.step < Game.levelData.mode.length - 1 && Game.levelData.mode[Game.step] != INFINITY )
			Game.timer = new PausableTimer(Game.timerManager, Game.levelData.mode[Game.step] * 1000);
	},
	
	addPacman : function() {
		if( $("#pacman").length == 0) {
			Game.pacman = new Pacman();
			$("#actors").addSprite("pacman", {animation: Game.pacman.animations["right"], posx:Game.pacman.x, posy: Game.pacman.y, width: ACTOR_SIZE, height: ACTOR_SIZE});
			Game.pacman.node = $("#pacman");
			Game.pacman.node.addClass( "actor" );
			Game.actors[ "pacman" ] = Game.pacman;
			Game.heroes[ "pacman" ] = Game.pacman;
			
			Game.hero = Game.pacman;
		}
		Game.pacman.init();
		Game.pacman.speed = Game.levelData.pacman.speed;
		Game.pacman.left();
	},
	
	addMissPacman : function() {
		if( $("#miss_pacman").length == 0) {
			Game.miss = new Pacman();
			Game.miss.animations["right"] = new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 3, offsety: 272, delta: ACTOR_SIZE, rate: 120, type: $.gameQuery.ANIMATION_HORIZONTAL });
			Game.miss.animations["up"] = new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 3, offsetx: 96, offsety: 272, delta: ACTOR_SIZE, rate: 120, type: $.gameQuery.ANIMATION_HORIZONTAL });
			
			$("#actors").addSprite("miss_pacman", {animation: Game.miss.animations["right"], posx:Game.miss.x, posy: Game.miss.y, width: ACTOR_SIZE, height: ACTOR_SIZE});
			Game.miss.node = $("#miss_pacman");
			Game.miss.node.addClass( "actor" );
			Game.actors[ "miss_pacman" ] = Game.miss;
			Game.heroes[ "miss_pacman" ] = Game.miss;
		}
		Game.miss.init();
		Game.miss.x = Game.MISS_PACMAN_START_X; 
		Game.miss.y = Game.MISS_PACMAN_START_Y;
		Game.miss.speed = Game.levelData.pacman.speed;
		Game.miss.right(true);
		Game.miss.left(true);
		Game.miss.node.x(Game.miss.x);
		Game.miss.node.y(Game.miss.y);
		Game.miss.right();
	},
	
	addGhosts : function() {
		Game.addBlinky();
		Game.addPinky();
		Game.addInky();
		Game.addClyde();
	},
	
	addBlinky : function() {
		if( $("#blinky").length == 0 ) {
			Game.blinky = new Ghost("blinky", 0, {x: 14 * TILE_SIZE, y: 14 * TILE_SIZE}, {x: 25, y: 0 }, function() {
				var prey = Game.actors[ "blinky" ].prey;
				return {x: prey.getTileX(), y: prey.getTileY()};
			}, [0,0,0], Game.GHOST_STATE_SCATTER);
			Game.blinky.center();
			$("#actors").addSprite("blinky", {animation: Game.blinky.animations["right"], posx:Game.blinky.x, posy: Game.blinky.y, width: ACTOR_SIZE, height: ACTOR_SIZE});
			Game.blinky.node = $("#blinky");
			Game.blinky.node.addClass( "actor" );
			Game.actors[ "blinky" ] = Game.blinky;
			Game.blinky.loadBindings();
			
			Game.blinky.originalTarget = Game.blinky.target;
			Game.blinky.target = function() {
				var remainingDots = Game.totalDots - Game.eatenDots;
				var elroySpecs = Game.levelData.ghost;
				if( ( Game.blinky.state == Game.GHOST_STATE_SCATTER || Game.blinky.state == Game.GHOST_STATE_CHASE ) && remainingDots <= elroySpecs.elroy1Dots ) {
					if( remainingDots <= elroySpecs.elroy2Dots ) {
						Game.blinky.speed = elroySpecs.elroy2Speed;
					}
					else {
						Game.blinky.speed = elroySpecs.elroy1Speed;
					}
					
					return Game.blinky.personnalTarget();
				}
				return Game.blinky.originalTarget();
			};
			
			Game.ghosts.push( Game.blinky );
		} else {
			Game.blinky.init();
		}
		Game.blinky.state = Game.GHOST_STATE_SCATTER;
		Game.blinky.left();
		Game.blinky.initialSpeed = Game.levelData.ghost.speed;
		Game.blinky.speed = Game.blinky.initialSpeed;
	},
	
	addPinky : function() {
		if( $("#pinky").length == 0 ) {
			Game.pinky = new Ghost("pinky", 1, {x: 14 * TILE_SIZE, y: 16 * TILE_SIZE}, {x: 2, y: 0 }, function() {
				var prey = Game.actors[ "pinky" ].prey;
				var direction = this.prey.direction;
				if( direction % 2 == 0 )
					return  {x: prey.getTileX() + (direction == LEFT ? -4 : 4), y: prey.getTileY()};
					else
						return {x: prey.getTileX(), y: prey.getTileY() + (direction == UP ? -4 : 4) };
			}, [0,0,0], Game.GHOST_STATE_IN_JAIL);
			Game.pinky.center();
			$("#actors").addSprite("pinky", {animation: Game.pinky.animations["right"], posx: Game.pinky.x, posy: Game.pinky.y, width: ACTOR_SIZE, height: ACTOR_SIZE});
			Game.pinky.node = $("#pinky");
			Game.pinky.node.addClass( "actor" );
			Game.actors[ "pinky" ] = Game.pinky;
			Game.pinky.loadBindings();
			
			Game.ghosts.push( Game.pinky );
		} else {
			Game.pinky.init();
		}
		Game.pinky.initialSpeed = Game.levelData.ghost.speed;
		Game.pinky.left();
	},
	
	addInky : function() {
		if( $("#inky").length == 0 ) {
			Game.inky = new Ghost("inky", 2, {x: 12 * TILE_SIZE, y: 16 * TILE_SIZE}, {x: 27, y: 34 }, function() {
				var prey = Game.actors[ "inky" ].prey;
				var direction = prey.direction;
				if( direction % 2 == 0 )
					direction = {x: prey.getTileX() + (direction == LEFT ? -2 : 2) - Game.blinky.getTileX(), y: prey.getTileY() - Game.blinky.getTileY()};
				else
					direction = {x: prey.getTileX() - Game.blinky.getTileX(), y: prey.getTileY() + (direction == UP ? -2 : 2) - Game.blinky.getTileY()};
				return {x: direction.x * 2, y: direction.y * 2};
			}, [30,0,0], Game.GHOST_STATE_IN_JAIL);
			Game.inky.center();
			$("#actors").addSprite("inky", {animation: Game.inky.animations["right"], posx:Game.inky.x, posy: Game.inky.y, width: ACTOR_SIZE, height: ACTOR_SIZE});
			Game.inky.node = $("#inky");
			Game.inky.node.addClass( "actor" );
			Game.actors[ "inky" ] = Game.inky;
			Game.inky.loadBindings();
			
			Game.ghosts.push( Game.inky );
		} else {
			Game.inky.init();
		}
		Game.inky.initialSpeed = Game.levelData.ghost.speed;
		Game.inky.right();
	},
	
	addClyde : function() {
		if( $("#clyde").length == 0 ) {
			Game.clyde = new Ghost("clyde", 3, {x: 16 * TILE_SIZE, y: 16 * TILE_SIZE}, {x: 0, y: 34 }, function() {
				var prey = Game.actors[ "clyde" ].prey;
				return distance( {x: this.getTileX(), y: this.getTileY()} , {x: prey.getTileX(), y: prey.getTileY()}) < 8 ? 
						this.scatterTarget : {x: prey.getTileX(), y: prey.getTileY()};
			}, [60,50,0], Game.GHOST_STATE_IN_JAIL);
			Game.clyde.center();
			$("#actors").addSprite("clyde", {animation: Game.clyde.animations["right"], posx:Game.clyde.x, posy: Game.clyde.y, width: ACTOR_SIZE, height: ACTOR_SIZE});
			Game.clyde.node = $("#clyde");
			Game.clyde.node.addClass( "actor" );
			Game.actors[ "clyde" ] = Game.clyde;
			Game.clyde.loadBindings();
			
			Game.ghosts.push( Game.clyde );
		} else {
			Game.clyde.init();
		}
		Game.clyde.initialSpeed = Game.levelData.ghost.speed;
		Game.clyde.left();
	},
	
	moveGhosts : function() {
		$.each(Game.ghosts, function(index, ghost ) {
			ghost.move();
		});
	},
	
	nearEndFright : function() {
		$.each(Game.ghosts, function(index, ghost ) {
			if( ghost.state != Game.GHOST_STATE_IN_JAIL && ghost.state != Game.GHOST_STATE_EATEN )
				ghost.state_to(Game.GHOST_STATE_FRIGHTENED_BLINK);
		});

		setTimeout( 'Game.endFright();', 160 * 4 * Game.levelData.frightFlashesCount);
	},
	
	endFright : function() {
		if( Game.timer )
			Game.timer.resume();
		Game.frightTimer = null;
		Game.eaten = 0;
		$('.actor').trigger( Game.mode == Game.GHOST_STATE_CHASE ? Game.GHOST_EVENT_CHASE : Game.GHOST_EVENT_SCATTER );
	}
}

function distance(currentTile, target) {
	return Math.sqrt( (target.x - currentTile.x) * (target.x - currentTile.x) + (target.y - currentTile.y)*(target.y - currentTile.y));
};

//Game objects:
function Actor(){}
Actor.prototype = {
	node : null,
	animations : null,
	x : null,
	y : null,
	speed : null,
	direction : null, // 1: up, 2: left, 3:down, 4: right
	directionX : 0,
	directionY : 0,

	getX : function() {
		return x;
	},
	
	getY : function() {
		return y;
	},
	
	getTileX : function() {
		return Math.floor(this.x / TILE_SIZE);
	},
	
	getTileY : function() {
		return Math.floor(this.y / TILE_SIZE);
	},
	
	getTile : function() {
		return this.getTileX() + this.getTileY() * WIDTH_TILE_COUNT;
	},
	
	getInsideTileX : function() {
		return this.x % TILE_SIZE;
	},
	
	getInsideTileY : function() {
		return this.y % TILE_SIZE;
	},
	
	move : function() {
		if( !Game.running )
			return;
		this.x += this.directionX * this.speed * ACTOR_SPEED;
		this.y += this.directionY * this.speed * ACTOR_SPEED;
		this.node.x(this.x );
		this.node.y(this.y );
	},
	
	up : function( force ) {
		if( force || this.direction != UP ) {
			this.directionX = 0;
			this.directionY = -1;
			this.direction = UP;
			this.node.setAnimation(this.animations["up"]);
			this.node.flipv(false);
			this.node.fliph(false);
			this.center();
		}
	},
	
	down : function( force ) {
		if( force || this.direction != DOWN ) {
			this.directionX = 0;
			this.directionY = 1;
			this.direction = DOWN;
			if( this.animations["down"] ) {
				this.node.setAnimation(this.animations["down"]);
				this.node.fliph( false );
			} else {
				this.node.setAnimation(this.animations["up"]);
				this.node.flipv( true );
				this.node.fliph( false );
			}
			this.center();
		}
	},
	
	left : function( force ) {
		if( force || this.direction != LEFT ) {
			this.directionX = -1;
			this.directionY = 0;
			this.direction = LEFT;
			this.node.flipv( false );
			if( this.animations["left"] ) {
				this.node.setAnimation(this.animations["left"]);
			} else {
				this.node.setAnimation(this.animations["right"]);
				this.node.fliph( true );
			}
			this.center();
		}
	},
	
	right : function( force ) {
		if( force || this.direction != RIGHT ) {
			this.directionX = 1;
			this.directionY = 0;
			this.direction = RIGHT;
			this.node.setAnimation(this.animations["right"]);
			this.node.fliph( false );
			this.node.flipv( false );
			this.center();
		}
	},

	canLeft : function() {
		return Game.maze.structure[this.getTileX() + this.getTileY() * WIDTH_TILE_COUNT - 1] <= 0;
	},
	
	canRight : function() {
		return Game.maze.structure[this.getTileX() + this.getTileY() * WIDTH_TILE_COUNT + 1] <= 0;
	},
	
	canUp : function() {
		return Game.maze.structure[this.getTileX() + (this.getTileY() - 1 ) * WIDTH_TILE_COUNT ] <= 0;
	},
	
	canDown : function() {
		return Game.maze.structure[this.getTileX() + (this.getTileY() + 1 ) * WIDTH_TILE_COUNT ] <= 0;
	},

	isNearMiddleTile : function() {
		return Math.abs( HALF_TILE_SIZE - this.getInsideTileX() ) < 4 && Math.abs( HALF_TILE_SIZE - this.getInsideTileY() ) < 4; 
	},
	
	center : function() {
		this.x = this.getTileX() * TILE_SIZE + HALF_TILE_SIZE;
		this.y = this.getTileY() * TILE_SIZE + HALF_TILE_SIZE;
	},
	
	isInTunnel : function() {
		var tile = this.getTile();
		return $.inArray(tile, Game.maze.tunnel) > -1;
	}
};

/*********************************************/
/****************** PACMAN *******************/
/*********************************************/
function Pacman() {
	this.animations = {
			"right": new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 3, offsety: 16, delta: ACTOR_SIZE, rate: 120, type: $.gameQuery.ANIMATION_HORIZONTAL }),
			"up": new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 3, offsetx: 64, offsety: 16, delta: ACTOR_SIZE, rate: 120, type: $.gameQuery.ANIMATION_HORIZONTAL }),
			"die": new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 7, offsety: 208, delta: ACTOR_SIZE, rate: 120, type: $.gameQuery.ANIMATION_HORIZONTAL | $.gameQuery.ANIMATION_ONCE | $.gameQuery.ANIMATION_CALLBACK }),
			"die2": new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 4, offsety: 240, delta: ACTOR_SIZE, rate: 120, type: $.gameQuery.ANIMATION_HORIZONTAL | $.gameQuery.ANIMATION_ONCE })
	}
};
Pacman.prototype = {
	x : Game.PACMAN_START_X,
	y : Game.PACMAN_START_Y,
	speed : null,
	directionX : 0,
	directionY : 0,
	lastEatenGhost : null,
	
	stop : false,
	previousTile : null,
	
	init : function() {
		this.x = Game.PACMAN_START_X; 
		this.y = Game.PACMAN_START_Y;
		this.speed = Game.levelData.pacman.speed;
		this.right(true);
		this.left(true);
		this.node.x(this.x);
		this.node.y(this.y);
	},
	
	left : function() {
		if( this.direction != LEFT && this.canLeft() ) {
			this.stop = false;
			this._super("left", arguments);
		}
	},
	
	right : function() {
		if( this.direction != RIGHT && this.canRight() ) {
			this.stop = false;
			this._super("right", arguments);
		}
	},
	
	up : function() {
		if( this.direction != UP && this.canUp() ) {
			this.stop = false;
			this._super("up", arguments);
		}
	},
	
	down : function() {
		if( this.direction != DOWN && this.canDown() ) {
			this.stop = false;
			this._super("down", arguments);
		}
	},
	
	move : function() {
		if( !this.stop ) {
			this.previousTile = {x: this.getTileX(), y: this.getTileY()};
			this._super("move", arguments);
			var currentTile = {x: this.getTileX(), y: this.getTileY()};
			if( this.previousTile.x !== currentTile.x || this.previousTile.y !== currentTile.y ) {
				var id = this.getTile();
				if( Game.dots[ id ] )
					this.eatDot( id );
				if( id == Game.maze.bonus_target )
					this.eatBonus();
				this.eatGhosts();
			}

			var inTunnel = this.isInTunnel();
			if( this.x < 0 )
				this.x += PLAYGROUND_WIDTH;
			if( this.x > PLAYGROUND_WIDTH )
				this.x -= PLAYGROUND_WIDTH;
			switch( this.direction ) {
				case LEFT :
					if( !inTunnel && !this.canLeft() ) 
						this.stop = true;
					break;
				case RIGHT :
					if( !inTunnel && !this.canRight() )
						this.stop = true;
					break;
				case UP :
					if( !this.canUp() )
						this.stop = true;
					break;
				case DOWN :
					if( !this.canDown() )
						this.stop = true;
					break;
			}
		}
	},
	
	eatDot : function(id) {
		Game.eat(Game.dots[id]);
		$('.actor').trigger(Game.GHOST_EVENT_DOT_EATEN);
		if( Game.dots[id] === "bigDot" ) {
			$.each(Game.ghosts, function(index, ghost ) {
				if( ghost.state != Game.GHOST_STATE_IN_JAIL && ghost.state != Game.GHOST_STATE_EATEN )
					ghost.state_to(Game.GHOST_STATE_FRIGHTENED)
			});
				
			Game.timer.pause();
			if( Game.frightTimer )
				clearTimeout( Game.frightTimer );
			Game.frightTimer = setTimeout( 'Game.nearEndFright();', Game.levelData.frightTime * 1000 - 160 * 4 * Game.levelData.frightFlashesCount);
		}
		
		Game.dots[id] = null;
		$("#" + id ).addClass("hiddenDot");
	},
	
	eatGhosts : function() {
		var tile = this.getTile();
		$.each(Game.ghosts, function(index, ghost ) {
			if( tile == ghost.getTile() ) {
				Game.pacman.eatGhost( ghost );
			}
		});
	},
	
	eatGhost : function( ghost ) {
		if( ghost.state == Game.GHOST_STATE_EATEN ) {
//			console.log( ghost.id + " already eaten" );
			return;
		}
		if( ghost.state != Game.GHOST_STATE_FRIGHTENED && ghost.state != Game.GHOST_STATE_FRIGHTENED_BLINK ) {
			Game.die();
		} else if( Game.pacman.lastEatenGhost !== ghost.id ){
			ghost.state_to(Game.GHOST_STATE_EATEN);
//			console.log( "Eating " + ghost.id + " " + ghost.state );
			Game.eatGhost(ghost);
		}
	},
	
	eatBonus : function() {
		if( !$("#" + Game.maze.bonus_target).hasClass( Game.levelData.bonus.type) && Game.bonusTimer == null )
			return;
		
		Sound.play("fruit");
		
		eatenBonus.push(Game.levelData.bonus.type);
		Game.score += Game.levelData.bonus.points;
//		console.log( "Eating bonus " + Game.levelData.bonus.points + " " + Game.score );
		SCOREBOARD.add( Game.levelData.bonus.points );
		Game.hideBonus();
	},
	
	die : function() {
		Sound.play("dies");
		this.node.setAnimation(this.animations["die"], function(node) {
			Game.pacman.node.setAnimation(Game.pacman.animations["die2"]);
		});
	}
};

// Overriding Actor.methods() method 
heriter(Pacman.prototype, Actor.prototype); 

function Ghost(id, ghostIndex, start, scatterTarget, personnalTarget, dotsLimits, state ) {
	this.animations = {
		"normal_up": new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 2, offsety: 48 + ghostIndex * 32, delta: ACTOR_SIZE, rate: 160, type: $.gameQuery.ANIMATION_HORIZONTAL }),
		"normal_right": new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 2, offsetx: 128, offsety: 48 + ghostIndex * 32, delta: ACTOR_SIZE, rate: 160, type: $.gameQuery.ANIMATION_HORIZONTAL }),
		"normal_down": new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 2, offsetx: 64, offsety: 48 + ghostIndex * 32, delta: ACTOR_SIZE, rate: 160, type: $.gameQuery.ANIMATION_HORIZONTAL }),
		"frightened": new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 2, offsetx: 0, offsety: 176, delta: ACTOR_SIZE, rate: 160, type: $.gameQuery.ANIMATION_HORIZONTAL }),
		"frightened_blink": new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 4, offsetx: 0, offsety: 176, delta: ACTOR_SIZE, rate: 160, type: $.gameQuery.ANIMATION_HORIZONTAL }),
		"eaten_up": new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 1, offsetx: 128, offsety: 176, delta: ACTOR_SIZE, rate: 160, type: $.gameQuery.ANIMATION_HORIZONTAL }),
		"eaten_down": new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 1, offsetx: 160, offsety: 176, delta: ACTOR_SIZE, rate: 160, type: $.gameQuery.ANIMATION_HORIZONTAL }),
		"eaten_right": new $.gameQuery.Animation({imageURL: "img/sprite.png", numberOfFrame: 1, offsetx: 192, offsety: 176, delta: ACTOR_SIZE, rate: 160, type: $.gameQuery.ANIMATION_HORIZONTAL })
	}
	this.animations["up"] = this.animations["normal_up"];
	this.animations["down"] = this.animations["normal_down"];
	this.animations["right"] = this.animations["normal_right"];
	
	this.id = id;
	this.scatterTarget = scatterTarget;
	this.personnalTarget = personnalTarget;
	this.x = start.x;
	this.y = start.y;
	this.startingTileX = start.x;
	this.startingTileY = start.y;
	
	this.state = state;
	
	this.dotsLimits = dotsLimits;
	
	this.prey = Game.pacman;
};

Ghost.prototype = {
	id : null,
	startingTileX : 0,
	startingTileY : 0,
	initialSpeed : 0,
	speed : 0,
	directionX : 0,
	directionY : 0,

	state: null,
	scatterTarget : null,
	lastDirectionTile : null,
	
	prey : null,
	
	dotsCounter : 0,
	dotsLimits : [],
	
	init : function() {
		this.dotsCounter = 0;
		this.speed = 0;
		this.x = this.startingTileX; 
		this.y = this.startingTileY;
		this.right(true);
		this.left(true);
		this.state = Game.GHOST_STATE_IN_JAIL;
		this.node.x(this.x);
		this.node.y(this.y);
	},
	
	target : function() {
		switch( this.state ) {
			case Game.GHOST_STATE_CHASE :
				return this.personnalTarget();
			case Game.GHOST_STATE_SCATTER :
				return this.scatterTarget;
			case Game.GHOST_STATE_FRIGHTENED :
				var currentTile = {x: this.getTileX(), y: this.getTileY()};
				var targets = new Array();
				if( this.canUp() && this.direction != DOWN )
					targets.push( {x:currentTile.x, y:currentTile.y - 1} );
				if( this.canDown() && this.direction != UP )
					targets.push( {x:currentTile.x, y:currentTile.y + 1} );
				if( this.canLeft() && this.direction != RIGHT )
					targets.push( {x:currentTile.x - 1, y:currentTile.y} );
				if( this.canRight() && this.direction != LEFT )
					targets.push( {x:currentTile.x + 1, y:currentTile.y} );
				return targets[ parseInt(Math.random() * targets.length ) ];
			case Game.GHOST_STATE_IN_JAIL :
			case Game.GHOST_STATE_EATEN :
				return {x: 13, y: 14};
		}
	},
	
	loadBindings : function() {
		this.node.bind(Game.GHOST_EVENT_CHASE, {ghost: this}, function(evt) { 
			var ghost = evt.data.ghost;
			if( ghost.state != Game.GHOST_STATE_IN_JAIL && ghost.state != Game.GHOST_STATE_EATEN )
				ghost.state_to(Game.GHOST_STATE_CHASE);
		});
		this.node.bind(Game.GHOST_EVENT_SCATTER, {ghost: this}, function(evt) { 
			var ghost = evt.data.ghost;
			if( ghost.state != Game.GHOST_STATE_IN_JAIL && ghost.state != Game.GHOST_STATE_EATEN )
				ghost.state_to(Game.GHOST_STATE_SCATTER);
		});
		this.node.bind(Game.GHOST_EVENT_DOT_EATEN, {ghost: this}, function(evt) {  
			var ghost = evt.data.ghost;
			if( ghost.state == Game.GHOST_STATE_IN_JAIL && ghost.dotsCounter++ >= ghost.dotsLimits[Math.min(Game.level, ghost.dotsLimits.length - 1)] ) {
				ghost.speed = ghost.initialSpeed;
				ghost.state_to(Game.mode);
			}
		});
	},
	
	personnalTarget : function() {
	},
	
	state_to : function( state ) {
		var up;
		var down;
		var right;
		var reverse = this.state != Game.GHOST_STATE_FRIGHTENED && this.state != Game.GHOST_STATE_IN_JAIL; // previous state
		this.state = state;
		switch( state ) {
			case Game.GHOST_STATE_CHASE :
				this.speed = Game.levelData.ghost.speed;
			case Game.GHOST_STATE_SCATTER :
				this.speed = Game.levelData.ghost.speed;
			case Game.GHOST_STATE_IN_JAIL :
				up = this.animations["normal_up"];
				down = this.animations["normal_down"];
				right = this.animations["normal_right"];
				break;
			case Game.GHOST_STATE_FRIGHTENED :
				up = down = right = this.animations["frightened"];
				this.speed = Game.levelData.ghost.frightSpeed;
				break;
			case Game.GHOST_STATE_FRIGHTENED_BLINK :
				up = down = right = this.animations["frightened_blink"];
				this.state = Game.GHOST_STATE_FRIGHTENED;
				break;
			case Game.GHOST_STATE_EATEN :
				up = this.animations["eaten_up"];
				down = this.animations["eaten_down"];
				right = this.animations["eaten_right"];
				this.speed = 1;
				break;
		}
		
		
		this.animations["up"] = up;
		this.animations["down"] = down;
		this.animations["right"] = right;

		if( reverse )
			switch( this.direction ) {
			case UP:
				this.direction = DOWN;
				break;
			case LEFT:
				this.direction = RIGHT;
				break;
			case DOWN:
				this.direction = UP;
				break;
			case RIGHT:
				this.direction = LEFT;
				break;
			}
			
		var inTunnel = this.isInTunnel();
		var distances = [
             {direction: UP, distance: this.canUp() && this.direction != DOWN ? 1 : INFINITY},
             {direction: LEFT, distance: (inTunnel && this.direction == LEFT ) || (this.canLeft() && this.direction != RIGHT) ? 1 : INFINITY},
             {direction: DOWN, distance: this.canDown() && this.direction != UP ? 1 : INFINITY},
             {direction: RIGHT, distance: (inTunnel && this.direction == RIGHT ) || (this.canRight() && this.direction != LEFT) ? 1 : INFINITY},
         ];
		distances.sort( function(a, b) {
			if( a.distance == b.distance )
				return a.direction - b.direction;
			return a.distance - b.distance;
		})
		var selected = distances[0];

		switch( selected.direction ) {
		case UP:
			this.up(true);
			break;
		case LEFT:
			this.left(true);
			break;
		case DOWN:
			this.down(true);
			break;
		case RIGHT:
			this.right(true);
			break;
		}
		
	},
	
	canUp : function() {
		switch( this.getTile() ) {
			case 404:
			case 407:
			case 684:
			case 687:
				return false;
			case 461:
			case 462:
				return true;
			default:
				return Game.maze.structure[ this.getTileX() + (this.getTileY() - 1 ) * WIDTH_TILE_COUNT ] <= 0;
		} 
	},
	
	canDown : function() {
		switch( this.getTile() ) {
			case 405:
			case 406:
				return false;
			default:
				return Game.maze.structure[ this.getTileX() + (this.getTileY() + 1 ) * WIDTH_TILE_COUNT ] <= 0;
		} 
	},
	
	move : function() {
		this._super("move", arguments);
		var currentTile = {x: this.getTileX(), y: this.getTileY()};
		var id = this.getTile();;
		if( this.lastDirectionTile != id && this.isNearMiddleTile()) {
			this.lastDirectionTile = id;
			this.eaten();
			
			var distances = null;
			var target = this.target();
			if( this.state == Game.GHOST_STATE_EATEN && id == Game.maze.ghost_frightened_target ) {
				this.state_to(Game.mode);
			}
			
			var inTunnel = this.isInTunnel();
			if( inTunnel )
				this.speed = Game.levelData.ghost.tunnelSpeed;
			else if( this.state != Game.GHOST_STATE_IN_JAIL )
				this.speed = this.state == Game.GHOST_STATE_FRIGHTENED ? Game.levelData.ghost.frightSpeed : Game.levelData.ghost.speed;
			
			if( this.x < 0 )
				this.x += PLAYGROUND_WIDTH;
			if( this.x > PLAYGROUND_WIDTH )
				this.x -= PLAYGROUND_WIDTH;
			
			if( Game.maze.choice_tiles.indexOf( id ) != -1 ) {
				distances = [
	                 {direction: UP, distance: this.canUp() && this.direction != DOWN ? distance({x:currentTile.x, y:currentTile.y - 1}, target ) : INFINITY},
	                 {direction: LEFT, distance: this.canLeft() && this.direction != RIGHT ? distance( {x:currentTile.x - 1, y:currentTile.y }, target ) : INFINITY},
	                 {direction: DOWN, distance: this.canDown() && this.direction != UP ? distance({x:currentTile.x, y:currentTile.y + 1}, target ) : INFINITY},
	                 {direction: RIGHT, distance: this.canRight() && this.direction != LEFT ? distance({x:currentTile.x + 1, y:currentTile.y}, target ) : INFINITY},
                 ];
			} else {
				distances = [
		             {direction: UP, distance: this.canUp() && this.direction != DOWN ? 1 : INFINITY},
		             {direction: LEFT, distance: (inTunnel && this.direction == LEFT ) || (this.canLeft() && this.direction != RIGHT) ? 1 : INFINITY},
		             {direction: DOWN, distance: this.canDown() && this.direction != UP ? 1 : INFINITY},
		             {direction: RIGHT, distance: (inTunnel && this.direction == RIGHT ) || (this.canRight() && this.direction != LEFT) ? 1 : INFINITY},
	             ];
			}
			distances.sort( function(a, b) {
				if( a.distance == b.distance )
					return a.direction - b.direction;
				return a.distance - b.distance;
			})
			var selected = distances[0];
			
			switch( selected.direction ) {
			case LEFT :
				if( this.direction != LEFT ) 
					this.left();
				break;
			case RIGHT :
				if( this.direction != RIGHT )
					this.right();
				break;
			case UP :
				if( this.direction != UP )
					this.up();
				break;
			case DOWN :
				if( this.direction != DOWN )
					this.down();
				break;
			}
		}

		var inTunnel = this.isInTunnel();
		if( this.x < 0 )
			this.x += PLAYGROUND_WIDTH;
		if( this.x > PLAYGROUND_WIDTH )
			this.x -= PLAYGROUND_WIDTH;
		
	},
	
	eaten : function(target) {
		if( typeof target === "undefined" )
			target = this;
		if( target.getTile() == Game.pacman.getTile() ) {
//			console.log(" Eaten from ghost" );
			Game.pacman.eatGhost(target);
//			if( target.state != Game.GHOST_STATE_FRIGHTENED && target.state != Game.GHOST_STATE_EATEN ) {
//				Game.die();
//			} else {
//				target.state_to(Game.GHOST_STATE_EATEN);
//				Game.eatGhost(this);
//			}
		}
	}
};

heriter(Ghost.prototype, Actor.prototype); 
