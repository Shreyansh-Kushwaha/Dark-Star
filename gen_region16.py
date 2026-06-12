#!/usr/bin/env python3
"""
Region 16 "Ferry Village (Naditīra)" — dressing pass.

The region is a five-portal hub split by a north–south river with a ferry
crossing. Keeps every gameplay element (portals, NPCs, enemies, houses,
no-walk zones, river, ferry) and adds the life around it:
  • dirt-path network linking all five portals to the village and the ferry
  • meadow tone patches so the grass isn't one flat colour
  • riverbank reeds, lily pads, logs and a second moored boat
  • sheep paddock (fenced, gate gap) in the south-west field
  • tilled farm plot + scarecrow by the east-bank farmstead
  • trader camp (tents, campfire, crates) at the south-east road bend
  • tree groves, bushes, grass tufts and flowers filling the empty meadows
  • lamps at the dock approaches; a gate gap in the village fence where the
    road passes through
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_16.json"
random.seed(1616)

PROPS = "assets_custom/props"
GEN = "r16dress"

ANCHOR = {
    "reed":      (34, 74, 17, 73),
    "lily_pad":  (44, 28, 22, 14),
    "boat":      (150, 76, 75, 38),
    "scarecrow": (56, 104, 28, 103),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r16_") and sid_[6:].isdigit() and int(sid_[6:]) >= 500

sprites[:] = [s for s in sprites if not _ours(s)]

# village fence: open a gate where the east road passes through (no-op on re-run)
sprites[:] = [s for s in sprites if not (
    s.get("dir", "").endswith("2 Fence") and s.get("x") == 1180 and s.get("y") in (988, 1010))]

_n = [500]
def sid():
    _n[0] += 1
    return f"s_r16_{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def a4(dir_, frame, name, x, y, scale, ox, oy):
    return {
        "type": "sprite", "spriteId": sid(), "dir": dir_,
        "frames": [frame], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def tree(x, y, scale):   return a4("cropped", "Tree2_crop.png", "Tree2_crop", x, y, scale, 69, 238)
def sheep(x, y):         return a4("cropped", "Sheep_Idle_crop.png", "Sheep_Idle_crop", x, y, 1.0, 32, 58)
def bush(n, x, y):       return a4("cropped", f"Bushe{n}_crop.png", f"Bushe{n}_crop", x, y, 1.0, 40, 72)
def grass(n, x, y):      return a4("assest4/map_objects/2 Objects/5 Grass", f"{n}.png", str(n), x, y, 3.2, 3, 5)
def flower(n, x, y):     return a4("assest4/map_objects/2 Objects/6 Flower", f"{n}.png", str(n), x, y, 2.1, 3, 4)
def dirt(n, x, y):       return a4("assest4/map_objects/2 Objects/7 Decor", f"Dirt{n}.png", f"Dirt{n}", x, y, 2.6, 5, 5)
def log_(n, x, y):       return a4("assest4/map_objects/2 Objects/7 Decor", f"Log{n}.png", f"Log{n}", x, y, 1.7, 16.5, 31)
def lamp(x, y, v=1):     return a4("assest4/map_objects/2 Objects/7 Decor", f"Lamp{v}.png", f"Lamp{v}", x, y, 3.0, 10 if v != 3 else 6.5, 34)
def box(x, y, v=1):      return a4("assest4/next2/2 Objects/4 Box", f"{v}.png", str(v), x, y, 2.1, 10, 21)
def tent(x, y, v=3):     return a4("assest4/next2/2 Objects/6 Tent", f"{v}.png", str(v), x, y, 1.7, 32.5, 61)
def fence_h(x, y, v=1):  return a4("assest4/map_objects/2 Objects/2 Fence", f"{v}.png", str(v), x, y, 2.0, 13, 15)
def fence_v(x, y):       return a4("assest4/map_objects/2 Objects/2 Fence", "7.png", "7", x, y, 2.0, 3.5, 30)

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

def ellipse_pts(cx, cy, rx, ry, n=16):
    import math
    out = []
    for i in range(n + 1):
        a = i / n * 2 * math.pi
        out += [cx + rx * math.cos(a), cy + ry * math.sin(a)]
    return out

# ── ground strokes: meadow tone patches, then dirt paths (river paints last) ─
ground = [
    # soft meadow variation so the grass isn't one flat green
    stroke("#3f6354", 260, ellipse_pts(700, 480, 420, 230)),
    stroke("#3f6354", 260, ellipse_pts(2450, 500, 460, 240)),
    stroke("#35544a", 240, ellipse_pts(950, 1550, 430, 220)),
    stroke("#3f6354", 240, ellipse_pts(2250, 1500, 420, 220)),
]
PATHS = [
    # west main road: back portal → village square → west dock
    [120, 1000, 400, 1010, 700, 1006, 950, 1000, 1180, 1000, 1480, 1000],
    # east main road: east dock → SE junction → next portal
    [1800, 1000, 2100, 994, 2440, 1000, 2760, 996, 3090, 1000],
    # north spur: village square → portal to region 9
    [770, 1000, 780, 700, 765, 450, 760, 250],
    # south spur: village square → portal to region 17 (skirts the south house)
    [790, 1010, 830, 1160, 850, 1400, 800, 1600, 760, 1740],
    # south-east spur: junction → portal to region 43
    [2440, 1000, 2410, 1250, 2430, 1500, 2440, 1740],
]
for pts in PATHS:
    ground.append(stroke("#57503e", 76, pts))
for pts in PATHS:
    ground.append(stroke("#6f6450", 42, pts))
# paths go in FIRST so the river (currently stroke 0) paints over their ends
sprites[0:0] = ground

new = []

# ── riverbanks: reed clumps (skipping the ferry crossing y 920–1080) ─────────
for bx, ys in [(1538, (210, 420, 660, 1210, 1400, 1630, 1830)),
               (1742, (260, 470, 700, 1160, 1350, 1570, 1790))]:
    for y in ys:
        for _ in range(random.randint(2, 3)):
            new.append(prop("reed", bx + random.uniform(-22, 22), y + random.uniform(-28, 28),
                            random.uniform(1.6, 2.3)))
for lx, ly in [(1600, 300), (1690, 520), (1555, 1250), (1720, 1430), (1640, 1700), (1665, 220)]:
    new.append(prop("lily_pad", lx, ly, random.uniform(1.0, 1.4)))
new.append(log_(2, 1500, 640))
new.append(log_(3, 1790, 1200))
new.append(prop("boat", 1655, 1560, 1.3))            # second boat moored downstream
new.append(lamp(1470, 1062, 3))                       # dock-approach lamps
new.append(lamp(1812, 1062, 3))
new.append(box(1478, 945, 3))
new.append(box(1822, 952, 1))

# ── sheep paddock in the south-west field ────────────────────────────────────
PX0, PX1, PY0, PY1 = 260, 560, 1480, 1680
for x in range(PX0 + 10, PX1, 56):
    new.append(fence_h(x, PY0, random.choice([1, 3])))
    new.append(fence_h(x, PY1, random.choice([1, 3])))
for y in range(PY0 + 30, PY1, 60):
    new.append(fence_v(PX0, y))
    if not 1540 <= y <= 1620:                         # gate gap on the east side
        new.append(fence_v(PX1, y))
for sx, sy in [(340, 1545), (430, 1600), (500, 1530), (370, 1655)]:
    new.append(sheep(sx, sy))
new.append(sheep(625, 1592))                          # one wandered out the gate

# ── east-bank farmstead: tilled plot + scarecrow by the yellow houses ────────
for ry in (620, 664, 708):
    for x in range(1900, 2200, 40):
        new.append(dirt(random.choice([1, 2, 3, 4, 5, 6]), x + random.uniform(-4, 4), ry + random.uniform(-3, 3)))
new.append(prop("scarecrow", 2050, 590, 1.4))
new.append(fence_h(1900, 580, 1), )
new.append(fence_h(2180, 580, 3))

# ── trader camp at the south-east road bend ──────────────────────────────────
new.append(tent(2330, 1450, 3))
new.append(tent(2462, 1518, 4))
new.append(campfire(2390, 1568))
new.append(box(2348, 1588, 1))
new.append(box(2496, 1462, 3))
new.append(log_(2, 2434, 1614))
new.append(lamp(2392, 1430, 1))

# ── tree groves filling the empty meadows ────────────────────────────────────
TREES = [
    (240, 430, 1.5), (450, 300, 1.3), (1300, 430, 1.45), (1440, 250, 1.25),
    (180, 1380, 1.4), (1080, 1620, 1.5), (1340, 1650, 1.3), (1460, 1430, 1.2),
    (1900, 350, 1.45), (2090, 250, 1.25), (2700, 400, 1.5), (2920, 560, 1.3),
    (1950, 1320, 1.4), (2160, 1560, 1.3), (2870, 1640, 1.5), (3010, 1320, 1.35),
]
for x, y, sc in TREES:
    new.append(tree(x + random.uniform(-12, 12), y + random.uniform(-8, 8), sc))
    if random.random() < 0.6:
        new.append(bush(random.randint(1, 4), x + random.uniform(-90, 90), y + random.uniform(30, 70)))

# ── grass tufts and flower patches across the open ground ────────────────────
GRASS_SPOTS = [(360, 520), (560, 380), (900, 420), (1120, 280), (1240, 700),
               (300, 880), (200, 1150), (560, 1560), (920, 1320), (1240, 1480),
               (1420, 870), (1900, 700), (2050, 480), (2330, 350), (2760, 640),
               (2980, 840), (1880, 1150), (2080, 1380), (2620, 1520), (2900, 1180),
               (3000, 1560), (1980, 1740), (1480, 1750), (340, 1310), (2550, 880)]
for gx, gy in GRASS_SPOTS:
    for _ in range(random.randint(2, 3)):
        new.append(grass(random.randint(1, 6), gx + random.uniform(-50, 50), gy + random.uniform(-35, 35)))
for fx, fy in [(300, 460), (1340, 500), (250, 1330), (2680, 460), (2840, 1560),
               (2000, 1280), (1180, 1540), (2540, 320)]:
    for _ in range(random.randint(2, 4)):
        new.append(flower(random.randint(1, 12), fx + random.uniform(-45, 45), fy + random.uniform(-30, 30)))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 16 dressed: +{len(new)} sprites, +{len(ground)} strokes, "
      f"total {len(sprites)}, anim {anim}")
