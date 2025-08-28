// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const { isPoliceUniform } = require('./vision');
const { getAppToken, createAnonymousViewLink } = require('./graph');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const FOLDER_ITEM_ID = process.env.FOLDER_ITEM_ID;
const TEMP_LINK_TTL_MINUTES = parseInt(process.env.TEMP_LINK_TTL_MINUTES || '60', 10);
const ADMIN_NOTIFY_WEBHOOK = process.env.ADMIN_NOTIFY_WEBHOOK;

// 1) Verify uniform and return SharePoint link directly
app.post('/api/verify', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ status: 'err', msg: 'no image' });

    const base64 = imageBase64.split(',')[1];
    const buf = Buffer.from(base64, 'base64');

    const uniform = await isPoliceUniform(buf);

    if (!uniform) {
      return res.json({ status: 'ok', uniform: false, msg: 'Uniform not detected' });
    }

    // Uniform detected → generate SharePoint anonymous view link
    const at = await getAppToken();
    const linkUrl = await createAnonymousViewLink(at, FOLDER_ITEM_ID);

    // Optional: notify admin
    if (ADMIN_NOTIFY_WEBHOOK) {
      fetch(ADMIN_NOTIFY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'access_granted', link: linkUrl, ttl: TEMP_LINK_TTL_MINUTES })
      }).catch(() => {});
    }

    return res.json({ status: 'ok', uniform: true, url: linkUrl, ttl: TEMP_LINK_TTL_MINUTES });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ status: 'err', msg: 'server error' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log('Server running on ' + port));
