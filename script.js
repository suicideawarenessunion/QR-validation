<script>
  // ======= CONFIG – update these two as per your model =======
  const SHAREPOINT_LINK = "https://yourtenant.sharepoint.com/sites/YourSite/Shared%20Documents/YourFolder";
  // metadata.json లో labels: ["Class 1","Class 2"] ఉన్నాయ్
  // Class 1 = Police, Class 2 = NonPolice కాబట్టి
  const POLICE_INDEX = 0;          
  const LABELS = ["Police", "NonPolice"]; 
  const THRESHOLD = 0.50;        
  const CHECK_EVERY_MS = 800;     
  // ===========================================================

  let model;
  let redirected = false;
  let acceptCounter = 0;   // 🔹 declare outside

  const statusEl = () => document.getElementById("status");
  const resultEl  = () => document.getElementById("result");

  window.onload = () => init();

  async function init() {
    try {
      statusEl().textContent = "Loading model…";
      model = await tf.loadLayersModel("model/model.json");
      statusEl().textContent = "Starting camera…";
      await setupCamera();
      statusEl().textContent = "Checking automatically…";
      startAutoLoop();
    } catch (e) {
      console.error(e);
      statusEl().textContent = "Error: " + e.message;
    }
  }

  async function setupCamera() {
    const video = document.getElementById("webcam");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    await video.play();
  }

  function startAutoLoop() {
    setInterval(async () => {
      if (redirected) return;
      await predictOneFrame();
    }, CHECK_EVERY_MS);
  }

  async function predictOneFrame() {
    const video = document.getElementById("webcam");

    // capture frame
    const canvas = document.createElement("canvas");
    canvas.width = 224; canvas.height = 224;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let img = tf.browser.fromPixels(canvas).toFloat().div(255.0).expandDims(0);

    // predict
    const out = await model.predict(img).data();
    let policeProb, nonPoliceProb;

    if (out.length === 1) {
      policeProb = out[0];
      nonPoliceProb = 1 - policeProb;
    } else {
      policeProb = out[POLICE_INDEX];
      nonPoliceProb = out[1 - POLICE_INDEX];
    }

    const pct = (n) => Math.round(n * 100);
    resultEl().textContent = `${LABELS[0]}: ${pct(policeProb)}%  |  ${LABELS[1]}: ${pct(nonPoliceProb)}%`;

    // 🔹 Threshold + consecutive frames check
    if (policeProb >= THRESHOLD) {
      acceptCounter++;
      if (acceptCounter >= 5 && !redirected) {   // 5 continuous frames
        redirected = true;
        resultEl().textContent = "✅ Accepted"; 
        setTimeout(() => window.location.href = SHAREPOINT_LINK, 400);
      }
    } else {
      acceptCounter = 0;
      if (!redirected) {
        resultEl().textContent = "❌ Rejected";
      }
    }
  }
</script>
