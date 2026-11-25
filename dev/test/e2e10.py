"""Parcours complet de la v10 « Atelier » dans Chromium (iPhone, heure de Perth), 5 semaines de données réalistes, API Claude simulée."""
import json, re, os, sys
from datetime import datetime
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(__file__))
from seed8 import build, init_script, route_fonts, P

OUT = sys.argv[1]
URL = "file://" + os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else "../../index.html")
os.makedirs(OUT, exist_ok=True)
checks, errors = [], []
def ok(name, cond, extra=""):
    checks.append(("✅" if cond else "❌") + " " + name + (f" ({extra})" if extra else ""))

def api(route, request):
    if request.method == "OPTIONS":
        return route.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST"})
    body = json.loads(request.post_data)
    sysp = body.get("system", "")
    if "convertis" in sysp:
        text = json.dumps({"items": [{"name": "Kebab", "user_words": "kebab", "grams": 350, "food_id": "", "kcal_100g": 215, "protein_100g": 11, "carbs_100g": 22, "fat_100g": 9, "confidence": "moyenne"}], "note": ""})
    elif "TON RÔLE" in sysp:
        ok("le coach ne parle plus de LoL", "League of Legends" not in sysp and "gold" not in sysp.lower().replace("golden", ""))
        text = json.dumps({"reply": "Il te reste **1 000 kcal**.", "update_plan": False, "plan": {"summary": "", "bedtime": "", "training": "unchanged", "meals": []}})
    else:
        text = "ok"
    route.fulfill(status=200, headers={"access-control-allow-origin": "*", "content-type": "application/json"}, body=json.dumps({"content": [{"type": "text", "text": text}], "stop_reason": "end_turn"}))

K = "2026-11-03"
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, timezone_id="Australia/Perth", locale="fr-FR", has_touch=True, is_mobile=True)
    ctx.add_init_script(init_script(build(), {"iak": "sk-ant-test-0000"}))
    page = ctx.new_page(); route_fonts(page)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" and "ERR_" not in m.text else None)
    page.route("https://api.anthropic.com/**", api)
    page.clock.install(time=datetime(2026, 11, 3, 21, 30, tzinfo=P))
    page.goto(URL); page.wait_for_timeout(1200)
    store = lambda k: json.loads(page.evaluate(f"localStorage.getItem({json.dumps(k)})") or "null")
    day = lambda: store("t2:day:" + K) or {}
    keys = lambda: sorted(page.evaluate("Object.keys(localStorage)"))
    kcal = lambda d: sum(int(i["per"]["k"] * i["g"] / 100 + 0.5) for e in d.get("entries", []) for i in e["items"])
    role = lambda n: page.get_by_role("button", name=n, exact=True).first
    sw = lambda: page.evaluate("document.documentElement.scrollWidth")

    # 1) Données intactes à l'ouverture
    k0 = keys()
    ok("aucune donnée perdue à l'ouverture", all(k in k0 for k in ["t2:day:" + K, "t2:workouts", "t2:favs", "iwt"]) and len([k for k in k0 if k.startswith("t2:day:")]) >= 30, f"{len(k0)} clés")
    ok("plus rien du jeu à l'écran", page.locator(".islot, .poster, .bossc, .rankc, .kcard, .ann").count() == 0)

    # 2) Status
    ok("4 systèmes", page.locator(".sys").count() == 4)
    ok("une prochaine action", page.locator(".next").count() == 1, page.locator(".next-t").first.inner_text() if page.locator(".next-t").count() else "")
    t = page.locator(".sys .big b").first.inner_text()
    ok("carburant = total réel du jour", re.sub(r"\D", "", t) == str(kcal(day())), f"{t} vs {kcal(day())}")
    ok("pas de débordement horizontal (Status)", sw() <= 390, str(sw()))
    page.screenshot(path=f"{OUT}/1-status.png")

    # 3) Protocole : un appui coche, « Annuler » décoche
    was = bool(day().get("h", {}).get("minox"))
    page.locator(".chk", has_text="Minoxidil").click(); page.wait_for_timeout(300)
    ok("protocole : coché en un appui", bool(day().get("h", {}).get("minox")) != was)
    page.locator(".toast-undo").click(); page.wait_for_timeout(300)
    ok("protocole : annulé", bool(day().get("h", {}).get("minox")) == was)
    w0 = day().get("water", 0)
    page.locator(".chk.water").click(); page.wait_for_timeout(300)
    ok("eau +0,5 L", abs(day().get("water", 0) - w0 - 0.5) < 1e-6, str(day().get("water")))

    # 4) Console : plusieurs choses en une ligne
    n0, wt0, d0 = len(day().get("entries", [])), day().get("water", 0), day()
    page.locator(".cbar").click(); page.wait_for_timeout(400)
    ok("console ouverte avec le clavier", page.evaluate("document.activeElement && document.activeElement.tagName") == "TEXTAREA")
    page.keyboard.type("2 oeufs, 150 g riz cuit, créa, eau 1 l, poids 53,8", delay=3); page.wait_for_timeout(300)
    rows = page.locator(".cp-row").count()
    ok("aperçu : créatine, eau, pesée, repas", rows == 4, str(rows))
    ok("aperçu : 2 aliments du repas", page.locator(".cp-meal .item").count() == 2)
    ok("rien d'écrit avant de valider", len(day().get("entries", [])) == n0)
    page.locator(".sheet .item").nth(1).locator("input").fill("200"); page.wait_for_timeout(200)
    role("Valider (4)").click(); page.wait_for_timeout(400)
    d1 = day()
    ok("console : repas ajouté", len(d1.get("entries", [])) == n0 + 1 and len(d1["entries"][-1]["items"]) == 2 if d1["entries"][-1]["t"] >= "21" else len(d1.get("entries", [])) == n0 + 1)
    riz = [i for e in d1["entries"] for i in e["items"] if "riz" in i["name"].lower() and i["g"] == 200]
    ok("console : quantité corrigée gardée (200 g)", len(riz) >= 1)
    ok("console : eau +1 L", abs(d1.get("water", 0) - wt0 - 1) < 1e-6, str(d1.get("water")))
    ok("console : créatine cochée", d1.get("h", {}).get("creatine") is True)
    ok("console : pesée du jour", (store("iwt") or {}).get(K) == 53.8, str((store("iwt") or {}).get(K)))
    page.locator(".toast-undo").click(); page.wait_for_timeout(400)
    ok("un seul « Annuler » défait tout", len(day().get("entries", [])) == n0 and abs(day().get("water", 0) - wt0) < 1e-6 and (store("iwt") or {}).get(K) is None)

    # 5) Console : nuit, mode nuit, réveil
    page.locator(".cbar").click(); page.wait_for_timeout(300)
    page.keyboard.type("nuit 1h30 9h45"); page.wait_for_timeout(200)
    role("Valider").click(); page.wait_for_timeout(300)
    s = day().get("sleep") or {}
    ok("console : nuit 1h30 → 9h45", s.get("bed", "").endswith("T17:30:00.000Z") and s.get("wake", "").endswith("T01:45:00.000Z"), f"{s.get('bed')} {s.get('wake')}")
    page.locator(".cbar").click(); page.wait_for_timeout(300)
    page.keyboard.type("dodo"); role("Valider").click(); page.wait_for_timeout(600)
    ok("mode nuit lancé", store("t2:night") is not None and page.locator(".nightp").count() == 1)
    page.clock.run_for(8 * 3600 * 1000); page.wait_for_timeout(300)
    role("Je suis levé").click(); page.wait_for_timeout(400)
    ok("réveil : nuit enregistrée", store("t2:night") is None and store("t2:day:2026-11-04") and (store("t2:day:2026-11-04") or {}).get("sleep") is not None)
    page.clock.install(time=datetime(2026, 11, 3, 21, 40, tzinfo=P)); page.reload(); page.wait_for_timeout(900)

    # 6) Carburant
    role("Carburant").click(); page.wait_for_timeout(500)
    ok("journal : un bloc par repas", page.locator(".ml").count() == len(day().get("entries", [])), f"{page.locator('.ml').count()} / {len(day().get('entries', []))}")
    big = page.locator(".pnl .big b").first.inner_text()
    ok("total = somme des aliments", re.sub(r"\D", "", big) == str(kcal(day())), f"{big} vs {kcal(day())}")
    ok("pas de débordement horizontal (Carburant)", sw() <= 390, str(sw()))
    n0 = len(day().get("entries", []))
    if page.locator(".sg-p").count():
        page.locator(".sg-p").first.click(); page.wait_for_timeout(300)
        ok("suggestion ajoutée en un appui", len(day().get("entries", [])) == n0 + 1)
        page.locator(".toast-undo").click(); page.wait_for_timeout(300)
    else:
        ok("suggestions affichées", False)
    page.locator(".ml-h").first.click(); page.wait_for_timeout(300)
    g = page.locator(".ml .item input").first
    g.fill("300"); page.wait_for_timeout(300)
    ok("modifier les grammes d'un repas", day()["entries"][0]["items"][0]["g"] == 300)
    page.screenshot(path=f"{OUT}/2-carburant.png")

    # 7) Sport
    role("Sport").click(); page.wait_for_timeout(500)
    prog = store("t2:program")
    ok("forme du jour en %", re.search(r"\d+", page.locator(".pnl .big b").first.inner_text()) is not None)
    ok("3 séances A B C", page.locator(".ses button").count() == 3)
    ok("charges : une ligne par exercice", page.locator(".ex").count() >= 5, str(page.locator(".ex").count()))
    page.locator(".ex-h").first.click(); page.wait_for_timeout(300)
    ok("historique de l'exercice", page.locator(".ex-b .hist-row").count() >= 1)
    role("Importer une séance Hevy").click(); page.wait_for_timeout(300)
    page.locator(".sheet textarea").fill("Full body C\nLe mardi, nov. 03, 2026 à 5:02pm\n\nDéveloppé Épaules (Haltère)\nSérie 1: 12.5 kg x 12\nSérie 2: 12.5 kg x 12\nSérie 3: 12.5 kg x 12\n\n@hevyapp\nhttps://hevy.com/workout/test-c")
    page.wait_for_timeout(300)
    nw = len(store("t2:workouts") or [])
    role("Enregistrer la séance").click(); page.wait_for_timeout(500)
    ok("import Hevy", len(store("t2:workouts") or []) == nw + 1)
    ok("séance du jour marquée faite", page.locator(".ses-s.ok", has_text="Faite aujourd'hui").count() == 1)
    ok("pas de débordement horizontal (Sport)", sw() <= 390, str(sw()))
    page.get_by_role("tab", name="Mobilité et posture").click(); page.wait_for_timeout(300)
    page.locator(".mob-r").first.get_by_role("button", name="Tibias").click(); page.wait_for_timeout(300)
    ok("test de mobilité enregistré", (store("t2:mob") or {}).get("toes") == [{"k": K, "lv": 1}], str(store("t2:mob")))

    # 8) Analyse
    role("Analyse").click(); page.wait_for_timeout(600)
    ok("maintenance mesurée", page.locator(".formula").count() == 1)
    txt = page.locator(".formula").inner_text()
    nums = [int(re.sub(r"\D", "", x)) for x in re.findall(r"\d[\d  ]{2,}", txt)]
    ok("calcul affiché cohérent", len(nums) >= 2, txt.replace("\n", " "))
    kc0 = (store("t2:settings") or {}).get("kcal")
    btn = page.locator(".en-res .btn")
    if btn.count():
        want = int(re.sub(r"\D", "", btn.inner_text()))
        btn.click(); page.wait_for_timeout(300)
        ok("objectif changé seulement sur ton appui", (store("t2:settings") or {}).get("kcal") == want, str(want))
        page.locator(".toast-undo").click(); page.wait_for_timeout(300)
        ok("et annulable", (store("t2:settings") or {}).get("kcal") == kc0)
    ok("courbe de poids", page.locator("svg[aria-label='Courbe de poids']").count() == 1)
    ok("carte de régularité 5 × 35", page.locator(".heat-c i").count() == 5 * 35)
    ok("pas de débordement horizontal (Analyse)", sw() <= 390, str(sw()))

    # 9) Réglages : nouvelle habitude, puis la cocher depuis la console
    role("Réglages").click(); page.wait_for_timeout(300)
    page.get_by_placeholder("Anglais").fill("Anglais"); role("Ajouter au protocole").click(); page.wait_for_timeout(300)
    page.locator(".sheet .round-btn").click(); page.wait_for_timeout(300)
    page.locator(".cbar").click(); page.wait_for_timeout(300)
    page.keyboard.type("anglais"); page.wait_for_timeout(200)
    role("Valider").click(); page.wait_for_timeout(300)
    hid = [c["id"] for c in (store("t2:settings") or {}).get("customItems", []) if c["label"] == "Anglais"]
    ok("habitude perso cochée depuis la console", hid and day().get("h", {}).get(hid[0]) is True)

    # 10) Coach
    page.locator(".hdr .ib").first.click(); page.wait_for_timeout(300)
    page.locator(".sheet textarea").fill("Je mange quoi ?"); page.locator(".send").click(); page.wait_for_timeout(800)
    ok("coach répond", page.locator(".msg.assistant").count() >= 1)
    b.close()

print("\n".join(checks))
print(f"\n{sum(c.startswith('✅') for c in checks)}/{len(checks)} vérifications")
print("\n".join(errors) if errors else "Aucune erreur console.")
