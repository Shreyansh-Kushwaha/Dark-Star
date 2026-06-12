#!/usr/bin/env python3
"""
Region 17 "Whisper Mire (Kardama)" — fix irregularities + dressing pass.

Fixes: removes the three white sky-clouds that were pasted on the swamp
floor in the middle of the walkable lane (Clouds_01 at 800/1600/2300).

Adds, keeping every gameplay element (portal, NPC, enemies, pool zones):
  • a faint trodden mud trail winding from the portal between the bog pools
    to the drowned shrine — the mimics already sit right on it
  • Bog Hermit camp: worn tent, campfire (the region's first animated prop
    and only warm light), seat log, crate, bones
  • bog-pool dressing: reed fringes, algae lily pads, half-sunk bones
  • the drowned shrine becomes a real destination: bone arch gateway, extra
    pillar stumps, more glowing cyan crystals, skull ring
  • whispering dead scattered along the trail: skulls and bone piles
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_17.json"
random.seed(1717)

PROPS = "assets_custom/props"
GEN = "r17dress"

ANCHOR = {
    "reed":         (34, 74, 17, 73),
    "lily_pad":     (44, 28, 22, 14),
    "skull":        (40, 38, 20, 37),
    "bone_pile":    (84, 60, 42, 59),
    "bone_arch":    (128, 156, 64, 155),
    "crystal_cyan": (64, 116, 32, 115),
    "pillar":       (60, 196, 30, 195),
    "dead_tree":    (96, 132, 48, 131),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r17_") and sid_[6:].isdigit() and int(sid_[6:]) >= 500

sprites[:] = [s for s in sprites if not _ours(s)]

# ── fix: sky clouds lying on the swamp floor (no-op once removed) ────────────
sprites[:] = [s for s in sprites if not (
    s.get("name") == "Clouds_01" and s.get("spriteLayer") == "below")]

_n = [500]
def sid():
    _n[0] += 1
    return f"s_r17_{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def a4(dir_, frame, name, x, y, scale, ox, oy):
    return {
        "type": "sprite", "spriteId": sid(), "dir": dir_,
        "frames": [frame], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def tent(x, y, v=2):  return a4("assest4/next2/2 Objects/6 Tent", f"{v}.png", str(v), x, y, 1.7, 32.5, 61)
def box(x, y, v=1):   return a4("assest4/next2/2 Objects/4 Box", f"{v}.png", str(v), x, y, 2.1, 10, 21)
def log_(n, x, y):    return a4("assest4/map_objects/2 Objects/7 Decor", f"Log{n}.png", f"Log{n}", x, y, 1.7, 16.5, 31)

def campfire(x, y):
    # 1.png is a 6-frame 32x64 strip — place as a spritesheet, not whole-image
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "assest4/map_objects/3 Animated Objects/2 Campfire",
        "frames": ["1.png"], "name": "1", "animated": True,
        "spriteLayer": "below", "x": x, "y": y, "scaleX": 1.6, "scaleY": 1.6,
        "offsetX": 16.0, "offsetY": 60,
        "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0,
    }

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

new = []

# ── faint trodden trail: portal → between the pools → drowned shrine ─────────
TRAIL = [120, 1000, 420, 1015, 760, 1090, 1000, 1060, 1300, 1130,
         1640, 1110, 1950, 1000, 2280, 990, 2560, 1010]
# under the pool rings: insert before the existing pool strokes at index 0
sprites[0:0] = [stroke("#26301f", 56, TRAIL), stroke("#333f28", 30, TRAIL)]

# ── Bog Hermit camp (NPC at 300,980; portal at 120,1000 stays clear) ─────────
new.append(tent(232, 888, 2))
new.append(campfire(372, 922))
new.append(log_(2, 318, 1062))
new.append(box(434, 884, 1))
new.append(prop("bone_pile", 204, 1064, 1.1))
new.append(prop("skull", 442, 1052, 1.5))

# ── bog pools: reed fringes, algae pads, half-sunk bones ─────────────────────
POOLS = [  # (cx, cy, rx, ry) from the no-walk pool zones
    (700, 700, 154, 105), (1300, 1300, 182, 119), (1900, 760, 161, 105),
    (2450, 1250, 196, 126), (1650, 980, 140, 91),
]
import math
for cx, cy, rx, ry in POOLS:
    for i in range(random.randint(6, 8)):                  # reed fringe on the rim
        a = random.uniform(0, 2 * math.pi)
        new.append(prop("reed", cx + math.cos(a) * (rx + 28), cy + math.sin(a) * (ry + 22),
                        random.uniform(1.5, 2.2)))
    for _ in range(random.randint(2, 3)):                  # algae pads on the mat
        new.append(prop("lily_pad", cx + random.uniform(-rx * 0.5, rx * 0.5),
                        cy + random.uniform(-ry * 0.5, ry * 0.5), random.uniform(1.0, 1.4)))
    if random.random() < 0.8:                              # something died here
        a = random.uniform(0, 2 * math.pi)
        new.append(prop(random.choice(["bone_pile", "skull"]),
                        cx + math.cos(a) * rx * 0.7, cy + math.sin(a) * ry * 0.7,
                        random.uniform(1.1, 1.5)))

# ── the drowned shrine: make the dead-end's payoff read like one ─────────────
new.append(prop("bone_arch", 2492, 1066, 1.2))             # gateway over the trail's end
new.append(prop("pillar", 2566, 906, 0.55))                # broken stumps round the pair
new.append(prop("pillar", 2790, 1112, 0.6))
new.append(prop("pillar", 2848, 968, 0.5))
new.append(prop("crystal_cyan", 2618, 1186, 1.1))          # more eerie shrine-light
new.append(prop("crystal_cyan", 2742, 952, 0.9))
for a in range(5):                                          # skull ring before the mural
    new.append(prop("skull", 2600 + a * 32, 1196 + (a % 2) * 18, random.uniform(1.3, 1.6)))
new.append(prop("bone_pile", 2536, 1180, 1.3))
for _ in range(4):
    new.append(prop("reed", 2660 + random.uniform(-130, 130), 1240 + random.uniform(-12, 12),
                    random.uniform(1.5, 2.1)))

# ── the whispering dead: remains scattered along the trail ───────────────────
TRAIL_PTS = list(zip(TRAIL[0::2], TRAIL[1::2]))
def trail_at(t):
    i = min(int(t * (len(TRAIL_PTS) - 1)), len(TRAIL_PTS) - 2)
    f = t * (len(TRAIL_PTS) - 1) - i
    (x0, y0), (x1, y1) = TRAIL_PTS[i], TRAIL_PTS[i + 1]
    return x0 + (x1 - x0) * f, y0 + (y1 - y0) * f

for t in (0.18, 0.34, 0.52, 0.68, 0.85):
    x, y = trail_at(t)
    side = random.choice([-1, 1])
    new.append(prop(random.choice(["skull", "bone_pile"]),
                    x + random.uniform(-20, 20), y + side * random.uniform(55, 95),
                    random.uniform(1.2, 1.6)))

# a couple of leaning dead trees right at the trailside for menace
new.append(prop("dead_tree", 980, 1140, 1.6))
new.append(prop("dead_tree", 2120, 920, 1.5))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 17 dressed: +{len(new)} sprites, clouds removed, "
      f"total {len(sprites)}, anim {anim}")
