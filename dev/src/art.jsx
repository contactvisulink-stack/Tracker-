// ═════════════════════════════════════════════════════════════
// Patch 8.1 « L'Affiche » : les illustrations, peintes dans le téléphone.
// Ciels, fumées, montagnes, lune, cadres art déco, papier déchiré,
// damas et graffitis. Tout est original et calculé (rien à télécharger).
// ═════════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useRef, useState } from "react";
import { reduceMotion } from "./ui.jsx";

// ── Bruit (simplex 2D) ──────────────────────────────────────
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export { rng };
function makeNoise(seed) {
  const r = rng(seed), perm = new Uint8Array(256), p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const GX = [1, -1, 1, -1, 1, -1, 0, 0], GY = [1, 1, -1, -1, 0, 0, 1, -1];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return (x, y) => {
    const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s), t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, a;
    a = 0.5 - x0 * x0 - y0 * y0; if (a > 0) { const g = p[ii + p[jj]] & 7; a *= a; n += a * a * (GX[g] * x0 + GY[g] * y0); }
    a = 0.5 - x1 * x1 - y1 * y1; if (a > 0) { const g = p[ii + i1 + p[jj + j1]] & 7; a *= a; n += a * a * (GX[g] * x1 + GY[g] * y1); }
    a = 0.5 - x2 * x2 - y2 * y2; if (a > 0) { const g = p[ii + 1 + p[jj + 1]] & 7; a *= a; n += a * a * (GX[g] * x2 + GY[g] * y2); }
    return 70 * n;
  };
}
const fbm = (N, x, y, o) => { let a = 0.5, f = 1, s = 0; for (let i = 0; i < o; i++) { s += a * N(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };
const hexRgb = (h) => { const v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
export const mixHex = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ── Les ambiances ───────────────────────────────────────────
// stops : dégradé du haut vers le bas ; lights : sources de lumière ;
// cloud : nuages ou fumée (couleur sombre, couleur éclairée, densité) ; stars : densité d'étoiles.
export const INK = { astral: "#0D0820", braise: "#120604", sang: "#0E0406", or: "#0E0B07", neon: "#07040C", abysse: "#010C11" };
export const SKY = {
  dawn: { stops: [[0, "#120C34"], [0.4, "#3B2366"], [0.66, "#A4507E"], [0.84, "#F09378"], [1, "#FFD3A0"]], lights: [{ x: 0.2, y: 0.8, r: 0.3, c: "#FFE0B0", i: 0.95, core: 0.5 }], cloud: { lit: "#FFC2A2", dark: "#2B1846", amt: 0.8, y0: 0.18, y1: 0.86, st: 3 }, stars: 0.3, haze: "#C26A86" },
  day: { stops: [[0, "#0D1240"], [0.42, "#2B3889"], [0.72, "#6E62C2"], [1, "#E9BC93"]], lights: [{ x: 0.76, y: 0.2, r: 0.26, c: "#FFF1D2", i: 0.85, core: 0.6 }], cloud: { lit: "#FFFFFF", dark: "#33377F", amt: 0.62, y0: 0.08, y1: 0.86, st: 2.4 }, stars: 0, haze: "#8573C4" },
  golden: { stops: [[0, "#24174A"], [0.36, "#6A3F7A"], [0.64, "#D98A62"], [0.86, "#FFC27A"], [1, "#FFE6B0"]], lights: [{ x: 0.78, y: 0.62, r: 0.34, c: "#FFE2A6", i: 1.05, core: 0.75 }], cloud: { lit: "#FFE4B8", dark: "#5A3460", amt: 0.7, y0: 0.1, y1: 0.86, st: 3 }, stars: 0, haze: "#D58A6A" },
  dusk: { stops: [[0, "#0B061F"], [0.36, "#31103E"], [0.64, "#9B2149"], [0.84, "#EE5B38"], [1, "#FFA356"]], lights: [{ x: 0.52, y: 0.88, r: 0.34, c: "#FF8546", i: 1, core: 0.7 }], cloud: { lit: "#FF9A68", dark: "#290B2D", amt: 0.78, y0: 0.14, y1: 0.86, st: 3.2 }, stars: 0.2, haze: "#B5304A" },
  night: { sc: 2.4, warp: 1.1, stops: [[0, "#03020B"], [0.45, "#0E0A2B"], [0.78, "#22154E"], [1, "#3A2876"]], lights: [{ x: 0.7, y: 0.27, r: 0.34, c: "#C6B4FF", i: 0.5 }], cloud: { lit: "#9C74FF", alt: "#FF6FB5", dark: "#110A2C", amt: 0.5, neb: true, lo: 0.42, hi: 0.9 }, stars: 1, haze: "#3B2A72" },
  braise: { sc: 1.5, warp: 0.6, stops: [[0, "#140502"], [0.55, "#2A0A04"], [1, "#100302"]], lights: [{ x: 0.82, y: 1.05, r: 0.5, c: "#FF4E14", i: 0.95, core: 0.25 }, { x: 0.98, y: 0.12, r: 0.3, c: "#FF9A3A", i: 0.3 }], cloud: { lit: "#FF7A2E", dark: "#1E0704", amt: 0.62, lo: 0.36, hi: 0.95 }, stars: 0, haze: "#7A1E08" },
  sang: { sc: 1.4, warp: 0.6, stops: [[0, "#4A0814"], [0.42, "#2A050C"], [1, "#0C0305"]], lights: [{ x: 0.16, y: 0.08, r: 0.5, c: "#D21E36", i: 0.7 }, { x: 0.92, y: 0.9, r: 0.3, c: "#7A0A18", i: 0.3 }], cloud: { lit: "#E0303F", dark: "#1C0408", amt: 0.5, lo: 0.4, hi: 0.98 }, stars: 0, haze: "#5E0A16" },
  or: { sc: 1.4, warp: 0.6, stops: [[0, "#17120B"], [0.6, "#120E09"], [1, "#0B0906"]], lights: [{ x: 0.5, y: 0.58, r: 0.38, c: "#C99A4A", i: 0.55 }], cloud: { lit: "#B88E4C", dark: "#120E08", amt: 0.45, lo: 0.4, hi: 0.98 }, stars: 0.12, haze: "#4A3818" },
  neon: { sc: 1.8, warp: 0.8, stops: [[0, "#07030E"], [0.6, "#120726"], [1, "#07040C"]], lights: [{ x: 0.25, y: 0.3, r: 0.42, c: "#FF3DA8", i: 0.6 }, { x: 0.85, y: 0.75, r: 0.4, c: "#33F0FF", i: 0.45 }], cloud: { lit: "#9D5CFF", alt: "#FF3DA8", dark: "#0D061F", amt: 0.55, neb: true, lo: 0.42, hi: 0.95 }, stars: 0.5, haze: "#3A1A6E" },
  abysse: { sc: 1.6, warp: 0.7, stops: [[0, "#010D12"], [0.6, "#032631"], [1, "#010A0E"]], lights: [{ x: 0.5, y: 0.05, r: 0.5, c: "#2FD8C8", i: 0.6 }], cloud: { lit: "#3FF0D8", dark: "#02181F", amt: 0.7 }, stars: 0.35, haze: "#0B4A58" },
};
/** Le ciel de l'accueil suit l'heure : aube, journée, fin d'après-midi, crépuscule, nuit */
export function skyFor(now, night) {
  if (night) return "night";
  const h = now.getHours() + now.getMinutes() / 60;
  if (h >= 5 && h < 8.5) return "dawn";
  if (h >= 8.5 && h < 14) return "day";
  if (h >= 14 && h < 18) return "golden";
  if (h >= 18 && h < 22.5) return "dusk";
  return "night";
}

// ── La peinture (une fois par ambiance et par taille, gardée en mémoire) ──
const done = new Map(), pending = new Map();
function paint(id, ow, oh, seed) {
  const key = `${id}:${ow}x${oh}:${seed}`;
  if (done.has(key)) return Promise.resolve(done.get(key));
  if (pending.has(key)) return pending.get(key);
  const o = SKY[id] || SKY.night;
  const pr = new Promise((res) => {
    setTimeout(() => {
      try {
        const W = Math.max(60, Math.round(ow / 3.6)), H = Math.max(80, Math.round(oh / 3.6));
        const c = document.createElement("canvas"); c.width = W; c.height = H;
        const g = c.getContext("2d"); const img = g.createImageData(W, H); const D = img.data;
        const N = makeNoise(seed), N2 = makeNoise(seed + 17), N3 = makeNoise(seed + 41);
        const stops = o.stops.map(([p, h]) => [p, hexRgb(h)]);
        const lights = o.lights.map((l) => ({ ...l, rgb: hexRgb(l.c) }));
        const cl = o.cloud, cLit = hexRgb(cl.lit), cDark = hexRgb(cl.dark), cAlt = cl.alt ? hexRgb(cl.alt) : null;
        const asp = W / H, st = cl.st || 1, SC = o.sc || 3, WP = o.warp ?? 1.7;
        const R = rng(seed + 3);
        for (let y = 0; y < H; y++) {
          const v = y / H;
          let k = 0; while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
          const [p0, c0] = stops[k], [p1, c1] = stops[k + 1];
          const tt = Math.min(1, Math.max(0, (v - p0) / (p1 - p0 || 1)));
          const br = c0[0] + (c1[0] - c0[0]) * tt, bg = c0[1] + (c1[1] - c0[1]) * tt, bb = c0[2] + (c1[2] - c0[2]) * tt;
          const band = cl.y0 != null ? sm(cl.y0 - 0.12, cl.y0 + 0.1, v) * (1 - sm(cl.y1 - 0.1, cl.y1 + 0.08, v)) : 1;
          for (let x = 0; x < W; x++) {
            const u = x / W, px = (u * asp * SC) / st, py = v * SC * (st > 1 ? 1.7 : 1);
            const qx = fbm(N, px + 1.7, py + 9.2, 3), qy = fbm(N, px + 8.3, py + 2.8, 3);
            const n = fbm(N2, px + WP * qx, py + WP * qy, 5) * 0.5 + 0.5;
            const dens = sm(cl.lo ?? 0.44, cl.hi ?? 0.8, n) * band * cl.amt;
            let r = br, gg = bg, b = bb, glow = 0;
            let lr = 0, lg = 0, lb = 0;
            for (const L of lights) {
              const dx = (u - L.x) * asp, dy = v - L.y, d2 = dx * dx + dy * dy;
              const gl = Math.exp(-d2 / (2 * L.r * L.r)) * L.i;
              const core = L.core ? Math.exp(-d2 / (2 * (L.r * 0.16) ** 2)) * L.core : 0;
              glow += gl; lr += L.rgb[0] * (gl * 0.5 + core); lg += L.rgb[1] * (gl * 0.5 + core); lb += L.rgb[2] * (gl * 0.5 + core);
            }
            const lit = Math.min(1, glow * 1.5 + 0.12);
            let tr = cLit[0], tg = cLit[1], tb = cLit[2];
            if (cl.neb && cAlt) { const m = sm(-0.3, 0.5, N3(px * 0.7, py * 0.7)); tr += (cAlt[0] - tr) * m; tg += (cAlt[1] - tg) * m; tb += (cAlt[2] - tb) * m; }
            const cr = cDark[0] + (tr - cDark[0]) * lit, cg = cDark[1] + (tg - cDark[1]) * lit, cb = cDark[2] + (tb - cDark[2]) * lit;
            r += (cr - r) * dens; gg += (cg - gg) * dens; b += (cb - b) * dens;
            if (cl.neb) { const f = Math.max(0, n - 0.5) * 0.9 * cl.amt; r += tr * f * 0.35; gg += tg * f * 0.35; b += tb * f * 0.35; }
            r += lr; gg += lg; b += lb;
            const vg = 1 - 0.32 * ((u - 0.5) ** 2 * 2.2 + (v - 0.42) ** 2 * 1.1);
            const dither = (R() - 0.5) * 3;
            const i = (y * W + x) * 4;
            D[i] = Math.min(255, Math.max(0, r * vg + dither)); D[i + 1] = Math.min(255, Math.max(0, gg * vg + dither)); D[i + 2] = Math.min(255, Math.max(0, b * vg + dither)); D[i + 3] = 255;
          }
        }
        g.putImageData(img, 0, 0);
        const out = document.createElement("canvas"); out.width = ow; out.height = oh;
        const og = out.getContext("2d"); og.imageSmoothingEnabled = true; og.imageSmoothingQuality = "high";
        og.drawImage(c, 0, 0, ow, oh);
        if (o.stars) {
          const n = Math.round((ow * oh) / 2600 * o.stars);
          for (let s = 0; s < n; s++) {
            const x = R() * ow, y = R() * oh * 0.78, big = R() < 0.06;
            const a = (0.25 + R() * 0.75) * (1 - y / (oh * 0.85));
            og.fillStyle = `rgba(255,248,255,${a.toFixed(2)})`;
            og.beginPath(); og.arc(x, y, big ? 1.5 + R() : 0.5 + R() * 0.7, 0, 6.283); og.fill();
            if (big) { og.fillStyle = `rgba(220,200,255,${(a * 0.25).toFixed(2)})`; og.beginPath(); og.arc(x, y, 5, 0, 6.283); og.fill(); }
          }
        }
        const fin = (url) => { done.set(key, url); pending.delete(key); res(url); };
        if (out.toBlob) out.toBlob((bl) => fin(bl ? URL.createObjectURL(bl) : out.toDataURL("image/jpeg", 0.9)), "image/jpeg", 0.9);
        else fin(out.toDataURL("image/jpeg", 0.9));
      } catch { pending.delete(key); res(null); }
    }, 16);
  });
  pending.set(key, pr);
  return pr;
}
const cssSky = (id) => { const o = SKY[id] || SKY.night; return `linear-gradient(180deg, ${o.stops.map(([p, c]) => `${c} ${Math.round(p * 100)}%`).join(", ")})`; };

/** Fond peint (fondu dès qu'il est prêt, dégradé simple en attendant) */
export function Backdrop({ id, seed = 7, className = "" }) {
  const ref = useRef(null);
  const [url, setUrl] = useState(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ow = Math.round(Math.max(200, r.width) * dpr / 8) * 8, oh = Math.round(Math.max(200, r.height) * dpr / 8) * 8;
    let live = true;
    paint(id, ow, oh, seed).then((u) => { if (live) setUrl(u); });
    return () => { live = false; };
  }, [id, seed]);
  return (
    <div ref={ref} className={"bd " + className} style={{ background: cssSky(id) }} aria-hidden="true">
      {url && <img src={url} alt="" className="bd-img" />}
    </div>
  );
}

// ── Montagnes en silhouette (trois plans) et une tourelle ──
function ridge(seed, W, H, base, amp, rough, sharp) {
  const N = makeNoise(seed);
  let d = `M0 ${H} L0 ${base}`;
  for (let x = 0; x <= W; x += 4) {
    let n = fbm(N, (x / W) * rough, seed * 0.13, 4);
    if (sharp) n = 1 - Math.abs(n) * 2.2;
    d += ` L${x} ${(base - amp * n).toFixed(1)}`;
  }
  return d + ` L${W} ${H} Z`;
}
export function Ridges({ id = "night", seed = 11, tower = true, className = "", part }) {
  const back = part !== "front", front = part !== "back";
  const o = SKY[id] || SKY.night;
  const ink = INK[o.ink || (id in INK ? id : "astral")] || INK.astral;
  const W = 400, H = 150;
  const p = useMemo(() => [ridge(seed, W, H, 64, 26, 3.4, true), ridge(seed + 5, W, H, 92, 22, 2.6, true), ridge(seed + 9, W, H, 122, 12, 2, false)], [seed]);
  const far = mixHex(ink, o.haze, 0.5), mid = mixHex(ink, o.haze, 0.22);
  return (
    <svg className={"ridges " + className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={"rf" + seed} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={o.haze} stopOpacity=".55" /><stop offset="1" stopColor={o.haze} stopOpacity="0" /></linearGradient>
      </defs>
      {back && <path d={p[0]} fill={far} />}
      {back && <rect x="0" y="70" width={W} height="60" fill={`url(#rf${seed})`} opacity=".55" />}
      {front && <path d={p[1]} fill={mid} />}
      {front && <path d={p[1]} fill="none" stroke={o.haze} strokeOpacity=".55" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      {front && tower && (
        <g transform="translate(318 0)" fill={mid}>
          <path d="M-9 100 L-6 62 L-8 60 L-8 55 L-3 52 L-3 40 L0 33 L3 40 L3 52 L8 55 L8 60 L6 62 L9 100 Z" />
          <path d="M0 22 L3 28 L0 34 L-3 28 Z" className="tw-gem" />
        </g>
      )}
      {front && <path d={p[2]} fill={ink} className="ridge-near" />}
    </svg>
  );
}

// ── Particules (poussière d'étoiles, braises, pétales, lucioles) ──
export function Particles({ kind = "dust", n = 14, seed = 5 }) {
  const list = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }, () => ({ l: r() * 100, t: 20 + r() * 75, d: 6 + r() * 7, dl: -r() * 12, s: 0.6 + r() * 0.9, x: Math.round(r() * 50 - 25) }));
  }, [n, seed]);
  if (reduceMotion()) return null;
  return (
    <div className={"ptc ptc-" + kind} aria-hidden="true">
      {list.map((p, i) => <i key={i} style={{ left: p.l + "%", top: p.t + "%", "--d": p.d.toFixed(1) + "s", "--dl": p.dl.toFixed(1) + "s", "--s": p.s.toFixed(2), "--x": p.x + "px" }} />)}
    </div>
  );
}

// ── La lune : sa partie éclairée suit ta nuit (croissant → pleine lune) ──
export function Moon({ size = 150, frac = 1 }) {
  const r = size / 2 - 6, cx = size / 2, cy = size / 2;
  const f = Math.min(1, Math.max(0.06, frac));
  const rx = Math.abs(1 - 2 * f) * r;
  const lit = `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} A${rx.toFixed(2)} ${r} 0 0 ${f > 0.5 ? 1 : 0} ${cx} ${cy - r} Z`;
  return (
    <svg className="moon" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <radialGradient id="mn-s" cx="42%" cy="38%" r="70%"><stop offset="0" stopColor="#FFFBFF" /><stop offset=".55" stopColor="#E4DAFA" /><stop offset="1" stopColor="#A898DA" /></radialGradient>
        <clipPath id="mn-c"><path d={lit} /></clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="#1B1440" opacity=".55" />
      <g clipPath="url(#mn-c)">
        <circle cx={cx} cy={cy} r={r} fill="url(#mn-s)" />
        <g fill="#8E7FC4" opacity=".28">
          <circle cx={cx - r * 0.3} cy={cy - r * 0.25} r={r * 0.16} /><circle cx={cx + r * 0.28} cy={cy + r * 0.12} r={r * 0.22} />
          <circle cx={cx - r * 0.12} cy={cy + r * 0.45} r={r * 0.1} /><circle cx={cx + r * 0.42} cy={cy - r * 0.42} r={r * 0.08} />
        </g>
      </g>
    </svg>
  );
}

// ── Cadre art déco (coins à gradins), séparateur orné ──
function Corner({ c }) {
  return (
    <svg className={"dc dc-" + c} width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <path d="M1.5 29 V10 H6 V6 H10 V1.5 H29" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 29 V14 H10.5 V10.5 H14 V6.5 H29" fill="none" stroke="currentColor" strokeWidth=".8" opacity=".55" />
      <path d="M3 3 L6.5 3 L3 6.5 Z" fill="currentColor" />
    </svg>
  );
}
export function Deco({ as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag className={"deco " + className} {...rest}>
      <Corner c="tl" /><Corner c="tr" /><Corner c="bl" /><Corner c="br" />
      {children}
    </Tag>
  );
}
export function Orn({ className = "" }) {
  return (
    <svg className={"orn " + className} viewBox="0 0 240 14" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs><linearGradient id="orn-g" x1="0" x2="1"><stop offset="0" stopColor="currentColor" stopOpacity="0" /><stop offset=".5" stopColor="currentColor" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      <path d="M0 7 H104 M136 7 H240" stroke="url(#orn-g)" strokeWidth="1" />
      <path d="M120 1 L126 7 L120 13 L114 7 Z" fill="currentColor" />
      <path d="M108 7 L111 4 L114 7 L111 10 Z M126 7 L129 4 L132 7 L129 10 Z" fill="currentColor" opacity=".6" />
    </svg>
  );
}

// ── Papier déchiré ──
export function Torn({ seed = 3, flip, className = "" }) {
  const d = useMemo(() => {
    const r = rng(seed), W = 400, H = 18, pts = [];
    let x = 0;
    while (x < W) { const deep = r() < 0.1; pts.push([x, 4 + r() * 7 + (deep ? 4 + r() * 5 : 0)]); x += 2 + r() * 8; }
    pts.push([W, 6]);
    return `M0 ${H} ` + pts.map(([a, b]) => `L${a.toFixed(1)} ${b.toFixed(1)}`).join(" ") + ` L${W} ${H} Z`;
  }, [seed]);
  return (
    <svg className={"torn " + (flip ? "flip " : "") + className} viewBox="0 0 400 18" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

// ── Damas (motif baroque, dessiné ici) ──
export function damask(color = "#E0283F", a = 0.16) {
  const half = "M32 6 C40 16 47 26 42 37 C38 44 33 44 33 38 C33 34 37 33 38 36 M32 20 C36 26 37 32 32 40 M32 40 C40 40 48 46 48 56 C48 63 42 65 40 60 C39 57 42 55 44 57 M32 58 C38 64 44 72 40 82 C38 88 34 90 32 92 M42 37 C50 40 56 34 56 26 C56 20 50 18 48 22";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='96' viewBox='0 0 64 96'><g fill='none' stroke='${color}' stroke-opacity='${a}' stroke-width='1.1' stroke-linecap='round'><path d='${half}'/><path d='${half}' transform='translate(64 0) scale(-1 1)'/><path d='M32 44 L35 48 L32 52 L29 48 Z' fill='${color}' fill-opacity='${a}'/><circle cx='0' cy='0' r='3'/><circle cx='64' cy='0' r='3'/><circle cx='0' cy='96' r='3'/><circle cx='64' cy='96' r='3'/><path d='M0 44 C6 48 6 56 0 60 M64 44 C58 48 58 56 64 60'/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// ── Graffitis (dessins originaux, au marqueur) ──
const DOODLE = {
  star: "M50 9 L60 37 L92 38 L67 57 L76 89 L50 70 L23 88 L33 57 L8 39 L40 37 Z",
  crown: "M15 74 L10 31 L32 52 L50 17 L68 52 L91 30 L85 74 Z M14 86 L86 84",
  cross: "M22 20 L80 80 M79 21 L21 79",
  arrow: "M10 72 C30 40 56 30 84 34 M70 18 L85 34 L67 47",
  bolt: "M58 6 L25 56 H48 L39 94 L77 40 H54 Z",
  heart: "M50 84 C21 63 8 45 18 29 C28 15 44 18 50 32 C56 18 72 15 82 29 C92 45 79 63 50 84 Z",
  swirl: "M22 62 C18 30 70 22 74 50 C77 72 41 78 38 57 C36 42 57 38 60 52",
  burst: "M50 8 L54 36 L80 16 L62 42 L94 44 L64 56 L84 82 L56 64 L50 94 L44 64 L16 82 L36 56 L6 44 L38 42 L20 16 L46 36 Z",
};
const NEON = ["#FF3DA8", "#33F0FF", "#9D5CFF", "#FFE14D", "#5CFF9D"];
export function Doodles({ seed = 9, n = 6, area = "ring" }) {
  const list = useMemo(() => {
    const r = rng(seed), keys = Object.keys(DOODLE);
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + r() * 0.6;
      const pos = area === "ring" ? { l: 50 + Math.cos(a) * (34 + r() * 10), t: 50 + Math.sin(a) * (30 + r() * 12) } : { l: r() * 92, t: r() * 88 };
      return { k: keys[Math.floor(r() * keys.length)], ...pos, s: 34 + r() * 34, rot: Math.round(r() * 60 - 30), c: NEON[Math.floor(r() * NEON.length)], dl: (r() * 0.25).toFixed(2) };
    });
  }, [seed, n, area]);
  return (
    <div className="doodles" aria-hidden="true">
      {list.map((d, i) => (
        <svg key={i} viewBox="0 0 100 100" width={d.s} height={d.s} style={{ left: d.l + "%", top: d.t + "%", "--rot": d.rot + "deg", "--nc": d.c, "--dl": d.dl + "s" }}>
          <path d={DOODLE[d.k]} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
        </svg>
      ))}
    </div>
  );
}
/** Coulures de peinture sous un tag */
export function Drips({ seed = 4, n = 7 }) {
  const list = useMemo(() => { const r = rng(seed); return Array.from({ length: n }, () => ({ x: 6 + r() * 88, h: 10 + r() * 34, w: 3 + r() * 3 })); }, [seed, n]);
  return (
    <svg className="drips" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
      {list.map((d, i) => <g key={i}><rect x={d.x} y="0" width={d.w * 0.5} height={d.h} rx={d.w * 0.25} fill="currentColor" /><circle cx={d.x + d.w * 0.25} cy={d.h} r={d.w * 0.42} fill="currentColor" /></g>)}
    </svg>
  );
}

// ── Grain (texture de papier photo, posée sur les affiches) ──
let grainDone = false;
export function initGrain() {
  if (grainDone || typeof document === "undefined") return;
  grainDone = true;
  try {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), im = g.createImageData(128, 128), r = rng(99);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.round(r() * 255); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 60; }
    g.putImageData(im, 0, 0);
    document.documentElement.style.setProperty("--grain", `url(${c.toDataURL("image/png")})`);
  } catch {}
}
