let model, webcam;

async function loadModel() {
  model = await tf.loadLayersModel("model/model.json");
  console.log("✅ Model loaded");
  setupCamera();
}

async function setupCamera() {
  const webcamElement = document.getElementById("webcam");
  webcam = await navigator.mediaDevices.getUserMedia({ video: true });
  webcamElement.srcObject = webcam;
}

async function captureAndCheck() {
  const video = document.getElementById("webcam");
  const canvas = document.createElement("canvas");
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, 224, 224);

  // convert image to tensor
  let img = tf.browser.fromPixels(canvas).toFloat().expandDims(0);

  // predict
  const prediction = await model.predict(img).data();
  console.log("Prediction:", prediction);

  const policeProb = prediction[0];  // Class 1 probability (police)
  const nonPoliceProb = prediction[1]; // Class 2 probability (non-police)

  if (policeProb > nonPoliceProb && policeProb > 0.7) {
    document.getElementById("result").innerText = "✅ Police Uniform Detected";
    window.location.href = "https://messengersworld.sharepoint.com/:f:/s/POSTSAU2/EmBJ9Sw9dANAg_uWKjfMnJUB0_BGPcz6LENAMYODw-f1fQ"; // 🔗 Police folder open
  } else {
    document.getElementById("result").innerText = "❌ Not a Police Uniform";
  }
}

loadModel();



