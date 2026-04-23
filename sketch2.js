let handPose;
let video;
let hands = [];

const trail = [];
const MAX_TRAIL = 20;

let swordImg;
// let swordImg = new Image();
// swordImg.src = 'kris_sword.png';
// swordImg.onload = () => console.log('sword loaded ok');
// swordImg.onerror = () => console.error('sword failed — check filename/path');

// const dotCanvas = document.createElement('canvas');

// dotCanvas.width = 640;
// dotCanvas.height = 480;
// const ctx = dotCanvas.getContext('2d');




  function waitForPlaying(videoEl){
    return new Promise(resolve => {
        if(!videoEl.paused && videoEl.readyState >= 3) return resolve();
        videoEl.addEventListener('playing', resolve, { once: true});
    })
  }

  function isFist(hand) {
    const kps = hand.keypoints;

    const fingers = [
        {tip: 8, base: 6},
        {tip: 12, base: 10},
        {tip: 16, base: 14},
        {tip: 20, base: 18}
    ];
    return fingers.every(f => kps[f.tip].y > kps[f.base].y);
  }

function updateTrail(hand) {
    const wrist = hand.keypoints[0];
    trail.push({ x: wrist.x, y: wrist.y});
    if(trail.length > MAX_TRAIL) trail.shift();
}

function drawTrail(){
    if(trail.length < 2) return;

    for(let i = 1; i < trail.length; i++){
        const alpha = i / trail.length;
        const w = alpha * 12;
        const a = trail[i - 1];
        const b = trail[i];

        stroke(255, 80, 0, alpha * 80);
        strokeWeight(w * 2.5);
        line(a.x, a.y, b.x, b.y);

        stroke(255, 255, 255, alpha * 230);
        strokeWeight(w);
        line(a.x, a.y, b.x, b.y);

        // ctx.beginPath();
        // ctx.moveTo(a.x, a.y);
        // ctx.lineTo(b.x, b.y);
        // ctx.strokeStyle = `rgba(255, 80, 0, ${alpha * 0.3})`;
        // ctx.lineWidth = width * 2.5;
        // ctx.lineCap = 'round';
        // ctx.stroke();

        // ctx.beginPath();
        // ctx.moveTo(a.x, a.y);
        // ctx.lineTo(b.x, b.y);
        // ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        // ctx.lineWidth = width;
        // ctx.lineCap = 'round';
        // ctx.stroke();
    }



}


async function setup() {
//   let cnv = createCanvas(640, 480);

swordImg = await loadImage("kris_sword.png");
createCanvas(640, 480);
//   cnv.elt.style.background = 'transparent';

  handPose = await ml5.handPose();
  video = createCapture(VIDEO);

  video.size(640, 480);
  video.hide();

    handPose.detectStart(video, gotHands);

}



function drawWeapon(hand){
    const kps = hand.keypoints;
    const wrist = kps[0];
    const middleMCP = kps[9];

    const angle = Math.atan2(
        middleMCP.y - wrist.y,
        middleMCP.x - wrist.x
    ) + Math.PI / 2;

    const imgW = 80;
    const imgH = 200;

    const gripX = (wrist.x + middleMCP.x) /2;
    const gripY = (wrist.y + middleMCP.y) /2;

    push();
    translate(gripX, gripY);
    rotate(angle);
    imageMode(CENTER);
    image(swordImg, 0, -imgH * 0.25, imgW, imgH);
    pop();

    // ctx.save();
    // // ctx.translate(wrist.x, wrist.y);
    // ctx.translate(gripX, gripY);
    // ctx.rotate(angle);
    // ctx.drawImage(swordImg, -imgW / 2, -imgH * 0.75, imgW, imgH);
    // ctx.restore();
}

function draw() {
    // ctx.clearRect(0, 0, 640, 480);
    // clear();
//   background(220);
    image(video, 0, 0);
    
    for(let hand of hands){
        const fist = isFist(hand);

        if(fist) {
            updateTrail(hand);
        } else {
            trail.length = 0;
        }

        drawTrail();

        if(fist) drawWeapon(hand);

        for(let kp of hand.keypoints){
            fill(255,0,0);
            noStroke();
            circle(kp.x, kp.y, 10);
            // ctx.beginPath();
            // ctx.arc(kp.x, kp.y, 5, 0, Math.PI * 2);
            // ctx.fillStyle = 'green';
            // ctx.fill();
        }

        // for(let [a, b] of handPose.getConnections()){
        //     let kps = hand.keypoints;
        //     stroke(0, 255, 0);
        //     strokeWeight(2);
        //     line(kps[a].x, kps[a].y, kps[b].x, kps[b].y);
        // }

    }
}

function gotHands(results){
    hands = results;
}