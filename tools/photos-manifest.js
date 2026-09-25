// Builds js/photos.js from whatever is in img/<store>/<item>.<ext>.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'img'), out = {};
if (fs.existsSync(root)) for (const store of fs.readdirSync(root)) {
  const dir = path.join(root, store); if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) { const m = f.match(/^(.+)\.(webp|jpg|jpeg|png)$/); if (m) (out[store] = out[store] || {})[m[1]] = 'img/' + store + '/' + f; }
}
fs.writeFileSync(path.join(__dirname, '..', 'js', 'photos.js'),
  '/* Generated: photos stored in this repo (img/<store>/<item>.<ext>), copied from each shop\'s own\n   ordering page. Regenerate with: node tools/photos-manifest.js */\nwindow.OTG_LOCAL_PHOTOS = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(Object.entries(out).map(([k, v]) => k + ':' + Object.keys(v).length).join(' ') || 'no photos yet');
