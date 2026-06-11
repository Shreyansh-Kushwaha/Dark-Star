#!/usr/bin/env python3
"""
Region 11 — "Setubandha, The Broken Bridge Town".

The first new region of the open-world design: a stone trade-town on the lip of
the first great severance-chasm. A colossal stone bridge once crossed the rift
to the lands beyond — but it SNAPPED the night the Akhand Sutra was cut, and
now ends in a jagged gap over the void. The town survives as a crossroads:
merchants in market tents, a bridgekeeper's tower, and a roped cargo-LIFT that
descends into the Sunless Deep (the only way onward now that the bridge is out).

Follows the proven lightweight pattern of regions 0/7/9/10: almost everything is
a STATIC single image; only a campfire and a few flags animate (<10 animated).
All standing objects are BASE-anchored (origin = foot) because the engine sorts
sprite depth by placement-y (GameScene depth = y-1), so feet-on-ground gives
correct occlusion against the warrior.

Scale calibrated to the warrior (Dhruva, 192px frame @1.0, visible body ~100px):
  - houses (128x192) @1.15-1.35   -> ~2-2.4x the warrior (believable cottages)
  - tower  (128x256) @1.25        -> a landmark watchtower
  - castle/trade-hall (320x256) @1.0
  - market tents (~70px) @1.5-1.9 -> chest-to-head stalls
  - crates (~22px) @1.8-2.6, street lamps (~35px) @2.8-3.4 (man-height)
  - bridge deck (custom 160x120) @1.35 -> a ~2-person-wide span
"""
import json, math, os
from PIL import Image

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

R = RNG(110011)
WORLD_W, WORLD_H = 3200, 2000
CY = 1000

TS    = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)"
CRAFT = "craftpix-net-168228-free-tree-pixel-art-asset-pack/trees"
DECOR = "assest4/map_objects/2 Objects/7 Decor"
CAMP  = "assest4/map_objects/2 Objects/8 Camp"
FENCE = "assest4/map_objects/2 Objects/2 Fence"
N2BOX = "assest4/next2/2 Objects/4 Box"
N2DEC = "assest4/next2/2 Objects/3 Decor"
N2TNT = "assest4/next2/2 Objects/6 Tent"
N2GRS = "assest4/next2/2 Objects/5 Grass"
STRUCT = "assets_custom/structures"
BLD   = f"{TS}/Buildings/Blue Buildings"
ROCKS = f"{TS}/Terrain/Decorations/Rocks"

# ---- real pixel dimensions, read straight from the PNGs (exact origins) ------
_dimcache = {}
def dim(dir_, frame):
    key = dir_ + "/" + frame
    if key not in _dimcache:
        with Image.open(key) as im:
            _dimcache[key] = im.size
    return _dimcache[key]

sprites = []
_id = 0
def sid():
    global _id; _id += 1
    return f"s_region11_{_id:04d}"

def add(dir_, frame, x, y, scale, anchor="base", layer="below",
        animated=False, frames=None):
    w, h = dim(dir_, frame)
    ox = w / 2.0
    oy = (h - 1) if anchor == "base" else h / 2.0
    sp = {"type": "sprite", "spriteId": sid(), "dir": dir_,
          "frames": frames or [frame], "name": frame[:-4], "animated": animated,
          "spriteLayer": layer, "x": round(x, 2), "y": round(y, 2),
          "scaleX": round(scale, 3), "scaleY": round(scale, 3),
          "offsetX": round(ox, 1), "offsetY": round(oy, 1)}
    sprites.append(sp)
    return sp

# ---- typed helpers -----------------------------------------------------------
footprints = []   # building collision rects (x,y,w,h)

def building(frame, x, y, scale, foot_w=0.55, foot_h=70):
    add(BLD, frame, x, y, scale, anchor="base")
    w, h = dim(BLD, frame)
    fw = w * scale * foot_w
    footprints.append({"x": x - fw / 2, "y": y - foot_h, "w": fw, "h": foot_h})

def house(x, y, s=1.22): building(R.pick(["House1.png","House2.png","House3.png"]), x, y, s)
def tower(x, y, s=1.25): building("Tower.png", x, y, s, foot_w=0.5, foot_h=80)
def tradehall(x, y, s=1.0): building("Castle.png", x, y, s, foot_w=0.6, foot_h=90)
def temple(x, y, s=0.95): building("Monastery.png", x, y, s, foot_w=0.5, foot_h=90)
def garrison(x, y, s=1.0): building("Barracks.png", x, y, s, foot_w=0.55, foot_h=80)

def tent(x, y, s):   add(N2TNT, R.pick(["1.png","2.png","3.png","4.png"]), x, y, s)
def crate(x, y, s):  add(N2BOX, R.pick(["1.png","2.png","3.png","4.png","5.png"]), x, y, s)
def barrel(x, y, s): add(N2DEC, R.pick(["8.png","9.png","10.png","11.png"]), x, y, s)
def potpile(x, y, s):add(N2DEC, R.pick(["1.png","2.png","13.png"]), x, y, s)
def lamp(x, y, s=3.0): add(DECOR, R.pick(["Lamp1.png","Lamp2.png","Lamp3.png"]), x, y, s)
def logbench(x, y, s=1.7): add(DECOR, R.pick(["Log1.png","Log2.png","Log3.png"]), x, y, s)
def fence(x, y, s=2.0): add(FENCE, R.pick(["1.png","2.png","3.png","4.png","8.png"]), x, y, s)
def sign(x, y, s=2.4): add("assest4/map_objects/2 Objects/3 Pointer", "1.png", x, y, s)
def grass(x, y, s):  add(N2GRS, R.pick(["1.png","2.png","3.png","4.png","5.png","6.png"]), x, y, s)
def dirt(x, y, s):   add(DECOR, R.pick(["Dirt1.png","Dirt2.png","Dirt3.png","Dirt6.png"]), x, y, s, anchor="center")
def rock(x, y, s):   add(ROCKS, f"Rock{int(R.rng(1,5))}.png", x, y, s)
def bush(x, y, s):   add("cropped", R.pick(["Bushe1_crop.png","Bushe2_crop.png","Bushe3_crop.png","Bushe4_crop.png"]), x, y, s)
def tree(x, y, s):   add(CRAFT, R.pick(["middle_lane_tree2.png","middle_lane_tree3.png","middle_lane_tree4.png","middle_lane_tree5.png"]), x, y, s)

def deck(x, s=1.35):       add(STRUCT, "bridge_deck.png", x, CY, s, anchor="center")
def break_r(x, s=1.35):    add(STRUCT, "bridge_break_r.png", x, CY, s, anchor="center")
def break_l(x, s=1.35):    add(STRUCT, "bridge_break_l.png", x, CY, s, anchor="center")
def rubble(x, y, s=1.3):   add(STRUCT, "bridge_rubble.png", x, y, s, anchor="center")
def lift(x, y, s=1.18):    add(STRUCT, "lift_platform.png", x, y, s, anchor="base")

def campfire(x, y, s=1.6):
    add("assest4/map_objects/3 Animated Objects/2 Campfire", "1.png", x, y, s,
        animated=True, frames=["1.png","2.png"])
def flag(x, y, s=1.5):
    add("assest4/map_objects/3 Animated Objects/1 Flag", "1.png", x, y, s,
        anchor="base", animated=True, frames=["1.png","2.png","3.png","4.png","5.png"])

# ---- geometry ----------------------------------------------------------------
SPAWN = (380, CY)
RIM_X = 1420                 # west lip of the chasm (town ends here)
def rift_x(y): return 1700 + 40 * math.sin(y / 260.0)   # rift centreline meander
ROAD = [(180, 1000), (430, 990), (700, 1008), (1000, 1000), (1300, 1000), (1400, 1000)]
SROAD = [(820, 1010), (840, 1260), (770, 1520), (720, 1735)]   # south trail branch

def dist(ax, ay, bx, by): return math.hypot(ax - bx, ay - by)
def _seg_d(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == dy == 0: return dist(px, py, ax, ay)
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return dist(px, py, ax + t * dx, ay + t * dy)
def near_path(x, y, pts, pad):
    return any(_seg_d(x, y, *pts[i], *pts[i+1]) < pad for i in range(len(pts)-1))
def on_road(x, y, pad=90): return near_path(x, y, ROAD, pad) or near_path(x, y, SROAD, pad)
def in_chasm(x, y): return x > RIM_X - 10
def in_spawn(x, y): return dist(x, y, *SPAWN) < 230

# =============================================================================
# 1) GROUND PAINT — strokes: roads first, then the chasm void on top.
# =============================================================================
def stroke(pts, color, width):
    flat = []
    for (px, py) in pts: flat.extend([round(px, 2), round(py, 2)])
    sprites.append({"type": "stroke", "stroke": color, "strokeWidth": width,
        "lineCap": "round", "lineJoin": "round", "composite": "source-over",
        "points": flat})
# packed-earth roads
stroke(ROAD, "#6b5f45", 132); stroke(ROAD, "#837659", 70)
stroke(SROAD, "#6b5f45", 110); stroke(SROAD, "#837659", 56)
# a small market plaza (widened earth) around the well/campfire
plaza = [(560, 1170), (760, 1175), (700, 1180)]
stroke(plaza, "#6b5f45", 200)
# the chasm: layered dark band painting the rift from edge to edge
rift = [(rift_x(y), y) for y in range(-60, WORLD_H + 80, 28)]
stroke(rift, "#2a241f", 600)     # crumbling outer rim
stroke(rift, "#15110e", 470)     # inner dark
stroke(rift, "#08060500"[:7] if False else "#080605", 320)  # deep void

# =============================================================================
# 2) TOWN BUILDINGS — north terrace (above road) & south terrace (below road).
# =============================================================================
temple(300, 560, 0.95)          # the old shrine (its mural counts six gods...)
tradehall(470, 730, 1.0)        # trade hall (Castle)
house(720, 640, 1.26)
house(930, 690, 1.20)
house(1140, 700, 1.16)
tower(1255, 770, 1.28)          # bridgekeeper's tower, overlooking the rift

house(330, 1300, 1.18)
house(560, 1360, 1.24)
garrison(1060, 1340, 1.0)       # town garrison (Barracks)
house(950, 1415, 1.20)          # (east of the south trail so the road stays clear)

# =============================================================================
# 3) MARKET — tents, crates, barrels, benches, a campfire, banners.
# =============================================================================
stalls = [(600, 928, 1.8), (790, 1078, 1.7), (980, 935, 1.6), (1135, 1075, 1.75)]
for (sx, sy, ss) in stalls:
    tent(sx, sy, ss)
    crate(sx + R.rng(38, 58), sy + R.rng(-6, 10), R.rng(2.0, 2.6))
    if R.chance(0.7): barrel(sx - R.rng(40, 58), sy + R.rng(-4, 10), R.rng(1.5, 1.9))
campfire(640, 1175, 1.7)        # plaza bonfire (animated)
for (lx, ly) in [(560, 1120), (720, 1120), (560, 1230), (720, 1230)]:
    logbench(lx, ly, R.rng(1.5, 1.9))
potpile(505, 1180, 1.6); crate(770, 1185, 2.2); barrel(540, 1110, 1.7)
flag(1255, 540, 1.7)            # banner on the tower (animated)
flag(602, 884, 1.3); flag(982, 892, 1.25)

# lamps lining the main road (alternating sides)
for i, (px, py) in enumerate([(330,1000),(560,995),(820,1006),(1080,1000),(1300,1000)]):
    lamp(px, py - 70 if i % 2 == 0 else py + 70, R.rng(2.8, 3.3))
for (px, py) in [(820,1240),(780,1470),(735,1660)]:    # lamps down the south trail
    lamp(px + 60, py, R.rng(2.8, 3.2))

# yard fences along a couple of plots
for fx in range(360, 700, 26): fence(fx, 880, 2.0)
for fy in range(1230, 1430, 24): fence(1180, fy, 2.0)

# =============================================================================
# 4) THE BROKEN BRIDGE — spans the rift at y=1000 with a gap in the middle.
# =============================================================================
deck(1400, 1.35)                # last solid span at the town lip
break_r(1560, 1.35)             # west stub — crumbles into the void
#            ... gap 1640 .. 1880 (the break) ...
break_l(1960, 1.35)             # far stub
deck(2110, 1.35); deck(2245, 1.32)   # span continuing toward the far cliffs
rubble(1612, 1086, 1.3); rubble(1905, 1066, 1.2)  # fallen blocks at the gap lip
for (rx, ry, rs) in [(1500, 1090, 1.0), (1980, 920, 1.0), (1450, 905, 0.9)]:
    rock(rx, ry, rs)
# barricade + warning at the town mouth of the bridge (you cannot cross)
for fy in range(936, 1066, 22): fence(1372, fy, 2.2)
sign(1342, 952, 2.6)

# =============================================================================
# 5) THE LIFT — roped cargo platform down to the Sunless Deep (the way onward).
# =============================================================================
lift(1330, 1018, 1.2)
lamp(1286, 1016, 2.7); lamp(1378, 1016, 2.7)
crate(1300, 1058, 2.0); barrel(1366, 1060, 1.6)
sign(1250, 1075, 2.2)

# =============================================================================
# 6) CHASM RIM — cliff rocks lining both lips so the rift reads as a gorge.
# =============================================================================
for y in range(-40, WORLD_H + 60, 96):
    wx = rift_x(y) - 300 + R.rng(-18, 18)        # west rim
    rock(wx, y, R.rng(1.6, 3.0))
    if R.chance(0.5): rock(wx - R.rng(30, 70), y + R.rng(-30, 30), R.rng(1.0, 1.9))
    ex = rift_x(y) + 300 + R.rng(-18, 18)        # east rim
    rock(ex, y, R.rng(1.6, 3.0))
    if R.chance(0.5): rock(ex + R.rng(30, 70), y + R.rng(-30, 30), R.rng(1.0, 1.9))

# =============================================================================
# 7) FAR SIDE (visual only, unreachable) — the town you are trying to reach.
# =============================================================================
add(BLD, "Tower.png", 2880, 820, 0.9, anchor="base")
add(BLD, "House1.png", 2600, 760, 0.85, anchor="base")
add(BLD, "House3.png", 2760, 1210, 0.85, anchor="base")
add(f"{TS}/Buildings/Red Buildings", "Monastery.png", 2520, 1150, 0.82, anchor="base")
for _ in range(16):
    fx = R.rng(2160, 3080); fy = R.rng(360, WORLD_H - 360)
    if dist(fx, fy, 2880, 820) < 220 or dist(fx, fy, 2600, 760) < 200: continue
    tree(fx, fy, R.rng(0.7, 0.95))

# =============================================================================
# 8) GREENERY & GROUND DETAIL on the town side (kept clear of road/buildings).
# =============================================================================
def blocked(x, y):
    if on_road(x, y) or in_spawn(x, y) or in_chasm(x, y): return True
    for f in footprints:
        if f["x"] - 24 < x < f["x"] + f["w"] + 24 and f["y"] - 40 < y < f["y"] + f["h"] + 30:
            return True
    return False

for _ in range(16):                       # fringe canopy trees (town edges)
    x = R.pick([R.rng(180, 360), R.rng(180, 1380)]); y = R.pick([R.rng(180, 360), R.rng(1640, 1820)])
    if blocked(x, y): continue
    tree(x, y, R.rng(0.85, 1.12))
for _ in range(22):
    x = R.rng(200, 1380); y = R.rng(420, 1780)
    if blocked(x, y): continue
    bush(x, y, R.rng(0.8, 1.05))
for _ in range(46):
    x = R.rng(180, 1400); y = R.rng(300, 1840)
    if blocked(x, y): continue
    grass(x, y, R.rng(2.2, 3.4))
for _ in range(20):
    x = R.rng(200, 1400); y = R.rng(320, 1820)
    if blocked(x, y): continue
    dirt(x, y, R.rng(1.6, 2.6))
for _ in range(18):
    x = R.rng(220, 1390); y = R.rng(360, 1800)
    if blocked(x, y) or dist(x, y, *SPAWN) < 150: continue
    rock(x, y, R.rng(0.6, 1.1))

# =============================================================================
# 9) GAMEPLAY — collision, light enemies, npcs, portals (no boss: it's a hub).
# =============================================================================
noWalkZones = []
# the rift + everything east of it (far side is unreachable on foot)
noWalkZones.append({"id": "z11_chasm", "x": RIM_X, "y": -80, "w": WORLD_W - RIM_X + 120, "h": WORLD_H + 160})
# frame the town: top band, bottom band (gap for south trail), left band (gap for back portal)
noWalkZones.append({"id": "z11_top", "x": -80, "y": -80, "w": RIM_X + 80, "h": 230})
noWalkZones.append({"id": "z11_botL", "x": -80, "y": 1840, "w": 700, "h": 240})
noWalkZones.append({"id": "z11_botR", "x": 840, "y": 1840, "w": RIM_X - 760, "h": 240})
noWalkZones.append({"id": "z11_leftT", "x": -80, "y": -80, "w": 190, "h": 900})
noWalkZones.append({"id": "z11_leftB", "x": -80, "y": 1120, "w": 190, "h": 900})
# solid building footprints
for i, f in enumerate(footprints):
    noWalkZones.append({"id": f"z11_b{i}", "x": round(f["x"], 1), "y": round(f["y"], 1),
                        "w": round(f["w"], 1), "h": round(f["h"], 1)})

enemies = [
    {"id": "e11_01", "type": "melee",  "x": 1200, "y": 880},   # bandits massing at the bridge approach
    {"id": "e11_02", "type": "melee",  "x": 1290, "y": 905},
    {"id": "e11_03", "type": "ranged", "x": 1230, "y": 815},
    {"id": "e11_04", "type": "elite",  "x": 1000, "y": 1245},   # the "bridge brigand" (open ground, clear of NPCs)
    {"id": "e11_05", "type": "rat",    "x": 985,  "y": 1500},   # south-trail vermin
    {"id": "e11_06", "type": "melee",  "x": 760,  "y": 1620},
]
boss = None
npcs = [
    {"id": "npc11_merchant", "type": "yellow", "x": 660, "y": 1095, "config": {
        "id": "npc11_merchant", "name": "Setu Merchant",
        "first": "Welcome_to_Setubandha,_friend._Trade_was_grand_when_the_bridge_still_stood..._now_my_caravans_rot_on_the_wrong_side_of_the_gap._Buy_something_before_the_road_forgets_us.",
        "active": "", "completed": ""}},
    {"id": "npc11_keeper", "type": "blue", "x": 1120, "y": 1075, "config": {
        "id": "npc11_keeper", "name": "Bridgekeeper Anuja",
        "first": "The_great_span_did_not_fall_to_storm._It_SNAPPED_the_night_the_Thread_was_cut,_clean_as_a_blade._Look_at_the_old_tower_carvings:_five_gods_raise_their_hands..._but_the_sixth_niche_is_scraped_bare.",
        "active": "", "completed": ""}},
    {"id": "npc11_lift", "type": "yellow", "x": 1300, "y": 1140, "config": {
        "id": "npc11_lift", "name": "Lift-Warden Bhima",
        "first": "No_one_crosses_the_broken_bridge,_traveler._If_you_must_go_on,_the_lift_lowers_into_the_Sunless_Deep_below._Mind_the_dark_water_down_there..._it_remembers.",
        "active": "", "completed": ""}},
]
portals = [
    {"id": "portal11_back", "direction": "back", "targetRegion": 7, "x": 120, "y": 1000},
    {"id": "portal11_next", "direction": "next", "targetRegion": 9, "x": 720, "y": 1742},
    {"id": "portal11_lift", "targetRegion": 10, "x": 1332, "y": 1006},
]

out = {
    "version": 1, "regionName": "Setubandha — The Broken Bridge Town",
    "background": {"type": "color", "value": "#514a33"},
    "sprites": sprites, "noWalkZones": noWalkZones, "enemies": enemies,
    "boss": boss, "npcs": npcs, "portals": portals, "regionIndex": 11,
}
with open("regions/region_11.json", "w") as f:
    json.dump(out, f, indent=1)

from collections import Counter
imgs = [s for s in sprites if s["type"] == "sprite"]
animated = [s for s in imgs if s.get("animated")]
print("Region 11 written -> regions/region_11.json")
print(f"  sprites: {len(sprites)} ({len(imgs)} images, {len(sprites)-len(imgs)} strokes)")
print(f"  ANIMATED: {len(animated)} (target <20) | zones: {len(noWalkZones)} | "
      f"enemies: {len(enemies)} | npcs: {len(npcs)} | boss: {boss}")
for n, c in Counter(s["name"] for s in imgs).most_common(16):
    print(f"    {c:4d}  {n}")
