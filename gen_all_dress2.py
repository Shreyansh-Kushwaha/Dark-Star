#!/usr/bin/env python3
"""
Dress-pass 2 — wires all new custom props (gen_props2.py) and animated
spritesheets (assets_custom/anim/) into regions 18-43.

Idempotent: each region gets its own GEN tag so any re-run strips the
previous additions and re-places everything fresh.
Run:  python3 gen_all_dress2.py
"""
import json, math, random, os

PROPS = "assets_custom/props"
ANIM  = "assets_custom/anim"

# ── anchor table: (w, h, ox, oy) — ox=foot-x, oy=foot-y ─────────────────
ANCHOR = {
    # bazaar / market
    "merchant_stall":  (140, 120, 70, 119),
    "trade_cart":      (120,  90, 60,  89),
    "hanging_lantern": ( 36,  80, 18,  79),
    "goods_crate":     ( 72,  62, 36,  61),
    "market_bell":     ( 44,  88, 22,  87),
    # serpent / marsh
    "serpent_idol":    ( 56, 100, 28,  99),
    "eel_trap":        ( 48,  80, 24,  79),
    "marsh_lantern":   ( 34, 110, 17, 109),
    "mangrove_root":   (160, 100, 80,  99),
    # sky / wind / cloud
    "wind_chime":      ( 52,  90, 26,  89),
    "storm_banner":    ( 72, 130,  8, 129),
    "nest_mound":      (140,  80, 70,  79),
    "cloud_arch":      (200, 130,100, 129),
    # frost / monastery
    "prayer_wheel":    ( 44,  90, 22,  89),
    "prayer_flags":    (180,  80, 10,  79),
    "snow_lantern":    ( 56,  72, 28,  71),
    "ice_wall_shard":  ( 48, 130, 24, 129),
    # soul / shrine
    "incense_stand":   ( 52,  84, 26,  83),
    "torii_gate":      (140, 140, 70, 139),
    "offering_bowl":   ( 56,  44, 28,  43),
    "spirit_bell":     ( 80, 110, 40, 109),
    # root / underground
    "gnarled_root":    (180, 110, 90, 109),
    "mushroom_cluster":( 96,  88, 48,  87),
    "root_pillar":     ( 56, 160, 28, 159),
    "biolum_pod":      ( 44,  72, 22,  71),
    # harbor / tidal
    "anchor":          ( 64,  90, 32,  89),
    "net_post":        ( 80, 100, 40,  99),
    "buoy":            ( 44,  70, 22,  69),
    "shipwreck_plank": (140,  70, 70,  69),
    # forge / demon
    "demon_anvil":     ( 80,  66, 40,  65),
    "heat_vent":       ( 64,  48, 32,  47),
    "chain_post":      ( 44, 100, 22,  99),
    "demon_idol":      ( 60,  88, 30,  87),
    # void / severance
    "void_tendril":    ( 52, 110, 26, 109),
    "cracked_portal":  (100, 100, 50,  99),
    "memory_shard":    ( 40,  90, 20,  89),
    "echo_pillar":     ( 52, 160, 26, 159),
    # ruins / forgotten
    "crumbled_wall":   (140,  72, 70,  71),
    "broken_statue":   ( 60, 130, 30, 129),
    "well_cap":        ( 80, 100, 40,  99),
    "overgrown_column":( 56, 170, 28, 169),
}

# ── animated sprite specs: (file, frameW, frameH, frameCount, ox, oy, scale) ─
ANIM_SPECS = {
    "torch_anim":      ("torch_anim.png",      32, 64, 6,  16, 62, 1.6),
    "spirit_flame":    ("spirit_flame.png",     32, 64, 6,  16, 62, 1.4),
    "lava_bubble":     ("lava_bubble.png",      48, 48, 4,  24, 47, 1.5),
    "void_pulse":      ("void_pulse.png",       64, 64, 6,  32, 32, 1.2),
    "water_ripple":    ("water_ripple.png",     48, 48, 4,  24, 24, 1.4),
    "wind_banner_anim":("wind_banner_anim.png", 64, 80, 4,   8, 79, 1.3),
    "crystal_glow":    ("crystal_glow.png",     64, 80, 4,  32, 79, 1.1),
    "smoke_wisp":      ("smoke_wisp.png",       32, 64, 6,  16, 62, 1.4),
}

# ── per-region helpers ────────────────────────────────────────────────────────

class Region:
    def __init__(self, idx, seed):
        self.idx  = idx
        self.src  = f"regions/region_{idx}.json"
        self.tag  = f"r{idx}d2"
        self.pfx  = f"s_r{idx}d2"
        self._n   = [0]
        random.seed(seed)
        self.data = json.load(open(self.src))
        self.sprites = self.data["sprites"]
        self._strip()

    def _strip(self):
        tag = self.tag; pfx = self.pfx
        self.sprites[:] = [
            s for s in self.sprites
            if s.get("gen") != tag and not (
                str(s.get("spriteId", "")).startswith(pfx + "_") and
                str(s.get("spriteId", ""))[len(pfx)+1:].isdigit()
            )
        ]

    def _sid(self):
        self._n[0] += 1
        return f"{self.pfx}_{self._n[0]:04d}"

    def prop(self, name, x, y, scale=1.0, layer="below"):
        w, h, ox, oy = ANCHOR[name]
        return {
            "type": "sprite", "spriteId": self._sid(), "dir": PROPS,
            "frames": [f"{name}.png"], "name": name, "animated": False,
            "spriteLayer": layer, "x": round(x, 1), "y": round(y, 1),
            "scaleX": round(scale, 3), "scaleY": round(scale, 3),
            "offsetX": float(ox), "offsetY": float(oy),
        }

    def anim(self, key, x, y, scale=None):
        fname, fw, fh, fc, ox, oy, dscale = ANIM_SPECS[key]
        sc = scale if scale is not None else dscale
        return {
            "type": "sprite", "spriteId": self._sid(), "dir": ANIM,
            "frames": [fname], "name": key, "animated": True,
            "spriteLayer": "below", "x": round(x, 1), "y": round(y, 1),
            "scaleX": round(sc, 3), "scaleY": round(sc, 3),
            "offsetX": float(ox), "offsetY": float(oy),
            "frameW": fw, "frameH": fh, "frameCount": fc, "frameRow": 0,
        }

    def scatter(self, name, cx, cy, rx, ry, n, scale_range=(1.0, 1.4)):
        out = []
        for _ in range(n):
            a = random.uniform(0, math.pi * 2)
            r = random.uniform(0.4, 1.0)
            x = cx + math.cos(a) * rx * r
            y = cy + math.sin(a) * ry * r
            sc = random.uniform(*scale_range)
            out.append(self.prop(name, x, y, sc))
        return out

    def row(self, name, xs, y, scale=1.0, jitter=0):
        return [self.prop(name, x + random.uniform(-jitter, jitter),
                          y + random.uniform(-jitter, jitter) * 0.4, scale)
                for x in xs]

    def save(self, new):
        self.sprites.extend(new)
        json.dump(self.data, open(self.src, "w"), indent=1)
        acount = sum(1 for s in self.sprites if s.get("animated"))
        print(f"  region {self.idx:2d}: +{len(new):3d} new sprites  "
              f"total={len(self.sprites)}  anim={acount}")


# ═══════════════════════════════════════════════════════════════════════════════
# REGION DRESSING
# ═══════════════════════════════════════════════════════════════════════════════

def dress_18():
    """Serpent Marsh — serpent idols, eel traps, marsh lanterns, mangrove roots,
    water ripples on the bog pools."""
    r = Region(18, 1800)
    new = []
    # Naga shrine upgrade — serpent idols flanking the existing obelisks
    new += [r.prop("serpent_idol", 200, 820, 1.4),
            r.prop("serpent_idol", 440, 810, 1.3)]
    # eel traps along stream banks
    for x, y in [(530,880),(1020,740),(1560,870),(2180,760),(2640,830)]:
        new.append(r.prop("eel_trap", x + random.uniform(-20,20),
                          y + random.uniform(-20,20), random.uniform(1.2,1.5)))
    # marsh lanterns at trail junctions
    for x, y in [(700,980),(1250,960),(1850,1000),(2500,970)]:
        new.append(r.prop("marsh_lantern", x, y, 1.3))
    # mangrove root arches over the two stream crossings
    new += [r.prop("mangrove_root", 960, 970, 1.1),
            r.prop("mangrove_root", 2420, 990, 1.0)]
    # water ripple animations on the bog pools
    for cx, cy in [(1500, 700),(2000, 1300),(2500, 800)]:
        new.append(r.anim("water_ripple", cx, cy, 1.6))
        new.append(r.anim("water_ripple", cx + random.uniform(-60,60),
                          cy + random.uniform(-40,40), 1.2))
    r.save(new)


def dress_19():
    """Ash Flats — smoke wisps from fumaroles, crumbled walls as ancient ruins,
    broken statues dotting the grey expanse."""
    r = Region(19, 1900)
    new = []
    # smoke wisps at scattered fumarole positions
    for x, y in [(400,700),(800,1300),(1300,600),(1800,1400),(2300,750),(2700,1250)]:
        new.append(r.anim("smoke_wisp", x + random.uniform(-30,30),
                          y + random.uniform(-30,30), 1.3))
    # ruined wall sections as ancient pre-ash structures
    for x, y, sc in [(600,650,1.1),(1100,1350,0.9),(1600,600,1.2),
                     (2100,1380,1.0),(2600,680,1.1)]:
        new.append(r.prop("crumbled_wall", x, y, sc))
    # broken statues — the ash-entombed dead
    for x, y in [(450, 1350),(950,650),(1450,1350),(2000,700),(2550,1300)]:
        new.append(r.prop("broken_statue", x + random.uniform(-20,20),
                          y + random.uniform(-20,20), random.uniform(1.1,1.4)))
    # well cap — a buried ancient well
    new.append(r.prop("well_cap", 1600, 1000, 1.2))
    r.save(new)


def dress_20():
    """Copper Bazaar — merchant stalls, trade carts, hanging lanterns,
    goods crates and market bells filling the trading floor."""
    r = Region(20, 2000)
    new = []
    # main market strip along y=1000 corridor
    stall_xs = [500, 750, 1050, 1350, 1650, 1950, 2250, 2550]
    for i, x in enumerate(stall_xs):
        side = 1 if i % 2 == 0 else -1
        new.append(r.prop("merchant_stall", x, 1000 + side * 180, 1.1))
        new.append(r.prop("hanging_lantern", x + 60, 1000 + side * 120, 1.2))
    # trade carts between stalls
    for x, y in [(620,920),(1160,1100),(1780,900),(2380,1060)]:
        new.append(r.prop("trade_cart", x, y, 1.0))
    # goods crates stacked near stalls
    for x, y in [(510,1140),(810,880),(1410,1120),(2010,860),(2610,1080)]:
        new.append(r.prop("goods_crate", x + random.uniform(-15,15),
                          y + random.uniform(-10,10), random.uniform(0.9,1.1)))
    # market bells at the two gate ends
    new += [r.prop("market_bell", 250, 980, 1.3),
            r.prop("market_bell", 2900, 1000, 1.3)]
    r.save(new)


def dress_21():
    """Glass Desert — pulsing crystal glow animations, memory shards half-buried
    in glass sand, cracked portal as a broken rift."""
    r = Region(21, 2100)
    new = []
    # crystal glow animations — the glass desert's living crystals
    for x, y in [(500,700),(900,1300),(1300,650),(1700,1350),(2100,700),(2500,1300)]:
        new.append(r.anim("crystal_glow", x + random.uniform(-40,40),
                          y + random.uniform(-30,30), random.uniform(1.0,1.4)))
    # memory shards scattered like frozen moments in glass
    for _ in range(8):
        x = random.uniform(400, 2800)
        y = random.uniform(400, 1600)
        new.append(r.prop("memory_shard", x, y, random.uniform(1.0,1.5)))
    # cracked portal as the desert's central mystery
    new.append(r.prop("cracked_portal", 1600, 1000, 1.4))
    # echo pillars — half-dissolved in the glass
    for x, y in [(700, 900),(1400, 650),(2300, 1100)]:
        new.append(r.prop("echo_pillar", x, y, random.uniform(0.8, 1.0)))
    r.save(new)


def dress_22():
    """Fire Caldera — lava bubble animations on the lava pools, smoke wisps
    from vents, demon anvils and heat vents as forge-shrines."""
    r = Region(22, 2200)
    new = []
    # lava bubble anims on caldera pools
    for x, y in [(600,700),(1200,1300),(1800,600),(2400,1300),(1600,1000)]:
        new.append(r.anim("lava_bubble", x + random.uniform(-50,50),
                          y + random.uniform(-40,40), 1.5))
    # smoke wisps from vent fields
    for x, y in [(450,900),(900,650),(1500,1350),(2100,800),(2700,1100)]:
        new.append(r.anim("smoke_wisp", x, y, 1.3))
    # heat vents in the ground
    for x, y in [(700,1050),(1100,950),(1900,1000),(2300,980)]:
        new.append(r.prop("heat_vent", x, y, 1.2))
    # demon anvils — volcanic forge altars
    for x, y in [(500, 820),(2800, 1180)]:
        new.append(r.prop("demon_anvil", x, y, 1.3))
    r.save(new)


def dress_23():
    """Temple of Gods — torii gates as zone dividers, offering bowls at
    shrines, incense stands and spirit bells flanking the main hall."""
    r = Region(23, 2300)
    new = []
    # torii gates at three intervals along the main corridor
    for x, y in [(600, 1000),(1400, 1000),(2200, 1000),(2850, 1000)]:
        new.append(r.prop("torii_gate", x, y, 1.2))
    # incense stands flanking each torii
    for x, y in [(600,1000),(1400,1000),(2200,1000)]:
        new += [r.prop("incense_stand", x - 90, y + 60, 1.1),
                r.prop("incense_stand", x + 90, y + 60, 1.1)]
    # offering bowls near the NPC shrine at (320, 980)
    for ox, oy in [(-50, 60),(50, 60),(0, 100)]:
        new.append(r.prop("offering_bowl", 320 + ox, 980 + oy, 1.2))
    # spirit bells at the gate pillars
    new += [r.prop("spirit_bell", 260, 940, 1.1),
            r.prop("spirit_bell", 2980, 960, 1.1)]
    # scattered offering bowls at side-altar positions
    for x, y in [(900, 750),(1700, 1280),(2500, 720)]:
        new.append(r.prop("offering_bowl", x, y, 1.0))
    r.save(new)


def dress_24():
    """Demon Forge — animated torch fires, chain posts, demon anvils,
    heat vents and a demon idol as the forge's patron deity."""
    r = Region(24, 2400)
    new = []
    # torch anims lining the forge corridor
    for x, y in [(350,900),(350,1100),(700,850),(700,1150),(1100,900),
                 (1100,1100),(1600,920),(1600,1080),(2100,900),(2100,1100),
                 (2600,920),(2600,1080),(2900,950),(2900,1050)]:
        new.append(r.anim("torch_anim", x, y, 1.5))
    # chain posts along the walls
    for x, y in [(500, 800),(500,1200),(1300,780),(1300,1220),
                 (2000,800),(2000,1200),(2700,820),(2700,1180)]:
        new.append(r.prop("chain_post", x, y, 1.2))
    # demon anvils — the forge's workstations
    for x, y in [(800,980),(1400,960),(2200,1000)]:
        new.append(r.prop("demon_anvil", x, y, 1.3))
    # heat vents in the forge floor
    for x, y in [(650,1050),(1200,940),(1800,1000),(2400,980)]:
        new.append(r.prop("heat_vent", x, y, 1.2))
    # patron demon idol at the far end
    new.append(r.prop("demon_idol", 2900, 980, 1.5))
    r.save(new)


def dress_25():
    """Cloud Stair — cloud arches as natural gateways, wind chimes and
    storm banners along the ascending path."""
    r = Region(25, 2500)
    new = []
    # cloud arches spanning the stairway at key elevation steps
    for x, y in [(700, 1300),(1300, 1050),(1900, 800),(2500, 600)]:
        new.append(r.prop("cloud_arch", x, y, 1.1))
    # wind chimes hanging from the arches / cliff edges
    for x, y in [(620,1250),(820,1250),(1220,1000),(1420,1000),
                 (1820,760),(2020,760),(2420,580),(2620,580)]:
        new.append(r.prop("wind_chime", x, y, 1.1))
    # storm banners — the sky sentinels' markers
    for x, y in [(400, 1350),(900, 1100),(1600, 850),(2200, 650),(2900, 580)]:
        new.append(r.prop("storm_banner", x, y, 1.2))
    r.save(new)


def dress_26():
    """Wind Cliffs — animated wind banners, nest mounds on ledges,
    storm banners as territorial markers."""
    r = Region(26, 2600)
    new = []
    # animated wind banners along the cliff face
    for x, y in [(400, 900),(800, 1100),(1200, 850),(1700, 1050),
                 (2200, 900),(2600, 1100),(2900, 950)]:
        new.append(r.anim("wind_banner_anim", x + random.uniform(-20,20),
                           y + random.uniform(-20,20), 1.3))
    # static storm banners at cliff-top perches
    for x, y in [(600, 750),(1400, 720),(2100, 770),(2800, 740)]:
        new.append(r.prop("storm_banner", x, y, 1.3))
    # nest mounds on ledge outcroppings
    for x, y in [(700, 600),(1500, 650),(2300, 580)]:
        new.append(r.prop("nest_mound", x, y, 1.2))
    # wind chimes at the NPC area and mid-cliff camps
    for x, y in [(350, 1080),(500, 1120),(1600, 900)]:
        new.append(r.prop("wind_chime", x, y, 1.1))
    r.save(new)


def dress_27():
    """The Eyrie — massive nest mounds on the three ledges, wind chimes
    and storm banners as the aerie markers."""
    r = Region(27, 2700)
    new = []
    # large nest mounds — the eyrie's breeding nests
    for x, y, sc in [(700, 250, 1.8),(1600, 600, 1.6),(2500, 350, 1.7)]:
        new.append(r.prop("nest_mound", x, y, sc))
    # smaller satellite nests
    for _ in range(6):
        x = random.uniform(400, 2900)
        y = random.uniform(200, 900)
        new.append(r.prop("nest_mound", x, y, random.uniform(0.8,1.1)))
    # wind chimes on the bridge spans
    for x, y in [(900,1000),(1300,1000),(1700,1000),(2100,1000)]:
        new.append(r.prop("wind_chime", x, y, 1.2))
    # storm banners — territorial claim markers
    for x, y in [(300,980),(800,240),(1600,590),(2500,340),(2900,960)]:
        new.append(r.prop("storm_banner", x, y, 1.3))
    r.save(new)


def dress_28():
    """Frostpeak — snow lanterns lining the mountain path, ice wall shards
    as glacial formations, prayer flags between the monastery spires."""
    r = Region(28, 2800)
    new = []
    # snow lanterns along the central path
    for x, y in [(400,980),(700,960),(1000,980),(1300,960),(1600,980),
                 (1900,960),(2200,980),(2500,960),(2800,980)]:
        new.append(r.prop("snow_lantern", x, y, 1.2))
    # ice wall shard clusters — glacial terrain features
    for cx, cy in [(600,700),(1200,1300),(1800,650),(2400,1350)]:
        for _ in range(3):
            dx = random.uniform(-80, 80); dy = random.uniform(-50,50)
            new.append(r.prop("ice_wall_shard", cx+dx, cy+dy,
                              random.uniform(0.9,1.3)))
    # prayer flags spanning between positions
    for x, y in [(300, 900),(1000, 850),(1800, 900),(2600, 860)]:
        new.append(r.prop("prayer_flags", x, y, 1.0))
    r.save(new)


def dress_29():
    """Heaven's Edge — torii gates as celestial thresholds, prayer wheels
    and prayer flags in the monastery courtyard, offering bowls at the altars."""
    r = Region(29, 2900)
    new = []
    # torii gates — celestial thresholds on the ascending path
    for x, y in [(600, 1000),(1200, 1000),(1900, 1000),(2600, 1000)]:
        new.append(r.prop("torii_gate", x, y, 1.2))
    # prayer wheels flanking each torii
    for x, y in [(600,1000),(1200,1000),(1900,1000)]:
        new += [r.prop("prayer_wheel", x - 80, y + 50, 1.1),
                r.prop("prayer_wheel", x + 80, y + 50, 1.1)]
    # prayer flags strung between spires
    for x, y in [(400, 850),(1000, 800),(1700, 850),(2400, 800)]:
        new.append(r.prop("prayer_flags", x, y, 1.0))
    # offering bowls at the NPC altar
    for dx, dy in [(-50,70),(50,70),(0,120)]:
        new.append(r.prop("offering_bowl", 360+dx, 980+dy, 1.1))
    r.save(new)


def dress_30():
    """Storm's Eye — animated wind banners whipping in the storm, static
    storm banners as lightning-struck markers, cracked portals as eye-wall rifts."""
    r = Region(30, 3000)
    new = []
    # animated wind banners — the storm's full fury
    for x, y in [(350,850),(700,1150),(1100,800),(1500,1200),
                 (1900,850),(2300,1100),(2700,800),(2950,1050)]:
        new.append(r.anim("wind_banner_anim", x + random.uniform(-20,20),
                           y + random.uniform(-20,20), 1.4))
    # static storm banners — charred and torn remnants
    for x, y in [(500,700),(1200,750),(1800,720),(2500,740)]:
        new.append(r.prop("storm_banner", x, y, 1.3))
    # cracked portal as the eye of the storm
    new.append(r.prop("cracked_portal", 1600, 1000, 1.6))
    # echo pillars — partially dissolved by lightning
    for x, y in [(800, 900),(1400,780),(2200,1050)]:
        new.append(r.prop("echo_pillar", x, y, 0.9))
    r.save(new)


def dress_31():
    """Blind Well — animated torch fires at junctions, well cap as the
    legendary blind well, crumbled walls of the sunken settlement."""
    r = Region(31, 3100)
    new = []
    # torch anims illuminating cave junctions
    for x, y in [(350,950),(350,1100),(800,870),(800,1130),(1300,920),
                 (1300,1080),(1800,880),(1800,1120),(2300,920),(2300,1080),
                 (2800,940),(2800,1060)]:
        new.append(r.anim("torch_anim", x, y, 1.4))
    # the blind well — centrepiece
    new.append(r.prop("well_cap", 1600, 1000, 1.5))
    # crumbled settlement walls
    for x, y, sc in [(500,750,1.0),(1100,1280,0.9),(1700,720,1.1),
                     (2200,1300,1.0),(2700,780,0.9)]:
        new.append(r.prop("crumbled_wall", x, y, sc))
    # overgrown columns — the sunken structure's remains
    for x, y in [(700, 870),(1500,680),(2400,1120)]:
        new.append(r.prop("overgrown_column", x, y, 1.0))
    r.save(new)


def dress_32():
    """Gem Hollows — crystal glow animations on crystal formations,
    mushroom clusters in damp corners, biolum pods on the cave walls."""
    r = Region(32, 3200)
    new = []
    # crystal glow anims — the hollows' living crystal veins
    for x, y in [(500,800),(900,1200),(1300,700),(1700,1300),(2100,750),(2600,1200)]:
        new.append(r.anim("crystal_glow", x + random.uniform(-40,40),
                          y + random.uniform(-30,30), random.uniform(1.1,1.5)))
    # mushroom clusters in damp alcoves
    for x, y in [(400,1200),(750,750),(1200,1300),(1800,800),(2400,1250)]:
        new.append(r.prop("mushroom_cluster", x + random.uniform(-20,20),
                          y + random.uniform(-15,15), random.uniform(1.2,1.5)))
    # biolum pods on the hollow walls
    for _ in range(8):
        x = random.uniform(350, 2800)
        y = random.uniform(400, 1650)
        new.append(r.prop("biolum_pod", x, y, random.uniform(1.0,1.4)))
    r.save(new)


def dress_33():
    """Bone City — crumbled walls as the ruined bone architecture, broken
    statues of the dead, demon idols at the district corners."""
    r = Region(33, 3300)
    new = []
    # crumbled wall sections — the city's district boundaries
    for x, y, sc in [(500,700,1.2),(900,1250,1.0),(1300,720,1.1),
                     (1700,1280,0.9),(2100,740,1.2),(2600,1200,1.0)]:
        new.append(r.prop("crumbled_wall", x, y, sc))
    # broken statues — memorials to the dead city's rulers
    for x, y in [(400,950),(700,250),(1100,1050),(1600,850),
                 (2100,1050),(2600,900)]:
        new.append(r.prop("broken_statue", x + random.uniform(-20,20),
                          y + random.uniform(-15,15), random.uniform(1.1,1.4)))
    # demon idols at district intersections
    for x, y in [(700, 1000),(1600, 1000),(2500, 1000)]:
        new.append(r.prop("demon_idol", x, y, 1.3))
    # chain posts — the bone city's gates
    for x, y in [(350, 920),(350, 1080),(2800, 920),(2800, 1080)]:
        new.append(r.prop("chain_post", x, y, 1.2))
    r.save(new)


def dress_34():
    """Forgotten Well — well caps (the many forgotten wells), overgrown
    columns, broken statues reclaimed by nature."""
    r = Region(34, 3400)
    new = []
    # the three forgotten wells — centrepieces of this region
    for x, y, sc in [(700, 1020, 1.4),(1600, 980, 1.6),(2500, 1000, 1.3)]:
        new.append(r.prop("well_cap", x, y, sc))
    # overgrown columns — the ancient settlement's remnants
    for x, y in [(500,800),(900,1200),(1300,750),(1900,1250),(2200,820),(2800,1100)]:
        new.append(r.prop("overgrown_column", x + random.uniform(-20,20),
                          y + random.uniform(-15,15), random.uniform(0.9,1.1)))
    # broken statues — the forgotten rulers
    for x, y in [(400,1050),(800,750),(1200,1200),(1800,800),(2100,1150),(2700,900)]:
        new.append(r.prop("broken_statue", x + random.uniform(-15,15),
                          y + random.uniform(-10,10), random.uniform(1.0,1.3)))
    # crumbled walls
    for x, y, sc in [(600,650,1.0),(1100,1350,0.9),(2000,700,1.1),(2600,1300,1.0)]:
        new.append(r.prop("crumbled_wall", x, y, sc))
    r.save(new)


def dress_35():
    """Torn Land — smoke wisps from fissures, echo pillars at the rift edges,
    void tendrils emerging from the tears, crumbled walls."""
    r = Region(35, 3500)
    new = []
    # smoke wisps rising from the land tears
    for x, y in [(400,900),(800,1100),(1200,850),(1700,1100),
                 (2100,900),(2600,1050)]:
        new.append(r.anim("smoke_wisp", x + random.uniform(-25,25),
                          y + random.uniform(-20,20), 1.3))
    # echo pillars — what remains at the tear's edge
    for x, y in [(500,850),(1000,750),(1500,1000),(2100,850),(2700,950)]:
        new.append(r.prop("echo_pillar", x, y, random.uniform(0.7,1.0)))
    # void tendrils breaking through the torn ground
    for x, y in [(700,1050),(1300,940),(1800,1000),(2300,1050)]:
        new.append(r.prop("void_tendril", x + random.uniform(-20,20),
                          y + random.uniform(-15,15), random.uniform(1.1,1.4)))
    # crumbled walls — what was here before the tearing
    for x, y in [(400,700),(1000,1300),(1800,680),(2500,1280)]:
        new.append(r.prop("crumbled_wall", x, y, random.uniform(0.9,1.1)))
    r.save(new)


def dress_36():
    """The Between — void pulse portals as the liminal rifts, memory shards
    and echo pillars as frozen moments caught between worlds."""
    r = Region(36, 3600)
    new = []
    # void pulse anims — the between's floating rift-holes
    for x, y in [(500,800),(900,1200),(1300,750),(1600,1000),
                 (1900,800),(2300,1200),(2700,900)]:
        new.append(r.anim("void_pulse", x + random.uniform(-30,30),
                          y + random.uniform(-25,25), 1.2))
    # memory shards drifting in the between-space
    for _ in range(10):
        x = random.uniform(350, 2850)
        y = random.uniform(350, 1700)
        new.append(r.prop("memory_shard", x, y, random.uniform(0.9,1.4)))
    # echo pillars — people who got stuck
    for x, y in [(450,950),(950,700),(1400,1050),(2000,900),(2550,750)]:
        new.append(r.prop("echo_pillar", x, y, random.uniform(0.6,0.9)))
    # cracked portals as broken exit-ways
    for x, y in [(700, 1000),(2000, 1000)]:
        new.append(r.prop("cracked_portal", x, y, 1.3))
    r.save(new)


def dress_37():
    """Severance Fortress — torch anims on the battlements, chain posts
    at every gate, demon idols as the fortress's iron gods."""
    r = Region(37, 3700)
    new = []
    # torch anims — the fortress's eternal fires
    for x, y in [(350, 930),(350,1060),(700,880),(700,1120),(1100,900),
                 (1100,1080),(1600,920),(1600,1060),(2100,900),(2100,1100),
                 (2600,930),(2600,1060),(2900,950),(2900,1050)]:
        new.append(r.anim("torch_anim", x, y, 1.5))
    # chain posts flanking each gate section
    for x, y in [(500,820),(500,1180),(1000,800),(1000,1200),
                 (1500,820),(1500,1180),(2000,800),(2000,1200),
                 (2500,820),(2500,1180)]:
        new.append(r.prop("chain_post", x, y, 1.1))
    # demon idols — the fortress's iron patrons
    for x, y in [(800, 1000),(1600, 1000),(2400, 1000)]:
        new.append(r.prop("demon_idol", x, y, 1.4))
    # crumbled inner walls
    for x, y in [(650,750),(1250,1300),(1900,720),(2700,1250)]:
        new.append(r.prop("crumbled_wall", x, y, 0.9))
    r.save(new)


def dress_38():
    """The Severing — void pulse at the central rupture, void tendrils
    spreading from the wound, cracked portals as the aftermath."""
    r = Region(38, 3800)
    new = []
    # void pulse — the severing wound itself
    new.append(r.anim("void_pulse", 1600, 1000, 2.0))
    # secondary void pulses — resonant echoes
    for x, y in [(800, 900),(1300, 750),(1900, 1100),(2400, 900)]:
        new.append(r.anim("void_pulse", x, y, 1.0))
    # void tendrils crawling outward from the wound
    for x, y in [(600,900),(1000,800),(1200,1100),(1700,750),(2000,1050),
                 (2400,850),(2700,1000)]:
        new.append(r.prop("void_tendril", x + random.uniform(-20,20),
                          y + random.uniform(-15,15), random.uniform(1.1,1.5)))
    # cracked portals — shattered by the severing
    for x, y in [(500, 1000),(2700, 1000)]:
        new.append(r.prop("cracked_portal", x, y, 1.3))
    # memory shards — fragments of what was severed
    for _ in range(8):
        x = random.uniform(300, 2900)
        y = random.uniform(350, 1700)
        new.append(r.prop("memory_shard", x, y, random.uniform(0.9,1.3)))
    r.save(new)


def dress_39():
    """Sixth Gate — torii gates as the six thresholds, torch anims flanking
    each gate, chain posts as the divine locks."""
    r = Region(39, 3900)
    new = []
    # six torii gates across the corridor (one per threshold)
    gate_xs = [350, 700, 1100, 1600, 2100, 2600, 2950]
    for x in gate_xs:
        new.append(r.prop("torii_gate", x, 1000, 1.1))
    # torch anims flanking each gate
    for x in gate_xs:
        new += [r.anim("torch_anim", x - 80, 1000, 1.4),
                r.anim("torch_anim", x + 80, 1000, 1.4)]
    # chain posts at the gate bases
    for x in gate_xs[1:-1]:
        new += [r.prop("chain_post", x - 50, 1050, 1.0),
                r.prop("chain_post", x + 50, 1050, 1.0)]
    # the upper portal at (1600, 320) — torii framing
    new += [r.prop("torii_gate", 1600, 320, 1.0),
            r.anim("torch_anim", 1520, 320, 1.3),
            r.anim("torch_anim", 1680, 320, 1.3)]
    r.save(new)


def dress_40():
    """Soul Sanctum — spirit flame animations at every altar, incense stands
    and offering bowls throughout, spirit bells as the sanctum's voice."""
    r = Region(40, 4000)
    new = []
    # spirit flame anims at the sanctum's altars
    for x, y in [(400,900),(600,1100),(900,800),(1200,900),(1600,1000),
                 (2000,900),(2200,1100),(2500,850),(2700,1050)]:
        new.append(r.anim("spirit_flame", x + random.uniform(-20,20),
                          y + random.uniform(-15,15), 1.4))
    # incense stands — filling the sanctum with sacred smoke
    for x, y in [(350,980),(700,950),(1000,1020),(1400,960),(1800,1010),
                 (2100,950),(2500,1000),(2800,970)]:
        new.append(r.prop("incense_stand", x, y, 1.1))
    # offering bowls at the main shrine (NPC at 360,1000)
    for dx, dy in [(-60,80),(60,80),(0,130),(-100,50),(100,50)]:
        new.append(r.prop("offering_bowl", 360+dx, 1000+dy, 1.0))
    # spirit bells — three across the sanctum
    for x, y in [(700, 950),(1600, 960),(2500, 950)]:
        new.append(r.prop("spirit_bell", x, y, 1.2))
    r.save(new)


def dress_41():
    """Silent Shrine — spirit flame animations at the shrine altar, torii gate
    as the sacred entrance, offering bowls and incense stands throughout."""
    r = Region(41, 4100)
    new = []
    # torii gate — the shrine's sacred entrance at left portal
    new.append(r.prop("torii_gate", 350, 1000, 1.3))
    # spirit flame at the main altar (NPC at 420, 1000)
    for dx, dy in [(-80,60),(80,60),(0,40),(-120,80),(120,80)]:
        new.append(r.anim("spirit_flame", 420+dx, 1000+dy, 1.3))
    # incense stands flanking the altar
    for dx, dy in [(-150,80),(150,80),(-200,40),(200,40)]:
        new.append(r.prop("incense_stand", 420+dx, 1000+dy, 1.0))
    # offering bowls scattered through the shrine grounds
    for x, y in [(700,900),(700,1100),(1200,950),(1200,1050),(1800,900),
                 (1800,1100),(2400,950),(2400,1050)]:
        new.append(r.prop("offering_bowl", x + random.uniform(-15,15),
                          y + random.uniform(-10,10), 1.0))
    # spirit bells — the shrine's voice
    for x, y in [(600,950),(1600,970),(2700,960)]:
        new.append(r.prop("spirit_bell", x, y, 1.2))
    r.save(new)


def dress_42():
    """Root Hollows — gnarled root arches as zone dividers, mushroom clusters
    in every alcove, root pillars as living columns, biolum pods for light."""
    r = Region(42, 4200)
    new = []
    # gnarled root arches — natural gateways through the hollows
    for x, y in [(600,1000),(1200,1000),(1900,1000),(2500,1000)]:
        new.append(r.prop("gnarled_root", x, y, 1.1))
    # mushroom clusters in damp alcoves
    for x, y in [(400,750),(700,1250),(1000,720),(1400,1280),(1800,750),
                 (2200,1250),(2600,740),(2900,1100)]:
        new.append(r.prop("mushroom_cluster", x + random.uniform(-20,20),
                          y + random.uniform(-15,15), random.uniform(1.1,1.5)))
    # root pillars as organic columns
    for x, y in [(500,900),(500,1100),(1100,880),(1100,1120),(1700,900),
                 (1700,1100),(2300,880),(2300,1120),(2800,920),(2800,1080)]:
        new.append(r.prop("root_pillar", x, y, random.uniform(0.8,1.1)))
    # biolum pods — the hollow's only light
    for _ in range(12):
        x = random.uniform(350, 2900)
        y = random.uniform(400, 1600)
        new.append(r.prop("biolum_pod", x, y, random.uniform(0.9,1.3)))
    r.save(new)


def dress_43():
    """Tidewreck Harbor — anchors, net posts and buoys on the waterfront,
    shipwreck planks as debris, water ripple animations on the harbor pools."""
    r = Region(43, 4300)
    new = []
    # anchors — half-buried in the harbor mud
    for x, y in [(400,1050),(900,950),(1400,1080),(1900,940),(2500,1050)]:
        new.append(r.prop("anchor", x + random.uniform(-20,20),
                          y + random.uniform(-15,15), random.uniform(1.1,1.4)))
    # net posts along the waterfront
    for x, y in [(500,850),(850,1150),(1200,820),(1700,1130),(2200,860),(2700,1100)]:
        new.append(r.prop("net_post", x, y, 1.2))
    # buoys floating in the harbor
    for x, y in [(600,780),(1000,1200),(1500,750),(2000,1200),(2400,780)]:
        new.append(r.prop("buoy", x + random.uniform(-15,15),
                          y + random.uniform(-10,10), 1.0))
    # shipwreck plank debris
    for x, y in [(700,1000),(1300,980),(1800,1000),(2300,990)]:
        new.append(r.prop("shipwreck_plank", x + random.uniform(-25,25),
                          y + random.uniform(-20,20), random.uniform(0.9,1.2)))
    # water ripple anims on the harbor pools
    for x, y in [(550,700),(1100,1300),(1700,680),(2300,1280)]:
        new.append(r.anim("water_ripple", x, y, 1.5))
        new.append(r.anim("water_ripple", x + random.uniform(-50,50),
                          y + random.uniform(-35,35), 1.1))
    r.save(new)


if __name__ == "__main__":
    print("Dressing regions with new custom props and animated spritesheets...")
    dress_18(); dress_19(); dress_20(); dress_21(); dress_22(); dress_23()
    dress_24(); dress_25(); dress_26(); dress_27(); dress_28(); dress_29()
    dress_30(); dress_31(); dress_32(); dress_33(); dress_34(); dress_35()
    dress_36(); dress_37(); dress_38(); dress_39(); dress_40(); dress_41()
    dress_42(); dress_43()
    print("Done.")
