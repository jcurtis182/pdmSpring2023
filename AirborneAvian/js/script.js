// Prof. Webb said during proposals that I didn't need to specifically 
// use p5.js, since I already had a working prototype without it, and 
// switching everything to p5 wouldn't be worth the effort required.

let connectButton, port;
let writer, reader;
let encoder = new TextEncoder();
let decoder = new TextDecoder();
let sensorData = {};
let connected = false;
let buttonState = 0, buttonPressed = false;
let isGreen = false;

let move_speed = 3;
let gravity = 0.2;
let pipe_space = 250;
let prev_score = 0;
let score = 0;

let pipe_sprite = document.querySelectorAll('.pipe_sprite');
let pipe_sprite_inv = document.querySelectorAll('.pipe_sprite');

let window_props = document.body.getBoundingClientRect(); // window properties
let background = document.querySelector(".background");
let background_props = background.getBoundingClientRect(); //background properties

let ui_container = document.querySelector('.UI_container'); //title screen
let ui_title = document.querySelector(".UI_title");        
let arduino_msg = document.querySelector(".arduino_msg");   
let score_val = document.querySelector(".score_val");       //score
let score_title = document.querySelector(".score_title");   //score printing
let score_final = document.querySelector(".score_final");   //end screen score
let logo = document.querySelector(".logo");

let bird = document.querySelector(".bird");         //bird properties
let bird_props = bird.getBoundingClientRect();
let bird_width = Math.min(50, window_props.width * 0.1);   //shrink hitbox to be slightly smaller than sprite
let bird_height = bird_width * 0.8; 
bird.style.width = bird_width + "px";
bird.style.height = bird_height + "px";

let musicPlaying = false;
let game_state = "Start";  //start at title screen


if("serial" in navigator) {
  document.querySelector('.connect-btn').style.display = 'inline'; //turn on arduino button if possible
}

async function serialRead() {
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      reader.releaseLock();
      break;
    }
      buttonState = value;
  }
}

async function connect() {
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });
  writer = port.writable.getWriter();
  reader = port.readable.pipeThrough(new TextDecoderStream())
                  .pipeThrough(new TransformStream(new LineBreakTransformer()))
                  .getReader();
  serialRead();
  connected = true;
  console.log(connected);
  arduino_msg.style.display = "block";
}

class LineBreakTransformer{
  constructor(){
      this.chunks = "";
  }
  transform(chunk, controller){
      this.chunks += chunk;
      const lines = this.chunks.split("\n");
      this.chunks = lines.pop();
      lines.forEach((line) => controller.enqueue(line));
  }
  flush(controller){
      controller.enqueue(this.chunks);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key == "Enter" && game_state == "Start") {
    start();
  }
  else if(e.key == 'Enter' && game_state == "End") {
    console.log("Game Over! Refresh attempting...");
    window.location.reload();
  }
});

function start(){
  console.log("Starting game...\n");
    if (musicPlaying == false) playMidi(bgmSynth, gameBGM);
    document.querySelectorAll(".pipe_sprite").forEach((e) => {
      e.remove();
    });
    bird.style.top = "40vh";
    game_state = "Play";
    ui_title.innerHTML = "";
    score_title.innerHTML = "Score : ";
    score_val.innerHTML = "0";
    play();
}

function play() {
  function move() {
    
    if (game_state != "Play") return;
    logo.style.display = 'none'; //hide logo + text
    ui_container.style.display = 'none';
    bird.style.opacity = 100;    //show bird
    document.querySelector('.connect-btn').style.display = 'none'; //turn off arduino button

    if(isGreen == false) {
      console.log("GO GO GADGET GREEN");
      if(connected) writer.write(encoder.encode("green_ON\n"));
      isGreen = true;
    }

    let pipe_sprite = document.querySelectorAll(".pipe_sprite");
    pipe_sprite.forEach((element) => {
      let pipe_sprite_props = element.getBoundingClientRect();
      bird_props = bird.getBoundingClientRect();

      if (pipe_sprite_props.right <= 0) {    //delete passed pipes
        element.remove();
      } else {     //check pipe collision; end game if bird collides w/ pipes
            if (bird_props.left < pipe_sprite_props.left + pipe_sprite_props.width &&
                bird_props.left + bird_props.width > pipe_sprite_props.left &&
                bird_props.top < pipe_sprite_props.top + pipe_sprite_props.height &&
                bird_props.top + bird_props.height > pipe_sprite_props.top) {
                  stopMidi(bgmSynth);
                  endGame("Pipe");
                    return;
            } else {     //if success, increase score
                if (pipe_sprite_props.right < bird_props.left &&       
                    pipe_sprite_props.right + move_speed >= bird_props.left &&
                    element.increase_score == "1") {
                        score++;
                        pointSound.forEach(({ note, time }, i) => {
                          pointSynth.triggerAttackRelease(note, time, `+${i * time}`);
                        });
                        console.log("Score increased: " + score);
                        score_val.innerHTML = score;
                        if (score % 3 == 0){
                          move_speed += 1;
                          let factor = 0.85;
                          pipe_space *= factor;
                            console.log("       Speed increased to " + move_speed + "| Pipe space = " + pipe_space);
                        }
                    }
                element.style.left = pipe_sprite_props.left - move_speed + "px";
            }
      }
    });
    requestAnimationFrame(move);
  }
  requestAnimationFrame(move);
  console.log(buttonState);
  let bird_dy = 0;
  function apply_gravity() {
    if (game_state != "Play") return;
    bird_dy = bird_dy + gravity;
    
    if(buttonState == 1 && game_state == "Play" && buttonPressed == false){
      buttonPressed = true;
      bird_dy = -7.6;
      flapSFX();
    }
    buttonPressed = false;
    document.addEventListener("keydown", (e) => {
      if (game_state == "Play" && e.key == "ArrowUp" || e.key == " ") {
        bird_dy = -7.6;
        flapSFX();
      }
    });
    if (bird_props.top <= 0 || bird_props.bottom >= background_props.bottom - 50) {        //check window collision
      stopMidi(bgmSynth);
      endGame("Window");
      return;
    }
    bird.style.top = bird_props.top + bird_dy + "px";
    bird_props = bird.getBoundingClientRect();
    requestAnimationFrame(apply_gravity);
  }
  requestAnimationFrame(apply_gravity);

  let pipe_seperation = 0;
  let pipe_gap = 35;
  
  function create_pipe() {
    if (game_state != "Play") return;
  
    if (pipe_seperation > pipe_space) {        //create pipe with predetermined spacing
      pipe_seperation = 0;
  
      let pipe_posi = Math.floor(Math.random() * 43) + 8;       //generate random top pipe
      pipe_sprite_inv = document.createElement("div");
      pipe_sprite_inv.className = "pipe_sprite";
      pipe_sprite_inv.style.top = pipe_posi - 70 + "vh";
      pipe_sprite_inv.style.left = "100vw";
      document.body.appendChild(pipe_sprite_inv);               
  
      pipe_sprite = document.createElement("div");              //generate matching bottom pipe
      pipe_sprite.className = "pipe_sprite";
      pipe_sprite.style.top = pipe_posi + pipe_gap + "vh";
      pipe_sprite.style.left = "100vw";
      pipe_sprite.increase_score = "1";
      document.body.appendChild(pipe_sprite);
      
    }
    pipe_seperation++;
    requestAnimationFrame(create_pipe);
  }
  requestAnimationFrame(create_pipe);
}

function endGame(type){
  console.log(type + " Collision! Ending game...");
  bonkSynth.triggerAttackRelease("C2", "16n");  //play collision sound
  game_state = "End";

  ui_container.style.display = 'inline';
  ui_title.innerHTML = "Press Enter To Restart";
  bird.src = "assets/birdDead.png";

  score_final.innerHTML = "Score:  " + "<span class='score_final_val'>" + score + "</span>";
  if (score >= 25) {
    console.log("%c     High score!", "color:gold; font-weight:bold;");
    const congrats = new Tone.Player("assets/congrats.mp3").toDestination();
    congrats.autostart = true;

    let score_final_val = document.querySelector('.score_final_val');
    score_final_val.style.color = "gold";
    score_final_val.style.animation = "glowGold 2s linear infinite";
  }
  score_title.innerHTML = ""; 
  score_val.innerHTML = "";
  arduino_msg.style.display = "none";

  if(connected) writer.write(encoder.encode("red_ON\n"));

  playEndBGM();
}


let flapTimeoutId = null;
function flapSFX() {
  if (flapTimeoutId !== null) {
    clearTimeout(flapTimeoutId);
  }
  flapTimeoutId = setTimeout(() => {    //prevents sfx spam during key depressing
    const flap = new Tone.Player("assets/flap.mp3").toDestination();
    flap.autostart = true;
    flapTimeoutId = null;
  }, 10); 
}


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

let pointSound = [  
  { note: "C5", time: 0.05 },
  { note: "C6", time: 0.05 },
  { note: "G6", time: 0.05 },
  { note: "C7", time: 0.05 }
];


const bonkSynth = new Tone.Synth({
  oscillator: {
    type: "triangle"
  },
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.5,
    release: 0.5
  }
}).toDestination();
bonkSynth.volume.value = 5;
const bonkFilter = new Tone.Filter({
  type: "bandpass",
  frequency: 500,
  Q: 2
}).toDestination();
bonkSynth.connect(bonkFilter);



let bgmEndSynth = new Tone.PolySynth({maxPolyphony: 50}).toDestination();
bgmEndSynth.volume.value = -15;

let endMelody = [
  "C3", "D3", "E3", "G3", 
  "C4", "D4", "E4", "G4",
  "C5", "D5", "E5", "G5",
  "C6", "D6", "E6", "G6", 
  "C7", 'G6', 'E6', 'D6',
  'C6', 'G5', 'E5', 'D5',
  'C5', 'G4', 'E4', 'D4',
  'C4', 'G3', 'E3', 'D3',

  'A2', 'B2', 'C3', 'E3',
  'A3', 'B3', 'C4', 'E4',
  'A4', 'B4', 'C5', 'E5',
  'A5', 'B5', 'C6', 'E6',
  'A6', 'E6', 'C6', 'B5',
  'A5', 'E5', 'C5', 'B4',
  'A4', 'E4', 'C4', 'B3',
  'A3', 'E3', 'C3', 'B2',
];
                  
function playEndBGM(){
  let endBGM = new Tone.Sequence(function(time, note) {
    bgmEndSynth.triggerAttackRelease(note, 0.5);
  }, endMelody, '8n');

  Tone.Transport.bpm.value = 110;
  Tone.Transport.start();
  Tone.Transport.loop = true;
  Tone.Transport.loopStart = 0;
  Tone.Transport.loopEnd = '100:0:0';
  endBGM.start();
}


let bgmSynth = new Tone.PolySynth({maxPolyphony: 50}).toDestination();
bgmSynth.volume.value = -15;
console.log("bgmSynth initialized");

function playMidi(synth, midi) {
  console.log("playMidi called");
  midi.tracks.forEach(track => {
    const notes = track.notes
    notes.forEach(note => {
      synth.triggerAttackRelease(note.name, note.duration, note.time)
    })
  })
  console.log("BGM playing\n");
  musicPlaying = true;
}

function stopMidi(synth){
  synth.dispose();
  synth.releaseAll();
  console.log(synth + " stopped\n");
  musicPlaying = false;
}

let gameBGM = {
  "header": {
    "keySignatures": [
      {
        "key": "C",
        "scale": "major",
        "ticks": 0
      }
    ],
    "meta": [],
    "name": "",
    "ppq": 1024,
    "tempos": [
      {
        "bpm": 120.00024000048,
        "ticks": 0
      },
      {
        "bpm": 126.00039060121087,
        "ticks": 0
      },
      {
        "bpm": 125.97631645250694,
        "ticks": 0
      },
      {
        "bpm": 125.97631645250694,
        "ticks": 10240
      },
      {
        "bpm": 124.9802114665178,
        "ticks": 10496
      },
      {
        "bpm": 124.45266753921814,
        "ticks": 10752
      },
      {
        "bpm": 123.98410523770852,
        "ticks": 11008
      },
      {
        "bpm": 122.98811934767102,
        "ticks": 11264
      },
      {
        "bpm": 122.46072582472196,
        "ticks": 11520
      },
      {
        "bpm": 121.991387408049,
        "ticks": 11776
      },
      {
        "bpm": 121.46462039269512,
        "ticks": 12032
      },
      {
        "bpm": 125.97631645250694,
        "ticks": 12544
      },
      {
        "bpm": 125.97631645250694,
        "ticks": 16384
      },
      {
        "bpm": 125.97631645250694,
        "ticks": 81920
      }
    ],
    "timeSignatures": [
      {
        "ticks": 0,
        "timeSignature": [
          4,
          4
        ],
        "measures": 0
      }
    ]
  },
  "tracks": [
    {
      "channel": 0,
      "controlChanges": {
        "0": [
          {
            "number": 0,
            "ticks": 0,
            "time": 0,
            "value": 0.952755905511811
          }
        ],
        "32": [
          {
            "number": 32,
            "ticks": 0,
            "time": 0,
            "value": 0
          }
        ]
      },
      "pitchBends": [],
      "instrument": {
        "family": "piano",
        "number": 0,
        "name": "acoustic grand piano"
      },
      "name": "ARIA Player",
      "notes": [],
      "endOfTrackTicks": 147456
    },
    {
      "channel": 0,
      "controlChanges": {
        "7": [
          {
            "number": 7,
            "ticks": 0,
            "time": 0,
            "value": 0.7952755905511811
          },
          {
            "number": 7,
            "ticks": 0,
            "time": 0,
            "value": 0.8031496062992126
          },
          {
            "number": 7,
            "ticks": 0,
            "time": 0,
            "value": 0.8661417322834646
          },
          {
            "number": 7,
            "ticks": 10,
            "time": 0.0046511718749999995,
            "value": 0.8031496062992126
          },
          {
            "number": 7,
            "ticks": 10,
            "time": 0.0046511718749999995,
            "value": 0.8661417322834646
          },
          {
            "number": 7,
            "ticks": 45279,
            "time": 21.0834073828125,
            "value": 0.8031496062992126
          }
        ],
        "10": [
          {
            "number": 10,
            "ticks": 0,
            "time": 0,
            "value": 0.5039370078740157
          }
        ]
      },
      "pitchBends": [],
      "instrument": {
        "family": "piano",
        "number": 1,
        "name": "bright acoustic piano"
      },
      "name": "",
      "notes": [
        {
          "duration": 0.48511722656249995,
          "durationTicks": 1043,
          "midi": 61,
          "name": "C#4",
          "ticks": 10,
          "time": 0.0046511718749999995,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.957211171875,
          "durationTicks": 2058,
          "midi": 45,
          "name": "A2",
          "ticks": 10,
          "time": 0.0046511718749999995,
          "velocity": 0.5669291338582677
        },
        {
          "duration": 0.957211171875,
          "durationTicks": 2058,
          "midi": 52,
          "name": "E3",
          "ticks": 10,
          "time": 0.0046511718749999995,
          "velocity": 0.6771653543307087
        },
        {
          "duration": 0.0627908203125,
          "durationTicks": 135,
          "midi": 57,
          "name": "A3",
          "ticks": 1054,
          "time": 0.490233515625,
          "velocity": 0.5354330708661418
        },
        {
          "duration": 0.0627908203125,
          "durationTicks": 135,
          "midi": 61,
          "name": "C#4",
          "ticks": 1054,
          "time": 0.490233515625,
          "velocity": 0.6456692913385826
        },
        {
          "duration": 0.05720941406250002,
          "durationTicks": 123,
          "midi": 59,
          "name": "B3",
          "ticks": 1395,
          "time": 0.6488384765624999,
          "velocity": 0.5275590551181102
        },
        {
          "duration": 0.05720941406250002,
          "durationTicks": 123,
          "midi": 62,
          "name": "D4",
          "ticks": 1395,
          "time": 0.6488384765624999,
          "velocity": 0.6377952755905512
        },
        {
          "duration": 0.06465128906249995,
          "durationTicks": 139,
          "midi": 61,
          "name": "C#4",
          "ticks": 1724,
          "time": 0.80186203125,
          "velocity": 0.5275590551181102
        },
        {
          "duration": 0.06465128906249995,
          "durationTicks": 139,
          "midi": 64,
          "name": "E4",
          "ticks": 1724,
          "time": 0.80186203125,
          "velocity": 0.6377952755905512
        },
        {
          "duration": 0.9423274218749998,
          "durationTicks": 2026,
          "midi": 61,
          "name": "C#4",
          "ticks": 2069,
          "time": 0.9623274609375,
          "velocity": 0.5511811023622047
        },
        {
          "duration": 0.9423274218749998,
          "durationTicks": 2026,
          "midi": 69,
          "name": "A4",
          "ticks": 2069,
          "time": 0.9623274609375,
          "velocity": 0.6614173228346457
        },
        {
          "duration": 0.9423274218749998,
          "durationTicks": 2026,
          "midi": 45,
          "name": "A2",
          "ticks": 2069,
          "time": 0.9623274609375,
          "velocity": 0.5511811023622047
        },
        {
          "duration": 0.9423274218749998,
          "durationTicks": 2026,
          "midi": 52,
          "name": "E3",
          "ticks": 2069,
          "time": 0.9623274609375,
          "velocity": 0.6614173228346457
        },
        {
          "duration": 0.48790792968749996,
          "durationTicks": 1049,
          "midi": 64,
          "name": "E4",
          "ticks": 4100,
          "time": 1.9069804687499998,
          "velocity": 0.5669291338582677
        },
        {
          "duration": 0.48790792968749996,
          "durationTicks": 1049,
          "midi": 69,
          "name": "A4",
          "ticks": 4100,
          "time": 1.9069804687499998,
          "velocity": 0.6771653543307087
        },
        {
          "duration": 0.9600018749999999,
          "durationTicks": 2064,
          "midi": 43,
          "name": "G2",
          "ticks": 4100,
          "time": 1.9069804687499998,
          "velocity": 0.5669291338582677
        },
        {
          "duration": 0.9600018749999999,
          "durationTicks": 2064,
          "midi": 50,
          "name": "D3",
          "ticks": 4100,
          "time": 1.9069804687499998,
          "velocity": 0.6771653543307087
        },
        {
          "duration": 0.06279082031249983,
          "durationTicks": 135,
          "midi": 64,
          "name": "E4",
          "ticks": 5150,
          "time": 2.395353515625,
          "velocity": 0.5354330708661418
        },
        {
          "duration": 0.06279082031249983,
          "durationTicks": 135,
          "midi": 67,
          "name": "G4",
          "ticks": 5150,
          "time": 2.395353515625,
          "velocity": 0.6456692913385826
        },
        {
          "duration": 0.05720941406250013,
          "durationTicks": 123,
          "midi": 62,
          "name": "D4",
          "ticks": 5491,
          "time": 2.5539584765625,
          "velocity": 0.5275590551181102
        },
        {
          "duration": 0.05720941406250013,
          "durationTicks": 123,
          "midi": 65,
          "name": "F4",
          "ticks": 5491,
          "time": 2.5539584765625,
          "velocity": 0.6377952755905512
        },
        {
          "duration": 0.06465128906250017,
          "durationTicks": 139,
          "midi": 57,
          "name": "A3",
          "ticks": 5820,
          "time": 2.70698203125,
          "velocity": 0.5275590551181102
        },
        {
          "duration": 0.06465128906250017,
          "durationTicks": 139,
          "midi": 60,
          "name": "C4",
          "ticks": 5820,
          "time": 2.70698203125,
          "velocity": 0.6377952755905512
        },
        {
          "duration": 0.49023351562499995,
          "durationTicks": 1054,
          "midi": 60,
          "name": "C4",
          "ticks": 6165,
          "time": 2.8674474609375,
          "velocity": 0.5275590551181102
        },
        {
          "duration": 0.4716288281249996,
          "durationTicks": 1014,
          "midi": 64,
          "name": "E4",
          "ticks": 6165,
          "time": 2.8674474609375,
          "velocity": 0.6377952755905512
        },
        {
          "duration": 0.942327421875,
          "durationTicks": 2026,
          "midi": 43,
          "name": "G2",
          "ticks": 6165,
          "time": 2.8674474609375,
          "velocity": 0.5511811023622047
        },
        {
          "duration": 0.942327421875,
          "durationTicks": 2026,
          "midi": 50,
          "name": "D3",
          "ticks": 6165,
          "time": 2.8674474609375,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.44837296874999977,
          "durationTicks": 964,
          "midi": 59,
          "name": "B3",
          "ticks": 7180,
          "time": 3.33954140625,
          "velocity": 0.4881889763779528
        },
        {
          "duration": 0.47023347656250003,
          "durationTicks": 1011,
          "midi": 62,
          "name": "D4",
          "ticks": 7180,
          "time": 3.33954140625,
          "velocity": 0.5984251968503937
        },
        {
          "duration": 1.6776112499999996,
          "durationTicks": 3584,
          "midi": 61,
          "name": "C#4",
          "ticks": 8192,
          "time": 3.81024,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.1906980468749997,
          "durationTicks": 410,
          "midi": 45,
          "name": "A2",
          "ticks": 8192,
          "time": 3.81024,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.25162839843750007,
          "durationTicks": 541,
          "midi": 69,
          "name": "A4",
          "ticks": 8196,
          "time": 3.8121004687499997,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 1.6776720234374993,
          "durationTicks": 3584,
          "midi": 52,
          "name": "E3",
          "ticks": 8196,
          "time": 3.8121004687499997,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.23581441406250025,
          "durationTicks": 507,
          "midi": 69,
          "name": "A4",
          "ticks": 8738,
          "time": 4.064193984375,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.19069804687500014,
          "durationTicks": 410,
          "midi": 45,
          "name": "A2",
          "ticks": 9216,
          "time": 4.286519999999999,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.23441906249999978,
          "durationTicks": 504,
          "midi": 69,
          "name": "A4",
          "ticks": 9246,
          "time": 4.300473515625,
          "velocity": 0.5984251968503937
        },
        {
          "duration": 0.23674464843749998,
          "durationTicks": 509,
          "midi": 69,
          "name": "A4",
          "ticks": 9751,
          "time": 4.535357695312499,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.19126892968749942,
          "durationTicks": 410,
          "midi": 45,
          "name": "A2",
          "ticks": 10240,
          "time": 4.7627999999999995,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.2377961464843752,
          "durationTicks": 509,
          "midi": 69,
          "name": "A4",
          "ticks": 10261,
          "time": 4.772567460937499,
          "velocity": 0.6141732283464567
        },
        {
          "duration": 0.23780617871093757,
          "durationTicks": 504,
          "midi": 69,
          "name": "A4",
          "ticks": 10771,
          "time": 5.010834418945312,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.19564733789062494,
          "durationTicks": 410,
          "midi": 45,
          "name": "A2",
          "ticks": 11264,
          "time": 5.243399999999999,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.24065547656249997,
          "durationTicks": 504,
          "midi": 69,
          "name": "A4",
          "ticks": 11276,
          "time": 5.249117015624999,
          "velocity": 0.5984251968503937
        },
        {
          "duration": 0.09846366210937507,
          "durationTicks": 205,
          "midi": 62,
          "name": "D4",
          "ticks": 11776,
          "time": 5.487851249999999,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.24356830371093796,
          "durationTicks": 506,
          "midi": 69,
          "name": "A4",
          "ticks": 11781,
          "time": 5.490252802734374,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.09558179882812556,
          "durationTicks": 199,
          "midi": 54,
          "name": "F#3",
          "ticks": 11781,
          "time": 5.490252802734374,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 1.6714027500000004,
          "durationTicks": 3584,
          "midi": 64,
          "name": "E4",
          "ticks": 12288,
          "time": 5.734303499999999,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.19512079687500083,
          "durationTicks": 410,
          "midi": 45,
          "name": "A2",
          "ticks": 12288,
          "time": 5.734303499999999,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.2559820429687498,
          "durationTicks": 541,
          "midi": 69,
          "name": "A4",
          "ticks": 12292,
          "time": 5.73623307421875,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 1.6713336445312503,
          "durationTicks": 3584,
          "midi": 55,
          "name": "G3",
          "ticks": 12292,
          "time": 5.73623307421875,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.23581441406250025,
          "durationTicks": 507,
          "midi": 69,
          "name": "A4",
          "ticks": 12834,
          "time": 5.992680234374999,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.19069804687499925,
          "durationTicks": 410,
          "midi": 45,
          "name": "A2",
          "ticks": 13312,
          "time": 6.21500625,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.2204655468750003,
          "durationTicks": 474,
          "midi": 69,
          "name": "A4",
          "ticks": 13342,
          "time": 6.2289597656249995,
          "velocity": 0.5984251968503937
        },
        {
          "duration": 0.1079071874999995,
          "durationTicks": 232,
          "midi": 73,
          "name": "C#5",
          "ticks": 13847,
          "time": 6.4638439453125,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.11441882812499937,
          "durationTicks": 246,
          "midi": 76,
          "name": "E5",
          "ticks": 14095,
          "time": 6.5791930078125,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.19069804687500014,
          "durationTicks": 410,
          "midi": 45,
          "name": "A2",
          "ticks": 14336,
          "time": 6.69128625,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.7065130078125001,
          "durationTicks": 1519,
          "midi": 81,
          "name": "A5",
          "ticks": 14357,
          "time": 6.7010537109375,
          "velocity": 0.6141732283464567
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 45,
          "name": "A2",
          "ticks": 15360,
          "time": 7.16756625,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.47627999999999915,
          "durationTicks": 1024,
          "midi": 45,
          "name": "A2",
          "ticks": 16384,
          "time": 7.643846249999999,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578125004,
          "durationTicks": 1615,
          "midi": 61,
          "name": "C#4",
          "ticks": 16388,
          "time": 7.64570671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.902794414062499,
          "durationTicks": 4091,
          "midi": 57,
          "name": "A3",
          "ticks": 16388,
          "time": 7.64570671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 45,
          "name": "A2",
          "ticks": 17920,
          "time": 8.35826625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.26511679687500056,
          "durationTicks": 570,
          "midi": 62,
          "name": "D4",
          "ticks": 17943,
          "time": 8.3689639453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9525600000000001,
          "durationTicks": 2048,
          "midi": 45,
          "name": "A2",
          "ticks": 18432,
          "time": 8.59640625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9204669140624997,
          "durationTicks": 1979,
          "midi": 64,
          "name": "E4",
          "ticks": 18453,
          "time": 8.6061737109375,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.47627999999999915,
          "durationTicks": 1024,
          "midi": 41,
          "name": "F2",
          "ticks": 20480,
          "time": 9.54896625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578125013,
          "durationTicks": 1615,
          "midi": 67,
          "name": "G4",
          "ticks": 20484,
          "time": 9.550826718749999,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.9027944140625,
          "durationTicks": 4091,
          "midi": 53,
          "name": "F3",
          "ticks": 20484,
          "time": 9.550826718749999,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 41,
          "name": "F2",
          "ticks": 22016,
          "time": 10.26338625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.1288374609374987,
          "durationTicks": 277,
          "midi": 65,
          "name": "F4",
          "ticks": 22039,
          "time": 10.2740839453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.13534910156250035,
          "durationTicks": 291,
          "midi": 60,
          "name": "C4",
          "ticks": 22287,
          "time": 10.3894330078125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9525600000000001,
          "durationTicks": 2048,
          "midi": 41,
          "name": "F2",
          "ticks": 22528,
          "time": 10.50152625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9204669140624997,
          "durationTicks": 1979,
          "midi": 57,
          "name": "A3",
          "ticks": 22549,
          "time": 10.5112937109375,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.47627999999999915,
          "durationTicks": 1024,
          "midi": 43,
          "name": "G2",
          "ticks": 24576,
          "time": 11.45408625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578125013,
          "durationTicks": 1615,
          "midi": 64,
          "name": "E4",
          "ticks": 24580,
          "time": 11.455946718749999,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.9027944140625,
          "durationTicks": 4091,
          "midi": 55,
          "name": "G3",
          "ticks": 24580,
          "time": 11.455946718749999,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 43,
          "name": "G2",
          "ticks": 26112,
          "time": 12.16850625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.12883746093750048,
          "durationTicks": 277,
          "midi": 62,
          "name": "D4",
          "ticks": 26135,
          "time": 12.179203945312498,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.13534910156250035,
          "durationTicks": 291,
          "midi": 60,
          "name": "C4",
          "ticks": 26383,
          "time": 12.2945530078125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9525600000000018,
          "durationTicks": 2048,
          "midi": 43,
          "name": "G2",
          "ticks": 26624,
          "time": 12.406646249999998,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9204669140624997,
          "durationTicks": 1979,
          "midi": 59,
          "name": "B3",
          "ticks": 26645,
          "time": 12.4164137109375,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.47627999999999915,
          "durationTicks": 1024,
          "midi": 45,
          "name": "A2",
          "ticks": 28672,
          "time": 13.35920625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578124995,
          "durationTicks": 1615,
          "midi": 61,
          "name": "C#4",
          "ticks": 28676,
          "time": 13.36106671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.9027944140625,
          "durationTicks": 4091,
          "midi": 57,
          "name": "A3",
          "ticks": 28676,
          "time": 13.36106671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 45,
          "name": "A2",
          "ticks": 30208,
          "time": 14.07362625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.26511679687500234,
          "durationTicks": 570,
          "midi": 62,
          "name": "D4",
          "ticks": 30231,
          "time": 14.084323945312498,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.23814000000000135,
          "durationTicks": 512,
          "midi": 45,
          "name": "A2",
          "ticks": 30720,
          "time": 14.311766249999998,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9204669140625015,
          "durationTicks": 1979,
          "midi": 64,
          "name": "E4",
          "ticks": 30741,
          "time": 14.321533710937498,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.47627999999999915,
          "durationTicks": 1024,
          "midi": 40,
          "name": "E2",
          "ticks": 31232,
          "time": 14.54990625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.23814000000000135,
          "durationTicks": 512,
          "midi": 33,
          "name": "A1",
          "ticks": 32256,
          "time": 15.026186249999999,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.47627999999999915,
          "durationTicks": 1024,
          "midi": 45,
          "name": "A2",
          "ticks": 32768,
          "time": 15.26432625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578124977,
          "durationTicks": 1615,
          "midi": 61,
          "name": "C#4",
          "ticks": 32772,
          "time": 15.26618671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.9027944140624982,
          "durationTicks": 4091,
          "midi": 57,
          "name": "A3",
          "ticks": 32772,
          "time": 15.26618671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.0953490234375014,
          "durationTicks": 205,
          "midi": 45,
          "name": "A2",
          "ticks": 34304,
          "time": 15.978746249999999,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.26511679687500234,
          "durationTicks": 570,
          "midi": 62,
          "name": "D4",
          "ticks": 34327,
          "time": 15.989443945312498,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9525600000000018,
          "durationTicks": 2048,
          "midi": 45,
          "name": "A2",
          "ticks": 34816,
          "time": 16.216886249999998,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9204669140625015,
          "durationTicks": 1979,
          "midi": 64,
          "name": "E4",
          "ticks": 34837,
          "time": 16.226653710937498,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.47627999999999915,
          "durationTicks": 1024,
          "midi": 41,
          "name": "F2",
          "ticks": 36864,
          "time": 17.16944625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578125013,
          "durationTicks": 1615,
          "midi": 67,
          "name": "G4",
          "ticks": 36868,
          "time": 17.17130671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.8809339062500001,
          "durationTicks": 4044,
          "midi": 57,
          "name": "A3",
          "ticks": 36868,
          "time": 17.17130671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 41,
          "name": "F2",
          "ticks": 38400,
          "time": 17.883866249999997,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.12883746093750048,
          "durationTicks": 277,
          "midi": 65,
          "name": "F4",
          "ticks": 38423,
          "time": 17.8945639453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.1353491015624968,
          "durationTicks": 291,
          "midi": 60,
          "name": "C4",
          "ticks": 38671,
          "time": 18.0099130078125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9525599999999983,
          "durationTicks": 2048,
          "midi": 41,
          "name": "F2",
          "ticks": 38912,
          "time": 18.12200625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9423274218750031,
          "durationTicks": 2026,
          "midi": 57,
          "name": "A3",
          "ticks": 38933,
          "time": 18.131773710937498,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.4762800000000027,
          "durationTicks": 1024,
          "midi": 43,
          "name": "G2",
          "ticks": 40960,
          "time": 19.074566249999997,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578124977,
          "durationTicks": 1615,
          "midi": 64,
          "name": "E4",
          "ticks": 40964,
          "time": 19.07642671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.6669799999999988,
          "durationTicks": 3584,
          "midi": 59,
          "name": "B3",
          "ticks": 40964,
          "time": 19.07642671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 43,
          "name": "G2",
          "ticks": 42496,
          "time": 19.78898625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.26511679687500234,
          "durationTicks": 570,
          "midi": 62,
          "name": "D4",
          "ticks": 42519,
          "time": 19.7996839453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9525600000000018,
          "durationTicks": 2048,
          "midi": 43,
          "name": "G2",
          "ticks": 43008,
          "time": 20.02712625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9423274218749995,
          "durationTicks": 2026,
          "midi": 59,
          "name": "B3",
          "ticks": 43029,
          "time": 20.0368937109375,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.26372144531250186,
          "durationTicks": 567,
          "midi": 59,
          "name": "B3",
          "ticks": 44549,
          "time": 20.743871835937497,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.47627999999999915,
          "durationTicks": 1024,
          "midi": 45,
          "name": "A2",
          "ticks": 45056,
          "time": 20.97968625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.997676367187502,
          "durationTicks": 2145,
          "midi": 62,
          "name": "D4",
          "ticks": 45060,
          "time": 20.981546718749996,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 45,
          "name": "A2",
          "ticks": 46592,
          "time": 21.694106249999997,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.23814000000000135,
          "durationTicks": 512,
          "midi": 45,
          "name": "A2",
          "ticks": 47104,
          "time": 21.93224625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9204669140624979,
          "durationTicks": 1979,
          "midi": 61,
          "name": "C#4",
          "ticks": 47125,
          "time": 21.9420137109375,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.47627999999999915,
          "durationTicks": 1024,
          "midi": 40,
          "name": "E2",
          "ticks": 47616,
          "time": 22.17038625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.2381399999999978,
          "durationTicks": 512,
          "midi": 45,
          "name": "A2",
          "ticks": 48640,
          "time": 22.64666625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9600018749999997,
          "durationTicks": 2064,
          "midi": 57,
          "name": "A3",
          "ticks": 49156,
          "time": 22.88666671875,
          "velocity": 0.6692913385826772
        },
        {
          "duration": 0.9600018749999997,
          "durationTicks": 2064,
          "midi": 60,
          "name": "C4",
          "ticks": 49156,
          "time": 22.88666671875,
          "velocity": 0.7795275590551181
        },
        {
          "duration": 0.4879079296874984,
          "durationTicks": 1049,
          "midi": 41,
          "name": "F2",
          "ticks": 49156,
          "time": 22.88666671875,
          "velocity": 0.7322834645669292
        },
        {
          "duration": 0.09395367187499915,
          "durationTicks": 202,
          "midi": 41,
          "name": "F2",
          "ticks": 50711,
          "time": 23.6099239453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.4902335156250004,
          "durationTicks": 1054,
          "midi": 55,
          "name": "G3",
          "ticks": 51221,
          "time": 23.8471337109375,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47162882812499873,
          "durationTicks": 1014,
          "midi": 59,
          "name": "B3",
          "ticks": 51221,
          "time": 23.8471337109375,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.47162882812499873,
          "durationTicks": 1014,
          "midi": 41,
          "name": "F2",
          "ticks": 51221,
          "time": 23.8471337109375,
          "velocity": 0.7165354330708661
        },
        {
          "duration": 0.4888381640624999,
          "durationTicks": 1051,
          "midi": 53,
          "name": "F3",
          "ticks": 52236,
          "time": 24.31922765625,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47023347656249825,
          "durationTicks": 1011,
          "midi": 57,
          "name": "A3",
          "ticks": 52236,
          "time": 24.31922765625,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.09255832031250222,
          "durationTicks": 199,
          "midi": 41,
          "name": "F2",
          "ticks": 52741,
          "time": 24.554111835937498,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.21581437499999723,
          "durationTicks": 464,
          "midi": 55,
          "name": "G3",
          "ticks": 53252,
          "time": 24.79178671875,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.25162839843750007,
          "durationTicks": 541,
          "midi": 59,
          "name": "B3",
          "ticks": 53252,
          "time": 24.79178671875,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.10883742187499834,
          "durationTicks": 234,
          "midi": 41,
          "name": "F2",
          "ticks": 53252,
          "time": 24.79178671875,
          "velocity": 0.7322834645669292
        },
        {
          "duration": 0.4706985937500008,
          "durationTicks": 1012,
          "midi": 41,
          "name": "F2",
          "ticks": 53794,
          "time": 25.043880234375,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.13395374999999987,
          "durationTicks": 288,
          "midi": 55,
          "name": "G3",
          "ticks": 54043,
          "time": 25.1596944140625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.4144213671875008,
          "durationTicks": 3041,
          "midi": 59,
          "name": "B3",
          "ticks": 54302,
          "time": 25.280159765624997,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 1.4144213671875008,
          "durationTicks": 3041,
          "midi": 62,
          "name": "D4",
          "ticks": 54302,
          "time": 25.280159765624997,
          "velocity": 0.7086614173228346
        },
        {
          "duration": 0.4600008984374995,
          "durationTicks": 989,
          "midi": 41,
          "name": "F2",
          "ticks": 54807,
          "time": 25.5150439453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.2204655468750012,
          "durationTicks": 474,
          "midi": 36,
          "name": "C2",
          "ticks": 55827,
          "time": 25.9894634765625,
          "velocity": 0.6771653543307087
        },
        {
          "duration": 0.22046554687499764,
          "durationTicks": 474,
          "midi": 41,
          "name": "F2",
          "ticks": 56332,
          "time": 26.22434765625,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.22139578124999915,
          "durationTicks": 476,
          "midi": 36,
          "name": "C2",
          "ticks": 56837,
          "time": 26.459231835937498,
          "velocity": 0.6771653543307087
        },
        {
          "duration": 0.9600018749999997,
          "durationTicks": 2064,
          "midi": 59,
          "name": "B3",
          "ticks": 57348,
          "time": 26.69690671875,
          "velocity": 0.6692913385826772
        },
        {
          "duration": 0.9600018749999997,
          "durationTicks": 2064,
          "midi": 62,
          "name": "D4",
          "ticks": 57348,
          "time": 26.69690671875,
          "velocity": 0.7795275590551181
        },
        {
          "duration": 0.4879079296874984,
          "durationTicks": 1049,
          "midi": 41,
          "name": "F2",
          "ticks": 57348,
          "time": 26.69690671875,
          "velocity": 0.7322834645669292
        },
        {
          "duration": 0.09395367187499915,
          "durationTicks": 202,
          "midi": 41,
          "name": "F2",
          "ticks": 58903,
          "time": 27.4201639453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.4902335156250004,
          "durationTicks": 1054,
          "midi": 57,
          "name": "A3",
          "ticks": 59413,
          "time": 27.6573737109375,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47162882812499873,
          "durationTicks": 1014,
          "midi": 60,
          "name": "C4",
          "ticks": 59413,
          "time": 27.6573737109375,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.47162882812499873,
          "durationTicks": 1014,
          "midi": 41,
          "name": "F2",
          "ticks": 59413,
          "time": 27.6573737109375,
          "velocity": 0.7165354330708661
        },
        {
          "duration": 0.4888381640624999,
          "durationTicks": 1051,
          "midi": 55,
          "name": "G3",
          "ticks": 60428,
          "time": 28.12946765625,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47023347656249825,
          "durationTicks": 1011,
          "midi": 59,
          "name": "B3",
          "ticks": 60428,
          "time": 28.12946765625,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.22139578124999915,
          "durationTicks": 476,
          "midi": 41,
          "name": "F2",
          "ticks": 60933,
          "time": 28.364351835937498,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.21581437500000078,
          "durationTicks": 464,
          "midi": 57,
          "name": "A3",
          "ticks": 61444,
          "time": 28.602026718749997,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.25162839843750007,
          "durationTicks": 541,
          "midi": 60,
          "name": "C4",
          "ticks": 61444,
          "time": 28.602026718749997,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.4706985937500008,
          "durationTicks": 1012,
          "midi": 41,
          "name": "F2",
          "ticks": 61986,
          "time": 28.854120234375,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.13395374999999987,
          "durationTicks": 288,
          "midi": 57,
          "name": "A3",
          "ticks": 62235,
          "time": 28.9699344140625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.4144213671875008,
          "durationTicks": 3041,
          "midi": 60,
          "name": "C4",
          "ticks": 62494,
          "time": 29.090399765624998,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 1.4144213671875008,
          "durationTicks": 3041,
          "midi": 64,
          "name": "E4",
          "ticks": 62494,
          "time": 29.090399765624998,
          "velocity": 0.7086614173228346
        },
        {
          "duration": 0.09395367187499915,
          "durationTicks": 202,
          "midi": 41,
          "name": "F2",
          "ticks": 62999,
          "time": 29.3252839453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.22279113281249963,
          "durationTicks": 479,
          "midi": 41,
          "name": "F2",
          "ticks": 63509,
          "time": 29.5624937109375,
          "velocity": 0.7165354330708661
        },
        {
          "duration": 0.2204655468750012,
          "durationTicks": 474,
          "midi": 36,
          "name": "C2",
          "ticks": 64019,
          "time": 29.7997034765625,
          "velocity": 0.6771653543307087
        },
        {
          "duration": 0.2204655468750012,
          "durationTicks": 474,
          "midi": 41,
          "name": "F2",
          "ticks": 64524,
          "time": 30.034587656249997,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.22139578124999915,
          "durationTicks": 476,
          "midi": 45,
          "name": "A2",
          "ticks": 65029,
          "time": 30.269471835937498,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9600018749999997,
          "durationTicks": 2064,
          "midi": 60,
          "name": "C4",
          "ticks": 65540,
          "time": 30.507146718749997,
          "velocity": 0.6692913385826772
        },
        {
          "duration": 0.9600018749999997,
          "durationTicks": 2064,
          "midi": 64,
          "name": "E4",
          "ticks": 65540,
          "time": 30.507146718749997,
          "velocity": 0.7795275590551181
        },
        {
          "duration": 0.48790792968750196,
          "durationTicks": 1049,
          "midi": 43,
          "name": "G2",
          "ticks": 65540,
          "time": 30.507146718749997,
          "velocity": 0.7322834645669292
        },
        {
          "duration": 0.09395367187499915,
          "durationTicks": 202,
          "midi": 43,
          "name": "G2",
          "ticks": 67095,
          "time": 31.2304039453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.4902335156250004,
          "durationTicks": 1054,
          "midi": 59,
          "name": "B3",
          "ticks": 67605,
          "time": 31.4676137109375,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47162882812499873,
          "durationTicks": 1014,
          "midi": 62,
          "name": "D4",
          "ticks": 67605,
          "time": 31.4676137109375,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.47162882812499873,
          "durationTicks": 1014,
          "midi": 43,
          "name": "G2",
          "ticks": 67605,
          "time": 31.4676137109375,
          "velocity": 0.7165354330708661
        },
        {
          "duration": 0.48883816406249636,
          "durationTicks": 1051,
          "midi": 57,
          "name": "A3",
          "ticks": 68620,
          "time": 31.939707656249997,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.4702334765625018,
          "durationTicks": 1011,
          "midi": 60,
          "name": "C4",
          "ticks": 68620,
          "time": 31.939707656249997,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.47534976562500475,
          "durationTicks": 1022,
          "midi": 43,
          "name": "G2",
          "ticks": 69125,
          "time": 32.1745918359375,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.8809339062500001,
          "durationTicks": 4044,
          "midi": 59,
          "name": "B3",
          "ticks": 69636,
          "time": 32.41226671875,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 1.9027944140625053,
          "durationTicks": 4091,
          "midi": 62,
          "name": "D4",
          "ticks": 69636,
          "time": 32.41226671875,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.22186089843749812,
          "durationTicks": 477,
          "midi": 38,
          "name": "D2",
          "ticks": 70178,
          "time": 32.664360234374996,
          "velocity": 0.6850393700787402
        },
        {
          "duration": 0.22046554687499764,
          "durationTicks": 474,
          "midi": 43,
          "name": "G2",
          "ticks": 70686,
          "time": 32.900639765625,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.22279113281250318,
          "durationTicks": 479,
          "midi": 38,
          "name": "D2",
          "ticks": 71191,
          "time": 33.1355239453125,
          "velocity": 0.6850393700787402
        },
        {
          "duration": 0.22279113281250318,
          "durationTicks": 479,
          "midi": 43,
          "name": "G2",
          "ticks": 71701,
          "time": 33.372733710937496,
          "velocity": 0.7165354330708661
        },
        {
          "duration": 0.09162808593750071,
          "durationTicks": 197,
          "midi": 31,
          "name": "G1",
          "ticks": 72211,
          "time": 33.6099434765625,
          "velocity": 0.6692913385826772
        },
        {
          "duration": 0.22046554687499764,
          "durationTicks": 474,
          "midi": 38,
          "name": "D2",
          "ticks": 72716,
          "time": 33.84482765625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.2213957812499956,
          "durationTicks": 476,
          "midi": 43,
          "name": "G2",
          "ticks": 73221,
          "time": 34.0797118359375,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9600018749999961,
          "durationTicks": 2064,
          "midi": 57,
          "name": "A3",
          "ticks": 73732,
          "time": 34.31738671875,
          "velocity": 0.6692913385826772
        },
        {
          "duration": 0.9600018749999961,
          "durationTicks": 2064,
          "midi": 62,
          "name": "D4",
          "ticks": 73732,
          "time": 34.31738671875,
          "velocity": 0.7795275590551181
        },
        {
          "duration": 0.48790792968749486,
          "durationTicks": 1049,
          "midi": 45,
          "name": "A2",
          "ticks": 73732,
          "time": 34.31738671875,
          "velocity": 0.7322834645669292
        },
        {
          "duration": 0.09395367187499915,
          "durationTicks": 202,
          "midi": 45,
          "name": "A2",
          "ticks": 75287,
          "time": 35.040643945312496,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.4902335156250004,
          "durationTicks": 1054,
          "midi": 55,
          "name": "G3",
          "ticks": 75797,
          "time": 35.2778537109375,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47162882812499873,
          "durationTicks": 1014,
          "midi": 59,
          "name": "B3",
          "ticks": 75797,
          "time": 35.2778537109375,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.47162882812499873,
          "durationTicks": 1014,
          "midi": 45,
          "name": "A2",
          "ticks": 75797,
          "time": 35.2778537109375,
          "velocity": 0.7165354330708661
        },
        {
          "duration": 0.4888381640624999,
          "durationTicks": 1051,
          "midi": 59,
          "name": "B3",
          "ticks": 76812,
          "time": 35.74994765625,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47023347656249825,
          "durationTicks": 1011,
          "midi": 62,
          "name": "D4",
          "ticks": 76812,
          "time": 35.74994765625,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.09255832031249867,
          "durationTicks": 199,
          "midi": 45,
          "name": "A2",
          "ticks": 77317,
          "time": 35.9848318359375,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.8809339062500001,
          "durationTicks": 4044,
          "midi": 57,
          "name": "A3",
          "ticks": 77828,
          "time": 36.22250671875,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 1.8809339062500001,
          "durationTicks": 4044,
          "midi": 61,
          "name": "C#4",
          "ticks": 77828,
          "time": 36.22250671875,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.23767488281249882,
          "durationTicks": 511,
          "midi": 45,
          "name": "A2",
          "ticks": 77828,
          "time": 36.22250671875,
          "velocity": 0.7322834645669292
        },
        {
          "duration": 0.4706985937500008,
          "durationTicks": 1012,
          "midi": 40,
          "name": "E2",
          "ticks": 78370,
          "time": 36.474600234374996,
          "velocity": 0.6850393700787402
        },
        {
          "duration": 0.4600008984374995,
          "durationTicks": 989,
          "midi": 33,
          "name": "A1",
          "ticks": 79383,
          "time": 36.9457639453125,
          "velocity": 0.6692913385826772
        },
        {
          "duration": 0.22046554687499764,
          "durationTicks": 474,
          "midi": 40,
          "name": "E2",
          "ticks": 80403,
          "time": 37.4201834765625,
          "velocity": 0.6850393700787402
        },
        {
          "duration": 0.47023347656249825,
          "durationTicks": 1011,
          "midi": 45,
          "name": "A2",
          "ticks": 80908,
          "time": 37.65506765625,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.4762800000000027,
          "durationTicks": 1024,
          "midi": 45,
          "name": "A2",
          "ticks": 81920,
          "time": 38.12576625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578124977,
          "durationTicks": 1615,
          "midi": 61,
          "name": "C#4",
          "ticks": 81924,
          "time": 38.12762671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.9027944140624982,
          "durationTicks": 4091,
          "midi": 57,
          "name": "A3",
          "ticks": 81924,
          "time": 38.12762671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 45,
          "name": "A2",
          "ticks": 83456,
          "time": 38.840186249999995,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.2651167968749988,
          "durationTicks": 570,
          "midi": 62,
          "name": "D4",
          "ticks": 83479,
          "time": 38.850883945312496,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9525599999999983,
          "durationTicks": 2048,
          "midi": 45,
          "name": "A2",
          "ticks": 83968,
          "time": 39.078326249999996,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9204669140625015,
          "durationTicks": 1979,
          "midi": 64,
          "name": "E4",
          "ticks": 83989,
          "time": 39.0880937109375,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.4762800000000027,
          "durationTicks": 1024,
          "midi": 41,
          "name": "F2",
          "ticks": 86016,
          "time": 40.030886249999995,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578124977,
          "durationTicks": 1615,
          "midi": 67,
          "name": "G4",
          "ticks": 86020,
          "time": 40.03274671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.9027944140624982,
          "durationTicks": 4091,
          "midi": 53,
          "name": "F3",
          "ticks": 86020,
          "time": 40.03274671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 41,
          "name": "F2",
          "ticks": 87552,
          "time": 40.74530625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.12883746093749693,
          "durationTicks": 277,
          "midi": 65,
          "name": "F4",
          "ticks": 87575,
          "time": 40.7560039453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.1353491015625039,
          "durationTicks": 291,
          "midi": 60,
          "name": "C4",
          "ticks": 87823,
          "time": 40.871353007812495,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9525599999999983,
          "durationTicks": 2048,
          "midi": 41,
          "name": "F2",
          "ticks": 88064,
          "time": 40.98344625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9204669140625015,
          "durationTicks": 1979,
          "midi": 57,
          "name": "A3",
          "ticks": 88085,
          "time": 40.993213710937496,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.4762799999999956,
          "durationTicks": 1024,
          "midi": 43,
          "name": "G2",
          "ticks": 90112,
          "time": 41.93600625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578124977,
          "durationTicks": 1615,
          "midi": 64,
          "name": "E4",
          "ticks": 90116,
          "time": 41.93786671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.9027944140624982,
          "durationTicks": 4091,
          "midi": 55,
          "name": "G3",
          "ticks": 90116,
          "time": 41.93786671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 43,
          "name": "G2",
          "ticks": 91648,
          "time": 42.650426249999995,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.12883746093750403,
          "durationTicks": 277,
          "midi": 62,
          "name": "D4",
          "ticks": 91671,
          "time": 42.6611239453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.1353491015624968,
          "durationTicks": 291,
          "midi": 60,
          "name": "C4",
          "ticks": 91919,
          "time": 42.7764730078125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9525599999999983,
          "durationTicks": 2048,
          "midi": 43,
          "name": "G2",
          "ticks": 92160,
          "time": 42.88856625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9204669140624944,
          "durationTicks": 1979,
          "midi": 59,
          "name": "B3",
          "ticks": 92181,
          "time": 42.8983337109375,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.4762800000000027,
          "durationTicks": 1024,
          "midi": 45,
          "name": "A2",
          "ticks": 94208,
          "time": 43.841126249999995,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578124977,
          "durationTicks": 1615,
          "midi": 61,
          "name": "C#4",
          "ticks": 94212,
          "time": 43.84298671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.9027944140624982,
          "durationTicks": 4091,
          "midi": 57,
          "name": "A3",
          "ticks": 94212,
          "time": 43.84298671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 45,
          "name": "A2",
          "ticks": 95744,
          "time": 44.55554625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.2651167968749988,
          "durationTicks": 570,
          "midi": 62,
          "name": "D4",
          "ticks": 95767,
          "time": 44.5662439453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.23813999999999425,
          "durationTicks": 512,
          "midi": 45,
          "name": "A2",
          "ticks": 96256,
          "time": 44.79368625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9204669140625015,
          "durationTicks": 1979,
          "midi": 64,
          "name": "E4",
          "ticks": 96277,
          "time": 44.8034537109375,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.4762800000000027,
          "durationTicks": 1024,
          "midi": 40,
          "name": "E2",
          "ticks": 96768,
          "time": 45.031826249999995,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.23814000000000135,
          "durationTicks": 512,
          "midi": 33,
          "name": "A1",
          "ticks": 97792,
          "time": 45.50810625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.4762800000000027,
          "durationTicks": 1024,
          "midi": 45,
          "name": "A2",
          "ticks": 98304,
          "time": 45.74624625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578125048,
          "durationTicks": 1615,
          "midi": 61,
          "name": "C#4",
          "ticks": 98308,
          "time": 45.748106718749995,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.9027944140625053,
          "durationTicks": 4091,
          "midi": 57,
          "name": "A3",
          "ticks": 98308,
          "time": 45.748106718749995,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 45,
          "name": "A2",
          "ticks": 99840,
          "time": 46.460666249999996,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.2651167968749988,
          "durationTicks": 570,
          "midi": 62,
          "name": "D4",
          "ticks": 99863,
          "time": 46.4713639453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9525599999999983,
          "durationTicks": 2048,
          "midi": 45,
          "name": "A2",
          "ticks": 100352,
          "time": 46.69880625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9204669140625015,
          "durationTicks": 1979,
          "midi": 64,
          "name": "E4",
          "ticks": 100373,
          "time": 46.7085737109375,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.4762800000000027,
          "durationTicks": 1024,
          "midi": 41,
          "name": "F2",
          "ticks": 102400,
          "time": 47.651366249999995,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578124977,
          "durationTicks": 1615,
          "midi": 67,
          "name": "G4",
          "ticks": 102404,
          "time": 47.65322671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.8809339062500001,
          "durationTicks": 4044,
          "midi": 57,
          "name": "A3",
          "ticks": 102404,
          "time": 47.65322671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 41,
          "name": "F2",
          "ticks": 103936,
          "time": 48.36578625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.12883746093749693,
          "durationTicks": 277,
          "midi": 65,
          "name": "F4",
          "ticks": 103959,
          "time": 48.3764839453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.1353491015625039,
          "durationTicks": 291,
          "midi": 60,
          "name": "C4",
          "ticks": 104207,
          "time": 48.491833007812495,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9525599999999983,
          "durationTicks": 2048,
          "midi": 41,
          "name": "F2",
          "ticks": 104448,
          "time": 48.60392625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9423274218749995,
          "durationTicks": 2026,
          "midi": 57,
          "name": "A3",
          "ticks": 104469,
          "time": 48.6136937109375,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.4762799999999956,
          "durationTicks": 1024,
          "midi": 43,
          "name": "G2",
          "ticks": 106496,
          "time": 49.55648625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.7511642578124977,
          "durationTicks": 1615,
          "midi": 64,
          "name": "E4",
          "ticks": 106500,
          "time": 49.55834671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.6669799999999952,
          "durationTicks": 3584,
          "midi": 59,
          "name": "B3",
          "ticks": 106500,
          "time": 49.55834671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 43,
          "name": "G2",
          "ticks": 108032,
          "time": 50.270906249999996,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.2651167968749988,
          "durationTicks": 570,
          "midi": 62,
          "name": "D4",
          "ticks": 108055,
          "time": 50.2816039453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9525599999999983,
          "durationTicks": 2048,
          "midi": 43,
          "name": "G2",
          "ticks": 108544,
          "time": 50.50904625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9423274218750066,
          "durationTicks": 2026,
          "midi": 59,
          "name": "B3",
          "ticks": 108565,
          "time": 50.51881371093749,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.2637214453124983,
          "durationTicks": 567,
          "midi": 59,
          "name": "B3",
          "ticks": 110085,
          "time": 51.2257918359375,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.4762800000000027,
          "durationTicks": 1024,
          "midi": 45,
          "name": "A2",
          "ticks": 110592,
          "time": 51.461606249999996,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9976763671874949,
          "durationTicks": 2145,
          "midi": 62,
          "name": "D4",
          "ticks": 110596,
          "time": 51.46346671875,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.09534902343749962,
          "durationTicks": 205,
          "midi": 45,
          "name": "A2",
          "ticks": 112128,
          "time": 52.17602625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.23814000000000135,
          "durationTicks": 512,
          "midi": 45,
          "name": "A2",
          "ticks": 112640,
          "time": 52.414166249999994,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9204669140625015,
          "durationTicks": 1979,
          "midi": 61,
          "name": "C#4",
          "ticks": 112661,
          "time": 52.4239337109375,
          "velocity": 0.6535433070866141
        },
        {
          "duration": 0.4762800000000027,
          "durationTicks": 1024,
          "midi": 40,
          "name": "E2",
          "ticks": 113152,
          "time": 52.652306249999995,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.23814000000000135,
          "durationTicks": 512,
          "midi": 45,
          "name": "A2",
          "ticks": 114176,
          "time": 53.12858625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9600018750000032,
          "durationTicks": 2064,
          "midi": 57,
          "name": "A3",
          "ticks": 114692,
          "time": 53.368586718749995,
          "velocity": 0.6692913385826772
        },
        {
          "duration": 0.9600018750000032,
          "durationTicks": 2064,
          "midi": 60,
          "name": "C4",
          "ticks": 114692,
          "time": 53.368586718749995,
          "velocity": 0.7795275590551181
        },
        {
          "duration": 0.48790792968750196,
          "durationTicks": 1049,
          "midi": 41,
          "name": "F2",
          "ticks": 114692,
          "time": 53.368586718749995,
          "velocity": 0.7322834645669292
        },
        {
          "duration": 0.09395367187499915,
          "durationTicks": 202,
          "midi": 41,
          "name": "F2",
          "ticks": 116247,
          "time": 54.0918439453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.4902335156249933,
          "durationTicks": 1054,
          "midi": 55,
          "name": "G3",
          "ticks": 116757,
          "time": 54.3290537109375,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47162882812499163,
          "durationTicks": 1014,
          "midi": 59,
          "name": "B3",
          "ticks": 116757,
          "time": 54.3290537109375,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.47162882812499163,
          "durationTicks": 1014,
          "midi": 41,
          "name": "F2",
          "ticks": 116757,
          "time": 54.3290537109375,
          "velocity": 0.7165354330708661
        },
        {
          "duration": 0.4888381640624999,
          "durationTicks": 1051,
          "midi": 53,
          "name": "F3",
          "ticks": 117772,
          "time": 54.801147656249995,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47023347656249825,
          "durationTicks": 1011,
          "midi": 57,
          "name": "A3",
          "ticks": 117772,
          "time": 54.801147656249995,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.09255832031250577,
          "durationTicks": 199,
          "midi": 41,
          "name": "F2",
          "ticks": 118277,
          "time": 55.03603183593749,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.21581437500000078,
          "durationTicks": 464,
          "midi": 55,
          "name": "G3",
          "ticks": 118788,
          "time": 55.27370671875,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.2516283984374965,
          "durationTicks": 541,
          "midi": 59,
          "name": "B3",
          "ticks": 118788,
          "time": 55.27370671875,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.1088374218750019,
          "durationTicks": 234,
          "midi": 41,
          "name": "F2",
          "ticks": 118788,
          "time": 55.27370671875,
          "velocity": 0.7322834645669292
        },
        {
          "duration": 0.4706985937500008,
          "durationTicks": 1012,
          "midi": 41,
          "name": "F2",
          "ticks": 119330,
          "time": 55.525800234375,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.13395374999999632,
          "durationTicks": 288,
          "midi": 55,
          "name": "G3",
          "ticks": 119579,
          "time": 55.6416144140625,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.4144213671875008,
          "durationTicks": 3041,
          "midi": 59,
          "name": "B3",
          "ticks": 119838,
          "time": 55.762079765624996,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 1.4144213671875008,
          "durationTicks": 3041,
          "midi": 62,
          "name": "D4",
          "ticks": 119838,
          "time": 55.762079765624996,
          "velocity": 0.7086614173228346
        },
        {
          "duration": 0.4600008984374995,
          "durationTicks": 989,
          "midi": 41,
          "name": "F2",
          "ticks": 120343,
          "time": 55.9969639453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.22046554687500475,
          "durationTicks": 474,
          "midi": 36,
          "name": "C2",
          "ticks": 121363,
          "time": 56.471383476562494,
          "velocity": 0.6771653543307087
        },
        {
          "duration": 0.22046554687499764,
          "durationTicks": 474,
          "midi": 41,
          "name": "F2",
          "ticks": 121868,
          "time": 56.70626765625,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.2213957812500027,
          "durationTicks": 476,
          "midi": 36,
          "name": "C2",
          "ticks": 122373,
          "time": 56.9411518359375,
          "velocity": 0.6771653543307087
        },
        {
          "duration": 0.9600018749999961,
          "durationTicks": 2064,
          "midi": 59,
          "name": "B3",
          "ticks": 122884,
          "time": 57.17882671875,
          "velocity": 0.6692913385826772
        },
        {
          "duration": 0.9600018749999961,
          "durationTicks": 2064,
          "midi": 62,
          "name": "D4",
          "ticks": 122884,
          "time": 57.17882671875,
          "velocity": 0.7795275590551181
        },
        {
          "duration": 0.48790792968749486,
          "durationTicks": 1049,
          "midi": 41,
          "name": "F2",
          "ticks": 122884,
          "time": 57.17882671875,
          "velocity": 0.7322834645669292
        },
        {
          "duration": 0.09395367187499915,
          "durationTicks": 202,
          "midi": 41,
          "name": "F2",
          "ticks": 124439,
          "time": 57.9020839453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.4902335156250075,
          "durationTicks": 1054,
          "midi": 57,
          "name": "A3",
          "ticks": 124949,
          "time": 58.139293710937494,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47162882812500584,
          "durationTicks": 1014,
          "midi": 60,
          "name": "C4",
          "ticks": 124949,
          "time": 58.139293710937494,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.47162882812500584,
          "durationTicks": 1014,
          "midi": 41,
          "name": "F2",
          "ticks": 124949,
          "time": 58.139293710937494,
          "velocity": 0.7165354330708661
        },
        {
          "duration": 0.4888381640624999,
          "durationTicks": 1051,
          "midi": 55,
          "name": "G3",
          "ticks": 125964,
          "time": 58.61138765625,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47023347656249825,
          "durationTicks": 1011,
          "midi": 59,
          "name": "B3",
          "ticks": 125964,
          "time": 58.61138765625,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.2213957812499956,
          "durationTicks": 476,
          "midi": 41,
          "name": "F2",
          "ticks": 126469,
          "time": 58.8462718359375,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.21581437499999367,
          "durationTicks": 464,
          "midi": 57,
          "name": "A3",
          "ticks": 126980,
          "time": 59.08394671875,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 0.2516283984374965,
          "durationTicks": 541,
          "midi": 60,
          "name": "C4",
          "ticks": 126980,
          "time": 59.08394671875,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.4706985937500008,
          "durationTicks": 1012,
          "midi": 41,
          "name": "F2",
          "ticks": 127522,
          "time": 59.336040234375,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.13395375000000342,
          "durationTicks": 288,
          "midi": 57,
          "name": "A3",
          "ticks": 127771,
          "time": 59.451854414062495,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.4144213671875008,
          "durationTicks": 3041,
          "midi": 60,
          "name": "C4",
          "ticks": 128030,
          "time": 59.572319765625,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 1.4144213671875008,
          "durationTicks": 3041,
          "midi": 64,
          "name": "E4",
          "ticks": 128030,
          "time": 59.572319765625,
          "velocity": 0.7086614173228346
        },
        {
          "duration": 0.09395367187499915,
          "durationTicks": 202,
          "midi": 41,
          "name": "F2",
          "ticks": 128535,
          "time": 59.807203945312494,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.22279113281249607,
          "durationTicks": 479,
          "midi": 41,
          "name": "F2",
          "ticks": 129045,
          "time": 60.0444137109375,
          "velocity": 0.7165354330708661
        },
        {
          "duration": 0.22046554687499764,
          "durationTicks": 474,
          "midi": 36,
          "name": "C2",
          "ticks": 129555,
          "time": 60.2816234765625,
          "velocity": 0.6771653543307087
        },
        {
          "duration": 0.22046554687499764,
          "durationTicks": 474,
          "midi": 41,
          "name": "F2",
          "ticks": 130060,
          "time": 60.51650765625,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.2213957812499956,
          "durationTicks": 476,
          "midi": 45,
          "name": "A2",
          "ticks": 130565,
          "time": 60.7513918359375,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9600018750000032,
          "durationTicks": 2064,
          "midi": 60,
          "name": "C4",
          "ticks": 131076,
          "time": 60.989066718749996,
          "velocity": 0.6692913385826772
        },
        {
          "duration": 0.9600018750000032,
          "durationTicks": 2064,
          "midi": 64,
          "name": "E4",
          "ticks": 131076,
          "time": 60.989066718749996,
          "velocity": 0.7795275590551181
        },
        {
          "duration": 0.48790792968750196,
          "durationTicks": 1049,
          "midi": 43,
          "name": "G2",
          "ticks": 131076,
          "time": 60.989066718749996,
          "velocity": 0.7322834645669292
        },
        {
          "duration": 0.09395367187499915,
          "durationTicks": 202,
          "midi": 43,
          "name": "G2",
          "ticks": 132631,
          "time": 61.7123239453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.4902335156249933,
          "durationTicks": 1054,
          "midi": 59,
          "name": "B3",
          "ticks": 133141,
          "time": 61.9495337109375,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47162882812499163,
          "durationTicks": 1014,
          "midi": 62,
          "name": "D4",
          "ticks": 133141,
          "time": 61.9495337109375,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.47162882812499163,
          "durationTicks": 1014,
          "midi": 43,
          "name": "G2",
          "ticks": 133141,
          "time": 61.9495337109375,
          "velocity": 0.7165354330708661
        },
        {
          "duration": 0.4888381640624999,
          "durationTicks": 1051,
          "midi": 57,
          "name": "A3",
          "ticks": 134156,
          "time": 62.421627656249996,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47023347656249825,
          "durationTicks": 1011,
          "midi": 60,
          "name": "C4",
          "ticks": 134156,
          "time": 62.421627656249996,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.47534976562500475,
          "durationTicks": 1022,
          "midi": 43,
          "name": "G2",
          "ticks": 134661,
          "time": 62.65651183593749,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.8809339062500072,
          "durationTicks": 4044,
          "midi": 59,
          "name": "B3",
          "ticks": 135172,
          "time": 62.89418671874999,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 1.9027944140625124,
          "durationTicks": 4091,
          "midi": 62,
          "name": "D4",
          "ticks": 135172,
          "time": 62.89418671874999,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.22186089843749812,
          "durationTicks": 477,
          "midi": 38,
          "name": "D2",
          "ticks": 135714,
          "time": 63.146280234375,
          "velocity": 0.6850393700787402
        },
        {
          "duration": 0.22046554687499764,
          "durationTicks": 474,
          "midi": 43,
          "name": "G2",
          "ticks": 136222,
          "time": 63.382559765625,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.22279113281249607,
          "durationTicks": 479,
          "midi": 38,
          "name": "D2",
          "ticks": 136727,
          "time": 63.6174439453125,
          "velocity": 0.6850393700787402
        },
        {
          "duration": 0.22279113281250318,
          "durationTicks": 479,
          "midi": 43,
          "name": "G2",
          "ticks": 137237,
          "time": 63.8546537109375,
          "velocity": 0.7165354330708661
        },
        {
          "duration": 0.09162808593750071,
          "durationTicks": 197,
          "midi": 31,
          "name": "G1",
          "ticks": 137747,
          "time": 64.0918634765625,
          "velocity": 0.6692913385826772
        },
        {
          "duration": 0.22046554687500475,
          "durationTicks": 474,
          "midi": 38,
          "name": "D2",
          "ticks": 138252,
          "time": 64.32674765624999,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.2213957812499956,
          "durationTicks": 476,
          "midi": 43,
          "name": "G2",
          "ticks": 138757,
          "time": 64.5616318359375,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.9600018750000032,
          "durationTicks": 2064,
          "midi": 57,
          "name": "A3",
          "ticks": 139268,
          "time": 64.79930671874999,
          "velocity": 0.6692913385826772
        },
        {
          "duration": 0.9600018750000032,
          "durationTicks": 2064,
          "midi": 62,
          "name": "D4",
          "ticks": 139268,
          "time": 64.79930671874999,
          "velocity": 0.7795275590551181
        },
        {
          "duration": 0.48790792968750907,
          "durationTicks": 1049,
          "midi": 45,
          "name": "A2",
          "ticks": 139268,
          "time": 64.79930671874999,
          "velocity": 0.7322834645669292
        },
        {
          "duration": 0.09395367187499915,
          "durationTicks": 202,
          "midi": 45,
          "name": "A2",
          "ticks": 140823,
          "time": 65.5225639453125,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 0.4902335156250075,
          "durationTicks": 1054,
          "midi": 55,
          "name": "G3",
          "ticks": 141333,
          "time": 65.7597737109375,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47162882812500584,
          "durationTicks": 1014,
          "midi": 59,
          "name": "B3",
          "ticks": 141333,
          "time": 65.7597737109375,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.47162882812500584,
          "durationTicks": 1014,
          "midi": 45,
          "name": "A2",
          "ticks": 141333,
          "time": 65.7597737109375,
          "velocity": 0.7165354330708661
        },
        {
          "duration": 0.4888381640625141,
          "durationTicks": 1051,
          "midi": 59,
          "name": "B3",
          "ticks": 142348,
          "time": 66.23186765624999,
          "velocity": 0.6299212598425197
        },
        {
          "duration": 0.47023347656251246,
          "durationTicks": 1011,
          "midi": 62,
          "name": "D4",
          "ticks": 142348,
          "time": 66.23186765624999,
          "velocity": 0.7401574803149606
        },
        {
          "duration": 0.09255832031249156,
          "durationTicks": 199,
          "midi": 45,
          "name": "A2",
          "ticks": 142853,
          "time": 66.4667518359375,
          "velocity": 0.6929133858267716
        },
        {
          "duration": 1.880933906249993,
          "durationTicks": 4044,
          "midi": 57,
          "name": "A3",
          "ticks": 143364,
          "time": 66.70442671875,
          "velocity": 0.5905511811023622
        },
        {
          "duration": 1.880933906249993,
          "durationTicks": 4044,
          "midi": 61,
          "name": "C#4",
          "ticks": 143364,
          "time": 66.70442671875,
          "velocity": 0.7007874015748031
        },
        {
          "duration": 0.23767488281249882,
          "durationTicks": 511,
          "midi": 45,
          "name": "A2",
          "ticks": 143364,
          "time": 66.70442671875,
          "velocity": 0.7322834645669292
        },
        {
          "duration": 0.4706985937500008,
          "durationTicks": 1012,
          "midi": 40,
          "name": "E2",
          "ticks": 143906,
          "time": 66.95652023437499,
          "velocity": 0.6850393700787402
        },
        {
          "duration": 0.4600008984374995,
          "durationTicks": 989,
          "midi": 33,
          "name": "A1",
          "ticks": 144919,
          "time": 67.4276839453125,
          "velocity": 0.6692913385826772
        },
        {
          "duration": 0.22046554687499054,
          "durationTicks": 474,
          "midi": 40,
          "name": "E2",
          "ticks": 145939,
          "time": 67.9021034765625,
          "velocity": 0.6850393700787402
        },
        {
          "duration": 0.47023347656249825,
          "durationTicks": 1011,
          "midi": 45,
          "name": "A2",
          "ticks": 146444,
          "time": 68.13698765625,
          "velocity": 0.7007874015748031
        }
      ]
    }
  ]
}
