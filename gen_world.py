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
    r = Region(12, "Withered Fields", "#6f6a39", 120012, subtitle="Dhānyakshetra")
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
        r.scarecrow(sx + r.R.rng(-30, 30), sy + r.R.rng(-40, 40), r.R.rng(1.4, 2.0))
    # 4) withered crops: dead stumps, dry bushes, hay; broken fences (no blooms — the field is famished)
    r.scatter(r.stump, 22, (300, WORLD_W-300), (420, 1560), avoid=near_spawn, smin=0.4, smax=0.55)
    r.scatter(r.bush, 18, (300, WORLD_W-300), (420, 1560), avoid=near_spawn, smin=0.6, smax=0.9)
    r.scatter(lambda x,y,s: r.dead_tree(x,y,r.R.rng(0.4,0.6)), 10, (300, WORLD_W-300), (400, 1580), avoid=near_spawn)
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
    r = Region(13, "Hunter's Thicket", "#23461b", 130013, subtitle="Mṛgavana")
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
    r = Region(14, "Stone Gate", "#3b352f", 140014, subtitle="Pāṣāṇadvāra"); r.rock_pal = "sand"
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
    r = Region(15, "Sunken Road", "#33524a", 150015, subtitle="Plāvita")
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
    r = Region(16, "Ferry Village", "#39594d", 160016, subtitle="Naditīra")
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
    r = Region(17, "Whisper Mire", "#2d3a2a", 170017, subtitle="Kardama")
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
    r = Region(18, "Serpent Marsh", "#3a4a30", 180018, subtitle="Nāgakṣetra")
    def chan_x(y): return 1000 + 220*math.sin(y/300.0)   # a coiling channel
    # murky brackish-green coiling channels and standing marsh pools (wet, not dry road)
    r.river(lambda y: chan_x(y), "#27402f", "#3c6347", 150, 64)
    r.river(lambda y: chan_x(y)+520+90*math.sin(y/200.0), "#243b2c", "#375b42", 110, 48)
    for yv in range(140, WORLD_H, 250): r.water_rock(chan_x(yv)+r.R.rng(-30,30), yv)
    POOLS = [(1500,700,240,150),(2000,1300,250,160),(2500,800,220,140)]
    for (cx,cy,rx,ry) in POOLS: r.pool(cx,cy,rx,ry,"#22433a","#356e54",190,100)
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
# ACT III — THE EMBERWASTES (desert / fire / temple)
# ============================================================================
def dunes(r, c0, c1, y0=-40, y1=WORLD_H+40, step=78, amp=40, width=120):
    for i, yy in enumerate(range(y0, y1, step)):
        r.stroke([(x, yy + amp*math.sin(x/300.0 + i*0.6)) for x in range(-60, WORLD_W+60, 70)],
                 c0 if i % 2 else c1, width)

@region(19)
def build_19():
    """Bhasmabhumi — The Ashen Flats. A scorched grey plain where the gods burned
    the sixth god's temples; the ash never settles."""
    r = Region(19, "Ash Flats", "#48423b", 190019, subtitle="Bhasmabhūmi"); r.rock_pal = "basalt"
    dunes(r, "#4f483f", "#544c42", amp=34, width=120)
    # smoking fissures (dark cracks with ember seams)
    for (fx0, fy) in [(500, 760), (1300, 1180), (2100, 720), (2500, 1240)]:
        pts = [(fx0 + t, fy + 60*math.sin(t/120.0)) for t in range(0, 600, 50)]
        r.stroke(pts, "#1c1512", 30); r.stroke(pts, "#7a2c12", 12)
    # the burned temples: toppled colonnades half-sunk in ash (clustered ruins)
    for (rx, ry, n, ang) in [(820, 760, 5, 0.15), (1500, 1240, 6, -0.1),
                             (2150, 760, 5, 0.2), (2550, 1240, 4, 0.0)]:
        for k in range(n):
            r.pillar(rx + k*78, ry + k*14*math.sin(ang) + r.R.rng(-12, 12), r.R.rng(0.7, 1.05))
        if r.R.chance(0.8): r.mural(rx + 30, ry + 130, r.R.rng(0.9, 1.2))
    # charred dead trees + ash drifts + rubble
    r.scatter(lambda x,y,s: r.dead_tree(x,y,r.R.rng(0.7,1.1)), 40, (240, WORLD_W-240), (320, 1700), avoid=near_spawn)
    r.scatter(r.rock, 54, (220, WORLD_W-220), (320, 1700), avoid=near_spawn, smin=0.7, smax=1.8)
    r.scatter(r.bone, 22, (300, WORLD_W-300), (360, 1660), avoid=near_spawn, smin=1.0, smax=1.6)
    r.scatter(lambda x,y,s: r.skull(x,y,r.R.rng(1.2,1.8)), 14, (400, WORLD_W-300), (400, 1600), avoid=near_spawn)
    r.scatter(r.dirt, 50, (220, WORLD_W-220), (340, 1680), smin=1.8, smax=3.0)
    r.scatter(lambda x,y,s: r.bush(x,y,r.R.rng(0.6,0.9)), 16, (260, WORLD_W-260), (360, 1660), avoid=near_spawn)
    # a few brittle gold-stone cinders glowing in the ash
    r.scatter(lambda x,y,s: r.gold(x,y,r.R.rng(0.5,0.8)), 16, (400, 2600), (420, 1580), avoid=near_spawn)
    r.frame_walls(top=190, bottom=190, left=180, right=160, left_gap=(880,1120), right_gap=(880,1120))
    for (t, x, y) in [("ranged",760,900),("slimem",1100,1080),("ranged",1480,940),
                      ("slimem",1820,1080),("ranged",2160,960),("elite",2520,1000)]:
        r.enemy(t, x, y)
    r.npc("yellow", 320, 980, "Ash Pilgrim",
          "This_is_where_they_BURNED_him_out_of_the_world_—_temple_by_temple,_name_by_name._Breathe_shallow._The_ash_you_taste_was_once_holy.")
    r.portal_back(8, 120, 1000)
    r.portal_next(20, WORLD_W-110, 1000)
    return r.emit()

@region(20)
def build_20():
    """Tamrapura — The Copper Bazaar. A sandstone desert trade-city; a relic
    dealer here sells a coin bearing the erased god's face. Act III hub."""
    r = Region(20, "Copper Bazaar", "#7a5d36", 200020, subtitle="Tāmrapura"); r.rock_pal = "sand"
    dunes(r, "#7d6038", "#866741", amp=26, width=110)
    # sandstone roads through the bazaar
    r.stroke(meander(120, WORLD_W-120, 1000, 60, 520), "#8a6d42", 150)
    r.stroke(meander(120, WORLD_W-120, 1000, 60, 520), "#9c7d4e", 74)
    r.stroke([(820, y) for y in range(1000, 1780, 40)], "#8a6d42", 110)
    # copper-domed buildings (yellow = golden) on both sides of the avenue
    r.building("Castle", "Yellow", 470, 760, 1.0)       # caravanserai
    r.building("House1", "Yellow", 760, 700, 1.2); r.building("House3", "Yellow", 1020, 720, 1.18)
    r.building("Tower", "Yellow", 1260, 760, 1.25); r.building("Monastery", "Yellow", 320, 1320, 0.95)
    r.building("House2", "Yellow", 640, 1340, 1.2); r.building("Barracks", "Yellow", 1080, 1340, 1.0)
    # the great furnace-forge (brazier cluster) + cistern
    for (bx,by) in [(1500,980),(1560,1040),(1620,980)]: r.brazier(bx, by, 2.2)
    r.pool(1500, 1300, 150, 90, "#256a73", "#4aa0ad", 120, 60)   # cistern shrine
    # market stalls, crates, barrels, banners, lamps
    for (sx,sy) in [(560,1010),(900,1060),(1140,1010),(1360,1070)]:
        r.tent(sx, sy, 1.7); r.crate(sx+44, sy, 2.1);
        if r.R.chance(0.6): r.barrel(sx-44, sy, 1.7)
    r.flag(1260, 540, 1.7); r.flag(902, 1064, 1.2); r.campfire(1500, 1130, 1.6)
    for lx in range(420, 1500, 240): r.lamp(lx, 1000-70 if (lx//240)%2 else 1000+70, 3.0)
    r.scatter(r.cactus, 14, (1700, WORLD_W-260), (360, 1700), avoid=near_spawn, smin=1.0, smax=1.6)
    r.scatter(r.rock, 16, (1700, WORLD_W-240), (360, 1700), smin=0.7, smax=1.4)
    r.frame_walls(top=200, bottom=200, left=180, right=180, left_gap=(900,1120), right_gap=(900,1120))
    for (t, x, y) in [("melee",1800,940),("ranged",2100,1060),("rat",1950,1500)]:
        r.enemy(t, x, y)
    r.npc("yellow", 320, 980, "Coppersmith Deva",
          "Genuine_relics,_friend!_This_coin_—_see_the_face?_No_temple_will_say_whose._I_call_him_the_Sixth._Worth_more_than_gold_to_the_right_pilgrim.")
    r.npc("blue", 430, 1180, "Relic Dealer",
          "Heatward_charms,_two_for_a_song._You'll_want_one_before_the_caldera_road._The_fire_there_was_lit_to_forge_weapons_against_a_god.")
    r.portal_back(19, 120, 1000)
    r.portal_next(22, WORLD_W-110, 1000)
    r.portal_to(21, 820, 1740)     # spur -> Glass Desert
    return r.emit()

@region(21)
def build_21():
    """Marusthala — The Glass Desert. Dunes fused to glass by old fire; mirages
    and a buried caravan. Optional spur off Tamrapura."""
    r = Region(21, "Glass Desert", "#9a7e4d", 210021, subtitle="Marusthala"); r.rock_pal = "sand"
    dunes(r, "#9c8050", "#a98c5b", amp=44, width=130)
    # glass spires (cyan crystals) catching the sun
    r.scatter(lambda x,y,s: r.crystal(x,y,r.R.rng(0.8,1.6),"cyan"), 22, (260, WORLD_W-260), (320, 1700), avoid=near_spawn)
    # mirage pools (faint shimmer) + a sun-bleached idol + buried caravan
    for (cx,cy) in [(900,760),(1700,1200),(2300,760)]:
        r.pool(cx,cy,200,120,"#7fa6a0","#a9c8c2",120,60)
    r.pillar(1500, 980, 1.2); r.mural(1500, 1110, 1.2)
    for (cx,cy) in [(2050,1000),(2120,1060)]: r.crate(cx,cy,2.2)
    r.barrel(1980, 1040, 1.7); r.bone(2180, 980, 1.4)
    r.scatter(r.cactus, 18, (260, WORLD_W-260), (320, 1700), avoid=near_spawn, smin=1.0, smax=1.7)
    r.scatter(r.rock, 18, (260, WORLD_W-260), (320, 1700), smin=0.7, smax=1.4)
    r.scatter(lambda x,y,s: r.skull(x,y,r.R.rng(1.2,1.8)), 8, (400, 2600), (400, 1600), avoid=near_spawn)
    r.frame_walls(top=190, bottom=190, left=180, right=160, left_gap=(880,1120))
    for (t, x, y) in [("melee",760,940),("ranged",1180,1060),("melee",1620,940),
                      ("ranged",2020,1060),("elite",2480,1000)]:
        r.enemy(t, x, y)
    r.npc("yellow", 320, 980, "Parched Wanderer",
          "Don't_trust_the_water_here;_it's_glass_and_lies._But_the_mirage_by_the_idol_replays_a_true_thing:_five_gods,_a_chisel,_and_a_sixth_face_scraped_from_the_stone.")
    r.portal_back(20, 120, 1000)
    return r.emit()

@region(22)
def build_22():
    """Agnikunda — The Firepit Caldera. Lava channels and basalt; the forge of
    the gods, where the weapons used against the sixth god were made."""
    r = Region(22, "Fire Caldera", "#2d201b", 220022, subtitle="Agnikuṇḍa"); r.rock_pal = "basalt"
    def lava(x): return 1000 + 150*math.sin(x/430.0) + 70*math.sin(x/170.0)
    # lava rivers (layered glowing strokes)
    r.stroke([(x, lava(x)) for x in range(-40, WORLD_W+40, 50)], "#7a1e08", 150)
    r.stroke([(x, lava(x)) for x in range(-40, WORLD_W+40, 50)], "#d4641e", 100)
    r.stroke([(x, lava(x)) for x in range(-40, WORLD_W+40, 50)], "#f2b038", 44)
    for (cx,cy,rx,ry) in [(900,560,230,140),(2200,1420,250,150),(1700,640,200,120)]:
        r.stroke([(cx+math.cos(math.radians(t))*rx*0.6, cy+math.sin(math.radians(t))*ry*0.6) for t in range(0,372,18)], "#7a1e08", 150)
        r.stroke([(cx+math.cos(math.radians(t))*rx*0.6, cy+math.sin(math.radians(t))*ry*0.6) for t in range(0,372,18)], "#e07a22", 70)
    def open_floor(x, y): return abs(y - lava(x)) > 130 or near_spawn(x, y, 280)
    # basalt fields + cooled lava rocks
    grid_fill(r, lambda x,y,s: r.rock(x,y,r.R.rng(1.4,3.0) if abs(y-lava(x))>360 else r.R.rng(1.0,1.8)),
              lambda x,y: abs(y-lava(x))<200 or near_spawn(x,y,300), step=140, chance=0.85)
    r.scatter(lambda x,y,s: r.lava_rock(x,y,r.R.rng(1.0,1.8)), 30, (240, WORLD_W-240), (320, 1700),
              avoid=lambda x,y: abs(y-lava(x))<150, )
    # the anvil-altar (pillars + brazier) on a basalt island
    r.pillar(2600, 940, 1.1); r.pillar(2760, 940, 1.1); r.brazier(2680, 1000, 2.6)
    r.scatter(lambda x,y,s: r.gold(x,y,r.R.rng(0.6,1.0)), 12, (300, 2600), (360, 1640),
              avoid=lambda x,y: abs(y-lava(x))<170)
    # lava channel is lethal no-walk (stepwise band)
    SEG=200; x=0
    while x<WORLD_W:
        c=lava(x+SEG/2); r.zone(x, c-130, SEG+2, 260, zid=f"z22_lava{x}"); x+=SEG
    r.frame_walls(top=170, bottom=170, left=180, right=160, left_gap=(880,1120), right_gap=(880,1120))
    for (t, x, y) in [("ranged",760,760),("elite",1180,1240),("ranged",1620,760),
                      ("melee",2020,1240),("elite",2400,1000)]:
        r.enemy(t, x, y)
    r.npc("yellow", 320, 760, "Cinder Smith",
          "Every_blade_that_struck_the_Sixth_was_born_in_this_pit._I_stoke_the_fire_still,_god_help_me._Bring_a_Heatward_Charm_or_the_floor_will_cook_you.")
    r.portal_back(20, 120, 1000)
    r.portal_next(23, WORLD_W-110, 1000)
    return r.emit()

@region(23)
def build_23():
    """Deva Mandira — The Temple of the Gods. The conspirators' golden seat; the
    Great Mural shows six halos with one scraped away."""
    r = Region(23, "Temple of Gods", "#7a5a28", 230023, subtitle="Deva Mandira")
    # marble avenue up the middle
    r.stroke([(x, 1000) for x in range(80, WORLD_W-80, 60)], "#9a7d44", 200)
    r.stroke([(x, 1000) for x in range(80, WORLD_W-80, 60)], "#b49a5e", 110)
    r.stroke([(x, 1000) for x in range(80, WORLD_W-80, 60)], "#cab37a", 50)
    # colonnade: pillar rows flanking the avenue
    for px in range(360, WORLD_W-300, 230):
        r.pillar(px, 760, r.R.rng(1.1, 1.3)); r.pillar(px, 1240, r.R.rng(1.1, 1.3))
    # grand temple buildings (golden)
    r.building("Monastery", "Yellow", 520, 640, 1.1); r.building("Castle", "Yellow", 2700, 760, 1.05)
    r.building("Tower", "Yellow", 1500, 600, 1.3)
    # the Great Mural — front and centre on the temple steps
    r.mural(1500, 900, 2.4)
    # braziers lighting the avenue + banners
    for bx in range(500, WORLD_W-400, 300): r.brazier(bx, 1100 if (bx//300)%2 else 900, 2.4)
    r.flag(1500, 360, 1.9); r.flag(520, 470, 1.5)
    r.scatter(lambda x,y,s: r.gold(x,y,r.R.rng(0.7,1.1)), 16, (300, WORLD_W-300), (360, 1640),
              avoid=lambda x,y: abs(y-1000)<150, )
    r.frame_walls(top=200, bottom=200, left=180, right=170, left_gap=(900,1120), right_gap=(900,1120))
    for (t, x, y) in [("melee",820,940),("ranged",1120,1060),("melee",1820,940),
                      ("ranged",2120,1060),("elite",2400,1000),("melee",2000,760)]:
        r.enemy(t, x, y)
    r.npc("yellow", 320, 980, "Temple Priest",
          "There_were_always_FIVE_great_gods,_pilgrim._Five._Pay_no_mind_to_the_sixth_niche_in_the_mural;_the_mason_erred,_nothing_more._Now_kneel_and_ask_no_questions.")
    r.npc("blue", 430, 1140, "Doubting Acolyte",
          "Five,_he_says._Then_why_does_the_mural_have_six_halos,_and_why_was_one_chiselled_to_nothing?_I_say_the_Sixth_was_real,_and_they_un-made_him.")
    r.portal_back(22, 120, 1000)
    r.portal_next(24, WORLD_W-110, 1000)
    return r.emit()

@region(24)
def build_24():
    """Pashana Daitya's Forge. The inner forge-sanctum; the stone-and-fire demon
    built to guard the lie. Act III boss arena."""
    r = Region(24, "Demon Forge", "#3a2a22", 240024, subtitle="Pāṣāṇa Daitya"); r.rock_pal = "basalt"
    ARENA = (2680, 1000)
    def lava(x): return 1000 + 90*math.sin(x/380.0)
    r.stroke([(x, lava(x)) for x in range(-40, 2300, 50)], "#7a1e08", 130)
    r.stroke([(x, lava(x)) for x in range(-40, 2300, 50)], "#d4641e", 80)
    r.stroke([(x, lava(x)) for x in range(-40, 2300, 50)], "#f2b038", 36)
    def open_floor(x, y): return abs(y-lava(x))>120 or near_spawn(x,y,280) or (x-ARENA[0])**2+(y-ARENA[1])**2<460**2
    grid_fill(r, lambda x,y,s: r.rock(x,y,r.R.rng(1.4,3.0)),
              lambda x,y: open_floor(x,y), step=138, chance=0.9)
    r.scatter(lambda x,y,s: r.lava_rock(x,y,r.R.rng(1.0,1.8)), 22, (240, 2300), (320, 1700),
              avoid=lambda x,y: abs(y-lava(x))<140 or (x-ARENA[0])**2+(y-ARENA[1])**2<460**2)
    # bellows, slag heaps, a half-finished colossus (pillars + brazier) near the arena
    r.pillar(2380, 820, 1.2); r.pillar(2380, 1180, 1.2); r.brazier(2360, 1000, 2.8)
    for k in range(12):
        a=k/12*math.tau; r.rock(ARENA[0]+math.cos(a)*420, ARENA[1]+math.sin(a)*360, r.R.rng(1.2,2.2))
    r.scatter(lambda x,y,s: r.gold(x,y,r.R.rng(0.7,1.1)), 10, (2400,3000),(640,1360),
              avoid=lambda x,y:(x-ARENA[0])**2+(y-ARENA[1])**2<420**2)
    SEG=200; x=0
    while x<2300:
        c=lava(x+SEG/2); r.zone(x,c-120,SEG+2,240,zid=f"z24_lava{x}"); x+=SEG
    r.frame_walls(top=180, bottom=180, left=180, right=150, left_gap=(880,1120))
    for (t, x, y) in [("ranged",820,820),("melee",1120,1180),("elite",1700,1000),("ranged",2050,820)]:
        r.enemy(t, x, y)
    r.set_boss("pashana_daitya", ARENA[0], ARENA[1])
    r.npc("yellow", 320, 1000, "Forge-Bound Shade",
          "It_is_not_alive,_what_waits_in_the_forge._They_BUILT_it_from_stone_and_oath_to_keep_the_lie_standing._Break_it,_and_the_temple's_word_cracks_with_it.")
    r.portal_back(23, 120, 1000)
    r.portal_next(25, WORLD_W-110, 1000)
    return r.emit()


# ============================================================================
# ACT IV — THE SKYWARD CLIMB (sky / snow)
# ============================================================================
def sky_void(r, keep, cloud_n=26):
    """Fill the off-path sky with drifting clouds (decorative, behind play)."""
    for _ in range(cloud_n):
        x = r.R.rng(-40, WORLD_W+40); y = r.R.rng(-40, WORLD_H+40)
        if keep(x, y): continue
        r.cloud(x, y, r.R.rng(0.45, 0.9))

@region(25)
def build_25():
    """Meghasopana — The Cloud Stair. Floating stone stairs climbing through the
    clouds toward the gods who 'ascended above judgment.'"""
    r = Region(25, "Cloud Stair", "#8fb4d6", 250025, subtitle="Meghasopāna"); r.rock_pal = "sand"
    def stair_y(x): return 1380 - (x / WORLD_W) * 760 + 60*math.sin(x/300.0)  # rising path
    HALF = 180
    def on_stair(x, y): return abs(y - stair_y(x)) < HALF or near_spawn(x, y, 280)
    sky_void(r, on_stair, 30)
    # the cloud road + floating-stone steps
    for x in range(120, WORLD_W-80, 150):
        r.cloud_platform(x, stair_y(x), r.R.rng(0.9, 1.2))
    for x in range(180, WORLD_W-120, 240):
        r.rock(x, stair_y(x)+40, r.R.rng(1.4, 2.2));
        if r.R.chance(0.5): r.pillar(x+60, stair_y(x)-20, r.R.rng(0.8, 1.0))
    # prayer-bell lamps + updraft wisps (gold stones glints)
    for x in range(260, WORLD_W-200, 300): r.lamp(x, stair_y(x)-120, 3.0)
    r.scatter(lambda x,y,s: r.gold(x,y,r.R.rng(0.5,0.8)), 14, (200, WORLD_W-200), (200, 1700),
              avoid=lambda x,y: not on_stair(x,y))
    # seal the open sky above & below the climbing band
    SEG=200; x=0
    while x<WORLD_W:
        c=stair_y(x+SEG/2); r.zone(x,-160,SEG+2,c-HALF+160); r.zone(x,c+HALF,SEG+2,WORLD_H-(c+HALF)+160); x+=SEG
    for (t, x) in [("flying",760),("ranged",1180),("flying",1620),("ranged",2020),("flying",2400)]:
        r.enemy(t, x, stair_y(x))
    r.npc("yellow", 360, stair_y(360), "Sky Pilgrim",
          "Each_step_climbs_toward_the_five_who_rose_above_all_judgment._Mind_the_updrafts._And_mind_that_'five'_—_there_should_be_six_thrones_at_the_top.")
    r.portal_back(24, 120, stair_y(120))
    r.portal_next(26, WORLD_W-110, stair_y(WORLD_W-110))
    return r.emit()

@region(26)
def build_26():
    """Vayupatha — The Windward Cliffs. Sheer cliffs and rope-bridges lashed by
    crosswinds; a carving shows a god cast down."""
    r = Region(26, "Wind Cliffs", "#7a93ad", 260026, subtitle="Vāyupatha"); r.rock_pal = "sand"
    def ledge_y(x): return 1000 + 150*math.sin(x/520.0)
    HALF = 170
    def on_ledge(x, y): return abs(y - ledge_y(x)) < HALF or near_spawn(x, y, 280)
    sky_void(r, on_ledge, 26)
    # cliff faces hug the ledge corridor; the deep sky beyond stays open & airy
    grid_fill(r, lambda x,y,s: r.rock(x,y,r.R.rng(1.4,2.8)),
              lambda x,y: abs(y-ledge_y(x))<HALF+50 or abs(y-ledge_y(x))>HALF+340 or near_spawn(x,y,300),
              step=150, chance=0.6)
    # rope-bridges (custom deck) spanning gaps in the ledge
    for x in range(420, WORLD_W-300, 520):
        r.bridge_deck(x, ledge_y(x), 1.25); r.bridge_deck(x+150, ledge_y(x+150), 1.25)
    r.stroke([(x, ledge_y(x)) for x in range(120, WORLD_W-120, 60)], "#6a6052", 110)
    # the cast-down-god carving + wind-shrines
    r.mural(1500, ledge_y(1500)-HALF+40, 1.6)
    r.brazier(900, ledge_y(900)+90, 2.2); r.brazier(2100, ledge_y(2100)+90, 2.2)
    r.scatter(r.rock, 20, (240, WORLD_W-240), (400, 1600),
              avoid=lambda x,y: abs(y-ledge_y(x))>HALF-30, smin=0.6, smax=1.2)
    SEG=200; x=0
    while x<WORLD_W:
        c=ledge_y(x+SEG/2); r.zone(x,-160,SEG+2,c-HALF+160); r.zone(x,c+HALF,SEG+2,WORLD_H-(c+HALF)+160); x+=SEG
    for (t, x) in [("flying",760),("melee",1120),("flying",1560),("melee",1980),("flying",2360)]:
        r.enemy(t, x, ledge_y(x))
    r.npc("blue", 360, ledge_y(360), "Wind-Climber",
          "Hold_fast_on_the_bridges_—_the_gusts_will_take_you._See_the_carving_in_the_rock?_A_winged_figure_falling._They_say_it's_the_god_they_threw_down.")
    r.portal_back(25, 120, ledge_y(120))
    r.portal_next(27, WORLD_W-110, ledge_y(WORLD_W-110))
    return r.emit()

@region(27)
def build_27():
    """Garudalaya — The Eyrie Sanctuary. The bird-folk's cliff-top refuge; they
    kept uncensored records and can teach the erased god's true name. Hub."""
    r = Region(27, "The Eyrie", "#86a8c8", 270027, subtitle="Garuḍālaya")
    sky_void(r, lambda x,y: 220<x<WORLD_W-220 and 300<y<WORLD_H-300, 22)
    # a broad cloud terrace as the floor
    for x in range(120, WORLD_W-80, 200):
        for y in (560, 1000, 1440): r.cloud_platform(x, y, r.R.rng(0.8, 1.1))
    # nest-towers (the roosts) + wind-shrines
    r.building("Tower", "Blue", 470, 760, 1.3); r.building("Tower", "Blue", 1100, 720, 1.25)
    r.building("Tower", "Blue", 760, 1340, 1.25); r.building("Monastery", "Blue", 2700, 820, 1.0)
    r.pillar(1500, 980, 1.3); r.pillar(1700, 980, 1.3); r.brazier(1600, 1040, 2.6)   # the great roost shrine
    for (sx,sy) in [(600,1050),(900,1080),(1250,1060)]: r.tent(sx,sy,1.6); r.crate(sx+44,sy,2.0)
    r.flag(470, 560, 1.7); r.flag(1100, 520, 1.7); r.campfire(640, 1180, 1.6)
    for lx in range(420, WORLD_W-300, 280): r.lamp(lx, 1000-70 if (lx//280)%2 else 1000+70, 3.0)
    r.scatter(lambda x,y,s: r.gold(x,y,r.R.rng(0.6,1.0)), 14, (300, WORLD_W-300), (360, 1640),
              avoid=lambda x,y: not (220<x<WORLD_W-220 and 300<y<WORLD_H-300))
    r.frame_walls(top=240, bottom=240, left=190, right=180, left_gap=(900,1120), right_gap=(900,1120))
    for (t, x, y) in [("flying",1900,760),("flying",2150,1200),("melee",1750,1000)]:
        r.enemy(t, x, y)
    r.npc("yellow", 360, 980, "Garuda Loremaster",
          "We_birds_keep_what_the_temples_burned._The_Sixth_had_a_name:_EKATMADEVA,_the_One_Soul._Speak_it_at_heaven's_gate_and_the_clouds_will_part_for_you.")
    r.npc("blue", 470, 1180, "Eyrie Healer",
          "Rest_your_wings,_groundling._The_frostpeak_north_holds_a_pilgrim_frozen_mid-prayer_to_a_god_no_one_admits_existed.")
    r.portal_back(26, 120, 1000)
    r.portal_next(29, WORLD_W-110, 1000)
    r.portal_to(28, 760, 250)    # spur -> Frostpeak
    return r.emit()

@region(28)
def build_28():
    """Himashikhara — The Frostpeak. A blizzard-wracked summit where a pilgrim
    froze mid-prayer to the erased god. Optional spur off Garudalaya."""
    r = Region(28, "Frostpeak", "#bcc8d4", 280028, subtitle="Himashikhara")
    # snow drifts (pale wavy strokes)
    for i, yy in enumerate(range(-40, WORLD_H+40, 84)):
        r.stroke([(x, yy+30*math.sin(x/320.0+i)) for x in range(-60, WORLD_W+60, 70)],
                 "#c6d2dd" if i%2 else "#d2dde6", 110)
    def open_snow(x, y): return True
    # snow-laden rocks, ice shards, frost crystals
    r.scatter(lambda x,y,s: r.rock(x,y,r.R.rng(1.2,2.6)), 30, (240, WORLD_W-240), (320, 1700), avoid=near_spawn)
    r.scatter(lambda x,y,s: r.ice(x,y,r.R.rng(0.8,1.6)), 30, (240, WORLD_W-240), (300, 1720), avoid=near_spawn)
    r.scatter(lambda x,y,s: r.crystal(x,y,r.R.rng(0.7,1.2),"cyan"), 18, (260, WORLD_W-260), (340, 1680), avoid=near_spawn)
    # the frozen pilgrim's shrine: ice-clad pillars + a mural
    r.pillar(2500, 940, 1.0); r.pillar(2660, 940, 1.0); r.ice(2580, 1000, 2.0); r.mural(2580, 1110, 1.1)
    r.scatter(lambda x,y,s: r.dead_tree(x,y,r.R.rng(0.6,0.9)), 12, (300, 2600), (360, 1640), avoid=near_spawn)
    r.frame_walls(top=200, bottom=200, left=190, right=160, left_gap=(880,1120))
    for (t, x, y) in [("ranged",760,920),("melee",1120,1080),("ranged",1520,940),
                      ("melee",1920,1080),("elite",2360,1000)]:
        r.enemy(t, x, y)
    r.npc("blue", 320, 980, "Frozen Pilgrim",
          "...c-cold..._I_climbed_to_pray_to_the_Sixth_where_no_priest_could_stop_me..._the_blizzard_took_me_mid-word..._say_his_name_for_me..._Ekatmadeva...")
    r.portal_back(27, 120, 1000)
    return r.emit()

@region(29)
def build_29():
    """Swarga Seema — The Edge of Heaven. The pale rim of the five gods' realm —
    the conspiracy's penthouse. Opens only to one who knows the Sixth's name."""
    r = Region(29, "Heaven's Edge", "#a8c4dc", 290029, subtitle="Swarga Seema")
    sky_void(r, lambda x,y: 200<x<WORLD_W-200 and 320<y<WORLD_H-320, 22)
    # cloud terraces (the floor) + heavenly avenue
    for x in range(120, WORLD_W-80, 190):
        for y in (600, 1000, 1400): r.cloud_platform(x, y, r.R.rng(0.85, 1.15))
    r.stroke([(x,1000) for x in range(80,WORLD_W-80,60)], "#c2d6e8", 150)
    # golden colonnade + the heavenly gate + apsara fountains
    for px in range(360, WORLD_W-300, 240):
        r.pillar(px, 740, r.R.rng(1.1,1.3)); r.pillar(px, 1260, r.R.rng(1.1,1.3))
    r.gate(1500, 1070, 1.6)
    for (cx,cy) in [(820,1000),(2200,1000)]: r.pool(cx,cy,150,90,"#7fb0d0","#a9cfe6",120,60)
    for bx in range(520, WORLD_W-400, 320): r.brazier(bx, 1100 if (bx//320)%2 else 900, 2.4)
    r.flag(1500, 760, 1.9)
    r.scatter(lambda x,y,s: r.gold(x,y,r.R.rng(0.7,1.1)), 16, (300, WORLD_W-300), (360, 1640),
              avoid=lambda x,y: not (200<x<WORLD_W-200 and 320<y<WORLD_H-320))
    r.frame_walls(top=240, bottom=240, left=190, right=170, left_gap=(900,1120), right_gap=(900,1120))
    for (t, x, y) in [("melee",820,940),("ranged",1120,1060),("melee",1820,940),
                      ("ranged",2120,1060),("flying",2000,760),("elite",2380,1000)]:
        r.enemy(t, x, y)
    r.npc("yellow", 360, 980, "Apsara Guide",
          "So_you_know_the_name._Then_the_gate_opens._Beyond_it_sit_the_FIVE_who_remain_—_and_the_empty_sixth_throne_they_will_not_explain.")
    r.portal_back(27, 120, 1000)
    r.portal_next(30, WORLD_W-110, 1000)
    return r.emit()

@region(30)
def build_30():
    """Vayu Rakshasa's Tempest. The eye of a sky-storm guarding heaven's lie.
    Act IV boss arena."""
    r = Region(30, "Storm's Eye", "#5a6e84", 300030, subtitle="Vāyu Rākṣasa"); r.rock_pal = "void"
    ARENA = (1700, 1000)
    sky_void(r, lambda x,y: (x-ARENA[0])**2+(y-ARENA[1])**2 < 520**2 or near_spawn(x,y,280) or abs(y-1000)<150, 18)
    # lightning arcs across the storm (jagged blue strokes)
    for (lx, ly) in [(600,500),(2300,520),(900,1500),(2100,1480)]:
        pts=[(lx+i*40+r.R.rng(-20,20), ly+i*30*(1 if i%2 else -1)) for i in range(0,8)]
        r.stroke(pts, "#cfe0f5", 6); r.stroke(pts, "#8fb6e8", 3)
    # the cloud-road in, and the eye of the storm (clear arena)
    r.stroke([(x,1000) for x in range(80, 1300, 60)], "#c2d6e8", 150)
    for x in range(140, 1300, 180): r.cloud_platform(x, 1000, r.R.rng(0.9,1.15))
    # spinning debris ring + a torn banner of six gods
    for k in range(16):
        a=k/16*math.tau; r.rock(ARENA[0]+math.cos(a)*460, ARENA[1]+math.sin(a)*420, r.R.rng(1.0,2.0))
    r.mural(ARENA[0], ARENA[1]-360, 1.6); r.flag(ARENA[0]-300, ARENA[1]-200, 1.6)
    # seal everything except the entry road and the eye
    def keep(x,y): return (x-ARENA[0])**2+(y-ARENA[1])**2<480**2 or (x<1300 and abs(y-1000)<160) or near_spawn(x,y,260)
    SEG=180; x=0
    while x<WORLD_W:
        cx=x+SEG/2; yy=-160
        while yy<WORLD_H:
            if not keep(cx, yy+90): r.zone(x, yy, SEG+2, 184, zid=f"z30_{x}_{yy}")
            yy+=180
        x+=SEG
    for (t, x, y) in [("flying",900,1000),("flying",1300,900),("flying",1300,1100)]:
        r.enemy(t, x, y)
    r.set_boss("vayu_rakshasa", ARENA[0], ARENA[1])
    r.npc("yellow", 360, 1000, "Storm Herald",
          "The_last_guardian_of_heaven's_lie_rides_this_storm._Strike_it_down_and_it_will_point_you_where_they_buried_him_—_down,_below_the_world.")
    r.portal_back(29, 120, 1000)
    r.portal_next(35, WORLD_W-110, 1000)
    return r.emit()


# ============================================================================
# ACT V — THE SUNLESS DEEP (cave / underworld)
# ============================================================================
def cave(r, cy_fn, half_fn, wall_step=138, wall_max=3.6):
    """Carve a walkable cavern band; fill the rock outside it and seal it."""
    def in_cav(x, y): return abs(y - cy_fn(x)) < half_fn(x) or near_spawn(x, y, 260)
    grid_fill(r, lambda x, y, s: r.rock(x, y, r.R.rng(2.4, wall_max) if abs(y-cy_fn(x)) > half_fn(x)+240 else r.R.rng(1.4, 2.6)),
              in_cav, step=wall_step, chance=1.0)
    SEG = 200; x = 0
    while x < WORLD_W:
        c = cy_fn(x+SEG/2); h = half_fn(x+SEG/2)
        r.zone(x, -120, SEG+2, (c-h)+120); r.zone(x, c+h, SEG+2, WORLD_H-(c+h)+120); x += SEG
    return in_cav

@region(31)
def build_31():
    """Andhakupa — The Blind Well. A vast shaft descending into the dark, dug to
    bury what the gods wanted gone. Entered by the lift from Setubandha."""
    r = Region(31, "Blind Well", "#15110f", 310031, subtitle="Andhakūpa")
    cy = lambda x: 1000 + 150*math.sin(x/520.0)
    half = lambda x: 300 + 120*math.exp(-((x-700)**2)/(2*360.0**2))
    in_cav = cave(r, cy, half)
    # spiral ledges (rock steps), dripping roots (dead trees), lantern torches
    for x in range(220, WORLD_W-160, 200):
        r.lamp(x, cy(x)-half(x)+40, r.R.rng(2.8,3.4))
        if r.R.chance(0.6): r.lamp(x+60, cy(x)+half(x)-40, r.R.rng(2.8,3.4))
    r.scatter(lambda x,y,s: r.dead_tree(x,y,r.R.rng(0.5,0.8)), 12, (240, WORLD_W-200), (360, 1640),
              avoid=lambda x,y: not in_cav(x,y))
    r.scatter(r.rock, 30, (200, WORLD_W-160), (360, 1640), avoid=lambda x,y: not in_cav(x,y), smin=0.7, smax=1.5)
    r.scatter(lambda x,y,s: r.crystal(x,y,r.R.rng(0.6,1.0),"cyan"), 10, (300, WORLD_W-200), (380, 1620),
              avoid=lambda x,y: not in_cav(x,y))
    r.lift(360, cy(360)+90, 1.1)     # the creaking cargo lift you arrived on
    for (t, x) in [("bat",640),("bat",760),("rat",980),("bat",1320),("rat",1700),("bat",2100),("elite",2500)]:
        r.enemy(t, x, cy(x))
    r.npc("yellow", 320, cy(320), "Lantern Keeper",
          "Down_and_down,_traveler._This_well_was_dug_for_one_purpose:_to_BURY_something_the_gods_could_not_kill._Keep_a_flame._The_dark_here_has_opinions.")
    r.portal_back(11, 120, cy(120))     # lift back up to Setubandha
    r.portal_next(32, WORLD_W-110, cy(WORLD_W-110))
    return r.emit()

@region(32)
def build_32():
    """Ratnaguha — The Gem Hollows. Glowing crystal caverns and old mine ruins;
    the gems hold light from before the severing. Optional."""
    r = Region(32, "Gem Hollows", "#171420", 320032, subtitle="Ratnaguha")
    cy = lambda x: 1000 + 130*math.sin(x/470.0)
    half = lambda x: 330 + 130*math.exp(-((x-1500)**2)/(2*520.0**2))
    in_cav = cave(r, cy, half)
    # crystal clusters everywhere (the glow)
    for kind, n in [("cyan",22),("purple",16),("amber",12)]:
        r.scatter(lambda x,y,s,k=kind: r.crystal(x,y,r.R.rng(0.7,1.6),k), n, (240, WORLD_W-180), (360, 1640),
                  avoid=lambda x,y: not in_cav(x,y))
    # underground pools + mine ruins (crates, fences, gold)
    for (cx,cy2) in [(900,1000),(2100,1000)]: r.pool(cx,cy2,200,120,"#1c4f63","#2f7d97",150,80)
    for (mx,my) in [(700,800),(1600,1180),(2300,820)]:
        r.crate(mx,my,2.0); r.barrel(mx+50,my,1.6)
    for fy in range(900,1100,24): r.fence(1200, fy, 2.0)
    r.scatter(lambda x,y,s: r.gold(x,y,r.R.rng(0.7,1.2)), 16, (260, WORLD_W-180), (380, 1620),
              avoid=lambda x,y: not in_cav(x,y))
    for x in range(260, WORLD_W-180, 280): r.lamp(x, cy(x)-half(x)+40, 3.0)
    for (t, x) in [("slimem",680),("mimic",1000),("slimem",1400),("bat",1700),("mimic",2050),("slimem",2400)]:
        r.enemy(t, x, cy(x))
    r.npc("yellow", 320, cy(320), "Lost Miner",
          "Don't_touch_the_chests,_friend,_some_have_teeth._But_the_gems..._hold_one_up_and_you'll_see_light_from_BEFORE_the_Thread_broke._Proof_the_old_world_was_whole.")
    r.portal_back(31, 120, cy(120))
    r.portal_next(10, WORLD_W-110, cy(WORLD_W-110))   # -> Patala Guha (existing)
    return r.emit()

@region(33)
def build_33():
    """Asthinagara — The City of Bone. A buried ossuary-city whose dead testify
    to the erasure unfiltered; a tunnel rises to the Torn Land."""
    r = Region(33, "Bone City", "#26221e", 330033, subtitle="Asthinagara"); r.rock_pal = "sand"
    cy = lambda x: 1000 + 110*math.sin(x/560.0)
    half = lambda x: 360 + 120*math.exp(-((x-1600)**2)/(2*620.0**2))
    in_cav = cave(r, cy, half, wall_max=3.2)
    # bone arches lining an ossuary avenue + bone-clad pillar towers
    for x in range(420, WORLD_W-300, 300):
        r.bone_arch(x, cy(x)-half(x)+150, r.R.rng(1.0,1.3))
    for px in range(360, WORLD_W-300, 360):
        r.pillar(px, cy(px)+half(px)-60, r.R.rng(1.0,1.3))
    # ancestor-shrine + sunken plaza of bones & skulls
    r.mural(1600, cy(1600), 2.0)
    r.scatter(r.bone, 34, (260, WORLD_W-200), (380, 1620), avoid=lambda x,y: not in_cav(x,y), smin=1.0, smax=1.7)
    r.scatter(lambda x,y,s: r.skull(x,y,r.R.rng(1.2,2.0)), 22, (300, WORLD_W-220), (400, 1600),
              avoid=lambda x,y: not in_cav(x,y))
    for x in range(280, WORLD_W-200, 300): r.lamp(x, cy(x)-half(x)+50, 3.0)
    for (t, x) in [("melee",680),("ranged",980),("melee",1340),("ranged",1700),("melee",2080),("elite",2480)]:
        r.enemy(t, x, cy(x))
    r.npc("yellow", 320, cy(320), "Bone Speaker",
          "The_living_lie,_but_the_DEAD_remember._Every_skull_here_died_knowing_the_Sixth_was_real._Climb_the_tunnel_to_the_torn_land_when_you've_heard_enough_truth.")
    r.portal_back(10, 120, cy(120))      # from Patala Guha
    r.portal_next(34, WORLD_W-110, cy(WORLD_W-110))
    r.portal_to(35, 760, 250)            # tunnel up -> Chidrabhumi (the Severance)
    return r.emit()

@region(34)
def build_34():
    """Vismrti Kupa — The Well of Forgetting. The drowned vault where the gods
    sank every record of Ekatmadeva; a sealed sixth door waits for all the lore."""
    r = Region(34, "Forgotten Well", "#0d0c10", 340034, subtitle="Vismṛti Kūpa")
    cy = lambda x: 1000 + 90*math.sin(x/600.0)
    half = lambda x: 320 + 150*math.exp(-((x-1600)**2)/(2*560.0**2))
    in_cav = cave(r, cy, half, wall_max=3.4)
    # the black mirror-pool fills the central chamber
    r.pool(1600, 1000, 320, 200, "#101826", "#1f3247", 220, 120)
    # drowned archive: rows of leaning pillars + scattered murals (the sunk records)
    for px in range(420, WORLD_W-300, 240):
        if abs(px-1600) < 360: continue
        r.pillar(px, cy(px)+half(px)-70, r.R.rng(0.9,1.2))
    for (mx,my) in [(700,760),(1100,1200),(2100,760),(2500,1200)]: r.mural(mx,my,r.R.rng(1.0,1.3))
    # the sealed Sixth Door (gate) on the far chamber wall + cold blue crystals
    r.gate(2700, cy(2700)+80, 1.5)
    r.scatter(lambda x,y,s: r.crystal(x,y,r.R.rng(0.7,1.3),"purple"), 16, (260, WORLD_W-200), (400, 1600),
              avoid=lambda x,y: not in_cav(x,y) or (x-1600)**2/360**2+(y-1000)**2/220**2<1)
    for x in range(280, WORLD_W-200, 320): r.lamp(x, cy(x)-half(x)+50, 2.8)
    r.zone(1600-320*0.7, 1000-200*0.7, 320*1.4, 200*1.4, zid="z34_pool")
    for (t, x) in [("ranged",680),("ranged",1000),("elite",1350),("ranged",2000),("elite",2450)]:
        r.enemy(t, x, cy(x) - half(x) + 200)
    r.npc("blue", 320, cy(320), "Voice in the Void",
          "Here_they_DROWNED_him_—_not_his_body,_his_MEMORY._Every_scroll,_every_name,_sunk_in_this_black_water._Gather_all_the_truth_above_and_the_Sixth_Door_will_open_to_the_Erased_Path.")
    r.portal_back(33, 120, cy(120))
    r.portal_next(35, WORLD_W-110, cy(WORLD_W-110))
    r.portal_to(39, 2700, cy(2700)+40)   # the Sixth Door -> Erased Path (Shashtha Dvara)
    return r.emit()


# ============================================================================
# ACT VI — THE SEVERANCE (void)  +  HIDDEN — THE ERASED PATH
# ============================================================================
def thread(r, pts, cut_at=None):
    """Draw the golden Akhand Sutra. If cut_at=(lo,hi) given, leave a gap (severed)."""
    if cut_at:
        a = [p for p in pts if p[0] < cut_at[0]]; b = [p for p in pts if p[0] > cut_at[1]]
        for seg in (a, b):
            if len(seg) >= 2:
                r.stroke(seg, "#7a5a16", 14); r.stroke(seg, "#d8b24a", 7); r.stroke(seg, "#f4e08a", 3)
    else:
        r.stroke(pts, "#7a5a16", 14); r.stroke(pts, "#d8b24a", 7); r.stroke(pts, "#f4e08a", 3)

def void_floor(r, keep, shard_n=24, crystal_n=14):
    """Floating shards along the path + decorative shards drifting in the void."""
    for _ in range(shard_n):
        x = r.R.rng(-40, WORLD_W+40); y = r.R.rng(-40, WORLD_H+40)
        if keep(x, y): continue
        r.void_shard(x, y, r.R.rng(0.7, 1.5))

@region(35)
def build_35():
    """Chidrabhumi — The Torn Land. Reality fractured into floating shards over
    the void; you walk the actual severance scar."""
    r = Region(35, "Torn Land", "#12080a", 350035, subtitle="Chidrabhūmi"); r.rock_pal = "void"
    def road_y(x): return 1000 + 140*math.sin(x/520.0)
    HALF = 190
    def on_road(x, y): return abs(y-road_y(x)) < HALF or near_spawn(x, y, 280)
    # the severance scar itself — a glowing rift the road runs along (the hero feature)
    scar = [(x, road_y(x)) for x in range(-60, WORLD_W+60, 40)]
    r.stroke(scar, "#1e0e2a", 150)   # violet halo
    r.stroke(scar, "#05030a", 96)    # black chasm core
    r.stroke(scar, "#8a4fc0", 10)    # bright torn crack down the middle
    void_floor(r, on_road, 44)       # denser drifting land-chunks so the void isn't empty
    # the path of shards
    for x in range(120, WORLD_W-80, 150): r.void_shard(x, road_y(x), r.R.rng(1.0, 1.5))
    # snapped golden threads dangling from the tears
    for (tx, ty) in [(700,520),(1500,520),(2300,520),(1100,1480),(1900,1480)]:
        thread(r, [(tx-120, ty),(tx-40, ty+60),(tx+30, ty+40)], cut_at=(tx-10, tx+10))
    r.scatter(lambda x,y,s: r.crystal(x,y,r.R.rng(0.7,1.3),"purple"), 16, (240, WORLD_W-200), (380, 1620),
              avoid=lambda x,y: not on_road(x,y))
    r.scatter(r.rock, 18, (240, WORLD_W-200), (400, 1600), avoid=lambda x,y: not on_road(x,y), smin=0.7, smax=1.4)
    SEG=200; x=0
    while x<WORLD_W:
        c=road_y(x+SEG/2); r.zone(x,-160,SEG+2,c-HALF+160); r.zone(x,c+HALF,SEG+2,WORLD_H-(c+HALF)+160); x+=SEG
    for (t, x) in [("melee",700),("ranged",1040),("melee",1420),("ranged",1800),("melee",2160),("elite",2520)]:
        r.enemy(t, x, road_y(x))
    r.npc("blue", 340, road_y(340), "Severed Soul",
          "This_is_the_WOUND_itself,_where_the_Thread_was_cut._Feel_how_nothing_holds_to_anything?_That_is_what_he_did_—_or_what_they_blamed_on_him.")
    r.portal_back(30, 120, road_y(120))
    r.portal_next(36, WORLD_W-110, road_y(WORLD_W-110))
    return r.emit()

@region(36)
def build_36():
    """Antarala — The Between-Place. A still grey limbo, the last island of calm
    before the end; the frayed end of the Sutra rests here. No enemies."""
    r = Region(36, "The Between", "#2a2730", 360036, subtitle="Antarāla")
    void_floor(r, lambda x,y: 240<x<WORLD_W-240 and 360<y<WORLD_H-360, 18)
    for x in range(160, WORLD_W-120, 220):
        for y in (640, 1000, 1360):
            if r.R.chance(0.82): r.void_shard(x+r.R.rng(-70,70), y+r.R.rng(-55,55), r.R.rng(0.8, 1.35))
    # a single shrine, a campfire, the frayed thread coming to rest
    r.pillar(1500, 940, 1.2); r.pillar(1700, 940, 1.2); r.brazier(1600, 1000, 2.8)
    r.campfire(1000, 1040, 1.8); r.log(940,1110,1.7); r.log(1060,1110,1.7)
    thread(r, [(200,1180),(700,1140),(1200,1180),(1600,1120)], cut_at=(1620,1700))
    r.mural(1600, 1130, 1.4)
    r.scatter(lambda x,y,s: r.crystal(x,y,r.R.rng(0.6,1.0),"cyan"), 10, (300, WORLD_W-300), (400, 1600),
              avoid=lambda x,y: not (240<x<WORLD_W-240 and 360<y<WORLD_H-360))
    r.frame_walls(top=260, bottom=260, left=200, right=180, left_gap=(900,1120), right_gap=(900,1120))
    r.npc("yellow", 360, 1000, "Keeper of the Pause",
          "Rest_here,_warriors._Beyond_lies_the_fortress_and_the_severing-place_itself._If_you_carry_all_the_truth,_a_sixth_road_will_have_opened_below._Choose_well.")
    r.portal_back(35, 120, 1000)
    r.portal_next(37, WORLD_W-110, 1000)
    return r.emit()

@region(37)
def build_37():
    """Viyoga Durga — The Fortress of Separation. Viyogasur's obsidian seat and
    the prison where the gods chained the 'Demon of Separation.' Boss: Vanasur."""
    r = Region(37, "Severance Fortress", "#12080a", 370037, subtitle="Viyoga Durga"); r.rock_pal = "void"
    ARENA = (2680, 1000)
    def road_y(x): return 1000 + 90*math.sin(x/560.0)
    HALF = 200
    def keep(x, y): return abs(y-road_y(x))<HALF or near_spawn(x,y,280) or (x-ARENA[0])**2+(y-ARENA[1])**2<420**2
    void_floor(r, keep, 22)
    # obsidian ramparts hug the causeway; the void beyond stays dark & open
    grid_fill(r, lambda x,y,s: r.rock(x,y,r.R.rng(1.6,3.0)),
              lambda x,y: keep(x,y) or abs(y-road_y(x))>HALF+360, step=150, chance=0.62)
    for x in range(420, 2300, 300): r.bridge_deck(x, road_y(x), 1.2)
    for px in range(500, 2300, 360):
        r.pillar(px, road_y(px)-HALF+40, r.R.rng(1.1,1.4)); r.pillar(px, road_y(px)+HALF-30, r.R.rng(1.1,1.4))
    thread(r, [(200,road_y(200)),(900,road_y(900)),(1600,road_y(1600))], cut_at=(1620,1720))
    # the throne arena (Vanasur, the chained guardian)
    for k in range(14):
        a=k/14*math.tau; r.rock(ARENA[0]+math.cos(a)*400, ARENA[1]+math.sin(a)*360, r.R.rng(1.2,2.2))
    r.mural(ARENA[0], ARENA[1]-300, 1.6)
    SEG=200; x=0
    while x<WORLD_W:
        c=road_y(x+SEG/2)
        if x < 2200:
            r.zone(x,-160,SEG+2,c-HALF+160); r.zone(x,c+HALF,SEG+2,WORLD_H-(c+HALF)+160)
        x+=SEG
    for (t, x) in [("ranged",760),("melee",1120),("elite",1560),("ranged",1980)]:
        r.enemy(t, x, road_y(x))
    r.set_boss("vanasur", ARENA[0], ARENA[1])
    r.npc("blue", 340, road_y(340), "Voice in the Void",
          "They_called_HIM_the_Demon_of_Separation_and_chained_him_in_this_fortress._But_ask_yourself,_warrior:_who_truly_cut_the_Thread_—_the_one_blamed,_or_the_five_who_did_the_blaming?")
    r.portal_back(36, 120, road_y(120))
    r.portal_next(38, WORLD_W-110, road_y(WORLD_W-110))
    return r.emit()

@region(38)
def build_38():
    """Sutracheda — The Place of the Severing. The exact point where the Thread
    was cut; six thrones, one empty. Final boss: Viyogasur."""
    r = Region(38, "The Severing", "#0a0608", 380038, subtitle="Sūtracheda")
    ARENA = (1700, 1000)
    void_floor(r, lambda x,y: (x-ARENA[0])**2+(y-ARENA[1])**2<560**2 or near_spawn(x,y,280) or abs(y-1000)<160, 20)
    # the severed Sutra: two golden ends reaching for a central gap (the cut)
    thread(r, [(120,1000),(700,1000),(1200,1000),(1640,1000),(1760,1000),(2200,1000),(2700,1000),(3080,1000)],
           cut_at=(1620, 1780))
    # the cosmic loom + six thrones around the arena (one throne left empty)
    for k in range(6):
        a = -math.pi/2 + k/6*math.tau
        tx = ARENA[0]+math.cos(a)*440; ty = ARENA[1]+math.sin(a)*380
        r.pillar(tx, ty, 1.3)
        if k != 5: r.brazier(tx, ty-60, 2.0)        # five lit, the sixth dark/empty
    r.mural(ARENA[0], ARENA[1]-360, 1.8)
    for x in range(160, 1300, 180): r.void_shard(x, 1000, r.R.rng(1.0,1.4))
    r.scatter(lambda x,y,s: r.crystal(x,y,r.R.rng(0.8,1.4),"purple"), 14, (240, WORLD_W-200), (420, 1580),
              avoid=lambda x,y: (x-ARENA[0])**2+(y-ARENA[1])**2<520**2 or abs(y-1000)<170)
    # seal all but the entry road and the arena eye
    def keep(x,y): return (x-ARENA[0])**2+(y-ARENA[1])**2<520**2 or (x<1300 and abs(y-1000)<170) or near_spawn(x,y,260)
    SEG=180; x=0
    while x<WORLD_W:
        cx=x+SEG/2; yy=-160
        while yy<WORLD_H:
            if not keep(cx, yy+90): r.zone(x, yy, SEG+2, 184, zid=f"z38_{x}_{yy}")
            yy+=180
        x+=SEG
    for (t, x, y) in [("ranged",900,1000),("elite",1280,920),("elite",1280,1080)]:
        r.enemy(t, x, y)
    r.set_boss("viyogasur", ARENA[0], ARENA[1])
    r.npc("blue", 360, 1000, "Echo of the Sixth",
          "This_is_where_the_Thread_was_cut._Restore_it_as_it_was,_or_let_it_fall_—_unless_you_walked_the_Erased_Path._Then,_and_only_then,_can_you_REWEAVE_it_from_the_truth.")
    r.portal_back(37, 120, 1000)
    return r.emit()

@region(39)
def build_39():
    """Shashtha Dvara — The Sixth Gate. A radiant doorway that 'shouldn't exist';
    crossing it restores Ekatmadeva to the world's records. Secret."""
    r = Region(39, "Sixth Gate", "#1a1408", 390039, subtitle="Ṣaṣṭha Dvāra")
    void_floor(r, lambda x,y: abs(y-1000)<220 or near_spawn(x,y,280), 16)
    # a golden avenue of living thread leading to the gate
    thread(r, [(x,1000+30*math.sin(x/300.0)) for x in range(120, WORLD_W-80, 80)])
    for x in range(160, WORLD_W-120, 200): r.void_shard(x, 1000, r.R.rng(1.0,1.3))
    r.gate(1500, 1090, 1.8)                         # the radiant Sixth Gate
    # names reappearing on the walls (murals) + gold glints + warm crystals
    for mx in range(500, WORLD_W-400, 360): r.mural(mx, 760, r.R.rng(1.0,1.3)); r.mural(mx, 1240, r.R.rng(1.0,1.3))
    r.scatter(lambda x,y,s: r.gold(x,y,r.R.rng(0.7,1.2)), 18, (240, WORLD_W-200), (420, 1580),
              avoid=lambda x,y: not (abs(y-1000)<220))
    r.scatter(lambda x,y,s: r.crystal(x,y,r.R.rng(0.7,1.2),"amber"), 12, (260, WORLD_W-220), (440, 1560),
              avoid=lambda x,y: not (abs(y-1000)<260))
    for bx in range(520, WORLD_W-400, 320): r.brazier(bx, 880 if (bx//320)%2 else 1120, 2.2)
    r.frame_walls(top=300, bottom=300, left=200, right=180, left_gap=(900,1120), right_gap=(900,1120))
    r.npc("yellow", 360, 1000, "Guardian of Memory",
          "You_know_the_name,_so_you_may_pass._Step_through_and_the_world_REMEMBERS_him_again:_Ekatmadeva,_the_One_Soul,_the_Sixth_they_tried_to_erase.")
    r.portal_back(34, 120, 1000)
    r.portal_next(40, WORLD_W-110, 1000)
    return r.emit()

@region(40)
def build_40():
    """Ekatmalaya — The Sanctum of the One Soul. The erased god's temple, rebuilt
    by your remembering — whole and warm; six intact halos, an unbroken Sutra."""
    r = Region(40, "Soul Sanctum", "#3a2e14", 400040, subtitle="Ekātmālaya")
    r.stroke([(x,1000) for x in range(80,WORLD_W-80,60)], "#6e5a2a", 200)
    r.stroke([(x,1000) for x in range(80,WORLD_W-80,60)], "#8c7440", 110)
    # the UNBROKEN Sutra runs the whole length (no cut)
    thread(r, [(x,1000) for x in range(80, WORLD_W-60, 70)])
    # golden colonnade + six intact halo-murals + a living tree at the heart
    for px in range(360, WORLD_W-300, 240):
        r.pillar(px, 740, r.R.rng(1.1,1.3)); r.pillar(px, 1260, r.R.rng(1.1,1.3))
    for i, mx in enumerate(range(600, WORLD_W-400, 360)): r.mural(mx, 820, 1.4)
    r.canopy(1600, 1180, 1.6, kind="middle_lane_tree2")   # the living world-tree
    r.canopy(1600, 1230, 1.2, kind="middle_lane_tree3")
    r.building("Monastery", "Yellow", 1500, 640, 1.2)
    for bx in range(520, WORLD_W-400, 300): r.brazier(bx, 1120 if (bx//300)%2 else 880, 2.4)
    r.scatter(lambda x,y,s: r.gold(x,y,r.R.rng(0.8,1.3)), 20, (300, WORLD_W-300), (380, 1620),
              avoid=lambda x,y: abs(y-1000)<150)
    r.flag(1500, 400, 1.9)
    r.frame_walls(top=220, bottom=220, left=190, right=180, left_gap=(900,1120), right_gap=(900,1120))
    r.npc("yellow", 360, 1000, "Ekatmadeva, the One Soul",
          "You_found_me,_where_no_record_survived._Hear_the_truth:_Viyogasur_did_not_sever_the_Thread_—_he_REFUSED_to_let_the_five_own_the_bonds_between_souls,_so_they_cut_it_and_named_him_for_their_crime.")
    r.portal_back(39, 120, 1000)
    r.portal_next(41, WORLD_W-110, 1000)
    return r.emit()

@region(41)
def build_41():
    """Maunamandira — The Silent Shrine. A tiny shrine outside time; the whole
    thread coiled at rest. The epilogue beat — no combat."""
    r = Region(41, "Silent Shrine", "#241e2a", 410041, subtitle="Maunamandira")
    void_floor(r, lambda x,y: 320<x<WORLD_W-320 and 420<y<WORLD_H-420, 14)
    for x in range(220, WORLD_W-160, 240):
        for y in (700, 1000, 1300):
            if r.R.chance(0.8): r.void_shard(x+r.R.rng(-65,65), y+r.R.rng(-50,50), r.R.rng(0.8, 1.15))
    # the whole Sutra coiled at rest (a golden spiral) + a single candle + two seats
    spiral = [(1600 + (260 - 0.16*t)*math.cos(t/22.0), 1000 + (200 - 0.12*t)*math.sin(t/22.0)) for t in range(0, 360)]
    thread(r, spiral)
    r.brazier(1600, 1000, 2.2)                  # the single candle
    r.log(1440, 1080, 1.9); r.log(1760, 1080, 1.9)   # two seats
    r.mural(1600, 720, 1.5)
    r.scatter(lambda x,y,s: r.crystal(x,y,r.R.rng(0.6,1.0),"cyan"), 10, (380, WORLD_W-380), (480, 1520),
              avoid=lambda x,y: not (320<x<WORLD_W-320 and 420<y<WORLD_H-420))
    r.frame_walls(top=300, bottom=300, left=240, right=240, left_gap=(900,1120))
    r.npc("yellow", 420, 1000, "The Unbroken Thread",
          "Sit_a_moment._The_thread_is_whole_now,_woven_from_what_truly_happened._Not_restored_to_the_old_lie,_not_left_broken_—_but_REMADE,_true._Rest._It_is_done.")
    r.portal_back(40, 120, 1000)
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
