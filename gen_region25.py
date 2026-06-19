#!/usr/bin/env python3
"""
Region 25 "Cloud Stair (Meghasopāna)" — dressing pass.

Act IV opener: a diagonal cloud causeway rising to the heaven gate. The
stair platforms and gate were in place; this pass makes the climb read.
Keeps every gameplay element and adds:
  • a soft cloud-road painted under the platform line, so the walkway
    reads as a causeway instead of stepping stones on bare sky
  • the Sky Pilgrim's start terrace (extra platforms, prayer flag, alms)
  • a mid-stair rest terrace: widened platforms, pillar pair, brazier,
    crystal and offerings — the landmark between start and gate
  • prayer flags along the climb; two more flanking the heaven gate
  • floating side islands in the open sky (decor-only, off the corridor)
  • thin wind streaks across the blue
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_25.json"
random.seed(2525)

PROPS = "assets_custom/props"
GEN = "r25dress"

ANCHOR = {
    "cloud_platform": (220, 104, 110, 52),
    "pillar":         (60, 196, 30, 195),
    "brazier":        (44, 78, 22, 77),
    "crystal_cyan":   (64, 116, 32, 115),
    "crystal_amber":  (64, 116, 32, 115),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r25_") and sid_[6:].isdigit() and int(sid_[6:]) >= 500

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [500]
def sid():
    _n[0] += 1
    return f"s_r25_{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def gold(x, y):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones",
        "frames": [f"Gold Stone {random.randint(1,6)}.png"], "name": "ware", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 0.55, "scaleY": 0.55, "offsetX": 64.0, "offsetY": 127,
    }

def flag(x, y):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "assest4/map_objects/3 Animated Objects/1 Flag",
        "frames": ["1.png"], "name": "flag", "animated": True,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 1.5, "scaleY": 1.5, "offsetX": 16.0, "offsetY": 60,
        "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0,
    }

def cloud(x, y, sc, alpha):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Clouds",
        "frames": ["Clouds_01.png"], "name": "Clouds_01", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(sc, 3), "scaleY": round(sc, 3),
        "offsetX": 288, "offsetY": 128, "alpha": round(alpha, 3),
    }

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

# the stair's centreline = the existing platform chain
STAIR = [(120, 1374), (378, 1336), (637, 1293), (895, 1240), (1153, 1174),
         (1411, 1095), (1670, 1005), (1928, 909), (2186, 811), (2444, 718),
         (2703, 635), (2961, 564), (3090, 533)]

# ── the cloud-road: soft causeway painted beneath the platforms ──────────────
pts = [c for p in STAIR for c in p]
sprites[0:0] = [
    stroke("#b9d2e8", 190, pts),
    stroke("#cfe2f2", 120, pts),
    stroke("#e6f1fa", 52, pts),
]

new = []

# ── start terrace (Sky Pilgrim at 360,1350; portal at 120,1375) ──────────────
new.append(prop("cloud_platform", 280, 1438, 1.0))
new.append(prop("cloud_platform", 452, 1408, 0.9))
new.append(flag(306, 1296))
new.append(gold(424, 1330))
new.append(gold(218, 1322))

# ── mid-stair rest terrace (around the 1670,1005 platform) ───────────────────
new.append(prop("cloud_platform", 1592, 1108, 1.05))
new.append(prop("cloud_platform", 1752, 928, 0.95))
new.append(prop("pillar", 1606, 962, 0.78))
new.append(prop("pillar", 1738, 1056, 0.78))
new.append(prop("brazier", 1672, 940, 1.7))
new.append(prop("crystal_cyan", 1556, 1042, 0.85))
new.append(gold(1718, 1112))
new.append(gold(1630, 1090))

# ── prayer flags along the climb ─────────────────────────────────────────────
for i, side in [(3, 1), (6, -1), (9, 1)]:
    px, py = STAIR[i]
    new.append(flag(px + side * 64, py - side * 26))

# two more flanking the heaven gate (gate_arch at 2760,588)
new.append(flag(2622, 642))
new.append(flag(2906, 568))
new.append(gold(2680, 668))

# ── floating side islands (decor-only, inside the blocked sky) ───────────────
ISLANDS = [
    (660, 560, "crystal_cyan"), (1460, 1610, "pillar"),
    (2280, 1360, "crystal_amber"), (1900, 330, "pillar"),
]
for ix, iy, deco in ISLANDS:
    new.append(prop("cloud_platform", ix, iy, 1.1))
    new.append(prop("cloud_platform", ix + 130, iy + 44, 0.8))
    if deco == "pillar":
        new.append(prop("pillar", ix + 20, iy - 8, 0.7))
    else:
        new.append(prop(deco, ix + 20, iy - 6, 0.9))
    new.append(gold(ix + 110, iy + 18))
    new.append(cloud(ix - 110, iy + 70, random.uniform(0.7, 0.9), 0.5))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 25 dressed: +{len(new)} sprites, total {len(sprites)}, anim {anim}")
