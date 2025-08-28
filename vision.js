// vision.js
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

async function isPoliceUniform(imageBuffer) {
  const [result] = await client.labelDetection({ image: { content: imageBuffer } });
  const labels = (result.labelAnnotations || []).map(l => l.description.toLowerCase());
  const hits = ['police', 'police officer', 'uniform', 'law enforcement'];
  const found = labels.some(l => hits.includes(l));
  return found; // simple heuristic
}

module.exports = { isPoliceUniform };
