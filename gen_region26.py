#!/usr/bin/env python3
"""
Region 26 "Wind Cliffs (Vāyupatha)" — dressing pass.

Act IV ridge-walk in the sky. The path and floating boulders existed but
nothing read as a cliff. Keeps every gameplay element and adds:
  • cliff walls: rock chains hugging both edges of the winding corridor
    (sampled from the no-walk zone columns, so they follow every bend)
  • prayer flags strung along the ridge — the wind made visible
  • the Wind-Climber's camp at the start (campfire, crate, flag)
  • a wind shrine at the mural: pillar pair, second brazier, offerings
  • floating islets in the open sky: boulder clusters on cloud beds,
    some crowned with a crystal — mountain tops piercing the cloud sea
  • a gate of pillars + flags at the far portal
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_26.json"
random.seed(2626)

PROPS = "assets_custom/props"
GEN = "r26dress"

ANCHOR = {
    "pillar":       (60, 196, 30, 195),
    "brazier":      (44, 78, 22, 77),
    "crystal_cyan": (64, 116, 32, 115),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r26_d")

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r26_d{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def rock(x, y, sc=None):
    return {
        "type": "sprite", "spriteId": sid(), "dir": "assets_custom/rocks_sand",
        "frames": [f"Rock{random.randint(1,4)}.png"], "name": "Rock", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(sc or random.uniform(1.1, 1.9), 3),
        "scaleY": round(sc or random.uniform(1.1, 1.9), 3),
        "offsetX": 32.0, "offsetY": 63,
    }

def cloud(x, y, sc, alpha):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Clouds",
        "frames": ["Clouds_01.png"], "name": "Clouds_01", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(sc, 3), "scaleY": round(sc, 3),
        "offsetX": 288, "offsetY": 128, "alpha": round(alpha, 3),
    }

def gold(x, y):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones",
        "frames": [f"Gold Stone {random.randint(1,6)}.png"], "name": "ware", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 0.55, "scaleY": 0.55, "offsetX": 64.0, "offsetY": 127,
    }

def crate(x, y):
    return {
        "type": "sprite", "spriteId": sid(), "dir": "assest4/next2/2 Objects/4 Box",
        "frames": ["3.png"], "name": "crate", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 2.1, "scaleY": 2.1, "offsetX": 10.0, "offsetY": 21,
    }

def flag(x, y):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "assest4/map_objects/3 Animated Objects/1 Flag",
        "frames": ["1.png"], "name": "flag", "animated": True,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 1.5, "scaleY": 1.5, "offsetX": 16.0, "offsetY": 60,
        "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0,
    }

def campfire(x, y):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "assest4/map_objects/3 Animated Objects/2 Campfire",
        "frames": ["1.png"], "name": "1", "animated": True,
        "spriteLayer": "below", "x": x, "y": y, "scaleX": 1.6, "scaleY": 1.6,
        "offsetX": 16.0, "offsetY": 60,
        "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0,
    }

# ── corridor centreline from the paired no-walk zone columns ─────────────────
cols = {}
for z in d["noWalkZones"]:
    if not z["id"].startswith("z26_"):
        continue
    k = z["x"]
    cols.setdefault(k, []).append(z)
centers = []
for k in sorted(cols):
    pair = cols[k]
    if len(pair) != 2 or k < 0:
        continue
    top = min(pair, key=lambda z: z["y"])
    bot = max(pair, key=lambda z: z["y"])
    centers.append((k + 101, (top["y"] + top["h"] + bot["y"]) / 2))

new = []

# ── cliff walls: rock chains along both corridor edges ───────────────────────
for cx, cy in centers:
    for side in (-1, 1):
        for _ in range(2):
            new.append(rock(cx + random.uniform(-80, 80),
                            cy + side * random.uniform(195, 245),
                            random.uniform(1.2, 2.0)))

# ── prayer flags strung along the ridge ──────────────────────────────────────
for i in range(2, len(centers) - 1, 3):
    cx, cy = centers[i]
    side = -1 if (i // 3) % 2 else 1
    new.append(flag(cx + random.uniform(-30, 30), cy + side * 150))

# ── Wind-Climber's camp (NPC at 360,1096; portal at 120,1034) ────────────────
new.append(campfire(310, 1010))
new.append(crate(424, 1024))
new.append(flag(252, 1148))
new.append(rock(460, 1170, 1.0))

# ── wind shrine at the mural (1500,908) ──────────────────────────────────────
new.append(prop("pillar", 1404, 920, 0.8))
new.append(prop("pillar", 1596, 920, 0.8))
new.append(prop("brazier", 1352, 968, 1.7))
new.append(gold(1456, 952))
new.append(gold(1548, 956))

# ── far gate: pillars + flags at the exit portal (3090,950) ──────────────────
new.append(prop("pillar", 2990, 880, 0.9))
new.append(prop("pillar", 2990, 1056, 0.9))
new.append(flag(2920, 866))
new.append(flag(2920, 1080))

# ── floating islets: boulder clusters on cloud beds ──────────────────────────
ISLETS = [(700, 480, True), (1250, 380, False), (1850, 1560, True),
          (2480, 1480, False), (2850, 400, True), (450, 1620, False)]
for ix, iy, crowned in ISLETS:
    new.append(cloud(ix - 30, iy + 90, random.uniform(0.9, 1.1), 0.55))
    for _ in range(random.randint(3, 4)):
        new.append(rock(ix + random.uniform(-90, 90), iy + random.uniform(-40, 40),
                        random.uniform(1.3, 2.1)))
    if crowned:
        new.append(prop("crystal_cyan", ix + random.uniform(-20, 20), iy - 40,
                        random.uniform(0.8, 1.0)))
    else:
        new.append(gold(ix + random.uniform(-30, 30), iy + 10))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 26 dressed: +{len(new)} sprites, total {len(sprites)}, anim {anim}")
