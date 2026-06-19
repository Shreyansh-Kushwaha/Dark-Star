#!/usr/bin/env python3
"""
Region 20 "Copper Bazaar (Tāmrapura)" — dressing pass, hub-town structure.

Four-portal Act III hub whose market huddled in the west half while the east
was empty desert. Keeps every gameplay element and:
  • fixes: removes the 26 duplicated dirt-patch strokes (92–117 ≡ 118–143);
    gives the south road its missing highlight lane
  • roads: a proper spur to the south-east portal; trail-stones edging
  • east bazaar row: market stalls (tent/ware/crate/banner) line both sides
    of the east road, so the bazaar reads as one continuous town
  • caravan rest by the SE portal: tents, campfire, goods pen, cacti
  • the oasis pool gets a stone rim, reeds, pads and a water-seller stall
  • junction square: animated banners + lamps where the roads cross
  • bounded edges: cactus groves and sand-rock clumps ring the no-walk
    margins, parting at the portals (Pokémon-style route framing)
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_20.json"
random.seed(2020)

PROPS = "assets_custom/props"
GEN = "r20dress"

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r20_") and sid_[6:].isdigit() and int(sid_[6:]) >= 500

sprites[:] = [s for s in sprites if not _ours(s)]

# ── fix: drop exact-duplicate dirt-patch strokes (keep the first of each) ────
seen, dedup = set(), []
for s in sprites:
    if s.get("type") == "stroke":
        key = (s["stroke"], s["strokeWidth"], tuple(s["points"]))
        if key in seen:
            continue
        seen.add(key)
    dedup.append(s)
sprites[:] = dedup

_n = [500]
def sid():
    _n[0] += 1
    return f"s_r20_{_n[0]:04d}"

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

def cactus(x, y, sc=None):   return base(PROPS, "cactus.png", "cactus", x, y, sc or random.uniform(1.2, 1.7), 24, 91)
def reed(x, y):              return base(PROPS, "reed.png", "reed", x, y, random.uniform(1.5, 2.1), 17, 73)
def lily(x, y):              return base(PROPS, "lily_pad.png", "lily_pad", x, y, random.uniform(1.0, 1.3), 22, 14)
def brazier(x, y):           return base(PROPS, "brazier.png", "brazier", x, y, 2.2, 22, 77)
def sandrock(x, y, sc=None): return base("assets_custom/rocks_sand", f"Rock{random.randint(1,4)}.png", "Rock", x, y, sc or random.uniform(0.9, 1.6), 32, 63)
def tent(x, y):              return base("assest4/next2/2 Objects/6 Tent", "2.png", "tent", x, y, 1.685, 32, 60)
def crate(x, y):             return base("assest4/next2/2 Objects/4 Box", "3.png", "crate", x, y, 2.1, 10, 21)
def ware(x, y):              return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones", f"Gold Stone {random.randint(1,6)}.png", "ware", x, y, random.uniform(0.55, 0.7), 64, 127)
def lamp(x, y):              return base("assest4/map_objects/2 Objects/7 Decor", "Lamp1.png", "lamp", x, y, 1.503, 10, 34)
def fence(x, y):             return base("assest4/map_objects/2 Objects/2 Fence", "4.png", "fence", x, y, 2.0, 13, 16)
def grass(x, y):             return base("assest4/next2/2 Objects/5 Grass", f"{random.randint(1,6)}.png", "grass", x, y, 2.5, 3, 6)

def banner(x, y):
    return base("assest4/map_objects/3 Animated Objects/1 Flag", "1.png", "banner",
                x, y, 1.4, 16, 60,
                {"animated": True, "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0})

def campfire(x, y):
    return base("assest4/map_objects/3 Animated Objects/2 Campfire", "1.png", "1",
                x, y, 1.6, 16, 60,
                {"animated": True, "frameW": 32, "frameH": 64, "frameCount": 6, "frameRow": 0})

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

# ── roads: SE spur + the south road's missing highlight lane ─────────────────
SE_SPUR = [2400, 1010, 2390, 1240, 2400, 1480, 2400, 1700]
sprites.extend([
    stroke("#8a6d42", 110, SE_SPUR),
    stroke("#9c7d4e", 54, SE_SPUR),
    stroke("#9c7d4e", 54, [820, 1010, 820, 1760]),   # south road had base only
])

new = []

# ── bounded edges: cactus groves + sand-rock clumps in the margins ───────────
def edge_clump(x, y):
    if random.random() < 0.5:
        for _ in range(random.randint(2, 3)):
            new.append(cactus(x + random.uniform(-46, 46), y + random.uniform(-22, 22)))
    else:
        for _ in range(random.randint(2, 3)):
            new.append(sandrock(x + random.uniform(-50, 50), y + random.uniform(-20, 20)))

x = 30.0
while x < 3200:                                    # top margin (y < 120)
    edge_clump(x, 64 + random.uniform(-14, 14))
    x += 165
x = 30.0
while x < 3200:                                    # bottom margin, parting at S portal road
    if not 700 < x < 950:
        edge_clump(x, 1948 + random.uniform(-14, 14))
    x += 165
for sx in (44, 3156):                              # side margins, parting at the portals
    y = 200.0
    while y < 1860:
        if not 840 < y < 1170:
            edge_clump(sx, y)
        y += 190

# ── east bazaar row: stalls along both sides of the east road ────────────────
for i, bx in enumerate((1960, 2210, 2460, 2710)):  # north side, fuller stalls
    new.append(tent(bx, 858))
    new.append(ware(bx - 52, 886))
    new.append(crate(bx + 46, 880))
    if i % 2 == 0:
        new.append(banner(bx + 76, 836))
for bx in (2090, 2340, 2590, 2840):                # south side, goods laid out
    new.append(ware(bx, 1142))
    new.append(crate(bx + 40, 1130))
    if random.random() < 0.5:
        new.append(fence(bx - 44, 1124))
for lx, ly in [(2000, 932), (2500, 932), (2890, 1068), (2240, 1068)]:
    new.append(lamp(lx, ly))

# ── caravan rest north-west of the SE portal ─────────────────────────────────
new.append(tent(2272, 1474))
new.append(tent(2520, 1520))
new.append(campfire(2398, 1538))
new.append(crate(2336, 1586))
new.append(crate(2462, 1590))
new.append(ware(2300, 1546))
for fx in (2220, 2272, 2324):                      # goods pen
    new.append(fence(fx, 1418))
new.append(cactus(2580, 1452))
new.append(cactus(2170, 1560))

# ── oasis: repaint the pool as a solid pond (the old stroke loop self-overlapped
#    into a teal swoosh), then stone rim, reeds, pads, water-seller ────────────
def ellipse_pts(cx, cy, rx, ry, n=16):
    out = []
    for i in range(n + 1):
        a = i / n * 2 * math.pi
        out += [cx + rx * math.cos(a), cy + ry * math.sin(a)]
    return out

sprites.extend([
    stroke("#1f5a62", 150, ellipse_pts(1500, 1300, 74, 42)),
    stroke("#256a73", 110, ellipse_pts(1500, 1300, 44, 24)),
    stroke("#4aa0ad", 46, ellipse_pts(1492, 1290, 26, 13)),
])

OAX, OAY, ORX, ORY = 1500, 1300, 128, 78
for i in range(9):
    a = i / 9 * 2 * math.pi
    new.append(sandrock(OAX + math.cos(a) * (ORX + 18), OAY + math.sin(a) * (ORY + 14),
                        random.uniform(0.5, 0.75)))
for _ in range(5):
    a = random.uniform(0, 2 * math.pi)
    new.append(reed(OAX + math.cos(a) * (ORX + 40), OAY + math.sin(a) * (ORY + 30)))
new.append(lily(1472, 1290))
new.append(lily(1538, 1318))
new.append(lamp(1610, 1238))
new.append(crate(1382, 1234))
new.append(ware(1352, 1262))

# ── junction square: banners + lamps where the roads cross ───────────────────
for bx, by in [(762, 948), (880, 948), (762, 1062), (880, 1062)]:
    new.append(banner(bx, by))
new.append(brazier(700, 1004))
new.append(crate(940, 1010))

# ── cactus groves + grass in the remaining open pockets ──────────────────────
for gx, gy in [(1700, 320), (2700, 420), (1320, 1640), (2940, 1620),
               (1180, 240), (2080, 1780)]:
    for _ in range(random.randint(3, 4)):
        new.append(cactus(gx + random.uniform(-90, 90), gy + random.uniform(-45, 45)))
    for _ in range(2):
        new.append(grass(gx + random.uniform(-110, 110), gy + random.uniform(-55, 55)))

# ── trail-stones edging the roads ────────────────────────────────────────────
for k in range(12):                                # main road
    t = (k + 0.5) / 12
    x = 120 + t * (3060 - 120)
    side = -1 if k % 2 else 1
    new.append(sandrock(x + random.uniform(-14, 14), 1000 + side * random.uniform(78, 95),
                        random.uniform(0.38, 0.5)))
for k in range(4):                                 # south spur
    y = 1120 + k * 150
    new.append(sandrock(820 + (-1 if k % 2 else 1) * random.uniform(72, 88), y,
                        random.uniform(0.38, 0.5)))
for k in range(4):                                 # SE spur
    y = 1100 + k * 140
    new.append(sandrock(2398 + (-1 if k % 2 else 1) * random.uniform(72, 88), y,
                        random.uniform(0.38, 0.5)))

sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
anim = sum(1 for s in sprites if s.get("animated"))
strokes = sum(1 for s in sprites if s.get("type") == "stroke")
print(f"region 20 dressed: +{len(new)} sprites, strokes now {strokes} (dupes dropped), "
      f"total {len(sprites)}, anim {anim}")
