#!/usr/bin/env python3
"""
Region 23 "Temple of Gods (Deva Mandira)" — dressing pass.

Already the best-dressed region (processional avenue, colonnade, braziers,
monastery/castle/tower) — this pass connects and frames it. Keeps every
gameplay element and adds:
  • temple forecourt: a paved approach joins the avenue to the great mural,
    with entrance pillars, flanking braziers, offerings and flower beds —
    the centrepiece stops floating like a billboard
  • portal gates: pillar pairs + temple flags at both ends of the avenue
  • signposts (Pokémon-style) at the portals, forecourt and shrine
  • bounded edges: tree rows in all four margins, parting at the portals
  • north pockets: groves between the three great buildings + a castle
    orchard with gold offerings
  • south grounds: pilgrim tent camp by the south-west house, a small
    obelisk shrine in the south-east, meadow clusters in the open lawn
  • avenue offerings: flower patches alternating along the road edges
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_23.json"
random.seed(2323)

PROPS = "assets_custom/props"
GEN = "r23dress"

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r23_") and sid_[6:].isdigit() and int(sid_[6:]) >= 500

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [500]
def sid():
    _n[0] += 1
    return f"s_r23_{_n[0]:04d}"

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

TREES = ["middle_lane_tree2", "middle_lane_tree3", "middle_lane_tree4", "middle_lane_tree5"]
def tree(x, y, sc=None):
    nm = random.choice(TREES)
    return base("craftpix-net-168228-free-tree-pixel-art-asset-pack/trees",
                f"{nm}.png", nm, x, y, sc or random.uniform(0.7, 0.95), 104, 268)

def bush(x, y):     return base("cropped", f"Bushe{random.randint(1,4)}_crop.png", "bush", x, y, random.uniform(0.9, 1.1), 38.5, 66)
def grass(x, y):    return base("assest4/next2/2 Objects/5 Grass", f"{random.randint(1,6)}.png", "grass", x, y, 2.7, 3, 6)
def flower(x, y):   return base("assest4/map_objects/2 Objects/6 Flower", f"{random.randint(1,12)}.png", "flower", x, y, 2.1, 3, 4)
def pillar(x, y, sc=0.8):   return base(PROPS, "pillar.png", "pillar", x, y, sc, 30, 195)
def brazier(x, y):  return base(PROPS, "brazier.png", "brazier", x, y, 2.0, 22, 77)
def obelisk(x, y, sc=1.6):  return base(PROPS, "obelisk.png", "obelisk", x, y, sc, 26, 146)
def gold(x, y):     return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones", f"Gold Stone {random.randint(1,6)}.png", "ware", x, y, random.uniform(0.5, 0.65), 64, 127)
def crate(x, y):    return base("assest4/next2/2 Objects/4 Box", "1.png", "crate", x, y, 2.0, 10, 21)
def tent(x, y):     return base("assest4/next2/2 Objects/6 Tent", "1.png", "tent", x, y, 1.9, 36.5, 64)
def fence(x, y):    return base("assest4/map_objects/2 Objects/2 Fence", "4.png", "fence", x, y, 2.0, 12, 17)
def sign(x, y):     return base("assest4/map_objects/2 Objects/3 Pointer", "1.png", "sign", x, y, 2.4, 10, 35)

def flag(x, y):
    return base("assest4/map_objects/3 Animated Objects/1 Flag", "1.png", "flag",
                x, y, 1.9, 16, 60,
                {"animated": True, "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0})

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

# ── temple forecourt: paved approach from the avenue up to the mural ─────────
sprites.extend([
    stroke("#9a7d44", 170, [1500, 1010, 1500, 880]),
    stroke("#b49a5e", 110, [1500, 1010, 1500, 880]),
    stroke("#cab37a", 50,  [1500, 1010, 1500, 880]),
])

new = []
new.append(pillar(1410, 1014, 0.85))
new.append(pillar(1590, 1014, 0.85))
new.append(brazier(1408, 928))
new.append(brazier(1592, 928))
for gx in (1392, 1500, 1608):
    new.append(gold(gx, 888))
for fx, fy in [(1372, 952), (1628, 952)]:
    for _ in range(3):
        new.append(flower(fx + random.uniform(-26, 26), fy + random.uniform(-14, 14)))
new.append(sign(1404, 1058))

# ── portal gates: pillar pairs + temple flags ────────────────────────────────
for gx, fxo in ((170, 60), (3040, -60)):
    new.append(pillar(gx, 916, 0.9))
    new.append(pillar(gx, 1108, 0.9))
    new.append(flag(gx + fxo, 902))
new.append(sign(252, 1066))
new.append(sign(2948, 1066))

# ── bounded edges: tree walls in the margins, parting at the portals ─────────
x = 60.0
while x < 3180:                                   # top row
    new.append(tree(x + random.uniform(-22, 22), 142 + random.uniform(-14, 14)))
    if random.random() < 0.4:
        new.append(bush(x + 70 + random.uniform(-26, 26), 168))
    x += 152
x = 60.0
while x < 3180:                                   # bottom row (full canopies show)
    new.append(tree(x + random.uniform(-22, 22), 1956 + random.uniform(-18, 18)))
    if random.random() < 0.35:
        new.append(bush(x + 70 + random.uniform(-26, 26), 1900))
    x += 152
for sx in (62, 3148):                             # side rows, parting at the avenue
    y = 320.0
    while y < 1840:
        if not 830 < y < 1180:
            new.append(tree(sx + random.uniform(-16, 16), y))
        y += 260

# ── north pockets: groves between the great buildings + castle orchard ───────
for tx, ty in [(940, 400), (1130, 318), (1010, 540), (2040, 430), (2240, 330), (2430, 520)]:
    new.append(tree(tx, ty, random.uniform(0.75, 0.95)))
    if random.random() < 0.5:
        new.append(bush(tx + random.uniform(-70, 70), ty + 40))
for ox_ in range(3):                              # orchard rows behind the castle
    for oy_ in range(2):
        new.append(tree(2880 + ox_ * 105, 240 + oy_ * 150, 0.68))
for _ in range(4):
    new.append(gold(2900 + random.uniform(-60, 160), 420 + random.uniform(-20, 30)))

# ── south grounds ────────────────────────────────────────────────────────────
# pilgrim camp by the south-west house (campfire already burns at 704,1665)
new.append(tent(388, 1642))
new.append(tent(528, 1706))
new.append(crate(456, 1696))
new.append(crate(330, 1700))
new.append(flag(596, 1640))
new.append(sign(648, 1716))

# small obelisk shrine in the south-east lawn
new.append(obelisk(2700, 1592))
new.append(brazier(2628, 1626))
new.append(brazier(2772, 1626))
for i in range(6):
    import math
    a = i / 6 * 2 * math.pi
    new.append(flower(2700 + math.cos(a) * 86, 1632 + math.sin(a) * 46))
new.append(fence(2620, 1556))
new.append(fence(2780, 1556))
new.append(sign(2790, 1680))

# meadow clusters filling the open lawn
for cx, cy in [(900, 1480), (1300, 1690), (1700, 1440), (2100, 1700),
               (2900, 1360), (1150, 1330), (2350, 1380)]:
    for _ in range(random.randint(3, 4)):
        new.append(grass(cx + random.uniform(-90, 90), cy + random.uniform(-45, 45)))
    for _ in range(2):
        new.append(flower(cx + random.uniform(-90, 90), cy + random.uniform(-45, 45)))
    if random.random() < 0.6:
        new.append(bush(cx + random.uniform(-60, 60), cy + random.uniform(-30, 30)))
for tx, ty in [(1150, 1600), (1900, 1620), (2250, 1520), (840, 1740)]:
    new.append(tree(tx, ty, random.uniform(0.72, 0.9)))

# ── avenue offerings: flower patches alternating along the road edges ────────
for k, fx in enumerate(range(640, 2960, 460)):
    fy = 862 if k % 2 == 0 else 1136
    if not 1330 < fx < 1670:                      # keep the forecourt clear
        for _ in range(3):
            new.append(flower(fx + random.uniform(-30, 30), fy + random.uniform(-12, 12)))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
print(f"region 23 dressed: +{len(new)} sprites, total {len(sprites)}, anim {anim}")
