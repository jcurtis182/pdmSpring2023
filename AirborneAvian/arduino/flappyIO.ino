//https://youtu.be/AlKdYvzrQ30

const int btnPin = 3;
const int ledRed = 13;
const int ledGreen = 11;

int ledRState = LOW;
int ledGState = LOW;
int btnState = LOW;

void setup() {
  pinMode(btnPin, INPUT);
  pinMode(ledRed, OUTPUT);
  pinMode(ledGreen, OUTPUT);
  Serial.begin(9600);
}


void loop() {
  btnState = digitalRead(btnPin);
  Serial.println(btnState);
  
  if(Serial.available() > 0){
    String command = Serial.readStringUntil('\n');
    command.trim();

    if(command == "red_ON"){
      digitalWrite(ledRed, HIGH);
      digitalWrite(ledGreen, LOW);
    }

    else if (command == "green_ON"){
      digitalWrite(ledGreen, HIGH);
      digitalWrite(ledRed, LOW);
    }
  }
  delay(70);
}