let sounds = new Tone.Players({

  "wtdd" : "sounds/wtdd.mp3",
  "boom" : "sounds/vineboom.mp3",
  "pipe" : "sounds/pipe.mp3",
  "ben" : "sounds/ben.mp3"

});

const delay = new Tone.FeedbackDelay("8n", 0.5);

let soundNames = ["wtdd", "boom", "pipe", "ben"];
let buttons = [];

let dSlider;
let pSlider;

function setup() {
  createCanvas(400, 400);
  sounds.connect(delay);
  delay.toDestination();

  soundNames.forEach((word, index) => {
    buttons[index] = createButton(word);
    buttons[index].position(165, 75 + index*50);
    buttons[index].mousePressed( () => buttonSound(word))
  })

  dSlider = createSlider(0, 1, 0.5, 0.05);
  dSlider.mouseReleased( () => {
    delay.delayTime.value = dSlider.value();
  })

  pSlider = createSlider(0, 1, 0.5, 0.05);
  pSlider.mouseReleased( () => {
    delay.feedback.value = pSlider.value();
  })

}

function draw() {
  background(random(255),random(255),random(255));
  frameRate(1);
  textAlign(CENTER);
  fill(255);
  textSize(20);
  textFont("Comic Sans");
  stroke(0);
  strokeWeight(0.5);
  text("Press buttons to play sound.", 200, 50);
  text("Delay", 30, 395);
  text("Feedback", 180, 395);
  textSize(12);
  text("Be cautious at maximum values!", 320, 395);

}

function buttonSound(whichSound){
  sounds.player(whichSound).start();
}