// graph.js
const fetch = require('node-fetch');
const qs = require('querystring');

const {
  TENANT_ID, CLIENT_ID, CLIENT_SECRET,
  SHAREPOINT_SITE_HOST, SHAREPOINT_SITE_PATH,
  SHAREPOINT_DRIVE_ID, FOLDER_ITEM_ID
} = process.env;

async function getAppToken() {
  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = qs.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
  const json = await res.json();
  if (!json.access_token) throw new Error('Token fail');
  return json.access_token;
}

// resolve site & drive once (you can cache)
async function getSiteAndDrive(token) {
  const siteRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE_HOST}:${SHAREPOINT_SITE_PATH}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const site = await siteRes.json();
  const driveRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/drives`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const drives = await driveRes.json();
  return { site, drives };
}

// create anonymous view link for folder (requires tenant to allow Anyone)
async function createAnonymousViewLink(token, itemId) {
  const res = await fetch(`https://graph.microsoft.com/v1.0/drives/${SHAREPOINT_DRIVE_ID}/items/${itemId}/createLink`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'view', scope: 'anonymous', expirationDateTime: null })
  });
  const json = await res.json();
  if (!json.link || !json.link.webUrl) {
    throw new Error('createLink failed: ' + JSON.stringify(json));
  }
  return json.link.webUrl;
}

module.exports = { getAppToken, getSiteAndDrive, createAnonymousViewLink };
