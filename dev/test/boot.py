"""Images du démarrage du cadran (allumage) à 0,15 s, 0,45 s, 0,8 s et 1,4 s."""
import json, os, sys
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright
sys.argv += []
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
URL = "file://" + os.path.abspath(sys.argv[2])
P = timezone(timedelta(hours=8))
import importlib.util
spec = importlib.util.spec_from_file_location("s6", os.path.join(os.path.dirname(__file__), "shots6.py"))
src = open(os.path.join(os.path.dirname(__file__), "shots6.py")).read()
pre = src[:src.index("errors = []")].replace("OUT = sys.argv[1]", "OUT = '/tmp'").replace("os.makedirs(OUT, exist_ok=True)", "")
ns = {}; exec(pre, ns)
data = ns["BASE"]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, timezone_id="Australia/Perth", locale="fr-FR", has_touch=True, is_mobile=True)
    ctx.add_init_script(";".join(f"localStorage.setItem({json.dumps(k)}, {json.dumps(json.dumps(v))})" for k, v in data.items()) + ";localStorage.setItem('t2:cel:2026-10-07', JSON.stringify({kcal:true,prot:true,sleep:true,all:true}))")
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.clock.install(time=datetime(2026, 10, 7, 21, 30, tzinfo=P))
    page.clock.pause_at(datetime(2026, 10, 7, 21, 30, tzinfo=P))
    page.goto(URL)
    last = 0
    for ms in (150, 450, 800, 1400):
        page.clock.run_for(ms - last); last = ms
        page.wait_for_timeout(120)
        page.locator(".dial").screenshot(path=f"{OUT}/boot-{ms}.png")
    print(errs or "ok")
    b.close()
