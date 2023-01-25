function setup() {
  createCanvas(800, 400);
}

function draw() {
  background(0);
  noStroke();

//pacman
  //face
  fill(255,255,0)
  circle(200,200,350);
  
  //mouth
  fill(0,0,0);
  triangle(200,200, 0,0, 0,400);
  
//ghost
  //base
  fill(255,0,0);
  arc(600, 175, 300, 300, PI, TWO_PI);
  rect(450,175,300,200);
  
  //eyes
  fill(255);
  circle(525,185,100);  //scalera
  circle(675,185,100);
  
  fill(0,0,255);
  circle(525,185,60);  //iris
  circle(675,185,60);
}