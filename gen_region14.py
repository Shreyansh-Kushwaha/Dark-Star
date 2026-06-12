#!/usr/bin/env python3
"""
Region 14 "Stone Gate" — dress the scene to match the reference graveyard-gate
art: dark cypress clusters and two still pools in the rock-field borders,
scattered fire torches, a crimson waymarker flag and extra skulls around the
gate. Loads the existing region (keeping path, gate, enemies, portals, NPC,
no-walk zones) and appends only the new decorative props. Deterministic.
"""
import json, random

SRC = "regions/region_14.json"
random.seed(1414)

PROPS = "assets_custom/props"
# base-anchored props: (canvasW, canvasH) -> origin offset (W/2, H-1)
ANCHOR = {
    "cypress":  (72, 144, 36, 143),
    "torch":    (30, 66, 15, 65),
    "flag_red": (58, 112, 13, 110),
    "pond":     (148, 88, 74, 44),   # flat water: centre anchor
}

d = json.load(open(SRC))
sprites = d["sprites"]

# idempotent: drop anything this script added on a previous run (ids >= 0500)
sprites[:] = [s for s in sprites if not str(s.get("spriteId", "")).startswith("s_r14_05")]

# continue the spriteId sequence well clear of existing ids (max ~0406)
_n = [500]
def sid():
    _n[0] += 1
    return f"s_r14_{_n[0]:04d}"

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

# --- cypress clusters in the non-walkable rock-field borders (y<660 / y>1360) ---
TOP = [(250, 180), (620, 300), (1080, 200), (1980, 260), (2520, 180), (3000, 320)]
BOT = [(380, 1700), (980, 1820), (1640, 1640), (2300, 1780), (2880, 1680)]
for cx, cy in TOP + BOT:
    # clear rocks under the copse so the dark cypress read as a distinct clump
    sprites[:] = [s for s in sprites if not (
        s.get("dir") == "assets_custom/rocks_sand"
        and abs(s["x"] - cx) < 130 and abs(s["y"] - cy) < 95)]
    for _ in range(random.randint(3, 5)):
        x = cx + random.uniform(-95, 95)
        y = cy + random.uniform(-50, 50)
        new.append(prop("cypress", x, y, random.uniform(1.5, 2.2)))

# --- two still pools: upper-right + lower-left (mirrors the reference) ---
ponds = [(2360, 360, 2.2), (720, 1740, 2.0)]
for px, py, ps in ponds:
    # clear rocks that would sit on top of the open water
    hw, hh = 148 * ps / 2 + 20, 88 * ps / 2 + 20
    sprites[:] = [s for s in sprites if not (
        s.get("dir") == "assets_custom/rocks_sand"
        and abs(s["x"] - px) < hw and abs(s["y"] - py) < hh)]
    new.append(prop("pond", px, py, ps))

# --- scattered fire torches (warm light-pools via the engine emissive list) ---
TORCH = [(320, 560), (760, 470), (1180, 640), (2080, 540), (2640, 470),
         (520, 1480), (1320, 1560), (2120, 1500), (2820, 1560),
         (1340, 1250), (1900, 1085)]
for tx, ty in TORCH:
    new.append(prop("torch", tx, ty, random.uniform(1.3, 1.7)))

# --- crimson waymarker flag, planted on the path just left of the gate ---
new.append(prop("flag_red", 1380, 1120, 1.35))

# --- extra skulls strewn around the gate base and approach ---
SKULL = [(1520, 1175), (1690, 1205), (1610, 1095), (1748, 1060),
         (1452, 1232), (900, 1185), (1120, 1240)]
for sx, sy in SKULL:
    new.append({
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": ["skull.png"], "name": "skull", "animated": False,
        "spriteLayer": "below", "x": sx, "y": sy,
        "scaleX": round(random.uniform(1.4, 1.9), 3),
        "scaleY": round(random.uniform(1.4, 1.9), 3),
        "offsetX": 20.0, "offsetY": 37,
    })

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)

from collections import Counter
print(f"region_14: +{len(new)} new sprites, {len(sprites)} total")
print("added:", dict(Counter(s["name"] for s in new)))
