const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const resultDiv = document.getElementById('result');

let stream;

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    video.srcObject = stream;
    captureBtn.style.display = 'inline-block';
    startBtn.style.display = 'none';
  } catch (e) {
    alert('Camera permission required!');
  }
}

async function captureAndSend() {
  const w = video.videoWidth;
  const h = video.videoHeight;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  resultDiv.style.display = 'block';
  resultDiv.innerText = 'Verifying uniform…';

  const res = await fetch('/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: dataUrl })
  });
  const json = await res.json();

  if (json.status === 'ok' && json.uniform === true) {
    resultDiv.innerHTML = `
      <p>Uniform verified ✅</p>
      <p>Your OTP: <b>${json.otp}</b> (valid ${json.otpTtl}s)</p>
      <div>
        <input id="otpInput" placeholder="Enter OTP" maxlength="6">
        <button id="otpBtn">Validate</button>
      </div>
      <div id="linkDiv"></div>
    `;
    document.getElementById('otpBtn').onclick = async () => {
      const otp = document.getElementById('otpInput').value.trim();
      const res2 = await fetch('/api/otp/validate', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ otp, token: json.token })
      });
      const j2 = await res2.json();
      if (j2.status === 'ok') {
        document.getElementById('linkDiv').innerHTML =
          `<p>Access link (expires in ${j2.ttl} mins): <a target="_blank" href="${j2.url}">Open Videos</a></p>`;
      } else {
        document.getElementById('linkDiv').innerHTML = `<p style="color:red">OTP invalid/expired</p>`;
      }
    };
  } else {
    resultDiv.innerHTML = `<p style="color:red">Access Denied. Police uniform not detected.</p>`;
  }

  // stop camera (optional)
  if (stream) stream.getTracks().forEach(t => t.stop());
}

startBtn.onclick = startCamera;
captureBtn.onclick = captureAndSend;
