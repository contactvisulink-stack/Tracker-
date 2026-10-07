"""Teste les appels IA avec une API simulée : forme des requêtes + lecture des réponses."""
import json, sys, os
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright

OUT = sys.argv[1]
PHOTO = sys.argv[2]
URL = "file://" + os.path.abspath("../index.html")
PERTH = timezone(timedelta(hours=8))
calls = []

def respond(route, request):
    if request.method == "OPTIONS":
        return route.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST"})
    body = json.loads(request.post_data)
    calls.append({"headers": dict(request.headers), "body": body})
    sysp = body.get("system", "")
    if "convertis la description" in sysp:
        out = {"items": [
            {"name": "kebab (galette, viande, crudités, sauce blanche)", "user_words": "kebab", "grams": 350, "food_id": "", "kcal_100g": 215, "protein_100g": 11, "carbs_100g": 22, "fat_100g": 9, "confidence": "moyenne"},
            {"name": "Coca-Cola", "user_words": "coca", "grams": 375, "food_id": "coca", "kcal_100g": 42, "protein_100g": 0, "carbs_100g": 10.6, "fat_100g": 0, "confidence": "haute"}],
            "note": "Kebab standard en galette estimé à 350 g."}
        text = json.dumps(out, ensure_ascii=False)
    elif "photo" in sysp and "assiette" in sysp:
        out = {"items": [
            {"name": "Pâtes", "user_words": "", "grams": 180, "food_id": "pates_cuites", "kcal_100g": 158, "protein_100g": 5.8, "carbs_100g": 31, "fat_100g": 0.9, "confidence": "moyenne"},
            {"name": "Poulet", "user_words": "", "grams": 150, "food_id": "poulet_cuit", "kcal_100g": 165, "protein_100g": 31, "carbs_100g": 0, "fat_100g": 3.6, "confidence": "moyenne"},
            {"name": "Huile de cuisson", "user_words": "", "grams": 10, "food_id": "huile", "kcal_100g": 884, "protein_100g": 0, "carbs_100g": 0, "fat_100g": 100, "confidence": "basse"}],
            "note": "Portion moyenne, assiette standard."}
        text = json.dumps(out, ensure_ascii=False)
    elif "étiquette" in sysp:
        text = json.dumps({"readable": True, "name": "Muscle Food 101", "kcal_100g": 389, "protein_100g": 21.3, "carbs_100g": 60.2, "fat_100g": 6.1, "serving_g": 100})
    else:
        text = "Il te reste environ 900 kcal : fais-toi un shaker avoine-cacahuète + un bol de riz-poulet."
    resp = {"id": "msg_test", "type": "message", "role": "assistant", "model": body["model"], "stop_reason": "end_turn",
            "content": [{"type": "thinking", "thinking": "", "signature": "sig"}, {"type": "text", "text": text}],
            "usage": {"input_tokens": 1, "output_tokens": 1}}
    route.fulfill(status=200, headers={"access-control-allow-origin": "*", "content-type": "application/json"}, body=json.dumps(resp))

errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, timezone_id="Australia/Perth", locale="fr-FR", has_touch=True, is_mobile=True)
    ctx.add_init_script("""if (!localStorage.getItem('iak')) localStorage.setItem('iak', JSON.stringify('sk-ant-test-9999'));""")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
    page.route("https://api.anthropic.com/**", respond)
    page.clock.install(time=datetime(2026, 10, 7, 20, 15, tzinfo=PERTH))
    page.goto(URL)
    page.wait_for_timeout(500)

    # 1) Texte non reconnu → IA
    page.get_by_role("button", name="✍️ Écrire").first.click()
    page.locator("textarea").fill("un kebab et un coca")
    page.get_by_role("button", name="Analyser").click()
    page.wait_for_timeout(600)
    page.screenshot(path=f"{OUT}/ai-1-kebab.png")
    page.get_by_role("button", name="Ajouter au journal").click()
    page.wait_for_timeout(300)

    # 2) Le kebab est appris : la 2e fois, pas d'appel IA
    n_before = len(calls)
    page.get_by_role("button", name="✍️ Écrire").first.click()
    page.locator("textarea").fill("kebab 300g")
    page.get_by_role("button", name="Analyser").click()
    page.wait_for_timeout(400)
    learned = page.locator(".item-name").first.inner_text()
    print("2e fois sans IA :", len(calls) == n_before, "→", learned)
    page.get_by_role("button", name="Fermer").click()

    # 3) Photo
    page.get_by_role("button", name="📸 Photo").first.click()
    page.locator("input[placeholder^='ex : 170']").fill("environ 180 g de pâtes cuites")
    page.locator("input[type=file][capture]").set_input_files(PHOTO)
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{OUT}/ai-2-photo.png")
    page.get_by_role("button", name="Ajouter au journal").click()
    page.wait_for_timeout(300)

    # 4) Étiquette
    page.get_by_role("button", name="MANGER").click()
    page.get_by_role("button", name="📒 Mes aliments").click()
    page.locator("input[type=file][capture]").set_input_files(PHOTO)
    page.wait_for_timeout(1200)
    page.screenshot(path=f"{OUT}/ai-3-label.png")
    page.get_by_role("button", name="Enregistrer").click()
    page.wait_for_timeout(300)
    page.get_by_role("button", name="Fermer").click()

    # 5) Coach
    page.get_by_role("button", name="COACH").click()
    page.locator(".sugg").first.click()
    page.wait_for_timeout(600)
    page.screenshot(path=f"{OUT}/ai-4-coach.png")

    foods = page.evaluate("JSON.parse(localStorage.getItem('t2:foods') || '[]')")
    print("Aliments appris :", [(f["n"], f["k"], f["p"], f.get("u"), f["src"]) for f in foods])
    b.close()

print("\nAppels API :", len(calls))
for c in calls:
    bd = c["body"]
    kinds = [x.get("type") for m in bd["messages"] for x in (m["content"] if isinstance(m["content"], list) else [{"type": "text"}])]
    print(" -", bd["model"], "| thinking", bd.get("thinking"), "| output_config", {k: (v if k != "format" else v["type"]) for k, v in bd.get("output_config", {}).items()},
          "| max_tokens", bd["max_tokens"], "| temperature" if "temperature" in bd else "| pas de temperature", "| contenu", kinds,
          "| header CORS", c["headers"].get("anthropic-dangerous-direct-browser-access"), "| version", c["headers"].get("anthropic-version"))
coach = [c for c in calls if "coach" in c["body"].get("system", "")]
if coach:
    print("\nContexte envoyé au coach :\n" + coach[0]["body"]["system"].split("Données de son app (à jour) :")[1])
print("\nERREURS :" if errors else "\nAucune erreur.")
for e in errors: print(" ", e)
