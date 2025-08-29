// ======= CONFIG – update these two as per your model =======
const SHAREPOINT_LINK = "https://yourtenant.sharepoint.com/sites/YourSite/Shared%20Documents/YourFolder";
// If your Teachable Machine labels are ["Police","NonPolice"], keep POLICE_INDEX=0.
// If it is ["NonPolice","Police"], set POLICE_INDEX=1.
const POLICE_INDEX = 0;          // <-- check metadata.json -> "labels"
const THRESHOLD = 0.70;          // 70% confidence
const CHECK_EVERY_MS = 800;      // how often to predict (ms)
// ===========================================================

let model;
let redirected = false;
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
  // predict repeatedly without any button
  setInterval(async () => {
    if (redirected) return;
    await predictOneFrame();
  }, CHECK_EVERY_MS);
}

async function predictOneFrame() {
  const video = document.getElementById("webcam");

  // draw current frame to an offscreen canvas & make tensor
  const canvas = document.createElement("canvas");
  canvas.width = 224; canvas.height = 224;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  let img = tf.browser.fromPixels(canvas).toFloat().expandDims(0);

  // run prediction
  const out = await model.predict(img).data();
  // out can be [p] (sigmoid) or [p0, p1] (softmax). Handle both:
  let policeProb, nonPoliceProb;

  if (out.length === 1) {
    // sigmoid = probability of class "Police" (assume)
    policeProb = out[0];
    nonPoliceProb = 1 - policeProb;
  } else {
    policeProb = out[POLICE_INDEX];
    nonPoliceProb = out[1 - POLICE_INDEX];
  }

  const pct = (n) => Math.round(n * 100);
  resultEl().textContent = `Police: ${pct(policeProb)}%  |  NonPolice: ${pct(nonPoliceProb)}%`;

  if (policeProb >= THRESHOLD && !redirected) {
  redirected = true;
  statusEl().textContent = "✅ Accepted";
  resultEl().textContent = "✅ Accepted";   // only text, no % 
  setTimeout(() => window.location.href = https://messengersworld.sharepoint.com/:f:/s/POSTSAU2/EmBJ9Sw9dANAg_uWKjfMnJUB38Edjlk0qL2d8sJcsHkZkg?e=lkQ22T, 400);
  } else if (!redirected) {
  statusEl().textContent = "❌ Rejected";
  resultEl().textContent = "❌ Rejected";   // only text, no % 
  }
}


