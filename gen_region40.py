#!/usr/bin/env python3
"""
Region 40 "Soul Sanctum (Ekātmālaya)" — dressing pass.

Heart of the Erased Path: Ekatmadeva himself stands here, and the two
living trees are the only green in the hidden act. Keeps every gameplay
element and adds:
  • the garden heart: a green ground disk beneath the twin trees, ringed
    with flowers and grass — life held open inside the gold dark — and ONE
    great golden halo inlaid around it (the One Soul has one ring)
  • a small halo around Ekatmadeva on the avenue, with amber attendants
  • the monastery forecourt: a paved approach from the avenue, braziers
  • colonnade rhythm: gold offerings alternating at the pillar bases,
    amber crystals beneath the murals (anchored to the JSON positions)
  • soft light-pool patches under the brazier clusters; dim gold stars
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_40.json"
random.seed(4040)

PROPS = "assets_custom/props"
GEN = "r40dress"

ANCHOR = {
    "crystal_amber": (64, 116, 32, 115),
    "brazier":       (44, 78, 22, 77),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r40_d")

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r40_d{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def base(dir_, frame, name, x, y, scale, ox, oy):
    return {
        "type": "sprite", "spriteId": sid(), "dir": dir_,
        "frames": [frame], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

def gold(x, y):   return base("Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones", f"Gold Stone {random.randint(1,6)}.png", "ware", x, y, random.uniform(0.5, 0.65), 64, 127)
def flower(x, y): return base("assest4/map_objects/2 Objects/6 Flower", f"{random.randint(1,12)}.png", "flower", x, y, 2.1, 3, 4)
def grass(x, y):  return base("assest4/next2/2 Objects/5 Grass", f"{random.randint(1,6)}.png", "grass", x, y, 2.6, 3, 6)

def stroke(color, width, pts):
    return {"type": "stroke", "gen": GEN, "stroke": color, "strokeWidth": width,
            "lineCap": "round", "lineJoin": "round", "composite": "source-over",
            "points": [round(p, 1) for p in pts]}

def ellipse_pts(cx, cy, rx, ry, n=20):
    out = []
    for i in range(n + 1):
        a = i / n * 2 * math.pi
        out += [cx + rx * math.cos(a), cy + ry * math.sin(a)]
    return out

# ── the garden heart (twin trees rooted at 1600, 1180–1230) ──────────────────
GX, GY = 1600, 1150
sprites[0:0] = [stroke("#2e4226", 150, ellipse_pts(GX, GY, 180, 105))]      # living ground
sprites.append(stroke("#7a5a16", 7, ellipse_pts(GX, GY + 30, 300, 185)))    # the ONE halo
sprites.append(stroke("#d8b24a", 3, ellipse_pts(GX, GY + 30, 300, 185)))

new = []
priority = []

for i in range(8):                                   # flower ring on the living ground
    a = i / 8 * 2 * math.pi + 0.3
    new.append(flower(GX + math.cos(a) * 150, GY + math.sin(a) * 86))
for i in range(5):
    a = i / 5 * 2 * math.pi + 1.1
    new.append(grass(GX + math.cos(a) * 200, GY + 34 + math.sin(a) * 112))
new.append(gold(GX - 110, GY + 96))
new.append(gold(GX + 116, GY + 90))

# ── Ekatmadeva's halo (NPC at 360,1000) ──────────────────────────────────────
sprites.append(stroke("#7a5a16", 5, ellipse_pts(360, 1006, 96, 52)))
sprites.append(stroke("#f4e08a", 2, ellipse_pts(360, 1006, 96, 52)))
priority.append(prop("crystal_amber", 232, 956, 0.9))
priority.append(prop("crystal_amber", 492, 952, 0.85))
new.append(gold(294, 1072))
new.append(gold(430, 1076))

# ── monastery forecourt (monastery ≈1500,370; avenue at y1000) ───────────────
monastery = next((s for s in sprites if s.get("name") == "Monastery"), None)
if monastery:
    mx = monastery["x"]
    sprites.append(stroke("#6e5a2a", 120, [mx, 980, mx, 420]))
    sprites.append(stroke("#8c7440", 64,  [mx, 980, mx, 420]))
    priority.append(prop("brazier", mx - 96, 446, 1.6))
    priority.append(prop("brazier", mx + 96, 446, 1.6))
    new.append(gold(mx - 54, 500))
    new.append(gold(mx + 58, 506))

# ── colonnade rhythm: offerings + amber beneath the murals ───────────────────
murals = [s for s in sprites if s.get("type") == "sprite" and s.get("name") == "mural"
          and not str(s.get("spriteId", "")).startswith("s_r40_d")]
for i, m in enumerate(sorted(murals, key=lambda s: s["x"])):
    new.append(gold(m["x"] - 50, m["y"] + 36))
    if i % 2 == 1:
        new.append(prop("crystal_amber", m["x"] + 58, m["y"] + 28, random.uniform(0.6, 0.75)))

pillars = [s for s in sprites if s.get("type") == "sprite" and s.get("name") == "pillar"
           and not str(s.get("spriteId", "")).startswith("s_r40_d")]
for i, p in enumerate(sorted(pillars, key=lambda s: (s["y"], s["x"]))):
    if i % 3 == 0:
        new.append(gold(p["x"] + random.choice([-38, 38]), p["y"] + 26))

# ── soft light pools beneath the avenue braziers ─────────────────────────────
braz = [s for s in sprites if s.get("type") == "sprite" and s.get("name") == "brazier"
        and not str(s.get("spriteId", "")).startswith("s_r40_d")]
pools = []
for b in braz:
    pools.append(stroke("#46381a", 90, ellipse_pts(b["x"], b["y"] + 18, 48, 26, n=12)))
first_sprite = next(i for i, s in enumerate(sprites) if s.get("type") == "sprite")
sprites[first_sprite:first_sprite] = pools

# ── dim gold stars in the dark ───────────────────────────────────────────────
random.seed(401)
for _ in range(22):
    sx_ = random.uniform(60, 3140)
    sy_ = random.uniform(60, 1940)
    if 820 < sy_ < 1200 or (1100 < sx_ < 1750 and 300 < sy_ < 900):
        continue
    sprites.append(stroke(random.choice(["#8a7434", "#5a4a26", "#d8b24a"]),
                          random.choice([3, 3, 4]), [sx_, sy_, sx_ + 1, sy_ + 1]))

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
print(f"region 40 dressed: +{len(new) + len(priority)} sprites, total {len(sprites)}")
