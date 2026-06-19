#!/usr/bin/env python3
"""
Region 24 "Demon Forge (Pāṣāṇa Daitya)" — fix broken walkability + dressing.

Act III boss region. The lava river's colliders had no gaps at either stone
bridge, and the player SPAWN (380,1000), the west portal and the NPC all sat
inside lava no-walk zones, on the river. Fixes:
  • a cooled-slag forge apron is painted over the river west of x≈520 (it
    now emerges from beneath bridge 1) and the three west lava zones are
    removed — spawn, portal and the Forge-Bound Shade stand on solid floor
  • zone gaps carved at both bridge decks (520–740 and 1680–1880); the
    elite at (1700,1000) lands inside the second gap — the bridge guardian
Dressing (keeps everything else):
  • cinder trails along both banks converging on the boss caldera
  • a fire gauntlet — paired braziers flanking the final approach
  • braziers at the forge mural; apron braziers at the spawn platform
  • fumaroles in the cold corners, basalt ridge framing in the margins
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_24.json"
random.seed(2424)

PROPS = "assets_custom/props"
GEN = "r24dress"

ANCHOR = {
    "brazier":      (44, 78, 22, 77),
    "lava_rock":    (72, 56, 36, 55),
    "fumarole":     (60, 72, 30, 70),
    "basalt_rock":  (110, 84, 55, 82),
    "basalt_small": (64, 48, 32, 46),
    "pillar":       (60, 196, 30, 195),
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
    return sid_.startswith("s_r24_") and sid_[6:].isdigit() and int(sid_[6:]) >= 500

sprites[:] = [s for s in sprites if not _ours(s)]

# ── walkability surgery ──────────────────────────────────────────────────────
d["noWalkZones"] = [z for z in d["noWalkZones"] if not str(z["id"]).startswith("z24_dress")]
zones = {z["id"]: z for z in d["noWalkZones"]}

# west apron: spawn/portal/NPC area becomes solid forge floor
for zid in ("z24_lava0", "z24_lava200", "z24_lava400"):
    if zid in zones:
        d["noWalkZones"].remove(zones[zid])

# bridges: replace the full columns with stubs leaving real deck gaps.
# Stubs are re-created unconditionally (geometry from the original zones),
# so re-running after the originals are gone stays correct.
for zid in ("z24_lava600", "z24_lava1600", "z24_lava1800"):
    if zid in zones:
        d["noWalkZones"].remove(zones[zid])
d["noWalkZones"] += [
    {"id": "z24_dress_b1",  "x": 740,  "y": 967, "w": 62,  "h": 240},  # east of deck 1
    {"id": "z24_dress_b2L", "x": 1600, "y": 793, "w": 80,  "h": 240},  # west of deck 2
    {"id": "z24_dress_b2R", "x": 1880, "y": 794, "w": 122, "h": 240},  # east of deck 2
]

_n = [500]
def sid():
    _n[0] += 1
    return f"s_r24_{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

# ── the forge apron: cooled slag floor over the river's west end ─────────────
sprites.extend([
    stroke("#4a423c", 270, [-40, 1000, 505, 1000]),
    stroke("#564c44", 210, [-40, 1000, 500, 1000]),
    stroke("#665a50", 110, [-40, 1000, 490, 1000]),
])

# ── cinder trails along both banks, converging on the caldera ────────────────
N_TRAIL = [520, 880, 800, 800, 1200, 760, 1600, 724, 2000, 744, 2300, 824, 2520, 940]
S_TRAIL = [520, 1120, 900, 1224, 1400, 1180, 1780, 1130, 2100, 1144, 2460, 1090]
for t in (N_TRAIL, S_TRAIL):
    sprites.append(stroke("#2e231d", 50, t))
    sprites.append(stroke("#3a2c24", 26, t))

new = []
priority = []   # front of the sprite list → wins the glow budget

# ── spawn platform dressing (NPC Forge-Bound Shade at 320,1000) ──────────────
priority.append(prop("brazier", 226, 906, 1.8))
priority.append(prop("brazier", 226, 1118, 1.8))
new.append(prop("skull", 420, 1086, 1.4))
new.append(prop("bone_pile", 168, 1018, 1.2))
new.append(prop("basalt_small", 470, 902, 0.9))
new.append(prop("basalt_small", 462, 1112, 0.85))

# ── the fire gauntlet before the caldera (boss at 2680,1000) ─────────────────
for gx in (2380, 2500):
    priority.append(prop("brazier", gx, 920, 2.0))
    priority.append(prop("brazier", gx + 50, 1090, 2.0))
for i in range(5):
    new.append(prop("skull", 2330 + i * 64, 1146 + (i % 2) * 18, random.uniform(1.3, 1.6)))
for i in range(4):
    new.append(prop("skull", 2360 + i * 70, 872 - (i % 2) * 16, random.uniform(1.3, 1.5)))
new.append(prop("bone_pile", 2296, 980, 1.35))

# ── braziers at the forge mural (960,840) ────────────────────────────────────
new.append(prop("brazier", 868, 856, 1.6))
new.append(prop("brazier", 1052, 856, 1.6))

# ── bridge gates: pillar pairs at both ends of each deck ─────────────────────
for bx in (640, 1780):
    for px, py in [(bx - 104, 912), (bx + 104, 912), (bx - 104, 1124), (bx + 104, 1124)]:
        new.append(prop("pillar", px, py, 0.72))

# ── fumaroles in the cold corners ────────────────────────────────────────────
for cx, cy in [(420, 360), (2840, 1660), (1500, 1760), (2960, 320)]:
    priority.append(prop("fumarole", cx, cy, 1.1))
    new.append(prop("fumarole", cx + random.uniform(80, 120), cy + random.uniform(30, 60), 0.85))
    new.append(prop("lava_rock", cx - random.uniform(60, 100), cy + random.uniform(40, 70),
                    random.uniform(0.85, 1.1)))

# ── basalt ridge framing in the margins ──────────────────────────────────────
def edge(x, y):
    nm = "basalt_rock" if random.random() < 0.6 else "basalt_small"
    new.append(prop(nm, x + random.uniform(-14, 14), y + random.uniform(-10, 10),
                    random.uniform(0.85, 1.25)))

x = -20.0
while x < 3240:
    edge(x, 50); edge(x + 54, 94)
    x += 110
x = -20.0
while x < 3240:
    edge(x, 1932); edge(x + 54, 1978)
    x += 110
for sx in (40, 3172):
    y = 160.0
    while y < 1880:
        if not 840 < y < 1170:           # portal gaps
            edge(sx, y)
        y += 116

# ── charred snags + trail-stones ─────────────────────────────────────────────
for x, y, sc in [(700, 320, 1.6), (1750, 1620, 1.7), (2550, 360, 1.6), (1150, 1700, 1.6)]:
    new.append(prop("dead_tree", x, y, sc))

def stones_along(trail, n):
    pts = list(zip(trail[0::2], trail[1::2]))
    for k in range(n):
        t = (k + 0.5) / n
        i = min(int(t * (len(pts) - 1)), len(pts) - 2)
        f = t * (len(pts) - 1) - i
        x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f
        y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f
        side = -1 if k % 2 else 1
        new.append(prop("basalt_small", x + random.uniform(-12, 12),
                        y + side * random.uniform(48, 64), random.uniform(0.5, 0.7)))

stones_along(N_TRAIL, 7)
stones_along(S_TRAIL, 6)

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
print(f"region 24 dressed: +{len(new) + len(priority)} sprites, apron + bridge gaps carved, "
      f"zones {len(d['noWalkZones'])}, total {len(sprites)}")
