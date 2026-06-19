#!/usr/bin/env python3
"""
Region 33 "Bone City (Asthinagara)" — fix sealed Severance gate + dressing.

Sunless Deep city of arches. The north portal to region 35 — the doorway
to Act VI — sat INSIDE the top cave wall (column x600–800 blocked to y≈700,
portal at y250): unreachable. Fixes:
  • a north passage is carved (x680–840), painted, and framed as the
    Severance Gate: a bone arch over the mouth, void-purple crystals,
    paired lamps, and the dead crowding the threshold
Dressing (keeps everything else; the city finally gets streets):
  • a bone-dust avenue west→east along the corridor + the gate spur
  • mural plaza: brazier pair (glow-priority), skull ring round the mural
  • the Bone Speaker's circle: campfire, seat skulls, signpost
  • ossuary mounds between the gallery arches; processional skull rows
    along the avenue; an east gauntlet before the elite
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_33.json"
random.seed(3333)

PROPS = "assets_custom/props"
GEN = "r33dress"

ANCHOR = {
    "skull":          (40, 38, 20, 37),
    "bone_pile":      (84, 60, 42, 59),
    "bone_arch":      (128, 156, 64, 155),
    "crystal_purple": (64, 116, 32, 115),
    "crystal_cyan":   (64, 116, 32, 115),
    "brazier":        (44, 78, 22, 77),
    "pillar":         (60, 196, 30, 195),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r33_d")

sprites[:] = [s for s in sprites if not _ours(s)]

# ── fix: carve the north passage to the Severance portal (760,250) ───────────
d["noWalkZones"] = [z for z in d["noWalkZones"] if not str(z["id"]).startswith("z33_dress")]
drop = []
for z in d["noWalkZones"]:
    if z["x"] == 600 and z["y"] < 0 and z["h"] > 700:
        drop.append(z)
    if z["x"] == 800 and z["y"] < 0 and z["h"] > 700:
        drop.append(z)
for z in drop:
    d["noWalkZones"].remove(z)
d["noWalkZones"] += [
    {"id": "z33_dress_gL", "x": 600, "y": -120, "w": 80,  "h": 822},  # west of passage
    {"id": "z33_dress_gR", "x": 840, "y": -120, "w": 162, "h": 806},  # east of passage
]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r33_d{_n[0]:04d}"

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

# ── bone-dust streets: avenue along the corridor + the gate spur ─────────────
cols = {}
for z in d["noWalkZones"]:
    if z["id"].startswith("z33_dress"):
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
pts = [120, 1023] + [c for xy in centers for c in xy] + [3090, 924]
sprites[0:0] = [stroke("#3c362e", 150, pts), stroke("#443d35", 96, pts), stroke("#4d463e", 46, pts)]
SPUR = [760, 1020, 748, 760, 766, 500, 760, 260]
sprites.extend([stroke("#3c362e", 130, SPUR), stroke("#443d35", 84, SPUR), stroke("#4d463e", 40, SPUR)])

new = []
priority = []

# ── realistic cave walls: rebuild the rock field ─────────────────────────────
# The original 285 rocks were uniform scatter. Re-lay the same budget as
# walls: a dense overlapping face along each corridor edge, bigger boulders
# massed behind, and small debris spilling toward the road.
sprites[:] = [s for s in sprites if not (
    s.get("type") == "sprite" and str(s.get("name", "")).startswith("Rock")
    and s.get("dir") == "assets_custom/rocks_sand")]

def rock(x, y, sc):
    return base("assets_custom/rocks_sand", f"Rock{random.randint(1,4)}.png", "Rock",
                x, y, sc, 32, 63)

# wall-face heights per column (gate stubs included, since pairing broke there)
tops, bots = {}, {}
for z in d["noWalkZones"]:
    if z["y"] < 0 and z["h"] > 300:
        tops[z["x"]] = z["y"] + z["h"]
    elif z["y"] > 400:
        bots[z["x"]] = z["y"]
tops[600], tops[800] = 702, 686            # the carved gate's shoulder heights

def in_passage(x):
    return 668 < x < 852                   # the Severance passage stays open

for k in range(0, 3200, 200):
    yface_t, yface_b = tops.get(k), bots.get(k)

    if yface_t:
        # top wall: tight rampart at the face, continuous rubble mass behind
        for fx in range(k + 25, k + 200, 50):
            x = fx + random.uniform(-14, 14)
            if not in_passage(x):
                new.append(rock(x, yface_t - random.uniform(5, 60), random.uniform(2.0, 2.6)))
        for _ in range(5):
            x = k + random.uniform(10, 190)
            if not in_passage(x):
                depth = random.uniform(60, 420)
                new.append(rock(x, yface_t - depth, random.uniform(2.3, 3.2)))

    if yface_b:
        # bottom wall: face rampart, continuous mass below
        for fx in range(k + 25, k + 200, 50):
            new.append(rock(fx + random.uniform(-14, 14), yface_b + random.uniform(125, 185),
                            random.uniform(2.0, 2.6)))
        for _ in range(5):
            new.append(rock(k + random.uniform(10, 190), yface_b + random.uniform(185, 560),
                            random.uniform(2.3, 3.2)))

    # sparse pebbles texturing the walkable floor
    if yface_t and yface_b and random.random() < 0.6:
        new.append(rock(k + random.uniform(20, 180),
                        random.uniform(yface_t + 120, yface_b - 60), random.uniform(0.55, 0.85)))

    # debris pebbles spilling off the walls toward the road
    if k % 400 == 0 and yface_t and yface_b:
        new.append(rock(k + 100 + random.uniform(-70, 70), yface_t + random.uniform(40, 90),
                        random.uniform(0.9, 1.3)))
        new.append(rock(k + 100 + random.uniform(-70, 70), yface_b - random.uniform(40, 90),
                        random.uniform(0.9, 1.3)))

# ── the Severance Gate (passage mouth at 760, y≈700) ─────────────────────────
new.append(prop("bone_arch", 760, 720, 1.35))
priority.append(prop("crystal_purple", 668, 560, 1.0))
priority.append(prop("crystal_purple", 856, 540, 0.9))
new.append(lamp(660, 760))
new.append(lamp(862, 766))
for i in range(4):
    new.append(prop("skull", 690 + i * 50, 806 + (i % 2) * 16, random.uniform(1.3, 1.5)))
new.append(prop("bone_pile", 600, 700, 1.25))
new.append(sign(852, 838))

# ── mural plaza (mural at 1600,1031) ─────────────────────────────────────────
priority.append(prop("brazier", 1480, 1054, 1.9))
priority.append(prop("brazier", 1722, 1054, 1.9))
for i in range(6):
    import math
    a = i / 6 * 2 * math.pi + 0.26
    new.append(prop("skull", 1600 + math.cos(a) * 168, 1062 + math.sin(a) * 92,
                    random.uniform(1.25, 1.5)))

# ── the Bone Speaker's circle (NPC at 320,1059) ──────────────────────────────
priority.append(campfire(250, 980))
for sx_, sy_ in [(212, 1112), (296, 1142), (392, 1118)]:
    new.append(prop("skull", sx_, sy_, 1.45))
new.append(prop("bone_pile", 430, 1010, 1.2))
new.append(sign(444, 1112))

# ── ossuary mounds between the gallery arches ────────────────────────────────
ARCHES = [(420, 845), (720, 852), (1020, 819), (1320, 759), (1620, 697),
          (1920, 654), (2220, 637), (2520, 643), (2820, 668)]
for (x0, y0), (x1, y1) in zip(ARCHES, ARCHES[1:]):
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2 + 30
    if 600 < mx < 900:                          # keep the gate spur clear
        continue
    new.append(prop("bone_pile", mx + random.uniform(-14, 14), my, random.uniform(1.0, 1.3)))

# ── processional skull rows along the avenue ─────────────────────────────────
for i, (cx, cy) in enumerate(centers):
    if i % 2 == 0 or 600 < cx < 900:
        continue
    side = 1 if (i // 2) % 2 else -1
    new.append(prop("skull", cx + random.uniform(-16, 16), cy + side * 150,
                    random.uniform(1.25, 1.45)))

# ── east gauntlet before the exit (elite at 2480,894) ────────────────────────
new.append(lamp(2660, 800))
new.append(lamp(2780, 980))
for i in range(3):
    new.append(prop("skull", 2700 + i * 56, 880 + (i % 2) * 18, random.uniform(1.3, 1.5)))
new.append(prop("crystal_cyan", 2920, 830, 0.85))

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 33 dressed: +{len(new) + len(priority)} sprites, Severance gate carved, "
      f"zones {len(d['noWalkZones'])}, total {len(sprites)}, anim {anim}")
