#!/usr/bin/env python3
"""
region_kit.py — shared toolkit for generating Dark-Star region JSONs.

Encapsulates the conventions proven across regions 9/10/11:
  * 3200x2000 world, warrior visible body ~100px (192px frame @1.0)
  * STATIC single-image sprites (cheap); only a few animated accents (<20)
  * standing objects BASE-anchored (origin = foot) because GameScene sorts
    depth by placement-y, so feet-on-ground gives correct occlusion
  * exact origins read straight from the PNGs with PIL (no hardcoded dims)
  * gameplay fields: sprites, noWalkZones, enemies, boss, npcs, portals

A `Region` accumulates everything and `.emit()` writes regions/region_<N>.json.
Biome recipe helpers (forest, water, desert, cave, sky, temple, void, ...) live
in gen_world.py and just call Region primitives.
"""
import json, math
from PIL import Image

WORLD_W, WORLD_H, CY = 3200, 2000, 1000

TS     = "Tiny Swords (Free Pack)/Tiny Swords (Free Pack)"
CRAFT  = "craftpix-net-168228-free-tree-pixel-art-asset-pack/trees"
DECOR  = "assest4/map_objects/2 Objects/7 Decor"
CAMP   = "assest4/map_objects/2 Objects/8 Camp"
FENCE  = "assest4/map_objects/2 Objects/2 Fence"
FLOWER = "assest4/map_objects/2 Objects/6 Flower"
PTR    = "assest4/map_objects/2 Objects/3 Pointer"
N2BOX  = "assest4/next2/2 Objects/4 Box"
N2DEC  = "assest4/next2/2 Objects/3 Decor"
N2TNT  = "assest4/next2/2 Objects/6 Tent"
N2GRS  = "assest4/next2/2 Objects/5 Grass"
ROCKS  = f"{TS}/Terrain/Decorations/Rocks"
GOLD   = f"{TS}/Terrain/Resources/Gold/Gold Stones"
CLOUDS = f"{TS}/Terrain/Decorations/Clouds"
WROCK  = f"{TS}/Terrain/Decorations/Rocks in the Water"
PFX    = f"{TS}/Particle FX"
WOOD   = f"{TS}/Terrain/Resources/Wood/Trees"
PROPS  = "assets_custom/props"
STRUCT = "assets_custom/structures"
FLAGD  = "assest4/map_objects/3 Animated Objects/1 Flag"
FIRED  = "assest4/map_objects/3 Animated Objects/2 Campfire"

CANOPY = ["middle_lane_tree2", "middle_lane_tree3", "middle_lane_tree4", "middle_lane_tree5"]
SHRUB  = ["middle_lane_tree6", "middle_lane_tree7"]
TUFT   = ["middle_lane_tree10", "middle_lane_tree11"]
BUSHES = ["Bushe1_crop", "Bushe2_crop", "Bushe3_crop", "Bushe4_crop"]


class RNG:
    def __init__(self, seed): self.s = seed & 0xFFFFFFFF
    def next(self):
        x = self.s
        x ^= (x << 13) & 0xFFFFFFFF; x ^= (x >> 17); x ^= (x << 5) & 0xFFFFFFFF
        self.s = x & 0xFFFFFFFF
        return self.s / 0xFFFFFFFF
    def rng(self, a, b): return a + (b - a) * self.next()
    def pick(self, seq): return seq[int(self.next() * len(seq)) % len(seq)]
    def chance(self, p): return self.next() < p


_dimcache = {}
def dim(path):
    if path not in _dimcache:
        with Image.open(path) as im:
            _dimcache[path] = im.size
    return _dimcache[path]


def hyp(ax, ay, bx, by): return math.hypot(ax - bx, ay - by)


class Region:
    def __init__(self, index, name, bg, seed):
        self.index = index; self.name = name; self.bg = bg
        self.R = RNG(seed)
        self.sprites = []; self.zones = []; self.enemies = []
        self.npcs = []; self.portals = []; self.boss = None
        self._sid = 0; self._zid = 0; self.foot = []

    # ---- low level ----------------------------------------------------------
    def sid(self):
        self._sid += 1; return f"s_r{self.index}_{self._sid:04d}"

    def add(self, dir_, frame, x, y, scale, anchor="base", layer="below",
            animated=False, frames=None):
        w, h = dim(dir_ + "/" + frame)
        ox = w / 2.0
        oy = (h - 1) if anchor == "base" else (h / 2.0 if anchor == "center" else 0)
        self.sprites.append({
            "type": "sprite", "spriteId": self.sid(), "dir": dir_,
            "frames": frames or [frame], "name": frame[:-4], "animated": animated,
            "spriteLayer": layer, "x": round(x, 2), "y": round(y, 2),
            "scaleX": round(scale, 3), "scaleY": round(scale, 3),
            "offsetX": round(ox, 1), "offsetY": round(oy, 1)})

    def stroke(self, pts, color, width):
        flat = []
        for (px, py) in pts: flat.extend([round(px, 2), round(py, 2)])
        self.sprites.append({"type": "stroke", "stroke": color,
            "strokeWidth": width, "lineCap": "round", "lineJoin": "round",
            "composite": "source-over", "points": flat})

    def zone(self, x, y, w, h, zid=None):
        self._zid += 1
        self.zones.append({"id": zid or f"z{self.index}_{self._zid}",
            "x": round(x, 1), "y": round(y, 1), "w": round(w, 1), "h": round(h, 1)})

    # ---- nature primitives --------------------------------------------------
    def canopy(self, x, y, s, kind=None):
        n = kind or self.R.pick(CANOPY)
        self.add(CRAFT if n.startswith("middle") else "cropped", n + ".png", x, y, s)
    def shrub(self, x, y, s): self.add(CRAFT, self.R.pick(SHRUB) + ".png", x, y, s)
    def tuft(self, x, y, s):  self.add(CRAFT, self.R.pick(TUFT) + ".png", x, y, s)
    def bush(self, x, y, s):  self.add("cropped", self.R.pick(BUSHES) + ".png", x, y, s)
    def dead_tree(self, x, y, s): self.add(PROPS, "dead_tree.png", x, y, s)
    def rock(self, x, y, s):  self.add(ROCKS, f"Rock{int(self.R.rng(1,5))}.png", x, y, s)
    def gold(self, x, y, s):  self.add(GOLD, f"Gold Stone {int(self.R.rng(1,7))}.png", x, y, s)
    def stump(self, x, y, s): self.add(WOOD, "Stump 4.png", x, y, s)
    def sheep(self, x, y, s): self.add("cropped", "Sheep_Idle_crop.png", x, y, s)
    def grass(self, x, y, s): self.add(N2GRS, f"{int(self.R.rng(1,7))}.png", x, y, s)
    def flower(self, x, y, s):self.add(FLOWER, f"{int(self.R.rng(1,13))}.png", x, y, s)
    def dirt(self, x, y, s):  self.add(DECOR, self.R.pick(["Dirt1","Dirt2","Dirt3","Dirt6"]) + ".png", x, y, s, anchor="center")
    def cloud(self, x, y, s): self.add(CLOUDS, "Clouds_01.png", x, y, s, anchor="center")

    # ---- structures / town --------------------------------------------------
    def lamp(self, x, y, s=3.0): self.add(DECOR, self.R.pick(["Lamp1","Lamp2","Lamp3"]) + ".png", x, y, s)
    def log(self, x, y, s=1.7):  self.add(DECOR, self.R.pick(["Log1","Log2","Log3"]) + ".png", x, y, s)
    def fence(self, x, y, s=2.0):self.add(FENCE, self.R.pick(["1","2","3","4","8"]) + ".png", x, y, s)
    def sign(self, x, y, s=2.4): self.add(PTR, "1.png", x, y, s)
    def tent(self, x, y, s):     self.add(N2TNT, self.R.pick(["1","2","3","4"]) + ".png", x, y, s)
    def crate(self, x, y, s):    self.add(N2BOX, self.R.pick(["1","2","3","4","5"]) + ".png", x, y, s)
    def barrel(self, x, y, s):   self.add(N2DEC, self.R.pick(["8","9","10","11"]) + ".png", x, y, s)

    def building(self, kind, color, x, y, scale, foot_w=0.55, foot_h=78, solid=True):
        d = f"{TS}/Buildings/{color} Buildings"
        self.add(d, kind + ".png", x, y, scale)
        if solid:
            w, h = dim(d + "/" + kind + ".png"); fw = w * scale * foot_w
            self.zone(x - fw / 2, y - foot_h, fw, foot_h)

    # ---- custom props -------------------------------------------------------
    def prop(self, name, x, y, s, anchor="base"): self.add(PROPS, name + ".png", x, y, s, anchor=anchor)
    def cactus(self, x, y, s): self.prop("cactus", x, y, s)
    def scarecrow(self, x, y, s): self.prop("scarecrow", x, y, s)
    def bone(self, x, y, s): self.prop("bone_pile", x, y, s)
    def skull(self, x, y, s): self.prop("skull", x, y, s)
    def bone_arch(self, x, y, s): self.prop("bone_arch", x, y, s)
    def cloud_platform(self, x, y, s): self.prop("cloud_platform", x, y, s, anchor="center")
    def ice(self, x, y, s): self.prop("ice_shard", x, y, s)
    def brazier(self, x, y, s): self.prop("brazier", x, y, s)
    def pillar(self, x, y, s): self.prop("pillar", x, y, s)
    def mural(self, x, y, s): self.prop("mural", x, y, s)
    def void_shard(self, x, y, s): self.prop("void_shard", x, y, s, anchor="center")
    def reed(self, x, y, s): self.prop("reed", x, y, s)
    def gate(self, x, y, s): self.prop("gate_arch", x, y, s)
    def lava_rock(self, x, y, s): self.prop("lava_rock", x, y, s)
    def crystal(self, x, y, s, kind="cyan"): self.prop(f"crystal_{kind}", x, y, s)
    def bridge_deck(self, x, y, s): self.add(STRUCT, "bridge_deck.png", x, y, s, anchor="center")
    def lift(self, x, y, s): self.add(STRUCT, "lift_platform.png", x, y, s)

    # ---- animated accents (keep total < 20) ---------------------------------
    def flag(self, x, y, s=1.5):
        self.add(FLAGD, "1.png", x, y, s, animated=True, frames=["1.png","2.png","3.png","4.png","5.png"])
    def campfire(self, x, y, s=1.6):
        self.add(FIRED, "1.png", x, y, s, animated=True, frames=["1.png","2.png"])
    def water_rock(self, x, y):
        self.add(WROCK, f"Water Rocks_0{int(self.R.rng(1,5))}.png", x, y, 1, anchor="center")
        self.sprites[-1].update({"animated": True, "frameW": 64, "frameH": 64, "frameCount": 16, "frameRow": 0, "offsetX": 32, "offsetY": 32})
    def water_splash(self, x, y):
        self.add(PFX, "Water Splash.png", x, y, 1, anchor="center")
        self.sprites[-1].update({"animated": True, "frameW": 192, "frameH": 192, "frameCount": 9, "frameRow": 0, "offsetX": 96, "offsetY": 96})

    # ---- water painting -----------------------------------------------------
    def river(self, x_of_y, c_deep="#2f6f97", c_lite="#6fb6e0", w_deep=116, w_lite=52, y0=-60, y1=None, step=26):
        y1 = WORLD_H + 60 if y1 is None else y1
        pts = [(x_of_y(y), y) for y in range(y0, y1, step)]
        self.stroke(pts, c_deep, w_deep); self.stroke(pts, c_lite, w_lite)
    def pool(self, cx, cy, rx, ry, c_deep="#244f43", c_lite="#3a7d5f", w_deep=170, w_lite=90):
        pts = [(cx + math.cos(math.radians(t)) * rx * 0.6, cy + math.sin(math.radians(t)) * ry * 0.6) for t in range(0, 372, 18)]
        self.stroke(pts, c_deep, w_deep); self.stroke(pts, c_lite, w_lite)

    # ---- gameplay -----------------------------------------------------------
    def enemy(self, type, x, y):
        self.enemies.append({"id": f"e{self.index}_{len(self.enemies)+1:02d}", "type": type, "x": x, "y": y})
    def npc(self, type, x, y, name, first, active="", completed=""):
        nid = f"npc{self.index}_{len(self.npcs)+1}"
        self.npcs.append({"id": nid, "type": type, "x": x, "y": y,
            "config": {"id": nid, "name": name, "first": first, "active": active, "completed": completed}})
    def set_boss(self, key, x, y): self.boss = {"key": key, "x": x, "y": y}
    def portal_back(self, target, x=120, y=CY):
        self.portals.append({"id": f"portal{self.index}_back", "direction": "back", "targetRegion": target, "x": x, "y": y})
    def portal_next(self, target, x=WORLD_W - 120, y=CY):
        self.portals.append({"id": f"portal{self.index}_next", "direction": "next", "targetRegion": target, "x": x, "y": y})
    def portal_to(self, target, x, y):
        self.portals.append({"id": f"portal{self.index}_to{target}", "targetRegion": target, "x": x, "y": y})

    # ---- collision convenience ---------------------------------------------
    def frame_walls(self, top=200, bottom=200, left=190, right=190,
                    left_gap=None, right_gap=None, top_gap=None, bottom_gap=None):
        """Seal the map edges into a walkable arena; *_gap=(lo,hi) leaves a door."""
        def band(horiz, thick, edge, gap):
            if thick <= 0: return
            if horiz:  # top/bottom band spanning width
                y = -80 if edge == "top" else WORLD_H + 80 - thick
                if gap:
                    self.zone(-80, y, gap[0] + 80, thick); self.zone(gap[1], y, WORLD_W + 80 - gap[1], thick)
                else: self.zone(-80, y, WORLD_W + 160, thick)
            else:
                x = -80 if edge == "left" else WORLD_W + 80 - thick
                if gap:
                    self.zone(x, -80, thick, gap[0] + 80); self.zone(x, gap[1], thick, WORLD_H + 80 - gap[1])
                else: self.zone(x, -80, thick, WORLD_H + 160)
        band(True, top, "top", top_gap); band(True, bottom, "bottom", bottom_gap)
        band(False, left, "left", left_gap); band(False, right, "right", right_gap)

    def scatter(self, fn, n, xr, yr, avoid=None, smin=0.8, smax=1.1):
        for _ in range(n):
            x = self.R.rng(*xr); y = self.R.rng(*yr)
            if avoid and avoid(x, y): continue
            fn(x, y, self.R.rng(smin, smax))

    # ---- output -------------------------------------------------------------
    def emit(self):
        out = {"version": 1, "regionName": self.name,
               "background": {"type": "color", "value": self.bg},
               "sprites": self.sprites, "noWalkZones": self.zones,
               "enemies": self.enemies, "boss": self.boss, "npcs": self.npcs,
               "portals": self.portals, "regionIndex": self.index}
        with open(f"regions/region_{self.index}.json", "w") as f:
            json.dump(out, f, indent=1)
        imgs = [s for s in self.sprites if s["type"] == "sprite"]
        anim = [s for s in imgs if s.get("animated")]
        return {"index": self.index, "name": self.name, "sprites": len(self.sprites),
                "images": len(imgs), "animated": len(anim), "zones": len(self.zones),
                "enemies": len(self.enemies), "npcs": len(self.npcs),
                "boss": self.boss["key"] if self.boss else None, "portals": len(self.portals)}
