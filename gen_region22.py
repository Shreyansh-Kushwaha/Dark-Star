#!/usr/bin/env python3
"""
Region 22 "Fire Caldera (Agnikuṇḍa)" — fix the broken crossing + dressing.

The lava river's no-walk zones spanned the full map with no crossing: the
north bank (player spawn) and south bank (two enemies) were disconnected,
and both portals — and the second elite — sat INSIDE lava zones, on the
river itself. Fixes:
  • a basalt causeway bridges the river at x≈1500: zone z22_lava1400 is
    replaced by two stubs leaving a real walkable gap, with a stone-slab
    bridge painted over the lava and pillar gates at both ends
  • portal22_back moves onto the north bank (120,760), portal22_next onto
    the south bank (3090,1240) — route: north bank → bridge → south bank
  • the elite at (2400,1000) moves to the south shore (2450,1180), now
    guarding the approach to the exit
Dressing (keeps everything else):
  • cinder trails along both banks linking portals to the bridge
  • Cinder Smith's forge: braziers, ore crates, slag (glow-priority)
  • fumarole pairs venting at each caldera pool
  • basalt ridge framing in the no-walk margins, trail-stones on the paths
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_22.json"
random.seed(2222)

PROPS = "assets_custom/props"
GEN = "r22dress"

ANCHOR = {
    "brazier":      (44, 78, 22, 77),
    "lava_rock":    (72, 56, 36, 55),
    "fumarole":     (60, 72, 30, 70),
    "basalt_rock":  (110, 84, 55, 82),
    "basalt_small": (64, 48, 32, 46),
    "pillar":       (60, 196, 30, 195),
    "skull":        (40, 38, 20, 37),
    "dead_tree":    (96, 132, 48, 131),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r22_") and sid_[6:].isdigit() and int(sid_[6:]) >= 500

sprites[:] = [s for s in sprites if not _ours(s)]

# ── gameplay surgery ─────────────────────────────────────────────────────────
for p in d["portals"]:
    if p["id"] == "portal22_back":
        p["x"], p["y"] = 120, 760          # north bank (player spawns at 380,1000)
    if p["id"] == "portal22_next":
        p["x"], p["y"] = 3090, 1240        # south bank, past the gauntlet

for e in d["enemies"]:
    if e.get("type") == "elite" and round(e["x"]) == 2400 and round(e["y"]) == 1000:
        e["x"], e["y"] = 2450, 1180        # off the lava, guarding the exit road

# bridge gap: swap the full-width lava zone at x1400 for two stubs
d["noWalkZones"] = [z for z in d["noWalkZones"] if not str(z["id"]).startswith("z22_dress")]
gap = next((z for z in d["noWalkZones"] if z["id"] == "z22_lava1400"), None)
if gap:
    d["noWalkZones"].remove(gap)
    d["noWalkZones"].append({"id": "z22_dress_bL", "x": gap["x"], "y": gap["y"], "w": 52, "h": gap["h"]})
    d["noWalkZones"].append({"id": "z22_dress_bR", "x": gap["x"] + 148, "y": gap["y"], "w": 54, "h": gap["h"]})

_n = [500]
def sid():
    _n[0] += 1
    return f"s_r22_{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def crate(x, y):
    return {
        "type": "sprite", "spriteId": sid(), "dir": "assest4/next2/2 Objects/4 Box",
        "frames": ["3.png"], "name": "crate", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 2.1, "scaleY": 2.1, "offsetX": 10.0, "offsetY": 21,
    }

def ore(x, y):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones",
        "frames": [f"Gold Stone {random.randint(1,6)}.png"], "name": "ware", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 0.62, "scaleY": 0.62, "offsetX": 64.0, "offsetY": 127,
    }

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

# ── the basalt causeway (painted over the lava strokes) ──────────────────────
sprites.extend([
    stroke("#4a423c", 124, [1500, 790, 1500, 1190]),
    stroke("#5e544c", 76,  [1500, 790, 1500, 1190]),
])

# ── cinder trails along both banks ───────────────────────────────────────────
N_TRAIL = [120, 760, 450, 738, 800, 772, 1150, 748, 1500, 790]
S_TRAIL = [1500, 1190, 1900, 1224, 2300, 1184, 2700, 1232, 3090, 1240]
for t in (N_TRAIL, S_TRAIL):
    sprites.append(stroke("#3a2c24", 56, t))
    sprites.append(stroke("#46362c", 30, t))

new = []
priority = []   # inserted at the front of the sprite list → wins the glow budget

# ── Cinder Smith's forge (NPC at 320,760; portal now at 120,760) ─────────────
priority.append(prop("brazier", 354, 668, 2.0))
priority.append(prop("brazier", 548, 762, 1.6))   # clear of the big rock pile
new.append(prop("lava_rock", 416, 712, 1.1))    # slag pit
new.append(crate(296, 652))
new.append(ore(522, 668))
new.append(ore(258, 700))
new.append(prop("skull", 432, 806, 1.3))

# ── fumaroles venting at the three caldera pools ─────────────────────────────
for cx, cy in [(900, 560), (1700, 640), (2200, 1420)]:
    priority.append(prop("fumarole", cx - 120, cy - 30, 1.15))
    priority.append(prop("fumarole", cx + 130, cy + 20, 0.9))
    new.append(prop("lava_rock", cx + random.uniform(-60, 60),
                    cy + 90 + random.uniform(-10, 10), random.uniform(0.85, 1.15)))

# ── bridge gates + edging ────────────────────────────────────────────────────
for px, py in [(1448, 786), (1552, 786), (1448, 1228), (1552, 1228)]:
    new.append(prop("pillar", px, py, 0.78))
y = 850.0
while y < 1180:
    new.append(prop("basalt_small", 1446, y, random.uniform(0.85, 1.05)))
    new.append(prop("basalt_small", 1554, y + 42, random.uniform(0.85, 1.05)))
    y += 86

# ── basalt ridge framing in the margins ──────────────────────────────────────
def edge(x, y):
    nm = "basalt_rock" if random.random() < 0.6 else "basalt_small"
    new.append(prop(nm, x + random.uniform(-14, 14), y + random.uniform(-10, 10),
                    random.uniform(0.85, 1.25)))

x = -20.0
while x < 3240:
    edge(x, 44); edge(x + 54, 86)
    x += 110
x = -20.0
while x < 3240:
    edge(x, 1936); edge(x + 54, 1982)
    x += 110
for sx in (40, 3164):
    y = 160.0
    while y < 1880:
        on_portal = (sx == 40 and 600 < y < 920) or (sx == 3164 and 1080 < y < 1400)
        if not on_portal:
            edge(sx, y)
        y += 116

# ── charred snags + trail-stones ─────────────────────────────────────────────
for x, y, sc in [(640, 360, 1.6), (1240, 1560, 1.7), (1960, 320, 1.6),
                 (2620, 1660, 1.7), (2900, 420, 1.6)]:
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
                        y + side * random.uniform(52, 68), random.uniform(0.5, 0.7)))

stones_along(N_TRAIL, 7)
stones_along(S_TRAIL, 7)

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
print(f"region 22 dressed: +{len(new) + len(priority)} sprites, bridge gap carved, "
      f"portals/elite moved to banks, total {len(sprites)}")
