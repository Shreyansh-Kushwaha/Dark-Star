#!/usr/bin/env python3
"""Visual upgrade pass for region 23 (Temple of Gods).

Rebuilds only the `sprites` array (keeps strokes/enemies/npcs/portals/etc).
Uses only assets verified present in region_11 + region_23, so it renders in
both the Phaser game and the Konva map editor. Deterministic (fixed seed).
"""
import json, random, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "regions", "region_23.json")

rng = random.Random(2306)

PROPS   = "assets_custom/props"
YBLD    = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Buildings/Yellow Buildings"
GOLD    = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones"
ROCKS   = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Rocks"
DECOR   = "assest4/map_objects/2 Objects/7 Decor"
GRASS   = "assest4/next2/2 Objects/5 Grass"
BOX     = "assest4/next2/2 Objects/4 Box"
TREES   = "craftpix-net-168228-free-tree-pixel-art-asset-pack/trees"
CROPPED = "cropped"
CAMPF   = "assest4/map_objects/3 Animated Objects/2 Campfire"
FLAGD   = "assest4/map_objects/3 Animated Objects/1 Flag"

OFF = {  # (offsetX, offsetY) per frame
    "pillar.png": (30, 195), "brazier.png": (22, 77), "mural.png": (70, 99),
    "Monastery.png": (96, 319), "Castle.png": (160, 255), "Tower.png": (64, 255),
    "House1.png": (64, 191), "House2.png": (64, 191), "House3.png": (64, 191),
    "Rock1.png": (32, 63), "Rock2.png": (32, 63), "Rock3.png": (32, 63), "Rock4.png": (32, 63),
    "Log1.png": (17, 20), "Log2.png": (16.5, 31), "Log3.png": (22.5, 13),
    "Lamp1.png": (10, 34), "Lamp2.png": (5.5, 34), "Lamp3.png": (6.5, 34),
    "Bushe1_crop.png": (40, 72), "Bushe2_crop.png": (38.5, 50),
    "Bushe3_crop.png": (48, 88), "Bushe4_crop.png": (38.5, 66),
    "middle_lane_tree2.png": (104, 268), "middle_lane_tree3.png": (93.5, 256),
    "middle_lane_tree4.png": (78, 275), "middle_lane_tree5.png": (99.5, 246),
}

_id = 0
sprites = []

def sid():
    global _id
    _id += 1
    return f"s_r23_{_id:04d}"

def sprite(dir_, frame, x, y, sx, sy=None, name=None, off=None, animated=False, frames=None, layer="below"):
    if off is None:
        off = OFF.get(frame, (frame and 32 or 32, 32))
    fr = frames if frames else [frame]
    sprites.append({
        "type": "sprite", "spriteId": sid(), "dir": dir_, "frames": fr,
        "name": name if name is not None else (frame.rsplit('.', 1)[0] if frame else "1"),
        "animated": animated, "spriteLayer": layer,
        "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(sx, 3), "scaleY": round(sy if sy is not None else sx, 3),
        "offsetX": off[0], "offsetY": off[1],
    })

def stroke(color, w, pts, comp="source-over"):
    sprites.append({"type": "stroke", "stroke": color, "strokeWidth": w,
                    "lineCap": "round", "lineJoin": "round",
                    "composite": comp, "points": pts})

# ── 1. GROUND STROKES ────────────────────────────────────────────────────────
# Base processional (3 layers, as before — widest to thinnest tan).
base = [x for i in range(120, 3081, 60) for x in (i, 1000)]
stroke("#9a7d44", 200, base)
stroke("#b49a5e", 110, base)
stroke("#cab37a", 50, base)
# Bright stone runner down the centre of the path.
stroke("#d7c186", 26, [140, 1000, 3060, 1000])
# Paved-road edge lines framing the processional.
stroke("#5a4626", 8, [140, 908, 3060, 908])
stroke("#5a4626", 8, [140, 1092, 3060, 1092])
# Flagstone seams crossing the path.
for x in range(300, 3001, 270):
    stroke("#6a542e", 5, [x, 912, x, 1088])

# Mottled ground texture: soft earth-tone dabs across the field so the dirt
# isn't one flat brown. Round-cap 1px lines render as filled circles. Kept out
# of the path band (905-1095) so the processional stays clean.
EARTH = ["#6f5530", "#856a38", "#5f5a30", "#8a6e3c", "#6a5e34", "#7e6636"]
MOSS  = ["#5e6330", "#67692f", "#566031"]
for _ in range(60):
    cx = rng.uniform(150, 3050)
    cy = rng.choice([rng.uniform(170, 880), rng.uniform(1120, 1850)])
    tone = rng.choice(EARTH if rng.random() < 0.78 else MOSS)
    # Irregular wandering patch (round-cap stroke) reads as organic ground, not a disc.
    spread = rng.uniform(60, 150)
    pts = []
    for _ in range(rng.randint(3, 5)):
        pts += [cx + rng.uniform(-spread, spread), cy + rng.uniform(-spread * 0.6, spread * 0.6)]
    stroke(tone, rng.uniform(55, 130), pts)

# ── 2. BUILDINGS (kept in place) + priest quarters in empty corners ───────────
sprite(YBLD, "Monastery.png", 520, 640, 1.10, name="Monastery")
sprite(YBLD, "Castle.png",    2700, 760, 1.05, name="Castle")
sprite(YBLD, "Tower.png",     1500, 600, 1.30, name="Tower")
sprite(YBLD, "House1.png",    235, 1565, 1.12, name="House1")
sprite(YBLD, "House3.png",    2985, 560, 1.10, name="House3")

# ── 3. SHRINE CENTREPIECE: mural enlarged, raised, framed ─────────────────────
sprite(PROPS, "mural.png", 1500, 860, 3.40, name="mural")
# Altar / offering table at its base.
sprite(BOX, "1.png", 1450, 1015, 2.0, off=(10, 21))
sprite(BOX, "2.png", 1552, 1015, 2.0, off=(10, 21))
# Two tall braziers framing the mural.
sprite(PROPS, "brazier.png", 1300, 880, 2.65, name="brazier")
sprite(PROPS, "brazier.png", 1700, 880, 2.65, name="brazier")

# ── 4. RUINED COLONNADE ───────────────────────────────────────────────────────
# Two rows flanking the path; broken regularity = stumps + fallen log-drums + rubble.
def place_pillar(x, y, intact_center=False):
    if intact_center:
        s = rng.uniform(1.16, 1.30)
        sprite(PROPS, "pillar.png", x + rng.uniform(-6, 6), y + rng.uniform(-8, 8), s, name="pillar")
        return
    roll = rng.random()
    if roll < 0.22:        # snapped stump + fallen drum + rubble
        s = rng.uniform(1.0, 1.22)
        sprite(PROPS, "pillar.png", x + rng.uniform(-10, 10), y + rng.uniform(-10, 10),
               s, sy=s * rng.uniform(0.42, 0.60), name="pillar")
        log = rng.choice(["Log2.png", "Log3.png"])
        sprite(DECOR, log, x + rng.uniform(40, 80), y + rng.uniform(20, 55), rng.uniform(1.5, 2.0), name=log[:-4])
        sprite(ROCKS, rng.choice(["Rock2.png", "Rock3.png"]),
               x + rng.uniform(-60, -20), y + rng.uniform(10, 45), rng.uniform(0.8, 1.2),
               name="Rock")
    elif roll < 0.40:      # weathered, slightly shorter
        s = rng.uniform(0.92, 1.06)
        sprite(PROPS, "pillar.png", x + rng.uniform(-8, 8), y + rng.uniform(-8, 8),
               s, sy=s * rng.uniform(0.80, 0.95), name="pillar")
    else:                  # intact, varied
        s = rng.uniform(1.02, 1.30)
        sprite(PROPS, "pillar.png", x + rng.uniform(-10, 10), y + rng.uniform(-12, 12), s, name="pillar")

cols = [320 + i * 236 for i in range(12)]   # 320 .. 2916
for i, x in enumerate(cols):
    center = x in (cols[4], cols[5], cols[6])  # frame the shrine axis
    if i != 5:                                  # leave top-centre open for the shrine/tower
        place_pillar(x, 705, intact_center=center)
    place_pillar(x, 1285, intact_center=center)

# A few extra fallen drums scattered between columns for debris.
for _ in range(4):
    x = rng.uniform(360, 2880); y = rng.choice([rng.uniform(640, 760), rng.uniform(1330, 1460)])
    sprite(DECOR, rng.choice(["Log1.png", "Log2.png", "Log3.png"]),
           x, y, rng.uniform(1.4, 1.9))

# ── 5. BRAZIERS lining the processional ───────────────────────────────────────
for n, x in enumerate([460, 820, 1180, 1820, 2180, 2540, 2900]):
    sprite(PROPS, "brazier.png", x, 905 if n % 2 == 0 else 1095, 2.35, name="brazier")

# ── 6. CAMPFIRES (animated, auto-glow) along the path ─────────────────────────
for x, y in [(660, 1075), (1080, 925), (1920, 925), (2340, 1075)]:
    sprite(CAMPF, "1.png", x, y, 1.7, name="1", animated=True, frames=["1.png", "2.png"], off=(96, 63))

# ── 7. LAMPS for warm point-lighting near the colonnade ───────────────────────
for x in [400, 940, 1480, 2020, 2560, 2980]:
    lamp = rng.choice(["Lamp1.png", "Lamp2.png", "Lamp3.png"])
    sprite(DECOR, lamp, x + rng.uniform(-10, 10), rng.choice([840, 1170]), rng.uniform(2.7, 3.1), name=lamp[:-4])

# ── 8. FLAGS flanking shrine + buildings ──────────────────────────────────────
FLAG_FRAMES = ["1.png", "2.png", "3.png", "4.png", "5.png"]
def flag(x, y, s):
    sprite(FLAGD, "1.png", x, y, s, name="1", animated=True, frames=FLAG_FRAMES, off=(96, 63))
flag(1500, 360, 1.9)   # central banner
flag(1360, 470, 1.5); flag(1640, 470, 1.5)   # behind shrine
flag(400, 500, 1.4);  flag(640, 500, 1.4)    # monastery
flag(2580, 610, 1.4); flag(2820, 610, 1.4)   # castle

# ── 9. GOLD as OFFERINGS (reclustered, not scattered) ─────────────────────────
def gold(frame, x, y, s):
    sprite(GOLD, frame, x, y, s, name=frame[:-4], off=(64, 127))
# Mural base offerings
gold("Gold Stone 6.png", 1440, 1075, 0.95); gold("Gold Stone 5.png", 1500, 1100, 1.0)
gold("Gold Stone 4.png", 1560, 1075, 0.9);  gold("Gold Stone 2.png", 1470, 1135, 0.72)
gold("Gold Stone 5.png", 1535, 1135, 0.78)
# Flanking the shrine
gold("Gold Stone 4.png", 1360, 1150, 0.82); gold("Gold Stone 6.png", 1640, 1150, 0.88)
# Monastery entrance
gold("Gold Stone 5.png", 470, 820, 0.8); gold("Gold Stone 6.png", 545, 850, 0.95)
gold("Gold Stone 4.png", 605, 820, 0.85)
# Castle entrance
gold("Gold Stone 6.png", 2640, 945, 0.9); gold("Gold Stone 5.png", 2710, 970, 0.85)
gold("Gold Stone 4.png", 2772, 938, 0.8)

# ── 10. GROUND DECOR scattered across the whole field ─────────────────────────
BUILDINGS = [(520, 640, 230), (2700, 760, 280), (1500, 600, 220),
             (235, 1565, 200), (2985, 560, 200), (1500, 860, 260)]  # (x, y, keep-clear radius)

def in_path(y):                       # the processional corridor
    return 900 <= y <= 1100
def near_building(x, y, pad=0.0):
    return any((x - bx) ** 2 + (y - by) ** 2 < (r + pad) ** 2 for bx, by, r in BUILDINGS)

def field_point(allow_path=False, avoid_buildings=True, pad=0.0):
    for _ in range(40):
        x = rng.uniform(150, 3050); y = rng.uniform(170, 1850)
        if not allow_path and in_path(y):       continue
        if avoid_buildings and near_building(x, y, pad): continue
        return x, y
    return x, y

def cluster(dir_, frame_pick, n, sx_range, off_jit=70, **fp):
    """Place a small clump so decor reads as natural, not noise."""
    cx, cy = field_point(**fp)
    for _ in range(n):
        frame = frame_pick()
        sprite(dir_, frame, cx + rng.uniform(-off_jit, off_jit),
               cy + rng.uniform(-off_jit, off_jit), rng.uniform(*sx_range),
               name=frame.rsplit('.', 1)[0])

GRASS_F = lambda: rng.choice(["1.png", "2.png", "3.png", "4.png", "5.png", "6.png"])
DIRT_F  = lambda: rng.choice(["Dirt1.png", "Dirt2.png", "Dirt3.png", "Dirt6.png"])
ROCK_F  = lambda: rng.choice(["Rock1.png", "Rock2.png", "Rock3.png", "Rock4.png"])
BUSH_F  = lambda: rng.choice(["Bushe1_crop.png", "Bushe2_crop.png", "Bushe3_crop.png", "Bushe4_crop.png"])
TREE_F  = lambda: rng.choice(["middle_lane_tree2.png", "middle_lane_tree3.png",
                              "middle_lane_tree4.png", "middle_lane_tree5.png"])

# Grass — dense, in small clumps across the whole field (+ along path edges).
for _ in range(26):
    cluster(GRASS, GRASS_F, rng.randint(2, 4), (2.3, 3.2))
for _ in range(12):                              # path-edge tufts
    x = rng.uniform(180, 3020); y = rng.choice([rng.uniform(845, 882), rng.uniform(1108, 1148)])
    f = GRASS_F(); sprite(GRASS, f, x, y, rng.uniform(2.4, 3.1), name=f[:-4])

# Dirt patches scattered everywhere (including under the path band for wear).
for _ in range(24):
    x, y = field_point(allow_path=True, avoid_buildings=False)
    f = DIRT_F(); sprite(DECOR, f, x, y, rng.uniform(1.9, 2.7), name=f[:-4])

# Rocks — clumps of rubble plus lone boulders across the field.
for _ in range(9):
    cluster(ROCKS, ROCK_F, rng.randint(1, 3), (0.8, 1.3), off_jit=55)
for _ in range(6):
    f = ROCK_F(); x, y = field_point()
    base = {"Rock1.png": 2.3, "Rock2.png": 1.0, "Rock3.png": 1.0, "Rock4.png": 1.5}[f]
    sprite(ROCKS, f, x, y, base * rng.uniform(0.7, 1.05), name="Rock")

# Bushes spread through the field, weighted toward the edges.
for _ in range(16):
    if rng.random() < 0.55:
        x = rng.choice([rng.uniform(150, 460), rng.uniform(2740, 3050)]); y = rng.uniform(220, 1820)
        if in_path(y) or near_building(x, y): x, y = field_point()
    else:
        x, y = field_point()
    f = BUSH_F(); sprite(CROPPED, f, x, y, rng.uniform(0.82, 1.08), name=f[:-4])

# Trees framing the perimeter — corners plus along the top and bottom edges.
tree_spots = [(175, 300), (175, 1770), (3030, 300), (3030, 1775),
              (700, 250), (1150, 230), (1900, 235), (2400, 255),
              (520, 1810), (1050, 1820), (2050, 1815), (2560, 1805)]
for x, y in tree_spots:
    if near_building(x, y, pad=60):  # nudge off any building it lands on
        x += 180
    f = TREE_F(); sprite(TREES, f, x, y, rng.uniform(0.68, 0.86), name=f[:-4])

# ── WRITE ─────────────────────────────────────────────────────────────────────
data = json.load(open(PATH))
data["sprites"] = sprites
json.dump(data, open(PATH, "w"), indent=1, ensure_ascii=False)
print(f"region_23.json rebuilt: {len(sprites)} sprite entries "
      f"({sum(1 for s in sprites if s['type']=='sprite')} images, "
      f"{sum(1 for s in sprites if s['type']=='stroke')} strokes)")
