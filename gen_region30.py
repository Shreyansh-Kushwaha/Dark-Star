#!/usr/bin/env python3
"""
Region 30 "Storm's Eye (Vāyu Rākṣasa)" — fix sealed exit + boss-arena dressing.

Act IV boss arena on a 180px collider grid. The walkable corridor ended at
x=2160: every cell between the arena and the EAST EXIT PORTAL (3090,1000 →
region 35) was blocked — the player could never leave after the boss. Fixes:
  • opens the six row-920 cells from x2160 east and paints the matching
    cloud causeway + platforms (mirror of the western approach)
  • drops 47 exact-duplicate storm strokes
Dressing (keeps everything else):
  • the storm's eye made literal: a calm floor disk under the boss and
    thin wind arcs circling the arena
  • arena rim: rock spires and storm clouds on the blocked cells around
    the diamond, so the fight space reads as a walled eye
  • the boss mural framed by pillars and cyan storm-crystals
  • the Storm Herald's plaza: banners, lamp, sign, offerings
  • extra lightning bolts and wind streams in the dead sky corners
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_30.json"
random.seed(3030)

PROPS = "assets_custom/props"
GEN = "r30dress"

ANCHOR = {
    "cloud_platform": (220, 104, 110, 52),
    "pillar":         (60, 196, 30, 195),
    "crystal_cyan":   (64, 116, 32, 115),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r30_d")

sprites[:] = [s for s in sprites if not _ours(s)]

# ── fix: drop exact-duplicate strokes ────────────────────────────────────────
seen, dedup = set(), []
for s in sprites:
    if s.get("type") == "stroke":
        key = (s["stroke"], s["strokeWidth"], tuple(s["points"]))
        if key in seen:
            continue
        seen.add(key)
    dedup.append(s)
sprites[:] = dedup

# ── fix: open the sealed east corridor (row y=920, x2160..3060) ──────────────
OPEN = {(x, 920) for x in (2160, 2340, 2520, 2700, 2880, 3060)}
d["noWalkZones"] = [z for z in d["noWalkZones"] if (z["x"], z["y"]) not in OPEN]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r30_d{_n[0]:04d}"

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

def rock(x, y, sc=None):
    return base("assets_custom/rocks_sand", f"Rock{random.randint(1,4)}.png", "Rock",
                x, y, sc or random.uniform(1.2, 2.0), 32, 63)

def cloud(x, y, sc, alpha):
    return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Clouds",
                "Clouds_01.png", "Clouds_01", x, y, sc, 288, 128, {"alpha": round(alpha, 3)})

def gold(x, y):  return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones", f"Gold Stone {random.randint(1,6)}.png", "ware", x, y, 0.55, 64, 127)
def lamp(x, y):  return base("assest4/map_objects/2 Objects/7 Decor", "Lamp3.png", "lamp", x, y, 2.6, 6.5, 34)
def sign(x, y):  return base("assest4/map_objects/2 Objects/3 Pointer", "1.png", "sign", x, y, 2.4, 10, 35)

def flag(x, y):
    return base("assest4/map_objects/3 Animated Objects/1 Flag", "1.png", "flag",
                x, y, 1.6, 16, 60,
                {"animated": True, "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0})

def stroke(color, width, pts, extra=None):
    r = {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
         "lineCap": "round", "lineJoin": "round", "composite": "source-over",
         "points": [round(p, 1) for p in pts]}
    if extra:
        r.update(extra)
    return r

def ellipse_pts(cx, cy, rx, ry, n=20, a0=0.0, a1=2 * math.pi):
    out = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        out += [cx + rx * math.cos(a), cy + ry * math.sin(a)]
    return out

# ── east causeway: mirror of the western approach ────────────────────────────
sprites.append(stroke("#c2d6e8", 150, [2160, 1000, 3120, 1000]))

# ── the storm's eye: calm floor disk + circling wind arcs ────────────────────
sprites[0:0] = [
    stroke("#748aa0", 260, ellipse_pts(1700, 1000, 330, 235)),
    stroke("#8ba0b6", 160, ellipse_pts(1700, 1000, 200, 140)),
    stroke("#a2b6ca", 70,  ellipse_pts(1700, 1000, 90, 58)),
]
for rx, ry, w in ((470, 330, 6), (560, 395, 4)):
    sprites.append(stroke("#cfe2f5", w, ellipse_pts(1700, 1000, rx, ry, n=26,
                                                    a0=0.15 * math.pi, a1=1.75 * math.pi)))

new = []

# east causeway platforms
for px in range(2240, 3100, 180):
    new.append(prop("cloud_platform", px + random.uniform(-12, 12), 1000 + random.uniform(-8, 8),
                    random.uniform(1.0, 1.15)))

# ── arena rim: spires + storm clouds on the blocked cells round the diamond ──
RIM = [(1350, 560), (2070, 560), (1170, 740), (2250, 740),
       (1170, 1280), (2250, 1280), (1350, 1460), (2070, 1460), (1700, 470), (1700, 1530)]
for cx, cy in RIM:
    for _ in range(2):
        new.append(rock(cx + random.uniform(-60, 60), cy + random.uniform(-30, 30)))
    new.append(cloud(cx, cy + 60, random.uniform(0.6, 0.8), 0.5))

# ── the boss mural (1700,640): pillars + storm crystals ──────────────────────
new.append(prop("pillar", 1596, 664, 0.8))
new.append(prop("pillar", 1804, 664, 0.8))
new.append(prop("crystal_cyan", 1548, 700, 0.95))
new.append(prop("crystal_cyan", 1852, 700, 0.95))

# ── the Storm Herald's plaza (NPC at 360,1000) ───────────────────────────────
new.append(flag(250, 880))
new.append(flag(470, 880))
new.append(lamp(300, 1120))
new.append(sign(440, 1124))
new.append(gold(380, 1086))

# ── extra storm theatre in the dead sky ──────────────────────────────────────
def bolt(x0, y0):
    pts, x, y = [], x0, y0
    for _ in range(5):
        pts += [x, y]
        x += random.uniform(-70, 90)
        y += random.uniform(70, 130)
    for col, w in (("#5a7290", 7), ("#cfe2f5", 3), ("#ffffff", 1)):
        sprites.append(stroke(col, w, pts))

random.seed(3031)
bolt(2420, 240)
bolt(540, 1460)
bolt(2820, 1430)
for arc in ([200, 360, 560, 300, 900, 380], [2400, 1760, 2750, 1700, 3050, 1780]):
    sprites.append(stroke("#cfe0f5", 6, arc))
    sprites.append(stroke("#8fb6e8", 3, arc))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
strokes = sum(1 for s in sprites if s.get("type") == "stroke")
print(f"region 30 dressed: +{len(new)} sprites, east corridor opened, "
      f"zones {len(d['noWalkZones'])}, strokes {strokes}, total {len(sprites)}, anim {anim}")
