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

    let currentForestIndex = 0;
    let currentFieldsIndex = 0;
    let currentBeachIndex = 0;

    let nextFieldIndex = 0;

    let fieldAlpha = 255;
    let transitioning = false;

    let hitCounter = 0;
    let hitLeft = false;
    let hitRight = false;

    let shakeRegion = null;   // "LEFT", "RIGHT", "TOP", or null
    let shakeTimer = 0;
    let shakeDuration = 20;   // frames
    let shakeAmount = 30;     // max pixel distortion


    async function setup() {
        frameRate(30);
        createCanvas(1920, 1080);



        forestImg = await loadImage("images/forest1.jpg");
        fieldImg = await loadImage("images/fields1.jpg");
        beachImg = await loadImage("images/beach1.jpg");
        
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
            triggerSound(incoming);
            imageSwitch = !imageSwitch;
            lastTriggeredSide = incoming;
            
            //   currentFieldsIndex = (currentFieldsIndex + 1) % fields.length;
            nextFieldIndex = (currentFieldsIndex + 1) % fields.length;
            fieldAlpha = 0;
            transitioning = true;
            
            currentVideoIndex = (currentVideoIndex + 1) % videos.length; 

                if (incoming === "LEFT" || incoming === "RIGHT" || incoming === "TOP") {
                    shakeRegion = incoming;
                    shakeTimer = shakeDuration;
                }
            
            setTimeout(() => { lastTriggeredSide = "NONE"; }, 600);
            }

            

            side = incoming;
        }
        }
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
        image(fields[currentFieldsIndex], 0, 0, width, height);

        if(transitioning){
            tint(255, fieldAlpha);
            image(fields[nextFieldIndex], 0, 0, width, height);

            fieldAlpha += 75;
            if(fieldAlpha >= 255){
                fieldAlpha = 255;
                currentFieldsIndex = nextFieldIndex;
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
                fields[currentFieldsIndex],
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
                fields[currentFieldsIndex],
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
                fields[currentFieldsIndex],
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



    }
        

    }