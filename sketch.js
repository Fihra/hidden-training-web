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

    let bloodMarks = [];
    let bloodSplat;

    let imageSwitch = false;

    let videos = [];
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

function updateAndDrawTrail() {
    // fade and shrink each particle
    for (let i = weaponTrail.length - 1; i >= 0; i--) {
        let p = weaponTrail[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.alpha -= p.decay;
        p.size  *= 0.93;

        if (p.alpha <= 0 || p.size < 0.5) {
            weaponTrail.splice(i, 1);
            continue;
        }

        noStroke();
        fill(p.r, p.g, p.b, p.alpha);
        ellipse(p.x, p.y, p.size, p.size);
    }
}

function spawnTrailParticles(tipX, tipY) {
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
            ml5.handPose(cam, { flipped: false }, (model) => {
                handPose = model;
                handPose.detectStart(cam, gotHands);
            });
        });
        cam.size(width, height);
        cam.hide();

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

function drawBeachGrain() {
    // regenerate grain every 2 frames for animated noise feel
    if (frameCount % 2 === 0) {
        grainBuffer.clear();
        grainBuffer.noStroke();

        let grainCount = 60000;
        for (let i = 0; i < grainCount; i++) {
            let gx = random(width);
            let gy = random(height);
            let gsize = random(1.0, 5.0);

            // mix of warm sandy tones, desaturated reds, and cool greys
            // to feel like worn beach film photography
            let colorRoll = random();
            let r, g, b, a;

            if (colorRoll < 0.3) {
                // warm sandy grain
                r = random(200, 255);
                g = random(150, 200);
                b = random(80, 130);
                a = random(40, 90);
            } else if (colorRoll < 0.55) {
                // desaturated red / rust grain
                r = random(160, 220);
                g = random(60, 100);
                b = random(60, 90);
                a = random(30, 75);
            } else if (colorRoll < 0.75) {
                // cool grey-blue grain
                r = random(80, 130);
                g = random(100, 150);
                b = random(150, 210);
                a = random(25, 65);
            } else if (colorRoll < 0.88) {
                // bright white highlight specks
                r = 255; g = 255; b = 255;
                a = random(30, 70);
            } else {
                // dark shadow grain
                r = random(10, 50);
                g = random(10, 40);
                b = random(10, 40);
                a = random(40, 85);
            }

            grainBuffer.fill(r, g, b, random(12, 35));
            grainBuffer.ellipse(gx, gy, gsize, gsize);
        }

        // add a few larger soft blobs for color wash patches
        let blobCount = 200;
        for (let i = 0; i < blobCount; i++) {
            let bx = random(width);
            let by = random(height);
            let bsize = random(20, 120);
            let colorRoll = random();
            let r, g, b;

            if (colorRoll < 0.4) {
                r = random(180, 230); g = random(100, 150); b = random(50, 90);
            } else if (colorRoll < 0.7) {
                r = random(140, 190); g = random(50, 90);  b = random(50, 80);
            } else {
                r = random(60, 120);  g = random(80, 130); b = random(140, 200);
            }

            grainBuffer.fill(r, g, b, random(3, 12));
            grainBuffer.ellipse(bx, by, bsize, bsize * random(0.4, 1.0));
        }
    }

    // draw the grain buffer on top of the scene
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
                    spawnDistortionZones(incoming); 
                }

                if(hitCounter >= techniques[currentVideoIndex].count){
                    triggerSound(incoming);
                    imageSwitch = !imageSwitch;
                    lastTriggeredSide = incoming;

                    if (selectedEnvironmentImage === "beach") {
                        spawnBloodMark();
                        drawBeachGrain();
                    }
                    
                    //   currentFieldsIndex = (currentFieldsIndex + 1) % fields.length;
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

            backgroundAlpha += 100;
            if(backgroundAlpha >= 255){
                backgroundAlpha = 255;
                // currentFieldsIndex = nextFieldIndex;
                currentBackgroundIndex = nextBackgroundIndex;
                transitioning = false;
            } 
        }
        noTint();

        if(selectedEnvironmentImage === "beach"){
            drawBloodMarks();
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
        
    // tint(255, 100); 
    // image(cam, 0, 0);
        
    let vid = videos[currentVideoIndex];

    if (vid && vid.elt.readyState >= 2) {
                vid.loadPixels();

                let destX = (width / 2) - 150, destY = 0, destW = 300, destH = 300;
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

    for(let hand of hands.slice(0, 1)){
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
            // fill(255,0,0);
            // noStroke();
            // circle(width - kp.x, kp.y, 10);
            // ctx.beginPath();
            // ctx.arc(kp.x, kp.y, 5, 0, Math.PI * 2);
            // ctx.fillStyle = 'green';
            // ctx.fill();
            
        }
    }
     updateAndDrawTrail();

}


function drawWeapon(hand) {
    const kps = hand.keypoints;
    const wrist = kps[0];
    const middleMCP = kps[9];

    // mirror X coords to match flipped camera view
    const wristX     = width - wrist.x;
    const wristY     = wrist.y;
    const middleX    = width - middleMCP.x;
    const middleY    = middleMCP.y;

    // angle from wrist to middle knuckle
    const handAngle = Math.atan2(
        middleY - wristY,
        middleX - wristX
    );

    // anchor at wrist
    const gripX = wristX;
    const gripY = wristY;

    push();
    translate(gripX, gripY);
    rotate(handAngle - Math.PI / 2); // rotate horizontal PNGs to point up

    // flip horizontally so blade faces away from wrist (handle is on left in PNG)
    scale(-1, 1);

    imageMode(CENTER);

    let tipDist, tipX, tipY;

    switch (selectedEnvironmentImage) {
        case "field":
            tipDist = 210; // half of sickle imgW=420
            break;
        case "forest":
            tipDist = 250; // half of bolo imgW=500
            break;
        case "beach":
            tipDist = 250; // half of kris imgW=500
            break;
        default:
            tipDist = 200;
    }

    tipX = gripX + cos(handAngle - HALF_PI) * tipDist;
    tipY = gripY + sin(handAngle - HALF_PI) * tipDist;

    spawnTrailParticles(tipX, tipY);

    switch (selectedEnvironmentImage) {
        case "field": {
            // sickle: handle ~35% from left, landscape PNG
            let imgW = 420, imgH = 180;
            tipDist = 210;
            image(sickle, 0, imgH * 0.1, imgW, imgH);
            break;
        }
        case "forest": {
            // bolo: handle ~20% from left, very wide landscape PNG
            let imgW = 500, imgH = 190;
            tipDist = 250;
            image(bolo, 0, imgH * 0.1, imgW, imgH);
            break;
        }
        case "beach": {
            // kris sword: handle ~15% from left, landscape PNG
            let imgW = 500, imgH = 160;
            tipDist = 250;
            image(krisSword, 0, imgH * 0.1, imgW, imgH);
            break;
        }
        default:
            tipDist = 200;
            break;
    }



    pop();
}

function gotHands(results){
    hands = results;
}