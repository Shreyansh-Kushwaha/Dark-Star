#!/usr/bin/env python3
"""Visual upgrade for region 25 (Cloud Stair / Meghasopāna) — serene skyscape.

Rebuilds only the `sprites` array (keeps enemies/npcs/portals/etc).
Calm, vast, meditative sky ascent: a gentle diagonal stair of cloud steps from
the lower-left back-portal to the upper-right next-portal, set in a deep layered
cloudscape with soft light, updrafts, and a modest summit shrine hinting at the
five (and the empty sixth) thrones. Deterministic (fixed seed).

Uses per-sprite `alpha` (renderer support added in GameScene + map_editor).
"""
import json, math, os, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "regions", "region_25.json")
rng = random.Random(2506)

PROPS = "assets_custom/props"
CLOUD = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Clouds"
GOLD  = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones"
FLAGD = "assest4/map_objects/3 Animated Objects/1 Flag"

W, H = 3200, 2000
BACK, NEXT = (120, 1374), (3090, 600)   # ascent runs lower-left → upper-right

OFF = {
    "cloud_platform.png": (110, 52), "Clouds_01.png": (288, 128),
    "gate_arch.png": (118, 220), "pillar.png": (30, 195), "brazier.png": (22, 77),
    "crystal_amber.png": (32, 112), "crystal_cyan.png": (32, 112), "mural.png": (70, 99),
}
GOLD_OFF = (64, 127)

_id = 0
sprites = []

def sid():
    global _id; _id += 1
    return f"s_r25_{_id:04d}"

def sprite(dir_, frame, x, y, sx, sy=None, name=None, off=None, alpha=None,
           animated=False, frames=None):
    s = {
        "type": "sprite", "spriteId": sid(), "dir": dir_, "frames": frames or [frame],
        "name": name if name is not None else frame.rsplit('.', 1)[0],
        "animated": animated, "spriteLayer": "below",
        "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(sx, 3), "scaleY": round(sy if sy is not None else sx, 3),
        "offsetX": (off or OFF.get(frame, (16, 16)))[0],
        "offsetY": (off or OFF.get(frame, (16, 16)))[1],
    }
    if alpha is not None:
        s["alpha"] = round(alpha, 3)
    sprites.append(s)

def stroke(color, w, pts, comp="source-over"):
    sprites.append({"type": "stroke", "stroke": color, "strokeWidth": w,
                    "lineCap": "round", "lineJoin": "round",
                    "composite": comp, "points": [round(p, 1) for p in pts]})

def cloud(x, y, s, a):
    sprite(CLOUD, "Clouds_01.png", x, y, s, name="Clouds_01", alpha=a)

# Height of the ascent line at a given x (gentle curve, lower-left → upper-right).
def stair_y(x):
    t = (x - BACK[0]) / float(NEXT[0] - BACK[0])
    t = max(0.0, min(1.0, t))
    base = BACK[1] + (NEXT[1] - BACK[1]) * t
    return base + 70 * math.sin(t * math.pi * 1.6)   # soft undulation

# ── 1. SOFT LUMINOUS HAZE (large, very faint white clouds = a glow of light) ──
# Stroke-based "lighter" beams don't brighten against the sky (strokes composite
# only among themselves), so light is conveyed with faint white cloud haze.
# Bright halo gathering around the upper-right summit.
for _ in range(7):
    cloud(rng.uniform(2280, 3160), rng.uniform(120, 640),
          rng.uniform(1.1, 1.9), rng.uniform(0.10, 0.20))
# A gentle high haze across the top of the sky.
for _ in range(9):
    cloud(rng.uniform(150, 3050), rng.uniform(60, 420),
          rng.uniform(0.8, 1.4), rng.uniform(0.08, 0.18))

# ── 2. DEEP LAYERED CLOUDSCAPE (size + alpha = depth) ─────────────────────────
# Far haze: many tiny faint clouds high in the sky.
for _ in range(26):
    cloud(rng.uniform(40, 3160), rng.uniform(60, 1100),
          rng.uniform(0.22, 0.42), rng.uniform(0.30, 0.55))
# Mid clouds drifting across the whole canvas.
for _ in range(20):
    cloud(rng.uniform(20, 3180), rng.uniform(120, 1860),
          rng.uniform(0.45, 0.72), rng.uniform(0.55, 0.80))
# Near, soft foreground clouds along the lower edges (frame the scene).
for _ in range(10):
    x = rng.uniform(40, 3160)
    y = rng.choice([rng.uniform(1620, 1900), rng.uniform(80, 240)])
    cloud(x, y, rng.uniform(0.85, 1.20), rng.uniform(0.78, 0.95))

# ── 3. THE CLOUD STAIR (gentle ascending steps) ───────────────────────────────
N = 24
xs = [BACK[0] + (NEXT[0] - BACK[0]) * (k / (N - 1)) for k in range(N)]
for k, x in enumerate(xs):
    y = stair_y(x)
    s = rng.uniform(0.95, 1.28)
    sprite(PROPS, "cloud_platform.png", x, y, s, name="cloud_platform")
    # soft cloud tufts hugging each step so edges read as billowing cloud
    for _ in range(2):
        cloud(x + rng.uniform(-70, 70), y + rng.uniform(-10, 30),
              rng.uniform(0.40, 0.62), rng.uniform(0.70, 0.92))
    # occasional faint extra step-puff just below, suggesting depth
    if rng.random() < 0.5:
        cloud(x + rng.uniform(-40, 40), y + rng.uniform(60, 120),
              rng.uniform(0.30, 0.5), rng.uniform(0.35, 0.55))

# ── 4. UPDRAFTS (faint columns of rising cloud wisps between the steps) ───────
for k in range(2, N - 2, 2):
    x = (xs[k] + xs[k + 1]) / 2 + rng.uniform(-30, 30)
    y = stair_y(x)
    for j in range(3):   # stacked wisps thinning as they rise = an updraft column
        cloud(x + rng.uniform(-22, 22), y - 70 - j * 130,
              rng.uniform(0.30, 0.42) * (1 - j * 0.16),
              rng.uniform(0.40, 0.55) * (1 - j * 0.18))

# ── 5. SPARSE BEACONS along the ascent ────────────────────────────────────────
for frac in (0.18, 0.46, 0.74):
    x = BACK[0] + (NEXT[0] - BACK[0]) * frac
    y = stair_y(x)
    sprite(PROPS, "brazier.png", x + rng.uniform(-20, 20), y - 6, 2.3, name="brazier")
# one quiet banner mid-climb
bx = BACK[0] + (NEXT[0] - BACK[0]) * 0.60
sprite(FLAGD, "1.png", bx, stair_y(bx) - 10, 1.5, name="1", animated=True,
       frames=["1.png", "2.png", "3.png", "4.png", "5.png"], off=(96, 63))

# ── 6. MODEST SUMMIT SHRINE (top-right, left of the exit portal) ──────────────
sx0, sy0 = 2760, stair_y(2760)
sprite(PROPS, "gate_arch.png", sx0, sy0 - 30, 1.15, name="gate_arch")     # quiet sky-gate (glows)
# five throne seats (pillars) + a pointed gap where the sixth should be
seat_x = [sx0 - 250, sx0 - 130, sx0 + 120, sx0 + 240, sx0 + 360]          # gap at sx0 (sixth)
for i, px in enumerate(seat_x):
    sprite(PROPS, "pillar.png", px, sy0 + 30 + (abs(i - 2) * 4), rng.uniform(0.55, 0.62), name="pillar")
sprite(PROPS, "mural.png", sx0, sy0 - 70, 1.4, name="mural")              # throne relief
sprite(PROPS, "brazier.png", sx0 - 300, sy0 + 36, 2.0, name="brazier")
sprite(PROPS, "brazier.png", sx0 + 300, sy0 + 36, 2.0, name="brazier")
# a couple soft clouds cradling the summit
for _ in range(4):
    cloud(sx0 + rng.uniform(-260, 320), sy0 + rng.uniform(-40, 90),
          rng.uniform(0.55, 0.85), rng.uniform(0.6, 0.85))

# ── 7. LIGHT DRESSING: gold offerings, light-crystals, a few fallen steps ─────
# Gold offerings clustered on three landings.
for frac in (0.10, 0.40, 0.70):
    x = BACK[0] + (NEXT[0] - BACK[0]) * frac
    y = stair_y(x)
    for f in rng.sample(["Gold Stone 1.png", "Gold Stone 4.png", "Gold Stone 5.png", "Gold Stone 6.png"], 2):
        sprite(GOLD, f, x + rng.uniform(-40, 50), y + rng.uniform(-6, 18),
               rng.uniform(0.6, 0.8), name=f[:-4], off=GOLD_OFF)
# Cooling-light crystals near the summit and one mid-climb.
for cx, cy in [(sx0 - 170, sy0 + 10), (sx0 + 200, sy0 + 12),
               (xs[10], stair_y(xs[10]) + 8)]:
    sprite(PROPS, rng.choice(["crystal_amber.png", "crystal_cyan.png"]),
           cx + rng.uniform(-20, 20), cy, rng.uniform(0.7, 0.95))
# Gold at the summit base as an offering to the thrones.
for _ in range(3):
    sprite(GOLD, rng.choice(["Gold Stone 1.png", "Gold Stone 5.png", "Gold Stone 6.png"]),
           sx0 + rng.uniform(-120, 120), sy0 + rng.uniform(40, 80),
           rng.uniform(0.6, 0.78), name="Gold Stone", off=GOLD_OFF)

# ── WRITE ─────────────────────────────────────────────────────────────────────
data = json.load(open(PATH))
data["sprites"] = sprites
json.dump(data, open(PATH, "w"), indent=1, ensure_ascii=False)
print(f"region_25.json rebuilt: {sum(1 for s in sprites if s['type']=='sprite')} images, "
      f"{sum(1 for s in sprites if s['type']=='stroke')} strokes")
