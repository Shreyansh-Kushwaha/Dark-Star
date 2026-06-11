#!/usr/bin/env python3
"""
gen_world.py — builds the open-world regions of Dark-Star from region_kit.

Each region is a build_<N>() function composing Region primitives. A REGISTRY
maps regionIndex -> builder. `python3 gen_world.py [N ...]` builds the given
indices (or all) and writes regions/region_<N>.json.

Master index map (see docs/WORLD_MAP_DESIGN.md):
  existing: 0 Gramavana, 7 Smrtivana, 8 Nagaraja Sabha, 9 Shilavana, 10 Patala Guha, 11 Setubandha
  ACT I  : 12 Dhanyakshetra, 13 Mrgavana, 14 Pasanadvara
  ACT II : 15 Plavita, 16 Naditira, 17 Kardama, 18 Nagakshetra
  ACT III: 19 Bhasmabhumi, 20 Tamrapura, 21 Marusthala, 22 Agnikunda, 23 Deva Mandira, 24 Pasana Forge
  ACT IV : 25 Meghasopana, 26 Vayupatha, 27 Garudalaya, 28 Himashikhara, 29 Swarga Seema, 30 Vayu Tempest
  ACT V  : 31 Andhakupa, 32 Ratnaguha, 33 Asthinagara, 34 Vismrti Kupa
  ACT VI : 35 Chidrabhumi, 36 Antarala, 37 Viyoga Durga, 38 Sutracheda
  HIDDEN : 39 Shashtha Dvara, 40 Ekatmalaya, 41 Maunamandira
"""
import sys, math
from region_kit import Region, WORLD_W, WORLD_H, CY

REGISTRY = {}
def region(idx):
    def deco(fn): REGISTRY[idx] = fn; return fn
    return deco

# ============================================================================
# shared composition helpers
# ============================================================================
def grid_fill(reg, place, open_area, step=116, jitter=34, smin=0.85, smax=1.15,
              chance=1.0):
    """Tile the map on a staggered jittered grid; place() everywhere `open_area`
    is False. Used for treelines, rock walls, dune fields, cave walls."""
    y = -120
    while y < WORLD_H + 140:
        off = (step / 2) if (int((y + 200) / step) % 2) else 0
        x = -160
        while x < WORLD_W + 200:
            jx = x + off + reg.R.rng(-jitter, jitter); jy = y + reg.R.rng(-jitter, jitter)
            if not open_area(jx, jy) and reg.R.chance(chance):
                place(jx, jy, reg.R.rng(smin, smax))
            x += step
        y += step

def meander(x0, x1, base_y, amp, wl, step=60):
    return [(x, base_y + amp * math.sin(x / wl)) for x in range(x0, x1, step)]

def lerp_path(pts):
    def f(x, y): return False
    return f

SPAWN = (380, CY)
def near_spawn(x, y, r=240): return (x-SPAWN[0])**2 + (y-SPAWN[1])**2 < r*r


# ============================================================================
# ACT I — THE MORTAL VALE
# ============================================================================
@region(12)
def build_12():
    """Dhanyakshetra — The Famished Fields. Rotting open farmland, scarecrows,
    crop furrows, a ruined granary. Optional spur off Setubandha."""
    r = Region(12, "Dhānyakshetra — The Famished Fields", "#6f6a39", 120012)
    def open_area(x, y):  # the workable field (kept clear of the deep treeline)
        return 230 < x < WORLD_W - 230 and 330 < y < WORLD_H - 330
    # 1) dried crop furrows across the whole field (wavy tilled-earth strokes)
    for i, yy in enumerate(range(440, 1580, 58)):
        pts = [(x, yy + 14 * math.sin(x / 240.0 + i)) for x in range(180, WORLD_W - 180, 70)]
        r.stroke(pts, "#7c7238" if i % 2 else "#867a3c", 22)
    # a dried irrigation channel cutting the field
    r.stroke([(x, 1000 + 120 * math.sin(x / 520.0)) for x in range(120, WORLD_W - 120, 60)], "#5b5530", 46)
    # 2) sparse dead treeline framing the field
    grid_fill(r, lambda x, y, s: (r.dead_tree(x, y, r.R.rng(0.7, 1.05)) if r.R.chance(0.5)
                                  else r.canopy(x, y, r.R.rng(0.8, 1.05), kind="middle_lane_tree4")),
              open_area, step=150, chance=0.85)
    # 3) scarecrows standing in the rows
    for (sx, sy) in [(620, 720), (1020, 880), (1450, 700), (1850, 980), (980, 1280),
                     (1500, 1300), (700, 1120), (2150, 760)]:
        r.scarecrow(sx + r.R.rng(-30, 30), sy, r.R.rng(1.5, 1.9))
    # 4) withered crops: stumps, dry bushes, hay; broken fences along rows
    r.scatter(r.stump, 14, (300, WORLD_W-300), (420, 1560), avoid=near_spawn, smin=0.4, smax=0.5)
    r.scatter(r.bush, 24, (300, WORLD_W-300), (420, 1560), avoid=near_spawn, smin=0.7, smax=1.0)
    r.scatter(lambda x,y,s: r.flower(x,y,r.R.rng(1.6,2.4)), 26, (300, WORLD_W-300), (400, 1580), avoid=near_spawn)
    for fx in range(360, 2400, 60):
        if r.R.chance(0.4): r.fence(fx, 560 + 8*math.sin(fx/200), 2.0)
        if r.R.chance(0.4): r.fence(fx, 1460 + 8*math.sin(fx/180), 2.0)
    # 5) the ruined granary (weathered barracks) + storage, east end
    r.building("Barracks", "Black", 2780, 980, 1.05, foot_w=0.55, foot_h=80)
    r.crate(2700, 1080, 2.2); r.crate(2860, 1070, 2.0); r.barrel(2740, 900, 1.7)
    r.bone(2640, 1140, 1.2)
    # 6) gameplay
    r.frame_walls(top=200, bottom=200, left=190, right=170, left_gap=(880, 1120))
    for (t, x, y) in [("melee",760,940),("melee",1180,1060),("rat",1420,900),
                      ("rat",1700,1120),("melee",2050,980),("elite",2560,1000)]:
        r.enemy(t, x, y)
    r.npc("yellow", 300, 880, "Famished Tiller",
          "The_fields_died_the_season_the_Thread_was_cut..._no_rain,_no_blessing._The_old_folk_say_a_SIXTH_blessing_stopped_coming,_the_one_no_priest_will_name.")
    r.npc("blue", 430, 1140, "Scarecrow-Watcher",
          "Mind_the_strawmen._Since_the_warden_in_the_granary_turned,_they_walk_the_rows_at_dusk._I_keep_to_the_road_to_Setubandha.")
    r.portal_back(11, 120, 1000)
    return r.emit()

@region(13)
def build_13():
    """Mrgavana — The Hunter's Thicket. Dense wild woods, a poacher's camp,
    bone piles; the corrupted forest guardian Vanaraksha stirs at the far glade."""
    r = Region(13, "Mṛgavana — The Hunter's Thicket", "#23461b", 130013)
    GLADE = (2620, 1010)
    def open_area(x, y):  # a winding clearing from spawn to the glade
        lane = abs(y - (1000 + 150 * math.sin(x / 360.0))) < 150
        return (near_spawn(x, y, 320) or lane or
                (x - GLADE[0])**2 + (y - GLADE[1])**2 < 430**2)
    # dense canopy everywhere outside the lane
    grid_fill(r, lambda x, y, s: r.canopy(x, y, s), open_area, step=104, smin=0.82, smax=1.16, chance=0.95)
    # understory: thornbrush + tufts crowding the lane edges
    r.scatter(r.bush, 46, (220, WORLD_W-220), (260, 1760),
              avoid=lambda x,y: open_area(x,y) and not near_spawn(x,y,360), smin=0.8, smax=1.15)
    r.scatter(lambda x,y,s: r.shrub(x,y,s), 24, (240, WORLD_W-260), (300, 1740),
              avoid=lambda x,y: open_area(x,y), smin=0.7, smax=1.0)
    # a beaten trail through the clearing
    r.stroke(meander(160, 2500, 1000, 150, 360), "#5d5236", 90)
    r.stroke(meander(160, 2500, 1000, 150, 360), "#6f6244", 44)
    # poacher's camp (tents, campfire, crates, bone piles, hunter's blinds)
    r.tent(900, 880, 1.8); r.tent(1040, 1080, 1.7); r.campfire(960, 990, 1.7)
    r.crate(840, 980, 2.1); r.barrel(1100, 900, 1.7)
    for (bx, by) in [(820, 1120), (1180, 1180), (700, 760), (1500, 860)]:
        r.bone(bx, by, r.R.rng(1.0, 1.4))
    r.scatter(r.stump, 10, (300, 2400), (360, 1660), avoid=open_area, smin=0.4, smax=0.48)
    r.scatter(r.rock, 16, (300, 2500), (360, 1660), avoid=lambda x,y: open_area(x,y) and not near_spawn(x,y), smin=0.7, smax=1.2)
    # boss glade: gnarled ring of stumps + bones around Vanaraksha
    gx, gy = GLADE
    for k in range(14):
        a = k / 14 * math.tau; r.rock(gx + math.cos(a)*360, gy + math.sin(a)*300*0.9, r.R.rng(0.9, 1.5))
    r.bone(gx-120, gy+120, 1.4); r.skull(gx+140, gy-60, 2.0)
    r.frame_walls(top=200, bottom=200, left=190, right=160, left_gap=(880, 1120))
    for (t, x, y) in [("bat",560,900),("bat",640,1100),("melee",1280,920),
                      ("melee",1360,1080),("rat",1640,980),("elite",1980,1000),("bat",2200,900)]:
        r.enemy(t, x, y)
    r.set_boss("vanaraksha", gx + 70, gy)
    r.npc("yellow", 300, 880, "Old Poacher",
          "I_came_for_pelts_and_found_the_woods_awake._Take_the_Stone_Key_from_my_camp_if_you_dare_the_pass..._and_do_not_wake_the_green_giant_at_the_glade.")
    r.npc("blue", 430, 1140, "Snared Pilgrim",
          "I_saw_a_kneeling_god_in_a_fever-dream,_chained_in_roots._The_hunters_laughed._Then_the_trees_began_to_move.")
    r.portal_back(11, 120, 1000)
    return r.emit()

@region(14)
def build_14():
    """Pasanadvara — The Stone Gate Pass. A narrow corridor between towering
    cliffs, guarded by stone sentinels at a carved gate. Critical-path threshold."""
    r = Region(14, "Pāṣāṇadvāra — The Stone Gate Pass", "#3b352f", 140014)
    def corridor_y(x): return 1000 + 120 * math.sin(x / 600.0)
    HALF = 250
    def open_area(x, y): return abs(y - corridor_y(x)) < HALF or near_spawn(x, y, 300)
    # 1) cliff walls of big rocks above & below the corridor
    grid_fill(r, lambda x, y, s: r.rock(x, y, r.R.rng(1.6, 3.4) if abs(y-corridor_y(x))>320 else r.R.rng(1.1, 2.2)),
              open_area, step=130, chance=1.0)
    # 2) the carved stone gate mid-pass
    r.gate(1600, corridor_y(1600) + 70, 1.6)
    # toll-shrine: pillars + brazier + a danger sign
    r.pillar(1420, corridor_y(1420)+150, 1.0); r.pillar(1780, corridor_y(1780)+150, 1.0)
    r.brazier(1500, corridor_y(1500)+120, 2.0); r.brazier(1700, corridor_y(1700)+120, 2.0)
    r.sign(1350, corridor_y(1350)+60, 2.6)
    # 3) rockslide debris + path
    r.stroke([(x, corridor_y(x)) for x in range(120, WORLD_W-120, 60)], "#544c42", 120)
    r.stroke([(x, corridor_y(x)) for x in range(120, WORLD_W-120, 60)], "#6a6052", 56)
    r.scatter(r.rock, 26, (260, WORLD_W-260), (400, 1600),
              avoid=lambda x,y: abs(y-corridor_y(x))>HALF-40 or near_spawn(x,y), smin=0.6, smax=1.2)
    r.scatter(lambda x,y,s: r.skull(x,y,r.R.rng(1.4,2.0)), 6, (500, 2600), (700, 1300),
              avoid=lambda x,y: abs(y-corridor_y(x))>HALF-60)
    # 4) collision: seal everything outside the corridor band (stepwise)
    SEG = 200; x = 0
    while x < WORLD_W:
        t = corridor_y(x + SEG/2) - HALF; b = corridor_y(x + SEG/2) + HALF
        r.zone(x, -120, SEG + 2, t + 120); r.zone(x, b, SEG + 2, WORLD_H - b + 120)
        x += SEG
    # gate guardians (elite sentinels) + lesser stone-kin
    for (t, x, y) in [("melee",900,980),("ranged",1180,1000),("elite",1560,1000),
                      ("elite",1660,960),("melee",2000,1040),("ranged",2300,1000)]:
        r.enemy(t, x, corridor_y(x) + (y-1000))
    r.npc("yellow", 320, 980, "Gate Hermit",
          "The_gate_was_raised_to_keep_something_OUT,_or_in._Read_the_carving:_five_gods_with_hands_upraised_and_a_sixth_niche_chiselled_blank._Pass_only_if_the_stone_lets_you.")
    r.portal_back(11, 120, 1000)
    r.portal_next(15, WORLD_W - 110, corridor_y(WORLD_W - 110))
    return r.emit()


# ============================================================================
def main():
    args = [int(a) for a in sys.argv[1:] if a.isdigit()]
    todo = args or sorted(REGISTRY)
    for idx in todo:
        if idx not in REGISTRY:
            print(f"  (no builder for {idx})"); continue
        st = REGISTRY[idx]()
        warn = "  ⚠ANIM" if st["animated"] > 18 else ""
        print(f"R{st['index']:<2} {st['name'][:34]:34} sprites={st['sprites']:4} "
              f"anim={st['animated']:2}{warn} zones={st['zones']:2} en={st['enemies']:2} "
              f"npc={st['npcs']} boss={st['boss']} portals={st['portals']}")

if __name__ == "__main__":
    main()
