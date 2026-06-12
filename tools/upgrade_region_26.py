#!/usr/bin/env python3
"""Visual upgrade for region 26 (Wind Cliffs / Vāyupatha) — windswept crags.

Rebuilds only the `sprites` array (keeps enemies/npcs/portals/etc).
A high, wind-blasted cliff traverse: solid rock cliff-masses and towering spires
linked by precarious plank bridges over chasm gaps, with clouds and feathers
streaming sideways, whipping banners, and a great cliff-face carving of the
cast-down winged god. Deterministic (fixed seed). Uses per-sprite `alpha`.
"""
import json, math, os, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "regions", "region_26.json")
rng = random.Random(2606)

PROPS  = "assets_custom/props"
SAND   = "assets_custom/rocks_sand"     # tan crag rock
VOID   = "assets_custom/rocks_void"     # darker foreground rock
STRUCT = "assets_custom/structures"
CLOUD  = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Clouds"
FLAGD  = "assest4/map_objects/3 Animated Objects/1 Flag"

W, H = 3200, 2000
OFF = {
    "Clouds_01.png": (288, 128), "brazier.png": (22, 77), "mural.png": (70, 99),
    "bridge_deck.png": (80, 60), "pillar.png": (30, 195),
    "Rock1.png": (32, 63), "Rock2.png": (32, 63), "Rock3.png": (32, 63), "Rock4.png": (32, 63),
}

_id = 0
sprites = []

def sid():
    global _id; _id += 1
    return f"s_r26_{_id:04d}"

def sprite(dir_, frame, x, y, sx, sy=None, name=None, off=None, alpha=None,
           animated=False, frames=None):
    o = off or OFF.get(frame, (16, 16))
    s = {"type": "sprite", "spriteId": sid(), "dir": dir_, "frames": frames or [frame],
         "name": name if name is not None else frame.rsplit('.', 1)[0],
         "animated": animated, "spriteLayer": "below",
         "x": round(x, 2), "y": round(y, 2),
         "scaleX": round(sx, 3), "scaleY": round(sy if sy is not None else sx, 3),
         "offsetX": o[0], "offsetY": o[1]}
    if alpha is not None:
        s["alpha"] = round(alpha, 3)
    sprites.append(s)

def stroke(color, w, pts, comp="source-over"):
    sprites.append({"type": "stroke", "stroke": color, "strokeWidth": w,
                    "lineCap": "round", "lineJoin": "round",
                    "composite": comp, "points": [round(p, 1) for p in pts]})

def rock(frame=None):
    return frame or rng.choice(["Rock1.png", "Rock2.png", "Rock3.png", "Rock4.png"])

def cloud(x, y, sx, sy, a):
    sprite(CLOUD, "Clouds_01.png", x, y, sx, sy=sy, name="Clouds_01", alpha=a)

# The wind-blasted trail height (undulating, drifts up to the right).
def py(x):
    t = max(0.0, min(1.0, (x - 120) / 2970.0))
    return 1040 - 90 * t + 45 * math.sin(x / 620.0)

PLATS  = [(40, 620), (860, 1460), (1700, 2260), (2500, 3200)]   # cliff platforms
BRIDGES = [(620, 860), (1460, 1700), (2260, 2500)]              # chasm spans

# ── 1. FAINT CONNECTING TRAIL (mostly hidden; shows as a hint across gaps) ────
trail = [v for x in range(0, 3201, 50) for v in (x, py(x))]
stroke("#574d40", 70, trail)

# ── 2. BACKGROUND: streaming wind clouds + distant faint spires (depth) ───────
# Distant faint bluish spires high in the haze (atmospheric perspective).
for _ in range(9):
    bx = rng.uniform(150, 3050); base_y = rng.uniform(620, 820)
    n = rng.randint(3, 5); a = rng.uniform(0.22, 0.40); s0 = rng.uniform(1.3, 1.9)
    for i in range(n):
        sprite(SAND, rock(), bx + rng.uniform(-18, 18), base_y - i * 46,
               s0 * (1 - i / (n * 1.5)), alpha=a, name="Rock")
# Wind-streaked clouds (stretched wide) drifting across the sky at varied depth.
for _ in range(30):
    x = rng.uniform(-60, 3260); y = rng.uniform(40, 1900)
    near = rng.random()
    sprite(CLOUD, "Clouds_01.png", x, y,
           rng.uniform(0.7, 1.15), sy=rng.uniform(0.34, 0.52),
           name="Clouds_01", alpha=0.25 + near * 0.6)
# Low horizontal wind-haze bands.
for _ in range(6):
    cloud(rng.uniform(200, 3000), rng.uniform(120, 1850), rng.uniform(1.2, 1.8), 0.4, rng.uniform(0.12, 0.22))

# ── 3. CLIFF MASSES under each platform (rocky body tapering into the void) ───
def cliff_mass(x0, x1, dark=False):
    d = VOID if dark else SAND
    step = 58
    x = x0
    while x <= x1:
        p = py(x)
        sprite(d, rock(), x, p + 30, rng.uniform(2.2, 2.8), name="Rock")          # top ledge
        rows = rng.randint(3, 5)
        for r in range(1, rows):
            inset = r * 46
            if x < x0 + inset or x > x1 - inset:
                continue                                                          # taper inward going down
            sprite(d, rock(), x + rng.uniform(-16, 16), p + 30 + r * 52,
                   rng.uniform(2.4, 2.9) * (1 - r * 0.13), name="Rock")
        x += step
for x0, x1 in PLATS:
    cliff_mass(x0, x1)

# ── 4. PRECARIOUS PLANK BRIDGES over the chasms (with sag + support posts) ────
def bridge(x0, x1):
    mid = (x0 + x1) / 2.0; half = (x1 - x0) / 2.0
    x = x0 - 10
    while x <= x1 + 10:
        t = (x - mid) / half
        sag = 44 * (1 - t * t)                                                    # rope-bridge dip
        sprite(STRUCT, "bridge_deck.png", x, py(x) + sag, 1.2, name="bridge_deck")
        x += 118
    for sx in (x0 + 20, x1 - 20):                                                 # support posts from below
        sprite(PROPS, "pillar.png", sx, py(sx) + 196, 1.1, name="pillar")
for x0, x1 in BRIDGES:
    bridge(x0, x1)

# ── 5. SPIRES rising beside the trail (stacked tapering rock pinnacles) ───────
def spire(x, base_y, n, s0, alpha=None, dark=False):
    d = VOID if dark else SAND
    for i in range(n):
        sprite(d, rock(), x + rng.uniform(-14, 14), base_y - i * 48,
               max(0.6, s0 * (1 - i / (n * 1.4))), alpha=alpha, name="Rock")
for x in (430, 1330, 2080, 2820):
    spire(x, py(x) - 40, rng.randint(5, 7), rng.uniform(2.0, 2.5))
# a couple of bold dark foreground crags at the bottom edge (full alpha, large)
for x in (700, 1900, 2950):
    spire(x, 1980, rng.randint(3, 4), rng.uniform(2.6, 3.0), dark=True)

# ── 6. THE FALLING-GOD CARVING (great cliff-face relief, centre platform) ─────
cx = 1100
# a tall rock wall backdrop for the relief (upper + lower bands, clear middle)
for yy in list(range(560, 690, 50)) + list(range(840, 970, 50)):
    for xx in range(cx - 150, cx + 151, 60):
        sprite(SAND, rock(), xx + rng.uniform(-14, 14), yy + rng.uniform(-10, 10),
               rng.uniform(2.4, 2.9), name="Rock")
sprite(PROPS, "mural.png", cx, 770, 3.1, name="mural")                            # the cast-down winged god
sprite(PROPS, "brazier.png", cx - 175, 815, 2.2, name="brazier")
sprite(PROPS, "brazier.png", cx + 175, 815, 2.2, name="brazier")

# ── 7. WIND: whipping banners on the cliff edges ──────────────────────────────
FLAG = ["1.png", "2.png", "3.png", "4.png", "5.png"]
for x in (320, 980, 1560, 2180, 2760):
    sprite(FLAGD, "1.png", x, py(x) - 8, 1.5, name="1", animated=True, frames=FLAG, off=(96, 63))

# ── 8. A couple more beacons + blown rubble caught on ledges ──────────────────
for x in (560, 2400):
    sprite(PROPS, "brazier.png", x, py(x) - 4, 2.1, name="brazier")
for _ in range(14):                                                               # small wind-blown rubble on ledges
    x0, x1 = rng.choice(PLATS)
    x = rng.uniform(x0 + 40, x1 - 40)
    sprite(SAND, rock(), x, py(x) + rng.uniform(-6, 14), rng.uniform(0.9, 1.4), name="Rock")

# ── WRITE ─────────────────────────────────────────────────────────────────────
data = json.load(open(PATH))
data["sprites"] = sprites
json.dump(data, open(PATH, "w"), indent=1, ensure_ascii=False)
print(f"region_26.json rebuilt: {sum(1 for s in sprites if s['type']=='sprite')} images, "
      f"{sum(1 for s in sprites if s['type']=='stroke')} strokes")
