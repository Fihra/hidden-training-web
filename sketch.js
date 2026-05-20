    let x = 0, y = 0, z = 0;
    let buf = "";
    let side = "NONE";
    let lastTriggeredSide = "NONE";  // tracks what we already played

    let forestImg;
    let fieldImg;
    let beachImg;

    let forests = [];
    let fields = [];
    let beaches = [];

    let bloodMarks = [];
    let bloodSplat;

    let imageSwitch = false;

    let videos = [];
    let currentVideoIndex = 0;

    let vidPixelCache = new Float32Array(40 * 40);
    let lastVidTime = -1;

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

    let weaponTrail = [];
    let lastWeaponTipX = 0;
    let lastWeaponTipY = 0;

    let shakeRegion = null;   // "LEFT", "RIGHT", "TOP", or null
    let shakeTimer = 0;
    let shakeDuration = 20;   // frames
    let shakeAmount = 30;     // max pixel distortion
    let distortionZones = []; // replaces single shakeRegion logic

    let grainBuffer;
    let grainTimer = 0;

    let currentTechniqueIndex = 0;

    let bolo;
    let sickle;
    let krisSword;
    let stickTipX = 0, stickTipY = 0;
    let stickFound = false;
    let stickTipImg = null;

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

    // Add to globals
    let lastKnownWristX = -1;
    let lastKnownWristY = -1;
    let lastKnownAngle  = 0;
    let handLostTimer   = 0;
    const HAND_PERSIST_FRAMES = 20;

function drawVideoPixelDisplay(vid) {
    if (!vid || vid.elt.readyState < 2) return;

    const currentTime = vid.elt.currentTime;
    if (currentTime === lastVidTime) return;
    lastVidTime = currentTime;
    
    vid.loadPixels();
    if (!vid.pixels || vid.pixels.length === 0) return;

    const destX = (width / 2) - 150;
    const destW = 300, destH = 300;
    const cols = 40, rows = 40;
    const rw = destW / cols;
    const rh = destH / rows;
    const vw = vid.width, vh = vid.height;

    fill(0); noStroke();
    rect(destX, 0, destW, destH);

    fill(255); noStroke();
    for (let row = 0; row < rows; row++) {
        const vy = floor((row / rows) * vh);
        const rowBase = vy * vw;
        for (let col = 0; col < cols; col++) {
            const vx = floor((col / cols) * vw);
            const offset = (rowBase + vx) * 4;
            const brightness = (
                0.299 * vid.pixels[offset] +
                0.587 * vid.pixels[offset + 1] +
                0.114 * vid.pixels[offset + 2]
            ) / 255;
            const barH = rh * (1.0 - brightness);
            rect(destX + col * rw, row * rh + (rh - barH), rw - 1, barH);
        }
    }
}

    function drawBloodMarks() {
        for (let b of bloodMarks) {
            push();
            translate(b.x, b.y);
            rotate(b.angle);
            noStroke();

            // main splat
            fill(139, 0, 0, b.alpha);
            ellipse(0, 0, b.size, b.size * 0.6);

            // drips
            for (let d of b.drips) {
                fill(100, 0, 0, b.alpha);
                ellipse(d.x, d.y, d.w, d.h);
            }

            // droplets
            for (let dp of b.droplets) {
                fill(160, 10, 10, b.alpha);
                ellipse(dp.x, dp.y, dp.r, dp.r);
            }

            pop();

            // slowly fade out
            b.alpha -= 0.3;
        }

        // remove fully faded marks
        bloodMarks = bloodMarks.filter(b => b.alpha > 0);
    }

    function spawnBloodMark() {
    let drips = [];
    for (let i = 0; i < int(random(3, 7)); i++) {
        drips.push({
            x: random(-40, 40),
            y: random(10, 60),
            w: random(6, 14),
            h: random(15, 35)
        });
    }

    let droplets = [];
    for (let i = 0; i < int(random(6, 12)); i++) {
        droplets.push({
            x: random(-80, 80),
            y: random(-60, 60),
            r: random(4, 14)
        });
    }

    bloodMarks.push({
        x: random(100, width - 100),
        y: random(100, height - 100),
        angle: random(TWO_PI),
        size: random(60, 140),
        alpha: 220,
        drips,
        droplets
    });
}

function updateStickTipImg() {
    switch (selectedEnvironmentImage) {
        case "field":  stickTipImg = sickle;    break;
        case "forest": stickTipImg = bolo;      break;
        case "beach":  stickTipImg = krisSword; break;
        default:       stickTipImg = null;      break;
    }
}

function updateAndDrawTrail() {
    let i = weaponTrail.length - 1;
    while (i >= 0) {
        let p = weaponTrail[i];
        p.x += p.vx;  p.y += p.vy;
        p.vx *= 0.92; p.vy *= 0.92;
        p.alpha -= p.decay;
        p.size  *= 0.93;

        if (p.alpha <= 0 || p.size < 0.5) {
            // swap with last element and pop — O(1) vs splice O(n)
            weaponTrail[i] = weaponTrail[weaponTrail.length - 1];
            weaponTrail.pop();
        } else {
            noStroke();
            fill(p.r, p.g, p.b, p.alpha);
            ellipse(p.x, p.y, p.size, p.size);
        }
        i--;
    }
}

function spawnTrailParticles(tipX, tipY) {
    if(weaponTrail.length > 150) weaponTrail.length = 100;

    let speedX = tipX - lastWeaponTipX;
    let speedY = tipY - lastWeaponTipY;
    let speed  = sqrt(speedX * speedX + speedY * speedY);

    // only emit when moving fast enough
    if (speed < 5) {
        lastWeaponTipX = tipX;
        lastWeaponTipY = tipY;
        return;
    }

    // more particles the faster you swing
    let count = int(map(speed, 5, 80, 1, 8));

    // color per environment
    let r, g, b;
    switch (selectedEnvironmentImage) {
        case "field":  r = 210; g = 60;  b = 60;  break; // red-orange for sickle
        case "forest": r = 255; g = 180; b = 0;   break; // golden for bolo
        case "beach":  r = 100; g = 200; b = 255;  break; // icy blue for kris
        default:       r = 255; g = 255; b = 255;  break;
    }

    for (let i = 0; i < count; i++) {
        let scatter = speed * 0.15;
        weaponTrail.push({
            x:     tipX + random(-scatter, scatter),
            y:     tipY + random(-scatter, scatter),
            vx:    -speedX * random(0.1, 0.4) + random(-1.5, 1.5),
            vy:    -speedY * random(0.1, 0.4) + random(-1.5, 1.5),
            size:  random(6, 18) * map(speed, 5, 80, 0.5, 1.5),
            alpha: random(160, 220),
            decay: random(4, 9),
            r, g, b
        });
    }

    lastWeaponTipX = tipX;
    lastWeaponTipY = tipY;
}

function spawnDistortionZones(region) {
    distortionZones = [];
    let zoneCount = int(random(2, 5)); // 2–4 distortion patches

    for (let i = 0; i < zoneCount; i++) {
        let zone = {};

        if (region === "LEFT") {
            // random vertical slice within the left third
            let maxX = width / 3;
            zone.x      = random(0, maxX * 0.5);
            zone.w      = random(maxX * 0.3, maxX * 0.9);
            zone.y      = random(0, height * 0.7);
            zone.h      = random(height * 0.1, height * 0.4);

        } else if (region === "RIGHT") {
            // random vertical slice within the right third
            let startX  = (width / 3) * 2;
            zone.x      = random(startX, startX + width / 6);
            zone.w      = random(width / 6, width / 3);
            zone.y      = random(0, height * 0.7);
            zone.h      = random(height * 0.1, height * 0.4);

        } else if (region === "TOP") {
            // random horizontal slice within the top third
            zone.x      = random(0, width * 0.6);
            zone.w      = random(width * 0.2, width * 0.6);
            zone.y      = random(0, height / 6);
            zone.h      = random(height * 0.05, height / 3);
        }

        // per-zone distortion personality
        zone.freqX     = random(0.05, 0.2);   // horizontal wave frequency
        zone.freqY     = random(0.05, 0.2);   // vertical wave frequency
        zone.speedX    = random(0.5, 2.0);    // how fast it oscillates
        zone.speedY    = random(0.5, 2.0);
        zone.shearAmt  = random(0.02, 0.08);  // shear / skew strength
        zone.blockSize = int(random(2, 8));   // scanline block height
        zone.glitch    = random() > 0.5;      // some zones get pixel-shift glitch

        distortionZones.push(zone);
    }
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
        frameRate(30);
        createCanvas(1920, 1080);
        grainBuffer = createGraphics(width, height);

        forestImg = await loadImage("images/forest1.jpg");
        fieldImg = await loadImage("images/fields1.jpg");
        beachImg = await loadImage("images/beach1.jpg");

        krisSword = await loadImage("images/kris_sword.png");
        bolo = await loadImage("images/bolo.png");
        sickle = await loadImage("images/sickle.png");
        
        for (let i = 0; i < 7; i++) {

            beaches[i] = await loadImage(`images/beach${i}.jpg`);
            forests[i] = await loadImage(`images/forest${i}.jpg`);
            fields[i] = await loadImage(`images/fields${i}.jpg`);
            // Assuming you have video1.mp4, video2.mp4, etc.
            videos[i] = createVideo(['videos/eskrima' + i + '.mp4']);
            videos[i].speed(0.3);
            videos[i].volume(0);
            videos[i].hide(); // Hide HTML elements
            videos[i].loop(); // Loop them    
        }

        currentBackground = forests[0];

        updateStickTipImg();

        cam = createCapture(VIDEO, () => {
            ml5.handPose(cam, { flipped: false,
                minDetectionConfidence: 0.3,
                minTrackingConfidence: 0.3

             }, (model) => {
                handPose = model;
                handPose.detectStart(cam, gotHands);
            });
        });
        cam.size(width, height);
        cam.hide();

        let btn = createButton("connect serial");
        btn.mousePressed(async () => {
            for (let i = 0; i < videos.length; i++) {
        videos[i].play();
    }
        
        let port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });

        let decoder = new TextDecoderStream();
        port.readable.pipeTo(decoder.writable);
        decoder.readable.pipeTo(new WritableStream({
            write(chunk) { onData(chunk); }
        }));
        });
    }

function drawBeachGrain() {
    if (frameCount % 4 !== 0) {
        // just redraw cached buffer without regenerating
        image(grainBuffer, 0, 0);
        return;
    }

    grainBuffer.loadPixels();
    const pw = grainBuffer.width;
    const ph = grainBuffer.height;
    const px = grainBuffer.pixels;

    // clear to transparent
    for (let i = 0; i < px.length; i += 4) {
        px[i + 3] = 0;
    }

    const grainCount = 6000; // was 60000 ellipses — 10x cheaper
    for (let i = 0; i < grainCount; i++) {
        const gx  = floor(random(pw));
        const gy  = floor(random(ph));
        const idx = (gy * pw + gx) * 4;
        const roll = random();

        let r, g, b;
        if (roll < 0.3) {
            r = random(200, 255); g = random(150, 200); b = random(80, 130);
        } else if (roll < 0.55) {
            r = random(160, 220); g = random(60, 100);  b = random(60, 90);
        } else if (roll < 0.75) {
            r = random(80, 130);  g = random(100, 150); b = random(150, 210);
        } else if (roll < 0.88) {
            r = 255; g = 255; b = 255;
        } else {
            r = random(10, 50); g = random(10, 40); b = random(10, 40);
        }

        px[idx]     = r;
        px[idx + 1] = g;
        px[idx + 2] = b;
        px[idx + 3] = floor(random(12, 35));
    }

    grainBuffer.updatePixels();
    image(grainBuffer, 0, 0);
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

    function onData(chunk) {
        buf += chunk;
        let lines = buf.split("\n");
        buf = lines.pop();

        for (let line of lines) {
        line = line.trim().replace(/\r/g, "");
        let parts = line.trim().split(",");
        if (parts.length === 4) {
            x = parseFloat(parts[0]);
            y = parseFloat(parts[1]);
            z = parseFloat(parts[2]);
            let incoming = parts[3].trim();

            if (incoming !== "NONE" && incoming !== lastTriggeredSide) {
                hitCounter++;

                if (incoming === "LEFT" || incoming === "RIGHT" || incoming === "TOP") {
                    shakeRegion = incoming;
                    shakeTimer = shakeDuration;
                    spawnDistortionZones(incoming); 
                }

                if(hitCounter >= techniques[currentVideoIndex].count){
                    imageSwitch = !imageSwitch;
                    lastTriggeredSide = incoming;

                    if (selectedEnvironmentImage === "beach") {
                        spawnBloodMark();
                        // drawBeachGrain();
                    }
                    
                    let randomNum = int(random(0, 3));

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
                    updateStickTipImg();

                    currentBackgroundIndex = (currentVideoIndex + 1) % videos.length;
                    nextBackgroundIndex = (currentVideoIndex + 1) % videos.length;
                    
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
                    currentBackground = beaches[nextBackgroundIndex];
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
        tint(255, 255);
        showEnvironmentBackground("current");

        if(transitioning){
            tint(255, backgroundAlpha);
            showEnvironmentBackground("next");

            backgroundAlpha += 100;
            if(backgroundAlpha >= 255){
                backgroundAlpha = 255;
                currentBackgroundIndex = nextBackgroundIndex;
                transitioning = false;
            } 
        }
        noTint();

        if(selectedEnvironmentImage === "beach"){
            drawBloodMarks();
            drawBeachGrain();
        }

    if (shakeTimer > 0) {
        let progress = shakeTimer / shakeDuration;   // 1.0 → 0.0
        let amount   = shakeAmount * progress;

        for (let zone of distortionZones) {
            let bSize = zone.blockSize;

            for (let row = zone.y; row < zone.y + zone.h; row += bSize) {
                // wave distortion — horizontal offset
                let waveX = sin(row * zone.freqX + shakeTimer * zone.speedX) * amount;

                // shear — offset grows with distance from zone top
                let shearX = (row - zone.y) * zone.shearAmt * amount * 0.5;

                // vertical ripple — shifts rows up/down slightly
                let waveY = cos(row * zone.freqY + shakeTimer * zone.speedY) * (amount * 0.3);

                // glitch: random horizontal block jump on some frames
                let glitchOffset = 0;
                if (zone.glitch && random() > 0.75) {
                    glitchOffset = random(-amount * 1.5, amount * 1.5);
                }

                let totalOffsetX = waveX + shearX + glitchOffset;
                let totalOffsetY = waveY;

                // clamp so we don't read outside the image
                let srcY = constrain(row + totalOffsetY, 0, height - bSize - 1);

                copy(
                    currentBackground,
                    zone.x,               srcY,
                    zone.w,               bSize,
                    zone.x + totalOffsetX, row,
                    zone.w,               bSize
                );
            }

            // chromatic aberration pass — red channel shifts slightly differently
            if (zone.glitch) {
                for (let row = zone.y; row < zone.y + zone.h; row += bSize * 3) {
                    let aberrationShift = sin(row * 0.08 + shakeTimer) * amount * 0.4;
                    copy(
                        currentBackground,
                        zone.x, row, zone.w * 0.5, bSize,
                        zone.x + aberrationShift, row, zone.w * 0.5, bSize
                    );
                }
            }
        }

        shakeTimer--;
        if (shakeTimer <= 0) {
            shakeRegion = null;
            distortionZones = [];
        }
    }

        fill(80); 
        textAlign(CENTER); 
        textSize(13);
        
    drawVideoPixelDisplay(videos[currentVideoIndex]);
        // findStickTip();
        if(frameCount % 3 === 0) findStickTip();

        // draw replacement image at stick tip
        if (stickFound && stickTipImg) {
        let imgW = 80, imgH = 80;  // size of your overlay
        imageMode(CENTER);
        image(stickTipImg, stickTipX, stickTipY, imgW, imgH);
        imageMode(CORNER);  // reset back
        }

        // remove once calibrated
        if (mouseIsPressed && cam && cam.elt.readyState >= 2) {
        cam.loadPixels();
        let mx = floor(map(mouseX, 0, width, 0, cam.width));
        let my = floor(map(mouseY, 0, height, 0, cam.height));
        let idx = ((my * cam.width) + mx) * 4;
        }


    if (hands.length > 0) {
        drawWeapon(hands[0]);
        handLostTimer = HAND_PERSIST_FRAMES;
    } else if (handLostTimer > 0) {
        drawWeaponAtPosition(lastKnownWristX, lastKnownWristY, lastKnownAngle);
        handLostTimer--;
    }
     updateAndDrawTrail();

}


function drawWeapon(hand) {
    const kps = hand.keypoints;
    const wristX  = width - kps[0].x;
    const wristY  = kps[0].y;

    // use index MCP (kps[5]) instead of middle MCP (kps[9])
    // — stays more visible when fingers wrap around a stick
    const indexX  = width - kps[5].x;
    const indexY  = kps[5].y;

    // secondary anchor: pinky MCP (kps[17]) for a grip-stable angle
    // average index and pinky base to get the knuckle ridge direction
    const pinkyX  = width - kps[17].x;
    const pinkyY  = kps[17].y;

    const knuckleX = (indexX + pinkyX) / 2;
    const knuckleY = (indexY + pinkyY) / 2;

    const handAngle = Math.atan2(knuckleY - wristY, knuckleX - wristX);

    switch (selectedEnvironmentImage) {
        case "field":
            img = sickle;
            imgW = 420; imgH = 180;
            handlePct = 0.35;
            break;
        case "forest":
            img = bolo;
            imgW = 500; imgH = 190;
            handlePct = 0.20;
            break;
        case "beach":
            img = krisSword;
            imgW = 500; imgH = 160;
            handlePct = 0.15;
            break;
        default:
            return; // nothing to draw
    }
        // cache for persistence when hand is lost
    lastKnownWristX = wristX;
    lastKnownWristY = wristY;
    lastKnownAngle  = handAngle;

    drawWeaponAtPosition(wristX, wristY, handAngle);
}

function drawWeaponAtPosition(wristX, wristY, handAngle) {
    if (wristX < 0) return;

    let img, imgW, imgH, handlePct;
    let offsetX = 0, offsetY = 0;

    switch (selectedEnvironmentImage) {
        case "field":
            img = sickle;
            imgW = 420; imgH = 180;
            handlePct = 0.35;
            offsetY = 0;   // tune: negative = toward fingertips
            break;
        case "forest":
            img = bolo;
            imgW = 500; imgH = 190;
            handlePct = 0.20;
            offsetY = 0;
            break;
        case "beach":
            img = krisSword;
            imgW = 500; imgH = 160;
            handlePct = 0.15;
            offsetY = 0;
            break;
        default:
            return;
    }

    const tipDist = imgW * (1.0 - handlePct);
    const tipX = wristX + cos(handAngle - HALF_PI) * tipDist;
    const tipY = wristY + sin(handAngle - HALF_PI) * tipDist;
    spawnTrailParticles(tipX, tipY);

    push();
        translate(wristX, wristY);
        rotate(handAngle - HALF_PI);
        scale(-1, 1);
        imageMode(CORNER);
        image(img,
            -(imgW * handlePct) + offsetX,
            -imgH + offsetY,
            imgW, imgH);
    pop();
}

function gotHands(results){
    hands = results;
}