#!/usr/bin/env python3
"""
Region 42 "Root Hollows (Mūlabila)" — dressing pass.

Act I spur: the burrow beneath the great forest, where the roots drink.
Keeps every gameplay element and adds:
  • the Great Root: one trunk-thick root winds across the cavern, and the
    scattered golden rootlets now visibly branch from it toward the shrine
  • the root-spring: a small pool before the mural — what the roots drink
    — with reeds and a pad on the still water
  • realistic rock-work: the uniform scatter is re-laid as cavern banks
    along the map edges and clusters ringing the dark hollows
  • Root-Tender Oja's den: campfire, lamp, crate, seat log
  • amber veins: the crystals gathered into glowing vein-pockets, with a
    pair lighting the shrine (glow-priority)
  • burrow life: bone piles and skulls where the rats nest
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_42.json"
random.seed(4242)

PROPS = "assets_custom/props"
GEN = "r42dress"

ANCHOR = {
    "crystal_amber": (64, 116, 32, 115),
    "reed":          (34, 74, 17, 73),
    "lily_pad":      (44, 28, 22, 14),
    "skull":         (40, 38, 20, 37),
    "bone_pile":     (84, 60, 42, 59),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r42_d")

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r42_d{_n[0]:04d}"

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
                x, y, sc or random.uniform(1.1, 1.8), 32, 63)

def crate(x, y): return base("assest4/next2/2 Objects/4 Box", "3.png", "crate", x, y, 2.1, 10, 21)
def lamp(x, y):  return base("assest4/map_objects/2 Objects/7 Decor", "Lamp1.png", "lamp", x, y, 3.0, 10, 34)
def log_(x, y):  return base("assest4/map_objects/2 Objects/7 Decor", "Log3.png", "Log3", x, y, 1.8, 16.5, 31)

def campfire(x, y):
    return base("assest4/map_objects/3 Animated Objects/2 Campfire", "1.png", "1",
                x, y, 1.6, 16, 60,
                {"animated": True, "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0})

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

# ── realistic rock-work: rebuild the scatter ─────────────────────────────────
sprites[:] = [s for s in sprites if not (
    s.get("type") == "sprite" and str(s.get("name", "")).startswith("Rock")
    and s.get("dir") == "assets_custom/rocks_sand")]

new = []
priority = []

# cavern banks along the unwalled edges (visual borders for a zone-less map)
x = 30.0
while x < 3200:
    new.append(rock(x + random.uniform(-20, 20), 70 + random.uniform(-18, 18),
                    random.uniform(1.4, 2.1)))
    if random.random() < 0.6:
        new.append(rock(x + 60 + random.uniform(-20, 20), 150 + random.uniform(-20, 20),
                        random.uniform(1.1, 1.6)))
    x += 130
x = 30.0
while x < 3200:
    new.append(rock(x + random.uniform(-20, 20), 1942 + random.uniform(-18, 18),
                    random.uniform(1.4, 2.1)))
    if random.random() < 0.55:
        new.append(rock(x + 60 + random.uniform(-20, 20), 1860 + random.uniform(-20, 20),
                        random.uniform(1.1, 1.6)))
    x += 130
for sy in range(220, 1860, 150):                  # east wall (west has the portal)
    new.append(rock(3140 + random.uniform(-24, 24), sy + random.uniform(-20, 20),
                    random.uniform(1.3, 1.9)))
for sy in (260, 480, 680, 1320, 1540, 1760):      # west wall, parting at the portal
    new.append(rock(46 + random.uniform(-16, 16), sy, random.uniform(1.3, 1.8)))

# clusters ringing the dark hollows (sampled from the big blob strokes)
hollows = [s for s in sprites if s.get("type") == "stroke" and s.get("gen") != GEN
           and s["strokeWidth"] > 100][:14]
for h in hollows:
    pts = h["points"]
    cx = sum(pts[0::2]) / (len(pts) // 2)
    cy = sum(pts[1::2]) / (len(pts) // 2)
    if 1200 < cx < 2050 and 700 < cy < 1250:      # keep the shrine clearing open
        continue
    for _ in range(random.randint(2, 3)):
        a = random.uniform(0, 2 * math.pi)
        new.append(rock(cx + math.cos(a) * random.uniform(80, 140),
                        cy + math.sin(a) * random.uniform(50, 90),
                        random.uniform(0.8, 1.3)))

# ── the Great Root: trunk winding NE → shrine → SW ───────────────────────────
GREAT = [2980, 180, 2600, 360, 2200, 560, 1900, 740, 1700, 860,
         1500, 940, 1200, 1100, 860, 1300, 520, 1520, 220, 1760]
sprites.append(stroke("#523a1c", 30, GREAT))
sprites.append(stroke("#6a4a22", 18, GREAT))
sprites.append(stroke("#8a6434", 7, GREAT))
# rootlets branching off the trunk toward the existing gold root-lines
for bx, by, ex, ey in [(2600, 360, 2380, 240), (2200, 560, 2050, 420),
                       (1200, 1100, 1000, 1000), (860, 1300, 700, 1180),
                       (1900, 740, 2080, 880), (520, 1520, 420, 1400)]:
    sprites.append(stroke("#6a4a22", 9, [bx, by, (bx + ex) / 2 + 20, (by + ey) / 2, ex, ey]))
    sprites.append(stroke("#8a6434", 4, [bx, by, (bx + ex) / 2 + 20, (by + ey) / 2, ex, ey]))

# ── the root-spring before the mural (mural at 1640,900) ─────────────────────
sprites.extend([
    stroke("#1c3a38", 110, ellipse_pts(1640, 1080, 80, 44)),
    stroke("#2f6d64", 70,  ellipse_pts(1640, 1080, 44, 24)),
    stroke("#4a9a8c", 30,  ellipse_pts(1632, 1072, 22, 12)),
])
for a_ in range(4):
    a = a_ / 4 * 2 * math.pi + 0.5
    new.append(prop("reed", 1640 + math.cos(a) * 110, 1086 + math.sin(a) * 62,
                    random.uniform(1.4, 1.9)))
new.append(prop("lily_pad", 1618, 1074, 1.1))
priority.append(prop("crystal_amber", 1560, 1010, 0.9))
priority.append(prop("crystal_amber", 1726, 1006, 0.85))

# ── Root-Tender Oja's den (NPC at 360,1000) ──────────────────────────────────
priority.append(campfire(262, 928))
new.append(lamp(458, 938))
new.append(crate(212, 1066))
new.append(log_(420, 1080))

# ── amber veins: gather light into pockets ───────────────────────────────────
for vx, vy in [(940, 560), (2420, 480), (760, 1300), (2580, 1140)]:
    new.append(prop("crystal_amber", vx + random.uniform(-30, 30),
                    vy + random.uniform(-20, 20), random.uniform(0.6, 0.8)))
    new.append(prop("crystal_amber", vx + random.uniform(30, 70),
                    vy + random.uniform(20, 50), random.uniform(0.45, 0.6)))

# ── burrow life: where the rats nest ─────────────────────────────────────────
new.append(prop("bone_pile", 2230, 1310, 1.15))
new.append(prop("skull", 2330, 1260, 1.3))
new.append(prop("bone_pile", 940, 1190, 1.1))
new.append(prop("skull", 1860, 1060, 1.25))

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 42 dressed: +{len(new) + len(priority)} sprites, total {len(sprites)}, anim {anim}")
