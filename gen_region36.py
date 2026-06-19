#!/usr/bin/env python3
"""
Region 36 "The Between (Antarāla)" — dressing pass.

The rest-stop between Severance regions: no enemies, a Keeper, a shrine,
the golden Thread. Sparse is the point — this pass completes the intent
rather than filling space. Keeps every gameplay element and adds:
  • the Thread continues: from the shrine east to the next portal, whole;
    and south toward the Unwound Waste portal it FRAYS — breaking into
    shorter and shorter gold fragments until it stops
  • the sanctuary made a circle: stone seats around the existing fire,
    twin braziers at the shrine steps, a crystal arc behind the mural
  • the Keeper's post: lantern, bench and signpost by the west portal
  • the south portal flanked by leaning void shards — a doorway of
    unravelling; a warning sign before it
  • a few quiet constellation clusters of shards in the emptiness
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_36.json"
random.seed(3636)

PROPS = "assets_custom/props"
GEN = "r36dress"

ANCHOR = {
    "void_shard":   (120, 86, 60, 85),
    "crystal_cyan": (64, 116, 32, 115),
    "brazier":      (44, 78, 22, 77),
    "skull":        (40, 38, 20, 37),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r36_d")

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r36_d{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def base(dir_, frame, name, x, y, scale, ox, oy):
    return {
        "type": "sprite", "spriteId": sid(), "dir": dir_,
        "frames": [frame], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def rock(x, y, sc):
    return base("assets_custom/rocks_sand", f"Rock{random.randint(1,4)}.png", "Rock",
                x, y, sc, 32, 63)

def lamp(x, y):  return base("assest4/map_objects/2 Objects/7 Decor", "Lamp3.png", "lamp", x, y, 2.6, 6.5, 34)
def sign(x, y):  return base("assest4/map_objects/2 Objects/3 Pointer", "1.png", "sign", x, y, 2.4, 10, 35)
def log_(x, y):  return base("assest4/map_objects/2 Objects/7 Decor", "Log4.png", "Log4", x, y, 1.8, 16.5, 31)

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

# ── the Thread, continued (existing line runs 200,1150 → the mural 1600,1130) ─
# east: whole and steady, mural → next portal
EAST = [1600, 1140, 2050, 1104, 2500, 1050, 2820, 1020, 3090, 1000]
sprites.append(stroke("#7a5a16", 14, EAST))
sprites.append(stroke("#d8b24a", 7, EAST))
sprites.append(stroke("#f4e08a", 3, EAST))
# south: fraying toward the Unwound Waste — shorter and shorter fragments
FRAY = [(1596, 1210, 1320), (1606, 1372, 1452), (1594, 1502, 1548), (1604, 1610, 1632)]
for fx, y0, y1 in FRAY:
    sprites.append(stroke("#d8b24a", 6, [fx, y0, fx + random.uniform(-14, 14), y1]))
    sprites.append(stroke("#f4e08a", 2, [fx, y0, fx + random.uniform(-14, 14), y1]))

new = []

# ── the sanctuary circle (campfire at 1000,1040; logs 940/1060,1110) ─────────
import math
for a_ in range(5):
    a = a_ / 5 * 2 * math.pi + 0.62
    new.append(rock(1000 + math.cos(a) * 130, 1052 + math.sin(a) * 80, random.uniform(0.9, 1.2)))
new.append(log_(1000, 968))
# twin braziers at the mural's corners (shrine at 1600,940–1130)
new.append(prop("brazier", 1474, 1162, 1.5))
new.append(prop("brazier", 1726, 1162, 1.5))
# crystal arc behind the pillars
for i in range(4):
    new.append(prop("crystal_cyan", 1410 + i * 128, 868 - (18 if i in (1, 2) else 0),
                    random.uniform(0.7, 0.95)))

# ── the Keeper's post (NPC at 360,1000; west portal 120,1000) ────────────────
new.append(lamp(282, 938))
new.append(log_(420, 1056))
new.append(sign(456, 962))

# ── the south doorway (portal to 47 at 1600,1720) ────────────────────────────
new.append(prop("void_shard", 1488, 1700, 1.5))
new.append(prop("void_shard", 1714, 1706, 1.45))
new.append(sign(1530, 1600))
new.append(prop("skull", 1668, 1620, 1.3))

# ── memory islands: fragments of every world, adrift in the Between ──────────
def a4(dir_, frame, name, x, y, scale, ox, oy):
    return base(dir_, frame, name, x, y, scale, ox, oy)

def ellipse_pts(cx, cy, rx, ry, n=14):
    out = []
    for i in range(n + 1):
        a = i / n * 2 * math.pi
        out += [cx + rx * math.cos(a), cy + ry * math.sin(a)]
    return out

def island(cx, cy, ground, rx=170, ry=95):
    sprites.append(stroke(ground, 120, ellipse_pts(cx, cy, rx * 0.72, ry * 0.72)))
    sprites.append(stroke("#1d1a24", 10, ellipse_pts(cx, cy, rx, ry)))  # rim of void

# a faint dim thread ties each island toward the main line
def memory_thread(x0, y0, x1, y1):
    sprites.append(stroke("#8a7434", 3, [x0, y0, (x0 + x1) / 2 + 30, (y0 + y1) / 2, x1, y1]))

# forest fragment (Act I)
island(640, 420, "#3f6354")
new.append(a4("cropped", "Tree2_crop.png", "Tree2_crop", 600, 470, 1.0, 69, 238))
new.append(a4("cropped", "Bushe2_crop.png", "bush", 706, 446, 0.95, 40, 72))
new.append(a4("assest4/map_objects/2 Objects/6 Flower", "7.png", "flower", 560, 408, 2.0, 3, 4))
memory_thread(700, 510, 900, 1090)

# desert fragment (Act III)
island(2380, 380, "#9a7e4d")
new.append(a4(PROPS, "cactus.png", "cactus", 2330, 420, 1.45, 24, 91))
new.append(rock(2444, 400, 1.1))
new.append(a4("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones",
              "Gold Stone 4.png", "ware", 2398, 432, 0.55, 64, 127))
memory_thread(2380, 480, 2240, 1086)

# snow fragment (Act IV)
island(2870, 1480, "#c6d2dd")
new.append(a4(PROPS, "ice_shard.png", "ice_shard", 2820, 1500, 1.3, 26, 115))
new.append(a4(PROPS, "ice_shard.png", "ice_shard", 2916, 1520, 0.9, 26, 115))
new.append(a4(PROPS, "dead_tree.png", "dead_tree", 2900, 1452, 1.1, 48, 131))
memory_thread(2870, 1390, 2700, 1062)

# swamp fragment (Act II)
island(520, 1530, "#33524a")
new.append(a4(PROPS, "reed.png", "reed", 470, 1556, 1.9, 17, 73))
new.append(a4(PROPS, "reed.png", "reed", 560, 1568, 1.6, 17, 73))
new.append(a4(PROPS, "lily_pad.png", "lily_pad", 528, 1510, 1.3, 22, 14))
new.append(a4(PROPS, "skull.png", "skull", 588, 1518, 1.3, 20, 37))
memory_thread(560, 1440, 760, 1148)

# sky fragment (Act IV approach)
island(1960, 330, "#a8c4dc")
new.append(a4(PROPS, "cloud_platform.png", "cloud_platform", 1960, 360, 0.95, 110, 52))
new.append(a4(PROPS, "pillar.png", "pillar", 1932, 322, 0.62, 30, 195))
memory_thread(1960, 430, 1820, 1116)

# ember fragment (Act III depths)
island(2620, 760, "#3a2c24")
new.append(a4(PROPS, "lava_rock.png", "lava_rock", 2576, 786, 1.0, 36, 55))
new.append(a4(PROPS, "fumarole.png", "fumarole", 2666, 776, 0.95, 30, 70))
memory_thread(2620, 850, 2560, 1044)

# the Keeper's impossible garden — green grass in the void
island(310, 760, "#3f6354", rx=130, ry=72)
for _ in range(4):
    new.append(a4("assest4/map_objects/2 Objects/6 Flower", f"{random.randint(1,12)}.png",
                  "flower", 310 + random.uniform(-70, 70), 760 + random.uniform(-34, 34), 2.0, 3, 4))
new.append(a4("assest4/next2/2 Objects/5 Grass", "3.png", "grass", 262, 742, 2.6, 3, 6))
new.append(a4("assest4/next2/2 Objects/5 Grass", "5.png", "grass", 366, 778, 2.6, 3, 6))

# ── the starfield: the void between worlds, pricked with light ───────────────
random.seed(363)
for _ in range(46):
    sx_ = random.uniform(40, 3160)
    sy_ = random.uniform(40, 1960)
    # keep stars off the corridor band and the shrine
    if 850 < sy_ < 1250 or (1300 < sx_ < 1900 and 800 < sy_ < 1300):
        continue
    w = random.choice([3, 3, 4, 5])
    col = random.choice(["#cfd8e8", "#cfd8e8", "#9fb8d8", "#e8d8a0"])
    sprites.append(stroke(col, w, [sx_, sy_, sx_ + 1, sy_ + 1]))

# two constellations joined by hairlines
for pts in ([2150, 1550, 2300, 1480, 2420, 1560, 2560, 1500],
            [900, 300, 1060, 240, 1180, 320]):
    sprites.append(stroke("#4a5468", 2, pts))
    for i in range(0, len(pts), 2):
        sprites.append(stroke("#cfd8e8", 5, [pts[i], pts[i + 1], pts[i] + 1, pts[i + 1] + 1]))

# ── mirror pool: a still eye of pale light ───────────────────────────────────
sprites.append(stroke("#3a4458", 110, ellipse_pts(1150, 1620, 70, 38)))
sprites.append(stroke("#5a6e88", 64, ellipse_pts(1150, 1620, 38, 20)))
sprites.append(stroke("#9fb8d8", 24, ellipse_pts(1144, 1612, 18, 9)))
new.append(prop("crystal_cyan", 1228, 1596, 0.8))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
print(f"region 36 dressed: +{len(new)} sprites, total {len(sprites)}")
