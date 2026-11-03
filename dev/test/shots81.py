"""Captures du patch 8.1 « L'Affiche » : affiches, grands moments, fiches, skins, nouvel utilisateur."""
import os, sys
from datetime import datetime
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(__file__))
from seed8 import build, init_script, route_fonts, P

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
URL = "file://" + os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else "../index.html")
ONLY = sys.argv[3].split(",") if len(sys.argv) > 3 else None
data = build()
ALL_ACH = ["first_blood","farmer","farmer7","farmer30","streak5","streak14","legendary","bigday","prot7","dex25","dex50","boss1","boss4","sleep1","sleep7","early_bed","clock5","vision7","cast1","triple","regular4","ult1","ult10","plus1","posture10","crea28","habit21","glow","promo","tier","half","challenger","penta","penta5"]
SEEN = {"t2:seen": {"v": 1, "ach": ALL_ACH, "lvl": 999, "step": 99, "boss": "2026-11-02", "patch": "8.1"}, "t2:loadSeen": "2026-11-03", "t2:ann:2026-11-03": {"ids": ["prot", "sleep", "crea", "train"]}}
errors = []

def scene(b, name, when, extra=None, seen=True, wait=1600, act=None, empty=False, scrolls=0):
    if ONLY and name not in ONLY: return
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, timezone_id="Australia/Perth", locale="fr-FR", has_touch=True, is_mobile=True)
    ex = {**(SEEN if seen else {}), **(extra or {})}
    ctx.add_init_script(init_script({} if empty else data, ex))
    page = ctx.new_page()
    route_fonts(page)
    page.on("pageerror", lambda e, n=name: errors.append(f"[{n}] pageerror: {e}"))
    page.on("console", lambda m, n=name: errors.append(f"[{n}] {m.type}: {m.text}") if m.type == "error" and "ERR_" not in m.text else None)
    page.clock.install(time=when)
    page.goto(URL)
    page.wait_for_timeout(wait)
    if act: act(page)
    page.screenshot(path=f"{OUT}/{name}.png")
    for i in range(1, scrolls + 1):
        page.evaluate(f"window.scrollTo(0,{700 * i})"); page.wait_for_timeout(350)
        page.screenshot(path=f"{OUT}/{name}-{i}.png")
    ctx.close()

def role(name, wait=700):
    def f(page):
        page.get_by_role("button", name=name, exact=True).first.click(); page.wait_for_timeout(wait)
    return f
def seq(*fs):
    def f(page):
        for x in fs: x(page)
    return f

with sync_playwright() as p:
    b = p.chromium.launch()
    T = datetime(2026, 11, 3, 21, 30, tzinfo=P)
    scene(b, "a-aube", datetime(2026, 11, 3, 7, 10, tzinfo=P))
    scene(b, "a-jour", datetime(2026, 11, 3, 10, 40, tzinfo=P))
    scene(b, "a-tard", datetime(2026, 11, 3, 23, 20, tzinfo=P))
    scene(b, "p-kill", T, extra={"t2:ann:2026-11-03": {"ids": ["prot", "sleep", "crea"]}}, wait=900)
    scene(b, "p-level", T, extra={"t2:seen": {**SEEN["t2:seen"], "lvl": 12}}, wait=900)
    scene(b, "k-codex", T, act=seq(role("Profil"), role("Codex")))
    scene(b, "l-patch", T, act=seq(role("Profil"), role("Notes de patch")))
    scene(b, "q-runes", T, act=role("Runes et réglages"))
    scene(b, "r-ajout", T, act=role("Ajouter un repas"))
    scene(b, "s-coach", T, act=role("Coach"))
    st = {**data["t2:settings"], "skin": "neon"}
    scene(b, "u-graffiti", T, extra={"t2:settings": st}, scrolls=1)
    scene(b, "u-graffiti-farm", T, extra={"t2:settings": st}, act=role("Farm"))
    scene(b, "v-vide", T, seen=False, empty=True, wait=1800)
    scene(b, "w-victoire", T, act=lambda pg: (pg.locator(".wk:not([disabled])").first.click(), pg.wait_for_timeout(900)))
    scene(b, "x-parties", T, act=seq(role("Profil"), role("Parties")), scrolls=2)
    scene(b, "y-succes", T, act=seq(role("Profil"), role("Succès")), scrolls=1)
    scene(b, "z-load", datetime(2026, 11, 3, 9, 50, tzinfo=P), extra={"t2:loadSeen": "2026-11-02"}, wait=900)
    b.close()
print("\n".join(errors) if errors else "Aucune erreur.")
