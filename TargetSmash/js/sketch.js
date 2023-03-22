let spriteSheet, bg;
let animations = [];

let bgmSynth = new Tone.PolySynth({maxPolyphony: 50}).toDestination();
bgmSynth.volume.value = -10;


const pointSynth = new Tone.Synth({
  oscillator: {
    type: "square"
  },
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0,
    release: 0.2
  }
}).toDestination();
pointSynth.volume.value = -15;
const pointFilter = new Tone.Filter({
  type: "lowpass",
  frequency: 5000,
  rolloff: -12,
  Q: 1
}).toDestination();
pointSynth.connect(pointFilter);

const GameState = {
  Start: "Start",
  Playing: "Playing",
  GameOver: "GameOver"
};

let game = { score: 0, maxScore: 0, maxTime: 30, elapsedTime: 0, totalSprites: 50, state: GameState.Start};
let musicPlaying, fanfared, congratulated = false;

function preload() {
  spriteSheet = loadImage("assets/targets.png");
  bg = loadImage("assets/bgAGAIN.jpg");
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
  playIntro();
  for(let i=0; i < game.totalSprites; i++) {
    animations[i] = new WalkingAnimation(spriteSheet,32,32,random(25,375),random(25,375),9,0.5,5,random([0,1]));
  }
}

function playMidi(synth, song) {
  song.tracks.forEach(track => {
    const notes = track.notes
    notes.forEach(note => {
      synth.triggerAttackRelease(note.name, note.duration, note.time)
    })
  })
  console.log(synth + " playing\n");
  musicPlaying = true;
}

function stopMidi(synth){
  synth.dispose();
  console.log(synth + " stopped\n");
  musicPlaying = false;
}

function draw() {
  switch(game.state) {

    case GameState.Playing:                                           //Gameplay
      image(bg,0,0);
      if (!musicPlaying) {
        playMidi(bgmSynth, bgm);
      }
      for(let i=0; i < animations.length; i++) {
        animations[i].draw();
      }
      fill(255);
      stroke(0);
      strokeWeight(2);
      textSize(40);
      textFont("Comic Sans");
      text(game.score,20,40);
      let currentTime = game.maxTime - game.elapsedTime;
      text(ceil(currentTime), 370,40);
      game.elapsedTime += deltaTime / 1000;
      if (currentTime < 0)
        game.state = GameState.GameOver;
      break;

    case GameState.GameOver:                                            //Game Over Screen
      game.maxScore = max(game.score,game.maxScore);
      background(0);
  
      while (musicPlaying) {
         stopMidi(bgmSynth);
      }

      if (!fanfared) playFanfare();
      fill(255);
      textSize(40);
      textAlign(CENTER);
      text("Game Over!",200,200);
      textSize(25);
      
      if(game.score == 50){ 
        text("Score: " + game.score,200,290);
        textStyle(BOLD)
        fill(0,255,0)
        text("Perfect Score!",200,320)
        if (!congratulated) playCongrats();
      }
      else{
        text("Score: " + game.score + "/50",200,290);
        text("High Score: " + game.maxScore + "/50",200,320);
      }
      break;

    case GameState.Start:                                               //Intro Screen
      background(0);
      fill(255);
      textSize(50);
      textAlign(CENTER);
      text("Target Smash",200,200);
      textSize(30);
      text("Press Any Key to Start",200,300);
      break;
  }
}

function playFanfare() {                                                                        //making sure audio is not endlessly looped
  const fanfare = new Tone.Player("assets/fanfare.mp3").toDestination();
  fanfare.autostart = true;
  fanfared = true;
}

function playIntro(){
  const intro = new Tone.Player("assets/intro.mp3").toDestination();
  intro.autostart = true;
}

function playCongrats(){
  const congrats = new Tone.Player("assets/congrats.mp3").toDestination();
  congrats.autostart = true;
  congratulated = true;
}

function keyPressed(){
  switch(game.state){
    case GameState.Start:
      game.state = GameState.Playing;
      break;
    case GameState.GameOver:
      location.reload();
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
            pointSound.forEach(({ note, time }, i) => {
              pointSynth.triggerAttackRelease(note, time, `+${i * time}`);
            });
            pointFilter.frequency.rampTo(200, 0.5);

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

let pointSound = [  
  { note: "C5", time: 0.05 },
  { note: "C6", time: 0.05 },
  { note: "G6", time: 0.05 },
  { note: "C7", time: 0.05 }
];

let bgm = {
  "header": {
    "keySignatures": [],
    "meta": [],
    "name": "",
    "ppq": 384,
    "tempos": [
      {
        "bpm": 145.00003625000906,
        "ticks": 0
      }
    ],
    "timeSignatures": [
      {
        "ticks": 0,
        "timeSignature": [
          1,
          4
        ],
        "measures": 0
      }
    ]
  },
  "tracks": [
    {
      "channel": 0,
      "controlChanges": {},
      "pitchBends": [],
      "instrument": {
        "family": "piano",
        "number": 0,
        "name": "acoustic grand piano"
      },
      "name": "Elec. Piano (Classic)",
      "notes": [
        {
          "duration": 0.10344825,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 0,
          "time": 0,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 0,
          "time": 0,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 0,
          "time": 0,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 0,
          "time": 0,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 288,
          "time": 0.31034475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999996,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 384,
          "time": 0.413793,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999996,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 384,
          "time": 0.413793,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999996,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 384,
          "time": 0.413793,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 576,
          "time": 0.6206895,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 672,
          "time": 0.72413775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 672,
          "time": 0.72413775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 672,
          "time": 0.72413775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999991,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 864,
          "time": 0.9310342500000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 960,
          "time": 1.0344825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 960,
          "time": 1.0344825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 960,
          "time": 1.0344825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 1152,
          "time": 1.241379,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 1344,
          "time": 1.4482755,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 1344,
          "time": 1.4482755,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 1344,
          "time": 1.4482755,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 1536,
          "time": 1.655172,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 1632,
          "time": 1.75862025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 1632,
          "time": 1.75862025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 1632,
          "time": 1.75862025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.1034482499999998,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 1824,
          "time": 1.9655167500000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 1920,
          "time": 2.068965,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 1920,
          "time": 2.068965,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 1920,
          "time": 2.068965,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 2112,
          "time": 2.2758615,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 2208,
          "time": 2.37930975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 2208,
          "time": 2.37930975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 2208,
          "time": 2.37930975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 2400,
          "time": 2.58620625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 2496,
          "time": 2.6896545,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 2496,
          "time": 2.6896545,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 2496,
          "time": 2.6896545,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 2688,
          "time": 2.896551,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 2688,
          "time": 2.896551,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 2688,
          "time": 2.896551,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 2688,
          "time": 2.896551,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 2880,
          "time": 3.1034475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 2880,
          "time": 3.1034475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 2880,
          "time": 3.1034475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 3072,
          "time": 3.310344,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 3168,
          "time": 3.41379225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 3168,
          "time": 3.41379225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 3168,
          "time": 3.41379225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 3360,
          "time": 3.6206887500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 3456,
          "time": 3.7241370000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 3456,
          "time": 3.7241370000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 3456,
          "time": 3.7241370000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000002,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 3648,
          "time": 3.9310335000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 3744,
          "time": 4.03448175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 3744,
          "time": 4.03448175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 3744,
          "time": 4.03448175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 3936,
          "time": 4.24137825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 4032,
          "time": 4.3448265,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 4032,
          "time": 4.3448265,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 4032,
          "time": 4.3448265,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 4224,
          "time": 4.551723,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 4416,
          "time": 4.7586195,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 4416,
          "time": 4.7586195,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 4416,
          "time": 4.7586195,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 4608,
          "time": 4.965516,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 4704,
          "time": 5.0689642500000005,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 4704,
          "time": 5.0689642500000005,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 4704,
          "time": 5.0689642500000005,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 4896,
          "time": 5.2758607500000005,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 4992,
          "time": 5.379309,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 4992,
          "time": 5.379309,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 4992,
          "time": 5.379309,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 5184,
          "time": 5.5862055,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 5280,
          "time": 5.689653750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 5280,
          "time": 5.689653750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 5280,
          "time": 5.689653750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 5472,
          "time": 5.896550250000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 5568,
          "time": 5.9999985,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 5568,
          "time": 5.9999985,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 5568,
          "time": 5.9999985,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 5760,
          "time": 6.206895,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 5760,
          "time": 6.206895,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 5760,
          "time": 6.206895,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 5760,
          "time": 6.206895,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 5952,
          "time": 6.4137915,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 5952,
          "time": 6.4137915,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 5952,
          "time": 6.4137915,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 5952,
          "time": 6.4137915,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 6144,
          "time": 6.620688,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 45,
          "name": "A2",
          "ticks": 6144,
          "time": 6.620688,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 6144,
          "time": 6.620688,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 6144,
          "time": 6.620688,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 6240,
          "time": 6.72413625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 6336,
          "time": 6.8275845,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 6432,
          "time": 6.93103275,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 6528,
          "time": 7.034481,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 6624,
          "time": 7.13792925,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 6720,
          "time": 7.2413775000000005,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 6816,
          "time": 7.34482575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 6912,
          "time": 7.4482740000000005,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 7008,
          "time": 7.55172225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 7104,
          "time": 7.6551705000000005,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 7200,
          "time": 7.75861875,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 7296,
          "time": 7.862067000000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000046,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 7392,
          "time": 7.96551525,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 7488,
          "time": 8.0689635,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 7584,
          "time": 8.17241175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 7680,
          "time": 8.27586,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 7680,
          "time": 8.27586,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 7680,
          "time": 8.27586,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 7680,
          "time": 8.27586,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 7776,
          "time": 8.379308250000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 7872,
          "time": 8.4827565,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 7968,
          "time": 8.58620475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 8064,
          "time": 8.689653,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 8160,
          "time": 8.793101250000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 8256,
          "time": 8.8965495,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 8352,
          "time": 8.99999775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 8448,
          "time": 9.103446,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 8544,
          "time": 9.206894250000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 8640,
          "time": 9.3103425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 8736,
          "time": 9.41379075,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 8832,
          "time": 9.517239,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 8928,
          "time": 9.620687250000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 9024,
          "time": 9.724135500000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 9120,
          "time": 9.82758375,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 9216,
          "time": 9.931032,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 9216,
          "time": 9.931032,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 9216,
          "time": 9.931032,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 43,
          "name": "G2",
          "ticks": 9216,
          "time": 9.931032,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 9312,
          "time": 10.03448025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 9408,
          "time": 10.137928500000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 9504,
          "time": 10.24137675,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 9600,
          "time": 10.344825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 9696,
          "time": 10.44827325,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 9792,
          "time": 10.551721500000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 9888,
          "time": 10.65516975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 9984,
          "time": 10.758618,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 10080,
          "time": 10.86206625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 10176,
          "time": 10.965514500000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 10272,
          "time": 11.06896275,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 10368,
          "time": 11.172411,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 10464,
          "time": 11.27585925,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 10560,
          "time": 11.379307500000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 10656,
          "time": 11.48275575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 10752,
          "time": 11.586204,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 10752,
          "time": 11.586204,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 10752,
          "time": 11.586204,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 10752,
          "time": 11.586204,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 10848,
          "time": 11.68965225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 10944,
          "time": 11.793100500000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 11040,
          "time": 11.896548750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 11136,
          "time": 11.999997,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 11232,
          "time": 12.10344525,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 11328,
          "time": 12.206893500000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 11424,
          "time": 12.310341750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 11520,
          "time": 12.41379,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 11520,
          "time": 12.41379,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 11520,
          "time": 12.41379,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 11520,
          "time": 12.41379,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 11616,
          "time": 12.51723825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 80,
          "name": "G#5",
          "ticks": 11712,
          "time": 12.620686500000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 11808,
          "time": 12.724134750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 11904,
          "time": 12.827583,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 80,
          "name": "G#5",
          "ticks": 12000,
          "time": 12.93103125,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 12096,
          "time": 13.034479500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 12096,
          "time": 13.034479500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 12096,
          "time": 13.034479500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 12096,
          "time": 13.034479500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 12096,
          "time": 13.034479500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 12192,
          "time": 13.137927750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 12288,
          "time": 13.241376,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 12384,
          "time": 13.34482425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 12384,
          "time": 13.34482425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 12384,
          "time": 13.34482425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 12384,
          "time": 13.34482425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 12384,
          "time": 13.34482425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 12384,
          "time": 13.34482425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 12384,
          "time": 13.34482425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 12384,
          "time": 13.34482425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 12384,
          "time": 13.34482425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 12480,
          "time": 13.4482725,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 12576,
          "time": 13.551720750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 12672,
          "time": 13.655169,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 12672,
          "time": 13.655169,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 12672,
          "time": 13.655169,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 12672,
          "time": 13.655169,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 12672,
          "time": 13.655169,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 12768,
          "time": 13.75861725,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 12864,
          "time": 13.8620655,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 12960,
          "time": 13.965513750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 12960,
          "time": 13.965513750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 12960,
          "time": 13.965513750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 12960,
          "time": 13.965513750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 12960,
          "time": 13.965513750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 13056,
          "time": 14.068962,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 13152,
          "time": 14.17241025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 13248,
          "time": 14.2758585,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 13248,
          "time": 14.2758585,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 13248,
          "time": 14.2758585,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 13248,
          "time": 14.2758585,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 13248,
          "time": 14.2758585,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 13344,
          "time": 14.379306750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 13440,
          "time": 14.482755000000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 13536,
          "time": 14.58620325,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 13632,
          "time": 14.6896515,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 13632,
          "time": 14.6896515,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 13632,
          "time": 14.6896515,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 13632,
          "time": 14.6896515,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 13728,
          "time": 14.793099750000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 13824,
          "time": 14.896548000000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 13920,
          "time": 14.99999625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 13920,
          "time": 14.99999625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 13920,
          "time": 14.99999625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 13920,
          "time": 14.99999625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 13920,
          "time": 14.99999625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 14016,
          "time": 15.1034445,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 14112,
          "time": 15.206892750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 14208,
          "time": 15.310341000000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 14208,
          "time": 15.310341000000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 14208,
          "time": 15.310341000000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 14208,
          "time": 15.310341000000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 14208,
          "time": 15.310341000000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 14304,
          "time": 15.41378925,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 14400,
          "time": 15.5172375,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 14496,
          "time": 15.620685750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 14496,
          "time": 15.620685750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 14496,
          "time": 15.620685750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 14496,
          "time": 15.620685750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 14496,
          "time": 15.620685750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 14592,
          "time": 15.724134000000001,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 14688,
          "time": 15.82758225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 14784,
          "time": 15.9310305,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 14784,
          "time": 15.9310305,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 14784,
          "time": 15.9310305,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 14784,
          "time": 15.9310305,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000135,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 14784,
          "time": 15.9310305,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 14880,
          "time": 16.03447875,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 14976,
          "time": 16.137927,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 14976,
          "time": 16.137927,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 14976,
          "time": 16.137927,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 14976,
          "time": 16.137927,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 14976,
          "time": 16.137927,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 15072,
          "time": 16.24137525,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 15168,
          "time": 16.3448235,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 15168,
          "time": 16.3448235,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 15168,
          "time": 16.3448235,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 15168,
          "time": 16.3448235,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 15264,
          "time": 16.44827175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 15360,
          "time": 16.55172,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 15456,
          "time": 16.65516825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 15456,
          "time": 16.65516825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 15456,
          "time": 16.65516825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 15456,
          "time": 16.65516825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 15552,
          "time": 16.758616500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 15648,
          "time": 16.862064750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 15744,
          "time": 16.965513,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 15744,
          "time": 16.965513,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 15744,
          "time": 16.965513,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 15744,
          "time": 16.965513,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 15840,
          "time": 17.06896125,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 15936,
          "time": 17.1724095,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 16032,
          "time": 17.27585775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 16032,
          "time": 17.27585775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 16032,
          "time": 17.27585775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 16032,
          "time": 17.27585775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 16128,
          "time": 17.379306,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 16224,
          "time": 17.48275425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 16320,
          "time": 17.586202500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 16320,
          "time": 17.586202500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 16320,
          "time": 17.586202500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 16320,
          "time": 17.586202500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 16416,
          "time": 17.689650750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 16512,
          "time": 17.793099,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 16608,
          "time": 17.89654725,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 16608,
          "time": 17.89654725,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 16608,
          "time": 17.89654725,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 16608,
          "time": 17.89654725,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 16608,
          "time": 17.89654725,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 16704,
          "time": 17.9999955,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 16800,
          "time": 18.10344375,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 16896,
          "time": 18.206892,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 16992,
          "time": 18.31034025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 16992,
          "time": 18.31034025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 16992,
          "time": 18.31034025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 16992,
          "time": 18.31034025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 17088,
          "time": 18.413788500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 17184,
          "time": 18.517236750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 17280,
          "time": 18.620685,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 17280,
          "time": 18.620685,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 17280,
          "time": 18.620685,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 17280,
          "time": 18.620685,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 17376,
          "time": 18.72413325,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 17472,
          "time": 18.8275815,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 17568,
          "time": 18.93102975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 17568,
          "time": 18.93102975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 17568,
          "time": 18.93102975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 17568,
          "time": 18.93102975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 17664,
          "time": 19.034478,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 17760,
          "time": 19.13792625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 17856,
          "time": 19.241374500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 17856,
          "time": 19.241374500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 56,
          "name": "G#3",
          "ticks": 17856,
          "time": 19.241374500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 80,
          "name": "G#5",
          "ticks": 17856,
          "time": 19.241374500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 17952,
          "time": 19.344822750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 18048,
          "time": 19.448271000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 18048,
          "time": 19.448271000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 18048,
          "time": 19.448271000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 18048,
          "time": 19.448271000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 80,
          "name": "G#5",
          "ticks": 18144,
          "time": 19.55171925,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 18240,
          "time": 19.6551675,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 18240,
          "time": 19.6551675,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 18240,
          "time": 19.6551675,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 18240,
          "time": 19.6551675,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 18240,
          "time": 19.6551675,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 18336,
          "time": 19.75861575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 84,
          "name": "C6",
          "ticks": 18432,
          "time": 19.862064,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 18432,
          "time": 19.862064,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 86,
          "name": "D6",
          "ticks": 18528,
          "time": 19.96551225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 18528,
          "time": 19.96551225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 18624,
          "time": 20.0689605,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 88,
          "name": "E6",
          "ticks": 18624,
          "time": 20.0689605,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 18720,
          "time": 20.172408750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 90,
          "name": "F#6",
          "ticks": 18720,
          "time": 20.172408750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 91,
          "name": "G6",
          "ticks": 18912,
          "time": 20.37930525,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 18912,
          "time": 20.37930525,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 19104,
          "time": 20.58620175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 93,
          "name": "A6",
          "ticks": 19104,
          "time": 20.58620175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 80,
          "name": "G#5",
          "ticks": 19968,
          "time": 21.517236,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 19968,
          "time": 21.517236,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 19968,
          "time": 21.517236,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 19968,
          "time": 21.517236,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 19968,
          "time": 21.517236,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 20064,
          "time": 21.62068425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 20160,
          "time": 21.7241325,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 20256,
          "time": 21.827580750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 20352,
          "time": 21.931029000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 75,
          "name": "D#5",
          "ticks": 20352,
          "time": 21.931029000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 20352,
          "time": 21.931029000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 20352,
          "time": 21.931029000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 20352,
          "time": 21.931029000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 20448,
          "time": 22.034477250000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 20544,
          "time": 22.1379255,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 20544,
          "time": 22.1379255,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 20544,
          "time": 22.1379255,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 20544,
          "time": 22.1379255,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 20544,
          "time": 22.1379255,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 20640,
          "time": 22.24137375,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 20640,
          "time": 22.24137375,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 20640,
          "time": 22.24137375,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 20640,
          "time": 22.24137375,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 20640,
          "time": 22.24137375,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 20736,
          "time": 22.344822,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 20832,
          "time": 22.44827025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 20832,
          "time": 22.44827025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 20832,
          "time": 22.44827025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 20832,
          "time": 22.44827025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 20832,
          "time": 22.44827025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 20928,
          "time": 22.5517185,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 21024,
          "time": 22.655166750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 21024,
          "time": 22.655166750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 21024,
          "time": 22.655166750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 21024,
          "time": 22.655166750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 21024,
          "time": 22.655166750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 21120,
          "time": 22.758615000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 21120,
          "time": 22.758615000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 21120,
          "time": 22.758615000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 21120,
          "time": 22.758615000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 21120,
          "time": 22.758615000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 21216,
          "time": 22.862063250000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 21312,
          "time": 22.9655115,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 21312,
          "time": 22.9655115,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 21312,
          "time": 22.9655115,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 21312,
          "time": 22.9655115,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 21312,
          "time": 22.9655115,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 21408,
          "time": 23.06895975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 21408,
          "time": 23.06895975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 21408,
          "time": 23.06895975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 21408,
          "time": 23.06895975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 21408,
          "time": 23.06895975,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 80,
          "name": "G#5",
          "ticks": 21504,
          "time": 23.172408,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 21504,
          "time": 23.172408,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 21504,
          "time": 23.172408,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 21504,
          "time": 23.172408,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 21504,
          "time": 23.172408,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 21600,
          "time": 23.27585625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 21696,
          "time": 23.3793045,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 80,
          "name": "G#5",
          "ticks": 21792,
          "time": 23.48275275,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 21888,
          "time": 23.586201000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 21888,
          "time": 23.586201000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 21888,
          "time": 23.586201000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 21888,
          "time": 23.586201000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 21888,
          "time": 23.586201000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 21984,
          "time": 23.689649250000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 22080,
          "time": 23.793097500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 22080,
          "time": 23.793097500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 80,
          "name": "G#5",
          "ticks": 22080,
          "time": 23.793097500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 22080,
          "time": 23.793097500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 22080,
          "time": 23.793097500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 22176,
          "time": 23.89654575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 22176,
          "time": 23.89654575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 22176,
          "time": 23.89654575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 22176,
          "time": 23.89654575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 22176,
          "time": 23.89654575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 22272,
          "time": 23.999994,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 22368,
          "time": 24.10344225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 80,
          "name": "G#5",
          "ticks": 22368,
          "time": 24.10344225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 22368,
          "time": 24.10344225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 22368,
          "time": 24.10344225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 22368,
          "time": 24.10344225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 22464,
          "time": 24.2068905,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 22560,
          "time": 24.31033875,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 22560,
          "time": 24.31033875,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 22560,
          "time": 24.31033875,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 22560,
          "time": 24.31033875,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 22560,
          "time": 24.31033875,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 22656,
          "time": 24.413787000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 22656,
          "time": 24.413787000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 22656,
          "time": 24.413787000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 22656,
          "time": 24.413787000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 22848,
          "time": 24.620683500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 22848,
          "time": 24.620683500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 22848,
          "time": 24.620683500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 22848,
          "time": 24.620683500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 22944,
          "time": 24.72413175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 22944,
          "time": 24.72413175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 22944,
          "time": 24.72413175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 22944,
          "time": 24.72413175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 23040,
          "time": 24.82758,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 23040,
          "time": 24.82758,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 23040,
          "time": 24.82758,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 23040,
          "time": 24.82758,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 23040,
          "time": 24.82758,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 23136,
          "time": 24.93102825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 77,
          "name": "F5",
          "ticks": 23232,
          "time": 25.0344765,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 23328,
          "time": 25.13792475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 73,
          "name": "C#5",
          "ticks": 23424,
          "time": 25.241373000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 23424,
          "time": 25.241373000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 23424,
          "time": 25.241373000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 23424,
          "time": 25.241373000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 23424,
          "time": 25.241373000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 23520,
          "time": 25.344821250000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 23616,
          "time": 25.448269500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 23616,
          "time": 25.448269500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 23616,
          "time": 25.448269500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 23616,
          "time": 25.448269500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 23616,
          "time": 25.448269500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 23712,
          "time": 25.55171775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 70,
          "name": "A#4",
          "ticks": 23712,
          "time": 25.55171775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 23712,
          "time": 25.55171775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 23712,
          "time": 25.55171775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 23712,
          "time": 25.55171775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 23808,
          "time": 25.655166,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 23904,
          "time": 25.75861425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 23904,
          "time": 25.75861425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 23904,
          "time": 25.75861425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 23904,
          "time": 25.75861425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 23904,
          "time": 25.75861425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 23904,
          "time": 25.75861425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 24000,
          "time": 25.8620625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 24096,
          "time": 25.96551075,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 24096,
          "time": 25.96551075,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 69,
          "name": "A4",
          "ticks": 24096,
          "time": 25.96551075,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 24096,
          "time": 25.96551075,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 24096,
          "time": 25.96551075,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 24192,
          "time": 26.068959000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 24192,
          "time": 26.068959000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 24192,
          "time": 26.068959000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 24192,
          "time": 26.068959000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 24192,
          "time": 26.068959000000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 24288,
          "time": 26.172407250000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 24384,
          "time": 26.275855500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 24384,
          "time": 26.275855500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 24384,
          "time": 26.275855500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 77,
          "name": "F5",
          "ticks": 24384,
          "time": 26.275855500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 24384,
          "time": 26.275855500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 24480,
          "time": 26.379303750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 24480,
          "time": 26.379303750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 24480,
          "time": 26.379303750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 24480,
          "time": 26.379303750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 24480,
          "time": 26.379303750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 24576,
          "time": 26.482752,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 24576,
          "time": 26.482752,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 24576,
          "time": 26.482752,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 24576,
          "time": 26.482752,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 58,
          "name": "A#3",
          "ticks": 24576,
          "time": 26.482752,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 24864,
          "time": 26.79309675,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 24864,
          "time": 26.79309675,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 24960,
          "time": 26.896545,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 24960,
          "time": 26.896545,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 58,
          "name": "A#3",
          "ticks": 24960,
          "time": 26.896545,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 24960,
          "time": 26.896545,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 25152,
          "time": 27.103441500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 25152,
          "time": 27.103441500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 25152,
          "time": 27.103441500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 25152,
          "time": 27.103441500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 58,
          "name": "A#3",
          "ticks": 25152,
          "time": 27.103441500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 25152,
          "time": 27.103441500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 25152,
          "time": 27.103441500000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 25248,
          "time": 27.206889750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 25248,
          "time": 27.206889750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 25248,
          "time": 27.206889750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 58,
          "name": "A#3",
          "ticks": 25248,
          "time": 27.206889750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 82,
          "name": "A#5",
          "ticks": 25440,
          "time": 27.41378625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 25440,
          "time": 27.41378625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 25440,
          "time": 27.41378625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 58,
          "name": "A#3",
          "ticks": 25440,
          "time": 27.41378625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 25440,
          "time": 27.41378625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 25440,
          "time": 27.41378625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 25440,
          "time": 27.41378625,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 25632,
          "time": 27.62068275,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 25632,
          "time": 27.62068275,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 58,
          "name": "A#3",
          "ticks": 25632,
          "time": 27.62068275,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 25632,
          "time": 27.62068275,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 71,
          "name": "B4",
          "ticks": 25728,
          "time": 27.724131,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 74,
          "name": "D5",
          "ticks": 25728,
          "time": 27.724131,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 25728,
          "time": 27.724131,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 25728,
          "time": 27.724131,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 58,
          "name": "A#3",
          "ticks": 25728,
          "time": 27.724131,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 25728,
          "time": 27.724131,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 80,
          "name": "G#5",
          "ticks": 25728,
          "time": 27.724131,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 25920,
          "time": 27.931027500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 81,
          "name": "A5",
          "ticks": 25920,
          "time": 27.931027500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 25920,
          "time": 27.931027500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 58,
          "name": "A#3",
          "ticks": 25920,
          "time": 27.931027500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 25920,
          "time": 27.931027500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 72,
          "name": "C5",
          "ticks": 25920,
          "time": 27.931027500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 25920,
          "time": 27.931027500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 58,
          "name": "A#3",
          "ticks": 26016,
          "time": 28.034475750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 26016,
          "time": 28.034475750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 26016,
          "time": 28.034475750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 26016,
          "time": 28.034475750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 79,
          "name": "G5",
          "ticks": 26112,
          "time": 28.137924,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 26112,
          "time": 28.137924,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 26112,
          "time": 28.137924,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 26112,
          "time": 28.137924,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 26208,
          "time": 28.24137225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 26208,
          "time": 28.24137225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 26208,
          "time": 28.24137225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 26208,
          "time": 28.24137225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 26496,
          "time": 28.551717,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 26496,
          "time": 28.551717,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 26496,
          "time": 28.551717,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 26496,
          "time": 28.551717,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 26496,
          "time": 28.551717,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 26496,
          "time": 28.551717,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 26496,
          "time": 28.551717,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 26688,
          "time": 28.758613500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 26688,
          "time": 28.758613500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 26688,
          "time": 28.758613500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 26784,
          "time": 28.862061750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 26784,
          "time": 28.862061750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 26784,
          "time": 28.862061750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 26784,
          "time": 28.862061750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 26784,
          "time": 28.862061750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 26784,
          "time": 28.862061750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 26784,
          "time": 28.862061750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 26976,
          "time": 29.06895825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 26976,
          "time": 29.06895825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 26976,
          "time": 29.06895825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 27072,
          "time": 29.1724065,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 27072,
          "time": 29.1724065,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 27072,
          "time": 29.1724065,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 27072,
          "time": 29.1724065,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 27168,
          "time": 29.27585475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 27168,
          "time": 29.27585475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 27168,
          "time": 29.27585475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 27264,
          "time": 29.379303,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 27264,
          "time": 29.379303,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344825000000313,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 27264,
          "time": 29.379303,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 27456,
          "time": 29.586199500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 27456,
          "time": 29.586199500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 27456,
          "time": 29.586199500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 27456,
          "time": 29.586199500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 27456,
          "time": 29.586199500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 27456,
          "time": 29.586199500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 27552,
          "time": 29.689647750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 27552,
          "time": 29.689647750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 27552,
          "time": 29.689647750000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 27648,
          "time": 29.793096000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 27648,
          "time": 29.793096000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 78,
          "name": "F#5",
          "ticks": 27648,
          "time": 29.793096000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 27648,
          "time": 29.793096000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 27744,
          "time": 29.89654425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 27744,
          "time": 29.89654425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 27744,
          "time": 29.89654425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 27744,
          "time": 29.89654425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 28032,
          "time": 30.206889,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 28032,
          "time": 30.206889,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 28032,
          "time": 30.206889,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 28032,
          "time": 30.206889,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 28032,
          "time": 30.206889,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 28032,
          "time": 30.206889,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 28032,
          "time": 30.206889,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 28224,
          "time": 30.413785500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 28224,
          "time": 30.413785500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 28224,
          "time": 30.413785500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 28320,
          "time": 30.517233750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 28320,
          "time": 30.517233750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 28320,
          "time": 30.517233750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 28320,
          "time": 30.517233750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 28320,
          "time": 30.517233750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 28320,
          "time": 30.517233750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 28320,
          "time": 30.517233750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 28512,
          "time": 30.72413025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 28512,
          "time": 30.72413025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 28512,
          "time": 30.72413025,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 28608,
          "time": 30.8275785,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 28608,
          "time": 30.8275785,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 28608,
          "time": 30.8275785,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 28608,
          "time": 30.8275785,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 28704,
          "time": 30.93102675,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 28704,
          "time": 30.93102675,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 28704,
          "time": 30.93102675,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 28800,
          "time": 31.034475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 28800,
          "time": 31.034475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 28800,
          "time": 31.034475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 28800,
          "time": 31.034475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 28800,
          "time": 31.034475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 28800,
          "time": 31.034475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 28800,
          "time": 31.034475,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 66,
          "name": "F#4",
          "ticks": 28992,
          "time": 31.241371500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 28992,
          "time": 31.241371500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 28992,
          "time": 31.241371500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 28992,
          "time": 31.241371500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 28992,
          "time": 31.241371500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 28992,
          "time": 31.241371500000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 54,
          "name": "F#3",
          "ticks": 29088,
          "time": 31.344819750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 29088,
          "time": 31.344819750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 29088,
          "time": 31.344819750000003,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 77,
          "name": "F5",
          "ticks": 29184,
          "time": 31.448268000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 29184,
          "time": 31.448268000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 53,
          "name": "F3",
          "ticks": 29184,
          "time": 31.448268000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 29184,
          "time": 31.448268000000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 29280,
          "time": 31.551716250000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 29280,
          "time": 31.551716250000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 29280,
          "time": 31.551716250000002,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 29568,
          "time": 31.862061,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 53,
          "name": "F3",
          "ticks": 29568,
          "time": 31.862061,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 29568,
          "time": 31.862061,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 29568,
          "time": 31.862061,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 29568,
          "time": 31.862061,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 29568,
          "time": 31.862061,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 53,
          "name": "F3",
          "ticks": 29760,
          "time": 32.0689575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 29760,
          "time": 32.0689575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 29760,
          "time": 32.0689575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 29856,
          "time": 32.17240575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 29856,
          "time": 32.17240575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 29856,
          "time": 32.17240575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 29856,
          "time": 32.17240575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 53,
          "name": "F3",
          "ticks": 29856,
          "time": 32.17240575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 29856,
          "time": 32.17240575,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 30048,
          "time": 32.37930225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 30048,
          "time": 32.37930225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 53,
          "name": "F3",
          "ticks": 30048,
          "time": 32.37930225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 30144,
          "time": 32.4827505,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 30144,
          "time": 32.4827505,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 59,
          "name": "B3",
          "ticks": 30144,
          "time": 32.4827505,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 53,
          "name": "F3",
          "ticks": 30240,
          "time": 32.58619875,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 30240,
          "time": 32.58619875,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 30240,
          "time": 32.58619875,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 30336,
          "time": 32.689647,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 30336,
          "time": 32.689647,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 53,
          "name": "F3",
          "ticks": 30336,
          "time": 32.689647,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 30528,
          "time": 32.8965435,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 65,
          "name": "F4",
          "ticks": 30528,
          "time": 32.8965435,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 30528,
          "time": 32.8965435,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 30528,
          "time": 32.8965435,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 57,
          "name": "A3",
          "ticks": 30528,
          "time": 32.8965435,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 30528,
          "time": 32.8965435,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 53,
          "name": "F3",
          "ticks": 30528,
          "time": 32.8965435,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 30624,
          "time": 32.99999175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 30624,
          "time": 32.99999175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 53,
          "name": "F3",
          "ticks": 30624,
          "time": 32.99999175,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 30720,
          "time": 33.10344,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 30720,
          "time": 33.10344,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 46,
          "name": "A#2",
          "ticks": 30720,
          "time": 33.10344,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 30720,
          "time": 33.10344,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 76,
          "name": "E5",
          "ticks": 30720,
          "time": 33.10344,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 30816,
          "time": 33.20688825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 30816,
          "time": 33.20688825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 30816,
          "time": 33.20688825,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 31104,
          "time": 33.517233000000004,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 31104,
          "time": 33.517233000000004,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 31104,
          "time": 33.517233000000004,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 46,
          "name": "A#2",
          "ticks": 31104,
          "time": 33.517233000000004,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 31104,
          "time": 33.517233000000004,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 31104,
          "time": 33.517233000000004,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 31104,
          "time": 33.517233000000004,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 31296,
          "time": 33.724129500000004,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 31296,
          "time": 33.724129500000004,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 31296,
          "time": 33.724129500000004,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 46,
          "name": "A#2",
          "ticks": 31296,
          "time": 33.724129500000004,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 31392,
          "time": 33.82757775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 31392,
          "time": 33.82757775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 55,
          "name": "G3",
          "ticks": 31392,
          "time": 33.82757775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 31392,
          "time": 33.82757775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 46,
          "name": "A#2",
          "ticks": 31392,
          "time": 33.82757775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 31392,
          "time": 33.82757775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 48,
          "name": "C3",
          "ticks": 31392,
          "time": 33.82757775,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 31584,
          "time": 34.03447425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 31584,
          "time": 34.03447425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 56,
          "name": "G#3",
          "ticks": 31584,
          "time": 34.03447425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 31584,
          "time": 34.03447425,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 56,
          "name": "G#3",
          "ticks": 31680,
          "time": 34.1379225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 31680,
          "time": 34.1379225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 31680,
          "time": 34.1379225,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 31776,
          "time": 34.24137075,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 31776,
          "time": 34.24137075,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 56,
          "name": "G#3",
          "ticks": 31776,
          "time": 34.24137075,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 31776,
          "time": 34.24137075,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 60,
          "name": "C4",
          "ticks": 31872,
          "time": 34.344819,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 31872,
          "time": 34.344819,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 31872,
          "time": 34.344819,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 31872,
          "time": 34.344819,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 31872,
          "time": 34.344819,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 56,
          "name": "G#3",
          "ticks": 31872,
          "time": 34.344819,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 31872,
          "time": 34.344819,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 32064,
          "time": 34.5517155,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 32064,
          "time": 34.5517155,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 64,
          "name": "E4",
          "ticks": 32064,
          "time": 34.5517155,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 32064,
          "time": 34.5517155,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 56,
          "name": "G#3",
          "ticks": 32064,
          "time": 34.5517155,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 67,
          "name": "G4",
          "ticks": 32064,
          "time": 34.5517155,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 62,
          "name": "D4",
          "ticks": 32064,
          "time": 34.5517155,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 47,
          "name": "B2",
          "ticks": 32160,
          "time": 34.65516375,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 50,
          "name": "D3",
          "ticks": 32160,
          "time": 34.65516375,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 52,
          "name": "E3",
          "ticks": 32160,
          "time": 34.65516375,
          "velocity": 0.3937007874015748
        },
        {
          "duration": 0.10344824999999958,
          "durationTicks": 96,
          "midi": 56,
          "name": "G#3",
          "ticks": 32160,
          "time": 34.65516375,
          "velocity": 0.3937007874015748
        }
      ],
      "endOfTrackTicks": 32256
    }
  ]
}