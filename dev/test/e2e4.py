"""Parcours complet de la v4 dans Chromium (iPhone, heure de Perth), API Claude simulée."""
import json, os, sys
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright

OUT = sys.argv[1]
PHOTO = sys.argv[2]
URL = "file://" + os.path.abspath(sys.argv[3] if len(sys.argv) > 3 else "../index.html")
os.makedirs(OUT, exist_ok=True)
P = timezone(timedelta(hours=8))
calls, errors, checks = [], [], []

def ok(name, cond, extra=""):
    checks.append(("✅" if cond else "❌") + " " + name + (f" ({extra})" if extra else ""))

def api(route, request):
    if request.method == "OPTIONS":
        return route.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST"})
    body = json.loads(request.post_data); calls.append(body)
    sysp = body.get("system", "")
    if "assiette" in sysp:
        text = json.dumps({"items": [{"name": "Pâtes", "user_words": "", "grams": 180, "food_id": "pates_cuites", "kcal_100g": 158, "protein_100g": 5.8, "carbs_100g": 31, "fat_100g": 0.9, "confidence": "moyenne"}], "note": "Assiette standard."})
    elif "convertis" in sysp:
        text = json.dumps({"items": [{"name": "Kebab", "user_words": "kebab", "grams": 350, "food_id": "", "kcal_100g": 215, "protein_100g": 11, "carbs_100g": 22, "fat_100g": 9, "confidence": "moyenne"}], "note": ""})
    else:
        text = "Il te reste **750 kcal** :\n- un shaker avoine-cacahuète\n- ou le bol yaourt"
    route.fulfill(status=200, headers={"access-control-allow-origin": "*", "content-type": "application/json"},
                  body=json.dumps({"content": [{"type": "thinking", "thinking": "", "signature": "s"}, {"type": "text", "text": text}], "stop_reason": "end_turn"}))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, timezone_id="Australia/Perth", locale="fr-FR", has_touch=True, is_mobile=True)
    ctx.add_init_script("""if(!localStorage.getItem('__t')){localStorage.setItem('__t','1');
      localStorage.setItem('iak', JSON.stringify('sk-ant-test-0000'));
      localStorage.setItem('iwt', JSON.stringify({"2026-09-21":51.2,"2026-09-28":51.6,"2026-10-05":52.1}));
      localStorage.setItem('id_2026-03-25', JSON.stringify({meals:{m1:true},water:2,bed:"02:00",wake:"10:00",skm:true}));}""")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" and "ERR_TUNNEL" not in m.text and "ERR_FILE_NOT_FOUND" not in m.text else None)
    page.route("https://api.anthropic.com/**", api)
    page.route("https://api.open-meteo.com/**", lambda route: route.fulfill(status=200, headers={"access-control-allow-origin": "*", "content-type": "application/json"},
        body=json.dumps({"current": {"temperature_2m": 21.4, "weather_code": 2, "is_day": 1}, "daily": {"temperature_2m_max": [24.8], "temperature_2m_min": [12.1]}})))
    page.clock.install(time=datetime(2026, 10, 8, 1, 30, tzinfo=P))
    page.goto(URL); page.wait_for_timeout(900)
    store = lambda k: json.loads(page.evaluate(f"localStorage.getItem({json.dumps(k)})") or "null")

    # 1) Nuit : je pose le téléphone (1 h 30), réveil à 9 h 40
    ok("salutation de nuit", "Il est tard" in page.locator(".greet-hello").inner_text())
    page.get_by_role("button", name="🌙 Je pose le téléphone").click(); page.wait_for_timeout(300)
    ok("nuit en cours", store("t2:night") is not None)
    page.clock.set_system_time(datetime(2026, 10, 8, 9, 40, tzinfo=P)); page.evaluate("dispatchEvent(new Event('focus'))"); page.wait_for_timeout(400)
    page.screenshot(path=f"{OUT}/e0-matin.png")
    page.get_by_role("button", name="☀️ Je suis levé").click(); page.wait_for_timeout(400)
    s = (store("t2:day:2026-10-08") or {}).get("sleep")
    ok("nuit rangée le 08/10", s is not None, s and f"{s['bed']} → {s['wake']}")
    page.screenshot(path=f"{OUT}/e1-reveil.png")
    page.get_by_role("button", name="Annuler").click(); page.wait_for_timeout(300)
    ok("annuler le réveil remet la nuit en cours", store("t2:night") is not None and not (store("t2:day:2026-10-08") or {}).get("sleep"))
    page.get_by_role("button", name="☀️ Je suis levé").click(); page.wait_for_timeout(300)

    # 2) Lumière du matin : la mission « Maintenant »
    page.clock.set_system_time(datetime(2026, 10, 8, 10, 0, tzinfo=P)); page.evaluate("dispatchEvent(new Event('focus'))"); page.wait_for_timeout(300)
    hot = page.locator(".mrow.hot .ml").inner_text()
    ok("mission du matin = lumière", "Lumière" in hot, hot)
    page.locator(".mrow.hot").click(); page.wait_for_timeout(300)
    ok("lumière cochée", (store("t2:day:2026-10-08") or {}).get("h", {}).get("light") is True)

    # 3) Midi : rien mangé → suggestion de repas en un tap
    page.clock.set_system_time(datetime(2026, 10, 8, 12, 30, tzinfo=P)); page.evaluate("dispatchEvent(new Event('focus'))"); page.wait_for_timeout(300)
    hot = page.locator(".mrow.hot .ml").inner_text()
    ok("mission de midi = calories", "Calories" in hot, hot)
    page.screenshot(path=f"{OUT}/e2-midi.png")
    page.locator(".suggest").click(); page.wait_for_timeout(500)
    d = store("t2:day:2026-10-08")
    ok("favori ajouté en un tap", len(d["entries"]) == 1, d["entries"][0]["label"] if d["entries"] else "")

    # 4) Missions : eau +0,5 L deux fois, créatine
    page.locator(".mrow", has_text="Eau").click(); page.wait_for_timeout(150)
    page.locator(".mrow", has_text="Eau").click(); page.wait_for_timeout(150)
    ok("eau à 1 L", store("t2:day:2026-10-08")["water"] == 1.0)

    # 5) Ajout rapide par texte (+)
    page.get_by_role("button", name="Ajouter un repas").first.click(); page.wait_for_timeout(400)
    page.locator(".sheet textarea").fill("160g de riz blanc cuit (beurre dedans ≈10g)\nSteak achee ( ≈120g)\nHuile d’olive,\ncoca coma")
    page.get_by_role("button", name="Analyser").click(); page.wait_for_timeout(400)
    tot = page.locator(".total-line b").inner_text()
    ok("texte reconnu sans IA", "841" in tot, tot)
    page.screenshot(path=f"{OUT}/e3-ajout-texte.png")
    page.get_by_role("button", name="Ajouter au journal").click(); page.wait_for_timeout(400)

    # 6) Texte inconnu → IA
    page.get_by_role("button", name="Ajouter un repas").first.click(); page.wait_for_timeout(300)
    page.locator(".sheet textarea").fill("un kebab")
    page.get_by_role("button", name="Analyser").click(); page.wait_for_timeout(700)
    ok("kebab via IA", "Kebab" in page.locator(".sheet .item-name").first.inner_text())
    page.get_by_role("button", name="Ajouter au journal").click(); page.wait_for_timeout(300)

    # 7) Photo
    page.get_by_role("button", name="Ajouter un repas").first.click(); page.wait_for_timeout(300)
    page.locator(".modes button", has_text="Photo").click()
    page.locator("input[type=file][capture]").set_input_files(PHOTO); page.wait_for_timeout(1500)
    ok("photo analysée", "Pâtes" in page.locator(".sheet .item-name").first.inner_text())
    page.get_by_role("button", name="Fermer").click(); page.wait_for_timeout(300)

    # 8) Manger : frise, suppression + annuler
    page.get_by_role("button", name="Manger").click(); page.wait_for_timeout(500)
    n_before = len(store("t2:day:2026-10-08")["entries"])
    page.locator(".tl-head").first.click(); page.wait_for_timeout(200)
    page.screenshot(path=f"{OUT}/e4-manger.png", full_page=True)
    page.locator(".chip.danger").first.click(); page.wait_for_timeout(200)
    ok("repas supprimé", len(store("t2:day:2026-10-08")["entries"]) == n_before - 1)
    page.get_by_role("button", name="Annuler").click(); page.wait_for_timeout(200)
    ok("repas rétabli par Annuler", len(store("t2:day:2026-10-08")["entries"]) == n_before)

    # 9) Glisser pour changer de jour
    page.evaluate("""() => { const el = document.querySelector('.page');
      const t = (type, x) => { const tt = new Touch({identifier: 1, target: el, clientX: x, clientY: 400});
        el.dispatchEvent(new TouchEvent(type, {touches: type==='touchend'?[]:[tt], changedTouches: [tt], bubbles: true})); };
      t('touchstart', 80); t('touchend', 300); }""")
    page.wait_for_timeout(300)
    ok("glisser à droite = hier", page.locator(".daynav-t").inner_text() == "Hier")

    # 10) Sport : import Hevy
    page.get_by_role("button", name="Sport").click(); page.wait_for_timeout(400)
    page.get_by_role("button", name="Importer une séance Hevy").click(); page.wait_for_timeout(300)
    page.locator(".sheet textarea").fill("Full body C\nLe jeudi, oct. 08, 2026 à 5:02pm\n\nDéveloppé Épaules (Haltère)\nSérie 1: 10 kg x 12\nSérie 2: 10 kg x 12\nSérie 3: 10 kg x 12\n\n@hevyapp\nhttps://hevy.com/workout/test-c")
    page.wait_for_timeout(200)
    page.get_by_role("button", name="Enregistrer la séance").click(); page.wait_for_timeout(600)
    page.locator(".seg button", has_text="Séance C").click(); page.wait_for_timeout(300)
    t = page.locator(".ex-target").first.inner_text()
    ok("suggestion après import", "12,5" in t, t)
    page.screenshot(path=f"{OUT}/e5-sport.png", full_page=True)

    # 11) Poids via le raccourci « Pesée »
    page.get_by_role("button", name="Accueil").click(); page.wait_for_timeout(300)
    page.locator(".sc", has_text="Pesée").click(); page.wait_for_timeout(400)
    page.locator("input[aria-label='Poids en kg']").fill("52,6"); page.get_by_role("button", name="Noter").click(); page.wait_for_timeout(300)
    ok("pesée notée", store("iwt").get("2026-10-08") == 52.6)
    page.screenshot(path=f"{OUT}/e6-poids.png", full_page=True)

    # 11 bis) Minuteur focus : 25 min puis fin
    page.get_by_role("button", name="Accueil").click(); page.wait_for_timeout(300)
    page.locator(".timer .pill-btn", has_text="Lancer").click(); page.wait_for_timeout(200)
    ok("minuteur lancé", (store("t2:timer") or {}).get("end") is not None)
    page.clock.run_for(25 * 60 * 1000 + 1500); page.wait_for_timeout(300)
    ok("fin du minuteur annoncée", "Session focus terminée" in page.locator(".toast").inner_text())

    # 11 ter) Semaine : changer d'indicateur
    page.locator(".week .pill").click(); page.wait_for_timeout(200)
    ok("semaine en protéines", "Protéines" in page.locator(".week .pill").inner_text())

    # 12) Coach (API simulée)
    page.get_by_label("Coach").click(); page.wait_for_timeout(300)
    page.locator(".sugg").first.click(); page.wait_for_timeout(800)
    ok("réponse du coach affichée", "750 kcal" in page.locator(".msg.assistant").last.inner_text())
    page.screenshot(path=f"{OUT}/e7-coach.png")
    page.get_by_role("button", name="Fermer").click(); page.wait_for_timeout(200)

    # 13) Réglages
    page.get_by_role("button", name="Réglages").click(); page.wait_for_timeout(300)
    page.screenshot(path=f"{OUT}/e8-reglages.png")
    page.get_by_role("button", name="Fermer").click(); page.wait_for_timeout(200)

    # 14) Retour Focus le soir
    page.clock.set_system_time(datetime(2026, 10, 8, 20, 30, tzinfo=P)); page.get_by_role("button", name="Accueil").click(); page.evaluate("dispatchEvent(new Event('focus'))"); page.wait_for_timeout(1500)
    page.screenshot(path=f"{OUT}/e9-accueil-soir.png")
    page.screenshot(path=f"{OUT}/e9-accueil-soir-full.png", full_page=True)
    ok("ancienne journée migrée", store("t2:day:2026-03-25") is not None)
    ok("clé API conservée", store("iak") == "sk-ant-test-0000")
    b.close()

print("\n".join(checks))
print(f"\nAppels API : {len(calls)} — modèles {sorted(set(c['model'] for c in calls))}, temperature absente : {all('temperature' not in c for c in calls)}")
print("\n".join(errors) if errors else "Aucune erreur console.")
