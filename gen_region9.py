#!/usr/bin/env python3
"""
Region 9 — "Shilavana, The Vale of Stones".

REBUILT for performance: the first version used ~770 animated Tiny-Swords
spritesheets (every tree/bush animating every frame), which froze the boss
arena. This version follows the proven lightweight pattern of regions 0 & 7:
almost everything is a STATIC single image (craftpix trees + cropped bushes +
static rocks), with only a handful of small animated water accents. Same
composition (framed valley, river + ford, stone-demon glade, sheep meadow),
far lighter to render.

Scale calibrated to the warrior (Dhruva, 192px frame @1.0, visible body ~100px):
  - canopy trees (~250-276px) @0.75-1.15  -> tower ~2-2.5x over the warrior
  - cropped bushes (~80px)     @0.8-1.1    -> chest-height thickets
  - rocks (64px)               @0.8-1.5    -> knee-to-waist boulders
  - sheep (64px)               @0.9-1.1    -> smaller than the warrior
  - stumps (192x256)           @0.42       -> low cut stumps
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

R = RNG(770099)

WORLD_W, WORLD_H = 3200, 2000
TS = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)"
CRAFT = "craftpix-net-168228-free-tree-pixel-art-asset-pack/trees"

# asset dimensions (w, h) for origin calc
DIM = {
    "middle_lane_tree2": (208, 269), "middle_lane_tree3": (187, 257),
    "middle_lane_tree4": (156, 276), "middle_lane_tree5": (199, 247),
    "Tree2_crop": (138, 239),
    "middle_lane_tree6": (81, 76),   "middle_lane_tree7": (73, 81),
    "middle_lane_tree10": (27, 70),  "middle_lane_tree11": (28, 92),
    "Bushe1_crop": (80, 73), "Bushe2_crop": (77, 51),
    "Bushe3_crop": (96, 89), "Bushe4_crop": (77, 67),
    "Sheep_Idle_crop": (64, 59),
}
CANOPY = ["middle_lane_tree2", "middle_lane_tree3", "middle_lane_tree4",
          "middle_lane_tree5", "Tree2_crop"]
SHRUB  = ["middle_lane_tree6", "middle_lane_tree7"]
TUFT   = ["middle_lane_tree10", "middle_lane_tree11"]
BUSHES = ["Bushe1_crop", "Bushe2_crop", "Bushe3_crop", "Bushe4_crop"]

sprites = []
_id = 0
def sid():
    global _id; _id += 1
    return f"s_region9_{_id:04d}"

def img(dir_, name, x, y, scale, layer="below"):
    """Static single-image sprite (no animation) — the cheap path."""
    w, h = DIM.get(name, (64, 64))
    sprites.append({
        "type": "sprite", "spriteId": sid(), "dir": dir_,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": layer, "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": round(w / 2, 1), "offsetY": round(h / 2, 1),
    })

def tree(x, y, scale, kind=None):
    name = kind or R.pick(CANOPY)
    img(CRAFT if name.startswith("middle") else "cropped", name, x, y, scale)

def bush(x, y, scale):  img("cropped", R.pick(BUSHES), x, y, scale)
def sheep(x, y, scale): img("cropped", "Sheep_Idle_crop", x, y, scale)

def rock(x, y, scale):
    sprites.append({"type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Decorations/Rocks", "frames": ["Rock4.png"],
        "name": "Rock4", "animated": False, "spriteLayer": "below",
        "x": round(x, 2), "y": round(y, 2), "scaleX": round(scale, 3),
        "scaleY": round(scale, 3), "offsetX": 32, "offsetY": 32})

def gold(x, y, scale):
    n = int(R.rng(1, 7))
    sprites.append({"type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Resources/Gold/Gold Stones",
        "frames": [f"Gold Stone {n}.png"], "name": f"Gold Stone {n}",
        "animated": False, "spriteLayer": "below", "x": round(x, 2),
        "y": round(y, 2), "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": 64, "offsetY": 64})

def stump(x, y, scale):
    sprites.append({"type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Resources/Wood/Trees", "frames": ["Stump 4.png"],
        "name": "Stump 4", "animated": False, "spriteLayer": "below",
        "x": round(x, 2), "y": round(y, 2), "scaleX": round(scale, 3),
        "scaleY": round(scale, 3), "offsetX": 96, "offsetY": 128})

def cloud(x, y, scale):
    sprites.append({"type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Decorations/Clouds", "frames": ["Clouds_01.png"],
        "name": "Clouds_01", "animated": False, "spriteLayer": "below",
        "x": round(x, 2), "y": round(y, 2), "scaleX": round(scale, 3),
        "scaleY": round(scale, 3), "offsetX": 288, "offsetY": 128})

# small animated water accents — the ONLY animated sprites (kept < 20)
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

def duck(x, y):
    sprites.append({"type": "sprite", "spriteId": sid(),
        "dir": f"{TS}/Terrain/Decorations/Rubber Duck", "frames": ["Rubber duck.png"],
        "name": "Rubber duck", "animated": True, "spriteLayer": "below",
        "x": round(x, 2), "y": round(y, 2), "scaleX": 1, "scaleY": 1, "offsetX": 16,
        "offsetY": 16, "frameW": 32, "frameH": 32, "frameCount": 3, "frameRow": 0})

# ---- composition geometry ----------------------------------------------------
SPAWN = (300, 1000); SPAWN_R = 330
GLADE = (2560, 1010); GLADE_R = 470
RIVER_X0 = 1320; FORD_Y = 1000

def river_x(y):       return RIVER_X0 + 75 * math.sin(y / 255.0)
def valley_top(x):    return 660 + 55 * math.sin(x / 410.0)
def valley_bottom(x): return 1370 - 55 * math.sin(x / 360.0 + 1.1)
def dist(ax, ay, bx, by): return math.hypot(ax - bx, ay - by)
def in_spawn(x, y):  return dist(x, y, *SPAWN) < SPAWN_R
def in_glade(x, y):  return dist(x, y, *GLADE) < GLADE_R
def in_valley(x, y): return valley_top(x) < y < valley_bottom(x)
def near_river(x, y, pad): return abs(x - river_x(y)) < pad and -40 < y < WORLD_H + 40
def open_ground(x, y): return in_valley(x, y) or in_spawn(x, y) or in_glade(x, y)

# =============================================================================
# 1) FOREST — static craftpix trees on a jittered grid outside the valley.
# =============================================================================
STEP = 116
y = -120
while y < WORLD_H + 140:
    offset = (STEP / 2) if (int((y + 200) / STEP) % 2) else 0
    x = -160
    while x < WORLD_W + 200:
        jx = x + offset + R.rng(-34, 34); jy = y + R.rng(-34, 34)
        if near_river(jx, jy, 120) or open_ground(jx, jy):
            x += STEP; continue
        edge = min(abs(jy - valley_top(jx)), abs(jy - valley_bottom(jx)))
        treeline = edge < 130 and -50 < jy < WORLD_H + 50
        deep = jy < 360 or jy > WORLD_H - 340 or jx < 240 or jx > WORLD_W - 240
        if not treeline and not deep and R.chance(0.22):
            x += STEP; continue
        scale = R.rng(0.95, 1.18) if (treeline or deep) else R.rng(0.78, 1.05)
        tree(jx, jy, scale)
        # occasional understory shrub / grass tuft tucked beside a tree
        if R.chance(0.18): tree(jx + R.rng(-40, 40), jy + R.rng(30, 60), R.rng(0.7, 1.0), kind=R.pick(SHRUB))
        if R.chance(0.12): tree(jx + R.rng(-50, 50), jy + R.rng(36, 70), R.rng(0.8, 1.2), kind=R.pick(TUFT))
        x += STEP
    y += STEP

# lone sentinel trees inside the valley fringes (off the central lane)
for _ in range(22):
    x = R.rng(360, WORLD_W - 360); top, bot = valley_top(x), valley_bottom(x)
    yv = R.rng(top + 18, top + 120) if R.chance(0.5) else R.rng(bot - 120, bot - 18)
    if near_river(x, yv, 150) or in_spawn(x, yv) or in_glade(x, yv): continue
    tree(x, yv, R.rng(0.8, 1.05))

# =============================================================================
# 2) RIVER — painted strokes + a few animated water accents.
# =============================================================================
def stroke(color, width):
    pts = []; yy = -60
    while yy < WORLD_H + 60:
        pts.extend([round(river_x(yy), 2), round(yy, 2)]); yy += 26
    sprites.append({"type": "stroke", "stroke": color, "strokeWidth": width,
        "lineCap": "round", "lineJoin": "round", "composite": "source-over",
        "points": pts})
stroke("#2f8fd6", 116)
stroke("#6fc3ec", 54)

for yv in range(60, WORLD_H, 230):           # sparse water rocks (animated, few)
    water_rock(river_x(yv) + R.rng(-30, 30), yv + R.rng(-18, 18))
for off in (-55, -18, 20, 56):               # the ford stepping stones
    water_rock(river_x(FORD_Y + off) + R.rng(-8, 8), FORD_Y + off)
water_splash(river_x(FORD_Y - 95), FORD_Y - 95)
water_splash(river_x(FORD_Y + 110), FORD_Y + 110)
duck(river_x(560) + 18, 560)
duck(river_x(1640) - 22, 1640)

# =============================================================================
# 3) BOSS GLADE — clear centre, static boulder + gold-stone ring.
# =============================================================================
gx, gy = GLADE
for _ in range(20):
    ang = R.rng(0, math.tau); rad = R.rng(120, GLADE_R - 70)
    x = gx + math.cos(ang) * rad; yv = gy + math.sin(ang) * rad * 0.8
    if not (660 < yv < 1370): continue
    (rock(x, yv, R.rng(0.9, 1.5)) if R.chance(0.6) else gold(x, yv, R.rng(0.75, 1.05)))
for _ in range(8):                            # heavier boulder crown on the right rim
    ang = R.rng(-0.85, 0.85)
    x = gx + math.cos(ang) * (GLADE_R - 30); yv = gy + math.sin(ang) * (GLADE_R - 30) * 0.8
    rock(x, yv, R.rng(1.2, 1.6))

# =============================================================================
# 4) DECORATIVE LIFE — cropped bushes, rocks, stumps, sheep flock, clouds.
# =============================================================================
for x in range(280, WORLD_W - 280, 78):       # bush thickets along both banks
    for edge_y in (valley_top(x) + R.rng(8, 44), valley_bottom(x) - R.rng(8, 44)):
        if R.chance(0.5) and not near_river(x, edge_y, 150) \
           and not in_glade(x, edge_y) and not in_spawn(x, edge_y):
            bush(x + R.rng(-16, 16), edge_y, R.rng(0.8, 1.1))

for _ in range(30):                            # loose ground rocks in the valley
    x = R.rng(360, WORLD_W - 360); top, bot = valley_top(x), valley_bottom(x)
    yv = R.rng(top + 60, bot - 60)
    if near_river(x, yv, 130) or in_glade(x, yv): continue
    rock(x, yv, R.rng(0.7, 1.15))

for _ in range(8):                             # weathered stumps at the fringe
    x = R.rng(300, WORLD_W - 300)
    yv = R.pick([valley_top(x) + R.rng(20, 64), valley_bottom(x) - R.rng(20, 64)])
    if near_river(x, yv, 150) or in_glade(x, yv): continue
    stump(x, yv, R.rng(0.4, 0.46))

for _ in range(5):                             # grazing sheep flock (side-meadow)
    sheep(760 + R.rng(-130, 130), 800 + R.rng(-70, 70), R.rng(0.9, 1.1))

for cx, cy, cs in [(620, 300, 0.85), (1500, 250, 1.0), (2300, 330, 0.9),
                   (2700, 1650, 0.85), (1100, 1720, 0.8)]:
    cloud(cx + R.rng(-40, 40), cy + R.rng(-30, 30), cs)

# =============================================================================
# 5) GAMEPLAY — collision, enemies, boss, npcs, portals.
# =============================================================================
noWalkZones = [
    {"id": "z9_top",   "x": -60, "y": -80,  "w": WORLD_W + 120, "h": 715},
    {"id": "z9_bot",   "x": -60, "y": 1375, "w": WORLD_W + 120, "h": 705},
    {"id": "z9_left",  "x": -60, "y": 600,  "w": 200, "h": 360},
    {"id": "z9_left2", "x": -60, "y": 1060, "w": 200, "h": 360},
    {"id": "z9_right", "x": WORLD_W - 110, "y": 600, "w": 170, "h": 820},
]
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
portals = [{"id": "portal9_back", "targetRegion": 8, "x": 60, "y": 1000}]

out = {
    "version": 1, "regionName": "Stone Vale", "regionSubtitle": "Shilavana",
    "background": {"type": "color", "value": "#23682a"},
    "sprites": sprites, "noWalkZones": noWalkZones, "enemies": enemies,
    "boss": boss, "npcs": npcs, "portals": portals, "regionIndex": 9,
}
with open("regions/region_9.json", "w") as f:
    json.dump(out, f, indent=1)

from collections import Counter
img_sprites = [s for s in sprites if s["type"] == "sprite"]
animated = [s for s in img_sprites if s.get("frameCount", 0) and s["frameCount"] > 1]
print("Region 9 rebuilt (lightweight) -> regions/region_9.json")
print(f"  sprites: {len(sprites)} ({len(img_sprites)} images, "
      f"{len(sprites)-len(img_sprites)} strokes)")
print(f"  ANIMATED spritesheets: {len(animated)}  (was ~770; target <20)")
print(f"  enemies={len(enemies)} npcs={len(npcs)} zones={len(noWalkZones)} boss={boss['key']}")
for n, c in Counter(s["name"] for s in img_sprites).most_common():
    print(f"    {c:4d}  {n}")
