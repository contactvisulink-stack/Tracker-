// Icône de l'écran d'accueil (patch 8) : un hexagone doré et un cristal de mana sur fond abysse
import { createRequire } from "node:module";
const sharp = createRequire("/opt/npm-tools/node_modules/")("sharp");
const hex = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i - Math.PI / 2; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="80%"><stop offset="0" stop-color="#123A55"/><stop offset=".55" stop-color="#0A1428"/><stop offset="1" stop-color="#010A13"/></radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FAF3E2"/><stop offset=".45" stop-color="#C8AA6E"/><stop offset="1" stop-color="#5C4320"/></linearGradient>
    <radialGradient id="core" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#1B3550"/><stop offset="1" stop-color="#040A13"/></radialGradient>
    <linearGradient id="gem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8FFFC"/><stop offset=".45" stop-color="#0AC8B9"/><stop offset="1" stop-color="#035A5A"/></linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <rect width="180" height="180" fill="url(#bg)"/>
  <polygon points="${hex(90, 92, 66)}" fill="url(#gold)"/>
  <polygon points="${hex(90, 92, 60)}" fill="url(#core)"/>
  <path d="M90 50 L113 86 L90 134 L67 86 Z" fill="#0AC8B9" opacity=".55" filter="url(#glow)"/>
  <path d="M90 50 L113 86 L90 134 L67 86 Z" fill="url(#gem)" stroke="#E8FFFC" stroke-opacity=".6" stroke-width="1.5"/>
  <path d="M67 86 H113 M90 50 L82 86 L90 134 L98 86 Z" fill="none" stroke="#E8FFFC" stroke-opacity=".45" stroke-width="1.2"/>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile("../apple-touch-icon.png");
console.log("icône ok");
