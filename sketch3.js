    let x = 0, y = 0, z = 0;
    let buf = "";
    let side = "NONE";
    let lastTriggeredSide = "NONE";  // tracks what we already played
    let synths = {};

    let forestImg;
    let fieldImg;
    let beachImg;

    let forests = [];
    let fields = [];
    let beaches = [];

    let imageSwitch = false;

    let videos = [];
    let mp4video;
    let currentVideoIndex = 0;

    let currentBackground;
    let currentBackgroundIndex = 0;

    let currentForestIndex = 0;
    let currentFieldsIndex = 0;
    let currentBeachIndex = 0;

    let nextFieldIndex = 0;

    let selectedEnvironmentImage = "field";
    let nextBackgroundIndex = 0;
    let backgroundAlpha = 255;

    let fieldAlpha = 255;
    let transitioning = false;

    let hitCounter = 0;
    let hitLeft = false;
    let hitRight = false;

    let shakeRegion = null;   // "LEFT", "RIGHT", "TOP", or null
    let shakeTimer = 0;
    let shakeDuration = 20;   // frames
    let shakeAmount = 30;     // max pixel distortion

    let currentTechniqueIndex = 0;

    let bolo;
    let sickle;


    let krisSword;
    let stickTipX = 0, stickTipY = 0;
    let stickFound = false;

    let targetR = 0, targetG = 0, targetB = 255;
    let colorThreshold = 80;

    let techniques = [
        {"name": "X-Strike", "count": 2 },
        {"name": "Planza", "count": 2},
        {"name": "Witik", "count": 3},
        {"name": "Corbato", "count": 3},
        {"name": "Thrust", "count": 2},
        {"name": "Abaniko", "count": 2},
        {"name": "Arko", "count": 4}
    ]


    let handPose;
    let cam;
    let hands = [];

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
        frameRate(30);
        createCanvas(1920, 1080);

        forestImg = await loadImage("images/forest1.jpg");
        fieldImg = await loadImage("images/fields1.jpg");
        beachImg = await loadImage("images/beach1.jpg");

        krisSword = await loadImage("kris_sword.png");
        bolo = await loadImage("bolo.png");
        sickle = await loadImage("sickle.png");
        
        for (let i = 0; i < 7; i++) {

            beaches[i] = await loadImage(`images/beach${i}.jpg`);
            forests[i] = await loadImage(`images/forest${i}.jpg`);
            fields[i] = await loadImage(`images/fields${i}.jpg`);
            // Assuming you have video1.mp4, video2.mp4, etc.
            videos[i] = createVideo(['videos/eskrima' + i + '.mp4']);
            videos[i].volume(0);
            videos[i].hide(); // Hide HTML elements
            videos[i].loop(); // Loop them    
        }

        currentBackground = forests[0];


        // handPose = await ml5.handPose();
        // cam = createCapture(VIDEO);

        // cam.size(640, 480);
        // cam.hide();

        // handPose.detectStart(cam, gotHands);

        cam = createCapture(VIDEO, () => {
        // camera is ready, now load and start handpose
            ml5.handPose(cam, { flipped: false }, (model) => {
                handPose = model;
                handPose.detectStart(cam, gotHands);
            });
        });
        cam.size(width, height);
        cam.hide();

    //       mp4video = createVideo(["videos/eskrima.mp4"]);
    //     mp4video.volume(0);

    //       // mp4video.autoplay();
    //     mp4video.loop();
    //     mp4video.hide();

        synths = {
        RIGHT:  new Tone.Synth({ oscillator: { type: "square" },  envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 } }).toDestination(),
        LEFT:   new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 } }).toDestination(),
        TOP:    new Tone.Synth({ oscillator: { type: "sine" },    envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.3 } }).toDestination(),
        BOTTOM: new Tone.NoiseSynth({ noise: { type: "brown" },   envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 } }).toDestination(),
        FRONT:  new Tone.MetalSynth({ frequency: 200, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }, modulationIndex: 16, resonance: 4000, octaves: 1.5 }).toDestination(),
        BACK:   new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.05, decay: 0.5, sustain: 0, release: 0.4 } }).toDestination(),
        };

        const notes = { RIGHT: "C4", LEFT: "G3", TOP: "Eb5", BOTTOM: null, FRONT: null, BACK: "Ab3" };
        for (let s in synths) synths[s]._note = notes[s];

        let btn = createButton("connect serial");
        btn.mousePressed(async () => {
        await Tone.start();
        // mp4video.play();
            for (let i = 0; i < videos.length; i++) {
        videos[i].play();
    }
        

        console.log("Tone started:", Tone.context.state);

        let port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });

        let decoder = new TextDecoderStream();
        port.readable.pipeTo(decoder.writable);
        decoder.readable.pipeTo(new WritableStream({
            write(chunk) { onData(chunk); }
        }));
        });
    }

    function findStickTip() {
  if (!cam || cam.elt.readyState < 2) return;
  cam.loadPixels();

  let sumX = 0, sumY = 0, count = 0;

  // sample every 4th pixel for performance
  for (let i = 0; i < cam.pixels.length; i += 16) {
    let r = cam.pixels[i];
    let g = cam.pixels[i + 1];
    let b = cam.pixels[i + 2];

    let dist = abs(r - targetR) + abs(g - targetG) + abs(b - targetB);
    if (dist < colorThreshold) {
      let idx = (i / 4);
      sumX += idx % cam.width;
      sumY += floor(idx / cam.width);
      count++;
    }
  }

  if (count > 30) {
    // map from cam coords to canvas coords
    stickTipX = map(sumX / count, 0, cam.width,  0, width);
    stickTipY = map(sumY / count, 0, cam.height, 0, height);
    stickFound = true;
  } else {
    stickFound = false;
  }
}

    function triggerSound(sideName) {
        let s = synths[sideName];
        if (!s) return;
        console.log("triggering:", sideName);   // confirm this fires

        if (s instanceof Tone.NoiseSynth) {
        s.triggerAttackRelease("8n");
        } else if (s instanceof Tone.MetalSynth) {
        s.triggerAttackRelease("16n");
        } else {
        s.triggerAttackRelease(s._note, "8n");
        }
    }

    function onData(chunk) {
        buf += chunk;
        let lines = buf.split("\n");
        buf = lines.pop();

        for (let line of lines) {
        line = line.trim().replace(/\r/g, "");
        //   console.log("RAW LINE:", JSON.stringify(line));  // ← add this
        let parts = line.trim().split(",");
        //   console.log("PARTS:", parts, "LENGTH:", parts.length); // ← and this
        if (parts.length === 4) {
            x = parseFloat(parts[0]);
            y = parseFloat(parts[1]);
            z = parseFloat(parts[2]);
            let incoming = parts[3].trim();
            // console.log("incoming side:", incoming);


            // Trigger sound HERE — only on new hit, not in draw()
            if (incoming !== "NONE" && incoming !== lastTriggeredSide) {
                hitCounter++;

                if (incoming === "LEFT" || incoming === "RIGHT" || incoming === "TOP") {
                    shakeRegion = incoming;
                    shakeTimer = shakeDuration;
                }

                if(hitCounter >= techniques[currentVideoIndex].count){
                    triggerSound(incoming);
                    imageSwitch = !imageSwitch;
                    lastTriggeredSide = incoming;
                    
                    //   currentFieldsIndex = (currentFieldsIndex + 1) % fields.length;
                    let randomNum = int(random(0, 2));

                    //create randomNum to select a random pictures set
                    // but keep incrementing all picture set indexes
                    //
                    currentVideoIndex = (currentVideoIndex + 1) % videos.length; 

                    switch(randomNum){
                        case 0:
                            selectedEnvironmentImage = "field";
                            break;
                        case 1:
                            selectedEnvironmentImage = "forest";
                            break;
                        case 2:
                            selectedEnvironmentImage = "beach";
                            break;
                        default:
                            break;
                    }


                    currentBackgroundIndex = (currentVideoIndex + 1) % videos.length;
                    nextBackgroundIndex = (currentVideoIndex + 1) % videos.length;
                    // nextFieldIndex = (currentFieldsIndex + 1) % fields.length;
                    
                    backgroundAlpha = 0;
                    transitioning = true;
                    hitCounter = 0;
                    
                    
                    currentTechniqueIndex = currentVideoIndex;


                    setTimeout(() => { lastTriggeredSide = "NONE"; }, 600);
                } 
            }

            

            side = incoming;
            }
        }
    }

    function showEnvironmentBackground(backgroundState){
        if(backgroundState === "current"){
            switch(selectedEnvironmentImage){
                case "field":
                    currentBackground = fields[currentBackgroundIndex];
                    return image(fields[currentVideoIndex], 0, 0, width, height);
                case "forest":
                    currentBackground = forests[currentBackgroundIndex];
                    return image(forests[currentVideoIndex], 0, 0, width, height);
                case "beach":
                    currentBackground = beaches[currentBackgroundIndex];
                    return image(beaches[currentVideoIndex], 0, 0, width, height);
                default:
                    break;
            }
        } else if(backgroundState === "next"){
            switch(selectedEnvironmentImage){
                case "field":
                    currentBackground = fields[nextBackgroundIndex];
                    return image(fields[nextBackgroundIndex], 0, 0, width, height);
                case "forest":
                    currentBackground = forests[nextBackgroundIndex];
                    return image(forests[nextBackgroundIndex], 0, 0, width, height);
                case "beach":
                    currentBackground = beaches[nextBackgroudIndex];
                    return image(beaches[nextBackgroundIndex], 0, 0, width, height);
                default:
                    break;
            }
        }

    }

    function showNextEnvironmentBackground(){

    }

    function draw() {
        background(240);

        // if(imageSwitch){
        //   image(beachImg, 0, 0, width, height);
        //   // tint(255, 117);
        //   image(fieldImg, 0, 0, width, height);
        //   // noTint();
        // } else {
        //   image(fieldImg, 0, 0, width, height);
        //   // tint(255, 117);
        //   image(beachImg, 0, 0, width, height);
        //   // noTint();
        // }

        tint(255, 255);
        // image(fields[currentFieldsIndex], 0, 0, width, height);
        // showCurrentEnvironmentBackground();
        showEnvironmentBackground("current");

        if(transitioning){
            tint(255, backgroundAlpha);
            // image(fields[nextFieldIndex], 0, 0, width, height);
            showEnvironmentBackground("next");

            backgroundAlpha += 75;
            if(backgroundAlpha >= 255){
                backgroundAlpha = 255;
                // currentFieldsIndex = nextFieldIndex;
                currentBackgroundIndex = nextBackgroundIndex;
                transitioning = false;
            } 
        }
        noTint();

        if (shakeTimer > 0) {
        let progress = shakeTimer / shakeDuration;        // 1.0 → 0.0
        let amount = shakeAmount * progress;              // fades out as timer drops

        if (shakeRegion === "LEFT") {
            // distort left third of screen
            let regionW = width / 3;
            for (let row = 0; row < height; row += 4) {
            let offset = sin(row * 0.1 + shakeTimer * 0.8) * amount;
            copy(
                // fields[currentFieldsIndex],
                currentBackground,
                0, row, regionW, 4,           // source: left strip
                offset, row, regionW, 4       // dest: shifted
            );
            }

        } else if (shakeRegion === "RIGHT") {
            // distort right third of screen
            let regionX = (width / 3) * 2;
            let regionW = width / 3;
            for (let row = 0; row < height; row += 4) {
            let offset = sin(row * 0.1 + shakeTimer * 0.8) * amount;
            copy(
                // fields[currentFieldsIndex],
                currentBackground,
                regionX, row, regionW, 4,
                regionX + offset, row, regionW, 4
            );
            }

        } else if (shakeRegion === "TOP") {
            // distort top third of screen
            let regionH = height / 3;
            for (let col = 0; col < width; col += 4) {
            let offset = sin(col * 0.1 + shakeTimer * 0.8) * amount;
            copy(
                // fields[currentFieldsIndex],
                currentBackground,
                col, 0, 4, regionH,
                col, offset, 4, regionH
            );
            }
        }

        shakeTimer--;
        if (shakeTimer <= 0) shakeRegion = null;
        }


        // Just visuals — no sound logic here
        // fill(232, 89, 60); noStroke();
        // circle(150, 150, max(10, abs(x) * 20));
        // fill(59, 139, 212);
        // circle(300, 150, max(10, abs(y) * 20));
        // fill(29, 158, 117);
        // circle(450, 150, max(10, abs(z) * 20));

        fill(80); textAlign(CENTER); textSize(13);
        // text("x  " + x.toFixed(2), 150, 260);
        // text("y  " + y.toFixed(2), 300, 260);
        // text("z  " + z.toFixed(2), 450, 260);
        
        // image(mp4video, 0, 50, 100, 100);
    // tint(255, 100); 
    // image(cam, 0, 0);
        
    let vid = videos[currentVideoIndex];

    if (vid && vid.elt.readyState >= 2) {
                vid.loadPixels();

                let destX = 1500, destY = 0, destW = 300, destH = 300;
                let cols = 40;
                let rows = 40;
                let rw = destW /cols;
                let rh = destH / rows;
                // let stepX = 15, stepY = 15;

                fill(0);
                noStroke();
                rect(destX, destY, destW, destH);

                for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
            // sample corresponding video pixel
            let vx = floor((col / cols) * vid.width);
            let vy = floor((row / rows) * vid.height);
            let offset = ((vy * vid.width) + vx) * 4;

            let r = vid.pixels[offset];
            let g = vid.pixels[offset + 1];
            let b = vid.pixels[offset + 2];
            let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            let barHeight = rh * (1.0 - brightness);  // dark = tall, bright = short

            let px = destX + col * rw;
            let py = destY + (row * rh) + (rh - barHeight);  // ← anchor to bottom of cell

            fill(255); noStroke();
            rect(px, py, rw - 1, barHeight);
            }
        }
    


            // call tracker each frame
        findStickTip();

        // draw cam feed
        if (cam && cam.elt.readyState >= 2) {
        // image(cam, 0, 0);
        }

        // draw replacement image at stick tip
        if (stickFound && stickTipImg) {
        let imgW = 80, imgH = 80;  // size of your overlay
        imageMode(CENTER);
        image(stickTipImg, stickTipX, stickTipY, imgW, imgH);
        imageMode(CORNER);  // reset back
        }


        // debug: click to sample color at mouse position
        // remove once calibrated
        if (mouseIsPressed && cam && cam.elt.readyState >= 2) {
        cam.loadPixels();
        let mx = floor(map(mouseX, 0, width, 0, cam.width));
        let my = floor(map(mouseY, 0, height, 0, cam.height));
        let idx = ((my * cam.width) + mx) * 4;
        console.log("R:", cam.pixels[idx], "G:", cam.pixels[idx+1], "B:", cam.pixels[idx+2]);
        }



    }

    for(let hand of hands){
        // const fist = isFist(hand);

        // if(fist) {
        //     updateTrail(hand);
        // } else {
        //     trail.length = 0;
        // }

        // drawTrail();

        // if(fist) drawWeapon(hand);
        drawWeapon(hand);

        for(let kp of hand.keypoints){
            fill(255,0,0);
            noStroke();
            circle(kp.x, kp.y, 10);
            // ctx.beginPath();
            // ctx.arc(kp.x, kp.y, 5, 0, Math.PI * 2);
            // ctx.fillStyle = 'green';
            // ctx.fill();
            
        }
    }

}


function drawWeapon(hand){
    const kps = hand.keypoints;
    const wrist = kps[0];
    const middleMCP = kps[9];

    const angle = Math.atan2(
        middleMCP.y - wrist.y,
        middleMCP.x - wrist.x
    ) + Math.PI /2 ;

    const imgW = 300;
    const imgH = 600;

    const gripX = (wrist.x + middleMCP.x) /2;
    const gripY = (wrist.y + middleMCP.y) /2;

    push();
    translate(gripX, gripY);
    rotate(angle);
    imageMode(CENTER);

    switch(selectedEnvironmentImage){
        case "field":
            image(sickle, 0, -imgH * 0.25, imgW, imgH);
            break;
        case "forest":
            image(bolo, 0, -imgH * 0.25, imgW, imgH);
            break;
        case "beach":
            image(krisSword, 0, -imgH * 0.25, imgW, imgH);
            break;
        default:
            break;
    }
    
    pop();

    // ctx.save();
    // // ctx.translate(wrist.x, wrist.y);
    // ctx.translate(gripX, gripY);
    // ctx.rotate(angle);
    // ctx.drawImage(swordImg, -imgW / 2, -imgH * 0.75, imgW, imgH);
    // ctx.restore();
}

function gotHands(results){
    hands = results;
}