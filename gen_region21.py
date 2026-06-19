#!/usr/bin/env python3
"""
Region 21 "Glass Desert (Marusthala)" — dressing pass.

Dead-end Act III spur. Fixes the data bugs and gives the walk a destination:
  • fixes: drops 30 exact-duplicate dune-patch strokes and 3 exact-duplicate
    enemy spawns (ranged/melee/rat each stacked twice on one tile)
  • mirage pools repainted as solid pale ponds (the stroke loops rendered
    as self-overlapping rings)
  • a sand-trodden trail from the portal to a new payoff the elite actually
    guards: the Glass Garden — a ring of great crystals (cyan + purple) with
    a bone-arch gate, skull ring and pillar stumps
  • a lost caravan vignette on the south route (torn tent, crates, bones)
  • the Parched Wanderer gets his meagre shade: dead tree, crate, remains
  • bounded edges: cactus + sand-rock clumps ring the margins; dune-crest
    lines and crystal groves texture the open sand
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_21.json"
random.seed(2121)

PROPS = "assets_custom/props"
GEN = "r21dress"

ANCHOR = {
    "cactus":         (48, 92, 24, 91),
    "dead_tree":      (96, 132, 48, 131),
    "skull":          (40, 38, 20, 37),
    "bone_pile":      (84, 60, 42, 59),
    "bone_arch":      (128, 156, 64, 155),
    "crystal_cyan":   (64, 116, 32, 115),
    "crystal_purple": (64, 116, 32, 115),
    "pillar":         (60, 196, 30, 195),
    "reed":           (34, 74, 17, 73),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r21_") and sid_[6:].isdigit() and int(sid_[6:]) >= 500

sprites[:] = [s for s in sprites if not _ours(s)]

# ── fix: exact-duplicate strokes and enemy spawns (no-op once removed) ───────
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

_n = [500]
def sid():
    _n[0] += 1
    return f"s_r21_{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def sandrock(x, y, sc=None):
    return {
        "type": "sprite", "spriteId": sid(), "dir": "assets_custom/rocks_sand",
        "frames": [f"Rock{random.randint(1,4)}.png"], "name": "Rock", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(sc or random.uniform(0.9, 1.6), 3),
        "scaleY": round(sc or random.uniform(0.9, 1.6), 3),
        "offsetX": 32.0, "offsetY": 63,
    }

def crate(x, y):
    return {
        "type": "sprite", "spriteId": sid(), "dir": "assest4/next2/2 Objects/4 Box",
        "frames": ["3.png"], "name": "crate", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 2.1, "scaleY": 2.1, "offsetX": 10.0, "offsetY": 21,
    }

def tent(x, y):
    return {
        "type": "sprite", "spriteId": sid(), "dir": "assest4/next2/2 Objects/6 Tent",
        "frames": ["4.png"], "name": "tent", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 1.685, "scaleY": 1.685, "offsetX": 32.0, "offsetY": 69,
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

# ── mirage pools: repaint the stroke-loop rings as solid pale ponds ──────────
POOLS = [(900, 760), (1700, 1200), (2300, 760)]
pool_fill = []
for px, py in POOLS:
    pool_fill.append(stroke("#6f968f", 140, ellipse_pts(px, py, 66, 36)))
    pool_fill.append(stroke("#7fa6a0", 100, ellipse_pts(px, py, 38, 20)))
    pool_fill.append(stroke("#a9c8c2", 42, ellipse_pts(px - 8, py - 8, 22, 11)))
sprites.extend(pool_fill)

# ── sand-trodden trail: portal → between the pools → the Glass Garden ────────
TRAIL = [120, 1000, 500, 988, 900, 1022, 1300, 1000, 1700, 1042,
         2100, 1012, 2480, 1000, 2820, 1000]
sprites.extend([stroke("#8a7244", 56, TRAIL), stroke("#97804c", 30, TRAIL)])

# ── dune-crest lines texturing the open sand ─────────────────────────────────
for crest in [
    [300, 360, 620, 320, 940, 360], [1500, 480, 1830, 440, 2120, 490],
    [400, 1400, 700, 1360, 1000, 1410], [1200, 1700, 1560, 1660, 1900, 1710],
    [2600, 1450, 2900, 1410, 3120, 1460], [2700, 250, 2980, 220, 3140, 260],
]:
    sprites.append(stroke("#b89a63", 22, crest))

new = []

# ── the Glass Garden: the payoff the elite guards (centre ≈ 2860,1000) ───────
new.append(prop("bone_arch", 2652, 1014, 1.25))            # gate over the trail
GG = (2880, 1000)
for i in range(9):                                          # great crystal ring
    a = i / 9 * 2 * math.pi
    r_x, r_y = 150, 96
    kind = "crystal_purple" if i % 3 == 2 else "crystal_cyan"
    new.append(prop(kind, GG[0] + math.cos(a) * r_x, GG[1] + math.sin(a) * r_y,
                    random.uniform(1.15, 1.6)))
new.append(prop("crystal_purple", GG[0], GG[1] - 30, 1.9))  # the heart shard
for i in range(6):                                          # pilgrim skulls before it
    a = (i / 6 + 0.08) * 2 * math.pi
    new.append(prop("skull", GG[0] + math.cos(a) * 220, GG[1] + math.sin(a) * 150,
                    random.uniform(1.3, 1.6)))
new.append(prop("pillar", 2700, 880, 0.5))
new.append(prop("pillar", 2716, 1130, 0.45))
new.append(prop("bone_pile", 2756, 1066, 1.3))

# ── lost caravan on the south sand (near the rat spawn at 1500,1560) ─────────
new.append(tent(1392, 1530))
new.append(crate(1462, 1576))
new.append(crate(1340, 1582))
new.append(prop("bone_pile", 1540, 1610, 1.3))
new.append(prop("skull", 1428, 1640, 1.5))
new.append(prop("dead_tree", 1300, 1480, 1.5))
new.append(sandrock(1580, 1530, 0.8))

# ── the Parched Wanderer's meagre shade (NPC at 320,980) ─────────────────────
new.append(prop("dead_tree", 252, 886, 1.7))
new.append(crate(396, 920))
new.append(prop("skull", 226, 1042, 1.4))
new.append(prop("cactus", 432, 1064, 1.3))

# ── mirage-pool brush: a few reeds — dried, sparse — at each pool ────────────
for px, py in POOLS:
    for _ in range(3):
        a = random.uniform(0, 2 * math.pi)
        new.append(prop("reed", px + math.cos(a) * 96, py + math.sin(a) * 58,
                        random.uniform(1.3, 1.8)))

# ── crystal groves: gather the glass into readable stands ────────────────────
for gx, gy in [(640, 1660), (1150, 320), (2880, 1680), (2040, 1660)]:
    for _ in range(random.randint(4, 5)):
        new.append(prop("crystal_cyan", gx + random.uniform(-100, 100),
                        gy + random.uniform(-55, 55), random.uniform(0.8, 1.3)))

# ── bounded edges: cactus + sand-rock clumps in the margins ──────────────────
def edge_clump(x, y):
    if random.random() < 0.5:
        for _ in range(random.randint(2, 3)):
            new.append(prop("cactus", x + random.uniform(-46, 46),
                            y + random.uniform(-22, 22), random.uniform(1.2, 1.7)))
    else:
        for _ in range(random.randint(2, 3)):
            new.append(sandrock(x + random.uniform(-50, 50), y + random.uniform(-20, 20)))

x = 30.0
while x < 3200:
    edge_clump(x, 60 + random.uniform(-14, 14))
    x += 170
x = 30.0
while x < 3200:
    edge_clump(x, 1948 + random.uniform(-14, 14))
    x += 170
for sx in (44, 3168):
    y = 200.0
    while y < 1860:
        if not (sx == 44 and 840 < y < 1170):     # west portal gap
            edge_clump(sx, y)
        y += 200

# ── trail-stones edging the route ────────────────────────────────────────────
TRAIL_PTS = list(zip(TRAIL[0::2], TRAIL[1::2]))
def trail_at(t):
    i = min(int(t * (len(TRAIL_PTS) - 1)), len(TRAIL_PTS) - 2)
    f = t * (len(TRAIL_PTS) - 1) - i
    (x0, y0), (x1, y1) = TRAIL_PTS[i], TRAIL_PTS[i + 1]
    return x0 + (x1 - x0) * f, y0 + (y1 - y0) * f

for k in range(14):
    t = (k + 0.5) / 14
    x, y = trail_at(t)
    side = -1 if k % 2 else 1
    new.append(sandrock(x + random.uniform(-12, 12), y + side * random.uniform(60, 78),
                        random.uniform(0.38, 0.5)))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
strokes = sum(1 for s in sprites if s.get("type") == "stroke")
print(f"region 21 dressed: +{len(new)} sprites, strokes {strokes} (dupes dropped), "
      f"enemies {len(d['enemies'])} (dupes dropped), total {len(sprites)}, anim {anim}")
