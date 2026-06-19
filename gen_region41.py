#!/usr/bin/env python3
"""
Region 41 "Silent Shrine (Maunamandira)" — dressing pass.

The last room of the Erased Path: the Thread lies coiled and whole around
the shrine fire. Keeps every gameplay element and completes the symbol:
  • the approach: the Thread's final stretch runs bright and unbroken
    from the portal to the coil
  • six golden halo-rings orbit the spiral — the six kings gathered at
    last around the One — each with a small offering at its centre
  • a warm floor disk under the coil; the listeners' circle completed
    with two more seat-logs and a stone ring
  • the shrine wall: the mural flanked by pillar pair and amber crystals;
    cyan crystals answering from the dark (silence in two colours)
  • the NPC's ring: a small halo around The Unbroken Thread
  • shard banks at the top and bottom dark; a calm two-colour starfield
    with a constellation of six joined stars and one bright apart
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_41.json"
random.seed(4141)

PROPS = "assets_custom/props"
GEN = "r41dress"

ANCHOR = {
    "void_shard":    (120, 86, 60, 85),
    "crystal_amber": (64, 116, 32, 115),
    "crystal_cyan":  (64, 116, 32, 115),
    "pillar":        (60, 196, 30, 195),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r41_d")

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r41_d{_n[0]:04d}"

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

def gold(x, y):  return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones", f"Gold Stone {random.randint(1,6)}.png", "ware", x, y, random.uniform(0.5, 0.6), 64, 127)
def log_(x, y):  return base("assest4/map_objects/2 Objects/7 Decor", "Log4.png", "Log4", x, y, 1.9, 16.5, 31)
def rock(x, y):  return base("assets_custom/rocks_sand", f"Rock{random.randint(1,4)}.png", "Rock", x, y, random.uniform(0.7, 1.0), 32, 63)

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

C = (1600, 1000)   # the coil / shrine fire

# ── warm floor disk under the coil ───────────────────────────────────────────
sprites[0:0] = [
    stroke("#2e2614", 200, ellipse_pts(*C, 240, 160)),
    stroke("#383018", 110, ellipse_pts(*C, 130, 86)),
]

# ── the approach: the Thread's last stretch, whole and bright ────────────────
APP = [120, 1000, 500, 1004, 900, 996, 1240, 1000, 1380, 1000]
sprites.append(stroke("#7a5a16", 14, APP))
sprites.append(stroke("#d8b24a", 7, APP))
sprites.append(stroke("#f4e08a", 3, APP))

# ── six halos orbiting the coil ──────────────────────────────────────────────
new = []
priority = []
for i in range(6):
    a = i / 6 * 2 * math.pi - math.pi / 2
    hx = C[0] + math.cos(a) * 390
    hy = C[1] + math.sin(a) * 255
    sprites.append(stroke("#7a5a16", 5, ellipse_pts(hx, hy, 46, 26, n=14)))
    sprites.append(stroke("#d8b24a", 2, ellipse_pts(hx, hy, 46, 26, n=14)))
    new.append(gold(hx, hy + 8))

# ── the listeners' circle (logs at 1440/1760,1080) ───────────────────────────
new.append(log_(1448, 902))
new.append(log_(1752, 902))
for i in range(8):
    a = i / 8 * 2 * math.pi + 0.4
    new.append(rock(C[0] + math.cos(a) * 200, C[1] + math.sin(a) * 132))

# ── the shrine wall (mural at 1600,720) ──────────────────────────────────────
new.append(prop("pillar", 1488, 736, 0.85))
new.append(prop("pillar", 1712, 736, 0.85))
priority.append(prop("crystal_amber", 1430, 776, 0.85))
priority.append(prop("crystal_amber", 1772, 776, 0.8))
new.append(gold(1540, 766))
new.append(gold(1664, 770))

# ── The Unbroken Thread (NPC at 420,1000): a small halo on the path ──────────
sprites.append(stroke("#7a5a16", 5, ellipse_pts(420, 1006, 88, 48)))
sprites.append(stroke("#f4e08a", 2, ellipse_pts(420, 1006, 88, 48)))
priority.append(prop("crystal_cyan", 300, 944, 0.85))

# ── shard banks pressing at the top and bottom dark ──────────────────────────
for bx in range(150, 3100, 260):
    new.append(prop("void_shard", bx + random.uniform(-60, 60),
                    random.uniform(300, 420), random.uniform(0.9, 1.25)))
    new.append(prop("void_shard", bx + random.uniform(-60, 60),
                    random.uniform(1600, 1730), random.uniform(0.9, 1.25)))

# ── calm two-colour starfield + the constellation of six, and one apart ──────
random.seed(411)
for _ in range(30):
    sx_ = random.uniform(60, 3140)
    sy_ = random.uniform(60, 1940)
    if (1100 < sx_ < 2100 and 600 < sy_ < 1400) or 880 < sy_ < 1120:
        continue
    sprites.append(stroke(random.choice(["#8a7434", "#5a6e88", "#d8b24a", "#9fb8d8"]),
                          random.choice([3, 3, 4]), [sx_, sy_, sx_ + 1, sy_ + 1]))
SIX = [2480, 420, 2620, 360, 2760, 420, 2900, 370, 2700, 500, 2540, 540]
sprites.append(stroke("#5a4a26", 2, SIX + SIX[:2]))
for i in range(0, len(SIX), 2):
    sprites.append(stroke("#f4e08a", 5, [SIX[i], SIX[i + 1], SIX[i] + 1, SIX[i + 1] + 1]))
sprites.append(stroke("#f4e08a", 7, [2700, 250, 2701, 251]))   # the one apart, brightest

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
print(f"region 41 dressed: +{len(new) + len(priority)} sprites, total {len(sprites)}")
