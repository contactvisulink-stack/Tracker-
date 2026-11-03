import React, { useState, useEffect, useRef } from "react";
import * as L from "./lib.js";
import * as G from "./game.js";
import { PATCH } from "./content.js";
import { Sheet, Icon, buzz } from "./ui.jsx";
import { ItemArt } from "./hud.jsx";

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
      const res = await L.aiAgent(cleanHistory(nc), k, G.coachContext(k));
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
function Rituals({ S }) {
  const ids = L.activeRituals(S).map((r) => r.id);
  const all = L.allRituals(S);
  const toggle = (id) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    L.setSettings({ rituals: all.map((r) => r.id).filter((x) => next.includes(x)) });
  };
  return (
    <div className="rt-list">
      {all.map((r) => {
        const on = ids.includes(r.id);
        return (
          <button key={r.id} className={"toggle rt" + (on ? " on" : "")} onClick={() => toggle(r.id)} aria-pressed={on}>
            <span className="rt-l" style={{ "--rc": r.color }}><span className="rt-ic"><ItemArt id={r.art || r.id} color={r.color} size={30} letter={r.label} /></span><span className="rt-tx">{r.label}<small>{r.hint}</small></span></span>
            <span className="sw"><i /></span>
          </button>
        );
      })}
    </div>
  );
}

/** La forge : crée tes propres items à stacks */
const FORGE_COLORS = ["#C8AA6E", "#0AC8B9", "#4FB6FF", "#B97CFF", "#3DD68C", "#FF8A3D", "#E84057"];
function Forge({ S, say }) {
  const [name, setName] = useState("");
  const [hint, setHint] = useState("");
  const [color, setColor] = useState(FORGE_COLORS[1]);
  const mine = L.customItems(S);
  const create = () => {
    const n = name.trim();
    if (!n) return;
    const it = { id: "u_" + L.uid(), label: n.slice(0, 18), hint: hint.trim().slice(0, 60) || "Ton item perso", color, ic: "rune", art: "rune" };
    const ids = Array.isArray(S.rituals) ? S.rituals : L.DEFAULT_RITUALS;
    L.setSettings({ customItems: [...mine, it], rituals: [...ids, it.id] });
    setName(""); setHint("");
    say(`Item forgé : ${it.label}`);
  };
  const remove = (it) => {
    if (!window.confirm(`Détruire l'item « ${it.label} » ? Ses jours déjà cochés restent dans ton historique.`)) return;
    const ids = (Array.isArray(S.rituals) ? S.rituals : L.DEFAULT_RITUALS).filter((x) => x !== it.id);
    L.setSettings({ customItems: mine.filter((x) => x.id !== it.id), rituals: ids });
  };
  return (
    <div className="forge">
      {mine.map((it) => (
        <div key={it.id} className="forge-row">
          <ItemArt id="rune" color={it.color} size={30} letter={it.label} />
          <span className="rt-tx">{it.label}<small>{it.hint}</small></span>
          <button className="link small" onClick={() => remove(it)}>Détruire</button>
        </div>
      ))}
      <div className="grid2">
        <label className="field"><span>Nom de l'item</span><input className="inp" value={name} maxLength={18} onChange={(e) => setName(e.target.value)} placeholder="Anglais" /></label>
        <label className="field"><span>Ce qu'il faut faire</span><input className="inp" value={hint} maxLength={60} onChange={(e) => setHint(e.target.value)} placeholder="15 min par jour" /></label>
      </div>
      <div className="forge-c" role="radiogroup" aria-label="Couleur de l'item">
        {FORGE_COLORS.map((c) => <button key={c} role="radio" aria-checked={color === c} className={color === c ? "on" : ""} style={{ "--c": c }} onClick={() => setColor(c)} aria-label={`Couleur ${c}`} />)}
        <span className="forge-prev"><ItemArt id="rune" color={color} size={34} letter={name || "?"} /></span>
      </div>
      <button className="cta ghost full" disabled={!name.trim()} onClick={create}>Forger l'item</button>
    </div>
  );
}

function Skins({ S, todayK, say }) {
  const acc = G.account(todayK), rk = G.rank();
  const cur = S.skin || "hextech";
  return (
    <div className="skins">
      {G.SKINS.map((s) => {
        const ok = G.skinOk(s, acc, rk);
        return (
          <button key={s.id} className={"skin s-" + s.id + (cur === s.id ? " on" : "") + (ok ? "" : " locked")} disabled={!ok}
            onClick={() => { L.setSettings({ skin: s.id }); say(`Skin : ${s.n}`); }} aria-pressed={cur === s.id}>
            <span className="skin-sw" aria-hidden="true"><i /><i /><i /></span>
            <span className="skin-n">{s.n}</span>
            <span className="skin-d">{ok ? s.d : <><Icon n="lock" size={11} sw={2.4} /> {G.skinReq(s)}</>}</span>
          </button>
        );
      })}
    </div>
  );
}
function Toggle({ on, label, sub, onClick }) {
  return (
    <button className={"toggle rt" + (on ? " on" : "")} onClick={onClick} aria-pressed={on}>
      <span className="rt-tx">{label}<small>{sub}</small></span>
      <span className="sw"><i /></span>
    </button>
  );
}
function RankStart({ S }) {
  const first = L.weightList()[0];
  const [v, setV] = useState(Number.isFinite(S.rankStart) ? String(S.rankStart).replace(".", ",") : "");
  return (
    <label className="field"><span>Poids de départ du classement (Fer IV)</span>
      <div className="gram wide">
        <input inputMode="decimal" value={v} placeholder={first ? `${String(first[1]).replace(".", ",")}, ta première pesée` : "ta première pesée"} onChange={(e) => setV(e.target.value)}
          onBlur={() => { const n = L.num(v); if (n != null && n > 20 && n < S.goalW) L.setSettings({ rankStart: n }); else { L.setSettings({ rankStart: null }); setV(""); } }} />
        <span>kg</span>
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
  const [pseudo, setPseudo] = useState(S.pseudo || "Isma");
  return (
    <Sheet title="Page de runes" onClose={ctx.close} tall>
      {msg && <div className="note">{msg}</div>}
      <div className="sub-h">Ton invocateur</div>
      <label className="field"><span>Pseudo</span>
        <input className="inp" value={pseudo} maxLength={16} onChange={(e) => setPseudo(e.target.value)} onBlur={() => L.setSettings({ pseudo: pseudo.trim() || "Isma" })} />
      </label>

      <div className="sub-h mt18">Skins</div>
      <Skins S={S} todayK={ctx.todayK} say={ctx.say} />

      <div className="sub-h mt18">Ambiance</div>
      <Toggle on={S.sfx !== false} label="Bruitages" sub="Gold, kills, niveaux. Muets si ton téléphone est en silencieux." onClick={() => L.setSettings({ sfx: S.sfx === false })} />
      <Toggle on={!!S.voice} label="Annonceur vocal" sub="La voix du téléphone annonce les kills et les boss." onClick={() => L.setSettings({ voice: !S.voice })} />
      <Toggle on={S.loading !== false} label="Écran de chargement" sub="Ton match du jour, une fois par jour." onClick={() => L.setSettings({ loading: S.loading === false })} />

      <div className="sub-h mt18">Clé API Claude</div>
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
        <NumField S={S} k="goalW" label="Poids visé (Challenger)" unit="kg" />
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

      <RankStart S={S} />

      <div className="sub-h mt18">Inventaire</div>
      <p className="hint mb10">Les items que tu fais chaque jour. Chacun gagne 1 stack par jour fait et en perd 1 par jour raté.</p>
      <Rituals S={S} />
      <div className="sub-h mt18">La forge</div>
      <p className="hint mb10">Crée tes propres items à stacks : anglais, lecture, étirements…</p>
      <Forge S={S} say={ctx.say} />

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
      <div className="cta-row mt18">
        <button className="cta ghost" onClick={() => ctx.open({ type: "patch" })}>Notes de patch</button>
        <button className="cta ghost" onClick={() => ctx.open({ type: "codex" })}>Codex</button>
      </div>
      <p className="hint center mt18">Isma Daily, patch {PATCH.v} « {PATCH.n} », {PATCH.date}</p>
    </Sheet>
  );
}
