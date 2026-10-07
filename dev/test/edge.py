import json, os, sys
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright
URL = "file://" + os.path.abspath("../index.html")
PERTH = timezone(timedelta(hours=8))
engine = sys.argv[1] if len(sys.argv) > 1 else "chromium"
errs = []
with sync_playwright() as p:
    try:
        b = getattr(p, engine).launch()
    except Exception as e:
        print(engine, "indisponible :", str(e).splitlines()[0]); raise SystemExit
    ctx = b.new_context(viewport={"width": 390, "height": 844}, timezone_id="Australia/Perth", locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.clock.install(time=datetime(2026, 10, 8, 1, 30, tzinfo=PERTH))
    page.goto(URL); page.wait_for_timeout(500)
    print(engine, "| en-tête à 1 h 30 :", page.locator(".eyebrow").inner_text())
    page.get_by_role("button", name="✍️ Écrire").first.click()
    page.locator("textarea").fill("1 banane, 2 c.s. beurre de cacahuète")
    page.get_by_role("button", name="Analyser").click(); page.wait_for_timeout(200)
    page.get_by_role("button", name="Ajouter au journal").click(); page.wait_for_timeout(200)
    d7 = json.loads(page.evaluate("localStorage.getItem('t2:day:2026-10-07')") or "{}")
    print("   encas de 1 h 30 rangé le 07/10 :", [(e['label'], e['t'], [(i['name'], i['g']) for i in e['items']]) for e in d7.get('entries', [])])
    page.clock.set_system_time(datetime(2026, 10, 8, 5, 1, tzinfo=PERTH))
    page.evaluate("window.dispatchEvent(new Event('focus'))"); page.wait_for_timeout(300)
    print("   en-tête à 5 h 01 :", page.locator(".eyebrow").inner_text(), "| calories affichées :", page.locator(".bar .val").first.inner_text())
    b.close()
print("   erreurs JS :", errs or "aucune")
