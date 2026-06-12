#!/usr/bin/env python3
"""Densify genuinely under-populated EXPLORATION regions in Akhand Sutra.

Most regions are already richly built (200-800 props). A handful of combat/
exploration regions are visibly bare. This script AUGMENTS those — it loads the
existing region JSON, preserves every existing sprite/enemy/NPC/portal/boss, and
appends biome-appropriate decorative props (and a few enemies for non-hub combat
regions) into the empty top/bottom thirds, keeping clear:
  - the spawn approach (left edge),
  - every portal / NPC,
  - a central traversal+combat corridor,
  - (boss arenas) a large open fight area in the middle.

Deterministic (fixed seed per region). Re-running is idempotent-ish: it tags
added sprites with spriteId prefix 's_dnsfy_' and strips any previous ones first,
so the script can be tuned and re-run without compounding.

Targets (thin exploration regions only — NOT hubs, narrative, or boss-climax):
  R20 Copper Bazaar (busy market, decorative only)
  R21 Glass Desert
  R28 Frostpeak
  R30 Storm's Eye  (boss arena — perimeter atmosphere only, center kept open)
  R35 Torn Land
"""
import json, math, os, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REG  = os.path.join(ROOT, "regions")
W, H = 3200, 2000
TAG  = "s_dnsfy_"

# ── proven asset references (dir, default offset) — copied from existing JSON ──
PROPS  = "assets_custom/props"
SAND   = "assets_custom/rocks_sand"
BASALT = "assets_custom/rocks_basalt"
VOID   = "assets_custom/rocks_void"
CLOUD  = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Clouds"
GOLD   = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones"
TENT   = "assest4/next2/2 Objects/6 Tent"
BOX    = "assest4/next2/2 Objects/4 Box"
FENCE  = "assest4/map_objects/2 Objects/2 Fence"
DECOR  = "assest4/map_objects/2 Objects/7 Decor"
FLAGD  = "assest4/map_objects/3 Animated Objects/1 Flag"
GRASS  = "assest4/next2/2 Objects/5 Grass"

OFF = {
    "cactus.png": (24, 91), "crystal_cyan.png": (32, 115), "crystal_purple.png": (32, 115),
    "crystal_amber.png": (32, 112), "ice_shard.png": (26, 115), "void_shard.png": (60, 43),
    "dead_tree.png": (48, 131), "skull.png": (20, 37), "bone_pile.png": (42, 59),
    "cloud_platform.png": (110, 52), "pillar.png": (30, 195), "reed.png": (17, 73),
    "scarecrow.png": (28, 103), "lava_rock.png": (36, 55), "brazier.png": (22, 77),
    "Clouds_01.png": (288, 128),
    "Rock1.png": (32, 63), "Rock2.png": (32, 63), "Rock3.png": (32, 63), "Rock4.png": (32, 63),
    "Lamp1.png": (10, 34), "Lamp2.png": (5.5, 34), "Lamp3.png": (6.5, 34),
}
GOLD_OFF = (64, 127); FLAG_OFF = (96, 63); BOX_OFF = (10, 21); GRASS_OFF = (3, 6)
TENT_OFF = (32, 60); FENCE_OFF = (13, 16)
FLAG_FR = ["1.png", "2.png", "3.png", "4.png", "5.png"]
ROCKDIR = {"sand": SAND, "basalt": BASALT, "void": VOID}


class Aug:
    def __init__(self, idx, seed, avoid, clear_central=True, arena=None):
        self.idx = idx; self.rng = random.Random(seed); self.n = 0; self.added = []
        self.avoid = avoid            # list of (x, y, radius)
        self.clear_central = clear_central
        self.arena = arena            # (x, y, radius) kept fully open (boss fight)

    def _ok(self, x, y):
        if x < 90 or x > W - 90 or y < 110 or y > H - 110:
            return False
        for (ax, ay, ar) in self.avoid:
            if (x - ax) ** 2 + (y - ay) ** 2 < ar * ar:
                return False
        if self.arena:
            ax, ay, ar = self.arena
            if (x - ax) ** 2 + (y - ay) ** 2 < ar * ar:
                return False
        return True

    def sid(self):
        self.n += 1; return f"{TAG}{self.idx}_{self.n:04d}"

    def sp(self, dir_, frame, x, y, sx, sy=None, name=None, off=None, alpha=None,
           animated=False, frames=None):
        if not self._ok(x, y):
            return False
        o = off or OFF.get(frame, (16, 16))
        s = {"type": "sprite", "spriteId": self.sid(), "dir": dir_,
             "frames": frames or [frame],
             "name": name if name is not None else frame.rsplit('.', 1)[0],
             "animated": animated, "spriteLayer": "below",
             "x": round(x, 2), "y": round(y, 2),
             "scaleX": round(sx, 3), "scaleY": round(sy if sy is not None else sx, 3),
             "offsetX": o[0], "offsetY": o[1]}
        if alpha is not None:
            s["alpha"] = round(alpha, 3)
        self.added.append(s)
        return True

    def stroke(self, color, w, pts, comp="source-over"):
        self.added.append({"type": "stroke", "stroke": color, "strokeWidth": w,
                           "lineCap": "round", "lineJoin": "round", "composite": comp,
                           "points": [round(p, 1) for p in pts]})

    # bands: scatter mostly into the empty top/bottom thirds; lighter in the middle.
    def _band_y(self):
        if self.clear_central:
            if self.rng.random() < 0.5:
                return self.rng.uniform(180, 760)
            return self.rng.uniform(1240, 1860)
        return self.rng.uniform(180, 1860)

    def scatter(self, fn, n, tries_each=6):
        placed = 0
        for _ in range(n):
            for _ in range(tries_each):
                if fn():
                    placed += 1
                    break
        return placed

    # ── biome helpers ────────────────────────────────────────────────────────
    def mottle(self, tones, n, yband=None, wr=(60, 150)):
        for _ in range(n):
            cx = self.rng.uniform(140, 3060)
            cy = self.rng.uniform(*(yband or (160, 1840)))
            spread = self.rng.uniform(60, 150); pts = []
            for _ in range(self.rng.randint(3, 5)):
                pts += [cx + self.rng.uniform(-spread, spread),
                        cy + self.rng.uniform(-spread * 0.6, spread * 0.6)]
            self.stroke(self.rng.choice(tones), self.rng.uniform(*wr), pts)

    def vein(self, x0, y0, n, base_w, core_w, base_c, core_c, step=80, jit=22,
             tip_c=None, tip_w=0):
        ang = self.rng.uniform(0, 2 * math.pi); x, y = x0, y0; pts = [x, y]
        for _ in range(n):
            ang += self.rng.uniform(-0.55, 0.55)
            x += math.cos(ang) * step + self.rng.uniform(-jit, jit)
            y += math.sin(ang) * step + self.rng.uniform(-jit, jit)
            pts += [max(60, min(3140, x)), max(100, min(1900, y))]
        self.stroke(base_c, base_w, pts); self.stroke(core_c, core_w, pts)
        if tip_c:
            self.stroke(tip_c, tip_w, pts)

    def rocks(self, kind, n, sxr, clump=2, alpha=None):
        dir_ = ROCKDIR[kind]
        def one():
            cx = self.rng.uniform(140, 3060); cy = self._band_y(); any_ok = False
            for _ in range(clump):
                f = self.rng.choice(["Rock1.png", "Rock2.png", "Rock3.png", "Rock4.png"])
                if self.sp(dir_, f, cx + self.rng.uniform(-55, 55),
                           cy + self.rng.uniform(-40, 40), self.rng.uniform(*sxr),
                           name="Rock", alpha=alpha):
                    any_ok = True
            return any_ok
        return self.scatter(one, n)

    def prop(self, frame, n, sxr, yband=None, alpha=None, dir_=PROPS, name=None):
        def one():
            x = self.rng.uniform(160, 3040)
            y = self.rng.uniform(*yband) if yband else self._band_y()
            return self.sp(dir_, frame, x, y, self.rng.uniform(*sxr),
                           name=name or frame[:-4], alpha=alpha)
        return self.scatter(one, n)

    def clouds(self, n, yband=(50, 760), sxr=(0.4, 1.2), ar=(0.25, 0.7)):
        def one():
            return self.sp(CLOUD, "Clouds_01.png", self.rng.uniform(-30, 3230),
                           self.rng.uniform(*yband), self.rng.uniform(*sxr),
                           sy=self.rng.uniform(*sxr) * 0.55, name="Clouds_01",
                           alpha=self.rng.uniform(*ar))
        return self.scatter(one, n, tries_each=3)


def load(idx):
    return json.load(open(os.path.join(REG, f"region_{idx}.json")))


def save(idx, d, aug):
    # strip any previous densifier output, then append fresh
    d["sprites"] = [s for s in d.get("sprites", [])
                    if not str(s.get("spriteId", "")).startswith(TAG)]
    d["sprites"].extend(aug.added)
    json.dump(d, open(os.path.join(REG, f"region_{idx}.json"), "w"),
              indent=1, ensure_ascii=False)
    n_sp = sum(1 for s in aug.added if s["type"] == "sprite")
    n_st = sum(1 for s in aug.added if s["type"] == "stroke")
    total = sum(1 for s in d["sprites"] if s["type"] == "sprite")
    return n_sp, n_st, total


def avoid_for(d, extra=None, npc_r=140, portal_r=210, spawn=(380, 1000), spawn_r=300):
    av = [(spawn[0], spawn[1], spawn_r)]
    for p in d.get("portals", []):
        av.append((p.get("x", 0), p.get("y", 0), portal_r))
    for n in d.get("npcs", []):
        av.append((n.get("x", 0), n.get("y", 0), npc_r))
    if extra:
        av.extend(extra)
    return av


def add_enemies(d, specs):
    base = d.setdefault("enemies", [])
    i = len(base) + 1
    for (t, x, y) in specs:
        base.append({"id": f"e_dnsfy_{i}", "type": t, "x": x, "y": y})
        i += 1


# ══════════════════════════════════════════════════════════════════════════════
def do_r20():  # Copper Bazaar — a market HUB; make it BUSTLE. decorative only.
    d = load(20)
    a = Aug(20, 2001, avoid_for(d), clear_central=True)
    a.mottle(["#6e5230", "#7e603a", "#5e4628", "#8a6c42"], 26, wr=(70, 160))  # dusty ground
    # market stalls: tent + crates + a lamp, scattered through the quarter
    for (sx, sy) in [(640, 560), (980, 1500), (1500, 540), (2050, 1520),
                     (2500, 600), (2750, 1460), (1250, 1560), (1900, 560)]:
        if not a._ok(sx, sy):
            continue
        a.sp(TENT, a.rng.choice(["1.png", "2.png", "3.png", "4.png"]), sx, sy,
             a.rng.uniform(1.4, 1.75), name="tent", off=TENT_OFF)
        for _ in range(a.rng.randint(2, 4)):
            a.sp(BOX, a.rng.choice(["1.png", "2.png", "3.png", "4.png"]),
                 sx + a.rng.uniform(-90, 90), sy + a.rng.uniform(40, 95), 2.1,
                 name="crate", off=BOX_OFF)
        a.sp(DECOR, a.rng.choice(["Lamp1.png", "Lamp2.png", "Lamp3.png"]),
             sx + a.rng.uniform(-110, 110), sy - a.rng.uniform(10, 40),
             a.rng.uniform(1.3, 1.7), name="lamp")
    # fence runs marking the rows
    for _ in range(7):
        x0 = a.rng.uniform(300, 2600); y0 = a._band_y()
        for k in range(a.rng.randint(3, 6)):
            a.sp(FENCE, a.rng.choice(["1.png", "2.png", "3.png", "4.png", "8.png"]),
                 x0 + k * 46, y0, 2.0, name="fence", off=FENCE_OFF)
    # banners, copper-stone wares glint, cacti, dust rocks, grass
    for (fx, fy) in [(820, 520), (1700, 520), (2300, 1540), (1150, 1540)]:
        if a._ok(fx, fy):
            a.sp(FLAGD, "1.png", fx, fy, 1.4, name="banner", animated=True,
                 frames=FLAG_FR, off=FLAG_OFF)
    a.scatter(lambda: a.sp(GOLD, a.rng.choice(["Gold Stone 1.png", "Gold Stone 4.png",
              "Gold Stone 5.png", "Gold Stone 6.png"]), a.rng.uniform(300, 2900),
              a._band_y(), a.rng.uniform(0.6, 0.85), name="ware", off=GOLD_OFF), 12)
    a.prop("cactus.png", 12, (1.2, 1.8))
    a.rocks("sand", 12, (1.1, 1.9))
    a.scatter(lambda: a.sp(GRASS, a.rng.choice(["1.png", "2.png", "4.png", "6.png"]),
              a.rng.uniform(160, 3040), a._band_y(), a.rng.uniform(2.3, 3.0),
              name="grass", off=GRASS_OFF), 18)
    return ("R20 Copper Bazaar", *save(20, d, a))


def do_r21():  # Glass Desert — sun-bleached dunes, glass spires, bones
    d = load(21)
    a = Aug(21, 2101, avoid_for(d), clear_central=True)
    a.mottle(["#9a7e4d", "#ad8e57", "#876c40", "#b89a63"], 30, wr=(80, 175))  # dunes
    a.rocks("sand", 16, (1.3, 2.4), clump=3)
    a.rocks("sand", 8, (1.0, 1.6))
    a.prop("cactus.png", 16, (1.2, 1.9))
    # glass spire clusters
    for _ in range(9):
        cx = a.rng.uniform(300, 2900); cy = a._band_y()
        for _ in range(a.rng.randint(2, 4)):
            a.sp(PROPS, "crystal_cyan.png", cx + a.rng.uniform(-70, 70),
                 cy + a.rng.uniform(-50, 50), a.rng.uniform(0.7, 1.2), name="crystal_cyan")
    a.prop("skull.png", 9, (1.2, 1.7))
    a.prop("bone_pile.png", 6, (1.2, 1.7))
    a.prop("dead_tree.png", 5, (1.0, 1.4), alpha=0.92)
    for x in (760, 2440):  # weathered ruin pillars
        a.sp(PROPS, "pillar.png", x, a.rng.uniform(560, 700), 0.95, name="pillar")
    add_enemies(d, [("ranged", 880, 640), ("melee", 2350, 1480), ("rat", 1500, 1560)])
    return ("R21 Glass Desert", *save(21, d, a))


def do_r28():  # Frostpeak — snowbound spires, ice shards, frozen pines
    d = load(28)
    a = Aug(28, 2801, avoid_for(d), clear_central=True)
    a.mottle(["#c2d4e2", "#d6e6f0", "#b0c6d8", "#aebfce"], 34, wr=(80, 180))  # snow drifts
    a.clouds(14, yband=(40, 720), sxr=(0.5, 1.3), ar=(0.3, 0.65))
    # ice shard + cyan crystal clusters
    for _ in range(10):
        cx = a.rng.uniform(300, 2900); cy = a._band_y()
        for _ in range(a.rng.randint(2, 4)):
            f = a.rng.choice(["ice_shard.png", "crystal_cyan.png", "ice_shard.png"])
            a.sp(PROPS, f, cx + a.rng.uniform(-70, 70), cy + a.rng.uniform(-50, 50),
                 a.rng.uniform(0.7, 1.15), name=f[:-4])
    a.prop("dead_tree.png", 9, (1.0, 1.5), alpha=0.9)   # frozen pines
    a.rocks("sand", 12, (1.2, 2.0), alpha=0.85)         # snow-dusted rock
    add_enemies(d, [("flying", 900, 640), ("flying", 2300, 700), ("melee", 1500, 1540)])
    return ("R28 Frostpeak", *save(28, d, a))


def do_r30():  # Storm's Eye — BOSS ARENA. perimeter atmosphere only; center open.
    d = load(30)
    a = Aug(30, 3001, avoid_for(d, spawn_r=320), clear_central=False,
            arena=(1600, 1000, 680))
    a.mottle(["#3e4e60", "#4a5c70", "#34424f", "#566980"], 20, wr=(80, 170))
    a.clouds(22, yband=(40, 1900), sxr=(0.5, 1.4), ar=(0.3, 0.7))   # storm wall all around
    # lightning veins crackling across the sky-rim
    for _ in range(9):
        a.vein(a.rng.uniform(250, 2950), a.rng.uniform(150, 1850), a.rng.randint(4, 7),
               7, 3, "#5a7290", "#cfe2f5", step=90, jit=30, tip_c="#ffffff", tip_w=1)
    a.rocks("basalt", 14, (1.4, 2.5), clump=3)
    a.scatter(lambda: a.sp(PROPS, "cloud_platform.png", a.rng.uniform(250, 2950),
              a.rng.uniform(180, 1820), a.rng.uniform(1.0, 1.3), name="cloud_platform",
              alpha=a.rng.uniform(0.75, 0.95)), 10)
    a.prop("dead_tree.png", 6, (1.0, 1.4), alpha=0.85)
    return ("R30 Storm's Eye", *save(30, d, a))


def do_r35():  # Torn Land — void rift; shards, severed gold threads, dead growth
    d = load(35)
    a = Aug(35, 3501, avoid_for(d), clear_central=True)
    a.mottle(["#241a36", "#2c2240", "#1a1426", "#352a4a"], 30, wr=(80, 175))
    a.mottle(["#3a2f56", "#46386a"], 10, wr=(50, 110))
    # severed golden thread strands fraying
    for _ in range(11):
        a.vein(a.rng.uniform(250, 2950), a.rng.uniform(220, 1780), a.rng.randint(5, 9),
               9, 4, "#7a5a1e", "#e8c860", step=82, jit=22, tip_c="#fff0b0", tip_w=2)
    # void shard clusters
    for _ in range(12):
        cx = a.rng.uniform(280, 2920); cy = a._band_y()
        for _ in range(a.rng.randint(2, 4)):
            a.sp(PROPS, "void_shard.png", cx + a.rng.uniform(-70, 70),
                 cy + a.rng.uniform(-50, 50), a.rng.uniform(1.1, 1.7), name="void_shard")
    a.prop("crystal_purple.png", 11, (0.9, 1.4))
    a.prop("crystal_amber.png", 6, (0.8, 1.2))           # warm contrast
    a.prop("dead_tree.png", 8, (0.95, 1.4), alpha=0.9)
    a.prop("skull.png", 8, (1.2, 1.7))
    a.rocks("void", 10, (1.4, 2.3), clump=2)
    a.scatter(lambda: a.sp(PROPS, "cloud_platform.png", a.rng.uniform(280, 2920),
              a._band_y(), a.rng.uniform(1.0, 1.3), name="cloud_platform",
              alpha=a.rng.uniform(0.8, 1.0)), 6)
    add_enemies(d, [("elite", 1000, 640), ("ranged", 2350, 700), ("ranged", 1500, 1540)])
    return ("R35 Torn Land", *save(35, d, a))


if __name__ == "__main__":
    for fn in (do_r20, do_r21, do_r28, do_r30, do_r35):
        name, n_sp, n_st, total = fn()
        print(f"  {name:22} +{n_sp:3} sprites, +{n_st:3} strokes  -> {total} total sprites")
    print("done.")
