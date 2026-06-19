#!/usr/bin/env python3
"""
Region 28 "Frostpeak (Himashikhara)" — dressing pass.

Dead-end snow spur off the Eyrie. Fixes the data bugs and gives the climb
a destination:
  • fixes: drops 34 exact-duplicate snow-drift strokes and 3 duplicate
    enemy spawns (both flyers and the south melee were stacked twice)
  • a packed-snow trail from the portal to the Frost Sanctum
  • the Frost Sanctum: the existing pillars/mural ringed by great ice
    fangs, warm braziers (glow-priority), a crystal crown and frozen dead
  • the Frozen Pilgrim's last camp: tent, fire, supplies
  • a frozen pond on the south route with shards rising through the ice
  • bounded edges: ice-fang + boulder ridge in the margins, parting at
    the portal; frost stands clustering the open snow
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_28.json"
random.seed(2828)

PROPS = "assets_custom/props"
GEN = "r28dress"

ANCHOR = {
    "ice_shard":    (52, 116, 26, 115),
    "crystal_cyan": (64, 116, 32, 115),
    "pillar":       (60, 196, 30, 195),
    "brazier":      (44, 78, 22, 77),
    "skull":        (40, 38, 20, 37),
    "bone_pile":    (84, 60, 42, 59),
    "dead_tree":    (96, 132, 48, 131),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r28_d")

sprites[:] = [s for s in sprites if not _ours(s)]

# ── fixes: exact-duplicate strokes and enemies ───────────────────────────────
seen, dedup = set(), []
for s in sprites:
    if s.get("type") == "stroke":
        key = (s["stroke"], s["strokeWidth"], tuple(s["points"]))
        if key in seen:
            continue
        seen.add(key)
    dedup.append(s)
sprites[:] = dedup

eseen, edd = set(), []
for e in d["enemies"]:
    key = (e.get("type"), e.get("x"), e.get("y"))
    if key in eseen:
        continue
    eseen.add(key)
    edd.append(e)
d["enemies"] = edd

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r28_d{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def rock(x, y, sc=None):
    return {
        "type": "sprite", "spriteId": sid(), "dir": "assets_custom/rocks_sand",
        "frames": [f"Rock{random.randint(1,4)}.png"], "name": "Rock", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(sc or random.uniform(1.0, 1.7), 3),
        "scaleY": round(sc or random.uniform(1.0, 1.7), 3),
        "offsetX": 32.0, "offsetY": 63,
    }

def tent(x, y):
    return {
        "type": "sprite", "spriteId": sid(), "dir": "assest4/next2/2 Objects/6 Tent",
        "frames": ["4.png"], "name": "tent", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 1.685, "scaleY": 1.685, "offsetX": 32.0, "offsetY": 69,
    }

def crate(x, y):
    return {
        "type": "sprite", "spriteId": sid(), "dir": "assest4/next2/2 Objects/4 Box",
        "frames": ["3.png"], "name": "crate", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 2.1, "scaleY": 2.1, "offsetX": 10.0, "offsetY": 21,
    }

def campfire(x, y):
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

def ellipse_pts(cx, cy, rx, ry, n=16):
    out = []
    for i in range(n + 1):
        a = i / n * 2 * math.pi
        out += [cx + rx * math.cos(a), cy + ry * math.sin(a)]
    return out

# ── packed-snow trail: portal → sanctum ──────────────────────────────────────
TRAIL = [120, 1000, 600, 988, 1100, 1032, 1600, 1000, 2050, 1014, 2360, 1000, 2560, 1016]
sprites.extend([stroke("#d8e4ee", 60, TRAIL), stroke("#e8eff6", 32, TRAIL)])

# ── frozen pond on the south route ───────────────────────────────────────────
sprites.extend([
    stroke("#9fc2d8", 150, ellipse_pts(1150, 1520, 88, 50)),
    stroke("#b8d6e8", 100, ellipse_pts(1150, 1520, 50, 28)),
    stroke("#d6ecf8", 44,  ellipse_pts(1142, 1512, 28, 14)),
])

new = []
priority = []   # front of sprite list → wins the glow budget

# ── the Frost Sanctum (pillars 2500/2660, mural 2580,1110) ───────────────────
priority.append(prop("brazier", 2452, 1052, 1.8))
priority.append(prop("brazier", 2708, 1052, 1.8))
for i in range(12):                                 # ring of ice fangs, with gaps
    a = i / 12 * 2 * math.pi
    if 0.32 * math.pi < a < 0.68 * math.pi:         # south gap: keep the mural visible
        continue
    if 0.86 * math.pi < a < 1.14 * math.pi:         # west gap: the trail enters here
        continue
    new.append(prop("ice_shard", 2580 + math.cos(a) * 295, 1010 + math.sin(a) * 188,
                    random.uniform(1.0, 1.4)))
new.append(prop("crystal_cyan", 2580, 902, 1.5))    # the crown shard
new.append(prop("crystal_cyan", 2520, 928, 0.9))
new.append(prop("crystal_cyan", 2644, 932, 0.95))
for i in range(4):                                  # the frozen dead
    new.append(prop("skull", 2470 + i * 74, 1160 + (i % 2) * 18, random.uniform(1.3, 1.5)))
new.append(prop("bone_pile", 2400, 1110, 1.25))

# ── the Frozen Pilgrim's last camp (NPC at 320,980) ──────────────────────────
new.append(tent(238, 886))
priority.append(campfire(366, 920))
new.append(crate(444, 902))
new.append(prop("skull", 414, 1066, 1.4))
new.append(prop("dead_tree", 180, 1120, 1.5))

# ── frozen pond dressing ─────────────────────────────────────────────────────
new.append(prop("ice_shard", 1128, 1500, 1.2))
new.append(prop("ice_shard", 1188, 1532, 0.9))
new.append(prop("skull", 1078, 1556, 1.3))

# ── bounded edges: ice-fang + boulder ridge in the margins ───────────────────
def edge(x, y):
    if random.random() < 0.55:
        new.append(prop("ice_shard", x + random.uniform(-16, 16), y + random.uniform(-10, 10),
                        random.uniform(1.0, 1.7)))
    else:
        new.append(rock(x + random.uniform(-16, 16), y + random.uniform(-10, 10)))

x = 0.0
while x < 3240:
    edge(x, 60); edge(x + 60, 110)
    x += 120
x = 0.0
while x < 3240:
    edge(x, 1924); edge(x + 60, 1972)
    x += 120
for sx in (44, 3164):
    y = 180.0
    while y < 1860:
        if not (sx == 44 and 840 < y < 1170):       # portal gap
            edge(sx, y)
        y += 120

# ── frost stands: cluster the open snow with shard groves ────────────────────
for gx, gy in [(700, 560), (1500, 480), (2150, 1560), (560, 1500), (2900, 540), (1850, 660)]:
    for _ in range(random.randint(3, 5)):
        new.append(prop("ice_shard", gx + random.uniform(-110, 110),
                        gy + random.uniform(-60, 60), random.uniform(0.9, 1.5)))
    if random.random() < 0.6:
        new.append(prop("dead_tree", gx + random.uniform(-60, 60), gy + 80,
                        random.uniform(1.2, 1.5)))

# ── trail-stones ─────────────────────────────────────────────────────────────
TP = list(zip(TRAIL[0::2], TRAIL[1::2]))
for k in range(10):
    t = (k + 0.5) / 10
    i = min(int(t * (len(TP) - 1)), len(TP) - 2)
    f = t * (len(TP) - 1) - i
    x = TP[i][0] + (TP[i + 1][0] - TP[i][0]) * f
    y = TP[i][1] + (TP[i + 1][1] - TP[i][1]) * f
    side = -1 if k % 2 else 1
    new.append(rock(x + random.uniform(-12, 12), y + side * random.uniform(52, 68), 0.55))

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
strokes = sum(1 for s in sprites if s.get("type") == "stroke")
print(f"region 28 dressed: +{len(new) + len(priority)} sprites, strokes {strokes} (dupes dropped), "
      f"enemies {len(d['enemies'])} (dupes dropped), total {len(sprites)}, anim {anim}")
