#!/usr/bin/env python3
"""Build 8 new regions (R42-R49) for Akhand Sutra and wire them into the world.

- Writes regions/region_42..49.json (sprites + enemies + embedded-dialogue NPCs + portals).
- Patches 7 parent regions with a direction-less branch portal to each new spur.
Deterministic (fixed seed per region). Uses per-sprite `alpha` where helpful.

Connections (parent --branch--> new ; new --back--> parent):
  R7->42  R16->43  R20->44  R27->45  R32->46  R36->47  R39->48->49
"""
import json, math, os, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REG = os.path.join(ROOT, "regions")

# ── asset dirs ────────────────────────────────────────────────────────────────
PROPS  = "assets_custom/props"
STRUCT = "assets_custom/structures"
SAND   = "assets_custom/rocks_sand"
BASALT = "assets_custom/rocks_basalt"
VOID   = "assets_custom/rocks_void"
TSROCK = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Rocks"
CLOUD  = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Decorations/Clouds"
GOLD   = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Terrain/Resources/Gold/Gold Stones"
YBLD   = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Buildings/Yellow Buildings"
BBLD   = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)/Buildings/Blue Buildings"
DECOR  = "assest4/map_objects/2 Objects/7 Decor"
GRASS  = "assest4/next2/2 Objects/5 Grass"
BOX    = "assest4/next2/2 Objects/4 Box"
FENCE  = "assest4/map_objects/2 Objects/2 Fence"
TENT   = "assest4/next2/2 Objects/6 Tent"
CAMPF  = "assest4/map_objects/3 Animated Objects/2 Campfire"
FLAGD  = "assest4/map_objects/3 Animated Objects/1 Flag"

OFF = {
    "pillar.png": (30, 195), "brazier.png": (22, 77), "gate_arch.png": (118, 220),
    "mural.png": (70, 99), "skull.png": (20, 36), "bone_arch.png": (64, 152),
    "bone_pile.png": (42, 56), "void_shard.png": (60, 82),
    "crystal_amber.png": (32, 112), "crystal_cyan.png": (32, 112), "crystal_purple.png": (32, 112),
    "lava_rock.png": (36, 55), "dead_tree.png": (48, 128), "cloud_platform.png": (110, 52),
    "boat.png": (75, 72), "dock.png": (62, 66), "reed.png": (17, 70), "cactus.png": (24, 90),
    "bridge_deck.png": (80, 60),
    "Rock1.png": (32, 63), "Rock2.png": (32, 63), "Rock3.png": (32, 63), "Rock4.png": (32, 63),
    "Clouds_01.png": (288, 128),
    "Monastery.png": (96, 319), "Castle.png": (160, 255), "Tower.png": (64, 255),
    "House1.png": (64, 191), "House2.png": (64, 191), "House3.png": (64, 191), "Barracks.png": (96, 255),
    "Lamp1.png": (10, 34), "Lamp2.png": (5.5, 34), "Lamp3.png": (6.5, 34),
}
GOLD_OFF = (64, 127); FLAG_OFF = (96, 63); BOX_OFF = (10, 21); GRASS_OFF = (3, 6)
FLAG_FR = ["1.png", "2.png", "3.png", "4.png", "5.png"]

W, H = 3200, 2000

class B:
    def __init__(self, idx, seed):
        self.idx = idx; self.rng = random.Random(seed); self.n = 0; self.sprites = []
    def sid(self):
        self.n += 1; return f"s_r{self.idx}_{self.n:04d}"
    def sp(self, dir_, frame, x, y, sx, sy=None, name=None, off=None, alpha=None,
           animated=False, frames=None):
        o = off or OFF.get(frame, (16, 16))
        s = {"type": "sprite", "spriteId": self.sid(), "dir": dir_, "frames": frames or [frame],
             "name": name if name is not None else frame.rsplit('.', 1)[0],
             "animated": animated, "spriteLayer": "below",
             "x": round(x, 2), "y": round(y, 2),
             "scaleX": round(sx, 3), "scaleY": round(sy if sy is not None else sx, 3),
             "offsetX": o[0], "offsetY": o[1]}
        if alpha is not None: s["alpha"] = round(alpha, 3)
        self.sprites.append(s)
    def stroke(self, color, w, pts, comp="source-over"):
        self.sprites.append({"type": "stroke", "stroke": color, "strokeWidth": w,
                             "lineCap": "round", "lineJoin": "round", "composite": comp,
                             "points": [round(p, 1) for p in pts]})
    def mottle(self, tones, n, yband=(150, 1850), xr=(120, 3080), wr=(60, 150)):
        for _ in range(n):
            cx = self.rng.uniform(*xr); cy = self.rng.uniform(*yband)
            spread = self.rng.uniform(60, 150); pts = []
            for _ in range(self.rng.randint(3, 5)):
                pts += [cx + self.rng.uniform(-spread, spread), cy + self.rng.uniform(-spread*0.6, spread*0.6)]
            self.stroke(self.rng.choice(tones), self.rng.uniform(*wr), pts)
    def vein(self, x0, y0, n, base_w, core_w, base_c, core_c, step=80, jit=22, tip_c=None, tip_w=0):
        # Smooth, organically-curving strand (roots / threads / ember cracks).
        ang = self.rng.uniform(0, 2 * math.pi); x, y = x0, y0; pts = [x, y]
        for _ in range(n):
            ang += self.rng.uniform(-0.55, 0.55)
            x += math.cos(ang) * step + self.rng.uniform(-jit, jit)
            y += math.sin(ang) * step + self.rng.uniform(-jit, jit)
            pts += [max(60, min(3140, x)), max(100, min(1900, y))]
        self.stroke(base_c, base_w, pts); self.stroke(core_c, core_w, pts)
        if tip_c: self.stroke(tip_c, tip_w, pts)
    def rock(self, dir_, n, sxr, yband=(150, 1850), xr=(120, 3080), clump=1, alpha=None):
        for _ in range(n):
            cx = self.rng.uniform(*xr); cy = self.rng.uniform(*yband)
            for _ in range(clump):
                f = self.rng.choice(["Rock1.png", "Rock2.png", "Rock3.png", "Rock4.png"])
                self.sp(dir_, f, cx + self.rng.uniform(-60, 60), cy + self.rng.uniform(-45, 45),
                        self.rng.uniform(*sxr), name="Rock", alpha=alpha)
    def grass(self, n, yband=(150, 1850)):
        for _ in range(n):
            f = self.rng.choice(["1.png", "2.png", "3.png", "4.png", "5.png", "6.png"])
            self.sp(GRASS, f, self.rng.uniform(140, 3060), self.rng.uniform(*yband),
                    self.rng.uniform(2.3, 3.1), name=f[:-4], off=GRASS_OFF)
    def clouds(self, n, yband=(60, 1900), sxr=(0.4, 1.1), ar=(0.25, 0.8)):
        for _ in range(n):
            self.sp(CLOUD, "Clouds_01.png", self.rng.uniform(-40, 3240), self.rng.uniform(*yband),
                    self.rng.uniform(*sxr), sy=self.rng.uniform(*sxr) * 0.55,
                    name="Clouds_01", alpha=self.rng.uniform(*ar))
    def flag(self, x, y, s=1.5):
        self.sp(FLAGD, "1.png", x, y, s, name="1", animated=True, frames=FLAG_FR, off=FLAG_OFF)
    def gold(self, x, y, s=0.75, frame=None):
        f = frame or self.rng.choice(["Gold Stone 1.png", "Gold Stone 4.png", "Gold Stone 5.png", "Gold Stone 6.png"])
        self.sp(GOLD, f, x, y, s, name=f[:-4], off=GOLD_OFF)

def npc(idx,name, x, y, first, typ="yellow"):
    return {"id": f"npc{idx}_1", "type": typ, "x": x, "y": y,
            "config": {"id": f"npc{idx}_1", "name": name, "first": first, "active": "", "completed": ""}}

def write_region(idx, name, sub, bg, difficulty, sprites, enemies, npcs, portals):
    data = {"version": 1, "regionName": name, "regionSubtitle": sub,
            "background": {"type": "color", "value": bg}, "difficulty": difficulty,
            "sprites": sprites, "noWalkZones": [], "enemies": enemies, "boss": None,
            "npcs": npcs, "portals": portals, "regionIndex": idx}
    json.dump(data, open(os.path.join(REG, f"region_{idx}.json"), "w"), indent=1, ensure_ascii=False)
    return sum(1 for s in sprites if s["type"] == "sprite")

def en(t, x, y, i):
    return {"id": f"e_{i}", "type": t, "x": x, "y": y}

# ══════════════════════════════════════════════════════════════════════════════
#  REGION BUILDERS
# ══════════════════════════════════════════════════════════════════════════════
def r42():  # Root Hollows — earth cavern, exposed golden Sutra roots
    b = B(42, 4201)
    b.mottle(["#241a12", "#1c140d", "#2e2418", "#3a2c1c"], 60)
    # golden root veins crawling across the floor (smooth, organic)
    for _ in range(11):
        b.vein(b.rng.uniform(150, 3050), b.rng.uniform(200, 1800), b.rng.randint(6, 10),
               10, 4, "#7a5a1e", "#caa23a", step=85, jit=18)
    b.rock(BASALT, 18, (1.8, 2.7), clump=3)            # cave rock masses
    b.rock(BASALT, 10, (1.0, 1.6))
    for _ in range(9):                                 # glowing root-nodes
        b.sp(PROPS, "crystal_amber.png", b.rng.uniform(300, 2900), b.rng.uniform(300, 1700),
             b.rng.uniform(0.7, 1.1), name="crystal_amber")
    # the buried six-figure relief, sixth gouged out
    b.sp(PROPS, "mural.png", 1640, 900, 2.6, name="mural")
    b.sp(PROPS, "brazier.png", 1480, 950, 2.2, name="brazier")
    b.sp(PROPS, "brazier.png", 1800, 950, 2.2, name="brazier")
    for x in (700, 2300):
        b.sp(PROPS, "pillar.png", x, 980, 1.0, name="pillar")
    enemies = [en("melee", 900, 1150, 1), en("melee", 1300, 1080, 2),
               en("ranged", 1900, 980, 3), en("rat", 2250, 1250, 4)]
    npcs = [npc(42,"Root-Tender Oja", 360, 1000,
                "The roots remember what the bark forgot. Trace one back far enough and you'll find a sixth strand - snapped clean, still warm.", "blue")]
    ports = [{"id": "portal42_back", "direction": "back", "targetRegion": 7, "x": 120, "y": 1000}]
    return write_region(42, "Root Hollows", "Mūlabila", "#241a14", 0.8, b.sprites, enemies, npcs, ports)

def r43():  # Tidewreck Harbor — flood-shattered docks, drowned bell-shrine
    b = B(43, 4301)
    b.mottle(["#4a5e6e", "#3e5060", "#56697a", "#33424f"], 46, wr=(70, 160))
    # water channels
    for _ in range(4):
        y = b.rng.uniform(900, 1500); pts = [v for x in range(0, 3201, 80) for v in (x, y + 60*math.sin(x/300.0))]
        b.stroke("#3b566a", 90, pts); b.stroke("#577a92", 46, pts)
    b.clouds(12, yband=(40, 520), ar=(0.2, 0.5))
    # docks / piers
    for x in range(300, 2900, 220):
        b.sp(STRUCT, "bridge_deck.png", x, 1180 + 40*math.sin(x/260.0), 1.2, name="bridge_deck")
    # capsized boats + broken masts (pillars) + reeds + crates
    for x, y, s in [(620, 980, 1.6), (1500, 1250, 1.5), (2400, 1020, 1.7), (1950, 1500, 1.4)]:
        b.sp(PROPS, "boat.png", x, y, s, name="boat")
    for x in (900, 1700, 2600):
        b.sp(PROPS, "pillar.png", x, 1100, 0.9, name="pillar")
    for _ in range(16):
        b.sp(PROPS, "reed.png", b.rng.uniform(200, 3000), b.rng.uniform(950, 1700), b.rng.uniform(1.2, 1.9), name="reed")
    for _ in range(6):
        b.sp(BOX, b.rng.choice(["1.png","2.png","3.png","4.png"]), b.rng.uniform(400,2800), b.rng.uniform(900,1400), 2.2, name="1", off=BOX_OFF)
    # the drowned bell-tower shrine (tilted) + relief
    b.sp(BBLD, "Tower.png", 1300, 800, 1.2, name="Tower")
    b.sp(PROPS, "mural.png", 1300, 980, 1.6, name="mural")
    b.sp(PROPS, "brazier.png", 1150, 1010, 2.0, name="brazier")
    b.rock(SAND, 8, (1.1, 1.8))
    enemies = [en("ranged", 900, 1120, 1), en("ranged", 2100, 1000, 2),
               en("melee", 1500, 1180, 3), en("melee", 2500, 1080, 4)]
    npcs = [npc(43,"Bellwright Saru", 360, 1000,
                "Six bells we rang at dusk, once. The sixth cracked the night the sea rose - now the ferryman forbids its note.", "yellow")]
    ports = [{"id": "portal43_back", "direction": "back", "targetRegion": 16, "x": 120, "y": 1000}]
    return write_region(43, "Tidewreck Harbor", "Bhagnapota", "#5c7488", 1.4, b.sprites, enemies, npcs, ports)

def r44():  # Cinder Bazaar — burned-out market quarter, smoldering ash
    b = B(44, 4401)
    b.mottle(["#2e2622", "#241d1a", "#3a2f28", "#1c1612"], 56)
    b.mottle(["#4a3a30", "#574236", "#3e3028"], 20)    # ash drifts (lighter)
    # ember cracks (smooth, glowing) snaking through the ash
    for _ in range(14):
        b.vein(b.rng.uniform(150, 3050), b.rng.uniform(200, 1800), b.rng.randint(5, 9),
               12, 5, "#5a1404", "#d4641e", step=78, jit=20, tip_c="#ffc24a", tip_w=2)
    # a few surviving charred stalls (kept sparse) + lots of smoldering slag & rubble
    for x, y in [(900, 1180), (1900, 980), (2500, 1250)]:
        b.sp(TENT, b.rng.choice(["1.png","2.png","4.png"]), x, y, b.rng.uniform(1.4,1.7), name="1", off=(34,64))
        for _ in range(b.rng.randint(2,3)):
            b.sp(BOX, b.rng.choice(["1.png","2.png","3.png","4.png"]), x+b.rng.uniform(-80,80), y+b.rng.uniform(40,90), 2.1, name="1", off=BOX_OFF)
    for _ in range(14):                                # smoldering slag heaps (glow)
        cx, cy = b.rng.uniform(300,2900), b.rng.uniform(700,1600)
        for _ in range(b.rng.randint(2,3)):
            b.sp(PROPS, "lava_rock.png", cx+b.rng.uniform(-50,50), cy+b.rng.uniform(-30,30), b.rng.uniform(1.4,1.9), name="lava_rock")
    b.rock(BASALT, 14, (1.3, 2.3), clump=2)            # charred rubble
    for _ in range(5):
        b.sp(FENCE, b.rng.choice(["1.png","2.png","3.png","4.png","8.png"]), b.rng.uniform(300,2900), b.rng.uniform(900,1500), 2.0, name="1", off=(13,16))
    for _ in range(5):
        b.sp(PROPS, "skull.png", b.rng.uniform(400,2800), b.rng.uniform(900,1500), b.rng.uniform(1.2,1.6), name="skull")
    # ruined shrine-stall + relief
    b.sp(PROPS, "mural.png", 1600, 980, 2.2, name="mural")
    b.sp(PROPS, "brazier.png", 1450, 1020, 2.2, name="brazier")
    b.sp(PROPS, "brazier.png", 1750, 1020, 2.2, name="brazier")
    b.sp(PROPS, "skull.png", 1600, 1120, 1.6, name="skull")
    enemies = [en("melee", 950, 1100, 1), en("melee", 1700, 1180, 2),
               en("elite", 2200, 1000, 3), en("ranged", 1300, 950, 4)]
    npcs = [npc(44,"Ash-Merchant Kavi", 360, 1000,
                "They burned this row the day they burned his name. Every charm's stamped with five gods - the sixth die was smashed.", "yellow")]
    ports = [{"id": "portal44_back", "direction": "back", "targetRegion": 20, "x": 120, "y": 1000}]
    return write_region(44, "Cinder Bazaar", "Bhasmahaṭṭa", "#3a3230", 2.0, b.sprites, enemies, npcs, ports)

def r45():  # Frostspire Monastery — snowbound mountaintop monastery
    b = B(45, 4501)
    b.mottle(["#c2d4e2", "#d6e6f0", "#b0c6d8", "#aebfce"], 56, wr=(70, 170))   # snow drifts
    b.clouds(18, yband=(40, 700), sxr=(0.5, 1.3), ar=(0.3, 0.7))
    # the monastery + tower + prayer pillars
    b.sp(BBLD, "Monastery.png", 1500, 760, 1.15, name="Monastery")
    b.sp(BBLD, "Tower.png", 1050, 800, 1.1, name="Tower")
    b.sp(BBLD, "Tower.png", 1950, 800, 1.1, name="Tower")
    for x in (760, 1180, 1820, 2240):
        b.sp(PROPS, "pillar.png", x, 1000, 1.05, name="pillar")
    # ice crystals + frozen banners + bell-relief + braziers
    for _ in range(10):
        b.sp(PROPS, "crystal_cyan.png", b.rng.uniform(300, 2900), b.rng.uniform(900, 1600), b.rng.uniform(0.7, 1.1), name="crystal_cyan")
    for x in (900, 1500, 2100):
        b.flag(x, 940, 1.4)
    b.sp(PROPS, "mural.png", 1500, 980, 1.8, name="mural")
    b.sp(PROPS, "brazier.png", 1340, 1010, 2.1, name="brazier")
    b.sp(PROPS, "brazier.png", 1660, 1010, 2.1, name="brazier")
    b.rock(SAND, 10, (1.2, 2.0), alpha=0.85)
    enemies = [en("flying", 900, 1080, 1), en("flying", 2150, 920, 2),
               en("melee", 1500, 1180, 3), en("ranged", 1850, 1000, 4)]
    npcs = [npc(45,"Snow-Abbot Tenzin", 360, 1000,
                "We kept the Sixth Hymn frozen in the bell-ice, where no fire could burn it. Listen close - it still hums his name beneath the wind.", "blue")]
    ports = [{"id": "portal45_back", "direction": "back", "targetRegion": 27, "x": 120, "y": 1000}]
    return write_region(45, "Frostspire Monastery", "Himamaṭha", "#cdddea", 2.7, b.sprites, enemies, npcs, ports)

def r46():  # Drowned Catacombs — flooded gem-lit underworld crypts
    b = B(46, 4601)
    b.mottle(["#241a26", "#1c141f", "#2e2233", "#191320"], 58)
    for _ in range(3):                                 # underground water
        y = b.rng.uniform(1000, 1500); pts=[v for x in range(0,3201,90) for v in (x, y+50*math.sin(x/280.0))]
        b.stroke("#1f2e3a", 80, pts); b.stroke("#356074", 36, pts)
    b.rock(VOID, 16, (1.6, 2.5), clump=3)
    # gem crystals (emissive) lighting the crypt
    for _ in range(12):
        f = b.rng.choice(["crystal_amber.png", "crystal_cyan.png", "crystal_amber.png"])
        b.sp(PROPS, f, b.rng.uniform(300, 2900), b.rng.uniform(400, 1700), b.rng.uniform(0.7, 1.15), name=f[:-4])
    # sarcophagi (bridge planks) + bones + skulls + pillars
    for x in range(500, 2800, 320):
        b.sp(STRUCT, "bridge_deck.png", x, 1150, 1.0, name="bridge_deck")
        if b.rng.random() < 0.6:
            b.sp(PROPS, "skull.png", x+b.rng.uniform(-30,30), 1130, 1.4, name="skull")
    for _ in range(7):
        b.sp(PROPS, "bone_pile.png", b.rng.uniform(300,2900), b.rng.uniform(900,1600), b.rng.uniform(1.2,1.7), name="bone_pile")
    for x in (760, 2240):
        b.sp(PROPS, "pillar.png", x, 1000, 1.0, name="pillar")
    # the empty sixth grave-niche relief
    b.sp(PROPS, "bone_arch.png", 1500, 820, 1.2, name="bone_arch")
    b.sp(PROPS, "mural.png", 1500, 980, 1.8, name="mural")
    b.sp(PROPS, "brazier.png", 1340, 1010, 2.0, name="brazier")
    b.sp(PROPS, "brazier.png", 1660, 1010, 2.0, name="brazier")
    enemies = [en("melee", 950, 1120, 1), en("melee", 1700, 1180, 2),
               en("elite", 2200, 980, 3), en("rat", 1300, 1300, 4)]
    npcs = [npc(46,"Tomb-Keeper Mihika", 360, 1000,
                "We bury kings with six coins for six gods. The sixth grave-niche, though? Always empty. Always was. Someone made sure.", "blue")]
    ports = [{"id": "portal46_back", "direction": "back", "targetRegion": 32, "x": 120, "y": 1000}]
    return write_region(46, "Drowned Catacombs", "Magnasamādhi", "#241a26", 2.8, b.sprites, enemies, npcs, ports)

def r47():  # The Unwound Waste — reality unraveling, the cut Thread's frayed end
    b = B(47, 4701)
    # brighter-contrast void mottle so the waste reads against the near-black sky
    b.mottle(["#241a36", "#2c2240", "#1a1426", "#352a4a"], 56, wr=(70, 170))
    b.mottle(["#3a2f56", "#46386a"], 12, wr=(50, 110))   # faint violet highlights
    # severed golden thread strands fraying everywhere (smooth, glowing cores)
    for _ in range(14):
        b.vein(b.rng.uniform(200, 3000), b.rng.uniform(250, 1750), b.rng.randint(6, 10),
               9, 4, "#7a5a1e", "#e8c860", step=82, jit=20, tip_c="#fff0b0", tip_w=2)
    # broken ground islands drifting in the rift (clearly visible)
    for x, y, a in [(640, 880, 1.0), (1380, 1280, 0.95), (2080, 840, 1.0), (2620, 1300, 0.9),
                    (1080, 1520, 0.9), (1750, 1050, 0.95), (2900, 700, 0.85), (380, 1300, 0.9)]:
        b.sp(PROPS, "cloud_platform.png", x, y, b.rng.uniform(1.0, 1.3), name="cloud_platform", alpha=a)
    for _ in range(20):                                  # void shards (now plentiful & larger)
        b.sp(PROPS, "void_shard.png", b.rng.uniform(250, 2950), b.rng.uniform(280, 1760), b.rng.uniform(1.1, 1.8), name="void_shard")
    for _ in range(11):                                  # purple crystals
        b.sp(PROPS, "crystal_purple.png", b.rng.uniform(350, 2850), b.rng.uniform(420, 1680), b.rng.uniform(0.9, 1.4), name="crystal_purple")
    for _ in range(6):                                   # amber crystals = warm contrast against the violet
        b.sp(PROPS, "crystal_amber.png", b.rng.uniform(400, 2800), b.rng.uniform(450, 1650), b.rng.uniform(0.8, 1.2), name="crystal_amber")
    for _ in range(7):
        b.sp(PROPS, "dead_tree.png", b.rng.uniform(300, 2900), b.rng.uniform(380, 1720), b.rng.uniform(0.95, 1.4), name="dead_tree", alpha=0.9)
    for _ in range(9):
        b.sp(PROPS, "skull.png", b.rng.uniform(350, 2850), b.rng.uniform(850, 1650), b.rng.uniform(1.2, 1.7), name="skull")
    b.rock(VOID, 8, (1.4, 2.2), clump=2)
    # the frayed thread-end shrine
    b.sp(PROPS, "gate_arch.png", 1500, 820, 1.2, name="gate_arch")
    b.sp(PROPS, "mural.png", 1500, 1000, 1.8, name="mural")
    b.sp(PROPS, "brazier.png", 1340, 1030, 2.0, name="brazier")
    b.sp(PROPS, "brazier.png", 1660, 1030, 2.0, name="brazier")
    enemies = [en("elite", 1000, 1100, 1), en("elite", 2100, 980, 2),
               en("ranged", 1500, 1250, 3), en("ranged", 2400, 1100, 4)]
    npcs = [npc(47,"The Last Weaver", 360, 1000,
                "This is where the Thread ends. See the frayed gold? Six strands braided it. Five remain. The sixth was not cut by Viyogasur - it was cut by the other five.", "blue")]
    ports = [{"id": "portal47_back", "direction": "back", "targetRegion": 36, "x": 120, "y": 1000}]
    return write_region(47, "The Unwound Waste", "Vighaṭitakṣetra", "#14101e", 3.3, b.sprites, enemies, npcs, ports)

def r48():  # Threshold of Names — hidden golden antechamber of erased names
    b = B(48, 4801)
    b.mottle(["#2a2418", "#221d12", "#352c1a", "#1c1810"], 48)
    b.clouds(8, yband=(60, 600), sxr=(0.5, 1.0), ar=(0.10, 0.22))   # faint gold haze
    # name-plaque pillars: some blank, some glowing (amber crystal beside)
    for i, x in enumerate(range(500, 2900, 300)):
        b.sp(PROPS, "pillar.png", x, 1020, 1.0, name="pillar")
        if i % 2 == 0:
            b.sp(PROPS, "crystal_amber.png", x, 980, 0.8, name="crystal_amber")  # remembered, glows
        else:
            b.sp(PROPS, "skull.png", x, 990, 1.0, name="skull")                  # scraped blank
    for _ in range(14):
        b.gold(b.rng.uniform(400, 2800), b.rng.uniform(900, 1500), b.rng.uniform(0.6, 0.85))
    # the central name-gate + relief
    b.sp(PROPS, "gate_arch.png", 1700, 840, 1.25, name="gate_arch")
    b.sp(PROPS, "mural.png", 1700, 1010, 1.9, name="mural")
    b.sp(PROPS, "brazier.png", 1540, 1040, 2.1, name="brazier")
    b.sp(PROPS, "brazier.png", 1860, 1040, 2.1, name="brazier")
    for x in (1500, 1900):
        b.flag(x, 980, 1.4)
    enemies = [en("elite", 1150, 1100, 1), en("ranged", 2200, 1020, 2)]
    npcs = [npc(48,"The Nameless Choir", 360, 1000,
                "Speak it and the wall remembers. E-ka-tma-de-va. The Sixth. The Self. The one they unmade so the other five could be worshipped alone.", "yellow")]
    ports = [{"id": "portal48_back", "direction": "back", "targetRegion": 39, "x": 120, "y": 1000},
             {"id": "portal48_next", "direction": "next", "targetRegion": 49, "x": 3090, "y": 1000}]
    return write_region(48, "Threshold of Names", "Nāmadvāra", "#2a2418", 3.2, b.sprites, enemies, npcs, ports)

def r49():  # The First Loom — origin sanctum where the Sutra was woven
    b = B(49, 4901)
    b.mottle(["#332a16", "#2a2212", "#41341a", "#241d10"], 46)
    b.clouds(8, yband=(60, 600), sxr=(0.6, 1.1), ar=(0.10, 0.20))
    # the six thread-strands of the loom: 5 taut gold, 1 severed (frayed)
    for i in range(6):
        x = 1100 + i * 200
        if i == 5:   # the severed sixth strand
            b.stroke("#7a5a1e", 10, [x, 560, x, 900]); b.stroke("#caa23a", 5, [x, 560, x, 900])
        else:
            b.stroke("#9a7a2a", 12, [x, 520, x, 1320]); b.stroke("#ffe07a", 6, [x, 520, x, 1320])
    # the great loom-gate + six thrones (pillars), the sixth restored here
    b.sp(PROPS, "gate_arch.png", 1500, 760, 1.7, name="gate_arch")
    for i in range(6):
        x = 1000 + i * 200
        b.sp(PROPS, "pillar.png", x, 1080 + (abs(i-2.5)*4), 0.75, name="pillar")
    b.sp(PROPS, "mural.png", 1500, 900, 2.4, name="mural")
    b.sp(PROPS, "brazier.png", 1180, 940, 2.2, name="brazier")
    b.sp(PROPS, "brazier.png", 1820, 940, 2.2, name="brazier")
    for x in (900, 2100):
        b.flag(x, 980, 1.6)
    for _ in range(16):
        b.gold(b.rng.uniform(900, 2100), b.rng.uniform(1100, 1400), b.rng.uniform(0.6, 0.9))
    for _ in range(6):
        b.sp(PROPS, b.rng.choice(["crystal_amber.png","crystal_amber.png","crystal_purple.png"]),
             b.rng.uniform(700, 2300), b.rng.uniform(1000, 1500), b.rng.uniform(0.8, 1.1))
    enemies = [en("elite", 2400, 1050, 1)]   # a single optional guardian
    npcs = [npc(49,"Ekatmadeva", 360, 1000,
                "I was not a god above you. I was the thread between you. Re-weave me, and Akhand is whole. Leave me cut, and the realm stays broken - but free of the five.", "yellow")]
    ports = [{"id": "portal49_back", "direction": "back", "targetRegion": 48, "x": 120, "y": 1000}]
    return write_region(49, "The First Loom", "Ādisūtra", "#332a16", 3.4, b.sprites, enemies, npcs, ports)

# ── patch parent regions with branch portals ──────────────────────────────────
def patch_parent(parent, target, x, y):
    p = os.path.join(REG, f"region_{parent}.json")
    d = json.load(open(p))
    ports = d.setdefault("portals", [])
    if any(pt.get("targetRegion") == target for pt in ports):
        return False
    ports.append({"id": f"portal{parent}_to{target}", "targetRegion": target, "x": x, "y": y})
    json.dump(d, open(p, "w"), indent=1, ensure_ascii=False)
    return True

# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    for fn in (r42, r43, r44, r45, r46, r47, r48, r49):
        cnt = fn()
        print(f"  built region (#sprites={cnt})  {fn.__name__}")
    branches = [(7, 42, 1600, 1720), (16, 43, 2440, 1740), (20, 44, 2400, 1700),
                (27, 45, 2400, 250), (32, 46, 1600, 1740), (36, 47, 1600, 1720),
                (39, 48, 1600, 320)]
    for parent, target, x, y in branches:
        ok = patch_parent(parent, target, x, y)
        print(f"  parent R{parent} -> R{target}: {'added' if ok else 'already present'}")
    print("done.")
