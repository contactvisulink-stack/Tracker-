// Les pièces communes : en-tête, sections, barres de mesure, mini-courbes, états
import React from "react";
import * as L from "./lib.js";
import * as E from "./engine.js";
import { Icon } from "./ui.jsx";

export function Header({ ctx, title, sub }) {
  return (
    <header className="hdr">
      <div className="hdr-t">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="hdr-r">
        <button className="ib" onClick={() => ctx.open({ type: "coach" })} aria-label="Coach"><Icon n="chat" size={20} /></button>
        <button className="ib" onClick={() => ctx.open({ type: "settings" })} aria-label="Réglages"><Icon n="sliders" size={20} /></button>
      </div>
    </header>
  );
}

export function Sec({ code, title, right, onRight, children, className = "" }) {
  return (
    <section className={"sec " + className} aria-label={title}>
      <div className="sec-h">
        <h2>{code && <b>{code}</b>}{title}</h2>
        {right != null && (onRight ? <button className="sec-r" onClick={onRight}>{right}</button> : <span className="sec-r">{right}</span>)}
      </div>
      {children}
    </section>
  );
}

export const St = ({ s, label }) => <span className={"st " + s}><i className={"dot " + s} />{label ?? E.stName(s)}</span>;

/** Barre de mesure : valeur, repère (où tu devrais en être), projection en pointillés */
export function Bar({ v, max, mark, proj, tone = "", label, thin }) {
  const f = (x) => `${(L.clamp(max > 0 ? x / max : 0, 0, 1) * 100).toFixed(1)}%`;
  return (
    <div className={"bar " + tone + (thin ? " thin" : "")} role="img" aria-label={label || `${Math.round((v / max) * 100)} %`}>
      {proj != null && proj > v && <i className="bar-p" style={{ left: f(v), width: `calc(${f(proj)} - ${f(v)})` }} />}
      <i className="bar-f" style={{ width: f(v) }} />
      {mark != null && mark > 0 && mark < max && <i className="bar-m" style={{ left: f(mark) }} />}
    </div>
  );
}

/** Mini-courbe. values : nombres (null = trou). goal : ligne pointillée. */
export function Spark({ values, goal, color = "var(--acc)", h = 34, w = 140, bars, min: mn, max: mx, dots }) {
  const vs = values.filter((x) => x != null);
  if (!vs.length) return <svg className="spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" />;
  const lo = mn ?? Math.min(...vs, goal ?? Infinity), hi = mx ?? Math.max(...vs, goal ?? -Infinity);
  const span = hi - lo || 1;
  const X = (i) => (values.length === 1 ? w / 2 : (i / (values.length - 1)) * w);
  const Y = (v) => h - 2 - ((v - lo) / span) * (h - 4);
  if (bars) {
    const bw = w / values.length;
    return (
      <svg className="spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {goal != null && <line className="gd" x1="0" x2={w} y1={Y(goal)} y2={Y(goal)} />}
        {values.map((v, i) => v == null ? null : <rect key={i} x={i * bw + 1} y={Y(v)} width={Math.max(1, bw - 2)} height={h - Y(v)} rx="1" fill={typeof color === "function" ? color(v) : color} />)}
      </svg>
    );
  }
  const segs = [];
  let cur = [];
  values.forEach((v, i) => { if (v == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push([X(i), Y(v)]); });
  if (cur.length) segs.push(cur);
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {goal != null && <line className="gd" x1="0" x2={w} y1={Y(goal)} y2={Y(goal)} />}
      {segs.map((s, i) => <polyline key={i} className="ln" points={s.map((p) => p.join(",")).join(" ")} stroke={color} />)}
      {(dots || segs.some((s) => s.length === 1)) && values.map((v, i) => v == null ? null : <circle key={i} cx={X(i)} cy={Y(v)} r="2" fill={color} />)}
    </svg>
  );
}

export const lvl = (x) => (x == null ? "" : x >= 0.95 ? "l3" : x >= 0.8 ? "l2" : "l1");
export const sign = (x, d = 0) => `${x >= 0 ? "+" : "−"}${d ? L.fdec(Math.abs(x), d) : L.fint(Math.abs(x))}`;
export const shortDay = (k) => L.cap(L.fmtDay(k, { weekday: "short", day: "numeric", month: "short" })).replace(/\./g, "");
