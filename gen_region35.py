#!/usr/bin/env python3
"""
Region 35 "Torn Land (Chidrabhūmi)" — dressing pass.

Act VI opener: the player walks INSIDE the glowing rift seam. Fixes the
data bugs and gives the tear its edges:
  • fixes: drops 73 exact-duplicate strokes and 3 duplicate enemy spawns
  • torn edges: the void shards are re-laid as bristling walls along both
    rift faces (dense shard rows at the lip, mass behind), with the dark
    rocks as deeper rubble — the tear finally has anatomy
  • golden stitches: three thread-lines cross the seam, trying to hold it
    — the broken Thread of the story made visible
  • the Severed Soul's vignette: split crystal pair, skulls, dead snags
  • east threshold to the Severance: a void-shard gate with amber hints
Idempotent and deterministic: re-running replaces exactly what it added.
"""
import json, random

SRC = "regions/region_35.json"
random.seed(3535)

PROPS = "assets_custom/props"
GEN = "r35dress"

ANCHOR = {
    "void_shard":     (120, 86, 60, 85),
    "crystal_purple": (64, 116, 32, 115),
    "crystal_amber":  (64, 116, 32, 115),
    "skull":          (40, 38, 20, 37),
    "bone_pile":      (84, 60, 42, 59),
    "dead_tree":      (96, 132, 48, 131),
}

d = json.load(open(SRC))
sprites = d["sprites"]

# ── idempotency: drop everything a previous run added ────────────────────────
def _ours(s):
    sid_ = str(s.get("spriteId", ""))
    if s.get("gen") == GEN:
        return True
    return sid_.startswith("s_r35_d")

sprites[:] = [s for s in sprites if not _ours(s)]

# ── fixes: exact-duplicate strokes and enemies ───────────────────────────────
seen, dedup = set(), []
for s in sprites:
    if s.get("type") == "stroke":
        key = (s["stroke"], s["strokeWidth"], tuple(s["points"]))
        if key in seen:
            continue
        seen.add(key)
    dedup.append(s)
sprites[:] = dedup

eseen, edd = set(), []
for e in d["enemies"]:
    key = (e.get("type"), e.get("x"), e.get("y"))
    if key in eseen:
        continue
    eseen.add(key)
    edd.append(e)
d["enemies"] = edd

_n = [0]
def sid():
    _n[0] += 1
    return f"s_r35_d{_n[0]:04d}"

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

# ── torn edges: re-lay the shards as walls along the rift faces ──────────────
sprites[:] = [s for s in sprites if not (
    s.get("type") == "sprite" and s.get("name") == "void_shard")]

tops, bots = {}, {}
for z in d["noWalkZones"]:
    if z["y"] < 0:
        tops[z["x"]] = z["y"] + z["h"]
    else:
        bots[z["x"]] = z["y"]

new = []
priority = []

for k in range(0, 3200, 200):
    yface_t, yface_b = tops.get(k), bots.get(k)
    if yface_t:
        # the rift lip bristles with shards
        for fx in range(k + 30, k + 200, 62):
            new.append(prop("void_shard", fx + random.uniform(-16, 16),
                            yface_t - random.uniform(0, 44), random.uniform(0.9, 1.3)))
        # mass behind: shards + purple glints thinning into the dark
        for _ in range(3):
            new.append(prop("void_shard", k + random.uniform(10, 190),
                            yface_t - random.uniform(70, 360), random.uniform(1.0, 1.5)))
        if random.random() < 0.45:
            new.append(prop("crystal_purple", k + random.uniform(20, 180),
                            yface_t - random.uniform(60, 300), random.uniform(0.7, 1.0)))
    if yface_b:
        for fx in range(k + 30, k + 200, 62):
            new.append(prop("void_shard", fx + random.uniform(-16, 16),
                            yface_b + random.uniform(60, 110), random.uniform(0.9, 1.3)))
        for _ in range(3):
            new.append(prop("void_shard", k + random.uniform(10, 190),
                            yface_b + random.uniform(140, 460), random.uniform(1.0, 1.5)))
        if random.random() < 0.45:
            new.append(prop("crystal_purple", k + random.uniform(20, 180),
                            yface_b + random.uniform(120, 380), random.uniform(0.7, 1.0)))

# ── golden stitches: the Thread trying to hold the tear ──────────────────────
for sx_ in (820, 1760, 2660):
    cy = (tops.get(sx_ // 200 * 200, 900) + bots.get(sx_ // 200 * 200, 1100)) / 2
    pts = []
    y = cy - 210
    x = sx_
    while y < cy + 215:
        pts += [x, y]
        x += random.choice([-34, 34])
        y += 70
    sprites.append(stroke("#caa44a", 7, pts))
    sprites.append(stroke("#e8c860", 3, pts))

# ── the Severed Soul (NPC at 340,1085) ───────────────────────────────────────
priority.append(prop("crystal_purple", 226, 1042, 1.05))
priority.append(prop("crystal_purple", 452, 1036, 1.0))
new.append(prop("skull", 286, 1148, 1.4))
new.append(prop("skull", 396, 1152, 1.35))
new.append(prop("dead_tree", 180, 950, 1.5))

# ── east threshold: void gate before the Severance (portal 3090,954) ─────────
priority.append(prop("void_shard", 2950, 880, 1.6))
priority.append(prop("void_shard", 2952, 1064, 1.55))
priority.append(prop("crystal_amber", 2880, 1010, 0.8))
new.append(prop("skull", 3010, 1010, 1.35))
new.append(prop("bone_pile", 2880, 920, 1.2))

sprites[0:0] = priority
sprites.extend(new)
json.dump(d, open(SRC, "w"), indent=1)
strokes = sum(1 for s in sprites if s.get("type") == "stroke")
print(f"region 35 dressed: +{len(new) + len(priority)} sprites, strokes {strokes} (dupes dropped), "
      f"enemies {len(d['enemies'])} (dupes dropped), total {len(sprites)}")
