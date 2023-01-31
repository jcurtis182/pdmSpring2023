let activeColor = 'black';
let brushSize = 15;
let dragging = 0;
let onMenu = 0;

function setup() {
  createCanvas(800, 450);
  background(220);
}

function draw() {
  colorBar();
  brushBar();
  colorPicker();
  sizePicker();
  isOnMenu();
  drawLine();
  eraseAll();
}

function colorBar(){
  stroke(0);
  fill(255);
  strokeWeight(0.25);
  rect(2,2,26,250);
  stroke(0);
  strokeWeight(0.25);
  fill('red');
    square(5,5,20);
  fill('orange');
    square(5,30,20);
  fill('yellow');
    square(5,55,20);
  fill('green');
    square(5,80,20);
  fill('blue');
    square(5,105,20);
  fill('purple');
    square(5,130,20);
  fill('violet');
    square(5,155,20);
  fill('brown');
    square(5,180,20);
  fill('white');
    square(5,205,20);
  fill('black');
    square(5,230,20);
}

function colorPicker() {
  if(dragging){
    if(mouseX < 25){
      if (mouseY >= 5 && mouseY <= 20) 
         activeColor = "red";
      else if (mouseY > 25 && mouseY < 55) 
         activeColor = 'orange';
      else if (mouseY > 60 && mouseY < 70) 
         activeColor = "yellow";
      else if (mouseY > 85 && mouseY < 95) 
         activeColor = "green";
      else if (mouseY > 110 && mouseY < 130) 
         activeColor = "blue";
      else if (mouseY > 135 && mouseY < 155) 
         activeColor = "purple";
      else if (mouseY > 160 && mouseY < 180) 
         activeColor = "violet";
      else if (mouseY > 185 && mouseY < 205) 
         activeColor = "#794533";
      else if (mouseY > 210 && mouseY < 230) 
         activeColor = "white";
      else if (mouseY > 235 && mouseY < 265) 
         activeColor = "black";   
    }
  }
}

function brushBar(){
  stroke(0);
  fill(255);
  rect(765,5,30,115);
  stroke(255);
  strokeWeight(0.25);
  fill('black');
  circle(780,20,25);
  circle(780,50,20);
  circle(780,75,15);
  circle(780,95,10);
  circle(780,110,5);
}

function sizePicker(){
  if(dragging){
    if(mouseX >= 767 && mouseX <= 792){
      if(mouseY >= 5 && mouseY <= 31){
        brushSize = 25;
        console.log("[-] big mode engaged");
      }
    }
    if(mouseX >= 770 && mouseX <= 790){
      if(mouseY >= 40 && mouseY <= 60){
        brushSize = 20;
        console.log("[-] rather large mode engaged");
      }
    }
    if(mouseX >= 772 && mouseX <= 787){
      if(mouseY >= 65 && mouseY <= 81){
        brushSize = 15;
        console.log("[-] average mode engaged");
      }
    }
    if(mouseX >= 775 && mouseX <= 785){
      if(mouseY >= 90 && mouseY <= 100){
        brushSize = 10;
        console.log("[-] rather small mode engaged");
      }
    }
    if(mouseX >= 775 && mouseX <= 785){
      if(mouseY >= 107 && mouseY <= 112){
        brushSize = 5;
        console.log("[-] baby mode engaged");
      }
    }
  }
}

function drawLine(){
  strokeWeight(brushSize);
  stroke(activeColor);
  if(dragging == 1 && onMenu == 0){  
    line(pmouseX, pmouseY, mouseX, mouseY);
  }
}

function eraseAll(){
  stroke('red');
  strokeWeight(3);
  line(780,425,800,450);
  line(800,425,780,450);
  if(dragging){
    if(mouseX >= 780 && mouseY >= 425){
      fill(220);
      noStroke();
      rect(0, 0, width, height);
      brushSize = 10;
      console.log("[!] Canvas Cleared");
    }
  }
}

function isOnMenu(){
  if(mouseX >=2 && mouseX <= 26){
    if(mouseY >=2 && mouseY <= 250){
      onMenu = 1;
      console.log("[*] On color menu");
    }
  }
  if(mouseX >= 765 && mouseX <= 795){
    if(mouseY >= 2 && mouseY <= 115){
      onMenu = 1;
      console.log("[*] On size menu");
    }
  }
  else onMenu = 0;
}

function mousePressed(){
  dragging = 1;
}

function mouseReleased(){
  dragging = 0;
}