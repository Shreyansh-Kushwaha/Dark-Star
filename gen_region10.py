#!/usr/bin/env python3
"""
Region 10 — "Pātāla Guha, The Sunless Deep" (a cave).

A torch-lit cavern that snakes from the entry chamber (left) through a
stalagmite chicane and an underground lake to a crystal-cathedral boss chamber
(right, lair of the demon-slime Viyogasur).

Performance lesson from region 9 is applied: everything is a STATIC single
image except a few small animated water accents. Cave "walls" are dense rock
formations (Tiny-Swords Rock1-4) on a dark background; light & wonder come from
glowing Gold-Stone crystal clusters and lamp torches.

Scale calibrated to the warrior (Dhruva, 192px frame @1.0, visible body ~100px):
  - wall rocks (64px) @1.4-3.6   -> looming cave formations / stalagmites
  - boulders  (64px) @0.7-1.5    -> knee-to-head rubble
  - crystals (128px) @0.7-1.6    -> waist-to-overhead gem clusters
  - lamp torches (~35px) @2.6-3.4 -> man-height standing torches
"""
import json, math

class RNG:
    def __init__(self, seed): self.s = seed & 0xFFFFFFFF
    def next(self):
        x = self.s
        x ^= (x << 13) & 0xFFFFFFFF; x ^= (x >> 17); x ^= (x << 5) & 0xFFFFFFFF
        self.s = x & 0xFFFFFFFF
        return self.s / 0xFFFFFFFF
    def rng(self, a, b): return a + (b - a) * self.next()
    def pick(self, seq): return seq[int(self.next() * len(seq)) % len(seq)]
    def chance(self, p): return self.next() < p

R = RNG(101010)
WORLD_W, WORLD_H = 3200, 2000
TS = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)"
DECOR = "assest4/map_objects/2 Objects/7 Decor"
LAMP_DIM = {"Lamp1": (20, 35), "Lamp2": (11, 35), "Lamp3": (13, 35)}

sprites = []
_id = 0
def sid():
    global _id; _id += 1
    return f"s_region10_{_id:04d}"

def rock(x, y, scale):
    n = int(R.rng(1, 5))
    sprites.append({"type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Decorations/Rocks", "frames": [f"Rock{n}.png"],
        "name": f"Rock{n}", "animated": False, "spriteLayer": "below",
        "x": round(x, 2), "y": round(y, 2), "scaleX": round(scale, 3),
        "scaleY": round(scale, 3), "offsetX": 32, "offsetY": 32})

def crystal(x, y, scale):
    n = int(R.rng(1, 7))
    sprites.append({"type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Resources/Gold/Gold Stones",
        "frames": [f"Gold Stone {n}.png"], "name": f"Gold Stone {n}",
        "animated": False, "spriteLayer": "below", "x": round(x, 2),
        "y": round(y, 2), "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": 64, "offsetY": 64})

def torch(x, y, scale):
    name = R.pick(list(LAMP_DIM))
    w, h = LAMP_DIM[name]
    sprites.append({"type": "sprite", "spriteId": sid(), "dir": DECOR,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": round(w / 2, 1), "offsetY": round(h - 2, 1)})  # bottom-anchored

def moss(x, y, scale):
    n = R.pick(["Bushe1_crop", "Bushe2_crop", "Bushe3_crop", "Bushe4_crop"])
    dm = {"Bushe1_crop": (80, 73), "Bushe2_crop": (77, 51),
          "Bushe3_crop": (96, 89), "Bushe4_crop": (77, 67)}[n]
    sprites.append({"type": "sprite", "spriteId": sid(), "dir": "cropped",
        "frames": [f"{n}.png"], "name": n, "animated": False, "spriteLayer": "below",
        "x": round(x, 2), "y": round(y, 2), "scaleX": round(scale, 3),
        "scaleY": round(scale, 3), "offsetX": dm[0] / 2, "offsetY": dm[1] / 2})

def water_rock(x, y):
    n = int(R.rng(1, 5))
    sprites.append({"type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Decorations/Rocks in the Water",
        "frames": [f"Water Rocks_0{n}.png"], "name": f"Water Rocks_0{n}",
        "animated": True, "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": 1, "scaleY": 1, "offsetX": 32, "offsetY": 32,
        "frameW": 64, "frameH": 64, "frameCount": 16, "frameRow": 0})

def water_splash(x, y):
    sprites.append({"type": "sprite", "spriteId": sid(), "dir": f"{TS}/Particle FX",
        "frames": ["Water Splash.png"], "name": "Water Splash", "animated": True,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2), "scaleX": 1,
        "scaleY": 1, "offsetX": 96, "offsetY": 96, "frameW": 192, "frameH": 192,
        "frameCount": 9, "frameRow": 0})

SMOKE = ["s1_1.png","s2_1.png","s3_1.png","s4_1.png","s1_2.png","s2_2.png","s3_2.png",
    "s4_2.png","s1_3.png","s2_3.png","s3_3.png","s4_3.png","s1_4.png","s2_4.png",
    "s3_4.png","s4_4.png","s1_5.png","s2_5.png","s3_5.png","s4_5.png","s1_6.png",
    "s3_6.png","s4_6.png","s1_7.png","s3_7.png","s3_8.png","s3_9.png"]
def mist(x, y, scale):
    sprites.append({"type": "sprite", "spriteId": sid(), "dir": "assets3/vfx/smoke",
        "frames": SMOKE, "name": "smoke", "animated": True, "spriteLayer": "below",
        "x": round(x, 2), "y": round(y, 2), "scaleX": round(scale, 3),
        "scaleY": round(scale, 3), "offsetX": 64, "offsetY": 64})

# ---- cavern shape: a winding walkable band of varying width -------------------
# centerline meanders; half-height (cavern radius) widens at chambers.
def center_y(x):
    return 1000 + 150 * math.sin(x / 520.0) + 70 * math.sin(x / 190.0 + 1.0)
CHAMBERS = [(400, 360), (1300, 430), (1720, 360), (2650, 470)]  # (x, radius) wide spots
def half_h(x):
    base = 230
    for cx, cr in CHAMBERS:
        base = max(base, cr * math.exp(-((x - cx) ** 2) / (2 * 360.0 ** 2)))
    return base
def cav_top(x):    return center_y(x) - half_h(x)
def cav_bot(x):    return center_y(x) + half_h(x)
def in_cavern(x, y): return cav_top(x) - 4 < y < cav_bot(x) + 4

# interior stalagmite pillars (player weaves around them)
PILLARS = [(950, 880, 95), (1250, 1180, 95), (1980, 820, 105), (2230, 1230, 105)]
def in_pillar(x, y):
    return any((x - px) ** 2 + (y - py) ** 2 < (pr + 8) ** 2 for px, py, pr in PILLARS)

# underground lake (lower pocket of the lake chamber)
LAKE = (1330, 1130, 250, 150)  # cx, cy, rx, ry (ellipse)
def in_lake(x, y):
    return ((x - LAKE[0]) / LAKE[2]) ** 2 + ((y - LAKE[1]) / LAKE[3]) ** 2 < 1

def dist(ax, ay, bx, by): return math.hypot(ax - bx, ay - by)
BOSS = (2680, 1000)

# =============================================================================
# 1) CAVE WALLS — dense rock formations filling everything outside the cavern.
# =============================================================================
STEP = 138
y = -120
while y < WORLD_H + 140:
    off = (STEP / 2) if (int((y + 200) / STEP) % 2) else 0
    x = -160
    while x < WORLD_W + 200:
        jx = x + off + R.rng(-40, 40); jy = y + R.rng(-40, 40)
        if in_cavern(jx, jy):
            x += STEP; continue
        # distance into the rock from the cavern edge -> bigger formations deeper
        edge = abs(jy - (cav_top(jx) if jy < center_y(jx) else cav_bot(jx)))
        scale = R.rng(2.4, 3.6) if edge > 240 else R.rng(1.5, 2.6)
        rock(jx, jy, scale)
        # cluster a couple smaller rocks for a craggy silhouette
        if R.chance(0.5): rock(jx + R.rng(-46, 46), jy + R.rng(-40, 40), R.rng(1.0, 1.8))
        x += STEP
    y += STEP

# left & right entry/exit gaps are carved by the cavern itself reaching the edges.

# =============================================================================
# 2) STALAGMITE PILLARS inside the cavern (rock clusters w/ collision).
# =============================================================================
for px, py, pr in PILLARS:
    rock(px, py, R.rng(2.6, 3.2))
    for _ in range(7):
        a = R.rng(0, math.tau); rr = R.rng(20, pr)
        rock(px + math.cos(a) * rr, py + math.sin(a) * rr * 0.8, R.rng(1.1, 2.0))

# scattered floor rubble + a few stalagmites through the cavern
for _ in range(46):
    x = R.rng(180, WORLD_W - 160); yv = R.rng(cav_top(x) + 30, cav_bot(x) - 30)
    if in_pillar(x, yv) or in_lake(x, yv) or dist(x, yv, *BOSS) < 150: continue
    rock(x, yv, R.rng(0.7, 1.5))

# =============================================================================
# 3) UNDERGROUND LAKE — dark water stroke + animated water accents.
# =============================================================================
lake_pts = []
for t in range(0, 360, 18):
    a = math.radians(t)
    lake_pts.extend([round(LAKE[0] + math.cos(a) * LAKE[2] * 0.6, 2),
                     round(LAKE[1] + math.sin(a) * LAKE[3] * 0.6, 2)])
lake_pts.extend(lake_pts[:2])
sprites.append({"type": "stroke", "stroke": "#1c4f63", "strokeWidth": 210,
    "lineCap": "round", "lineJoin": "round", "composite": "source-over", "points": lake_pts})
sprites.append({"type": "stroke", "stroke": "#2f7d97", "strokeWidth": 120,
    "lineCap": "round", "lineJoin": "round", "composite": "source-over", "points": lake_pts})
for _ in range(7):
    a = R.rng(0, math.tau); rr = R.rng(0.3, 0.95)
    water_rock(LAKE[0] + math.cos(a) * LAKE[2] * rr, LAKE[1] + math.sin(a) * LAKE[3] * rr)
water_splash(LAKE[0] - 70, LAKE[1] + 30)
water_splash(LAKE[0] + 90, LAKE[1] - 20)

# =============================================================================
# 4) CRYSTALS, TORCHES, MOSS, MIST — the "amazing" cave glow.
# =============================================================================
# crystal clusters in each chamber (glowing gold-stone gems)
for cx, cr in CHAMBERS:
    cy = center_y(cx)
    n = 9 if cx == BOSS[0] else 6
    for _ in range(n):
        a = R.rng(0, math.tau); rr = R.rng(40, cr * 0.7)
        x = cx + math.cos(a) * rr; yv = cy + math.sin(a) * rr * 0.7
        if not in_cavern(x, yv) or in_lake(x, yv): continue
        crystal(x, yv, R.rng(0.7, 1.5))
# a radiant crystal cathedral ring around the boss
for _ in range(12):
    a = R.rng(-1.1, 1.1); x = BOSS[0] + math.cos(a) * 360; yv = BOSS[1] + math.sin(a) * 300
    crystal(x, yv, R.rng(1.1, 1.7))

# lamp torches lining the cavern walls (light pools along the route)
for x in range(280, WORLD_W - 240, 260):
    if 2300 < x < 3040:  # denser near the boss approach
        pass
    yt = cav_top(x) + R.rng(18, 40); yb = cav_bot(x) - R.rng(18, 40)
    if not in_pillar(x, yt): torch(x, yt, R.rng(2.6, 3.4))
    if R.chance(0.6) and not in_lake(x, yb) and not in_pillar(x, yb):
        torch(x + R.rng(-30, 30), yb, R.rng(2.6, 3.4))

# moss/fungus tufts near the lake and damp lower walls
for _ in range(14):
    x = R.rng(220, WORLD_W - 220); yv = R.pick([cav_top(x) + R.rng(10, 50), cav_bot(x) - R.rng(10, 50)])
    if in_pillar(x, yv) or in_lake(x, yv): continue
    moss(x, yv, R.rng(0.7, 1.0))

# drifting mist
for mx, my in [(700, 1050), (1330, 980), (2680, 1000)]:
    mist(mx, my, R.rng(1.0, 1.4))

# =============================================================================
# 5) GAMEPLAY — collision, enemies, boss, npcs, portals.
# =============================================================================
# Collision: block the rock above & below the cavern band with rectangles that
# hug the meander (stepwise), plus pillar & lake zones. Entry/exit gaps stay open.
noWalkZones = []
SEG = 200
x = 0
while x < WORLD_W:
    t = cav_top(x + SEG / 2); b = cav_bot(x + SEG / 2)
    noWalkZones.append({"id": f"z10_t_{x}", "x": x, "y": -120, "w": SEG + 2, "h": t + 120})
    noWalkZones.append({"id": f"z10_b_{x}", "x": x, "y": b, "w": SEG + 2, "h": WORLD_H - b + 120})
    x += SEG
for i, (px, py, pr) in enumerate(PILLARS):
    noWalkZones.append({"id": f"z10_p{i}", "x": px - pr * 0.7, "y": py - pr * 0.7,
                        "w": pr * 1.4, "h": pr * 1.4})
noWalkZones.append({"id": "z10_lake", "x": LAKE[0] - LAKE[2] * 0.7, "y": LAKE[1] - LAKE[3] * 0.7,
                    "w": LAKE[2] * 1.4, "h": LAKE[3] * 1.4})

enemies = [
    {"id": "e10_01", "type": "bat",    "x": 640,  "y": 940},
    {"id": "e10_02", "type": "bat",    "x": 720,  "y": 1080},
    {"id": "e10_03", "type": "rat",    "x": 900,  "y": 1060},
    {"id": "e10_04", "type": "slimem", "x": 1180, "y": 940},
    {"id": "e10_05", "type": "bat",    "x": 1320, "y": 760},
    {"id": "e10_06", "type": "melee",  "x": 1480, "y": 980},
    {"id": "e10_07", "type": "mimic",  "x": 1720, "y": 1240},
    {"id": "e10_08", "type": "slimem", "x": 1900, "y": 1060},
    {"id": "e10_09", "type": "bat",    "x": 2100, "y": 900},
    {"id": "e10_10", "type": "melee",  "x": 2250, "y": 1080},
    {"id": "e10_11", "type": "elite",  "x": 2400, "y": 1000},
    {"id": "e10_12", "type": "mimic",  "x": 2560, "y": 1050},
]
boss = {"key": "viyogasur", "x": BOSS[0], "y": BOSS[1]}
npcs = [
    {"id": "npc10_lantern", "type": "yellow", "x": 300, "y": 900, "config": {
        "id": "npc10_lantern", "name": "Lantern Keeper",
        "first": "Keep_to_the_torchlight,_traveler...the_dark_between_the_crystals_is_where_Viyogasur_dreams._the_water_remembers_every_one_it_swallowed.",
        "active": "", "completed": ""}},
    {"id": "npc10_miner", "type": "blue", "x": 470, "y": 1100, "config": {
        "id": "npc10_miner", "name": "Lost Miner",
        "first": "The_gold_glows_but_do_not_touch_the_chests...some_of_them_have_teeth._I_only_made_it_back_because_the_slimes_were_full.",
        "active": "", "completed": ""}},
]
portals = [{"id": "portal10_back", "targetRegion": 9, "x": 60, "y": 1000}]

out = {
    "version": 1, "regionName": "Pātāla Guha — The Sunless Deep",
    "background": {"type": "color", "value": "#171210"},
    "sprites": sprites, "noWalkZones": noWalkZones, "enemies": enemies,
    "boss": boss, "npcs": npcs, "portals": portals, "regionIndex": 10,
}
with open("regions/region_10.json", "w") as f:
    json.dump(out, f, indent=1)

from collections import Counter
imgs = [s for s in sprites if s["type"] == "sprite"]
animated = [s for s in imgs if s.get("frameCount", 0) and s["frameCount"] > 1]
print("Region 10 (cave) written -> regions/region_10.json")
print(f"  sprites: {len(sprites)} ({len(imgs)} images, {len(sprites)-len(imgs)} strokes)")
print(f"  ANIMATED: {len(animated)}  | zones: {len(noWalkZones)} | enemies: {len(enemies)} | boss: {boss['key']}")
for n, c in Counter(s["name"] for s in imgs).most_common(14):
    print(f"    {c:4d}  {n}")
