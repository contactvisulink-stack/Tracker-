// Icône de l'écran d'accueil (patch 8.1 « L'Affiche ») : un ciel de crépuscule, des montagnes, un losange d'or
import { createRequire } from "node:module";
const sharp = createRequire("/opt/npm-tools/node_modules/")("sharp");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B061F"/><stop offset=".42" stop-color="#31103E"/><stop offset=".72" stop-color="#9B2149"/><stop offset="1" stop-color="#EE5B38"/></linearGradient>
    <radialGradient id="sun" cx="50%" cy="78%" r="45%"><stop offset="0" stop-color="#FFB46A" stop-opacity=".9"/><stop offset="1" stop-color="#FFB46A" stop-opacity="0"/></radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFAEA"/><stop offset=".35" stop-color="#FFE5A0"/><stop offset=".6" stop-color="#EDB252"/><stop offset=".78" stop-color="#A2691F"/><stop offset="1" stop-color="#F7D58A"/></linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <rect width="180" height="180" fill="url(#sky)"/>
  <rect width="180" height="180" fill="url(#sun)"/>
  <g fill="#FFFFFF" opacity=".8"><circle cx="30" cy="26" r="1"/><circle cx="150" cy="40" r="1.2"/><circle cx="122" cy="18" r=".8"/><circle cx="52" cy="54" r=".7"/></g>
  <path d="M90 34 L134 82 L90 130 L46 82 Z" fill="#FFC46A" opacity=".55" filter="url(#glow)"/>
  <path d="M90 34 L134 82 L90 130 L46 82 Z" fill="url(#gold)"/>
  <path d="M90 47 L122 82 L90 117 L58 82 Z" fill="none" stroke="#5A3410" stroke-opacity=".55" stroke-width="2"/>
  <path d="M0 150 L22 132 L38 140 L60 118 L82 136 L100 124 L120 140 L142 120 L160 134 L180 126 L180 180 L0 180 Z" fill="#3B1630"/>
  <path d="M0 164 L30 152 L58 160 L92 148 L124 158 L152 150 L180 156 L180 180 L0 180 Z" fill="#0D0820"/>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile("../apple-touch-icon.png");
console.log("icône ok");
