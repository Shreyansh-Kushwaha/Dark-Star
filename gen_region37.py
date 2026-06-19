#!/usr/bin/env python3
"""
Region 37 "Severance Fortress (Viyoga Durga)" — final-boss dressing pass.

The climax region was barely dressed: a causeway that stopped, an empty
arena. Keeps every gameplay element (boss vanasur at 2680,1000) and adds:
  • torn void-walls: rocks + void shards re-laid as ramparts along both
    corridor faces, massing thicker as they approach the fortress
  • the causeway lit in cold purple: crystal pairs between the pillars
  • the Thread's end: the gold line continues past its old stop, breaks
    into fragments, and DIES at the arena's threshold — this is where it
    was severed
  • the fortress: a ring of great void shards and broken pillars around
    the boss arena, a dark floor disk, skull ring, and twin shard-towers
    at the gate where the causeway enters
  • the Voice in the Void echoed by a split crystal pair at the entrance
  • a quiet exit threshold past the arena toward region 38
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_37.json"
random.seed(3737)

PROPS = "assets_custom/props"
GEN = "r37dress"

ANCHOR = {
    "void_shard":     (120, 86, 60, 85),
    "crystal_purple": (64, 116, 32, 115),
    "skull":          (40, 38, 20, 37),
    "bone_pile":      (84, 60, 42, 59),
    "pillar":         (60, 196, 30, 195),
    "dead_tree":      (96, 132, 48, 131),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r37_d")

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r37_d{_n[0]:04d}"

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

def ellipse_pts(cx, cy, rx, ry, n=18):
    out = []
    for i in range(n + 1):
        a = i / n * 2 * math.pi
        out += [cx + rx * math.cos(a), cy + ry * math.sin(a)]
    return out

BOSS = (2680, 1000)

# ── torn void-walls along the corridor (rebuild the rock scatter) ────────────
sprites[:] = [s for s in sprites if not (
    s.get("type") == "sprite" and (
        (str(s.get("name", "")).startswith("Rock") and s.get("dir") == "assets_custom/rocks_sand")
        or s.get("name") == "void_shard"))]

tops, bots = {}, {}
for z in d["noWalkZones"]:
    if z["y"] < 0:
        tops[z["x"]] = z["y"] + z["h"]
    else:
        bots[z["x"]] = z["y"]

new = []
priority = []

for k in range(0, 3200, 200):
    yface_t, yface_b = tops.get(k), bots.get(k)
    near_fortress = k >= 2200
    if yface_t:
        for fx in range(k + 30, k + 200, 62):
            nm = "void_shard" if (near_fortress or random.random() < 0.4) else None
            x = fx + random.uniform(-14, 14)
            if nm:
                new.append(prop(nm, x, yface_t - random.uniform(0, 40), random.uniform(0.9, 1.3)))
            else:
                new.append(rock(x, yface_t - random.uniform(5, 50), random.uniform(1.9, 2.5)))
        for _ in range(3):
            new.append(rock(k + random.uniform(10, 190), yface_t - random.uniform(70, 360),
                            random.uniform(2.1, 2.9)))
    if yface_b:
        for fx in range(k + 30, k + 200, 62):
            nm = "void_shard" if (near_fortress or random.random() < 0.4) else None
            x = fx + random.uniform(-14, 14)
            if nm:
                new.append(prop(nm, x, yface_b + random.uniform(60, 105), random.uniform(0.9, 1.3)))
            else:
                new.append(rock(x, yface_b + random.uniform(125, 175), random.uniform(1.9, 2.5)))
        for _ in range(3):
            new.append(rock(k + random.uniform(10, 190), yface_b + random.uniform(180, 460),
                            random.uniform(2.1, 2.9)))

# ── the arena floor and fortress ring ────────────────────────────────────────
sprites[0:0] = [
    stroke("#1e0e2a", 240, ellipse_pts(*BOSS, 300, 215)),
    stroke("#170a20", 150, ellipse_pts(*BOSS, 180, 128)),
    stroke("#2a1638", 60,  ellipse_pts(*BOSS, 80, 54)),
]
for i in range(14):                                  # the fortress ring, gate at west
    a = i / 14 * 2 * math.pi
    if 0.82 * math.pi < a < 1.18 * math.pi:          # the causeway enters here
        continue
    new.append(prop("void_shard", BOSS[0] + math.cos(a) * 430, BOSS[1] + math.sin(a) * 300,
                    random.uniform(1.3, 1.8)))
for i in range(4):                                   # broken pillars inside
    a = i / 4 * 2 * math.pi + 0.42
    new.append(prop("pillar", BOSS[0] + math.cos(a) * 250, BOSS[1] + math.sin(a) * 175,
                    random.uniform(0.5, 0.7)))
for i in range(8):                                   # the watching dead
    a = i / 8 * 2 * math.pi + 0.2
    new.append(prop("skull", BOSS[0] + math.cos(a) * 340, BOSS[1] + math.sin(a) * 238,
                    random.uniform(1.3, 1.55)))

# twin shard-towers at the gate
priority.append(prop("void_shard", 2282, 900, 2.0))
priority.append(prop("void_shard", 2286, 1110, 1.95))
priority.append(prop("crystal_purple", 2226, 1006, 1.1))
new.append(prop("bone_pile", 2350, 1140, 1.3))

# ── the Thread's end: it runs to the gate, breaks, and dies ──────────────────
sprites.append(stroke("#7a5a16", 12, [1700, 1010, 1950, 990, 2120, 1000]))
sprites.append(stroke("#d8b24a", 6,  [1700, 1010, 1950, 990, 2120, 1000]))
sprites.append(stroke("#f4e08a", 2,  [1700, 1010, 1950, 990, 2120, 1000]))
for x0, x1 in ((2150, 2210), (2240, 2280), (2300, 2320)):   # dying fragments
    sprites.append(stroke("#d8b24a", 5, [x0, 1002, x1, 1000]))
    sprites.append(stroke("#f4e08a", 2, [x0, 1002, x1, 1000]))

# ── cold purple light along the causeway ─────────────────────────────────────
for cx in (560, 1000, 1440, 1880):
    priority.append(prop("crystal_purple", cx, 932, random.uniform(0.85, 1.0)))
    new.append(prop("crystal_purple", cx + 60, 1086, random.uniform(0.6, 0.8)))

# ── the Voice in the Void (NPC at 340,1051) ──────────────────────────────────
priority.append(prop("crystal_purple", 232, 1010, 1.0))
priority.append(prop("crystal_purple", 448, 1004, 0.95))
new.append(prop("skull", 340, 1130, 1.4))

# ── quiet exit threshold beyond the arena ────────────────────────────────────
new.append(prop("pillar", 3010, 880, 0.8))
new.append(prop("pillar", 3010, 1060, 0.8))
new.append(prop("dead_tree", 2950, 760, 1.4))

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
print(f"region 37 dressed: +{len(new) + len(priority)} sprites, total {len(sprites)}")
