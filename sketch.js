let handPose;
let video;
let hands = [];
let hydra;

let swordImg = new Image();
swordImg.src = 'kris_sword.png';
swordImg.onload = () => console.log('sword loaded ok');
swordImg.onerror = () => console.error('sword failed — check filename/path');

const dotCanvas = document.createElement('canvas');
dotCanvas.width = 640;
dotCanvas.height = 480;
const ctx = dotCanvas.getContext('2d');

// const overlay = document.getElementById('overlay').getContext('2d');
  hydra = new Hydra({
    canvas: document.getElementById("hydra-canvas"),
    detectAudio: false,
    makeGlobal: true
  })


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

async function setup() {
//   let cnv = createCanvas(640, 480);

// swordImg = await loadImage("kris_sword.png");

createCanvas(1,  1);
//   cnv.elt.style.background = 'transparent';

  handPose = await ml5.handPose();
  video = createCapture(VIDEO);
//   video = await createCapture(VIDEO, () => {
//     s0.initVideo(video.elt);
//     src(s0)
//         .blend(osc(10, 0.1, 1.5).color(0.5, 0.3, 1), 0.5)
//         .out();
//   });
  video.size(640, 480);
  video.hide();

    await waitForPlaying(video.elt);

    s0.initVideo(video.elt);
    s1.init({ src: dotCanvas})

    //   src(s0)
    //     .layer(src(s1))
    //     .out();
    src(s0)
    .mult(osc(10, 0.1, 0.5).color(0.5, 0.3, 1), 0.4)
    .layer(src(s1))
    .out();

    handPose.detectStart(video, gotHands);


//   await s0.initCam();
//   s1.init({src: dotCanvas});



    // video.elt.onloadedmetadata = () => {
    //     video.elt.play();
    // };
    // video.elt.onplaying = () => {
    //     s0.initVideo(video.elt);
    //     s1.init({ src: dotCanvas})
    //     src(s0)
    //     .blend(osc(10, 0.1, 1.5).color(0.5, 0.3, 1), 0.5)
    //     .layer(src(s1))
    //     .out();
    // }





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

    ctx.save();
    // ctx.translate(wrist.x, wrist.y);
    ctx.translate(gripX, gripY);
    ctx.rotate(angle);
    ctx.drawImage(swordImg, -imgW / 2, -imgH * 0.75, imgW, imgH);
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, 640, 480);
    // clear();
//   background(220);
    // image(video, 0, 0);
    
    for(let hand of hands){
        const fist = isFist(hand);

        if(fist) {
            osc(40, 0.05, 2).color(1, 0, 0).rotate(0.5).mult(src(s0), 0.7).layer(src(s1)).out();
        } else {
            src(s0).blend(osc(10, 0.1, 1.5).color(0.5, 0.3, 1), 0.3).layer(src(s1)).out();
        }

        if(fist) drawWeapon(hand);


        for(let kp of hand.keypoints){
            // fill(255,0,0);
            // noStroke();
            // circle(kp.x, kp.y, 10);
            ctx.beginPath();
            ctx.arc(kp.x, kp.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'green';
            ctx.fill();
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