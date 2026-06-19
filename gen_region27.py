#!/usr/bin/env python3
"""
Region 27 "The Eyrie (Garuḍālaya)" — dressing pass.

Act IV cloud-city hub (four portals) that was nearly empty sky. Keeps every
gameplay element and adds:
  • soft cloud avenues: west↔east boulevard plus the two north spurs to the
    roost portals — the hub's street plan, painted like the Cloud Stair road
  • a central sky-court where the avenue meets the spurs: platform ring,
    pillars, banners, offerings around the existing brazier
  • roost terraces at both north portals: platforms, pillar pair, banner
  • market row extended near the NPCs: stalls, crates, wares, lamps
  • banners along the boulevard; signposts at the junctions
  • eyrie-nest islets in the open sky corners (cloud bed + boulders + gold)
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_27.json"
random.seed(2727)

PROPS = "assets_custom/props"
GEN = "r27dress"

ANCHOR = {
    "cloud_platform": (220, 104, 110, 52),
    "pillar":         (60, 196, 30, 195),
    "brazier":        (44, 78, 22, 77),
    "crystal_cyan":   (64, 116, 32, 115),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r27_d")

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r27_d{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def base(dir_, frame, name, x, y, scale, ox, oy, extra=None):
    r = {
        "type": "sprite", "spriteId": sid(), "dir": dir_,
        "frames": [frame], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }
    if extra:
        r.update(extra)
    return r

def gold(x, y):    return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones", f"Gold Stone {random.randint(1,6)}.png", "ware", x, y, 0.55, 64, 127)
def crate(x, y):   return base("assest4/next2/2 Objects/4 Box", "3.png", "crate", x, y, 2.1, 10, 21)
def tent(x, y):    return base("assest4/next2/2 Objects/6 Tent", "1.png", "tent", x, y, 1.8, 36.5, 64)
def lamp(x, y):    return base("assest4/map_objects/2 Objects/7 Decor", "Lamp3.png", "lamp", x, y, 2.6, 6.5, 34)
def sign(x, y):    return base("assest4/map_objects/2 Objects/3 Pointer", "1.png", "sign", x, y, 2.4, 10, 35)
def rock(x, y):    return base("assets_custom/rocks_sand", f"Rock{random.randint(1,4)}.png", "Rock", x, y, random.uniform(1.0, 1.6), 32, 63)

def flag(x, y):
    return base("assest4/map_objects/3 Animated Objects/1 Flag", "1.png", "flag",
                x, y, 1.6, 16, 60,
                {"animated": True, "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0})

def cloud(x, y, sc, alpha):
    return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Clouds",
                "Clouds_01.png", "Clouds_01", x, y, sc, 288, 128, {"alpha": round(alpha, 3)})

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

# ── cloud avenues: boulevard + the two roost spurs ───────────────────────────
AVENUE = [120, 1000, 700, 1012, 1300, 996, 1900, 1008, 2500, 996, 3090, 1000]
SPUR_W = [760, 980, 748, 700, 766, 460, 760, 250]
SPUR_E = [2400, 980, 2412, 700, 2392, 460, 2400, 250]
roads = []
for pts in (AVENUE, SPUR_W, SPUR_E):
    roads.append(stroke("#b3cde6", 180, pts))
    roads.append(stroke("#cfe2f2", 116, pts))
    roads.append(stroke("#e6f1fa", 50, pts))
sprites[0:0] = roads

new = []

# extra platforms seating the avenues
for px, py in [(420, 1010), (980, 1000), (1660, 1004), (2240, 1000), (2820, 1004),
               (760, 760), (760, 480), (2400, 740), (2400, 470)]:
    new.append(prop("cloud_platform", px + random.uniform(-16, 16), py + 30, 0.95))

# ── central sky-court (existing brazier + pillars at ≈1410,1000) ─────────────
for px, py in [(1320, 920), (1500, 920), (1320, 1100), (1500, 1100)]:
    new.append(prop("pillar", px, py, 0.72))
new.append(flag(1268, 944))
new.append(flag(1552, 944))
new.append(gold(1356, 1064))
new.append(gold(1476, 1056))
new.append(sign(1548, 1066))
new.append(prop("cloud_platform", 1408, 1060, 1.1))

# ── roost terraces at the north portals ──────────────────────────────────────
for tx in (760, 2400):
    new.append(prop("cloud_platform", tx - 70, 330, 1.0))
    new.append(prop("cloud_platform", tx + 80, 348, 0.85))
    new.append(prop("pillar", tx - 110, 282, 0.7))
    new.append(prop("pillar", tx + 110, 282, 0.7))
    new.append(flag(tx + 150, 320))
    new.append(gold(tx - 60, 300))
    new.append(sign(tx - 150, 348))

# ── market row near the NPCs (Loremaster 360,980; Healer 470,1180) ───────────
new.append(tent(560, 1130))
new.append(tent(700, 1166))
new.append(crate(626, 1180))
new.append(gold(760, 1140))
new.append(lamp(520, 1062))
new.append(lamp(830, 1090))

# ── banners along the boulevard ──────────────────────────────────────────────
for bx, side in [(980, -1), (1900, 1), (2500, -1), (2820, 1)]:
    new.append(flag(bx, 1000 + side * 130))

# ── eyrie-nest islets in the open sky ────────────────────────────────────────
for ix, iy, crowned in [(420, 520, True), (1700, 1560, False), (2900, 1500, True),
                        (1450, 320, False), (2950, 420, False)]:
    new.append(cloud(ix - 20, iy + 80, random.uniform(0.85, 1.05), 0.5))
    new.append(prop("cloud_platform", ix, iy, 0.9))
    for _ in range(2):
        new.append(rock(ix + random.uniform(-70, 70), iy - random.uniform(0, 30)))
    if crowned:
        new.append(prop("crystal_cyan", ix + 20, iy - 30, 0.85))
    new.append(gold(ix - 50, iy - 8))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 27 dressed: +{len(new)} sprites, total {len(sprites)}, anim {anim}")
