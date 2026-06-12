#!/usr/bin/env python3
"""Visual upgrade for region 24 (Demon Forge / Pāṣāṇa Daitya) — demonic foundry.

Rebuilds only the `sprites` array (keeps enemies/npcs/boss/portals/etc).
Uses only assets verified present, so it renders in both the Phaser game and
the Konva map editor. Deterministic (fixed seed).

Theme: a volcanic demonic forge where the anti-god weapons were made. A lava
river flows full-width and pools into a molten basin under the stone-demon boss;
glowing fissures crack across a dark basalt field dressed with furnaces, slag,
bones and skulls.
"""
import json, math, os, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "regions", "region_24.json")
rng = random.Random(2406)

PROPS  = "assets_custom/props"
BASALT = "assets_custom/rocks_basalt"
STRUCT = "assets_custom/structures"
CAMPF  = "assest4/map_objects/3 Animated Objects/2 Campfire"
BOX    = "assest4/next2/2 Objects/4 Box"

BOSS = (2680, 1000)        # pashana_daitya
W, H = 3200, 2000

OFF = {  # bottom-anchored origins (px) from natural image sizes
    "brazier.png": (22, 77), "lava_rock.png": (36, 55), "gate_arch.png": (118, 220),
    "skull.png": (20, 36), "crystal_amber.png": (32, 112), "crystal_purple.png": (32, 112),
    "bone_arch.png": (64, 152), "bone_pile.png": (42, 56), "void_shard.png": (60, 82),
    "pillar.png": (30, 195), "mural.png": (70, 99), "dead_tree.png": (48, 128),
    "bridge_deck.png": (80, 60),
    "Rock1.png": (32, 63), "Rock2.png": (32, 63), "Rock3.png": (32, 63), "Rock4.png": (32, 63),
}

_id = 0
sprites = []

def sid():
    global _id; _id += 1
    return f"s_r24_{_id:04d}"

def sprite(dir_, frame, x, y, sx, sy=None, name=None, off=None, animated=False, frames=None):
    off = off or OFF.get(frame, (16, 16))
    sprites.append({
        "type": "sprite", "spriteId": sid(), "dir": dir_,
        "frames": frames or [frame],
        "name": name if name is not None else frame.rsplit('.', 1)[0],
        "animated": animated, "spriteLayer": "below",
        "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(sx, 3), "scaleY": round(sy if sy is not None else sx, 3),
        "offsetX": off[0], "offsetY": off[1],
    })

def stroke(color, w, pts, comp="source-over"):
    sprites.append({"type": "stroke", "stroke": color, "strokeWidth": w,
                    "lineCap": "round", "lineJoin": "round",
                    "composite": comp, "points": [round(p, 1) for p in pts]})

NO_BURY = [(120, 1000, 170), (3090, 1000, 180), (320, 1000, 150)]   # portals + NPC
def blocked(x, y):
    if any((x - bx) ** 2 + (y - by) ** 2 < r * r for bx, by, r in NO_BURY):
        return True
    return (x - BOSS[0]) ** 2 + (y - BOSS[1]) ** 2 < 240 * 240   # boss spot

def field_pt(xr=(80, 3120), yr=(140, 1860), avoid_river=False):
    for _ in range(40):
        x = rng.uniform(*xr); y = rng.uniform(*yr)
        if blocked(x, y): continue
        if avoid_river and abs(y - 1000) < 150: continue
        return x, y
    return x, y

# ── 1. LAVA: full-width snaking river → molten basin at the boss ──────────────
main = []
x = -60
while x <= 2480:
    main += [x, 1000 + 95 * math.sin((x + 300) / 430.0)]
    x += 45
last_y = main[-1]
for xx in range(2480, BOSS[0] + 1, 30):          # curve the tail into the basin
    t = (xx - 2480) / float(BOSS[0] - 2480)
    main += [xx, last_y * (1 - t) + BOSS[1] * t]
for col, w in [("#7a1e08", 132), ("#d4641e", 82), ("#f2b038", 38), ("#ffe07a", 14)]:
    stroke(col, w, main)
# Molten basin (layered round-cap dots) beneath the boss.
for col, w in [("#7a1e08", 540), ("#9a2a0a", 440), ("#d4641e", 330),
               ("#f2b038", 210), ("#ffe07a", 110)]:
    stroke(col, w, [BOSS[0], BOSS[1], BOSS[0] + 1, BOSS[1]])

# Glowing fissures cracking across the dark field, branching off the banks.
for _ in range(20):
    sx = rng.uniform(0, 2500)
    side = rng.choice([-1, 1])
    sy = 1000 + side * rng.uniform(110, 180)
    pts = [sx, sy]
    cx, cy = sx, sy
    for _ in range(rng.randint(4, 7)):
        cx += rng.uniform(-90, 90)
        cy += side * rng.uniform(40, 130)            # wander outward from the river
        cy = max(150, min(1850, cy))
        pts += [cx, cy]
    stroke("#5a1404", 15, pts)
    stroke("#d4641e", 7, pts)
    if rng.random() < 0.5:
        stroke("#ffd66a", 3, pts)

# ── 2. DARK VOLCANIC GROUND MOTTLE + ash ──────────────────────────────────────
ROCK_T = ["#332419", "#241a13", "#2e231c", "#3d2b20", "#1f1610"]
ASH_T  = ["#4a3a30", "#564236", "#42332a"]
for _ in range(64):
    cx = rng.uniform(120, 3080)
    cy = rng.choice([rng.uniform(150, 860), rng.uniform(1140, 1860)])
    tone = rng.choice(ROCK_T if rng.random() < 0.72 else ASH_T)
    spread = rng.uniform(60, 150)
    pts = []
    for _ in range(rng.randint(3, 5)):
        pts += [cx + rng.uniform(-spread, spread), cy + rng.uniform(-spread * 0.6, spread * 0.6)]
    stroke(tone, rng.uniform(55, 130), pts)

# ── 3. FORGE PRECINCT (mid-map, upper bank) ───────────────────────────────────
sprite(PROPS, "gate_arch.png", 1300, 770, 1.35, name="gate_arch")     # furnace mouth (auto-glows)
sprite(PROPS, "pillar.png", 1110, 790, 1.28, name="pillar")
sprite(PROPS, "pillar.png", 1490, 790, 1.28, name="pillar")
sprite(PROPS, "mural.png",  960, 840, 2.0, name="mural")               # smithing relief
sprite(PROPS, "brazier.png", 1175, 880, 2.6, name="brazier")
sprite(PROPS, "brazier.png", 1425, 880, 2.6, name="brazier")
sprite(CAMPF, "1.png", 1300, 905, 1.7, name="1", animated=True, frames=["1.png", "2.png"], off=(96, 63))
for _ in range(3):                                                     # supply crates
    sprite(BOX, rng.choice(["1.png", "2.png", "3.png", "4.png"]),
           1560 + rng.uniform(-30, 60), 840 + rng.uniform(-20, 40), rng.uniform(2.1, 2.5),
           name="1", off=(10, 21))
for _ in range(6):                                                     # slag heap at the forge
    sprite(PROPS, "lava_rock.png", 1300 + rng.uniform(-110, 110), 930 + rng.uniform(-20, 30),
           rng.uniform(1.5, 2.0), name="lava_rock")

# Plank walkways over the lava channel.
for px in (640, 1780):
    sprite(STRUCT, "bridge_deck.png", px, 1000, 1.5, name="bridge_deck")

# ── 4. BOSS FURNACE (the great maw behind pashana_daitya) ─────────────────────
bx, by = BOSS
sprite(PROPS, "bone_arch.png", bx, 540, 1.25, name="bone_arch")
sprite(PROPS, "gate_arch.png", bx, 690, 1.75, name="gate_arch")        # great furnace maw
sprite(PROPS, "pillar.png", bx - 300, 760, 1.32, name="pillar")
sprite(PROPS, "pillar.png", bx + 300, 760, 1.32, name="pillar")
for ang in range(0, 360, 60):                                          # brazier ring around the basin
    rx = bx + 360 * math.cos(math.radians(ang))
    ry = by + 300 * math.sin(math.radians(ang))
    if rx > 3000: continue                                             # keep the portal clear
    sprite(PROPS, "brazier.png", rx, ry, 2.6, name="brazier")
for _ in range(5):                                                     # skulls / shards on the rim
    a = rng.uniform(0, 2 * math.pi); r = rng.uniform(300, 360)
    sprite(PROPS, rng.choice(["skull.png", "void_shard.png"]),
           bx + r * math.cos(a), by + r * math.sin(a) * 0.85, rng.uniform(1.4, 2.0))
for cx in (bx - 360, bx + 300):                                        # cooling-metal crystals
    for _ in range(2):
        sprite(PROPS, rng.choice(["crystal_amber.png", "crystal_amber.png", "crystal_purple.png"]),
               cx + rng.uniform(-40, 40), by + rng.uniform(-120, 120), rng.uniform(1.0, 1.4))
sprite(PROPS, "bone_pile.png", bx - 380, 1160, 1.6, name="bone_pile")
sprite(PROPS, "bone_pile.png", bx + 260, 1180, 1.5, name="bone_pile")

# ── 5. DEMONIC DRESSING CLUSTERS across the field ─────────────────────────────
for _ in range(7):
    cx, cy = field_pt(avoid_river=True)
    for _ in range(rng.randint(2, 4)):
        f = rng.choice(["skull.png", "skull.png", "bone_pile.png", "void_shard.png", "crystal_purple.png"])
        sprite(PROPS, f, cx + rng.uniform(-70, 70), cy + rng.uniform(-50, 50), rng.uniform(1.2, 1.9))

# ── 6. SLAG HEAPS along the lava banks (basalt + lava_rock) ───────────────────
def bank_y(side):
    return 1000 + side * rng.uniform(120, 200)
for x0 in range(120, 2500, 240):
    side = rng.choice([-1, 1])
    cx, cy = x0 + rng.uniform(-40, 40), bank_y(side)
    if blocked(cx, cy): continue
    for _ in range(rng.randint(2, 4)):
        if rng.random() < 0.5:
            f = rng.choice(["Rock1.png", "Rock2.png", "Rock3.png", "Rock4.png"])
            sprite(BASALT, f, cx + rng.uniform(-60, 60), cy + rng.uniform(-30, 30),
                   rng.uniform(1.8, 2.6), name=f[:-4])
        else:
            sprite(PROPS, "lava_rock.png", cx + rng.uniform(-60, 60), cy + rng.uniform(-30, 30),
                   rng.uniform(1.4, 1.9), name="lava_rock")

# ── 7. FIELD BASALT CLUSTERS, charred trees, stray lava chunks ────────────────
for _ in range(10):
    cx, cy = field_pt(avoid_river=True)
    for _ in range(rng.randint(2, 5)):
        f = rng.choice(["Rock1.png", "Rock2.png", "Rock3.png", "Rock4.png"])
        sprite(BASALT, f, cx + rng.uniform(-70, 70), cy + rng.uniform(-55, 55),
               rng.uniform(1.6, 2.5), name=f[:-4])
for _ in range(12):
    cx, cy = field_pt(avoid_river=True)
    sprite(PROPS, "lava_rock.png", cx, cy, rng.uniform(1.3, 1.8), name="lava_rock")
for x, y in [(180, 280), (180, 1740), (3020, 300), (3020, 1740), (820, 230), (2300, 1780)]:
    if blocked(x, y): continue
    sprite(PROPS, "dead_tree.png", x, y, rng.uniform(0.9, 1.2), name="dead_tree")

# ── WRITE ─────────────────────────────────────────────────────────────────────
data = json.load(open(PATH))
data["sprites"] = sprites
json.dump(data, open(PATH, "w"), indent=1, ensure_ascii=False)
print(f"region_24.json rebuilt: {sum(1 for s in sprites if s['type']=='sprite')} images, "
      f"{sum(1 for s in sprites if s['type']=='stroke')} strokes")
