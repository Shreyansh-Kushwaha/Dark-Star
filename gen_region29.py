#!/usr/bin/env python3
"""
Region 29 "Heaven's Edge (Swarga Seema)" — dressing pass.

Act IV colonnade avenue before the Vayu boss. No data bugs here — the pass
is rhythm and depth. Keeps every gameplay element and adds:
  • a soft cloud-road under the avenue, tying the colonnade together
  • temple pennants on alternating pillars; offerings at their bases
  • a forecourt at the great gate: platform, crystals, offerings, sign
  • the Apsara Guide's alcove at the entrance (platform, flag, crystal)
  • an east threshold before the exit: pillar pair, pennants, offerings
  • the top and bottom cloud bands become distant galleries: smaller
    pillar rows with clouds drifting through them
  • crystal islets floating in the bare blue between the bands
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_29.json"
random.seed(2929)

PROPS = "assets_custom/props"
GEN = "r29dress"

ANCHOR = {
    "cloud_platform": (220, 104, 110, 52),
    "pillar":         (60, 196, 30, 195),
    "brazier":        (44, 78, 22, 77),
    "crystal_cyan":   (64, 116, 32, 115),
    "crystal_amber":  (64, 116, 32, 115),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r29_d")

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r29_d{_n[0]:04d}"

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

def gold(x, y):  return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones", f"Gold Stone {random.randint(1,6)}.png", "ware", x, y, 0.55, 64, 127)
def sign(x, y):  return base("assest4/map_objects/2 Objects/3 Pointer", "1.png", "sign", x, y, 2.4, 10, 35)

def flag(x, y):
    return base("assest4/map_objects/3 Animated Objects/1 Flag", "1.png", "flag",
                x, y, 1.5, 16, 60,
                {"animated": True, "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0})

def cloud(x, y, sc, alpha):
    return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Clouds",
                "Clouds_01.png", "Clouds_01", x, y, sc, 288, 128, {"alpha": round(alpha, 3)})

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

# ── soft cloud-road under the avenue ─────────────────────────────────────────
AVENUE = [120, 1000, 900, 1004, 1700, 996, 2500, 1004, 3090, 1000]
sprites[0:0] = [
    stroke("#bcd3e8", 200, AVENUE),
    stroke("#d2e3f2", 130, AVENUE),
    stroke("#e8f1fa", 56, AVENUE),
]

new = []

# ── pennants + offerings along the existing colonnade ────────────────────────
# pillar rows sit at x ≈ 90..2890 step ~190, y ≈ 905 (north) and 1095 (south)
px = 280
k = 0
while px < 2900:
    if not 1300 < px < 1700:                       # keep the great gate clear
        if k % 2 == 0:
            new.append(flag(px, 880))
        else:
            new.append(gold(px + random.uniform(-12, 12), 1126))
    px += 380
    k += 1

# ── forecourt at the great gate (gate_arch ≈1500,990) ────────────────────────
new.append(prop("cloud_platform", 1500, 1090, 1.1))
new.append(prop("crystal_cyan", 1404, 1052, 0.9))
new.append(prop("crystal_amber", 1598, 1052, 0.9))
new.append(gold(1452, 1100))
new.append(gold(1546, 1104))
new.append(sign(1620, 1108))

# ── the Apsara Guide's alcove (NPC at 360,980) ───────────────────────────────
new.append(prop("cloud_platform", 320, 1064, 0.95))
new.append(flag(238, 920))
new.append(prop("crystal_cyan", 452, 942, 0.8))
new.append(gold(286, 1024))

# ── east threshold before the exit portal ────────────────────────────────────
new.append(prop("pillar", 2960, 912, 0.9))
new.append(prop("pillar", 2960, 1108, 0.9))
new.append(flag(2898, 896))
new.append(flag(2898, 1124))
new.append(gold(3010, 1058))

# ── distant gallery on the bottom band (the top band already has its own
#    colonnade — doubling it read as a grid) ──────────────────────────────────
gx = 320.0
while gx < 3000:
    new.append(prop("pillar", gx + random.uniform(-30, 30), 1652, random.uniform(0.5, 0.62)))
    if random.random() < 0.4:
        new.append(cloud(gx + 110, 1640, random.uniform(0.5, 0.7), 0.45))
    if random.random() < 0.3:
        new.append(gold(gx + random.uniform(40, 110), 1668))
    gx += random.uniform(380, 520)
# drifting clouds through the top colonnade for depth
for cx in (500, 1250, 2050, 2750):
    new.append(cloud(cx, 408 + random.uniform(-16, 16), random.uniform(0.55, 0.75), 0.45))

# ── crystal islets floating in the bare blue ─────────────────────────────────
for ix, iy, kind in [(620, 660, "crystal_cyan"), (1900, 620, "crystal_amber"),
                     (1100, 1380, "crystal_amber"), (2500, 1400, "crystal_cyan"),
                     (2950, 580, "crystal_cyan"), (500, 1420, "crystal_amber")]:
    new.append(cloud(ix - 20, iy + 70, random.uniform(0.7, 0.9), 0.5))
    new.append(prop("cloud_platform", ix, iy, 0.85))
    new.append(prop(kind, ix + random.uniform(-16, 16), iy - 24, random.uniform(0.75, 0.95)))
    new.append(gold(ix - 60, iy + 4))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 29 dressed: +{len(new)} sprites, total {len(sprites)}, anim {anim}")
