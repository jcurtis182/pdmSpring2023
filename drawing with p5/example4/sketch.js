function setup() {
  createCanvas(500, 500);
}

function draw() {
  background(0,0,150);
  stroke(255);
  strokeWeight(6);
  
//circle
  fill(0,150,0);
  circle(height/2,width/2,250)
  
//star
  fill(255,0,0);
  beginShape();
  vertex(365,200) //far top right
  vertex(280,200) //mid top right
  vertex(250,120) //center top
  vertex(220,200) //mid top left
  vertex(135,200) //far top left
  vertex(200,260) //mid bot left
  vertex(170,350) //far bot left
  vertex(250,300) //center bottom
  vertex(330,350) //far bot right
  vertex(300,260) //mid bot right
  endShape(CLOSE); 
  }

