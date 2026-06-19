#!/usr/bin/env python3
"""
Region 19 "Ash Flats (Bhasmabhūmi)" — dressing pass, Pokémon-route structure.

Route-design principles applied (Kanto-style): the map is a corridor carved
through obstacles, not an open void. Keeps every gameplay element and builds:
  • bounded edges — staggered basalt-boulder ridge lines fill the no-walk
    margins on all four sides (the ash-waste version of Kanto's tree rows),
    breaking only at the two portals
  • "tall grass" — defined ash-scrub patches with cinder litter mark the
    encounter zones around the enemy spawns
  • flow — rock-wall fingers jut from the ridges between the ruins so the
    open flat reads as S-curves instead of a featureless plain
  • landmarks — fumarole vent clusters (warm glow), a shattered-obelisk
    monument by the south-west fissure, braziers at all four ruin murals,
    molten embers along every fissure, big charred trees
  • path — the trail is edged with small trail-stones like a real route
  • fixes — green bushes removed (wrong biome); Ash Pilgrim camp at spawn
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_19.json"
random.seed(1919)

PROPS = "assets_custom/props"
GEN = "r19dress"

ANCHOR = {
    "brazier":      (44, 78, 22, 77),
    "lava_rock":    (72, 56, 36, 55),
    "flag_red":     (58, 112, 13, 110),
    "dead_tree":    (96, 132, 48, 131),
    "skull":        (40, 38, 20, 37),
    "bone_pile":    (84, 60, 42, 59),
    "basalt_rock":  (110, 84, 55, 82),
    "basalt_small": (64, 48, 32, 46),
    "ash_shrub":    (52, 44, 26, 42),
    "fumarole":     (60, 72, 30, 70),
    "obelisk":      (52, 148, 26, 146),
    "pillar":       (60, 196, 30, 195),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r19_") and sid_[6:].isdigit() and int(sid_[6:]) >= 500

sprites[:] = [s for s in sprites if not _ours(s)]

# ── fix: lush green bushes in an ash wasteland (no-op once removed) ──────────
sprites[:] = [s for s in sprites if not str(s.get("name", "")).startswith("Bushe")]

_n = [500]
def sid():
    _n[0] += 1
    return f"s_r19_{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def rock(n, x, y, scale):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Rocks",
        "frames": [f"Rock{n}.png"], "name": f"Rock{n}", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": 32.0, "offsetY": 63,
    }

def dirt(n, x, y, scale=2.4):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "assest4/map_objects/2 Objects/7 Decor",
        "frames": [f"Dirt{n}.png"], "name": f"Dirt{n}", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": scale, "scaleY": scale, "offsetX": 5.0, "offsetY": 5,
    }

def campfire(x, y):
    # 1.png is a 6-frame 32x64 strip — place as a spritesheet, not whole-image
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "assest4/map_objects/3 Animated Objects/2 Campfire",
        "frames": ["1.png"], "name": "1", "animated": True,
        "spriteLayer": "below", "x": x, "y": y, "scaleX": 1.6, "scaleY": 1.6,
        "offsetX": 16.0, "offsetY": 60,
        "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0,
    }

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

def ellipse_pts(cx, cy, rx, ry, n=14):
    import math
    out = []
    for i in range(n + 1):
        a = i / n * 2 * math.pi
        out += [cx + rx * math.cos(a), cy + ry * math.sin(a)]
    return out

# ── two new fissures in the empty corners (same style as the existing four) ──
NEW_CRACKS = [
    [250, 1480, 420, 1515, 560, 1500, 700, 1545],
    [2780, 360, 2900, 395, 3000, 372, 3080, 410],
]
crack_strokes = []
for pts in NEW_CRACKS:
    crack_strokes.append(stroke("#1c1512", 30, pts))
    crack_strokes.append(stroke("#7a2c12", 12, pts))

# ── scorch halos under the fissures + the trail, over the bands ──────────────
cracks = [s for s in sprites if s.get("type") == "stroke" and s["stroke"] == "#1c1512"]
scorch = []
for pts in [c["points"] for c in cracks] + NEW_CRACKS:
    xs, ys = pts[0::2], pts[1::2]
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
    rx = (max(xs) - min(xs)) / 2
    scorch.append(stroke("#3b352e", 64, ellipse_pts(cx, cy, rx * 0.45, 34)))

TRAIL = [120, 1000, 450, 975, 800, 1005, 1150, 1045, 1500, 1080,
         1850, 1050, 2200, 995, 2550, 1010, 2850, 1005, 3090, 1000]
trail = [stroke("#3a342e", 60, TRAIL), stroke("#45403a", 32, TRAIL)]

first_crack = next(i for i, s in enumerate(sprites)
                   if s.get("type") == "stroke" and s["stroke"] == "#1c1512")
sprites[first_crack:first_crack] = scorch + trail
sprites.extend(crack_strokes)

new = []

def basalt(x, y):
    if random.random() < 0.62:
        new.append(prop("basalt_rock", x, y, random.uniform(0.85, 1.25)))
    else:
        new.append(prop("basalt_small", x, y, random.uniform(0.95, 1.4)))

# ── bounded edges: staggered ridge rows in the no-walk margins ───────────────
x = -30.0
while x < 3260:                                   # top ridge (margin y < 110)
    basalt(x + random.uniform(-14, 14), 46 + random.uniform(-10, 10))
    basalt(x + 52 + random.uniform(-14, 14), 102 + random.uniform(-10, 10))
    x += 108
x = -30.0
while x < 3260:                                   # bottom ridge (margin y > 1890)
    basalt(x + random.uniform(-14, 14), 1922 + random.uniform(-10, 10))
    basalt(x + 52 + random.uniform(-14, 14), 1985 + random.uniform(-10, 10))
    x += 108
for side_x in (34, 3168):                         # side ridges, parting at the portals
    y = 170.0
    while y < 1870:
        if not 840 < y < 1170:
            basalt(side_x + random.uniform(-16, 16), y + random.uniform(-10, 10))
        y += 112

# ── flow: rock-wall fingers jutting in from the ridges between the ruins ─────
# real obstacles, like Kanto ledges — each finger also gets a no-walk zone
d["noWalkZones"] = [z for z in d["noWalkZones"] if not str(z["id"]).startswith("z19_dress")]
fingers = []
for fx, y0, y1 in [(1255, 150, 430), (2705, 150, 400)]:        # down from the top
    y = y0
    while y < y1:
        basalt(fx + random.uniform(-12, 12), y); y += 96
    fingers.append((fx - 50, y0 - 40, 100, y1 - y0))
for fx, y0, y1 in [(1985, 1850, 1580), (640, 1850, 1640)]:     # up from the bottom
    y = y0
    while y > y1:
        basalt(fx + random.uniform(-12, 12), y); y -= 96
    fingers.append((fx - 50, y1 - 60, 100, y0 - y1 + 60))
for i, (zx, zy, zw, zh) in enumerate(fingers):
    d["noWalkZones"].append({"id": f"z19_dress_f{i}", "x": zx, "y": zy, "w": zw, "h": zh})

# ── warm light, glow-budget order: campfire → braziers → fumaroles ───────────
new.append(campfire(262, 902))                    # Ash Pilgrim's fire (NPC at 320,980)
for mx, my in [(850, 890), (1530, 1370), (2180, 890), (2580, 1370)]:
    new.append(prop("brazier", mx - 110, my - 28, 1.1))

FUMAROLE_FIELDS = [(520, 330), (1690, 1690), (2960, 1560)]
for cx, cy in FUMAROLE_FIELDS:
    new.append(prop("fumarole", cx, cy, 1.15))    # the big vent takes the glow slot
    for _ in range(2):
        new.append(prop("fumarole", cx + random.uniform(-90, 90),
                        cy + random.uniform(-55, 55), random.uniform(0.8, 1.0)))
    for _ in range(2):
        new.append(prop("lava_rock", cx + random.uniform(-110, 110),
                        cy + random.uniform(55, 90), random.uniform(0.8, 1.1)))
    for _ in range(3):
        new.append(dirt(random.randint(1, 6), cx + random.uniform(-120, 120),
                        cy + random.uniform(-70, 70)))

# molten embers along every fissure (past the glow cap they're unlit but bright)
ALL_CRACKS = [c["points"] for c in cracks] + NEW_CRACKS
for pts in ALL_CRACKS:
    xy = list(zip(pts[0::2], pts[1::2]))
    for px, py in (xy[1], xy[len(xy) // 2], xy[-2]):
        new.append(prop("lava_rock", px + random.uniform(-14, 14),
                        py + random.uniform(-10, 10), random.uniform(0.85, 1.25)))

# ── "tall grass": ash-scrub encounter fields with cinder litter ──────────────
SCRUB_FIELDS = [  # (cx, cy) — flanking the enemy line and filling open bays
    (700, 740), (1120, 1240), (1840, 1240), (2160, 800),
    (1460, 540), (2520, 1560), (420, 1240), (2900, 700),
]
for cx, cy in SCRUB_FIELDS:
    for _ in range(random.randint(9, 12)):
        new.append(prop("ash_shrub", cx + random.uniform(-150, 150),
                        cy + random.uniform(-85, 85), random.uniform(1.2, 1.8)))
    for _ in range(random.randint(3, 5)):
        new.append(dirt(random.randint(1, 6), cx + random.uniform(-150, 150),
                        cy + random.uniform(-85, 85)))

# ── path edging: trail-stones alternating along the route ────────────────────
TRAIL_PTS = list(zip(TRAIL[0::2], TRAIL[1::2]))
def trail_at(t):
    i = min(int(t * (len(TRAIL_PTS) - 1)), len(TRAIL_PTS) - 2)
    f = t * (len(TRAIL_PTS) - 1) - i
    (x0, y0), (x1, y1) = TRAIL_PTS[i], TRAIL_PTS[i + 1]
    return x0 + (x1 - x0) * f, y0 + (y1 - y0) * f

for k in range(20):
    t = (k + 0.5) / 20
    x, y = trail_at(t)
    side = -1 if k % 2 else 1
    new.append(rock(random.randint(1, 4), x + random.uniform(-12, 12),
                    y + side * random.uniform(44, 58), random.uniform(0.38, 0.52)))

# ── monument: shattered obelisk by the south-west fissure ────────────────────
new.append(prop("obelisk", 540, 1408, 1.5))
new.append(prop("pillar", 452, 1438, 0.45))
new.append(prop("pillar", 628, 1452, 0.4))
new.append(prop("bone_pile", 488, 1486, 1.25))
new.append(prop("skull", 596, 1396, 1.4))
for _ in range(3):
    new.append(rock(random.randint(1, 4), 540 + random.uniform(-90, 90),
                    1452 + random.uniform(-26, 26), random.uniform(0.5, 0.7)))

# ── Ash Pilgrim camp + charred trees ─────────────────────────────────────────
new.append(prop("flag_red", 432, 928, 1.0))
new.append(prop("skull", 218, 1052, 1.4))
new.append(prop("bone_pile", 386, 1066, 1.2))
for x, y, sc in [(620, 480, 1.7), (1420, 640, 1.6), (1010, 1520, 1.8),
                 (1930, 1500, 1.6), (2880, 900, 1.7), (2300, 1680, 1.7)]:
    new.append(prop("dead_tree", x + random.uniform(-12, 12), y, sc))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 19 dressed: +{len(new)} sprites, bushes removed, "
      f"total {len(sprites)}, anim {anim}")
