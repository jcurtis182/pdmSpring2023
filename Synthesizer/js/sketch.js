let slider;
const synth = new Tone.PluckSynth();
const reverb = new Tone.JCReverb(0.4).toDestination();
synth.connect(reverb);

let notes = {
  '1': 'C4',
  '2': 'D4',
  '3': 'E4',
  '4': 'F4',
  '5': 'G4',
  '6': 'A4',
  '7': 'B4',
  '8': 'C5'
}

const {PingPongDelay} = ("tone");
const pingPong = new Tone.PingPongDelay().toDestination({ "delayTime": 0 });
synth.connect(pingPong);

function setup() {
  createCanvas(500, 500);
  
  slider = new Nexus.Slider('#slider', {
    'size' : [500,50],
    'mode' : 'absolute',
    'min' : 0,
    'max' : 50,
    'step' : 5
  });
  slider.colorize('accent', '#ff0000');
  synth.release = 2;
  synth.resonance = 0.98;
  slider.on('change', ()=> {pingPong.delayTime.value = slider.value;})
  reverb.toDestination();
}

function draw() {
  background(random(255),random(255),random(255));
  frameRate(1.5);

  
  textFont('Arial');
  textAlign(CENTER);
  fill(255);
  stroke(0);
  strokeWeight(1.5);
  textSize(12);
  text('^ Delay ^', width/2, 15);
  textSize(25);
  text('Press keys 1-8 to play.', width/2,height/2);
  
}

function keyPressed() {
  let play = notes[key];
  console.log(play);
  synth.triggerAttackRelease(play, 0.5);
}