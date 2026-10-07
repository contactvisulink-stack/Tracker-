"""Test de bout en bout dans Chromium, taille iPhone, fuseau de Perth."""
import json, sys, os
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright

OUT = sys.argv[1] if len(sys.argv) > 1 else "shots"
os.makedirs(OUT, exist_ok=True)
URL = "file://" + os.path.abspath("../index.html")
PERTH = timezone(timedelta(hours=8))

LEGACY = {
    "iak": json.dumps("sk-ant-test-0000"),
    "iwt": json.dumps({"2026-09-21": 51.2, "2026-09-28": 51.6, "2026-10-05": 52.1}),
    "id_2026-03-25": json.dumps({"meals": {"m1": True, "m2": True}, "water": 2, "bed": "02:00", "wake": "10:00", "skm": True, "sks": False}),
    "ik_2026-03-25": json.dumps({"m1": {"total": 850}, "m2": {"total": 640}}),
}

errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, timezone_id="Australia/Perth", locale="fr-FR", has_touch=True, is_mobile=True)
    ctx.add_init_script("""
      if (!localStorage.getItem('__seeded_test')) {
        const L = %s;
        for (const [k, v] of Object.entries(L)) localStorage.setItem(k, v);
        localStorage.setItem('__seeded_test', '1');
      }
    """ % json.dumps(LEGACY))
    page = ctx.new_page()
    page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.clock.install(time=datetime(2026, 10, 7, 21, 30, tzinfo=PERTH))
    page.goto(URL)
    page.wait_for_timeout(600)

    def shot(name, full=True):
        page.screenshot(path=f"{OUT}/{name}.png", full_page=full)

    shot("01-today")

    # Ajout par texte : le shaker
    page.get_by_role("button", name="✍️ Écrire").first.click()
    page.wait_for_timeout(200)
    page.locator("textarea").fill("196 ml lait entier\n100g yogourt\n90g flocons d’avoine\n20g whey\n5g créatine\n27g beurre de cacahuète\n85g mangue surgelée\n3g de gingembre\n130 ml eau")
    page.get_by_role("button", name="Analyser").click()
    page.wait_for_timeout(300)
    shot("02-add-preview", full=False)
    page.get_by_role("button", name="Ajouter au journal").click()
    page.wait_for_timeout(300)

    # Ajout par favori
    page.get_by_role("button", name="⭐ Favoris").first.click()
    page.wait_for_timeout(200)
    page.get_by_text("Poêlée poulet-patates").click()
    page.wait_for_timeout(200)
    shot("03-fav-preview", full=False)
    page.get_by_role("button", name="Ajouter au journal").click()
    page.wait_for_timeout(300)

    # Habitudes
    page.get_by_text("☀️ Lumière du jour").click()
    page.get_by_role("button", name="1,5", exact=True).click()
    page.wait_for_timeout(200)
    shot("04-today-filled")

    # Sommeil : je pose le téléphone à 1 h 40, réveil à 9 h 50
    page.clock.set_system_time(datetime(2026, 10, 8, 1, 40, tzinfo=PERTH))
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    page.wait_for_timeout(200)
    page.get_by_role("button", name="🌙 Je pose le téléphone").click()
    page.wait_for_timeout(200)
    page.clock.set_system_time(datetime(2026, 10, 8, 9, 50, tzinfo=PERTH))
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    page.wait_for_timeout(300)
    shot("05-night-running", full=False)
    page.get_by_role("button", name="☀️ Je suis réveillé").click()
    page.wait_for_timeout(300)
    page.get_by_role("button", name="Énergie 4 sur 5").click()
    page.wait_for_timeout(200)
    shot("06-today-after-wake")

    # Manger
    page.get_by_role("button", name="MANGER").click()
    page.wait_for_timeout(200)
    page.get_by_role("button", name="Jour précédent").click()
    page.wait_for_timeout(200)
    page.locator(".entry-head").first.click()
    page.wait_for_timeout(200)
    shot("07-food-yesterday")

    # Sport + import Hevy
    page.get_by_role("button", name="SPORT").click()
    page.wait_for_timeout(200)
    shot("08-sport")
    page.get_by_role("button", name="📋 Importer une séance Hevy").click()
    page.wait_for_timeout(200)
    page.locator("textarea").fill("""Full body C 🏋️‍♂️
Le jeudi, oct. 08, 2026 à 5:02pm

Développé Épaules (Haltère)
Série 1: 10 kg x 12
Série 2: 10 kg x 12
Série 3: 10 kg x 12

Soulevé de Terre Roumain (Haltère)
Série 1: 12.5 kg x 10
Série 2: 12.5 kg x 10
Série 3: 12.5 kg x 9

@hevyapp
https://hevy.com/workout/test-c""")
    page.wait_for_timeout(200)
    shot("09-hevy", full=False)
    page.get_by_role("button", name="Enregistrer la séance").click()
    page.wait_for_timeout(300)
    page.get_by_role("button", name="Séance C").click()
    page.wait_for_timeout(200)
    page.locator(".ex-head").first.click()
    page.wait_for_timeout(200)
    shot("10-sport-c")

    # Poids
    page.get_by_role("button", name="POIDS").click()
    page.wait_for_timeout(200)
    page.locator("input[placeholder^='Dernière']").fill("52,4")
    page.get_by_role("button", name="Noter").click()
    page.wait_for_timeout(300)
    shot("11-weight")

    # Stats
    page.get_by_role("button", name="STATS").click()
    page.wait_for_timeout(200)
    shot("12-stats")
    page.get_by_role("button", name="30 jours").click()
    page.wait_for_timeout(200)
    shot("13-stats-30")

    # Coach (sans appel réseau)
    page.get_by_role("button", name="COACH").click()
    page.wait_for_timeout(200)
    shot("14-coach", full=False)

    # Réglages
    page.get_by_role("button", name="Réglages").click()
    page.wait_for_timeout(200)
    shot("15-settings", full=False)
    page.get_by_role("button", name="Fermer").click()

    # Mes aliments
    page.get_by_role("button", name="MANGER").click()
    page.get_by_role("button", name="📒 Mes aliments").click()
    page.wait_for_timeout(200)
    shot("16-foods", full=False)
    page.get_by_role("button", name="Fermer").click()

    # Vérifs de données
    data = page.evaluate("""() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; }""")
    day7 = json.loads(data.get("t2:day:2026-10-07", "{}"))
    day8 = json.loads(data.get("t2:day:2026-10-08", "{}"))
    print("Jour 07/10 :", [ (e["label"], e["t"], len(e["items"])) for e in day7.get("entries", []) ], "eau", day7.get("water"), "h", day7.get("h"))
    print("Nuit du 08/10 :", day8.get("sleep"))
    print("Ancienne journée migrée :", data.get("t2:day:2026-03-25"))
    print("Poids :", data.get("iwt"))
    print("Clé API gardée :", data.get("iak"))
    print("Séances :", [ (w["title"], w["session"], w["date"]) for w in json.loads(data.get("t2:workouts", "[]")) ])
    b.close()

print("\nERREURS :" if errors else "\nAucune erreur console.")
for e in errors: print(" ", e)
