let spritesGuy;
let spritesGirl;
let spritesMonk;
let spritesNinja;

let walkingGuy;
let walkingGirl;
let walkingMonk;
let walkingNinja;

let randBG_R;
let randBG_G;
let randBG_B;
let x=1;
let y=1;

function preload() {
  spritesGuy = loadImage("/assets/SpelunkyGuy.png");
  spritesGirl = loadImage("/assets/SpelunkyGirl.png");
  spritesMonk = loadImage("/assets/SpelunkyMonk.png");
  spritesNinja = loadImage("/assets/SpelunkyNinja.png");
}

function setup() {
  createCanvas(500, 500);
  imageMode(CENTER);
  randBG_R = random(255);
  randBG_G = random(255);
  randBG_B = random(255);
  
  walkingGuy = new WalkingAnimation(spritesGuy,80,80,random(50,450),random(50,100),9);
  walkingGirl = new WalkingAnimation(spritesGirl,80,80,random(50,450),random(110,200),9);
  walkingMonk = new WalkingAnimation(spritesMonk,80,80,random(50,450),random(210,300),9);
  walkingNinja = new WalkingAnimation(spritesNinja,80,80,random(50,450),random(310,450),9);
}

function draw() {
  background(randBG_R, randBG_G, randBG_B);
  
  walkingGuy.draw();
  walkingGirl.draw();
  walkingMonk.draw();
  walkingNinja.draw();
}

function keyPressed() {
  walkingGuy.keyPressed(RIGHT_ARROW,LEFT_ARROW);
  walkingGirl.keyPressed(RIGHT_ARROW, LEFT_ARROW);
  walkingMonk.keyPressed(RIGHT_ARROW, LEFT_ARROW);
  walkingNinja.keyPressed(RIGHT_ARROW, LEFT_ARROW);
}

function keyReleased() {
  walkingGuy.keyReleased(RIGHT_ARROW,LEFT_ARROW);
  walkingGirl.keyReleased(RIGHT_ARROW,LEFT_ARROW);
  walkingMonk.keyReleased(RIGHT_ARROW,LEFT_ARROW);
  walkingNinja.keyReleased(RIGHT_ARROW,LEFT_ARROW);
}

class WalkingAnimation {
  constructor(spritesheet, sw, sh, dx, dy, animationLength, offsetX = 0, offsetY = 0) {
    this.spritesheet = spritesheet;
    this.sw = sw;
    this.sh = sh;
    this.dx = dx;
    this.dy = dy;
    this.u = 0;
    this.v = 0;
    this.animationLength = animationLength;
    this.currentFrame = 0;
    this.moving = 0;
    this.xDirection = 1;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  draw() {
    this.u = (this.moving != 0) ? this.currentFrame % this.animationLength : 0;
    push();
    translate(this.dx,this.dy);
    scale(this.xDirection,1);
  
    image(this.spritesheet,0,0,this.sw,this.sh,this.u*this.sw+this.offsetX,this.v*this.sh+this.offsetY,this.sw,this.sh);
    pop();
    if (frameCount % 6 == 0) {
      this.currentFrame++;
    }
  
    this.dx += this.moving;
  }

  keyPressed(right, left) {
    if (keyCode === right) {
      this.moving = 1;
      this.xDirection = 1;
      this.currentFrame = 1;
    } else if (keyCode === left) {
      this.moving = -1;
      this.xDirection = -1;
      this.currentFrame = 1;
    }
  }

  keyReleased(right,left) {
    if (keyCode === right || keyCode === left) {
      this.moving = 0;
        
    }
  }
}