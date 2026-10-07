// Icône de l'écran d'accueil : anneau bleu-violet lumineux sur fond nuit
import { createRequire } from "node:module";
const sharp = createRequire("/opt/npm-tools/node_modules/")("sharp");
const r = 56, c = 2 * Math.PI * r;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs>
    <radialGradient id="bg" cx="50%" cy="0%" r="110%"><stop offset="0" stop-color="#16205A"/><stop offset=".55" stop-color="#070B22"/><stop offset="1" stop-color="#03050D"/></radialGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3E7BFF"/><stop offset="1" stop-color="#9A6BFF"/></linearGradient>
    <filter id="b"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <rect width="180" height="180" fill="url(#bg)"/>
  <circle cx="90" cy="90" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="13"/>
  <circle cx="90" cy="90" r="${r}" fill="none" stroke="url(#g)" stroke-width="13" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * 0.25}" transform="rotate(-90 90 90)" filter="url(#b)" opacity=".8"/>
  <circle cx="90" cy="90" r="${r}" fill="none" stroke="url(#g)" stroke-width="13" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * 0.25}" transform="rotate(-90 90 90)"/>
  <circle cx="90" cy="90" r="9" fill="#BFD3FF"/>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile("../apple-touch-icon.png");
console.log("icône ok");
