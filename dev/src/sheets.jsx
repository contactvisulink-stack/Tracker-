import React, { useState, useEffect, useRef } from "react";
import * as L from "./lib.js";
import { Sheet, Icon, buzz } from "./ui.jsx";

const { fH } = L;

// ═════════════════════════════════════════════════════════════
// Ma nuit
// ═════════════════════════════════════════════════════════════
export function SleepEdit({ ctx, k }) {
  const d = L.getDay(k), s = d.sleep;
  const [bed, setBed] = useState(s?.bed ? L.hm(s.bed) : "01:30");
  const [wake, setWake] = useState(s?.wake ? L.hm(s.wake) : "09:30");
  const [lat, setLat] = useState(String(s?.lat ?? ctx.S.lat));
  const [q, setQ] = useState(s?.q || null);
  const n = bed && wake ? L.nightFromTimes(k, bed, wake) : null;
  const h = n ? L.sleepHours({ ...n, lat: L.num(lat) ?? ctx.S.lat }) : null;
  const save = () => {
    if (!n) return;
    const undo = L.snapDay(k);
    L.updDay(k, (dd) => ({ ...dd, sleep: { ...n, lat: L.num(lat) ?? ctx.S.lat, q } }));
    buzz(12);
    ctx.say(`Nuit enregistrée : ${fH(h)}`, { undo });
    ctx.close();
  };
  const remove = () => { const undo = L.snapDay(k); L.updDay(k, (dd) => { const x = { ...dd }; delete x.sleep; return x; }); ctx.say("Nuit supprimée", { undo }); ctx.close(); };
  return (
    <Sheet title="Ma nuit" onClose={ctx.close}
      footer={<div className="cta-row">
        {s && <button className="cta ghost" onClick={remove}>Supprimer</button>}
        <button className="cta moon" disabled={!n} onClick={save}>Enregistrer{h != null ? ` · ${fH(h)}` : ""}</button>
      </div>}>
      <p className="muted mb10">Nuit du {L.fmtDay(L.addDays(k, -1), { weekday: "long", day: "numeric" })} au {L.fmtDay(k, { weekday: "long", day: "numeric", month: "long" })}</p>
      <div className="grid2">
        <label className="field"><span>Téléphone posé à</span><input className="inp" type="time" value={bed} onChange={(e) => setBed(e.target.value)} /></label>
        <label className="field"><span>Levé à</span><input className="inp" type="time" value={wake} onChange={(e) => setWake(e.target.value)} /></label>
      </div>
      <label className="field"><span>Minutes pour t'endormir</span><input className="inp" inputMode="numeric" value={lat} onChange={(e) => setLat(e.target.value)} /></label>
      <div className="sub-h">Ton énergie au réveil</div>
      <div className="energy">
        {["😵", "😪", "😐", "🙂", "😄"].map((e, i) => <button key={i} className={q === i + 1 ? "on" : ""} onClick={() => setQ(i + 1)} aria-label={`Énergie ${i + 1} sur 5`}>{e}</button>)}
      </div>
    </Sheet>
  );
}

// ═════════════════════════════════════════════════════════════
// Coach
// ═════════════════════════════════════════════════════════════
const SUGG = [
  "Qu'est-ce que je mange maintenant pour finir mes calories ?",
  "Analyse ma dernière séance",
  "Comment avancer mon heure de coucher ?",
  "J'ai pas faim aujourd'hui, je fais comment ?",
].map((s) => s.replace(/ \?$/, " ?"));
function cleanHistory(chat) {
  const msgs = chat.filter((m) => !m.err).slice(-12);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  const out = [];
  msgs.forEach((m) => { if (out.length && out[out.length - 1].role === m.role) out[out.length - 1] = { role: m.role, content: out[out.length - 1].content + "\n\n" + m.content }; else out.push({ role: m.role, content: m.content }); });
  return out;
}
function Rich({ text }) {
  return String(text).split("\n").map((line, i) => {
    const bullet = /^\s*[-•*]\s+/.test(line);
    const clean = line.replace(/^\s*[-•*]\s+/, "").replace(/^#+\s*/, "");
    const parts = clean.split(/\*\*(.+?)\*\*/g).map((t, j) => (j % 2 ? <b key={j}>{t}</b> : t));
    return <React.Fragment key={i}>{i > 0 && "\n"}{bullet ? "• " : ""}{parts}</React.Fragment>;
  });
}
const AGENT_CHIPS = ["Ce soir je sors", "Je bosse ce soir", "Je me suis levé tard", "J'ai pas faim", "Pas de salle aujourd'hui", "Qu'est-ce que je mange maintenant\u00a0?"];
export function Coach({ ctx, ask }) {
  const chat = L.store.get("chat", []);
  const [inp, setInp] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef();
  const hasKey = !!L.getApiKey();
  const sent = useRef(false);
  const k = ctx.todayK;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [chat.length, busy]);
  const send = async (txt) => {
    const m = (txt ?? inp).trim();
    if (!m || busy) return;
    const nc = [...chat, { role: "user", content: m }];
    L.store.set("chat", nc.slice(-40));
    setInp(""); setBusy(true);
    try {
      const res = await L.aiAgent(cleanHistory(nc), k);
      const undo = L.applyAgentPlan(k, res, m);
      const msg = { role: "assistant", content: res.reply || "…" };
      if (undo) msg.plan = { k, summary: res.plan.summary || "Journée réorganisée" };
      L.store.set("chat", [...nc, msg].slice(-40));
      if (undo) ctx.say("Ta journée est réorganisée", { undo });
    } catch (e) { L.store.set("chat", [...nc, { role: "assistant", content: e.message, err: true }].slice(-40)); }
    setBusy(false);
  };
  useEffect(() => { if (ask && !sent.current && hasKey) { sent.current = true; send(ask); } }, []);
  const plan = L.getPlan(k);
  return (
    <Sheet title="Ton coach" onClose={ctx.close} tall
      footer={<div className="composer">
        <textarea className="inp" rows={1} value={inp} onChange={(e) => setInp(e.target.value)} placeholder={plan ? "Autre chose qui change ?" : "Ce soir je sors jusqu'à 2 h…"}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); send(); } }} />
        <button className="send" disabled={!inp.trim() || busy || !hasKey} onClick={() => send()} aria-label="Envoyer"><Icon n="right" size={20} sw={2.4} /></button>
      </div>}>
      {!hasKey && <div className="err">Le coach a besoin de ta clé API, dans Réglages.</div>}
      {!chat.length && <p className="muted mb10">Dis-lui ce qui change aujourd'hui : il réorganise tes repas, ton heure de coucher et ta séance. Tu peux aussi lui poser n'importe quelle question.</p>}
      <div className="chat">
        {chat.map((m, i) => (
          <React.Fragment key={i}>
            <div className={"msg " + m.role + (m.err ? " err" : "")}>{m.role === "assistant" ? <Rich text={m.content} /> : m.content}</div>
            {m.plan && (
              <div className="plan-chip">
                <span>📋 {m.plan.summary}</span>
                {m.plan.k === k && L.getPlan(k) && i === chat.map((x) => !!x.plan).lastIndexOf(true) && <button className="link small" onClick={ctx.close}>Voir sur l'accueil</button>}
              </div>
            )}
          </React.Fragment>
        ))}
        {busy && <div className="msg assistant typing"><i /><i /><i /></div>}
        <div ref={endRef} />
      </div>
      <div className="agent-chips mt10">
        {AGENT_CHIPS.map((c) => <button key={c} className="chip" disabled={busy || !hasKey} onClick={() => send(c)}>{c}</button>)}
      </div>
      {chat.length > 0 && <div className="center mt10"><button className="link" onClick={() => { const undo = L.snapKey("chat"); L.store.set("chat", []); ctx.say("Conversation effacée", { undo }); }}>Effacer la conversation</button></div>}
    </Sheet>
  );
}

// ═════════════════════════════════════════════════════════════
// Réglages
// ═════════════════════════════════════════════════════════════
function NumField({ S, k, label, unit }) {
  const [v, setV] = useState(String(S[k]).replace(".", ","));
  return (
    <label className="field"><span>{label}</span>
      <div className="gram wide">
        <input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)}
          onBlur={() => { const n = L.num(v); if (n != null && n > 0) L.setSettings({ [k]: n }); else setV(String(S[k]).replace(".", ",")); }} />
        <span>{unit}</span>
      </div>
    </label>
  );
}
export function Settings({ ctx }) {
  const S = ctx.S;
  const cur = L.getApiKey();
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [restore, setRestore] = useState("");
  const [msg, setMsg] = useState("");
  const saveKey = () => {
    const k = key.trim();
    if (!k.startsWith("sk-ant-")) { setMsg("La clé commence par sk-ant-"); return; }
    L.setApiKey(k); setKey(""); setMsg("Clé enregistrée sur ce téléphone.");
  };
  const fileRef = useRef();
  const lastB = L.store.get("lastBackup", null);
  const saveFile = async () => {
    try { const r = await L.saveBackupFile(); if (r !== "cancel") setMsg("Sauvegarde créée. Range-la dans Fichiers ou iCloud Drive."); }
    catch { setMsg("Impossible de créer le fichier. Utilise « Copier le texte »."); }
  };
  const copyBackup = async () => {
    const data = L.exportData();
    try { await navigator.clipboard.writeText(data); setMsg("Sauvegarde copiée. Colle-la dans tes notes."); }
    catch { setRestore(data); setMsg("Copie impossible : la sauvegarde est dans la case du dessous, copie-la à la main."); }
  };
  const doRestore = () => {
    try { L.importData(restore.trim()); setRestore(""); setMsg("Données restaurées."); }
    catch (e) { setMsg(e.message || "Sauvegarde illisible."); }
  };
  const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  return (
    <Sheet title="Réglages" onClose={ctx.close} tall>
      {msg && <div className="note">{msg}</div>}
      <div className="sub-h">Clé API Claude</div>
      <p className="hint mb10">Pour la photo, l'étiquette, les textes non reconnus et le coach. Tout le reste marche sans.</p>
      {cur && (
        <div className="row-between mb10">
          <span className="muted">Clé enregistrée, finit par {cur.slice(-4)}</span>
          <button className="link" onClick={() => { const undo = L.snapKey("iak", true); L.setApiKey(""); ctx.say("Clé retirée", { undo }); }}>Retirer</button>
        </div>
      )}
      <div className="cta-row mb18">
        <input className="inp" type={showKey ? "text" : "password"} value={key} onChange={(e) => setKey(e.target.value)} placeholder={cur ? "Remplacer la clé" : "sk-ant-…"} autoComplete="off" />
        <button className="cta ghost shrink" onClick={() => setShowKey(!showKey)}>{showKey ? "Cacher" : "Voir"}</button>
        <button className="cta sun shrink" disabled={!key.trim()} onClick={saveKey}>OK</button>
      </div>

      <div className="sub-h">Objectifs</div>
      <div className="grid2">
        <NumField S={S} k="kcal" label="Calories par jour" unit="kcal" />
        <NumField S={S} k="prot" label="Protéines par jour" unit="g" />
        <NumField S={S} k="sleep" label="Sommeil visé" unit="h" />
        <NumField S={S} k="water" label="Eau par jour" unit="L" />
        <NumField S={S} k="goalW" label="Poids visé" unit="kg" />
        <NumField S={S} k="lat" label="Temps pour t'endormir" unit="min" />
      </div>
      <label className="field"><span>Jour de pesée</span>
        <select className="inp" value={S.weighDay} onChange={(e) => L.setSettings({ weighDay: +e.target.value })}>
          {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </label>
      <label className="field"><span>La journée change à</span>
        <select className="inp" value={S.dayStart} onChange={(e) => L.setSettings({ dayStart: +e.target.value })}>
          {[0, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{h === 0 ? "minuit" : `${h} h du matin`}{h === 5 ? " (conseillé)" : ""}</option>)}
        </select>
      </label>

      <div className="sub-h mt18">Sauvegarde</div>
      <p className="hint mb10">Tes données restent sur ce téléphone. Copie une sauvegarde de temps en temps (sans la clé API).</p>
      <button className="cta sun full" onClick={saveFile}>Enregistrer une sauvegarde (Fichiers, iCloud)</button>
      <p className="hint mb10">{lastB ? `Dernière sauvegarde : ${L.fmtDay(L.dkey(new Date(lastB)), { day: "numeric", month: "long" })}.` : "Aucune sauvegarde encore."} Pour restaurer, choisis le fichier ou colle le texte.</p>
      <div className="cta-row mb10">
        <button className="cta ghost" onClick={copyBackup}>Copier le texte</button>
        <button className="cta ghost" onClick={() => fileRef.current?.click()}>Ouvrir un fichier</button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json,text/plain" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { setRestore(await f.text()); setMsg("Fichier chargé : touche « Restaurer cette sauvegarde »."); } catch { setMsg("Fichier illisible."); } }} />
      <textarea className="inp mt10" style={{ minHeight: 70 }} value={restore} onChange={(e) => setRestore(e.target.value)} placeholder="Pour restaurer : colle une sauvegarde ici" />
      {restore.trim() && <button className="cta ghost full mt8" onClick={doRestore}>Restaurer cette sauvegarde</button>}
      <p className="hint center mt18">Isma Daily, version 5 · octobre 2026</p>
    </Sheet>
  );
}
