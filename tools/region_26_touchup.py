#!/usr/bin/env python3
"""Light touch-up for region 26 (Wind Cliffs) — KEEPS the original design intact
and only APPENDS a few extra rocks and some background cloud variance for depth.

Not an overhaul. Loads the current region_26.json, appends sprites, writes back.
Deterministic (fixed seed). Uses per-sprite `alpha` for faint background clouds.
"""
import json, os, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "regions", "region_26.json")
rng = random.Random(2626)

SAND  = "assets_custom/rocks_sand"
CLOUD = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Clouds"

data = json.load(open(PATH))
sprites = data["sprites"]
_n = 0
def sid():
    global _n; _n += 1
    return f"s_r26_tu{_n:03d}"

def add(dir_, frame, x, y, sx, sy=None, off=(32, 63), alpha=None, name=None):
    s = {"type": "sprite", "spriteId": sid(), "dir": dir_, "frames": [frame],
         "name": name or frame.rsplit('.', 1)[0], "animated": False, "spriteLayer": "below",
         "x": round(x, 2), "y": round(y, 2),
         "scaleX": round(sx, 3), "scaleY": round(sy if sy is not None else sx, 3),
         "offsetX": off[0], "offsetY": off[1]}
    if alpha is not None:
        s["alpha"] = round(alpha, 3)
    sprites.append(s)

def rock():
    return rng.choice(["Rock1.png", "Rock2.png", "Rock3.png", "Rock4.png"])

# ── Background variance: layered clouds (faint distant → soft near) ───────────
# Faint far haze high in the sky.
for _ in range(10):
    add(CLOUD, "Clouds_01.png", rng.uniform(60, 3140), rng.uniform(60, 700),
        rng.uniform(0.4, 0.7), off=(288, 128), alpha=rng.uniform(0.20, 0.40), name="Clouds_01")
# A few broad soft cloud banks for subtle depth.
for _ in range(6):
    add(CLOUD, "Clouds_01.png", rng.uniform(100, 3100), rng.uniform(120, 1700),
        rng.uniform(0.95, 1.4), off=(288, 128), alpha=rng.uniform(0.30, 0.55), name="Clouds_01")
# A couple of small crisp clouds near the original cloud scatter.
for _ in range(6):
    add(CLOUD, "Clouds_01.png", rng.uniform(80, 3120), rng.uniform(80, 1850),
        rng.uniform(0.55, 0.8), off=(288, 128), alpha=rng.uniform(0.7, 0.95), name="Clouds_01")

# ── A few more rocks (same scattered style as the original) ───────────────────
for _ in range(22):
    x = rng.uniform(60, 3140); y = rng.uniform(120, 1880)
    if abs(x - 1500) < 130 and abs(y - 908) < 130:   # leave the carving readable
        continue
    add(SAND, rock(), x, y, rng.uniform(1.4, 2.4), name="Rock")

json.dump(data, open(PATH, "w"), indent=1, ensure_ascii=False)
print(f"region_26 touched up: now {sum(1 for s in sprites if s['type']=='sprite')} images "
      f"(+{_n} appended)")
