#!/usr/bin/env python3
"""
Region 34 "Forgotten Well (Vismṛti Kūpa)" — dressing pass.

Deepest Sunless Deep region; all three portals were reachable (the secret
gate to the Erased Path already stands at 2700,992). Keeps every gameplay
element and adds:
  • realistic cave walls: the 295 uniform-scatter rocks are re-laid as a
    tight rampart along both corridor faces with continuous mass behind,
    murals and pillars standing in front of the rock like built things
  • a broad three-layer road, west→east, swinging NORTH around the well
    pit along the existing lamp line, with a spur to the secret gate
  • the well made forgotten: skulls at the rim, a violet glow rising from
    the mouth (glow-priority), bones of those who remembered too late
  • the Voice in the Void: a ring of void crystals and skulls around the
    NPC — no fire here, only cold light
  • the secret gate hinted in gold: amber crystals flanking the arch
  • skull rows beneath each mural; floor pebbles texturing the dark
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_34.json"
random.seed(3434)

PROPS = "assets_custom/props"
GEN = "r34dress"

ANCHOR = {
    "skull":          (40, 38, 20, 37),
    "bone_pile":      (84, 60, 42, 59),
    "crystal_purple": (64, 116, 32, 115),
    "crystal_amber":  (64, 116, 32, 115),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r34_d")

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r34_d{_n[0]:04d}"

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

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

# ── realistic cave walls: rebuild the rock field ─────────────────────────────
sprites[:] = [s for s in sprites if not (
    s.get("type") == "sprite" and str(s.get("name", "")).startswith("Rock")
    and s.get("dir") == "assets_custom/rocks_sand")]

tops, bots = {}, {}
for z in d["noWalkZones"]:
    if z["id"] == "z34_pool":
        continue
    if z["y"] < 0 and z["h"] > 300:
        tops[z["x"]] = z["y"] + z["h"]
    elif z["y"] > 400:
        bots[z["x"]] = z["y"]

new = []
priority = []

for k in range(0, 3200, 200):
    yface_t, yface_b = tops.get(k), bots.get(k)
    if yface_t:
        for fx in range(k + 25, k + 200, 50):
            new.append(rock(fx + random.uniform(-14, 14), yface_t - random.uniform(5, 60),
                            random.uniform(2.0, 2.6)))
        for _ in range(5):
            new.append(rock(k + random.uniform(10, 190), yface_t - random.uniform(60, 420),
                            random.uniform(2.3, 3.2)))
    if yface_b:
        for fx in range(k + 25, k + 200, 50):
            new.append(rock(fx + random.uniform(-14, 14), yface_b + random.uniform(125, 185),
                            random.uniform(2.0, 2.6)))
        for _ in range(5):
            new.append(rock(k + random.uniform(10, 190), yface_b + random.uniform(185, 560),
                            random.uniform(2.3, 3.2)))
    if yface_t and yface_b and random.random() < 0.6:
        x = k + random.uniform(20, 180)
        y = random.uniform(yface_t + 120, yface_b - 60)
        if not (1300 < x < 1900 and 800 < y < 1200):      # keep the well mouth clear
            new.append(rock(x, y, random.uniform(0.55, 0.85)))

# ── the broad road: west → north past the well → east, + secret-gate spur ────
ROAD = [120, 1018, 500, 1010, 900, 980, 1200, 880, 1450, 760, 1750, 720,
        2000, 800, 2250, 880, 2550, 900, 2820, 905, 3090, 918]
sprites[0:0] = [stroke("#241f2b", 150, ROAD), stroke("#2b2533", 96, ROAD),
                stroke("#332c3d", 46, ROAD)]
SPUR = [2550, 900, 2640, 950, 2700, 985]
sprites.extend([stroke("#241f2b", 110, SPUR), stroke("#2b2533", 64, SPUR)])

# ── the well's mouth (pit 1408–1792, 880–1120) ───────────────────────────────
priority.append(prop("crystal_purple", 1600, 1060, 1.1))   # violet glow from below
for a_ in range(6):
    a = a_ / 6 * 2 * math.pi + 0.3
    new.append(prop("skull", 1600 + math.cos(a) * 255, 1000 + math.sin(a) * 165,
                    random.uniform(1.25, 1.5)))
new.append(prop("bone_pile", 1372, 1180, 1.3))
new.append(prop("bone_pile", 1846, 1156, 1.2))

# ── the Voice in the Void (NPC at 320,1046) ──────────────────────────────────
for a_ in range(3):
    a = a_ / 3 * 2 * math.pi + 0.6
    priority.append(prop("crystal_purple", 320 + math.cos(a) * 120, 1046 + math.sin(a) * 76,
                         random.uniform(0.85, 1.05)))
new.append(prop("skull", 230, 1130, 1.4))
new.append(prop("skull", 408, 1124, 1.35))

# ── the secret gate, hinted in gold (gate_arch at 2700,992 → region 39) ──────
priority.append(prop("crystal_amber", 2618, 1046, 0.85))
priority.append(prop("crystal_amber", 2788, 1040, 0.8))
new.append(prop("skull", 2706, 1080, 1.3))

# ── skull rows beneath each mural ────────────────────────────────────────────
for mx, my in [(700, 760), (1100, 1200), (2100, 760), (2500, 1200)]:
    for i in range(3):
        new.append(prop("skull", mx - 60 + i * 60, my + 46 + (i % 2) * 14,
                        random.uniform(1.2, 1.4)))

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
print(f"region 34 dressed: +{len(new) + len(priority)} sprites, total {len(sprites)}")
