#!/usr/bin/env python3
"""
Region 15 "Sunken Road (Plāvita)" — dressing pass.

Loads the existing region (keeping causeway, enemies, portals, NPC, no-walk
zones) and appends/retunes only decoration:
  • Ferryman vignette: beached boat, broken dock and a crate by the NPC.
  • Drowned temple: pillar colonnade + two flanking murals behind the big
    "six haloed kings" mural (murals glow warm in-engine) and a crimson
    flag_red waymarker at the temple turn-off.
  • South ruin: half-drowned pillar run stepping into the water at mural 2.
  • Lamps spaced along the causeway (cool glow via GameScene 'lamp' case).
  • Water dressing: lily-pad clusters on the six pools, half-submerged dead
    trees, shoreline reed clumps, cypress at the water's edge, lagoon bulges
    and current sweeps to de-stripe the bands, varied band widths.
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_15.json"
random.seed(1515)

PROPS = "assets_custom/props"
GEN = "r15dress"  # idempotency tag for added strokes

# custom props: (canvasW, canvasH, originX, originY); base- or centre-anchored
ANCHOR = {
    "boat":      (150, 76, 75, 38),    # flat on water: centre
    "dock":      (124, 70, 62, 35),    # flat on water: centre
    "lily_pad":  (44, 28, 22, 14),     # flat on water: centre
    "dead_tree": (96, 132, 48, 131),
    "cypress":   (72, 144, 36, 143),
    "flag_red":  (58, 112, 13, 110),
    "pillar":    (60, 196, 30, 195),
    "reed":      (34, 74, 17, 73),
    "mural":     (140, 100, 70, 99),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r15_") and sid_[6:].isdigit() and int(sid_[6:]) >= 500

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [500]
def sid():
    _n[0] += 1
    return f"s_r15_{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def lamp(x, y, variant=1):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "assest4/map_objects/2 Objects/7 Decor",
        "frames": [f"Lamp{variant}.png"], "name": f"Lamp{variant}",
        "animated": False, "spriteLayer": "below",
        "x": round(x, 2), "y": round(y, 2), "scaleX": 3.0, "scaleY": 3.0,
        "offsetX": 10.0 if variant == 1 else 6.5, "offsetY": 34,
    }

def rock(n, x, y, scale):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Rocks",
        "frames": [f"Rock{n}.png"], "name": f"Rock{n}", "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": 32.0, "offsetY": 63,
    }

def water_rock(n, x, y):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Rocks in the Water",
        "frames": [f"Water Rocks_{n:02d}.png"], "name": f"Water Rocks_{n:02d}",
        "animated": True, "spriteLayer": "below",
        "x": round(x, 2), "y": round(y, 2), "scaleX": 1, "scaleY": 1,
        "offsetX": 32, "offsetY": 32,
        "frameW": 64, "frameH": 64, "frameCount": 16, "frameRow": 0,
    }

def crate(x, y, scale=2.0):
    return {
        "type": "sprite", "spriteId": sid(),
        "dir": "assest4/next2/2 Objects/4 Box", "frames": ["3.png"],
        "name": "3", "animated": False, "spriteLayer": "below",
        "x": round(x, 2), "y": round(y, 2),
        "scaleX": scale, "scaleY": scale, "offsetX": 8.0, "offsetY": 20,
    }

# causeway centreline (sampled from the #4f4a3e road stroke) for lamp/flag math
CL = [(80, 1016), (320, 1059), (560, 1093), (800, 1109), (1040, 1106),
      (1280, 1083), (1520, 1046), (1760, 1000), (2000, 954), (2240, 917),
      (2480, 894), (2720, 891), (2960, 908)]
def cl_y(x):
    for (x0, y0), (x1, y1) in zip(CL, CL[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return CL[0][1] if x < CL[0][0] else CL[-1][1]

new = []

# ── 1) water bands: varied widths + lagoon bulges + current sweeps ──────────
BAND_W = [128, 102, 138, 96, 130, 110, 144, 100, 126, 118, 134, 98, 140, 108, 124]
bi = 0
for s in sprites:
    if s["type"] == "stroke" and s["strokeWidth"] == 120 and len(s["points"]) > 60:
        s["strokeWidth"] = BAND_W[bi % len(BAND_W)]
        bi += 1

def ellipse_pts(cx, cy, rx, ry, n=20):
    import math
    out = []
    for i in range(n + 1):
        a = i / n * 2 * math.pi
        out += [round(cx + rx * math.cos(a), 1), round(cy + ry * math.sin(a), 1)]
    return out

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": pts}

water_strokes = [
    # lagoon bulges widening the top-middle and bottom-middle pools
    stroke("#2b6f78", 150, ellipse_pts(1500, 460, 280, 125)),
    stroke("#2b6f78", 140, ellipse_pts(1800, 1545, 250, 110)),
    # slow current sweeps breaking the horizontal banding
    stroke("#2e747d", 70, [150, 210, 600, 290, 1100, 380, 1700, 400, 2300, 310, 2800, 200, 3150, 170]),
    stroke("#2e747d", 70, [100, 1640, 700, 1540, 1300, 1430, 1900, 1410, 2500, 1500, 3100, 1620]),
]
# insert after the last horizontal band so pools/causeway still paint on top
last_band = max(i for i, s in enumerate(sprites)
                if s["type"] == "stroke" and len(s["points"]) > 60)
sprites[last_band + 1:last_band + 1] = water_strokes

# ── 2) Ferryman vignette (NPC at 320,1000; portal back at 120) ───────────────
new.append(prop("dock", 450, 1262))   # bridges the shoreline at y≈1227
new.append(prop("boat", 575, 1402, 1.5))
new.append(crate(255, 1172))
new.append(lamp(470, 1245, 3))                      # dock lamp at water's edge
new.append(prop("reed", 520, 1300, 2.2))
new.append(prop("reed", 395, 1330, 1.9))

# ── 3) drowned temple colonnade behind the big mural (1500, 889) ─────────────
COLONNADE = [(1270, 800, 0.95), (1345, 758, 0.72), (1422, 722, 1.05),
             (1500, 706, 0.82), (1578, 720, 1.0), (1656, 752, 0.66),
             (1733, 792, 0.9), (1432, 838, 0.45), (1572, 832, 0.48)]
for x, y, sc in COLONNADE:
    new.append(prop("pillar", x + random.uniform(-8, 8), y + random.uniform(-6, 6), sc))
# flanking murals (same record shape as the existing ones)
for mx in (1338, 1662):
    new.append({
        "type": "sprite", "spriteId": sid(), "dir": PROPS, "frames": ["mural.png"],
        "name": "mural", "animated": False, "spriteLayer": "below",
        "x": mx, "y": 858.0, "scaleX": 1.0, "scaleY": 1.0,
        "offsetX": 70.0, "offsetY": 99,
    })
# toppled rubble + reeds at the colonnade feet
for rx, ry in [(1300, 845), (1390, 870), (1610, 868), (1705, 842)]:
    new.append(rock(random.choice([1, 2, 3]), rx + random.uniform(-12, 12), ry, random.uniform(0.55, 0.8)))
for gx, gy in [(1245, 862), (1755, 850)]:
    for _ in range(3):
        new.append(prop("reed", gx + random.uniform(-35, 35), gy + random.uniform(-14, 14),
                        random.uniform(1.6, 2.3)))
# crimson waymarker at the temple turn-off (west of the Lamp3 at 1350)
new.append(prop("flag_red", 1180, cl_y(1180) - 112, 1.0))

# ── 4) south ruin: pillar run stepping down into the water (mural 2300,1080) ─
for x, y, sc in [(2188, 1158, 0.85), (2262, 1208, 0.7), (2338, 1248, 0.55), (2438, 1192, 0.78)]:
    new.append(prop("pillar", x, y, sc))
for rx, ry in [(2225, 1130), (2395, 1145)]:
    new.append(rock(random.choice([1, 2]), rx, ry, random.uniform(0.55, 0.75)))
for _ in range(4):
    new.append(prop("reed", 2300 + random.uniform(-110, 110), 1255 + random.uniform(-15, 15),
                    random.uniform(1.6, 2.4)))
new.append(prop("lily_pad", 2382, 1322, 1.3))
new.append(prop("lily_pad", 2446, 1362, 1.1))
# far half-sunken pillars out in the flood (echo the existing drowned ones)
for x, y, sc in [(2790, 1424, 0.7), (2952, 1524, 0.6), (455, 540, 0.65), (2660, 348, 0.7)]:
    new.append(prop("pillar", x, y, sc))

# ── 5) lamps along the causeway (cool glow wired in GameScene) ───────────────
# (none near x≈560 — the dock lamp lights that stretch)
for x, side, variant in [(1580, 1, 3), (2080, -1, 1),
                         (2380, 1, 1), (2680, -1, 3), (2980, 1, 1)]:
    new.append(lamp(x, cl_y(x) + side * 126, variant))

# ── 6) water dressing: lily pads, dead trees, shoreline reeds, cypress ───────
POOLS = [(700, 520), (1500, 460), (2300, 560), (900, 1500), (1800, 1540), (2500, 1460)]
for px, py in POOLS:
    for _ in range(random.randint(5, 7)):
        new.append(prop("lily_pad",
                        px + random.uniform(-180, 180), py + random.uniform(-70, 70),
                        random.uniform(0.9, 1.5)))
for sx, sy in [(350, 640), (1150, 600), (2750, 640), (640, 1350), (2150, 1380), (3010, 1430)]:
    new.append(prop("lily_pad", sx, sy, random.uniform(1.0, 1.4)))

# half-submerged dead trees looming out of the flood
for x, y, sc in [(265, 430, 1.7), (1060, 330, 1.9), (3000, 300, 1.75), (1500, 1645, 1.8)]:
    new.append(prop("dead_tree", x, y, sc))

# cypress at the water's edge
for x, y, sc in [(480, 828, 1.6), (705, 788, 1.9), (2020, 726, 1.7), (2890, 1190, 1.8), (1010, 1308, 1.6)]:
    new.append(prop("cypress", x, y, sc))

# shoreline reed clumps (north edge ~735, south edge ~1250)
for gx in (450, 950, 1850, 2550):
    for _ in range(random.randint(3, 4)):
        new.append(prop("reed", gx + random.uniform(-70, 70), 735 + random.uniform(-18, 18),
                        random.uniform(1.6, 2.4)))
for gx in (700, 1550, 2050, 2850):
    for _ in range(random.randint(3, 4)):
        new.append(prop("reed", gx + random.uniform(-70, 70), 1252 + random.uniform(-16, 16),
                        random.uniform(1.6, 2.4)))

# a few extra animated water rocks in the empty corners (anim budget: 14 → 17)
new.append(water_rock(1, 230, 565))
new.append(water_rock(2, 3060, 620))
new.append(water_rock(3, 1180, 1395))

sprites.extend(n for n in new if n)
json.dump(d, open(SRC, "w"), indent=1)
print(f"region 15 dressed: +{len([n for n in new if n])} sprites, "
      f"+{len(water_strokes)} strokes, total {len(sprites)}")
