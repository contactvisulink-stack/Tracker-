"""Données réalistes sur 5 semaines (1er oct. → 3 nov. 2026) pour tester le patch 8, et polices locales."""
import json, os, random
from datetime import datetime, timezone, timedelta, date

P = timezone(timedelta(hours=8))
F = {  # valeurs pour 100 g (comme la base de l'app)
    "lait_entier": ("Lait entier (Full Cream)", 65, 3.3, 4.8, 3.4), "yaourt_grec": ("Yaourt grec (Farmers Union)", 127, 4.8, 5.5, 9.3),
    "avoine": ("Flocons d'avoine", 375, 12, 60, 8), "whey": ("Whey (Emerald Labs)", 400, 75, 9, 6), "creatine": ("Créatine", 0, 0, 0, 0),
    "beurre_cacahuete": ("Beurre de cacahuète", 610, 25, 13, 50), "mangue": ("Mangue (surgelée)", 60, 0.8, 15, 0.4), "banane": ("Banane", 89, 1.1, 23, 0.3),
    "riz_cuit": ("Riz blanc cuit", 130, 2.5, 28, 0.3), "beurre": ("Beurre", 717, 0.9, 0.1, 81), "boeuf_hache": ("Bœuf haché (cru)", 233, 20, 0, 17),
    "huile": ("Huile (olive / avocat)", 884, 0, 0, 100), "coca": ("Coca-Cola", 42, 0, 10.6, 0), "poulet": ("Poulet (filet, cru)", 120, 23, 0, 2.6),
    "pdt": ("Pommes de terre (crues)", 77, 2, 17, 0.1), "oignon": ("Oignon", 40, 1.1, 9, 0.1), "oeuf": ("Œuf", 143, 12.6, 0.7, 9.5),
    "pates": ("Pâtes (crues)", 355, 12.5, 71, 1.5), "legumes": ("Légumes surgelés (mélange)", 60, 3, 9, 0.5), "wrap": ("Wrap / tortilla", 300, 8.5, 50, 7),
    "thon": ("Thon en boîte (au naturel)", 110, 25, 0, 1), "fromage": ("Fromage (cheddar)", 400, 25, 0.5, 33), "pain_mie": ("Pain de mie", 250, 8.5, 46, 3),
}
def it(fid, g):
    n, k, p, c, f = F[fid]
    return {"name": n, "fid": fid, "g": g, "per": {"k": k, "p": p, "c": c, "f": f}}
def iso(d, h, mi, add=0):
    x = datetime(d.year, d.month, d.day, h, mi, tzinfo=P) + timedelta(days=add)
    return x.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

PTIDEJ = [it("yaourt_grec", 150), it("avoine", 40), it("whey", 20), it("lait_entier", 150)]
MIDI = [it("riz_cuit", 220), it("beurre", 10), it("boeuf_hache", 150), it("huile", 14), it("coca", 375)]
SHAKER = [it("lait_entier", 300), it("yaourt_grec", 100), it("avoine", 90), it("whey", 30), it("creatine", 5), it("beurre_cacahuete", 27), it("mangue", 85)]
DINER = [it("pdt", 350), it("poulet", 220), it("oignon", 110), it("huile", 27), it("beurre", 10), it("oeuf", 50), it("yaourt_grec", 100)]
PATES = [it("pates", 140), it("poulet", 200), it("legumes", 120), it("huile", 14), it("fromage", 30)]
WRAPS = [it("wrap", 120), it("thon", 95), it("fromage", 40), it("legumes", 80)]
NUIT = [it("pain_mie", 70), it("beurre_cacahuete", 32), it("banane", 120), it("lait_entier", 250)]

def build(today=date(2026, 11, 3), seed=7):
    rnd = random.Random(seed)
    data = {}
    start = date(2026, 10, 1)
    d = start
    while d <= today:
        k = d.isoformat()
        is_today = d == today
        n = (d - start).days
        miss = d in (date(2026, 10, 9), date(2026, 10, 18), date(2026, 10, 19), date(2026, 10, 27))  # jours ratés
        entries = []
        def add(t, label, items):
            entries.append({"id": f"e{k}{len(entries)}", "t": t, "label": label, "items": items})
        add(f"{9 + rnd.randint(0, 1)}:{rnd.choice(['10', '35', '50'])}", "Petit-déj", PTIDEJ)
        if not miss:
            add("13:40", "Déjeuner", rnd.choice([MIDI, PATES, WRAPS]))
            add("16:45", "Collation", SHAKER)
            if not is_today: add("20:30", "Dîner", rnd.choice([DINER, PATES, MIDI]))
            if not is_today and n % 3 == 0: add("23:40", "Encas de nuit", NUIT)
        else:
            add("18:30", "Dîner", WRAPS)
        h = {"light": rnd.random() < 0.6, "minox": rnd.random() < 0.85 and not miss, "posture": rnd.random() < 0.5 and not miss}
        if not miss and not any(i["fid"] == "creatine" for e in entries for i in e["items"]):
            h["creatine"] = True
        bed_h = rnd.choice([0, 1, 1, 2, 2, 23]) ; bed_m = rnd.choice([10, 30, 50])
        add_day = 0 if bed_h < 12 else -1
        sleep = {"bed": iso(d, bed_h, bed_m, add_day), "wake": iso(d, 9 + rnd.randint(0, 1), rnd.choice([0, 20, 40])), "lat": 15, "q": rnd.randint(2, 5)}
        data[f"t2:day:{k}"] = {"entries": entries, "water": rnd.choice([1, 1.5, 2, 2.5, 3]) if not is_today else 1.5, "h": h, "sleep": sleep}
        d += timedelta(days=1)
    # séances : lundi, mercredi, vendredi (une semaine à 2)
    ws, prog = [], {"A": [("Développé Couché (Barre)", "bench", 40, 2.5), ("Squat Smith", "smith", 40, 5), ("Tirage Poitrine (Poulie)", "latpd", 35, 2.5)],
                    "B": [("Rowing Haltère", "dbrow", 17.5, 2.5), ("Presse à Cuisses", "legpress", 60, 5), ("Curl Biceps (Haltère)", "curl", 10, 1)],
                    "C": [("Développé Épaules (Haltère)", "dbohp", 10, 2.5), ("Rowing Poulie Assis Prise V", "seatedrow", 30, 2.5), ("Curl Pupitre", "preacher", 15, 2.5)]}
    seq, i, d = ["A", "B", "C"], 0, start
    while d <= today:
        if d.weekday() in (0, 2, 4) and d != date(2026, 10, 17) and d < today:
            s = seq[i % 3]; lvl = i // 3
            exs = [{"name": nm, "key": key, "sets": [{"w": w0 + inc * (lvl // 2), "r": 8 + (lvl % 2) * 2}, {"w": w0 + inc * (lvl // 2), "r": 8 + (lvl % 2) * 2}, {"w": w0 + inc * (lvl // 2), "r": 7 + (lvl % 3)}]} for nm, key, w0, inc in prog[s]]
            ws.append({"id": f"w{i}", "date": f"{d.isoformat()}T17:30:00", "title": f"Full body {s}", "session": s, "exercises": exs})
            i += 1
        d += timedelta(days=1)
    data["t2:workouts"] = ws
    data["iwt"] = {"2026-09-21": 51.2, "2026-09-28": 51.6, "2026-10-05": 52.1, "2026-10-12": 52.5, "2026-10-19": 52.3, "2026-10-26": 52.9, "2026-11-02": 53.4}
    data["t2:settings"] = {"kcal": 3200, "prot": 110, "water": 2.5, "sleep": 7.5, "goalW": 76, "weighDay": 1, "lat": 15, "dayStart": 5, "rituals": ["light", "creatine", "minox", "posture"]}
    data["t2:migrated"] = True; data["t2:seeded"] = True
    data["t2:favs"] = [{"id": "fav-shaker", "name": "Shaker avoine-cacahuète", "items": SHAKER}, {"id": "fav-ptidej", "name": "Bol yaourt-avoine-whey", "items": PTIDEJ}, {"id": "fav-pates", "name": "Pâtes crémeuses poulet", "items": PATES}, {"id": "fav-nuit", "name": "Tartines de nuit", "items": NUIT}]
    return data

def init_script(data, extra=None):
    allv = {**data, **(extra or {})}
    js = ";".join(f"localStorage.setItem({json.dumps(k)}, {json.dumps(json.dumps(v))})" for k, v in allv.items())
    return "if(!sessionStorage.getItem('seed')){%s;sessionStorage.setItem('seed','1')}" % js

FONTS = "/tmp/claude-0/-home-claude/15ed4486-db3f-5145-8af9-fdd49c36e61b/scratchpad/fonts/node_modules/@fontsource"
def route_fonts(page):
    faces = []
    for fam, pkg, weights in (("Cinzel", "cinzel", (700, 800, 900)), ("Barlow", "barlow", (400, 500, 600)), ("Barlow Semi Condensed", "barlow-semi-condensed", (500, 600, 700))):
        for w in weights:
            faces.append(f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:normal;src:url(https://fonts.gstatic.com/l/{pkg}-latin-{w}-normal.woff2) format('woff2');}}")
            faces.append(f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:normal;unicode-range:U+0100-024F;src:url(https://fonts.gstatic.com/l/{pkg}-latin-ext-{w}-normal.woff2) format('woff2');}}")
    css = "\n".join(faces)
    page.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, headers={"content-type": "text/css", "access-control-allow-origin": "*"}, body=css))
    def gs(r):
        name = r.request.url.rsplit("/", 1)[-1]
        pkg = name.split("-latin")[0]
        path = os.path.join(FONTS, pkg, "files", name)
        if os.path.exists(path):
            r.fulfill(status=200, headers={"content-type": "font/woff2", "access-control-allow-origin": "*"}, body=open(path, "rb").read())
        else:
            r.fulfill(status=404, body="")
    page.route("https://fonts.gstatic.com/**", gs)
