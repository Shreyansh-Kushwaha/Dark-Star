#!/usr/bin/env python3
"""
Region 31 "Blind Well (Andhakūpa)" — dressing pass.

First Sunless Deep region: a lamp-lined cave road past the well-pit. The
bones were good (winch, lamp rows, keeper's lift). Keeps every gameplay
element and adds:
  • a faint trodden floor-path between the lamp rows, portal to portal,
    following the corridor's actual zone-derived centreline
  • the well made ominous: skulls and bones at the rim, a cold crystal
    glinting from the mouth (glow-priority), spare rope-crates
  • the Lantern Keeper's yard: campfire, seat log, crate, signpost
  • first hints of the deep's bioluminescence toward the east exit:
    teal glow-trees and crystal clusters (the next region blooms with it)
  • cold crystal pockets along the cave walls
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_31.json"
random.seed(3131)

PROPS = "assets_custom/props"
GEN = "r31dress"

ANCHOR = {
    "crystal_cyan": (64, 116, 32, 115),
    "skull":        (40, 38, 20, 37),
    "bone_pile":    (84, 60, 42, 59),
    "tree_teal":    (92, 124, 46, 123),
    "dead_tree":    (96, 132, 48, 131),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r31_d")

sprites[:] = [s for s in sprites if not _ours(s)]

# the well pit itself is a hole — give its mouth a collider
d["noWalkZones"] = [z for z in d["noWalkZones"] if not str(z["id"]).startswith("z31_dress")]
d["noWalkZones"].append({"id": "z31_dress_well", "x": 1372, "y": 962, "w": 256, "h": 152})

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r31_d{_n[0]:04d}"

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

def crate(x, y):  return base("assest4/next2/2 Objects/4 Box", "3.png", "crate", x, y, 2.1, 10, 21)
def log_(x, y):   return base("assest4/map_objects/2 Objects/7 Decor", "Log3.png", "Log3", x, y, 1.8, 16.5, 31)
def sign(x, y):   return base("assest4/map_objects/2 Objects/3 Pointer", "1.png", "sign", x, y, 2.4, 10, 35)

def campfire(x, y):
    return base("assest4/map_objects/3 Animated Objects/2 Campfire", "1.png", "1",
                x, y, 1.6, 16, 60,
                {"animated": True, "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0})

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

# ── corridor centreline from the paired zone columns ─────────────────────────
cols = {}
for z in d["noWalkZones"]:
    cols.setdefault(z["x"], []).append(z)
centers = []
for k in sorted(cols):
    pair = cols[k]
    if len(pair) != 2:
        continue
    top = min(pair, key=lambda z: z["y"])
    bot = max(pair, key=lambda z: z["y"])
    centers.append((k + 101, (top["y"] + top["h"] + bot["y"]) / 2))

# ── faint trodden floor-path, portal → well → portal ─────────────────────────
pts = [120, 1034] + [c for xy in centers for c in xy] + [3090, 950]
sprites[0:0] = [stroke("#241d18", 74, pts), stroke("#2d241d", 38, pts)]

new = []
priority = []

# ── the well's mouth (pit at 1500,1038) ──────────────────────────────────────
priority.append(prop("crystal_cyan", 1500, 1150, 0.8))   # cold glint from the deep
for sx_, sy_ in [(1366, 1146), (1640, 1158), (1428, 950), (1586, 942)]:
    new.append(prop("skull", sx_ + random.uniform(-8, 8), sy_, random.uniform(1.3, 1.5)))
new.append(prop("bone_pile", 1322, 1010, 1.25))
new.append(prop("bone_pile", 1684, 1042, 1.2))
new.append(crate(1278, 926))
new.append(crate(1722, 940))

# ── the Lantern Keeper's yard (NPC at 320,1087; lift at 360,1186) ────────────
priority.append(campfire(252, 1004))
new.append(log_(208, 1092))
new.append(crate(450, 1042))
new.append(sign(472, 1130))

# ── bioluminescence rising toward the east exit ──────────────────────────────
for tx, ty, sc in [(2900, 760, 1.3), (2990, 1120, 1.2), (3050, 840, 1.0),
                   (2660, 1230, 1.1), (2230, 1300, 1.0)]:
    priority.append(prop("tree_teal", tx, ty, sc))
for cx, cy in [(2950, 990), (2780, 700)]:
    new.append(prop("crystal_cyan", cx, cy, random.uniform(0.8, 1.0)))
    new.append(prop("crystal_cyan", cx + 50, cy + 36, random.uniform(0.55, 0.7)))

# ── cold crystal pockets along the cave walls ────────────────────────────────
for cx, cy in [(700, 820), (1140, 1290), (1900, 1170), (2150, 660)]:
    new.append(prop("crystal_cyan", cx, cy, random.uniform(0.7, 0.95)))
    new.append(prop("crystal_cyan", cx + random.uniform(36, 60), cy + random.uniform(20, 40),
                    random.uniform(0.5, 0.65)))

# ── a few dead snags between the lamp rows ───────────────────────────────────
for tx, ty in [(880, 880), (2050, 740), (2550, 1200), (1750, 1250)]:
    new.append(prop("dead_tree", tx, ty, random.uniform(1.2, 1.5)))

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 31 dressed: +{len(new) + len(priority)} sprites, total {len(sprites)}, anim {anim}")
