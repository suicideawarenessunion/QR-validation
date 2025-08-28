// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const { isPoliceUniform } = require('./vision');
const { getAppToken, createAnonymousViewLink } = require('./graph');
const { createOtp, getOtp, deleteOtp, logEvent } = require('./otpStore');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const OTP_TTL_SECONDS = parseInt(process.env.OTP_TTL_SECONDS || '600', 10);
const TEMP_LINK_TTL_MINUTES = parseInt(process.env.TEMP_LINK_TTL_MINUTES || '60', 10);
const FOLDER_ITEM_ID = process.env.FOLDER_ITEM_ID;
const ADMIN_NOTIFY_WEBHOOK = process.env.ADMIN_NOTIFY_WEBHOOK;

function randOtp() {
  return (Math.floor(100000 + Math.random()*900000)).toString(); // 6-digit
}

// 1) Verify uniform + issue OTP
app.post('/api/verify', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ status:'err', msg:'no image' });

    const base64 = imageBase64.split(',')[1];
    const buf = Buffer.from(base64, 'base64');

    const uniform = await isPoliceUniform(buf);

    if (!uniform) {
      await logEvent({ uniform:false, granted:false, note:'uniform not detected' });
      return res.json({ status:'ok', uniform:false });
    }

    // Generate OTP
    const code = randOtp();
    const otpRec = await createOtp(code);

    await logEvent({ uniform:true, otp: code, granted:false, note:'otp issued' });

    // Optional: notify admin now itself
    if (ADMIN_NOTIFY_WEBHOOK) {
      fetch(ADMIN_NOTIFY_WEBHOOK, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ event:'otp_issued', otp: code, ts: new Date().toISOString() })
      }).catch(()=>{});
    }

    // Send OTP to user screen
    return res.json({
      status:'ok',
      uniform:true,
      otp: code,
      otpTtl: OTP_TTL_SECONDS,
      token: otpRec.token
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ status:'err', msg:'server error' });
  }
});

// 2) Validate OTP and return SharePoint temp link
app.post('/api/otp/validate', async (req, res) => {
  try {
    const { otp, token } = req.body;
    const rec = await getOtp(token);
    if (!rec) return res.json({ status:'err', msg:'invalid token' });

    const ageSec = Math.floor((Date.now() - rec.created_at)/1000);
    if (ageSec > OTP_TTL_SECONDS) {
      await deleteOtp(token);
      await logEvent({ uniform:true, otp: rec.code, granted:false, note:'otp expired' });
      return res.json({ status:'err', msg:'otp expired' });
    }

    if (otp !== rec.code) {
      return res.json({ status:'err', msg:'otp mismatch' });
    }

    // OTP valid → create anonymous view link for folder
    const at = await getAppToken();
    const linkUrl = await createAnonymousViewLink(at, FOLDER_ITEM_ID);

    // log + cleanup
    await deleteOtp(token);
    await logEvent({ uniform:true, otp: rec.code, granted:true, note:'access granted' });

    // Optional admin notify
    if (ADMIN_NOTIFY_WEBHOOK) {
      fetch(ADMIN_NOTIFY_WEBHOOK, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ event:'access_granted', link: linkUrl, ttl: TEMP_LINK_TTL_MINUTES })
      }).catch(()=>{});
    }

    return res.json({ status:'ok', url: linkUrl, ttl: TEMP_LINK_TTL_MINUTES });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ status:'err', msg:'server error' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log('Server running on ' + port));
