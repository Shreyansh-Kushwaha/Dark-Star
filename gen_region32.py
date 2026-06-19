#!/usr/bin/env python3
"""
Region 32 "Gem Hollows (Ratnaguha)" — fix sealed catacombs portal + dressing.

Sunless Deep mining cave with three portals. The south portal to region 46
(Drowned Catacombs, at 1600,1740) sat INSIDE the bottom cave wall — zone
z32_18 covered it and there was no corridor, so the spur was unreachable.
Fixes:
  • a south passage is carved (x1520–1700): the two wall zones over it are
    replaced by stubs, and the descent is painted and framed — lamps, a
    signpost, skulls and cold crystals announcing the catacombs below
  • the two underground lakes were stroke-loop rings; repainted as solid
    layered pools with reeds and lily pads
Dressing (keeps everything else):
  • a trodden floor-path linking all three portals through the cave
  • the Lost Miner's camp: campfire, crates, ore pile, lamp, sign
  • gem gardens clustered around both lakes; ore veins along the walls
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_32.json"
random.seed(3232)

PROPS = "assets_custom/props"
GEN = "r32dress"

ANCHOR = {
    "crystal_cyan":   (64, 116, 32, 115),
    "crystal_purple": (64, 116, 32, 115),
    "crystal_amber":  (64, 116, 32, 115),
    "skull":          (40, 38, 20, 37),
    "bone_pile":      (84, 60, 42, 59),
    "reed":           (34, 74, 17, 73),
    "lily_pad":       (44, 28, 22, 14),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r32_d")

sprites[:] = [s for s in sprites if not _ours(s)]

# ── fix: carve the south passage to the catacombs portal (1600,1740) ─────────
d["noWalkZones"] = [z for z in d["noWalkZones"] if not str(z["id"]).startswith("z32_dress")]
zones = {z["id"]: z for z in d["noWalkZones"]}
for zid in ("z32_16", "z32_18"):
    if zid in zones:
        d["noWalkZones"].remove(zones[zid])
d["noWalkZones"] += [
    {"id": "z32_dress_pL", "x": 1400, "y": 1454, "w": 120, "h": 666},  # west of passage
    {"id": "z32_dress_pR", "x": 1700, "y": 1391, "w": 102, "h": 729},  # east of passage
]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r32_d{_n[0]:04d}"

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

def crate(x, y): return base("assest4/next2/2 Objects/4 Box", "3.png", "crate", x, y, 2.1, 10, 21)
def gold(x, y):  return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones", f"Gold Stone {random.randint(1,6)}.png", "ware", x, y, random.uniform(0.5, 0.7), 64, 127)
def lamp(x, y):  return base("assest4/map_objects/2 Objects/7 Decor", "Lamp1.png", "lamp", x, y, 3.0, 10, 34)
def sign(x, y):  return base("assest4/map_objects/2 Objects/3 Pointer", "1.png", "sign", x, y, 2.4, 10, 35)

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

# ── repaint the two lakes as solid pools ─────────────────────────────────────
for px, py in ((900, 1000), (2100, 1000)):
    sprites.extend([
        stroke("#163e4e", 160, ellipse_pts(px, py, 96, 52)),
        stroke("#1c4f63", 110, ellipse_pts(px, py, 56, 30)),
        stroke("#2f7d97", 46,  ellipse_pts(px - 10, py - 8, 30, 15)),
    ])

# ── floor-paths: west→east through the cave + the catacombs descent ──────────
cols = {}
for z in d["noWalkZones"]:
    if z["id"].startswith("z32_dress"):
        continue
    cols.setdefault(z["x"], []).append(z)
centers = []
for k in sorted(cols):
    pair = cols[k]
    if len(pair) != 2:
        continue
    top = min(pair, key=lambda z: z["y"])
    bot = max(pair, key=lambda z: z["y"])
    centers.append((k + 101, (top["y"] + top["h"] + bot["y"]) / 2))
pts = [120, 1033] + [c for xy in centers for c in xy] + [3090, 1037]
sprites[0:0] = [stroke("#221c28", 74, pts), stroke("#2a2334", 38, pts)]
SOUTH = [1600, 1060, 1588, 1300, 1606, 1520, 1600, 1760]
sprites.extend([stroke("#221c28", 70, SOUTH), stroke("#2a2334", 36, SOUTH)])

new = []
priority = []

# ── the catacombs descent, framed ────────────────────────────────────────────
new.append(lamp(1520, 1240))
new.append(lamp(1684, 1320))
new.append(sign(1676, 1180))
priority.append(prop("crystal_purple", 1512, 1440, 0.9))
priority.append(prop("crystal_purple", 1694, 1530, 0.8))
for i in range(3):
    new.append(prop("skull", 1540 + i * 52, 1604 + (i % 2) * 16, random.uniform(1.3, 1.5)))
new.append(prop("bone_pile", 1664, 1660, 1.2))

# ── the Lost Miner's camp (NPC at 320,1082) ──────────────────────────────────
priority.append(campfire(250, 1000))
new.append(crate(420, 1010))
new.append(crate(452, 1052))
new.append(gold(382, 1130))
new.append(lamp(470, 1130))
new.append(sign(212, 1130))

# ── gem gardens around both lakes ────────────────────────────────────────────
KINDS = ["crystal_cyan", "crystal_purple", "crystal_amber"]
for px, py in ((900, 1000), (2100, 1000)):
    for i in range(6):
        a = i / 6 * 2 * math.pi + 0.4
        new.append(prop(KINDS[i % 3], px + math.cos(a) * 150, py + math.sin(a) * 92,
                        random.uniform(0.7, 1.05)))
    for _ in range(3):
        a = random.uniform(0, 2 * math.pi)
        new.append(prop("reed", px + math.cos(a) * 120, py + math.sin(a) * 70,
                        random.uniform(1.3, 1.8)))
    new.append(prop("lily_pad", px - 24, py + 6, 1.2))
    new.append(prop("lily_pad", px + 34, py - 12, 1.0))

# ── ore veins along the cave walls ───────────────────────────────────────────
for vx, vy in [(640, 800), (1240, 690), (1850, 620), (2520, 700),
               (560, 1420), (1140, 1460), (2350, 1300), (2850, 1330)]:
    new.append(gold(vx + random.uniform(-20, 20), vy + random.uniform(-12, 12)))
    if random.random() < 0.5:
        new.append(prop(random.choice(KINDS), vx + random.uniform(30, 60),
                        vy + random.uniform(-10, 20), random.uniform(0.5, 0.7)))

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 32 dressed: +{len(new) + len(priority)} sprites, south passage carved, "
      f"zones {len(d['noWalkZones'])}, total {len(sprites)}, anim {anim}")
