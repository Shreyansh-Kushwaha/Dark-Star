#!/usr/bin/env python3
"""
Procedural generator for Region 9 — "Shilavana, The Vale of Stones".

Design goal: take the visual language of region_8 (Tiny Swords forest with a
river, bushes, rocks, water decorations) but lay it out as a deliberate,
good-looking composition:

  - A spawn glade on the left (where the player/Dhruva enters).
  - A broad, meandering walkable valley running left -> right.
  - Dense forest masses framing the valley (top & bottom bands + edges).
  - A meandering river crossing the valley at a shallow, water-rock ford.
  - A boss glade on the right, ringed by dense trees and strewn with
    mossy boulders & gold-veined stones (lair of the stone demon Pashana Daitya).
  - Decorative life: a grazing sheep flock in a side-meadow, bush thickets,
    stumps, drifting clouds, mystic smoke, rubber ducks on the water.

Scale is calibrated to the warrior (Dhruva) asset, which is a 192px frame drawn
at scale 1.0 (visible body ~100px tall):

  - Trees (192/256px frames) at ~1.0-1.3  -> tower 2-2.5x over the warrior.
  - Bushes (128px) at ~0.75-0.95          -> chest-height thickets.
  - Rocks  (64px)  at ~0.8-1.4            -> knee-to-waist boulders.
  - Sheep  (128px frame) at ~0.8-0.95     -> clearly smaller than the warrior.
  - Stumps (192x256) at ~0.45             -> low cut stumps.

All asset dirs / frame metadata mirror exactly what region_8.json uses, so the
existing preloader & GameScene renderer handle them unchanged.
"""
import json, math

# ---- deterministic RNG (no Math.random / time, fully reproducible) ----------
class RNG:
    def __init__(self, seed): self.s = seed & 0xFFFFFFFF
    def next(self):
        # xorshift32
        x = self.s
        x ^= (x << 13) & 0xFFFFFFFF
        x ^= (x >> 17)
        x ^= (x << 5) & 0xFFFFFFFF
        self.s = x & 0xFFFFFFFF
        return self.s / 0xFFFFFFFF
    def rng(self, a, b): return a + (b - a) * self.next()
    def pick(self, seq): return seq[int(self.next() * len(seq)) % len(seq)]
    def chance(self, p): return self.next() < p

R = RNG(990099)

WORLD_W, WORLD_H = 3200, 2000
TS = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)"

sprites = []
_id = 0
def sid():
    global _id; _id += 1
    return f"s_region9_{_id:04d}"

# ---- geometry of the composition --------------------------------------------
SPAWN  = (300, 1000); SPAWN_R = 330      # left entry glade
GLADE  = (2560, 1010); GLADE_R = 480     # boss glade
RIVER_X0 = 1320                          # river centerline base x
FORD_Y = 1000                            # the shallow crossing in the valley

def river_x(y):   return RIVER_X0 + 75 * math.sin(y / 255.0)   # meander
def valley_top(x):    return 645 + 55 * math.sin(x / 410.0)     # forest -> valley
def valley_bottom(x): return 1380 - 55 * math.sin(x / 360.0 + 1.1)

def d(ax, ay, bx, by): return math.hypot(ax - bx, ay - by)

def in_spawn(x, y):  return d(x, y, *SPAWN) < SPAWN_R
def in_glade(x, y):  return d(x, y, *GLADE) < GLADE_R
def in_valley(x, y): return valley_top(x) < y < valley_bottom(x)
def near_river(x, y, pad):
    return abs(x - river_x(y)) < pad and -40 < y < WORLD_H + 40

def open_ground(x, y):
    """Walkable / clear of forest: valley OR spawn OR glade (river is fordable)."""
    return in_valley(x, y) or in_spawn(x, y) or in_glade(x, y)

# ---- sprite emitters ---------------------------------------------------------
def add_tree(x, y, scale, tall=False):
    name = R.pick(["Tree1", "Tree2"]) if tall else R.pick(["Tree3", "Tree4"])
    fh = 256 if tall else 192
    sprites.append({
        "type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Resources/Wood/Trees",
        "frames": [f"{name}.png"], "name": name, "animated": True,
        "spriteLayer": "below",
        "x": x, "y": y, "scaleX": scale, "scaleY": scale,
        "offsetX": 96, "offsetY": fh // 2,
        "frameW": 192, "frameH": fh, "frameCount": 8, "frameRow": 0,
    })

def add_bush(x, y, scale):
    name = R.pick(["Bushe1", "Bushe2", "Bushe3", "Bushe4"])
    sprites.append({
        "type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Decorations/Bushes",
        "frames": [f"{name}.png"], "name": name, "animated": True,
        "spriteLayer": "below",
        "x": x, "y": y, "scaleX": scale, "scaleY": scale,
        "offsetX": 64, "offsetY": 64,
        "frameW": 128, "frameH": 128, "frameCount": 8, "frameRow": 0,
    })

def add_rock(x, y, scale):
    name = R.pick(["Rock1", "Rock2", "Rock3", "Rock4"])
    sprites.append({
        "type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Decorations/Rocks",
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below",
        "x": x, "y": y, "scaleX": scale, "scaleY": scale,
        "offsetX": 32, "offsetY": 32,
    })

def add_gold_stone(x, y, scale):
    n = int(R.rng(1, 7))
    name = f"Gold Stone {n}"
    sprites.append({
        "type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Resources/Gold/Gold Stones",
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below",
        "x": x, "y": y, "scaleX": scale, "scaleY": scale,
        "offsetX": 64, "offsetY": 64,
    })

def add_stump(x, y, scale):
    n = int(R.rng(1, 5))
    name = f"Stump {n}"
    sprites.append({
        "type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Resources/Wood/Trees",
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below",
        "x": x, "y": y, "scaleX": scale, "scaleY": scale,
        "offsetX": 96, "offsetY": 128,
    })

def add_sheep(x, y, scale):
    sprites.append({
        "type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Resources/Meat/Sheep",
        "frames": ["Sheep_Grass.png"], "name": "Sheep_Grass", "animated": True,
        "spriteLayer": "below",
        "x": x, "y": y, "scaleX": scale, "scaleY": scale,
        "offsetX": 64, "offsetY": 64,
        "frameW": 128, "frameH": 128, "frameCount": 12, "frameRow": 0,
    })

def add_water_rock(x, y):
    n = int(R.rng(1, 5))
    name = f"Water Rocks_0{n}"
    sprites.append({
        "type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Decorations/Rocks in the Water",
        "frames": [f"{name}.png"], "name": name, "animated": True,
        "spriteLayer": "below",
        "x": x, "y": y, "scaleX": 1, "scaleY": 1,
        "offsetX": 32, "offsetY": 32,
        "frameW": 64, "frameH": 64, "frameCount": 16, "frameRow": 0,
    })

def add_water_splash(x, y):
    sprites.append({
        "type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Particle FX",
        "frames": ["Water Splash.png"], "name": "Water Splash", "animated": True,
        "spriteLayer": "below",
        "x": x, "y": y, "scaleX": 1, "scaleY": 1,
        "offsetX": 96, "offsetY": 96,
        "frameW": 192, "frameH": 192, "frameCount": 9, "frameRow": 0,
    })

def add_duck(x, y):
    sprites.append({
        "type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Decorations/Rubber Duck",
        "frames": ["Rubber duck.png"], "name": "Rubber duck", "animated": True,
        "spriteLayer": "below",
        "x": x, "y": y, "scaleX": 1, "scaleY": 1,
        "offsetX": 16, "offsetY": 16,
        "frameW": 32, "frameH": 32, "frameCount": 3, "frameRow": 0,
    })

def add_cloud(x, y, scale):
    frames = [f"Clouds_0{i}.png" for i in range(1, 9)]
    sprites.append({
        "type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Decorations/Clouds",
        "frames": frames, "name": "Clouds", "animated": True,
        "spriteLayer": "below",
        "x": x, "y": y, "scaleX": scale, "scaleY": scale,
        "offsetX": 288, "offsetY": 128,
    })

SMOKE_FRAMES = ["s1_1.png","s2_1.png","s3_1.png","s4_1.png","s1_2.png","s2_2.png",
    "s3_2.png","s4_2.png","s1_3.png","s2_3.png","s3_3.png","s4_3.png","s1_4.png",
    "s2_4.png","s3_4.png","s4_4.png","s1_5.png","s2_5.png","s3_5.png","s4_5.png",
    "s1_6.png","s3_6.png","s4_6.png","s1_7.png","s3_7.png","s3_8.png","s3_9.png"]
def add_smoke(x, y, scale):
    sprites.append({
        "type": "sprite", "spriteId": sid(),
        "dir": "assets3/vfx/smoke",
        "frames": SMOKE_FRAMES, "name": "smoke", "animated": True,
        "spriteLayer": "below",
        "x": x, "y": y, "scaleX": scale, "scaleY": scale,
        "offsetX": 64, "offsetY": 64,
    })

# =============================================================================
# 1) FOREST  — jittered grid of trees everywhere the ground is NOT open.
# =============================================================================
STEP = 86
y = -120
while y < WORLD_H + 140:
    row = 0
    x = -160
    # stagger alternate rows for an organic (non-grid) look
    offset = (STEP / 2) if (int((y + 200) / STEP) % 2) else 0
    while x < WORLD_W + 200:
        jx = x + offset + R.rng(-30, 30)
        jy = y + R.rng(-30, 30)

        if near_river(jx, jy, 120):          # keep the river channel clear
            x += STEP; continue
        if open_ground(jx, jy):              # leave valley/spawn/glade open
            x += STEP; continue

        # distance from the valley edge -> denser, slightly bigger treeline
        edge = min(abs(jy - valley_top(jx)), abs(jy - valley_bottom(jx)))
        treeline = edge < 120 and -50 < jy < WORLD_H + 50

        # thin the deep-forest fill a touch so it isn't a solid wall
        deep = jy < 380 or jy > WORLD_H - 360 or jx < 240 or jx > WORLD_W - 240
        if not treeline and not deep and R.chance(0.18):
            x += STEP; continue

        tall = R.chance(0.30)
        if treeline:
            scale = R.rng(1.12, 1.34)
        elif deep:
            scale = R.rng(1.05, 1.28)
        else:
            scale = R.rng(0.95, 1.18)
        if tall: scale *= 0.86            # 256px trees read tall already
        add_tree(jx, jy, round(scale, 3), tall=tall)
        x += STEP
    y += STEP

# A few lone sentinel trees standing inside the valley (away from the central
# lane at y~1000) to break up the open space without blocking movement.
for _ in range(26):
    x = R.rng(360, WORLD_W - 360)
    top, bot = valley_top(x), valley_bottom(x)
    # bias toward the valley fringes, not the central travel lane
    if R.chance(0.5): yv = R.rng(top + 20, top + 130)
    else:             yv = R.rng(bot - 130, bot - 20)
    if near_river(x, yv, 150) or in_spawn(x, yv) or in_glade(x, yv): continue
    add_tree(x, yv, round(R.rng(1.0, 1.2), 3), tall=R.chance(0.4))

# =============================================================================
# 2) RIVER  — painted stroke + a meandering bank, with water decorations.
# =============================================================================
river_pts = []
yy = -60
while yy < WORLD_H + 60:
    river_pts.extend([round(river_x(yy), 2), round(yy, 2)])
    yy += 26
sprites.append({
    "type": "stroke", "stroke": "#2f8fd6", "strokeWidth": 116,
    "lineCap": "round", "lineJoin": "round", "composite": "source-over",
    "points": river_pts,
})
# lighter inner current highlight
inner = []
yy = -60
while yy < WORLD_H + 60:
    inner.extend([round(river_x(yy), 2), round(yy, 2)])
    yy += 26
sprites.append({
    "type": "stroke", "stroke": "#6fc3ec", "strokeWidth": 54,
    "lineCap": "round", "lineJoin": "round", "composite": "source-over",
    "points": inner,
})

# water rocks scattered down the river; cluster a stepping-stone ford at FORD_Y
for yv in range(40, WORLD_H, 150):
    rx = river_x(yv)
    add_water_rock(rx + R.rng(-34, 34), yv + R.rng(-20, 20))
    if R.chance(0.4):
        add_water_rock(rx + R.rng(-46, 46), yv + R.rng(-40, 40))
# the ford: dense flat stones the player visually steps across
for off in (-60, -28, 4, 34, 64):
    add_water_rock(river_x(FORD_Y + off) + R.rng(-8, 8), FORD_Y + off)
add_water_splash(river_x(FORD_Y - 90), FORD_Y - 90)
add_water_splash(river_x(FORD_Y + 110), FORD_Y + 110)
# two ducks bobbing downstream (a wink to region 8)
add_duck(river_x(560) + 18, 560)
add_duck(river_x(1640) - 22, 1640)

# =============================================================================
# 3) BOSS GLADE  — clear centre, boulder/gold ring (stone-demon lair).
# =============================================================================
gx, gy = GLADE
# inner scatter of mossy boulders & gold-veined stones
for _ in range(22):
    ang = R.rng(0, math.tau)
    rad = R.rng(120, GLADE_R - 70)
    x = gx + math.cos(ang) * rad
    yv = gy + math.sin(ang) * rad * 0.82
    if R.chance(0.62): add_rock(x, yv, round(R.rng(0.9, 1.5), 3))
    else:              add_gold_stone(x, yv, round(R.rng(0.75, 1.05), 3))
# a heavier boulder crown along the far (right) rim, framing the boss
for _ in range(10):
    ang = R.rng(-0.9, 0.9)
    x = gx + math.cos(ang) * (GLADE_R - 30)
    yv = gy + math.sin(ang) * (GLADE_R - 30)
    add_rock(x, yv, round(R.rng(1.2, 1.6), 3))
# mystic vapor curling up from the lair
add_smoke(gx - 150, gy - 120, 1.1)
add_smoke(gx + 90, gy + 150, 1.25)

# =============================================================================
# 4) DECORATIVE LIFE  — bush thickets, stumps, a grazing flock, ground rocks.
# =============================================================================
# bush thickets hugging the valley treeline (both banks, full length)
for x in range(280, WORLD_W - 280, 70):
    if near_river(x, valley_top(x), 150): continue
    if R.chance(0.55):
        yv = valley_top(x) + R.rng(8, 46)
        if not in_glade(x, yv) and not in_spawn(x, yv):
            add_bush(x + R.rng(-16, 16), yv, round(R.rng(0.75, 0.95), 3))
    if R.chance(0.55):
        yv = valley_bottom(x) - R.rng(8, 46)
        if not in_glade(x, yv) and not in_spawn(x, yv):
            add_bush(x + R.rng(-16, 16), yv, round(R.rng(0.75, 0.95), 3))

# loose ground rocks scattered through the valley floor (small, walk-around)
for _ in range(34):
    x = R.rng(360, WORLD_W - 360)
    top, bot = valley_top(x), valley_bottom(x)
    yv = R.rng(top + 60, bot - 60)
    if near_river(x, yv, 130) or in_glade(x, yv): continue
    add_rock(x, yv, round(R.rng(0.7, 1.15), 3))

# weathered stumps tucked at the forest fringe
for _ in range(9):
    x = R.rng(300, WORLD_W - 300)
    yv = R.pick([valley_top(x) + R.rng(20, 70), valley_bottom(x) - R.rng(20, 70)])
    if near_river(x, yv, 150) or in_glade(x, yv): continue
    add_stump(x, yv, round(R.rng(0.4, 0.5), 3))

# a grazing sheep flock in a quiet side-meadow (upper-left valley)
flock = (760, 800)
for _ in range(5):
    add_sheep(flock[0] + R.rng(-130, 130), flock[1] + R.rng(-70, 70),
              round(R.rng(0.8, 0.95), 3))

# drifting cloud shadows for depth & atmosphere
for cx, cy, cs in [(620, 300, 0.85), (1500, 250, 1.0), (2300, 330, 0.9),
                   (2700, 1650, 0.85), (1100, 1720, 0.8)]:
    add_cloud(cx + R.rng(-40, 40), cy + R.rng(-30, 30), cs)

# =============================================================================
# 5) GAMEPLAY  — no-walk collision, enemies, boss, npcs, portals.
# =============================================================================
# Collision: forest bands + edges. The valley & a fordable river gap stay open.
noWalkZones = [
    # top forest band
    {"id": "z9_top",   "x": -60,            "y": -80,  "w": WORLD_W + 120, "h": 700},
    # bottom forest band
    {"id": "z9_bot",   "x": -60,            "y": 1395, "w": WORLD_W + 120, "h": 685},
    # left edge wall (spawn gap is at x>=180, y~1000)
    {"id": "z9_left",  "x": -60,            "y": 600,  "w": 200,           "h": 360},
    {"id": "z9_left2", "x": -60,            "y": 1060, "w": 200,           "h": 360},
    # right edge wall behind the glade
    {"id": "z9_right", "x": WORLD_W - 110,  "y": 600,  "w": 170,           "h": 820},
]

# Enemy progression left -> right toward the boss (types proven in region_8).
enemies = [
    {"id": "e9_01", "type": "bat",    "x": 560,  "y": 880},
    {"id": "e9_02", "type": "bat",    "x": 660,  "y": 1080},
    {"id": "e9_03", "type": "rat",    "x": 880,  "y": 980},
    {"id": "e9_04", "type": "melee",  "x": 1050, "y": 880},
    {"id": "e9_05", "type": "melee",  "x": 1120, "y": 1090},
    {"id": "e9_06", "type": "ranged", "x": 1500, "y": 920},
    {"id": "e9_07", "type": "ranged", "x": 1560, "y": 1080},
    {"id": "e9_08", "type": "melee",  "x": 1950, "y": 940},
    {"id": "e9_09", "type": "melee",  "x": 2030, "y": 1090},
    {"id": "e9_10", "type": "rat",    "x": 2080, "y": 860},
    {"id": "e9_11", "type": "ranged", "x": 2260, "y": 1010},
]

boss = {"key": "pashana_daitya", "x": GLADE[0] + 70, "y": GLADE[1]}

npcs = [
    {"id": "npc9_guide", "type": "yellow", "x": 250, "y": 880, "config": {
        "id": "npc9_guide", "name": "Old Quarryman",
        "first": "Beyond_the_ford_the_stones_breathe...the_Pashana_Daitya_woke_when_the_river_turned_grey.._turn_back_while_you_still_cast_a_shadow.",
        "active": "", "completed": ""}},
    {"id": "npc9_pilgrim", "type": "blue", "x": 430, "y": 1180, "config": {
        "id": "npc9_pilgrim", "name": "Lost Pilgrim",
        "first": "I_followed_the_ducks_downstream_and_found_only_gold_that_bleeds...take_the_north_meadow_path_past_the_sheep.",
        "active": "", "completed": ""}},
]

portals = [
    {"id": "portal9_back", "targetRegion": 8, "x": 60, "y": 1000},
]

# =============================================================================
out = {
    "version": 1,
    "regionName": "Shilavana — The Vale of Stones",
    "background": {"type": "color", "value": "#23682a"},
    "sprites": sprites,
    "noWalkZones": noWalkZones,
    "enemies": enemies,
    "boss": boss,
    "npcs": npcs,
    "portals": portals,
    "regionIndex": 9,
}

with open("regions/region_9.json", "w") as f:
    json.dump(out, f, indent=1)

# ---- summary ----------------------------------------------------------------
from collections import Counter
names = Counter(s["name"] for s in sprites if s["type"] == "sprite")
print("Region 9 written -> regions/region_9.json")
print(f"  sprites total : {len(sprites)} "
      f"({sum(1 for s in sprites if s['type']=='sprite')} images, "
      f"{sum(1 for s in sprites if s['type']=='stroke')} strokes)")
print(f"  enemies={len(enemies)}  npcs={len(npcs)}  zones={len(noWalkZones)}  "
      f"boss={boss['key']}")
print("  asset breakdown:")
for n, c in names.most_common():
    print(f"    {c:4d}  {n}")
