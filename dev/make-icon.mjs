import { createRequire } from "node:module"; const sharp = createRequire("/opt/npm-tools/node_modules/")("sharp");
const r = 58, c = 2 * Math.PI * r;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs><radialGradient id="g" cx="75%" cy="20%" r="80%"><stop offset="0" stop-color="#3a2a05"/><stop offset=".55" stop-color="#0d0d1a"/><stop offset="1" stop-color="#080812"/></radialGradient></defs>
  <rect width="180" height="180" fill="url(#g)"/>
  <circle cx="90" cy="90" r="${r}" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="14"/>
  <circle cx="90" cy="90" r="${r}" fill="none" stroke="#f0a500" stroke-width="14" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * 0.28}" transform="rotate(-90 90 90)"/>
  <circle cx="90" cy="90" r="11" fill="#f0a500"/>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile("../apple-touch-icon.png");
console.log("icône ok");
