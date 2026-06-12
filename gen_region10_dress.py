#!/usr/bin/env python3
"""
Region 10 "Sunless Deep" — redress after the reference art: a bioluminescent
underground forest. Dense teal-canopy groves fringe the cavern walls with
golden accent copses, weathered obelisk shrines stand torch-lit in the
clearings, a winding dirt path loops the underground lake (now dotted with
lily pads and reeds), and a crimson waymarker flag marks the lakeside camp.

Loads the existing region JSON (keeping gameplay: zones, enemies, boss, npcs,
portals, hand-edited portal targets) and appends only decorative props plus
under-everything path strokes. Deterministic and idempotent.
"""
import json, math, random

SRC = "regions/region_10.json"
random.seed(1010)

PROPS = "assets_custom/props"
# (canvasW, canvasH, originX, originY) — base-anchored unless noted
ANCHOR = {
    "tree_teal": (92, 124, 46, 122),
    "tree_gold": (92, 124, 46, 122),
    "obelisk":   (52, 148, 26, 146),
    "dead_tree": (96, 132, 48, 130),
    "reed":      (34, 74, 17, 72),
    "torch":     (30, 66, 15, 65),
    "flag_red":  (58, 112, 13, 110),
    "lily_pad":  (44, 28, 22, 14),   # flat on the water: centre anchor
}

# ---- cavern geometry (mirrors gen_region10.py — keep the two in sync) -------
def center_y(x):
    return 1000 + 150 * math.sin(x / 520.0) + 70 * math.sin(x / 190.0 + 1.0)
CHAMBERS = [(400, 360), (1300, 430), (1720, 360), (2650, 470)]
def half_h(x):
    base = 230
    for cx, cr in CHAMBERS:
        base = max(base, cr * math.exp(-((x - cx) ** 2) / (2 * 360.0 ** 2)))
    return base
def cav_top(x): return center_y(x) - half_h(x)
def cav_bot(x): return center_y(x) + half_h(x)
def in_cavern(x, y): return cav_top(x) - 4 < y < cav_bot(x) + 4
PILLARS = [(950, 880, 95), (1250, 1180, 95), (1980, 820, 105), (2230, 1230, 105)]
LAKE = (1330, 1130, 250, 150)
def in_lake(x, y):
    return ((x - LAKE[0]) / LAKE[2]) ** 2 + ((y - LAKE[1]) / LAKE[3]) ** 2 < 1

d = json.load(open(SRC))
sprites = d["sprites"]

# idempotent: drop anything this script added on a previous run
sprites[:] = [s for s in sprites if not str(s.get("spriteId", "")).startswith("s_r10d_")]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r10d_{_n[0]:04d}"

def prop(name, x, y, scale):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

new = []

# --- winding dirt path along the cavern + a loop ringing the lake -------------
# Inserted at the FRONT of the sprite list so the stroke canvas paints it first
# and the existing lake water strokes (later in the list) cover the crossing.
path_pts = []
for x in range(40, 3201, 80):
    path_pts.extend([x, round(center_y(x), 2)])
ring_pts = []
for t in range(0, 361, 15):
    a = math.radians(t)
    ring_pts.extend([round(LAKE[0] + math.cos(a) * LAKE[2] * 1.45, 2),
                     round(LAKE[1] + math.sin(a) * LAKE[3] * 1.45, 2)])
strokes = []
for width, col in ((124, "#382a1c"), (66, "#463420")):
    for pts in (path_pts, ring_pts):
        strokes.append({"type": "stroke", "spriteId": sid(), "stroke": col,
            "strokeWidth": width, "lineCap": "round", "lineJoin": "round",
            "composite": "source-over", "points": pts})
sprites[0:0] = strokes

# --- obelisk shrines, torch-lit, in clearings near the chamber edges ----------
# placed early so they win the engine's capped light-pool budget.
SHRINES = [(430, "t"), (1130, "t"), (1660, "b"), (2480, "t"), (870, "b")]
for sx, side in SHRINES:
    base_y = (cav_top(sx) + random.uniform(70, 110)) if side == "t" \
        else (cav_bot(sx) - random.uniform(70, 110))
    k = random.randint(2, 3)
    for i in range(k):
        new.append(prop("obelisk", sx + (i - (k - 1) / 2) * random.uniform(42, 56),
                        base_y + random.uniform(-10, 18), random.uniform(1.5, 2.0)))
    new.append(prop("torch", sx + random.uniform(38, 60),
                    base_y + random.uniform(20, 34), random.uniform(1.6, 2.0)))

# --- lakeside camp: crimson waymarker on the loop path south of the water -----
new.append(prop("flag_red", 1190, 1370, 1.5))
new.append(prop("torch", 1238, 1382, 1.7))

# --- golden accent copses (the warm clumps in the reference) ------------------
GOLD = [(1050, -1), (1850, -1), (2950, -1), (640, 1), (1550, 1), (2450, 1), (3020, 1)]
for gx, side in GOLD:
    edge = cav_top(gx) if side < 0 else cav_bot(gx)
    cy = edge + side * random.uniform(70, 130)
    for _ in range(random.randint(2, 4)):
        new.append(prop("tree_gold", gx + random.uniform(-70, 70),
                        cy + side * random.uniform(0, 60), random.uniform(1.3, 1.9)))

# --- teal groves fringing both cavern walls, end to end -----------------------
for x in range(140, 3100, 150):
    for side in (-1, 1):
        if random.random() < 0.22:
            continue
        edge = cav_top(x) if side < 0 else cav_bot(x)
        cy = edge + side * random.uniform(50, 150)
        for _ in range(random.randint(2, 4)):
            tx = x + random.uniform(-75, 75)
            ty = cy + side * random.uniform(0, 70)
            if in_cavern(tx, ty + 6):
                continue   # keep trunks off the walkable band
            kind = "tree_gold" if random.random() < 0.08 else "tree_teal"
            new.append(prop(kind, tx, ty, random.uniform(1.35, 2.0)))

# --- two great dead trees looming out of the rock (right + upper-left) --------
new.append(prop("dead_tree", 2360, cav_bot(2360) + random.uniform(70, 110), 2.6))
new.append(prop("dead_tree", 760, cav_top(760) - random.uniform(60, 100), 2.2))

# --- the lake: lily pads on the still water, reeds along the bank -------------
for a_deg, rr in [(20, 0.45), (95, 0.3), (160, 0.5), (210, 0.4), (285, 0.5), (335, 0.25)]:
    a = math.radians(a_deg)
    new.append(prop("lily_pad", LAKE[0] + math.cos(a) * LAKE[2] * rr,
                    LAKE[1] + math.sin(a) * LAKE[3] * rr, random.uniform(1.6, 2.4)))
for a_deg in (30, 110, 200, 250, 320):
    a = math.radians(a_deg)
    new.append(prop("reed", LAKE[0] + math.cos(a) * LAKE[2] * 1.12,
                    LAKE[1] + math.sin(a) * LAKE[3] * 1.18, random.uniform(1.4, 1.9)))

# --- clear wall rocks beneath the groves so each clump reads on dark earth ----
ROCK_DIR = ("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)"
            "/Terrain/Decorations/Rocks")
clear_pts = [(s["x"], s["y"]) for s in new
             if s["name"] in ("tree_teal", "tree_gold", "dead_tree")]
sprites[:] = [s for s in sprites if not (
    s.get("dir") == ROCK_DIR
    and any(abs(s["x"] - px) < 80 and abs(s["y"] - py) < 60 for px, py in clear_pts))]

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)

from collections import Counter
print(f"region_10: +{len(new)} props, +{len(strokes)} strokes, {len(sprites)} total sprites")
print("added:", dict(Counter(s["name"] for s in new)))
