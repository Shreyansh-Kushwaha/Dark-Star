#!/usr/bin/env python3
"""
Region 39 "Sixth Gate (Ṣaṣṭha Dvāra)" — dressing pass.

First region of the secret Erased Path: a memory gallery where the Thread
runs WHOLE. No enemies — a sanctum. Keeps every gameplay element and adds:
  • a warm stone avenue under the Thread, with a halo of light at the gate
  • six golden halo-rings inlaid along the floor — the six erased kings
  • the gallery formalized: every mural gets a gold offering at its base,
    alternating with small amber crystals (anchored to the murals in the
    JSON, wherever they stand)
  • the north branch: a thread-spur climbs to the Threshold of Names
    portal, framed by amber crystals and leaning void shards
  • the Guardian of Memory's post: lantern, bench, crystal pair
  • the void pressing in: loose shard banks above and below the gallery
  • a dim golden starfield, and the Sixth's constellation joined by
    hairlines in the north dark
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_39.json"
random.seed(3939)

PROPS = "assets_custom/props"
GEN = "r39dress"

ANCHOR = {
    "void_shard":     (120, 86, 60, 85),
    "crystal_amber":  (64, 116, 32, 115),
    "brazier":        (44, 78, 22, 77),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r39_d")

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r39_d{_n[0]:04d}"

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

def gold(x, y):  return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones", f"Gold Stone {random.randint(1,6)}.png", "ware", x, y, random.uniform(0.5, 0.65), 64, 127)
def lamp(x, y):  return base("assest4/map_objects/2 Objects/7 Decor", "Lamp3.png", "lamp", x, y, 2.6, 6.5, 34)
def log_(x, y):  return base("assest4/map_objects/2 Objects/7 Decor", "Log4.png", "Log4", x, y, 1.8, 16.5, 31)

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

def ellipse_pts(cx, cy, rx, ry, n=18):
    out = []
    for i in range(n + 1):
        a = i / n * 2 * math.pi
        out += [cx + rx * math.cos(a), cy + ry * math.sin(a)]
    return out

# ── the warm avenue + the gate's halo of light ───────────────────────────────
AVE = [120, 1000, 900, 1004, 1700, 996, 2500, 1004, 3090, 1000]
sprites[0:0] = [
    stroke("#2c2310", 190, AVE),
    stroke("#372c14", 120, AVE),
    stroke("#423618", 54,  AVE),
    stroke("#3a2e14", 150, ellipse_pts(1600, 1000, 230, 150)),   # gate halo disk
]

# ── six golden halo-rings inlaid along the avenue ────────────────────────────
HALOS = [560, 940, 1320, 1880, 2260, 2640]
for hx in HALOS:
    sprites.append(stroke("#7a5a16", 6, ellipse_pts(hx, 1002, 62, 34)))
    sprites.append(stroke("#d8b24a", 3, ellipse_pts(hx, 1002, 62, 34)))

# ── the north branch: thread-spur to the Threshold of Names (1600,320) ───────
SPUR = [1600, 980, 1588, 760, 1606, 540, 1600, 330]
sprites.append(stroke("#7a5a16", 10, SPUR))
sprites.append(stroke("#d8b24a", 5, SPUR))
sprites.append(stroke("#f4e08a", 2, SPUR))

new = []
priority = []

# ── gallery accents anchored to the murals as they stand ─────────────────────
murals = [s for s in sprites if s.get("type") == "sprite" and s.get("name") == "mural"
          and not str(s.get("spriteId", "")).startswith("s_r39_d")]
for i, m in enumerate(sorted(murals, key=lambda s: (s["y"], s["x"]))):
    mx, my = m["x"], m["y"]
    new.append(gold(mx - 56, my + 34))
    if i % 2 == 0:
        new.append(prop("crystal_amber", mx + 62, my + 26, random.uniform(0.6, 0.8)))

# ── the north branch framed ──────────────────────────────────────────────────
priority.append(prop("crystal_amber", 1518, 560, 0.9))
priority.append(prop("crystal_amber", 1684, 540, 0.85))
new.append(prop("void_shard", 1480, 372, 1.3))
new.append(prop("void_shard", 1722, 380, 1.25))
new.append(gold(1556, 420))

# ── the Guardian of Memory's post (NPC at 360,1000) ──────────────────────────
new.append(lamp(280, 936))
new.append(log_(432, 1058))
priority.append(prop("crystal_amber", 222, 1060, 0.8))

# ── the void pressing in: loose shard banks above and below ──────────────────
for bx in range(150, 3100, 230):
    if 1380 < bx < 1850:                          # keep the north spur clear
        yy = 360
    else:
        yy = random.uniform(330, 460)
        new.append(prop("void_shard", bx + random.uniform(-50, 50), yy,
                        random.uniform(0.9, 1.3)))
    new.append(prop("void_shard", bx + random.uniform(-50, 50),
                    random.uniform(1560, 1700), random.uniform(0.9, 1.3)))

# ── golden starfield + the Sixth's constellation ─────────────────────────────
random.seed(391)
for _ in range(30):
    sx_ = random.uniform(60, 3140)
    sy_ = random.uniform(60, 1940)
    if 840 < sy_ < 1180 or (1380 < sx_ < 1850 and 250 < sy_ < 1000):
        continue
    sprites.append(stroke(random.choice(["#8a7434", "#d8b24a", "#5a4a26"]),
                          random.choice([3, 3, 4]), [sx_, sy_, sx_ + 1, sy_ + 1]))
CONST = [2350, 480, 2520, 400, 2700, 460, 2840, 380, 2980, 440, 2620, 560]
sprites.append(stroke("#5a4a26", 2, CONST))
for i in range(0, len(CONST), 2):
    sprites.append(stroke("#f4e08a", 5, [CONST[i], CONST[i + 1], CONST[i] + 1, CONST[i + 1] + 1]))

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
print(f"region 39 dressed: +{len(new) + len(priority)} sprites, total {len(sprites)}")
