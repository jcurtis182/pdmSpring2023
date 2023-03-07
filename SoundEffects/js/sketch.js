var noBonk, bonk, synth, reverb, chorus, autowah;
var textInfo = "Click the mouse button to disavow unbecoming behavior.";

function preload(){
	noBonk = loadImage('assets/noBonk.jpg')
  bonk = loadImage('assets/bonk.jpg');
}

function setup(){
	createCanvas(800,640);
  image(noBonk,0,0)
  
  synth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    envelope: {
      attack: 0.001, 
      decay: 0.1, 
      sustain: 0, 
      release: 0.2 
    }
  }).toDestination();
  
  reverb = new Tone.Reverb({
    decay: 5,
    wet: 0.5
  }).toDestination();

  chorus = new Tone.Chorus({
    frequency: 1,
    delayTime: 2.5,
    wet: 0.5
  }).toDestination();

  autowah = new Tone.AutoWah({
    octaves: 1,
    Q: 9,
    wet: 0.3
  }).toDestination();

  synth.connect(reverb).connect(chorus).connect(autowah);
}

function draw(){
	textSize(24);
  textAlign(CENTER);
	text(textInfo,width/2,30);
}

function mousePressed(){
	image(bonk,0,0);
	bonkSound();
}

function mouseReleased(){
	image(noBonk,0,0);
}

function bonkSound(){
  synth.envelope.attack = 0.001 + Math.random() * 0.01;           //adding in some variety when spamming (a natural response)
  synth.envelope.release = 0.2 + Math.random() * 0.1;
  synth.triggerAttackRelease("C1", "8n");
}