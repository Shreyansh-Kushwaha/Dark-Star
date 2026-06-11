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
# ACT II — THE DROWNED REACH (water)
# ============================================================================
@region(15)
def build_15():
    """Plavita — The Sunken Causeway. A drowned road raised through flooded
    fields; tilted statues and submerged murals flank the only dry path."""
    r = Region(15, "Plāvita — The Sunken Causeway", "#33524a", 150015)
    def cway_y(x): return 1000 + 110 * math.sin(x / 560.0)
    HALF = 200
    def water(x, y): return abs(y - cway_y(x)) > HALF - 10 and not near_spawn(x, y, 300)
    # broad floodwater filling both flanks (dense wavy strokes, two tones)
    for yy in range(-40, int(700), 86):
        r.stroke([(x, yy + 34*math.sin(x/320.0)) for x in range(-60, WORLD_W+60, 70)], "#2b6f78" if (yy//86)%2 else "#327d86", 120)
    for yy in range(1320, 1820, 86):
        r.stroke([(x, yy + 34*math.sin(x/320.0)) for x in range(-60, WORLD_W+60, 70)], "#2b6f78" if (yy//86)%2 else "#327d86", 120)
    for (cx,cy,rx,ry) in [(700,520,260,150),(1500,460,300,150),(2300,560,260,150),
                          (900,1500,260,150),(1800,1540,300,150),(2500,1460,260,150)]:
        r.pool(cx,cy,rx,ry,"#256a73","#4aa0ad",150,80)        # brighter open water
    # the causeway: stone road + cobbles + worn edges
    r.stroke([(x, cway_y(x)) for x in range(80, WORLD_W-80, 60)], "#4f4a3e", 176)
    r.stroke([(x, cway_y(x)) for x in range(80, WORLD_W-80, 60)], "#5a5346", 150)
    r.stroke([(x, cway_y(x)) for x in range(80, WORLD_W-80, 60)], "#726857", 70)
    r.scatter(r.rock, 26, (200, WORLD_W-200), (700, 1300), avoid=lambda x,y: abs(y-cway_y(x))>HALF-30, smin=0.6, smax=1.1)
    r.scatter(r.dirt, 18, (200, WORLD_W-200), (760, 1240), avoid=lambda x,y: abs(y-cway_y(x))>HALF-30, smin=1.6, smax=2.4)
    # tilted statues (pillars) lining the road + submerged ruins in the shallows
    for sx in range(380, WORLD_W-280, 250):
        side = HALF - 24 if r.R.chance(0.5) else -(HALF - 24)
        r.pillar(sx, cway_y(sx) + side, r.R.rng(0.85, 1.15))
    r.scatter(lambda x,y,s: r.pillar(x,y,r.R.rng(0.7,1.0)), 12, (300, WORLD_W-300), (300, 1740),
              avoid=lambda x,y: abs(y-cway_y(x))<HALF+60)     # drowned columns out in the flood
    r.mural(1500, cway_y(1500) - HALF + 40, 1.3); r.mural(2300, cway_y(2300) + HALF - 30, 1.2)
    r.crate(640, cway_y(640)-70, 2.0); r.barrel(1180, cway_y(1180)+80, 1.7); r.crate(2050, cway_y(2050)-60, 2.1)
    r.lamp(900, cway_y(900)-130, 3.0); r.lamp(1800, cway_y(1800)+130, 3.0); r.lamp(1350, cway_y(1350)-130, 3.0)
    # reeds & lily-rocks crowding the water's edge
    r.scatter(lambda x,y,s: r.reed(x,y,r.R.rng(1.5,2.4)), 64, (140, WORLD_W-140), (200, 1800),
              avoid=lambda x,y: abs(y-cway_y(x)) < HALF-10)
    for _ in range(12):
        x = r.R.rng(260, WORLD_W-260); side = HALF + r.R.rng(60, 320)
        r.water_rock(x, cway_y(x) + (side if r.R.chance(0.5) else -side))
    r.water_splash(900, cway_y(900) - HALF - 40); r.water_splash(1900, cway_y(1900) + HALF + 40)
    # collision: water on both flanks of the causeway
    SEG = 200; x = 0
    while x < WORLD_W:
        t = cway_y(x+SEG/2) - HALF; b = cway_y(x+SEG/2) + HALF
        r.zone(x, -120, SEG+2, t+120); r.zone(x, b, SEG+2, WORLD_H-b+120); x += SEG
    for (t, x, y) in [("melee",780,1000),("slimem",1120,1000),("melee",1480,980),
                      ("ranged",1820,1020),("slimem",2160,1000),("melee",2460,1000)]:
        r.enemy(t, x, cway_y(x)+(y-1000))
    r.npc("yellow", 320, 1000, "Stranded Ferryman",
          "The_water_rose_the_night_the_Thread_broke_and_never_went_down._Walk_the_old_causeway,_keep_your_feet_dry..._the_murals_below_still_show_six_haloed_kings.")
    r.portal_back(14, 120, cway_y(120))
    r.portal_next(16, WORLD_W-110, cway_y(WORLD_W-110))
    return r.emit()

@region(16)
def build_16():
    """Naditira — The River-Ferry Village. A stilt-village hub on a wide delta;
    a ferry routes travelers to the marsh, the mire and the vale of stones."""
    r = Region(16, "Naditīra — The River-Ferry Village", "#39594d", 160016)
    def river_x(y): return 1640 + 70 * math.sin(y / 240.0)
    FORD = (1640, 1000)
    # the wide river down the middle
    r.river(river_x, "#2f7d97", "#62b6d4", 150, 70)
    for yv in range(120, WORLD_H, 240): r.water_rock(river_x(yv)+r.R.rng(-30,30), yv)
    for off in (-60,-20,22,60): r.water_rock(river_x(FORD[1]+off), FORD[1]+off)  # ford stones
    r.water_splash(river_x(700), 700); r.water_splash(river_x(1500), 1500)
    # west-bank village (stilt huts + docks + market)
    r.building("House1", "Blue", 430, 760, 1.2); r.building("House3", "Blue", 700, 720, 1.18)
    r.building("House2", "Blue", 360, 1300, 1.2); r.building("Tower", "Blue", 980, 760, 1.2)
    r.building("House1", "Blue", 760, 1340, 1.16)
    for (sx, sy) in [(560, 1010), (820, 1060), (980, 1080)]:
        r.tent(sx, sy, 1.7); r.crate(sx+44, sy, 2.1)
    r.campfire(620, 1180, 1.6); r.log(560,1120,1.7); r.log(700,1130,1.7)
    r.flag(980, 540, 1.6)
    for fy in range(900, 1120, 22): r.fence(1180, fy, 2.0)         # fish-drying racks near the dock
    # east-bank (smaller hamlet, toward the marsh)
    r.building("House2", "Yellow", 2300, 820, 1.1); r.building("House1", "Yellow", 2620, 1240, 1.1)
    r.tent(2480, 1020, 1.6); r.barrel(2380, 1100, 1.7)
    # docks (logs/planks) reaching into the river + lamps
    for (lx, ly) in [(480,1000),(840,1000),(1180,1000),(2200,1000),(2600,1000)]: r.lamp(lx, ly-70, 3.0)
    # greenery
    r.scatter(r.bush, 18, (200, WORLD_W-200), (300, 1760), avoid=lambda x,y: abs(x-river_x(y))<160, smin=0.8, smax=1.1)
    r.scatter(lambda x,y,s: r.reed(x,y,r.R.rng(1.4,2.0)), 22, (200, WORLD_W-200), (240, 1760), avoid=lambda x,y: abs(x-river_x(y))>200)
    r.scatter(lambda x,y,s: r.flower(x,y,r.R.rng(1.6,2.2)), 18, (200, 1200), (300, 1760), avoid=near_spawn)
    # collision: river is impassable except at the ford
    r.zone(river_x(500)-90, -80, 180, 920)        # north of ford
    r.zone(river_x(1500)-90, 1080, 180, WORLD_H-1080+80)  # south of ford
    r.frame_walls(top=200, bottom=200, left=180, right=180, left_gap=(900,1120), right_gap=(900,1120))
    for (t, x, y) in [("rat",900,1500),("melee",1300,1500),("bat",2300,600)]:
        r.enemy(t, x, y)
    r.npc("yellow", 320, 980, "Ferryman Setu",
          "Welcome_to_Naditira._The_ferry_runs_three_ways:_the_serpent_marsh_east,_the_whispering_mire,_and_the_quiet_vale_of_stones._A_god_once_paid_my_toll_for_every_soul..._until_they_struck_his_coin_from_the_mint.")
    r.npc("blue", 430, 1180, "Fishwife Mina",
          "Strange_catch_these_days_friend._Scales_that_aren't_fish._Keep_to_the_ford;_the_deep_water_pulls.")
    r.portal_back(15, 120, 1000)
    r.portal_next(18, WORLD_W-110, 1000)
    r.portal_to(17, 760, 1740)      # south spur -> the Mire (Kardama)
    r.portal_to(9, 760, 250)        # north spur -> Shilavana (Vale of Stones)
    return r.emit()

@region(17)
def build_17():
    """Kardama — The Mire of Whispers. A fetid swamp of poison pools, mangrove
    husks and drifting fog; mimics lurk in the muck. Optional, via the ferry."""
    r = Region(17, "Kardama — The Mire of Whispers", "#2d3a2a", 170017)
    def open_path(x, y):  # a faint winding causeway of mud
        return abs(y - (1000 + 230*math.sin(x/430.0) + 80*math.sin(x/170.0))) < 170 or near_spawn(x, y, 300)
    # poison pools scattered through the mire
    POOLS = [(700, 700, 220, 150), (1300, 1300, 260, 170), (1900, 760, 230, 150),
             (2450, 1250, 280, 180), (1650, 980, 200, 130)]
    for (cx, cy, rx, ry) in POOLS:
        r.pool(cx, cy, rx, ry, "#3c5230", "#6f8a3c", 200, 110)
    # mangrove: dead trees + a few dark canopies crowding outside the path
    grid_fill(r, lambda x, y, s: (r.dead_tree(x, y, r.R.rng(0.8,1.2)) if r.R.chance(0.6) else r.canopy(x,y,r.R.rng(0.8,1.05))),
              open_path, step=132, chance=0.9)
    r.scatter(r.bush, 30, (200, WORLD_W-200), (260, 1760), avoid=open_path, smin=0.8, smax=1.1)
    r.scatter(lambda x,y,s: r.reed(x,y,r.R.rng(1.6,2.4)), 30, (200, WORLD_W-200), (240, 1760),
              avoid=lambda x,y: not any((x-cx)**2/(rx+90)**2+(y-cy)**2/(ry+90)**2<1 for cx,cy,rx,ry in POOLS))
    # witch-light: green crystals + a half-sunk shrine of leaning pillars
    for (gx, gy) in [(900,1100),(1500,720),(2100,1100),(2400,800)]: r.crystal(gx, gy, r.R.rng(0.8,1.2), "cyan")
    r.pillar(2600, 980, 1.0); r.pillar(2720, 1040, 0.9); r.mural(2660, 1130, 1.1)
    r.scatter(r.bone, 8, (400, 2600), (400, 1600), avoid=open_path, smin=1.0, smax=1.4)
    # drifting fog via a few translucent... (kept static-light): use cloud sprites dimmed by scale
    for (mx, my) in [(800,1000),(1600,1050),(2300,980)]: r.cloud(mx, my, 0.5)
    # pools are hazards (no-walk)
    for i,(cx,cy,rx,ry) in enumerate(POOLS):
        r.zone(cx-rx*0.7, cy-ry*0.7, rx*1.4, ry*1.4, zid=f"z17_pool{i}")
    r.frame_walls(top=200, bottom=200, left=190, right=160, left_gap=(880,1120))
    for (t, x, y) in [("mimic",760,1080),("slimem",1180,940),("ranged",1500,1060),
                      ("mimic",1900,920),("slimem",2200,1080),("elite",2480,1000)]:
        r.enemy(t, x, y)
    r.npc("yellow", 300, 980, "Bog Hermit",
          "Listen_close_in_Kardama..._the_mud_whispers_a_name_the_priests_drowned._Ekatmadeva._Say_it_and_the_pools_glow_green._The_Bog_Mother_does_not_like_it_said.")
    r.portal_back(16, 120, 1000)
    return r.emit()

@region(18)
def build_18():
    """Nagakshetra — The Serpent Marsh. Brackish coiling channels and snake
    totems; the Naga guard the road to their drowned king's court."""
    r = Region(18, "Nāgakṣetra — The Serpent Marsh", "#3a4a30", 180018)
    def chan_x(y): return 1000 + 220*math.sin(y/300.0)   # a coiling channel
    # amber/brackish channels and pools
    r.river(lambda y: chan_x(y), "#7a5a24", "#a07a30", 150, 64)
    r.river(lambda y: chan_x(y)+520+90*math.sin(y/200.0), "#6f5520", "#946e2a", 110, 48)
    for yv in range(140, WORLD_H, 250): r.water_rock(chan_x(yv)+r.R.rng(-30,30), yv)
    POOLS = [(1500,700,240,150),(2000,1300,250,160),(2500,800,220,140)]
    for (cx,cy,rx,ry) in POOLS: r.pool(cx,cy,rx,ry,"#6a5320","#9a7a2e",190,100)
    def open_marsh(x,y): return near_spawn(x,y,320) or abs(y-(1000+120*math.sin(x/520.0)))<260
    # petrified trees + reeds outside the marsh path
    grid_fill(r, lambda x,y,s: r.dead_tree(x,y,r.R.rng(0.8,1.2)), open_marsh, step=150, chance=0.7)
    r.scatter(lambda x,y,s: r.reed(x,y,r.R.rng(1.6,2.6)), 44, (180, WORLD_W-180), (240, 1760),
              avoid=lambda x,y: near_spawn(x,y,200))
    # snake totems (pillars) + shed-skin bones + green witch-light toward the court
    for (px,py) in [(900,760),(1400,1240),(1900,720),(2400,1240),(2700,980)]:
        r.pillar(px, py, r.R.rng(0.9,1.2));
    for (gx,gy) in [(2500,1000),(2650,920),(2700,1080)]: r.crystal(gx,gy,r.R.rng(0.9,1.3),"cyan")
    r.scatter(r.bone, 10, (400, 2700), (380, 1640), avoid=near_spawn, smin=1.0, smax=1.4)
    for i,(cx,cy,rx,ry) in enumerate(POOLS): r.zone(cx-rx*0.7,cy-ry*0.7,rx*1.4,ry*1.4,zid=f"z18_pool{i}")
    r.frame_walls(top=200, bottom=200, left=190, right=150, left_gap=(880,1120))
    for (t, x, y) in [("melee",780,920),("ranged",1080,1080),("melee",1480,940),
                      ("ranged",1780,1060),("melee",2120,940),("ranged",2420,1040),("elite",2640,1000)]:
        r.enemy(t, x, y)
    r.npc("yellow", 300, 920, "Naga Acolyte",
          "Turn_back,_landwalker._Beyond_the_marsh_coils_Nagaraja_Kaliya._We_Naga_remember_our_lost_patron_when_no_one_else_dares..._we_guard_his_name_in_our_fangs.")
    r.portal_back(16, 120, 1000)
    r.portal_next(8, WORLD_W-110, 1000)   # -> Nagaraja Sabha (existing boss arena)
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
