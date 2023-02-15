let spriteSheet;
let animations = [];

const GameState = {
  Start: "Start",
  Playing: "Playing",
  GameOver: "GameOver"
};

let game = { score: 0, maxScore: 0, maxTime: 30, elapsedTime: 0, totalSprites: 10, state: GameState.Start};

function preload() {
  spriteSheet = loadImage("assets/bug-squish-sprites.png");
}

function setup() {
  createCanvas(400, 400);
  imageMode(CENTER);
  angleMode(DEGREES);

  reset();
}

function reset() {
  game.elapsedTime = 0;
  game.score = 0;
  game.totalSprites = 50;

  for(let i=0; i < game.totalSprites; i++) {
    animations[i] = new WalkingAnimation(spriteSheet,32,32,random(25,375),random(25,375),9,0.5,5,random([0,1]));
  }
}

function draw() {
  switch(game.state) {
    
    case GameState.Playing:
      background(220);
      for(let i=0; i < animations.length; i++) {
        animations[i].draw();
      }
      fill(0);
      textSize(40);
      textFont("Comic Sans");
      text(game.score,20,40);
      let currentTime = game.maxTime - game.elapsedTime;
      text(ceil(currentTime), 300,40);
      game.elapsedTime += deltaTime / 1000;
      if (currentTime < 0)
        game.state = GameState.GameOver;
      break;

    case GameState.GameOver:
      game.maxScore = max(game.score,game.maxScore);
      background(0);
      fill(255);
      textSize(40);
      textAlign(CENTER);
      text("Game Over!",200,200);
      textSize(25);
      if(game.score == 50){ 
        text("Score: " + game.score,200,270);
        textStyle(BOLD)
        fill(0,255,0)
        text("Perfect Score!",200,320)
      }
      else{
        text("Score: " + game.score + "/50",200,270);
        text("Max Score: " + game.maxScore + "/50",200,320);
      }
      break;

    case GameState.Start:
      background(0);
      fill(255);
      textSize(50);
      textAlign(CENTER);
      text("Bug Game",200,200);
      textSize(30);
      text("Press Any Key to Start",200,300);
      break;
  }
}

function keyPressed(){
  switch(game.state){
    case GameState.Start:
      game.state = GameState.Playing;
      break;
    case GameState.GameOver:
      reset();
      game.state = GameState.Playing;
      break;
  }
}

function mousePressed(){
  switch(game.state){
    case GameState.Playing:
      for(let i = 0; i < animations.length; i++){
        let contains = animations[i].contains(mouseX, mouseY);
        if(contains && game.state == GameState.Playing){
          if(animations[i].moving != 0){
            animations[i].stop();
            game.score += 1;
          }
        }
      }
      break;
  }
}
class WalkingAnimation {
  constructor(spritesheet, sw, sh, dx, dy, animationLength, speed, framerate, vertical = false, offsetX = 0, offsetY = 0) {
    this.spritesheet = spritesheet;
    this.sw = sw;
    this.sh = sh;
    this.dx = dx;
    this.dy = dy;
    this.u = 0;
    this.v = 0;
    this.animationLength = animationLength;
    this.currentFrame = 0;
    this.moving = 1;
    this.xDirection = 1;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.speed = speed;
    this.framerate = framerate*speed;
    this.vertical = vertical;
  }

  draw() {

    this.u = (this.moving != 0) ? this.currentFrame % this.animationLength : this.u;
    push();

    translate(this.dx,this.dy);
    if (this.vertical) {
      rotate(180);
      scale(1,this.xDirection);
    }
    else {
      rotate(90);
      scale(1,this.xDirection);
    }

    image(this.spritesheet,0,0,this.sw,this.sh,this.u*this.sw+this.offsetX,this.v*this.sh+this.offsetY,this.sw,this.sh);
    pop();

    let proportionalFramerate = round(frameRate() / this.framerate);
    if (frameCount % proportionalFramerate == 0) {
      this.currentFrame++;
    }
    
    if (this.vertical) {
      this.dy += this.moving*this.speed;
      this.move(this.dy,this.sw / 4,height - this.sw / 4);
    }
    else {
      this.dx += this.moving*this.speed;
      this.move(this.dx,this.sw / 4,width - this.sw / 4);
    }

    if(game.score !=0 && this.speed < 5){
      this.speed += game.score/1000;
    }
  }

  move(position,lowerBounds,upperBounds) {
    if (position > upperBounds) {
      this.moveLeft();
    } else if (position < lowerBounds) {
      this.moveRight();
    }
  }

  moveRight() {
    this.moving = 1;
    this.xDirection = 1;
    this.v = 0;
  }

  moveLeft() {
    this.moving = -1;
    this.xDirection = -1;
    this.v = 0;
  }

  contains(x,y) {
    let insideX = x >= this.dx - 16 && x <= this.dx + 15;
    let insideY = y >= this.dy - 25 && y <= this.dy + 25;
    return insideX && insideY;
  }

  stop() {
    this.moving = 0;
    this.u = 9;
  }
}