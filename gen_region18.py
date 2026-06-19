#!/usr/bin/env python3
"""
Region 18 "Serpent Marsh (Nāgakṣetra)" — dressing pass.

The last corridor before the Serpent Court (region 8). Keeps every gameplay
element (portals, NPC, enemies, pool zones, the two serpentine streams) and
composes the space around them:
  • a mud trail from portal to portal along the enemy gauntlet, with plank
    crossings where it fords the two streams
  • stream banks: reed clumps and lily pads read off the actual stroke
    centrelines, so they follow every meander
  • bog-pool dressing: reed fringe, pads, half-sunk bones, two splashes
  • a small Naga shrine behind the Acolyte (obelisks, crystal, skull ring)
  • the east exit becomes a threshold: bone arch over the trail, pillar
    stumps and more cyan crystals joining the existing cluster by the elite
  • looming dead trees at trailside and pool edges for menace
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_18.json"
random.seed(1818)

PROPS = "assets_custom/props"
GEN = "r18dress"

ANCHOR = {
    "reed":         (34, 74, 17, 73),
    "lily_pad":     (44, 28, 22, 14),
    "skull":        (40, 38, 20, 37),
    "bone_pile":    (84, 60, 42, 59),
    "bone_arch":    (128, 156, 64, 155),
    "crystal_cyan": (64, 116, 32, 115),
    "pillar":       (60, 196, 30, 195),
    "dead_tree":    (96, 132, 48, 131),
    "obelisk":      (52, 148, 26, 146),
    "dock":         (124, 70, 62, 35),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r18_") and sid_[6:].isdigit() and int(sid_[6:]) >= 500

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [500]
def sid():
    _n[0] += 1
    return f"s_r18_{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def splash(x, y):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Particle FX",
        "frames": ["Water Splash.png"], "name": "Water Splash", "animated": True,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 1, "scaleY": 1, "offsetX": 96, "offsetY": 96,
        "frameW": 192, "frameH": 192, "frameCount": 9, "frameRow": 0,
    }

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

new = []

# ── mud trail portal → portal, fording both streams ──────────────────────────
TRAIL = [120, 1000, 400, 960, 700, 1000, 1000, 1010, 1250, 980, 1560, 1000,
         1850, 1035, 2150, 980, 2450, 1000, 2780, 1000, 3090, 1000]
# under the streams/pools: trail strokes go first so water paints over fords
sprites[0:0] = [stroke("#2b3322", 56, TRAIL), stroke("#3a4430", 30, TRAIL)]

# ── stream banks: reeds + pads following the actual stroke meanders ──────────
streams = [s for s in sprites
           if s.get("type") == "stroke" and s.get("gen") != GEN
           and s["strokeWidth"] in (150, 110) and len(s["points"]) > 100]

# plank crossings exactly where each stream's centreline crosses the trail
for st in streams:
    pts = st["points"]
    fx, _ = min(zip(pts[0::2], pts[1::2]), key=lambda p: abs(p[1] - 1008))
    new.append(prop("dock", fx, 1008, 1.4))
for st in streams:
    pts = st["points"]
    half = st["strokeWidth"] / 2
    for i in range(4, len(pts) // 2 - 4, 7):              # every 7th centreline point
        px, py = pts[2 * i], pts[2 * i + 1]
        if not 60 < py < 1940 or abs(py - 1000) < 130:    # stay in-world, clear the ford
            continue
        side = random.choice([-1, 1])
        if random.random() < 0.65:
            for _ in range(random.randint(1, 2)):
                new.append(prop("reed", px + side * (half + random.uniform(14, 44)),
                                py + random.uniform(-22, 22), random.uniform(1.5, 2.2)))
        if random.random() < 0.35:                        # pads drifting on the water
            new.append(prop("lily_pad", px + random.uniform(-half * 0.5, half * 0.5),
                            py + random.uniform(-14, 14), random.uniform(0.9, 1.3)))

# ── bog pools: fringe, pads, remains, splashes ───────────────────────────────
POOLS = [(1500, 700, 168, 105), (2000, 1300, 175, 112), (2500, 800, 154, 98)]
for cx, cy, rx, ry in POOLS:
    for _ in range(random.randint(6, 8)):
        a = random.uniform(0, 2 * math.pi)
        new.append(prop("reed", cx + math.cos(a) * (rx + 26), cy + math.sin(a) * (ry + 20),
                        random.uniform(1.5, 2.2)))
    for _ in range(random.randint(2, 3)):
        new.append(prop("lily_pad", cx + random.uniform(-rx * 0.5, rx * 0.5),
                        cy + random.uniform(-ry * 0.5, ry * 0.5), random.uniform(1.0, 1.4)))
    a = random.uniform(0, 2 * math.pi)
    new.append(prop(random.choice(["bone_pile", "skull"]),
                    cx + math.cos(a) * rx * 0.75, cy + math.sin(a) * ry * 0.75,
                    random.uniform(1.2, 1.5)))
new.append(splash(1460, 690))
new.append(splash(2040, 1320))

# ── Naga shrine behind the Acolyte (NPC at 300,920; portal at 120,1000) ──────
new.append(prop("obelisk", 238, 832, 1.7))
new.append(prop("obelisk", 392, 822, 1.5))
new.append(prop("crystal_cyan", 318, 794, 0.95))
for i in range(3):
    new.append(prop("skull", 262 + i * 52, 868 + (i % 2) * 14, random.uniform(1.3, 1.5)))
new.append(prop("bone_pile", 430, 880, 1.2))
for _ in range(4):
    new.append(prop("reed", 310 + random.uniform(-110, 110), 760 + random.uniform(-16, 16),
                    random.uniform(1.5, 2.0)))

# ── east threshold: the gate to the Serpent Court ────────────────────────────
new.append(prop("bone_arch", 2902, 1012, 1.25))           # the trail passes beneath it
new.append(prop("pillar", 2856, 894, 0.6))
new.append(prop("pillar", 2962, 1118, 0.55))
new.append(prop("crystal_cyan", 2840, 1064, 0.9))
new.append(prop("crystal_cyan", 2926, 884, 0.8))
for i in range(5):
    new.append(prop("skull", 2800 + i * 38, 1130 + (i % 2) * 16, random.uniform(1.3, 1.6)))
new.append(prop("bone_pile", 2760, 940, 1.3))

# ── remains along the gauntlet trail ─────────────────────────────────────────
TRAIL_PTS = list(zip(TRAIL[0::2], TRAIL[1::2]))
def trail_at(t):
    i = min(int(t * (len(TRAIL_PTS) - 1)), len(TRAIL_PTS) - 2)
    f = t * (len(TRAIL_PTS) - 1) - i
    (x0, y0), (x1, y1) = TRAIL_PTS[i], TRAIL_PTS[i + 1]
    return x0 + (x1 - x0) * f, y0 + (y1 - y0) * f

for t in (0.22, 0.4, 0.58, 0.74, 0.88):
    x, y = trail_at(t)
    new.append(prop(random.choice(["skull", "bone_pile"]),
                    x + random.uniform(-20, 20),
                    y + random.choice([-1, 1]) * random.uniform(60, 100),
                    random.uniform(1.2, 1.6)))

# ── looming dead trees for menace ────────────────────────────────────────────
for x, y, sc in [(600, 700, 1.7), (650, 1350, 1.6), (1500, 850, 1.8), (1750, 500, 1.6),
                 (2050, 1170, 1.7), (2480, 630, 1.7), (2200, 1620, 1.6), (2950, 1430, 1.8)]:
    new.append(prop("dead_tree", x + random.uniform(-10, 10), y, sc))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 18 dressed: +{len(new)} sprites, total {len(sprites)}, anim {anim}")
