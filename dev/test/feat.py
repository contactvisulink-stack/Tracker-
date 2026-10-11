"""Captures : section Posture, lecteur guidé, Glow-up avant / après."""
import json, os, sys
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright
OUT, A, B = sys.argv[1], sys.argv[2], sys.argv[3]
URL = "file://" + os.path.abspath("../../index.html")
P = timezone(timedelta(hours=8))
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, timezone_id="Australia/Perth", locale="fr-FR", has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.clock.install(time=datetime(2026, 10, 8, 19, 0, tzinfo=P))
    page.goto(URL); page.wait_for_timeout(900)
    page.get_by_role("button", name="Sport").click(); page.wait_for_timeout(400)
    page.locator(".top-seg button", has_text="Posture").click(); page.wait_for_timeout(400)
    page.locator(".pz-ex-h").nth(2).click(); page.wait_for_timeout(200)
    page.screenshot(path=f"{OUT}/1-posture.png", full_page=True)
    page.get_by_role("button", name="Lancer la routine").click(); page.wait_for_timeout(400)
    page.screenshot(path=f"{OUT}/2-intro.png")
    page.get_by_role("button", name="C'est parti").click(); page.wait_for_timeout(300)
    page.clock.run_for(2500); page.wait_for_timeout(200)
    page.screenshot(path=f"{OUT}/3-prep.png")
    page.clock.run_for(3000 + 21000); page.wait_for_timeout(200)
    page.screenshot(path=f"{OUT}/4-work.png")
    # aller au livre ouvert (côtés) puis passer la moitié
    for _ in range(3): page.get_by_role("button", name="Passer").click(); page.wait_for_timeout(120)
    page.get_by_role("button", name="Passer").click(); page.wait_for_timeout(120)  # prep → travail livre ouvert
    page.clock.run_for(31000); page.wait_for_timeout(200)
    page.screenshot(path=f"{OUT}/5-cote2.png")
    page.clock.run_for(30500); page.wait_for_timeout(500)
    page.screenshot(path=f"{OUT}/6-fin.png")
    done = json.loads(page.evaluate("localStorage.getItem('t2:day:2026-10-08')") or "{}").get("h", {}).get("posture")
    print("posture cochée :", done)
    page.get_by_role("button", name="Fermer").first.click(); page.wait_for_timeout(300)
    # Glow-up
    page.get_by_role("button", name="Progrès").click(); page.wait_for_timeout(300)
    page.locator(".top-seg button", has_text="Glow-up").click(); page.wait_for_timeout(500)
    page.screenshot(path=f"{OUT}/7-glowup-vide.png")
    page.clock.set_system_time(datetime(2026, 9, 24, 19, 0, tzinfo=P))
    page.evaluate("dispatchEvent(new Event('focus'))"); page.wait_for_timeout(300)
    page.locator("input[type=file]:not([capture])").set_input_files(A); page.wait_for_timeout(1500)
    page.clock.set_system_time(datetime(2026, 10, 8, 19, 0, tzinfo=P))
    page.evaluate("dispatchEvent(new Event('focus'))"); page.wait_for_timeout(300)
    page.locator("input[type=file]:not([capture])").set_input_files(B); page.wait_for_timeout(1500)
    box = page.locator(".gu-cmp").bounding_box()
    if box:
        page.mouse.move(box["x"] + box["width"] * 0.5, box["y"] + box["height"] * 0.5); page.mouse.down()
        page.mouse.move(box["x"] + box["width"] * 0.62, box["y"] + box["height"] * 0.5, steps=5); page.mouse.up()
    page.wait_for_timeout(300)
    page.screenshot(path=f"{OUT}/8-glowup.png", full_page=True)
    print("photos :", page.locator(".gu-th").count(), " lastPhoto :", page.evaluate("localStorage.getItem('t2:lastPhoto')"))
    b.close()
print(errs or "aucune erreur")
