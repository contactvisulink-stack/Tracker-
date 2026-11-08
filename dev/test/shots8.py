"""Captures du patch 8 « Le Reforge » à différents moments, avec 5 semaines de données réalistes."""
import json, os, sys
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(__file__))
from seed8 import build, init_script, route_fonts, P

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
URL = "file://" + os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else "../index.html")
ONLY = sys.argv[3].split(",") if len(sys.argv) > 3 else None
data = build()
ALL_ACH = ["first_blood","farmer","farmer7","farmer30","streak5","streak14","legendary","bigday","prot7","dex25","dex50","boss1","boss4","sleep1","sleep7","early_bed","clock5","vision7","cast1","triple","regular4","ult1","ult10","plus1","posture10","crea28","habit21","glow","promo","tier","half","challenger","penta","penta5"]
SEEN = {"t2:seen": {"v": 1, "ach": ALL_ACH, "lvl": 999, "step": 99, "boss": "2026-11-02", "patch": "9.0"}, "t2:loadSeen": "2026-11-03", "t2:ann:2026-11-03": {"ids": ["prot", "sleep", "crea", "train"]}}
errors = []

def scene(b, name, when, extra=None, seen=True, full=True, act=None):
    if ONLY and name not in ONLY: return
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, timezone_id="Australia/Perth", locale="fr-FR", has_touch=True, is_mobile=True)
    ex = {**(SEEN if seen else {}), **(extra or {})}
    ctx.add_init_script(init_script(data, ex))
    page = ctx.new_page()
    route_fonts(page)
    page.on("pageerror", lambda e, n=name: errors.append(f"[{n}] pageerror: {e}"))
    page.on("console", lambda m, n=name: errors.append(f"[{n}] {m.type}: {m.text}") if m.type == "error" and "ERR_" not in m.text else None)
    page.clock.install(time=when)
    page.goto(URL)
    page.wait_for_timeout(1600)
    if act: act(page)
    page.screenshot(path=f"{OUT}/{name}.png")
    if full:
        h = page.evaluate("document.documentElement.scrollHeight")
        y, i = 700, 1
        while y < h - 200 and i < 6:
            page.evaluate(f"window.scrollTo(0,{y})"); page.wait_for_timeout(350)
            page.screenshot(path=f"{OUT}/{name}-{i}.png")
            y += 700; i += 1
    ctx.close()

def click(sel, wait=700):
    def f(page):
        page.locator(sel).first.click(); page.wait_for_timeout(wait)
    return f
def seq(*fs):
    def f(page):
        for x in fs: x(page)
    return f
def role(name, wait=700):
    def f(page):
        page.get_by_role("button", name=name, exact=True).first.click(); page.wait_for_timeout(wait)
    return f
def scroll(y):
    def f(page):
        page.evaluate(f"window.scrollTo(0,{y})"); page.wait_for_timeout(400)
    return f

with sync_playwright() as p:
    b = p.chromium.launch()
    T = datetime(2026, 11, 3, 21, 30, tzinfo=P)
    scene(b, "a-home", T)
    scene(b, "b-midi", datetime(2026, 11, 3, 14, 20, tzinfo=P))
    scene(b, "c-load", datetime(2026, 11, 3, 9, 50, tzinfo=P), extra={"t2:loadSeen": "2026-11-02"}, full=False, act=lambda pg: pg.wait_for_timeout(300))
    scene(b, "d-welcome", T, seen=False, full=False)
    scene(b, "e-farm", T, act=role("Farm"))
    scene(b, "f-arene", T, act=role("Arène"))
    scene(b, "g-profil", T, act=role("Profil"))
    scene(b, "h-parties", T, act=seq(role("Profil"), role("Parties")))
    scene(b, "i-succes", T, act=seq(role("Profil"), role("Succès")))
    scene(b, "j-item", T, act=lambda pg: (pg.locator(".islot").first.dispatch_event("pointerdown", {"clientX": 50, "clientY": 500}), pg.wait_for_timeout(700)), full=False)
    scene(b, "k-codex", T, act=seq(role("Profil"), role("Codex")), full=False)
    scene(b, "l-patch", T, act=seq(role("Profil"), role("Notes de patch")), full=False)
    scene(b, "m-boss", T, act=click(".bossc"), full=False)
    scene(b, "n-fin", datetime(2026, 11, 4, 1, 20, tzinfo=P), act=role("Je pose le téléphone", 1400), full=False)
    scene(b, "o-nuit", datetime(2026, 11, 4, 3, 40, tzinfo=P), extra={"t2:night": {"bed": "2026-11-03T16:10:00.000Z"}})
    scene(b, "p-kill", T, extra={"t2:ann:2026-11-03": {"ids": ["prot", "sleep", "crea"]}}, full=False, act=lambda pg: pg.wait_for_timeout(100))
    scene(b, "q-runes", T, act=role("Runes et réglages"), full=False)
    scene(b, "r-ajout", T, act=role("Ajouter un repas"), full=False)
    scene(b, "s-posture", T, act=seq(role("Arène"), lambda pg: (pg.locator(".top-seg button", has_text="Posture").click(), pg.wait_for_timeout(500))))
    scene(b, "t-classe-bas", T, act=seq(role("Profil"), scroll(1300)), full=False)
    b.close()
print("\n".join(errors) if errors else "Aucune erreur.")
