"""Parcours complet du patch 8.1 « L'Affiche » (moteur du patch 8) dans Chromium (iPhone, heure de Perth), API Claude simulée."""
import json, os, sys
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(__file__))
from seed8 import route_fonts

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
    elif "TON RÔLE" in sysp:
        text = json.dumps({"reply": "Il te reste **750 kcal** :\n- un shaker avoine-cacahuète\n- ou le bol yaourt", "update_plan": False,
                           "plan": {"summary": "", "bedtime": "", "training": "unchanged", "meals": []}})
    else:
        text = "Il te reste **750 kcal**"
    route.fulfill(status=200, headers={"access-control-allow-origin": "*", "content-type": "application/json"},
                  body=json.dumps({"content": [{"type": "text", "text": text}], "stop_reason": "end_turn"}))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, timezone_id="Australia/Perth", locale="fr-FR", has_touch=True, is_mobile=True)
    ctx.add_init_script("""if(!localStorage.getItem('__t')){localStorage.setItem('__t','1');
      localStorage.setItem('iak', JSON.stringify('sk-ant-test-0000'));
      localStorage.setItem('iwt', JSON.stringify({"2026-09-21":51.2,"2026-09-28":51.6,"2026-10-05":52.1}));
      localStorage.setItem('id_2026-03-25', JSON.stringify({meals:{m1:true},water:2,bed:"02:00",wake:"10:00",skm:true}));}""")
    page = ctx.new_page()
    route_fonts(page)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" and "ERR_" not in m.text else None)
    page.route("https://api.anthropic.com/**", api)
    page.clock.install(time=datetime(2026, 10, 8, 1, 30, tzinfo=P))
    page.goto(URL); page.wait_for_timeout(900)
    store = lambda k: json.loads(page.evaluate(f"localStorage.getItem({json.dumps(k)})") or "null")
    nb = lambda t: (t or "").replace(" ", " ").replace(" ", " ")
    focus = lambda: (page.evaluate("dispatchEvent(new Event('focus'))"), page.wait_for_timeout(400))
    at = lambda *a: (page.clock.set_system_time(datetime(*a, tzinfo=P)), focus())

    # 0) Première ouverture : l'import du compte, puis plus jamais
    ok("écran d'import à la 1re ouverture", page.locator(".welc").count() == 1)
    page.screenshot(path=f"{OUT}/e0-import.png")
    page.get_by_role("button", name="Jouer", exact=True).click(); page.wait_for_timeout(400)
    ok("état du jeu enregistré", (store("t2:seen") or {}).get("patch") == "8.1")
    ok("salutation de nuit (lecteur d'écran)", "Il est tard" in page.locator(".sr-only").inner_text())
    ok("affiche : médaillon, PV, mana", page.locator(".portrait").count() == 1 and page.locator(".ph-stat.hp").count() == 1 and page.locator(".ph-stat.mana").count() == 1)
    ok("affiche peinte (ciel)", page.locator(".poster .bd-img").count() == 1)

    # 1) Recall : je pose le téléphone → fin de partie → nuit → réveil
    page.get_by_role("button", name="Je pose le téléphone").click(); page.wait_for_timeout(500)
    ok("nuit en cours", store("t2:night") is not None)
    ok("écran de fin de partie", page.locator(".endg").count() == 1, nb(page.locator(".endg-t").inner_text()) if page.locator(".endg-t").count() else "")
    page.screenshot(path=f"{OUT}/e1-fin.png")
    page.get_by_role("button", name="Bonne nuit", exact=True).click(); page.wait_for_timeout(300)
    ok("recall affiché", "Recall en cours" in page.locator(".hero").inner_text())
    at(2026, 10, 8, 9, 40)
    page.get_by_role("button", name="Je suis levé").click(); page.wait_for_timeout(400)
    s = (store("t2:day:2026-10-08") or {}).get("sleep")
    ok("nuit rangée le 08/10", s is not None, s and f"{s['bed']} → {s['wake']}")
    page.get_by_role("button", name="Annuler", exact=True).click(); page.wait_for_timeout(300)
    ok("annuler le réveil remet le recall", store("t2:night") is not None and not (store("t2:day:2026-10-08") or {}).get("sleep"))
    page.get_by_role("button", name="Je suis levé").click(); page.wait_for_timeout(2600)

    # 2) Matin : lumière par la carte « maintenant »
    at(2026, 10, 8, 10, 0)
    t = page.locator(".now-t").inner_text()
    ok("action du matin = lumière", "dehors" in t, t)
    page.locator(".now-btn").click(); page.wait_for_timeout(300)
    ok("lumière cochée", (store("t2:day:2026-10-08") or {}).get("h", {}).get("light") is True)
    ok("item lumière allumé", page.locator(".islot.on", has_text="Lumière").count() == 1)

    # 3) Midi : favori en un appui, +gold
    at(2026, 10, 8, 12, 30)
    page.locator(".now-fav").click(); page.wait_for_timeout(500)
    d = store("t2:day:2026-10-08")
    ok("favori ajouté en un appui", len(d["entries"]) == 1, d["entries"][0]["label"] if d["entries"] else "")
    ok("toast en gold", "gold" in page.locator(".toast").inner_text())
    ok("le farm compte le repas", page.locator(".hero-big").inner_text().replace(" ", "").replace(" ", "") != "0")
    page.wait_for_timeout(4500)

    # 4) Inventaire : potions, items à stacks, appui long
    water = page.locator('.islot[aria-label^="Eau"]')
    water.click(); page.wait_for_timeout(150); water.click(); page.wait_for_timeout(150)
    ok("eau à 1 L", store("t2:day:2026-10-08")["water"] == 1.0)
    page.locator(".islot", has_text="Minoxidil").click(); page.wait_for_timeout(150)
    ok("minoxidil coché", store("t2:day:2026-10-08")["h"].get("minox") is True)
    page.locator(".islot", has_text="Minoxidil").click(); page.wait_for_timeout(150)
    ok("minoxidil décoché au 2e appui", store("t2:day:2026-10-08")["h"].get("minox") is False)
    page.locator(".islot", has_text="Minoxidil").click(); page.wait_for_timeout(150)
    ok("6 emplacements (4 items, eau, pesée)", page.locator(".islot").count() == 6, str(page.locator(".islot").count()))
    page.locator(".islot", has_text="Posture").click(); page.wait_for_timeout(300)
    ok("l'item posture ouvre la routine", "Routine posture" in page.locator(".sheet-title").inner_text())
    page.get_by_role("button", name="Fermer").click(); page.wait_for_timeout(200)
    page.locator(".islot", has_text="Créatine").dispatch_event("pointerdown", {"clientX": 100, "clientY": 600})
    page.wait_for_timeout(600)
    ok("appui long = fiche d'item", page.locator(".tip-n", has_text="Créatine").count() == 1)
    page.screenshot(path=f"{OUT}/e2-fiche.png")
    page.get_by_role("button", name="Fait aujourd'hui", exact=True).click(); page.wait_for_timeout(300)
    ok("créatine prise depuis la fiche", store("t2:day:2026-10-08")["h"].get("creatine") is True)
    page.get_by_role("button", name="Fermer").first.click(); page.wait_for_timeout(250)
    ok("annonce de kill", page.locator(".ann").count() == 1, nb(page.locator(".ann").inner_text()) if page.locator(".ann").count() else "")
    page.screenshot(path=f"{OUT}/e3-kill.png")
    page.wait_for_timeout(2600)

    # 5) Ajout par texte (+), sans IA
    page.get_by_role("button", name="Ajouter un repas").first.click(); page.wait_for_timeout(400)
    page.locator(".sheet textarea").fill("160g de riz blanc cuit (beurre dedans ≈10g)\nSteak achee ( ≈120g)\nHuile d’olive,\ncoca coma")
    page.get_by_role("button", name="Analyser", exact=True).click(); page.wait_for_timeout(400)
    tot = page.locator(".total-line b").inner_text()
    ok("texte reconnu sans IA", "841" in tot, tot)
    page.get_by_role("button", name="Ajouter au journal").click(); page.wait_for_timeout(400)
    ok("Alimentdex : nouvel aliment annoncé", page.locator(".ann", has_text="Nouvel aliment").count() == 1)
    page.wait_for_timeout(2600)

    # 6) Texte inconnu → IA, 7) photo
    page.get_by_role("button", name="Ajouter un repas").first.click(); page.wait_for_timeout(300)
    page.locator(".sheet textarea").fill("un kebab")
    page.get_by_role("button", name="Analyser", exact=True).click(); page.wait_for_timeout(700)
    ok("kebab via IA", "Kebab" in page.locator(".sheet .item-name").first.inner_text())
    page.get_by_role("button", name="Ajouter au journal").click(); page.wait_for_timeout(300)
    page.get_by_role("button", name="Ajouter un repas").first.click(); page.wait_for_timeout(300)
    page.locator(".modes button", has_text="Photo").click()
    page.locator("input[type=file][capture]").set_input_files(PHOTO); page.wait_for_timeout(1500)
    ok("photo analysée", "Pâtes" in page.locator(".sheet .item-name").first.inner_text())
    page.get_by_role("button", name="Fermer").click(); page.wait_for_timeout(300)

    # 8) Farm : rareté, build, suppression + annuler, glisser
    page.get_by_role("button", name="Farm", exact=True).click(); page.wait_for_timeout(500)
    ok("rareté des repas", page.locator(".tl-rar").count() >= 3)
    ok("Alimentdex dans Farm", "Alimentdex" in page.locator(".dexbtn").inner_text())
    n_before = len(store("t2:day:2026-10-08")["entries"])
    page.locator(".tl-head").first.click(); page.wait_for_timeout(200)
    page.locator(".chip.danger").first.click(); page.wait_for_timeout(200)
    ok("repas supprimé", len(store("t2:day:2026-10-08")["entries"]) == n_before - 1)
    page.get_by_role("button", name="Annuler", exact=True).click(); page.wait_for_timeout(200)
    ok("repas rétabli par Annuler", len(store("t2:day:2026-10-08")["entries"]) == n_before)
    page.screenshot(path=f"{OUT}/e4-farm.png", full_page=True)
    page.evaluate("""() => { const el = document.querySelector('.page');
      const t = (type, x) => { const tt = new Touch({identifier: 1, target: el, clientX: x, clientY: 400});
        el.dispatchEvent(new TouchEvent(type, {touches: type==='touchend'?[]:[tt], changedTouches: [tt], bubbles: true})); };
      t('touchstart', 80); t('touchend', 300); }""")
    page.wait_for_timeout(300)
    ok("glisser à droite = hier", page.locator(".daynav-t").inner_text().strip().lower() == "hier")
    page.get_by_role("button", name="Dex", exact=False).count()

    # 9) Arène : import Hevy, sorts, +1 rep
    page.get_by_role("button", name="Arène", exact=True).click(); page.wait_for_timeout(400)
    ok("barre de mana dans l'Arène", page.locator(".mana-p .gbar.mana").count() == 1)
    page.get_by_role("button", name="Importer une séance Hevy").click(); page.wait_for_timeout(300)
    page.locator(".sheet textarea").fill("Full body C\nLe jeudi, oct. 08, 2026 à 5:02pm\n\nDéveloppé Épaules (Haltère)\nSérie 1: 10 kg x 12\nSérie 2: 10 kg x 12\nSérie 3: 10 kg x 12\n\n@hevyapp\nhttps://hevy.com/workout/test-c")
    page.wait_for_timeout(200)
    page.get_by_role("button", name="Enregistrer la séance").click(); page.wait_for_timeout(300)
    seen_cast = False
    for _ in range(40):
        if page.locator(".ann", has_text="Sort lancé").count(): seen_cast = True; break
        page.wait_for_timeout(200)
    ok("annonce « sort lancé »", seen_cast)
    page.wait_for_timeout(6000)
    at(2026, 10, 8, 18, 0)
    page.locator(".spell", has_text="C").first.click(); page.wait_for_timeout(300)
    t = page.locator(".ex-target").first.inner_text()
    ok("suggestion après import", "12,5" in t, t)
    ok("sorts en recharge après la séance", page.locator(".spell.cd").count() == 3)
    page.screenshot(path=f"{OUT}/e5-arene.png", full_page=True)

    # 10) Classé : pesée → rang et LP
    page.get_by_role("button", name="Base", exact=True).click(); page.wait_for_timeout(300)
    page.locator(".rankc").click(); page.wait_for_timeout(400)
    page.locator("input[aria-label='Poids en kg']").fill("52,6"); page.get_by_role("button", name="Noter", exact=True).click(); page.wait_for_timeout(400)
    ok("pesée notée", store("iwt").get("2026-10-08") == 52.6)
    ok("rang affiché", page.locator(".rh-n").count() == 1, nb(page.locator(".rh-n").inner_text()))
    page.screenshot(path=f"{OUT}/e6-classe.png", full_page=True)
    page.wait_for_timeout(2600)

    # 11) Semaine : toucher lundi ouvre la partie
    page.get_by_role("button", name="Base", exact=True).click(); page.wait_for_timeout(300)
    page.locator(".wk:not([disabled])").first.click(); page.wait_for_timeout(400)
    ok("partie d'un jour passé", page.locator(".endg").count() == 1)
    page.get_by_role("button", name="Fermer").first.click(); page.wait_for_timeout(300)

    # 12) Routine posture guidée
    page.get_by_role("button", name="Arène", exact=True).click(); page.wait_for_timeout(300)
    page.locator(".top-seg button", has_text="Posture").click(); page.wait_for_timeout(300)
    ok("section posture : 5 exercices", page.locator(".pz-ex").count() == 5)
    page.get_by_role("button", name="Lancer la routine", exact=True).click(); page.wait_for_timeout(300)
    page.get_by_role("button", name="C'est parti", exact=True).click(); page.wait_for_timeout(200)
    page.clock.run_for(6000); page.wait_for_timeout(150)
    ok("exercice 1 en cours", "Exercice 1 sur 5" in page.locator(".pp-k").inner_text())
    for _ in range(5):
        page.clock.run_for(66000); page.wait_for_timeout(150)
    ok("routine terminée", page.locator(".pp-end").count() == 1)
    ok("posture cochée automatiquement", (store("t2:day:2026-10-08") or {}).get("h", {}).get("posture") is True)
    page.get_by_role("button", name="Fermer").first.click(); page.wait_for_timeout(2600)

    # 13) Profil : succès, codex, notes de patch, glow-up
    page.get_by_role("button", name="Profil", exact=True).click(); page.wait_for_timeout(400)
    page.locator(".top-seg button", has_text="Succès").click(); page.wait_for_timeout(300)
    ok("succès débloqués", page.locator(".ach.on").count() >= 3, str(page.locator(".ach.on").count()))
    page.get_by_role("button", name="Codex", exact=True).click(); page.wait_for_timeout(300)
    ok("codex : la créatine en LoL", "mana max" in page.locator(".cdx-lol").first.inner_text())
    page.get_by_role("button", name="Fermer").click(); page.wait_for_timeout(200)
    page.get_by_role("button", name="Notes de patch", exact=True).click(); page.wait_for_timeout(300)
    n = page.locator(".patch-row").count()
    ok("notes de patch : 8.1 en haut, les 52 du 8.0 gardées dessous", n == 16 + 52 and "Affiche" in page.locator(".patch-h h3").first.inner_text(), str(n))
    page.get_by_role("button", name="Fermer").click(); page.wait_for_timeout(200)
    page.locator(".top-seg button", has_text="Glow-up").click(); page.wait_for_timeout(400)
    page.locator("input[type=file]:not([capture])").set_input_files(PHOTO); page.wait_for_timeout(1500)
    page.locator("input[type=file]:not([capture])").set_input_files(PHOTO); page.wait_for_timeout(1500)
    ok("glow-up : comparateur", page.locator(".gu-cmp").count() == 1)

    # 14) Coach (API simulée)
    page.get_by_role("button", name="Base", exact=True).click(); page.wait_for_timeout(300)
    page.locator(".cbar").click(); page.wait_for_timeout(300)
    page.locator(".sheet .agent-chips .chip").last.click(); page.wait_for_timeout(800)
    ok("réponse du coach", "750 kcal" in page.locator(".msg.assistant").last.inner_text())
    ok("le coach connaît la partie", "SA PARTIE EN COURS" in calls[-1].get("system", "") and "stacks" in calls[-1].get("system", ""))
    page.get_by_role("button", name="Fermer").click(); page.wait_for_timeout(200)

    # 15) Runes : SPF, forge, pseudo, skin
    page.get_by_role("button", name="Runes et réglages").click(); page.wait_for_timeout(300)
    page.locator(".toggle.rt", has_text="SPF 50").click(); page.wait_for_timeout(200)
    ok("SPF ajouté", "spf" in (store("t2:settings") or {}).get("rituals", []))
    page.locator(".forge input").first.fill("Anglais"); page.locator(".forge input").nth(1).fill("15 min par jour")
    page.get_by_role("button", name="Forger l'item").click(); page.wait_for_timeout(300)
    ok("item forgé", any(x.get("label") == "Anglais" for x in (store("t2:settings") or {}).get("customItems", [])))
    page.locator(".field", has_text="Pseudo").locator("input").fill("Ismaël"); page.locator(".field", has_text="Pseudo").locator("input").blur(); page.wait_for_timeout(200)
    ok("pseudo changé", (store("t2:settings") or {}).get("pseudo") == "Ismaël")
    ok("skins verrouillés selon le niveau", page.locator(".skin.locked").count() >= 3)
    page.screenshot(path=f"{OUT}/e7-runes.png")
    page.get_by_role("button", name="Fermer").click(); page.wait_for_timeout(300)
    ok("inventaire : SPF et Anglais", page.locator(".islot", has_text="SPF").count() == 1 and page.locator(".islot", has_text="Anglais").count() == 1)
    ok("pseudo dans le HUD", "Ismaël" in page.locator(".hud-n").inner_text() or "ISMAËL" in page.locator(".hud-n").inner_text().upper())
    page.locator(".islot", has_text="Anglais").click(); page.wait_for_timeout(200)
    ok("item perso coché", any(k.startswith("u_") and v for k, v in store("t2:day:2026-10-08")["h"].items()))

    # 16) Divers
    sw = page.evaluate("document.documentElement.scrollWidth")
    ok("pas de débordement horizontal", sw <= 390, f"{sw}px")
    ok("plus de minuteur, de météo ni de raccourcis", page.locator(".timer, .weather, .shortcuts").count() == 0)
    ok("ancienne journée migrée", store("t2:day:2026-03-25") is not None)
    ok("clé API conservée", store("iak") == "sk-ant-test-0000")

    # 17) Le lendemain : écran de chargement une fois
    page.clock.set_system_time(datetime(2026, 10, 9, 10, 0, tzinfo=P)); page.reload(); page.wait_for_timeout(700)
    ok("écran de chargement le lendemain", page.locator(".load").count() == 1)
    page.locator(".load").click(timeout=3000); page.wait_for_timeout(300)
    ok("on passe en touchant", page.locator(".load").count() == 0)
    page.reload(); page.wait_for_timeout(700)
    ok("pas deux fois le même jour", page.locator(".load").count() == 0)
    page.screenshot(path=f"{OUT}/e9-accueil.png", full_page=True)
    b.close()

print("\n".join(checks))
print(f"\nAppels API : {len(calls)} — modèles {sorted(set(c['model'] for c in calls))}")
print("\n".join(errors) if errors else "Aucune erreur console.")
