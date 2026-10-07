"""Captures de la v3 à différentes heures de la journée, avec des données réalistes."""
import json, os, sys
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
URL = "file://" + os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else "../index.html")
P = timezone(timedelta(hours=8))
F = {  # valeurs pour 100 g (comme la base de l'app)
    "lait_entier": ("Lait entier (Full Cream)", 65, 3.3, 4.8, 3.4), "yaourt_grec": ("Yaourt grec (Farmers Union)", 127, 4.8, 5.5, 9.3),
    "avoine": ("Flocons d'avoine", 375, 12, 60, 8), "whey": ("Whey (Emerald Labs)", 400, 75, 9, 6), "creatine": ("Créatine", 0, 0, 0, 0),
    "beurre_cacahuete": ("Beurre de cacahuète", 610, 25, 13, 50), "mangue": ("Mangue (surgelée)", 60, 0.8, 15, 0.4), "banane": ("Banane", 89, 1.1, 23, 0.3),
    "riz_cuit": ("Riz blanc cuit", 130, 2.5, 28, 0.3), "beurre": ("Beurre", 717, 0.9, 0.1, 81), "boeuf_hache": ("Bœuf haché (cru)", 233, 20, 0, 17),
    "huile": ("Huile (olive / avocat)", 884, 0, 0, 100), "coca": ("Coca-Cola", 42, 0, 10.6, 0), "poulet": ("Poulet (filet, cru)", 120, 23, 0, 2.6),
    "pdt": ("Pommes de terre (crues)", 77, 2, 17, 0.1), "oignon": ("Oignon", 40, 1.1, 9, 0.1), "oeuf": ("Œuf", 143, 12.6, 0.7, 9.5),
}
def it(fid, g):
    n, k, p, c, f = F[fid]
    return {"name": n, "fid": fid, "g": g, "per": {"k": k, "p": p, "c": c, "f": f}}
def entry(i, t, label, items):
    return {"id": f"e{i}", "t": t, "label": label, "items": items}

PTIDEJ = [it("yaourt_grec", 150), it("avoine", 40), it("whey", 20), it("lait_entier", 150)]
MIDI = [it("riz_cuit", 160), it("beurre", 10), it("boeuf_hache", 120), it("huile", 14), it("coca", 375)]
SHAKER = [it("lait_entier", 196), it("yaourt_grec", 100), it("avoine", 90), it("whey", 20), it("creatine", 5), it("beurre_cacahuete", 27), it("mangue", 85)]
DINER = [it("pdt", 300), it("poulet", 200), it("oignon", 110), it("huile", 27), it("beurre", 10), it("oeuf", 50), it("yaourt_grec", 100)]

def iso(y, mo, d, h, mi):
    return datetime(y, mo, d, h, mi, tzinfo=P).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

BASE = {
    "iwt": {"2026-09-21": 51.2, "2026-09-28": 51.6, "2026-10-05": 52.1},
    "t2:day:2026-10-05": {"entries": [entry(1, "09:40", "Petit-déj", PTIDEJ), entry(2, "16:30", "Collation", SHAKER), entry(3, "20:30", "Dîner", DINER)], "water": 2, "h": {"light": True},
                           "sleep": {"bed": iso(2026, 10, 5, 2, 50), "wake": iso(2026, 10, 5, 10, 20), "lat": 15, "q": 3}},
    "t2:day:2026-10-06": {"entries": [entry(4, "11:00", "Petit-déj", PTIDEJ), entry(5, "17:00", "Collation", SHAKER), entry(6, "21:00", "Dîner", MIDI + [it("oeuf", 100)])], "water": 1.5, "h": {},
                           "sleep": {"bed": iso(2026, 10, 6, 2, 20), "wake": iso(2026, 10, 6, 10, 5), "lat": 15, "q": 4}},
    "t2:day:2026-10-07": {"entries": [entry(7, "09:50", "Petit-déj", PTIDEJ), entry(8, "14:18", "Déjeuner", MIDI), entry(9, "16:50", "Collation", SHAKER)], "water": 1, "h": {"light": True},
                           "sleep": {"bed": iso(2026, 10, 7, 1, 55), "wake": iso(2026, 10, 7, 9, 35), "lat": 15, "q": 3}},
}

SCENES = [
    # (nom, heure, extras localStorage, actions)
    ("a-soir", datetime(2026, 10, 7, 21, 30, tzinfo=P), {}, None),
    ("b-nuit-1h", datetime(2026, 10, 8, 0, 40, tzinfo=P), {"t2:day:2026-10-07": {**BASE["t2:day:2026-10-07"], "entries": BASE["t2:day:2026-10-07"]["entries"] + [entry(10, "21:40", "Dîner", DINER)]}}, None),
    ("c-matin-reveil", datetime(2026, 10, 8, 9, 50, tzinfo=P), {"t2:night": {"bed": iso(2026, 10, 8, 1, 40)}}, None),
    ("d-matin-lumiere", datetime(2026, 10, 8, 10, 5, tzinfo=P), {"t2:day:2026-10-08": {"entries": [], "water": 0, "h": {}, "sleep": {"bed": iso(2026, 10, 8, 1, 40), "wake": iso(2026, 10, 8, 9, 55), "lat": 15, "q": None}}}, None),
    ("e-midi-manger", datetime(2026, 10, 8, 14, 10, tzinfo=P), {"t2:day:2026-10-08": {"entries": [entry(11, "10:30", "Petit-déj", PTIDEJ)], "water": 0.5, "h": {"light": True}, "sleep": {"bed": iso(2026, 10, 8, 1, 40), "wake": iso(2026, 10, 8, 9, 55), "lat": 15, "q": 4}}}, None),
    ("f-dans-le-mille", datetime(2026, 10, 8, 22, 15, tzinfo=P), {"t2:day:2026-10-08": {"entries": [entry(12, "10:30", "Petit-déj", PTIDEJ), entry(13, "14:00", "Déjeuner", MIDI), entry(14, "17:00", "Collation", SHAKER), entry(15, "21:00", "Dîner", DINER)], "water": 2.5, "h": {"light": True, "skm": True, "sks": True}, "sleep": {"bed": iso(2026, 10, 7, 23, 50), "wake": iso(2026, 10, 8, 7, 50), "lat": 15, "q": 5}}}, None),
]

errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, when, extra, _ in SCENES:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, timezone_id="Australia/Perth", locale="fr-FR", has_touch=True, is_mobile=True)
        data = {**BASE, **extra}
        ctx.add_init_script("if(!sessionStorage.getItem('seed')){%s;sessionStorage.setItem('seed','1')}" % ";".join(f"localStorage.setItem({json.dumps(k)}, {json.dumps(json.dumps(v))})" for k, v in data.items()))
        page = ctx.new_page()
        page.on("pageerror", lambda e, n=name: errors.append(f"[{n}] pageerror: {e}"))
        page.on("console", lambda m, n=name: errors.append(f"[{n}] {m.type}: {m.text}") if m.type == "error" and "ERR_TUNNEL" not in m.text and "ERR_FILE_NOT_FOUND" not in m.text else None)
        page.route("https://api.open-meteo.com/**", lambda route: route.fulfill(status=200, headers={"access-control-allow-origin": "*", "content-type": "application/json"},
            body=json.dumps({"current": {"temperature_2m": 21.4, "weather_code": 1, "is_day": 1 if 6 <= when.hour < 19 else 0}, "daily": {"temperature_2m_max": [24.8], "temperature_2m_min": [12.1]}})))
        page.clock.install(time=when)
        page.goto(URL)
        page.wait_for_timeout(1600)
        page.screenshot(path=f"{OUT}/{name}.png")
        if name == "a-soir":
            page.screenshot(path=f"{OUT}/{name}-full.png", full_page=True)
            page.get_by_role("button", name="Ajouter un repas").first.click(); page.wait_for_timeout(500)
            page.screenshot(path=f"{OUT}/a2-ajout.png")
            page.get_by_role("button", name="Fermer").click(); page.wait_for_timeout(300)
            page.get_by_role("button", name="Manger").click(); page.wait_for_timeout(700)
            page.screenshot(path=f"{OUT}/a3-manger.png", full_page=True)
            page.get_by_role("button", name="Sport").click(); page.wait_for_timeout(600)
            page.screenshot(path=f"{OUT}/a4-sport.png", full_page=True)
            page.get_by_role("button", name="Progrès").click(); page.wait_for_timeout(600)
            page.screenshot(path=f"{OUT}/a5-progres.png", full_page=True)
            page.get_by_role("button", name="Poids").click(); page.wait_for_timeout(500)
            page.screenshot(path=f"{OUT}/a6-poids.png", full_page=True)
            page.get_by_role("button", name="Coach").click(); page.wait_for_timeout(500)
            page.screenshot(path=f"{OUT}/a7-coach.png")
        ctx.close()
    b.close()
print("\n".join(errors) if errors else "Aucune erreur.")
