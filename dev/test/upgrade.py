"""La mise à jour garde-t-elle les données ? On remplit la version en ligne, puis on installe
la nouvelle au même endroit (même adresse, comme sur l'iPhone) et on compare tout.
Usage : python3 test/upgrade.py ANCIEN.html NOUVEAU.html DOSSIER_CAPTURES"""
import json, os, sys, shutil, threading, http.server, functools, socketserver
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright

OLD, NEW, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
SITE = os.path.join(OUT, "site"); os.makedirs(SITE, exist_ok=True)
shutil.copy(OLD, os.path.join(SITE, "index.html"))
P = timezone(timedelta(hours=8))
checks, errors, calls = [], [], []
ok = lambda n, c, x="": checks.append(("✅" if c else "❌") + " " + n + (f" ({x})" if x else ""))

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self): self.send_header("Cache-Control", "no-store"); super().end_headers()
srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=SITE))
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{port}/index.html"

PLAN = {"reply": "Ok, sortie ce soir ! Mange un vrai dîner à **19 h 30** avant de partir, de l'eau entre les verres, et un shaker en rentrant.",
        "update_plan": True,
        "plan": {"summary": "Sortie ce soir : dîner à 19 h 30, coucher vers 2 h 30, séance demain",
                 "bedtime": "02:30", "training": "tomorrow",
                 "meals": [{"time": "19:30", "label": "Dîner avant de sortir", "kcal": 1000, "idea": "Pâtes crémeuses poulet"},
                           {"time": "02:00", "label": "En rentrant", "kcal": 450, "idea": "Shaker whey + lait + banane"}]}}
def api(route, request):
    if request.method == "OPTIONS":
        return route.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*"})
    body = json.loads(request.post_data); calls.append(body)
    text = json.dumps(PLAN, ensure_ascii=False)
    route.fulfill(status=200, headers={"access-control-allow-origin": "*", "content-type": "application/json"},
                  body=json.dumps({"content": [{"type": "text", "text": text}], "stop_reason": "end_turn"}))

HEVY_C = """Full body C 🏋️‍♂️
Le jeudi, oct. 08, 2026 à 4:40pm

Développé Épaules (Haltère)
Série 1: 10 kg x 12
Série 2: 10 kg x 11
Série 3: 10 kg x 10

Soulevé de Terre Roumain (Haltère)
Série 1: 12.5 kg x 12
Série 2: 12.5 kg x 12
Série 3: 12.5 kg x 12

Rowing Poulie Assis Prise V
Série 1: 30 kg x 12
Série 2: 30 kg x 12
Série 3: 30 kg x 10

Écarté Poulie
Série 1: 10 kg x 15
Série 2: 10 kg x 14
Série 3: 10 kg x 12

Développé Serré Haltère
Série 1: 12.5 kg x 10
Série 2: 12.5 kg x 9

Extension Jambes
Série 1: 30 kg x 15
Série 2: 30 kg x 14

Curl Pupitre (Barre)
Série 1: 15 kg x 12
Série 2: 15 kg x 12

@hevyapp
https://hevy.com/workout/c-du-8-oct"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, timezone_id="Australia/Perth", locale="fr-FR", has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" and "ERR_" not in m.text and "Failed to load" not in m.text else None)
    page.route("https://api.anthropic.com/**", api)
    page.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    page.route("https://api.open-meteo.com/**", lambda r: r.abort())
    dump = lambda: page.evaluate("() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; }")

    # ── 1) Hier, avec la version EN LIGNE : il note sa journée et importe sa séance C modifiée
    page.clock.install(time=datetime(2026, 10, 8, 10, 0, tzinfo=P))
    page.goto(URL); page.wait_for_timeout(800)
    page.evaluate("localStorage.setItem('iak', JSON.stringify('sk-ant-test-0000'))")
    page.evaluate("localStorage.setItem('iwt', JSON.stringify({'2026-09-28': 51.6, '2026-10-05': 52.1}))")
    page.reload(); page.wait_for_timeout(600)
    page.get_by_role("button", name="Ajouter un repas").first.click(); page.wait_for_timeout(300)
    page.locator(".sheet textarea").fill("196 ml lait entier, 100g yogourt, 90g flocons d'avoine, 20g whey, 5g créatine, 27g beurre de cacahuète")
    page.get_by_role("button", name="Analyser").click(); page.wait_for_timeout(300)
    page.get_by_role("button", name="Ajouter au journal").click(); page.wait_for_timeout(300)
    page.locator(".mrow", has_text="Eau").click(); page.wait_for_timeout(150)
    page.get_by_role("button", name="Sport").click(); page.wait_for_timeout(300)
    page.get_by_role("button", name="Importer une séance Hevy").click(); page.wait_for_timeout(300)
    page.locator(".sheet textarea").fill(HEVY_C); page.wait_for_timeout(200)
    page.get_by_role("button", name="Enregistrer la séance").click(); page.wait_for_timeout(500)
    page.clock.set_system_time(datetime(2026, 10, 8, 21, 0, tzinfo=P)); page.evaluate("dispatchEvent(new Event('focus'))")
    page.get_by_role("button", name="Accueil").click(); page.wait_for_timeout(300)
    page.locator(".suggest").click(); page.wait_for_timeout(300)
    before = dump()
    old_c = [e["name"] for w in json.loads(before["t2:workouts"]) if w.get("session") == "C" for e in w["exercises"]]
    ok("ancienne version : séance C enregistrée", "Curl Pupitre (Barre)" in old_c, f"{len(old_c)} exercices")
    page.screenshot(path=f"{OUT}/1-ancienne-version.png")

    # ── 2) Mise à jour : nouvelle version au même endroit
    shutil.copy(NEW, os.path.join(SITE, "index.html"))
    page.clock.set_system_time(datetime(2026, 10, 9, 13, 0, tzinfo=P))
    page.reload(); page.wait_for_timeout(1200)
    after = dump()
    lost = [k for k in before if k not in after]
    changed = [k for k in before if k in after and before[k] != after[k] and not k.startswith("t2:cel") and k not in ("t2:wx", "t2:timer")]
    ok("aucune donnée perdue", not lost, ", ".join(lost))
    ok("aucune donnée modifiée", not changed, ", ".join(changed))
    ok("repas d'hier toujours là", len(json.loads(after["t2:day:2026-10-08"])["entries"]) == 2)
    ok("poids et clé toujours là", json.loads(after["iwt"]).get("2026-10-05") == 52.1 and json.loads(after["iak"]) == "sk-ant-test-0000")
    page.screenshot(path=f"{OUT}/2-apres-maj.png")

    # ── 3) Sport : le curl pupitre est reconnu, l'écarté poulie est détecté
    page.get_by_role("button", name="Sport").click(); page.wait_for_timeout(400)
    ok("carte « ta séance C a changé »", page.locator(".diff").count() == 1)
    diff_names = page.locator(".diff .diff-n").all_inner_texts()
    ok("seul l'écarté poulie est nouveau (curl pupitre reconnu)", len(diff_names) == 1 and "Écarté Poulie" in diff_names[0], " | ".join(diff_names))
    sel = page.locator(".diff select").input_value()
    ok("proposé à la place de l'écarté machine", sel == "pecdeck", sel)
    page.screenshot(path=f"{OUT}/3-sport-diff.png", full_page=True)
    page.locator(".diff").get_by_role("button", name="Mettre à jour").click(); page.wait_for_timeout(400)
    page.locator(".seg button", has_text="Séance C").click(); page.wait_for_timeout(300)
    names = page.locator(".ex-name").all_inner_texts()
    ok("séance C à jour", "Écarté Poulie" in names and "Curl Pupitre" in names and "Écarté Machine" not in names and "Curl Marteau" not in names, " · ".join(names))
    tgt = {n: t for n, t in zip(names, page.locator(".ex-target").all_inner_texts())}
    ok("curl pupitre : 12/12 atteint → monter à 17,5 kg", "17,5" in tgt.get("Curl Pupitre", ""), tgt.get("Curl Pupitre"))
    ok("charge de l'écarté poulie suggérée", "10" in tgt.get("Écarté Poulie", ""), tgt.get("Écarté Poulie"))
    ok("séance d'hier intacte dans le stockage", dump()["t2:workouts"] == before["t2:workouts"])
    page.screenshot(path=f"{OUT}/4-sport-c.png", full_page=True)
    # éditeur manuel
    page.get_by_role("button", name="Modifier la séance C").click(); page.wait_for_timeout(300)
    ok("éditeur de séance", page.locator(".pe-row").count() == 7)
    page.screenshot(path=f"{OUT}/5-editeur.png")
    page.get_by_role("button", name="Fermer").click(); page.wait_for_timeout(200)

    # ── 4) Le coach réorganise la journée
    page.get_by_role("button", name="Accueil").click(); page.wait_for_timeout(300)
    page.locator(".agent .chip", has_text="Ce soir je sors").click(); page.wait_for_timeout(1200)
    plan = json.loads(dump().get("t2:plan:2026-10-09", "null") or "null")
    ok("plan du jour enregistré", plan and plan["bedtime"] == "02:30" and len(plan["meals"]) == 2)
    ok("réponse du coach affichée", "19 h 30" in page.locator(".msg.assistant").last.inner_text())
    page.screenshot(path=f"{OUT}/6-coach.png")
    page.get_by_role("button", name="Fermer").click(); page.wait_for_timeout(300)
    page.screenshot(path=f"{OUT}/7-accueil-plan.png", full_page=True)
    ok("carte « journée réorganisée »", page.locator(".plan").count() == 1)
    bed = page.locator(".mrow", has_text="Poser le téléphone .ms" if False else "Poser le téléphone").inner_text()
    ok("mission coucher suit le plan", "2 h 30" in bed, bed.replace("\n", " "))
    # 23 h 30 : plus de « Je pose le téléphone » forcé
    page.clock.set_system_time(datetime(2026, 10, 9, 23, 30, tzinfo=P)); page.evaluate("dispatchEvent(new Event('focus'))"); page.wait_for_timeout(400)
    ok("pas de coucher imposé à 23 h 30", page.get_by_role("button", name="🌙 Je pose le téléphone").count() == 0)
    page.clock.set_system_time(datetime(2026, 10, 10, 2, 5, tzinfo=P)); page.evaluate("dispatchEvent(new Event('focus'))"); page.wait_for_timeout(400)
    ok("à 2 h 05, le coucher est proposé", page.get_by_role("button", name="🌙 Je pose le téléphone").count() == 1)
    page.screenshot(path=f"{OUT}/8-2h.png")
    # revenir au plan normal + annuler
    page.get_by_role("button", name="Revenir au plan normal").click(); page.wait_for_timeout(300)
    ok("plan retiré", dump().get("t2:plan:2026-10-09") is None)
    page.get_by_role("button", name="Annuler").click(); page.wait_for_timeout(300)
    ok("annuler remet le plan", dump().get("t2:plan:2026-10-09") is not None)
    b.close()
srv.shutdown()
print("\n".join(checks))
c = calls[0] if calls else {}
print(f"\nAppel coach : modèle {c.get('model')}, format {c.get('output_config', {}).get('format', {}).get('type')}, thinking {c.get('thinking')}, temperature absente : {'temperature' not in c}")
print("\n".join(errors) if errors else "Aucune erreur console.")
