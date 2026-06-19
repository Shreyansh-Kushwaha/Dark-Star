#!/usr/bin/env python3
"""
Region 38 "The Severing (Sūtracheda)" — final-arena dressing pass.

The last region: the Thread lies cut in two, and the far half is visible
beyond the arena but forever unreachable. Keeps every gameplay element
(boss viyogasur at 1700,1000; the severed thread halves) and adds:
  • the severing made centre-stage: both cut ends fray toward the boss in
    dying fragments, gold sparks scatter at the wound, and a thin golden
    ring marks the severing circle on the arena floor over a void disk
  • the ritual ring completed: the north-west pillar finally gets its
    missing brazier (five of six were lit; now the circle is whole)
  • void-shard walls rim every edge of the walkable space (computed from
    the collider grid), with skulls watching from the dark
  • the Echo of the Sixth: six skulls circled around the NPC — the six
    haloed kings — with a void crystal at their centre
  • a faint, dying starfield in the unreachable dark
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, math, random

SRC = "regions/region_38.json"
random.seed(3838)

PROPS = "assets_custom/props"
GEN = "r38dress"

ANCHOR = {
    "void_shard":     (120, 86, 60, 85),
    "crystal_purple": (64, 116, 32, 115),
    "skull":          (40, 38, 20, 37),
    "bone_pile":      (84, 60, 42, 59),
    "brazier":        (44, 78, 22, 77),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r38_d")

sprites[:] = [s for s in sprites if not _ours(s)]

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r38_d{_n[0]:04d}"

def prop(name, x, y, scale=1.0):
    w, h, ox, oy = ANCHOR[name]
    return {
        "type": "sprite", "spriteId": sid(), "dir": PROPS,
        "frames": [f"{name}.png"], "name": name, "animated": False,
        "spriteLayer": "below", "x": round(x, 2), "y": round(y, 2),
        "scaleX": round(scale, 3), "scaleY": round(scale, 3),
        "offsetX": float(ox), "offsetY": oy,
    }

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

BOSS = (1700, 1000)

# ── the arena floor: void disk + the golden severing circle ──────────────────
sprites[0:0] = [
    stroke("#160a1e", 220, ellipse_pts(*BOSS, 300, 210)),
    stroke("#1e0e2a", 130, ellipse_pts(*BOSS, 170, 118)),
    stroke("#0e0512", 60,  ellipse_pts(*BOSS, 70, 46)),
]
sprites.append(stroke("#7a5a16", 5, ellipse_pts(*BOSS, 352, 246)))
sprites.append(stroke("#d8b24a", 2, ellipse_pts(*BOSS, 352, 246)))

# ── the severing: both cut ends fray toward the boss and die ─────────────────
# west end (thread stops at x1200)
for x0, x1, yy in ((1208, 1268, 1000), (1296, 1336, 996), (1360, 1382, 1004)):
    sprites.append(stroke("#d8b24a", 5, [x0, yy, x1, yy - 2]))
    sprites.append(stroke("#f4e08a", 2, [x0, yy, x1, yy - 2]))
# east end (the unreachable half, stops at x2200)
for x0, x1, yy in ((2192, 2132, 1000), (2104, 2064, 1004), (2040, 2018, 996)):
    sprites.append(stroke("#d8b24a", 5, [x0, yy, x1, yy + 2]))
    sprites.append(stroke("#f4e08a", 2, [x0, yy, x1, yy + 2]))
# gold sparks scattered at the wound
random.seed(381)
for cx in (1330, 2070):
    for _ in range(7):
        sx_ = cx + random.uniform(-70, 70)
        sy_ = 1000 + random.uniform(-60, 60)
        sprites.append(stroke("#f4e08a", random.choice([3, 4]), [sx_, sy_, sx_ + 1, sy_ + 1]))

new = []
priority = []

# ── complete the ritual ring: the missing north-west brazier ─────────────────
priority.append(prop("brazier", 1319, 750, 2.0))

# ── void-shard walls rimming the walkable space ──────────────────────────────
blocked = set((z["x"], z["y"]) for z in d["noWalkZones"])
def open_cell(cx, cy):
    return (-160 <= cy <= 1820) and (0 <= cx <= 3060) and (cx, cy) not in blocked

rim = []
for (zx, zy) in blocked:
    for dx, dy in ((180, 0), (-180, 0), (0, 180), (0, -180)):
        if open_cell(zx + dx, zy + dy):
            rim.append((zx, zy))
            break
random.seed(382)
for (zx, zy) in sorted(rim):
    new.append(prop("void_shard", zx + 91 + random.uniform(-40, 40),
                    zy + 110 + random.uniform(-30, 30), random.uniform(1.0, 1.5)))
    if random.random() < 0.3:
        new.append(prop("skull", zx + 91 + random.uniform(-50, 50),
                        zy + 160 + random.uniform(-14, 14), random.uniform(1.25, 1.45)))

# ── the Echo of the Sixth (NPC at 360,1000): six kings in a circle ───────────
for i in range(6):
    a = i / 6 * 2 * math.pi - math.pi / 2
    new.append(prop("skull", 360 + math.cos(a) * 110, 1006 + math.sin(a) * 68, 1.4))
priority.append(prop("crystal_purple", 360, 922, 0.9))

# ── approach lights: purple pairs along the west corridor ────────────────────
for cx in (640, 980):
    priority.append(prop("crystal_purple", cx, 906, 0.85))
    new.append(prop("crystal_purple", cx + 70, 1098, 0.6))
new.append(prop("bone_pile", 1140, 1090, 1.2))

# ── a faint, dying starfield in the unreachable dark ─────────────────────────
random.seed(383)
for _ in range(26):
    sx_ = random.uniform(60, 3140)
    sy_ = random.uniform(60, 1940)
    if 840 < sy_ < 1180 or (1200 < sx_ < 2200 and 480 < sy_ < 1400):
        continue
    sprites.append(stroke(random.choice(["#3a4458", "#4a5468", "#8a7434"]),
                          random.choice([3, 3, 4]), [sx_, sy_, sx_ + 1, sy_ + 1]))

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
print(f"region 38 dressed: +{len(new) + len(priority)} sprites, total {len(sprites)}")
