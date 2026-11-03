// ═════════════════════════════════════════════════════════════
// Patch 8.1 : les pictogrammes, redessinés à plat.
// Style des jeux Riot d'aujourd'hui : géométrie nette (angles à 45° et 60°),
// aplats d'une seule couleur, facettes claires et sombres au lieu des dégradés,
// aucun reflet brillant, aucun biseau. Tous les dessins sont originaux.
// ═════════════════════════════════════════════════════════════
import React, { useId } from "react";
import * as G from "./game.js";

const f2 = (v) => +v.toFixed(2);
const pts = (a) => a.map(([x, y]) => `${f2(x)},${f2(y)}`).join(" ");
const ngon = (cx, cy, r, n, rot = 0) => Array.from({ length: n }, (_, i) => { const a = rot + (i * 2 * Math.PI) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
const mirror = (a, W) => a.map(([x, y]) => [W - x, y]);
const P = ({ p, ...r }) => <polygon points={pts(p)} {...r} />;
const LT = { fill: "#fff", fillOpacity: 0.34 };
const LT2 = { fill: "#fff", fillOpacity: 0.16 };
const DK = { fill: "#000", fillOpacity: 0.26 };
const CC = { fill: "currentColor" };
const uid = () => useId().replace(/[^a-zA-Z0-9]/g, "");
/** Moitié gauche d'un octogone (pour poser une facette claire) */
const halfOct = (cx, cy, r) => { const o = ngon(cx, cy, r, 8, Math.PI / 8).filter(([x]) => x < cx).reverse(); const h = r * Math.sin((3 * Math.PI) / 8); return [[cx, cy - h], ...o, [cx, cy + h]]; };

/** Rayons de soleil (triangles) autour d'un centre */
function rays(cx, cy, n, r1, r2s, ws, rot = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / n, r2 = r2s[i % r2s.length], w = ws[i % ws.length];
    const c = Math.cos(a), s = Math.sin(a);
    return { tip: [cx + c * r2, cy + s * r2], b1: [cx + c * r1 - s * w, cy + s * r1 + c * w], b2: [cx + c * r1 + s * w, cy + s * r1 - c * w], mid: [cx + c * r1, cy + s * r1] };
  });
}
/** Anneau octogonal en 8 segments (facettes du haut claires, du bas sombres) */
function octRing(cx, cy, r1, r2, shade = true) {
  const o = ngon(cx, cy, r1, 8, Math.PI / 8), i = ngon(cx, cy, r2, 8, Math.PI / 8);
  return o.map((_, k) => {
    const q = [o[k], o[(k + 1) % 8], i[(k + 1) % 8], i[k]];
    const tone = !shade ? null : [6, 7].includes(k) ? LT : [5, 0].includes(k) ? LT2 : [2, 3].includes(k) ? DK : null;
    return <g key={k}><P p={q} {...CC} />{tone && <P p={q} {...tone} />}</g>;
  });
}

// ═════════════════════════════════════════════════════════════
// Glyphes pleins (24 × 24) : les symboles du jeu
// ═════════════════════════════════════════════════════════════
const sunRays = rays(12, 12, 8, 6.1, [11.2, 9.4], [1.65, 1.3]);
const star5 = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 4.4 : 10.6; return [12 + r * Math.cos(a), 12.6 + r * Math.sin(a)]; });
const spark4 = [[12, 1.4], [14.2, 9.8], [22.6, 12], [14.2, 14.2], [12, 22.6], [9.8, 14.2], [1.4, 12], [9.8, 9.8]];
const vert = (cy, hw) => [[12 - hw, cy], [12 - hw + 1.1, cy - 1.15], [12 + hw - 1.1, cy - 1.15], [12 + hw, cy], [12 + hw - 1.1, cy + 1.15], [12 - hw + 1.1, cy + 1.15]];
const GL = {
  coin: (
    <>
      {octRing(12, 12, 10.4, 7.4)}
      <P p={[[12, 7.6], [16.4, 12], [12, 16.4], [7.6, 12]]} {...CC} />
      <P p={[[12, 7.6], [12, 16.4], [7.6, 12]]} {...LT} />
    </>
  ),
  bolt: (
    <>
      <P p={[[14.6, 1.6], [4.4, 13.5], [10.9, 13.5], [9.1, 22.4], [19.6, 10.1], [13, 10.1]]} {...CC} />
      <P p={[[14.6, 1.6], [4.4, 13.5], [10.9, 13.5], [13, 10.1]]} {...LT} />
    </>
  ),
  heart: (
    <>
      <P p={[[12, 21.4], [2.6, 12], [2.6, 7.1], [7, 2.7], [12, 7.7], [17, 2.7], [21.4, 7.1], [21.4, 12]]} {...CC} />
      <P p={[[12, 7.7], [7, 2.7], [2.6, 7.1], [2.6, 12], [12, 21.4]]} {...LT} />
      <P p={[[21.4, 12], [12, 21.4], [12, 15.8]]} {...DK} />
    </>
  ),
  crystal: (
    <>
      <P p={[[12, 1.6], [19.2, 8.2], [12, 22.4], [4.8, 8.2]]} {...CC} />
      <P p={[[12, 1.6], [4.8, 8.2], [12, 8.2]]} {...LT} />
      <P p={[[4.8, 8.2], [12, 8.2], [12, 22.4]]} {...LT2} />
      <P p={[[12, 1.6], [19.2, 8.2], [12, 8.2]]} {...DK} />
    </>
  ),
  sword: (
    <g transform="rotate(45 12 12)">
      <P p={[[12, 0.6], [14.2, 3.4], [14.2, 15.2], [9.8, 15.2], [9.8, 3.4]]} {...CC} />
      <P p={[[12, 0.6], [14.2, 3.4], [14.2, 15.2], [12, 15.2]]} {...DK} />
      <P p={[[6, 15.5], [18, 15.5], [16.8, 17.6], [7.2, 17.6]]} {...CC} />
      <P p={[[10.9, 17.8], [13.1, 17.8], [13.1, 20.7], [10.9, 20.7]]} {...CC} />
      <P p={[[12, 20.6], [13.7, 22.3], [12, 24], [10.3, 22.3]]} {...CC} />
    </g>
  ),
  flame: (
    <>
      <P p={[[12, 1.4], [17.2, 8.4], [16.2, 11.6], [19.3, 9.8], [20.5, 15.2], [17.4, 20.6], [12, 22.6], [6.6, 20.6], [3.5, 15.2], [5.8, 9.3], [8.4, 12], [7.8, 6.5]]} {...CC} />
      <P p={[[12, 9.2], [15.5, 14.2], [14.8, 18.7], [12, 20.5], [9.2, 18.7], [8.5, 14.2]]} {...LT} />
      <P p={[[12, 1.4], [7.8, 6.5], [8.4, 12], [12, 9.2]]} {...LT2} />
    </>
  ),
  sun: (
    <>
      {sunRays.map((r, i) => <g key={i}><P p={[r.b1, r.tip, r.b2]} {...CC} /><P p={[r.b1, r.tip, r.mid]} {...LT} /></g>)}
      <P p={ngon(12, 12, 4.6, 8, Math.PI / 8)} {...CC} />
      <P p={halfOct(12, 12, 4.6)} {...LT2} />
    </>
  ),
  moon: (
    <>
      <path d="M20.4 15.1A8.6 8.6 0 1 1 9.6 3.4a7 7 0 0 0 10.8 11.7Z" fill="currentColor" />
      <P p={[[18.2, 3], [19, 5.4], [21.4, 6.2], [19, 7], [18.2, 9.4], [17.4, 7], [15, 6.2], [17.4, 5.4]]} {...CC} />
    </>
  ),
  recall: (
    <>
      <path d="M12 3.3A8.7 8.7 0 0 1 20.2 9" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M12 20.7A8.7 8.7 0 0 1 3.8 15" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <P p={[[17, 9.6], [23.2, 9.6], [20.1, 13.6]]} {...CC} />
      <P p={[[0.8, 14.4], [7, 14.4], [3.9, 10.4]]} {...CC} />
      <P p={[[12, 8], [16, 12], [12, 16], [8, 12]]} {...CC} />
      <P p={[[12, 8], [12, 16], [8, 12]]} {...LT} />
    </>
  ),
  eye: (
    <>
      <path fillRule="evenodd" d="M1.6 12 7 6 17 6 22.4 12 17 18 7 18Z M12 8.1 15.9 12 12 15.9 8.1 12Z" fill="currentColor" />
      <path fillRule="evenodd" d="M1.6 12 7 6 17 6 22.4 12Z M12 8.1 15.9 12 8.1 12Z" {...LT2} />
      <P p={[[12, 10.1], [13.9, 12], [12, 13.9], [10.1, 12]]} {...CC} />
    </>
  ),
  potion: (
    <>
      <P p={[[10.2, 3.8], [13.8, 3.8], [13.8, 8.2], [19.4, 15.3], [19.4, 18.8], [16.2, 22.2], [7.8, 22.2], [4.6, 18.8], [4.6, 15.3], [10.2, 8.2]]} fill="currentColor" fillOpacity=".38" />
      <P p={[[9.2, 1.6], [14.8, 1.6], [14.8, 3.9], [9.2, 3.9]]} {...CC} />
      <P p={[[5.8, 15.2], [18.2, 15.2], [18.2, 18.4], [15.6, 21], [8.4, 21], [5.8, 18.4]]} {...CC} />
      <P p={[[5.8, 15.2], [12, 15.2], [12, 21], [8.4, 21], [5.8, 18.4]]} {...LT} />
    </>
  ),
  posture: (
    <>
      <P p={[[12, 1.2], [14.2, 3.4], [12, 5.6], [9.8, 3.4]]} {...CC} />
      {[0, 1, 2, 3, 4].map((k) => { const v = vert(8.4 + k * 3.3, 4.2 - k * 0.38); return <g key={k}><P p={v} {...CC} /><P p={[v[0], v[1], [12, v[1][1]], [12, v[5][1]], v[5]]} {...LT} /></g>; })}
    </>
  ),
  trophy: (
    <>
      <path d="M6.6 4.6H3.4v2.9l3.5 2.8M17.4 4.6h3.2v2.9l-3.5 2.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <P p={[[6.6, 2.6], [17.4, 2.6], [17.4, 8.2], [14.8, 12.2], [13.1, 13.1], [13.1, 16.2], [16.2, 19.2], [16.2, 21.4], [7.8, 21.4], [7.8, 19.2], [10.9, 16.2], [10.9, 13.1], [9.2, 12.2], [6.6, 8.2]]} {...CC} />
      <P p={[[6.6, 2.6], [12, 2.6], [12, 21.4], [7.8, 21.4], [7.8, 19.2], [10.9, 16.2], [10.9, 13.1], [9.2, 12.2], [6.6, 8.2]]} {...LT} />
    </>
  ),
  crown: (
    <>
      <P p={[[2.4, 7.4], [7.3, 12.1], [12, 3.4], [16.7, 12.1], [21.6, 7.4], [19.7, 18], [4.3, 18]]} {...CC} />
      <P p={[[12, 3.4], [16.7, 12.1], [12, 18], [7.3, 12.1]]} {...LT} />
      <P p={[[21.6, 7.4], [19.7, 18], [16.7, 12.1]]} {...DK} />
      <P p={[[4.3, 19.3], [19.7, 19.3], [19.7, 21.4], [4.3, 21.4]]} {...CC} />
    </>
  ),
  spark: (
    <>
      <P p={spark4} {...CC} />
      <P p={[[12, 1.4], [9.8, 9.8], [12, 12]]} {...LT} /><P p={[[1.4, 12], [9.8, 9.8], [12, 12]]} {...LT2} />
      <P p={[[22.6, 12], [14.2, 14.2], [12, 12]]} {...DK} /><P p={[[12, 22.6], [14.2, 14.2], [12, 12]]} {...LT2} />
    </>
  ),
  star: (
    <>
      <P p={star5} {...CC} />
      {[0, 2, 4, 6, 8].map((i) => <P key={i} p={[[12, 12.6], star5[i], star5[(i + 9) % 10]]} {...LT} />)}
    </>
  ),
  hourglass: (
    <>
      <P p={[[4.4, 1.8], [19.6, 1.8], [19.6, 3.8], [4.4, 3.8]]} {...CC} />
      <P p={[[4.4, 20.2], [19.6, 20.2], [19.6, 22.2], [4.4, 22.2]]} {...CC} />
      <P p={[[6.2, 4.6], [17.8, 4.6], [12, 11.4]]} fill="currentColor" fillOpacity=".36" />
      <P p={[[12, 12.6], [17.8, 19.4], [6.2, 19.4]]} fill="currentColor" fillOpacity=".36" />
      <P p={[[8.8, 6.6], [15.2, 6.6], [12, 10.4]]} {...CC} />
      <P p={[[12, 15], [16, 19.4], [8, 19.4]]} {...CC} />
    </>
  ),
};
/** Un glyphe plein ; retombe sur l'icône au trait s'il n'existe pas */
export function Glyph({ n, size = 22, className = "", fallback }) {
  const g = GL[n];
  if (!g) return fallback || null;
  return <svg className={"glyph " + className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{g}</svg>;
}
export const hasGlyph = (n) => !!GL[n];

// ═════════════════════════════════════════════════════════════
// Pièce d'or (à côté des chiffres de calories)
// ═════════════════════════════════════════════════════════════
export function Coin({ size = 16 }) {
  return (
    <svg className="coin" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ color: "#F2C66D" }}>
      {octRing(12, 12, 11, 7.6)}
      <P p={[[12, 7.4], [16.6, 12], [12, 16.6], [7.4, 12]]} fill="#F2C66D" />
      <P p={[[12, 7.4], [12, 16.6], [7.4, 12]]} fill="#FFF4D4" />
      <P p={[[12, 7.4], [16.6, 12], [12, 12]]} fill="#B8832C" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════
// Items de l'inventaire (48 × 48), dans leur médaillon
// ═════════════════════════════════════════════════════════════
const S2 = (a) => a.map(([x, y]) => [x * 2, y * 2]);
const vert48 = (cy, hw, hh = 2) => [[24 - hw, cy], [24 - hw + 2, cy - hh], [24 + hw - 2, cy - hh], [24 + hw, cy], [24 + hw - 2, cy + hh], [24 - hw + 2, cy + hh]];
const itemRays = rays(24, 24, 8, 12.4, [22, 17.6], [3.2, 2.5]);
export function ItemArt({ id, color = "#C8AA6E", size = 40, letter = "?" }) {
  const C = { fill: color };
  const art = {
    light: (
      <>
        {itemRays.map((r, i) => <g key={i}><P p={[r.b1, r.tip, r.b2]} {...C} /><P p={[r.b1, r.tip, r.mid]} {...LT} /></g>)}
        <P p={ngon(24, 24, 9.6, 8, Math.PI / 8)} {...C} />
        <P p={ngon(24, 24, 5.2, 8, Math.PI / 8)} fill="#fff" fillOpacity=".55" />
        <P p={halfOct(24, 24, 9.6)} {...LT2} />
      </>
    ),
    creatine: (
      <>
        <P p={[[10.5, 21], [15, 26], [14, 39], [9, 39], [7.4, 26]]} {...C} opacity=".78" />
        <P p={[[10.5, 21], [7.4, 26], [9, 39], [11, 39], [11, 26]]} {...LT} />
        <P p={[[37.5, 23], [40.6, 28], [39, 39], [34, 39], [33, 28]]} {...C} opacity=".78" />
        <P p={[[37.5, 23], [33, 28], [34, 39], [37, 39], [37, 28]]} {...LT} />
        <P p={[[24, 3.5], [31.8, 13], [29.2, 41], [24, 44.5], [18.8, 41], [16.2, 13]]} {...C} />
        <P p={[[24, 3.5], [16.2, 13], [24, 16.6]]} fill="#fff" fillOpacity=".6" />
        <P p={[[24, 3.5], [31.8, 13], [24, 16.6]]} fill="#fff" fillOpacity=".3" />
        <P p={[[16.2, 13], [24, 16.6], [24, 44.5], [18.8, 41]]} {...LT2} />
        <P p={[[31.8, 13], [29.2, 41], [24, 44.5], [24, 16.6]]} {...DK} />
      </>
    ),
    minox: (
      <>
        <P p={[[30.5, 3.5], [37.5, 3.5], [39, 5], [39, 10.6], [29, 10.6], [29, 5]]} {...C} />
        <P p={[[30.5, 3.5], [34, 3.5], [34, 10.6], [29, 10.6], [29, 5]]} {...LT} />
        <P p={[[32.4, 11.4], [35.6, 11.4], [35.6, 22], [34, 25.6], [32.4, 22]]} {...C} opacity=".7" />
        <P p={[[19, 17.5], [27, 28.5], [27, 33.5], [23, 38.5], [15, 38.5], [11, 33.5], [11, 28.5]]} {...C} />
        <P p={[[19, 17.5], [11, 28.5], [11, 33.5], [15, 38.5], [19, 38.5]]} {...LT} />
        <P p={[[27, 33.5], [23, 38.5], [19, 38.5], [19, 33.5]]} {...DK} />
      </>
    ),
    posture: (
      <>
        <P p={[[24, 2.5], [28.4, 6.9], [24, 11.3], [19.6, 6.9]]} {...C} />
        {[0, 1, 2, 3, 4, 5].map((k) => { const v = vert48(16 + k * 5.5, 9.4 - k * 0.75); return <g key={k}><P p={v} {...C} /><P p={[v[0], v[1], [24, v[1][1]], [24, v[5][1]], v[5]]} {...LT} /></g>; })}
      </>
    ),
    spf: (
      <>
        <P p={[[24, 3.5], [39.5, 9.5], [39.5, 24], [24, 44.5], [8.5, 24], [8.5, 9.5]]} {...C} />
        <P p={[[24, 3.5], [8.5, 9.5], [8.5, 24], [24, 44.5]]} {...LT} />
        <P p={ngon(24, 21, 5.4, 8, Math.PI / 8)} fill="#000" fillOpacity=".45" />
        {rays(24, 21, 8, 7.4, [11, 9.6], [1.3, 1.1]).map((r, i) => <P key={i} p={[r.b1, r.tip, r.b2]} fill="#000" fillOpacity=".45" />)}
      </>
    ),
    water: (
      <>
        <P p={S2([[10.2, 3.8], [13.8, 3.8], [13.8, 8.2], [19.4, 15.3], [19.4, 18.8], [16.2, 22.2], [7.8, 22.2], [4.6, 18.8], [4.6, 15.3], [10.2, 8.2]])} {...C} opacity=".34" />
        <P p={S2([[9.2, 1.6], [14.8, 1.6], [14.8, 3.9], [9.2, 3.9]])} {...C} />
        <P p={S2([[5.8, 14.6], [18.2, 14.6], [18.2, 18.4], [15.6, 21], [8.4, 21], [5.8, 18.4]])} {...C} />
        <P p={S2([[5.8, 14.6], [12, 14.6], [12, 21], [8.4, 21], [5.8, 18.4]])} {...LT} />
        <P p={S2([[13.4, 16.4], [15.4, 16.4], [14.4, 18.2]])} fill="#fff" fillOpacity=".7" />
      </>
    ),
    weigh: (
      <>
        <P p={[[24, 4], [27.6, 7.6], [24, 11.2], [20.4, 7.6]]} {...C} />
        <P p={[[6, 12.6], [42, 12.6], [42, 15.4], [6, 15.4]]} {...C} />
        <P p={[[22.6, 15.4], [25.4, 15.4], [25.4, 39], [22.6, 39]]} {...C} />
        <P p={[[14, 39], [34, 39], [31, 44], [17, 44]]} {...C} />
        <P p={[[14, 39], [24, 39], [24, 44], [17, 44]]} {...LT} />
        <path d="M10 15.4 4.4 28M10 15.4 15.6 28M38 15.4 32.4 28M38 15.4 43.6 28" stroke={color} strokeWidth="1.5" fill="none" opacity=".8" />
        <P p={[[2.6, 28], [17.4, 28], [14.4, 33], [5.6, 33]]} {...C} />
        <P p={[[30.6, 28], [45.4, 28], [42.4, 33], [33.6, 33]]} {...C} />
        <P p={[[2.6, 28], [10, 28], [10, 33], [5.6, 33]]} {...LT} />
        <P p={[[30.6, 28], [38, 28], [38, 33], [33.6, 33]]} {...LT} />
      </>
    ),
    rune: (
      <>
        <P p={[[24, 3], [42, 13.5], [42, 34.5], [24, 45], [6, 34.5], [6, 13.5]]} {...C} />
        <P p={[[24, 3], [6, 13.5], [6, 34.5], [24, 45]]} {...LT} />
        <P p={[[24, 8.6], [37.2, 16.3], [37.2, 31.7], [24, 39.4], [10.8, 31.7], [10.8, 16.3]]} fill="#0B0716" fillOpacity=".86" />
        <text x="24" y="30.4" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="900" fontSize="15.5" fill={color}>{String(letter || "?").slice(0, 1).toUpperCase()}</text>
      </>
    ),
  };
  return (
    <svg className="iart" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {art[id] || art.rune}
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════
// Emblème de rang : un écusson à facettes, plus d'ailes et de pointes en montant
// ═════════════════════════════════════════════════════════════
const BADGE = [[50, 8], [77, 23], [77, 58], [50, 91], [23, 58], [23, 23]];
const INNER = [[50, 18.5], [68.6, 28.8], [68.6, 53.6], [50, 79.6], [31.4, 53.6], [31.4, 28.8]];
const GEM = [[50, 30], [61, 50], [50, 70], [39, 50]];
const WING_A = [[23, 25], [2, 16], [8.5, 29.5], [0, 33.5], [13, 43], [23, 41.5]];
const WING_B = [[23, 46], [4, 50.5], [12.5, 59.5], [23, 57.5]];
export function Emblem({ tier = 0, size = 56, dim }) {
  const t = Math.max(0, Math.min(9, tier));
  const T = G.TIERS[t];
  const c1 = T.c1, c2 = T.c2;
  const pair = (a, props, k) => (
    <g key={k}><P p={a} {...props} /><P p={mirror(a, 100)} {...props} /></g>
  );
  return (
    <svg className={"emblem" + (dim ? " dim" : "")} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {t === 9 && Array.from({ length: 16 }, (_, i) => <P key={i} p={[[49, 50], [50, 1], [51, 50]]} fill={c1} opacity=".5" transform={`rotate(${i * 22.5} 50 50)`} />)}
      {t >= 2 && <>{pair(WING_A, { fill: c1 }, "wa")}{pair([[23, 33.5], [0, 33.5], [13, 43], [23, 41.5]], DK, "wad")}</>}
      {t >= 4 && <>{pair(WING_B, { fill: c1 }, "wb")}{pair([[23, 52], [4, 50.5], [12.5, 59.5], [23, 57.5]], DK, "wbd")}</>}
      {t >= 6 && <><P p={[[41, 14], [50, 0], [59, 14], [50, 9.5]]} fill={c1} /><P p={[[50, 0], [59, 14], [50, 9.5]]} {...DK} /></>}
      {t >= 7 && pair([[29.5, 20], [30, 5], [39, 15.5]], { fill: c1 }, "cr")}
      {t >= 3 && <><P p={[[42, 85], [50, 99], [58, 85]]} fill={c1} /><P p={[[50, 99], [58, 85], [50, 89]]} {...DK} /></>}
      {t >= 1 && pair([[23, 30], [15.5, 37.5], [23, 45]], { fill: c1 }, "nt")}
      <P p={BADGE} fill={c1} />
      <P p={[[50, 8], [77, 23], [77, 58], [50, 91]]} {...DK} />
      <P p={[[50, 8], [23, 23], [50, 18.5], [68.6, 28.8], [77, 23]]} fill="#fff" fillOpacity=".22" />
      <P p={INNER} fill={c2} />
      <P p={[[50, 18.5], [31.4, 28.8], [31.4, 53.6], [50, 79.6]]} fill="#fff" fillOpacity=".07" />
      <P p={GEM} fill={c1} />
      <P p={[[50, 30], [39, 50], [50, 50]]} fill="#fff" fillOpacity=".55" />
      <P p={[[39, 50], [50, 50], [50, 70]]} fill="#fff" fillOpacity=".2" />
      <P p={[[50, 30], [61, 50], [50, 50]]} fill="#fff" fillOpacity=".12" />
      <P p={[[61, 50], [50, 70], [50, 50]]} {...DK} />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════
// Les boss de la semaine : des masques à facettes
// ═════════════════════════════════════════════════════════════
const MASK = [[50, 15], [79, 28], [77, 60], [50, 93], [23, 60], [21, 28]];
const MASK_IN = [[50, 20.5], [74, 31.5], [72.3, 58], [50, 86.8], [27.7, 58], [26, 31.5]];
const HORN = [[33, 30], [13, 3], [24, 6.5], [42, 23.5]];
export function BossArt({ id = "meta", size = 64, dead }) {
  const u = uid();
  const red = "#E0283F";
  const eye = { meta: "#FF8A3D", estomac: "#5CFFB0", flemme: "#B9A6FF", veilleur: "#FFE27A" }[id] || "#FF5A6E";
  const slit = [[30, 49.5], [45, 54], [32.5, 57]];
  const eyes = {
    meta: <><P p={slit} fill={eye} /><P p={mirror(slit, 100)} fill={eye} /></>,
    estomac: <><P p={slit} fill={eye} /><P p={mirror(slit, 100)} fill={eye} /></>,
    flemme: <><P p={[[30.5, 53], [45, 53], [43, 57], [32.5, 57]]} fill={eye} /><P p={mirror([[30.5, 53], [45, 53], [43, 57], [32.5, 57]], 100)} fill={eye} /></>,
    veilleur: <><P p={[[38, 47.5], [43, 52.5], [38, 57.5], [33, 52.5]]} fill={eye} /><P p={[[62, 47.5], [67, 52.5], [62, 57.5], [57, 52.5]]} fill={eye} /><P p={[[50, 29], [55, 35], [50, 41], [45, 35]]} fill={eye} /></>,
  }[id] || null;
  const mark = {
    meta: (
      <>
        <P p={[[37, 18], [41, 5], [45.5, 13], [50, 0], [54.5, 13], [59, 5], [63, 18]]} fill="#FF7A3D" />
        <P p={[[50, 0], [54.5, 13], [59, 5], [63, 18], [50, 18]]} {...DK} />
        {[[37, 67], [45, 67], [53, 67]].map(([x, y], i) => <P key={i} p={[[x, y], [x + 5, y + 7], [x + 10, y]]} fill="#FF7A3D" />)}
      </>
    ),
    estomac: <path d="M35 70 40 65.5 45 71 50 65.5 55 71 60 65.5 65 70" fill="none" stroke="#EBD9C4" strokeWidth="2.6" strokeLinejoin="miter" />,
    flemme: (
      <>
        <path d="M68 11H80L68 23H80" fill="none" stroke={eye} strokeWidth="2.8" strokeLinejoin="miter" />
        <path d="M39 70 44.5 67 50 71 55.5 67 61 70" fill="none" stroke={eye} strokeWidth="2.4" strokeLinejoin="miter" />
      </>
    ),
    veilleur: (
      <>
        <path d="M80 4a9 9 0 1 0 9 12 7 7 0 1 1-9-12Z" fill={eye} opacity=".9" />
        <P p={[[45, 67], [50, 73], [55, 67]]} fill={eye} />
      </>
    ),
  }[id] || null;
  return (
    <svg className={"bossart" + (dead ? " dead" : "")} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs><filter id={"bg" + u} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.6" /></filter></defs>
      <P p={HORN} fill={red} /><P p={[[33, 30], [24, 6.5], [42, 23.5]]} {...DK} />
      <P p={mirror(HORN, 100)} fill={red} /><P p={mirror([[33, 30], [24, 6.5], [42, 23.5]], 100)} {...DK} />
      <P p={MASK} fill={red} />
      <P p={[[50, 15], [79, 28], [77, 60], [50, 93]]} {...DK} />
      <P p={MASK_IN} fill="#1C050B" />
      <P p={[[50, 20.5], [26, 31.5], [27.7, 58], [50, 86.8]]} fill="#fff" fillOpacity=".05" />
      <P p={[[29, 41], [50, 48.5], [71, 41], [71, 44.6], [50, 52.4], [29, 44.6]]} fill={red} />
      {mark}
      {eyes && <g filter={`url(#bg${u})`} opacity=".9">{eyes}</g>}
      {eyes}
    </svg>
  );
}
