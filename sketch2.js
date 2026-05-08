let forestImg;
let fieldImg;
let beachImg;

let imageSwitch = false;

async function setup() {
  createCanvas(400, 400);
  forestImg = await loadImage("images/forest1.jpg");
  fieldImg = await loadImage("images/fields2.jpg");
  beachImg = await loadImage("images/beach1.jpg");
}

function draw() {
  background(220);
  image(beachImg, 0, 0, 400, 400);
  if(imageSwitch){
    tint(255, 100);
  } else {
    noTint();
  }
  
  
  if(imageSwitch){
    noTint();
  } else {
    tint(255,100);
  }
  image(fieldImg, 0, 0, 400, 400);
}

function mousePressed(){
  imageSwitch = !imageSwitch;

}


