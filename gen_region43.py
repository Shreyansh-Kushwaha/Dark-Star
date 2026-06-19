#!/usr/bin/env python3
"""
Region 43 "Tidewreck Harbor (Bhagnapota)" — dressing pass.

Act II spur off Ferry Village: a wrecked harbor on open water. Keeps every
gameplay element and adds:
  • the bell tower lit: braziers at its base on a rock islet, a warm
    light-pool on the water — the harbor's one beacon
  • the wrecks made wrecks: broken masts (dead trees rising from the
    water), split pier sections (bridge_break pieces) and rubble around
    the four sunken boats
  • the boardwalk worked: lamps spaced along the pier, cargo crates and
    gold bales, dock ends, reed clumps at the pilings
  • Bellwright Saru's forge-shop at the shrine: campfire, crates, ingots
  • the sea alive: animated water-rocks and splashes, wave-line groups
    north and south, reef clusters in the corners, red marker-buoys
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_43.json"
random.seed(4343)

PROPS = "assets_custom/props"
GEN = "r43dress"

ANCHOR = {
    "reed":      (34, 74, 17, 73),
    "lily_pad":  (44, 28, 22, 14),
    "dead_tree": (96, 132, 48, 131),
    "dock":      (124, 70, 62, 35),
    "flag_red":  (58, 112, 13, 110),
    "brazier":   (44, 78, 22, 77),
    "skull":     (40, 38, 20, 37),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r43_d")

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r43_d{_n[0]:04d}"

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
    return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Rocks",
                f"Rock{random.randint(1,4)}.png", "Rock", x, y,
                sc or random.uniform(0.8, 1.3), 32, 63)

def crate(x, y): return base("assest4/next2/2 Objects/4 Box", "3.png", "crate", x, y, 2.1, 10, 21)
def gold(x, y):  return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones", f"Gold Stone {random.randint(1,6)}.png", "ware", x, y, 0.6, 64, 127)
def lamp(x, y):  return base("assest4/map_objects/2 Objects/7 Decor", "Lamp3.png", "lamp", x, y, 2.8, 6.5, 34)
def wreck(frame, x, y, sc=1.2):
    return base("assets_custom/structures", f"{frame}.png", frame, x, y, sc, 80, 60)

def water_rock(x, y):
    return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Rocks in the Water",
                f"Water Rocks_{random.randint(1,4):02d}.png", "WaterRock", x, y, 1, 32, 32,
                {"animated": True, "frameW": 64, "frameH": 64, "frameCount": 16, "frameRow": 0})

def splash(x, y):
    return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Particle FX",
                "Water Splash.png", "Water Splash", x, y, 1, 96, 96,
                {"animated": True, "frameW": 192, "frameH": 192, "frameCount": 9, "frameRow": 0})

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

new = []
priority = []

# ── the bell tower lit (Tower at 1300,800) ───────────────────────────────────
sprites[0:0] = [stroke("#6a6048", 130, ellipse_pts(1300, 790, 130, 72))]   # rock islet base
sprites.append(stroke("#7a6c3a", 60, ellipse_pts(1300, 820, 200, 110)))    # warm light on water
priority.append(prop("brazier", 1208, 822, 1.7))
priority.append(prop("brazier", 1392, 822, 1.7))
for a_ in range(5):
    a = a_ / 5 * 2 * math.pi + 0.4
    new.append(rock(1300 + math.cos(a) * 150, 800 + math.sin(a) * 84))

# ── the wrecks made wrecks ───────────────────────────────────────────────────
WRECKS = [(620, 980), (1500, 1250), (2400, 1020), (1950, 1500)]
for i, (wx, wy) in enumerate(WRECKS):
    new.append(prop("dead_tree", wx + random.choice([-70, 70]), wy - 30,
                    random.uniform(1.2, 1.5)))                       # broken mast
    if i % 2 == 0:
        new.append(wreck("bridge_break_l", wx - 110, wy + 56, 1.0))  # split hull piece
    else:
        new.append(wreck("bridge_rubble", wx + 96, wy + 50, 1.1))
    new.append(prop("lily_pad", wx + random.uniform(-50, 50), wy + 80, 1.1))
new.append(prop("skull", 1565, 1310, 1.3))                           # one lost sailor

# ── the boardwalk worked (decks y≈1140-1220, x300-2720) ──────────────────────
for lx in (410, 850, 1290, 1730, 2170, 2610):
    new.append(lamp(lx, 1108))
for cx_, cy_ in [(360, 1190), (1075, 1135), (1955, 1190), (2440, 1150)]:
    new.append(crate(cx_, cy_))
    if random.random() < 0.6:
        new.append(gold(cx_ + 42, cy_ + 8))
new.append(prop("dock", 230, 1240, 1.2))                             # west landing
new.append(prop("dock", 2810, 1130, 1.2))                            # east end
for px, py in [(300, 1250), (960, 1190), (1620, 1210), (2280, 1235), (2720, 1180)]:
    for _ in range(2):
        new.append(prop("reed", px + random.uniform(-30, 30), py + random.uniform(40, 70),
                        random.uniform(1.4, 1.9)))

# ── Bellwright Saru's shop (NPC 360,1000; shrine/mural at 1300,980) ──────────
priority.append(campfire(268, 920))
new.append(crate(444, 938))
new.append(gold(218, 1062))
new.append(lamp(480, 1050))

# ── the sea alive ────────────────────────────────────────────────────────────
for wx_, wy_ in [(800, 600), (1900, 520), (2750, 700), (550, 1550), (2950, 1450), (1500, 620)]:
    new.append(water_rock(wx_, wy_))
new.append(splash(1100, 700))
new.append(splash(2200, 1430))
for grp_y in (380, 1660):                                            # wave-line groups
    for k in range(3):
        yy = grp_y + k * 36
        sprites.append(stroke("#6a8095", 5, [200 + k * 60, yy, 1400 + k * 50, yy + 8,
                                             2900 - k * 40, yy]))
new.append(prop("flag_red", 850, 880, 0.85))                         # marker buoys
new.append(prop("flag_red", 2150, 880, 0.85))

# ── reef clusters in the corners ─────────────────────────────────────────────
for rx_, ry_ in [(300, 300), (2800, 280), (400, 1800), (2900, 1760), (1700, 280)]:
    for _ in range(3):
        new.append(rock(rx_ + random.uniform(-90, 90), ry_ + random.uniform(-40, 40),
                        random.uniform(0.7, 1.1)))

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 43 dressed: +{len(new) + len(priority)} sprites, total {len(sprites)}, anim {anim}")
