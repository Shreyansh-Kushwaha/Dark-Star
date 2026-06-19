#!/usr/bin/env python3
"""
Batch 2 custom pixel-art assets — same chunky Tiny-Swords style as gen_props.py.
Static props -> assets_custom/props/
Animated spritesheets (horizontal strips) -> assets_custom/anim/
"""
import os, math
from PIL import Image, ImageDraw

PROPS = "assets_custom/props"
ANIM  = "assets_custom/anim"
os.makedirs(PROPS, exist_ok=True)
os.makedirs(ANIM,  exist_ok=True)

OL = (34, 28, 24, 255)   # universal dark outline

def canvas(w, h):
    im = Image.new("RGBA", (w, h), (0,0,0,0))
    return im, ImageDraw.Draw(im)

def save(im, name, folder=PROPS):
    im.save(f"{folder}/{name}.png")

def blob(d, cx, cy, rx, ry, fill, outline=None, width=2):
    d.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=fill,
              outline=outline, width=width)

# ── helpers ────────────────────────────────────────────────────────────────

def hstrip(frames):
    """Stitch a list of same-size RGBA images into a horizontal strip."""
    W, H = frames[0].size
    out = Image.new("RGBA", (W * len(frames), H), (0,0,0,0))
    for i, f in enumerate(frames):
        out.paste(f, (i * W, 0))
    return out

# ═══════════════════════════════════════════════════════════════════════════
# STATIC PROPS
# ═══════════════════════════════════════════════════════════════════════════

# ── Category 1: Bazaar / Market ────────────────────────────────────────────

def merchant_stall():
    im, d = canvas(140, 120)
    wd = (130, 96, 58, 255); wdk = (90, 64, 36, 255); wl = (162, 124, 76, 255)
    # back wall
    d.rectangle([8, 28, 132, 100], fill=(178, 148, 108, 255), outline=OL, width=2)
    # awning stripes
    stripe_cols = [(210, 70, 55, 255), (240, 220, 160, 255)]
    for i in range(7):
        x0 = 8 + i*18; x1 = min(x0+18, 132)
        d.rectangle([x0, 10, x1, 30], fill=stripe_cols[i%2])
    d.rectangle([8, 10, 132, 30], outline=OL, width=2)
    # two posts
    for px in (18, 122):
        d.rectangle([px-4, 28, px+4, 118], fill=wd, outline=OL, width=2)
        d.line([px-2, 30, px-2, 116], fill=wl, width=1)
    # counter
    d.rectangle([8, 78, 132, 100], fill=wd, outline=OL, width=2)
    for sx in range(22, 130, 18): d.line([sx, 80, sx, 98], fill=wdk, width=1)
    # goods on counter: two pots + fabric roll
    blob(d, 40, 72, 10, 8, (170, 100, 60, 255), OL)
    blob(d, 60, 70, 8,  7, (170, 100, 60, 255), OL)
    d.ellipse([80, 66, 112, 80], fill=(160, 80, 80, 255), outline=OL, width=2)
    save(im, "merchant_stall")

def trade_cart():
    im, d = canvas(120, 90)
    wd = (122, 88, 52, 255); wdk = (84, 58, 32, 255); wl = (152, 114, 70, 255)
    # body
    d.polygon([(10,50),(110,50),(100,80),(20,80)], fill=wd, outline=OL, width=2)
    for sx in range(28, 102, 18): d.line([sx, 52, sx-2, 78], fill=wdk, width=2)
    d.line([10, 52, 110, 52], fill=wl, width=2)
    # crate on top
    d.rectangle([30, 28, 90, 54], fill=(108, 80, 50, 255), outline=OL, width=2)
    d.line([60, 30, 60, 52], fill=wdk, width=2)
    d.line([32, 40, 88, 40], fill=wdk, width=2)
    # wheels
    for wx in (26, 94):
        blob(d, wx, 80, 16, 16, wdk, OL)
        blob(d, wx, 80, 8,  8,  wd)
        for ang in range(0, 360, 60):
            r = math.radians(ang)
            d.line([wx, 80, wx+int(12*math.cos(r)), 80+int(12*math.sin(r))],
                   fill=wdk, width=2)
    # handle pole
    d.line([10, 58, -4, 58], fill=wd, width=4)
    save(im, "trade_cart")

def hanging_lantern():
    im, d = canvas(36, 80)
    # chain
    for y in range(2, 20, 5): d.ellipse([15,y,21,y+4], outline=(120,110,100,255), width=2)
    # lantern body
    d.rounded_rectangle([6, 22, 30, 60], 6, fill=(220, 190, 110, 255), outline=OL, width=2)
    # glowing centre
    d.ellipse([10, 28, 26, 54], fill=(255, 220, 100, 220))
    d.ellipse([13, 32, 23, 50], fill=(255, 240, 160, 255))
    # ribs
    for y in (30, 40, 50): d.line([6,y,30,y], fill=OL, width=1)
    # cap + bottom
    d.rectangle([4, 18, 32, 26], fill=(140, 120, 80, 255), outline=OL, width=2)
    d.polygon([(10,60),(26,60),(22,70),(14,70)], fill=(140,120,80,255), outline=OL, width=2)
    save(im, "hanging_lantern")

def goods_crate():
    im, d = canvas(72, 62)
    wd = (130, 96, 60, 255); wdk = (88, 62, 36, 255); wl = (160, 122, 76, 255)
    # bottom crate
    d.rectangle([4, 30, 68, 58], fill=wd, outline=OL, width=2)
    d.line([36, 32, 36, 56], fill=wdk, width=2)
    d.line([6,  44, 66, 44], fill=wdk, width=2)
    d.line([6,  32, 6,  58], fill=wl, width=1)
    # top crate (smaller, offset)
    d.rectangle([14, 8, 58, 34], fill=wd, outline=OL, width=2)
    d.line([36, 10, 36, 32], fill=wdk, width=2)
    d.line([16, 20, 56, 20], fill=wdk, width=2)
    d.line([16, 10, 16, 32], fill=wl, width=1)
    # rope band
    d.rectangle([4, 40, 68, 44], fill=(160, 120, 60, 255), outline=OL, width=1)
    save(im, "goods_crate")

def market_bell():
    im, d = canvas(44, 88)
    mt = (160, 140, 80, 255); mtd = (120, 100, 50, 255); mtl = (210, 190, 120, 255)
    # post
    d.rectangle([20, 40, 24, 86], fill=(100, 76, 50, 255), outline=OL, width=2)
    # arm
    d.line([22, 42, 38, 30], fill=(100, 76, 50, 255), width=4)
    # bell
    d.polygon([(30,20),(44,20),(46,40),(28,40)], fill=mt, outline=OL, width=2)
    d.ellipse([28,36,46,46], fill=mt, outline=OL, width=2)
    d.line([30,22,30,38], fill=mtl, width=2)
    d.line([44,22,44,38], fill=mtd, width=1)
    # clapper
    d.line([37,40,37,48], fill=mtd, width=2)
    blob(d, 37, 50, 4, 4, mtd, OL)
    # base
    d.rectangle([10, 82, 34, 88], fill=(100,76,50,255), outline=OL, width=2)
    save(im, "market_bell")

# ── Category 2: Serpent / Marsh ────────────────────────────────────────────

def serpent_idol():
    im, d = canvas(56, 100)
    st = (96, 110, 90, 255); sdk = (66, 80, 62, 255); sl = (130, 148, 120, 255)
    sc = (60, 120, 80, 255); sck = (36, 88, 56, 255)
    # plinth
    d.rectangle([8, 80, 48, 98], fill=st, outline=OL, width=2)
    d.rectangle([12, 74, 44, 82], fill=sl, outline=OL, width=2)
    # coiled body
    d.ellipse([10, 44, 46, 76], fill=sc, outline=OL, width=2)
    d.ellipse([16, 50, 40, 70], fill=sck)
    # neck rising
    d.polygon([(24,46),(32,46),(30,24),(26,24)], fill=sc, outline=OL, width=2)
    # head
    d.ellipse([20, 10, 36, 26], fill=sc, outline=OL, width=2)
    # eyes — glowing amber
    d.ellipse([22,14,26,18], fill=(255,200,60,255))
    d.ellipse([30,14,34,18], fill=(255,200,60,255))
    # forked tongue
    d.line([28,24,28,30], fill=(200,60,60,255), width=2)
    d.line([28,30,24,36], fill=(200,60,60,255), width=1)
    d.line([28,30,32,36], fill=(200,60,60,255), width=1)
    save(im, "serpent_idol")

def eel_trap():
    im, d = canvas(48, 80)
    bk = (140, 110, 70, 255); bkd = (100, 76, 48, 255)
    # stick in ground
    d.line([24, 50, 24, 78], fill=(110, 80, 46, 255), width=4)
    # woven basket cage (oval)
    d.ellipse([8, 18, 40, 54], fill=(0,0,0,0), outline=OL, width=3)
    d.ellipse([8, 18, 40, 54], fill=(0,0,0,0), outline=bk, width=2)
    # horizontal weave bands
    for y in (24, 30, 36, 42, 48):
        d.line([8, y, 40, y], fill=bk, width=2)
    # vertical strands
    for x in range(10, 40, 6):
        d.line([x, 18, x, 54], fill=bkd, width=1)
    # small fish silhouette inside
    d.ellipse([16, 32, 30, 38], fill=(80, 120, 140, 180))
    d.polygon([(30,33),(36,30),(36,38)], fill=(80,120,140,180))
    save(im, "eel_trap")

def marsh_lantern():
    im, d = canvas(34, 110)
    # rickety pole — two pieces, slight lean
    d.line([16, 108, 18, 40], fill=(90, 70, 44, 255), width=4)
    d.line([18, 60, 26, 44], fill=(90, 70, 44, 255), width=3)   # arm
    # lantern (mossy green glass)
    d.rounded_rectangle([18, 28, 32, 46], 4, fill=(100, 160, 90, 200), outline=OL, width=2)
    d.ellipse([20, 32, 30, 42], fill=(180, 240, 140, 200))
    # moss drips
    for mx in (20, 25, 30):
        d.line([mx, 46, mx-1, 52], fill=(60, 110, 50, 180), width=2)
    # chain hang
    d.line([25, 26, 26, 32], fill=(100, 90, 80, 255), width=2)
    save(im, "marsh_lantern")

def mangrove_root():
    im, d = canvas(160, 100)
    rk = (80, 64, 46, 255); rkd = (54, 42, 28, 255); rkl = (108, 88, 62, 255)
    # main arch
    pts = [(10,96),(20,50),(60,20),(100,20),(140,50),(150,96)]
    d.line(pts, fill=rk, width=16, joint="curve")
    d.line(pts, fill=rkl, width=4, joint="curve")
    # smaller roots hanging down from arch
    for (rx, ry, ex, ey) in [(40,44,36,80),(80,22,80,70),(120,44,124,80)]:
        d.line([rx,ry,ex,ey], fill=rk, width=6)
        d.line([rx,ry,ex,ey], fill=rkd, width=2)
    # root tips in mud
    for tx in (18, 36, 80, 124, 142):
        blob(d, tx, 96, 7, 4, rkd)
    save(im, "mangrove_root")

# ── Category 3: Sky / Wind / Cloud ────────────────────────────────────────

def wind_chime():
    im, d = canvas(52, 90)
    wood = (130, 100, 60, 255); metal = (180, 170, 150, 255); metd = (130, 120, 100, 255)
    # top crossbar
    d.rectangle([4, 10, 48, 16], fill=wood, outline=OL, width=2)
    # hanging tubes — 5, different lengths
    lengths = [50, 40, 56, 38, 46]
    for i, L in enumerate(lengths):
        x = 8 + i * 9
        d.line([x, 16, x, 16+L], fill=metal, width=4)
        d.line([x-1, 18, x-1, 14+L], fill=metd, width=1)
        d.ellipse([x-3, 14+L, x+3, 18+L], fill=metal, outline=OL, width=1)
    # string from nail
    d.line([26, 2, 26, 10], fill=metd, width=2)
    save(im, "wind_chime")

def storm_banner():
    im, d = canvas(72, 130)
    pole = (100, 80, 52, 255); poled = (68, 52, 32, 255)
    red = (160, 40, 40, 255); rl = (200, 70, 60, 255); rd = (110, 26, 26, 255)
    # pole
    d.rectangle([8, 4, 16, 128], fill=pole, outline=OL, width=2)
    d.line([11, 6, 11, 126], fill=poled, width=1)
    # tattered banner blowing right — jagged edge
    d.polygon([(16,10),(66,16),(60,28),(70,34),(58,44),(68,54),(16,58)],
              fill=red, outline=OL, width=2)
    d.polygon([(16,10),(42,14),(16,32)], fill=rl)
    d.polygon([(16,32),(42,36),(16,58)], fill=rd)
    # tatter rips
    for (x,y) in [(52,56),(60,46),(66,30)]:
        d.line([x,y,x+4,y+6], fill=OL, width=2)
    # rope tie
    d.line([16,10,16,58], fill=(140,110,60,255), width=2)
    save(im, "storm_banner")

def nest_mound():
    im, d = canvas(140, 80)
    tw = (100, 78, 50, 255); twd = (68, 52, 32, 255); twl = (134, 106, 68, 255)
    # outer ring of sticks
    for ang in range(0, 360, 20):
        r = math.radians(ang)
        cx, cy = 70, 50
        x0 = int(cx + 62 * math.cos(r)); y0 = int(cy + 26 * math.sin(r))
        x1 = int(cx + 42 * math.cos(r)); y1 = int(cy + 18 * math.sin(r))
        d.line([x0, y0, x1, y1], fill=tw, width=3)
    # inner ring
    d.ellipse([20, 28, 120, 70], fill=twd, outline=OL, width=3)
    # hollow centre
    d.ellipse([36, 36, 104, 64], fill=(30, 22, 14, 255))
    # a few eggs
    for (ex, ey) in [(52, 52), (68, 56), (82, 50)]:
        blob(d, ex, ey, 8, 6, (220, 210, 190, 255), OL)
    save(im, "nest_mound")

def cloud_arch():
    im, d = canvas(200, 130)
    w = (238, 244, 252, 255); ws = (200, 212, 234, 255); wd = (170, 184, 214, 255)
    # two cloud pillars
    for cx in (38, 162):
        for (rx, ry, bx, by) in [(0,0,28,28),(0,20,24,24),(0,40,22,22),(0,60,20,20)]:
            blob(d, cx, 100-ry, 28-rx//2, 22-rx//4, w, OL)
    # arch top cloud mass
    for (bx, by, rx, ry) in [(60,28,32,26),(100,14,38,30),(140,28,32,26),
                              (80,20,26,20),(120,20,26,20)]:
        blob(d, bx, by, rx, ry, w)
    # outline the arch top
    d.arc([30, 10, 170, 90], 200, 340, fill=OL, width=3)
    # mist wisps at base
    for (mx, my) in [(30, 110),(70,118),(130,118),(170,110)]:
        blob(d, mx, my, 18, 8, (220, 228, 244, 160))
    save(im, "cloud_arch")

# ── Category 4: Frost / Monastery ─────────────────────────────────────────

def prayer_wheel():
    im, d = canvas(44, 90)
    wd = (120, 90, 56, 255); mt = (180, 160, 100, 255); mtd = (130, 110, 65, 255)
    # post
    d.rectangle([19, 40, 25, 88], fill=wd, outline=OL, width=2)
    # cylinder barrel
    d.ellipse([8, 18, 36, 42], fill=mt, outline=OL, width=2)   # top ellipse
    d.rectangle([8, 28, 36, 52], fill=mt, outline=OL, width=2)  # body
    d.ellipse([8, 44, 36, 58], fill=mtd, outline=OL, width=2)   # bottom ellipse
    # carved bands
    for y in (32, 40, 48): d.line([8,y,36,y], fill=mtd, width=2)
    # mantra text lines
    for y in (34, 42): d.line([10,y,34,y], fill=(200,180,120,255), width=1)
    # top finial
    blob(d, 22, 14, 7, 7, mt, OL)
    blob(d, 22, 8,  4, 4, (210,190,130,255), OL)
    save(im, "prayer_wheel")

def prayer_flags():
    im, d = canvas(180, 80)
    pole = (100, 78, 48, 255)
    colors = [(200,60,60,255),(240,220,60,255),(240,240,240,255),(60,120,200,255),(60,160,60,255)]
    # two poles
    for px in (10, 170):
        d.rectangle([px-3, 8, px+3, 78], fill=pole, outline=OL, width=2)
    # sagging rope
    d.line([10, 16, 90, 34, 170, 16], fill=(140,110,70,255), width=2)
    # flags hanging from rope
    for i in range(9):
        t = i / 8
        rx = int(10 + t * 160)
        ry = int(16 + 4 * math.sin(math.pi * t) * 4)   # sag
        col = colors[i % 5]
        d.polygon([(rx, ry),(rx+14, ry),(rx+12, ry+20),(rx+2, ry+20)],
                  fill=col, outline=OL, width=1)
    save(im, "prayer_flags")

def snow_lantern():
    im, d = canvas(56, 72)
    st = (140, 130, 118, 255); sdk = (100, 92, 82, 255); sl = (180, 172, 158, 255)
    sn = (220, 230, 240, 255)
    # base pedestal
    d.rectangle([8, 58, 48, 70], fill=st, outline=OL, width=2)
    d.rectangle([14, 50, 42, 60], fill=st, outline=OL, width=2)
    # lantern chamber
    d.rectangle([10, 28, 46, 52], fill=st, outline=OL, width=2)
    d.ellipse([13, 30, 43, 50], fill=(255,220,140,120))  # glow
    # roof cap with snow
    d.polygon([(4,28),(52,28),(48,18),(8,18)], fill=sdk, outline=OL, width=2)
    d.polygon([(6,18),(50,18),(46,10),(10,10)], fill=st, outline=OL, width=2)
    # snow on roof
    blob(d, 28, 14, 22, 5, sn)
    blob(d, 28, 26, 26, 4, sn)
    save(im, "snow_lantern")

def ice_wall_shard():
    im, d = canvas(48, 130)
    ic = (140, 196, 222, 255); il = (200, 234, 248, 255); idk = (88, 140, 176, 255)
    d.polygon([(8,128),(40,128),(44,80),(36,30),(24,4),(12,30),(4,80)],
              fill=ic, outline=OL, width=2)
    d.polygon([(24,4),(36,30),(28,70),(24,128),(8,128),(4,80),(12,30)], fill=idk)
    d.polygon([(24,4),(36,30),(30,50)], fill=il)
    # horizontal crack lines
    for y in (50, 80, 104): d.line([8,y,40,y], fill=il, width=1)
    save(im, "ice_wall_shard")

# ── Category 5: Soul / Shrine ─────────────────────────────────────────────

def incense_stand():
    im, d = canvas(52, 84)
    mt = (140, 110, 60, 255); mtd = (100, 76, 38, 255); mtl = (190, 160, 90, 255)
    # three legs
    for (lx, ly) in [(16,80),(26,82),(36,80)]:
        d.line([26, 56, lx, ly], fill=mtd, width=4)
    # bowl body
    d.ellipse([8, 40, 44, 62], fill=mt, outline=OL, width=2)
    d.ellipse([12, 44, 40, 58], fill=mtd)
    # ash/ember glow in bowl
    d.ellipse([16, 46, 36, 56], fill=(180, 100, 40, 180))
    d.ellipse([20, 48, 32, 54], fill=(255, 180, 80, 200))
    # three stick tops
    for (sx, sy) in [(20,40),(26,36),(32,40)]:
        d.line([sx, sy, sx-2, 14], fill=(80,60,40,255), width=2)
    # smoke wisps
    for (wx, wy) in [(18, 12),(26, 8),(34, 12)]:
        d.line([wx,wy,wx+2,wy-6], fill=(160,152,144,180), width=2)
    save(im, "incense_stand")

def torii_gate():
    im, d = canvas(140, 140)
    rd = (180, 50, 40, 255); rdd = (130, 32, 28, 255); rdl = (220, 80, 65, 255)
    # two pillars
    for px in (18, 122):
        d.rectangle([px-8, 30, px+8, 138], fill=rd, outline=OL, width=2)
        d.line([px-5, 32, px-5, 136], fill=rdl, width=2)
    # lower lintel (kasagi)
    d.rectangle([4, 30, 136, 46], fill=rd, outline=OL, width=2)
    d.line([4, 32, 136, 32], fill=rdl, width=2)
    # upper lintel (shimagi) — slight curve ends
    d.polygon([(0,14),(140,14),(136,26),(4,26)], fill=rd, outline=OL, width=2)
    d.line([0, 16, 140, 16], fill=rdl, width=2)
    # nuki crossbar between pillars
    d.rectangle([18, 60, 122, 70], fill=rdd, outline=OL, width=2)
    save(im, "torii_gate")

def offering_bowl():
    im, d = canvas(56, 44)
    st = (130, 118, 96, 255); sdk = (96, 86, 68, 255); sl = (168, 154, 126, 255)
    # stone bowl
    d.ellipse([4, 20, 52, 40], fill=st, outline=OL, width=2)
    d.ellipse([10, 24, 46, 38], fill=sdk)
    # stem
    d.rectangle([23, 36, 33, 44], fill=sdk, outline=OL, width=2)
    d.rectangle([14, 42, 42, 46], fill=sdk, outline=OL, width=2)   # base
    # offerings: flowers + fruit
    blob(d, 20, 22, 7, 5, (200, 100, 120, 255), OL)  # pink flower
    blob(d, 36, 22, 6, 5, (220, 180, 60, 255), OL)   # yellow fruit
    d.ellipse([16,20,24,26], fill=(244,190,200,255))   # petal highlight
    save(im, "offering_bowl")

def spirit_bell():
    im, d = canvas(80, 110)
    mt = (100, 92, 80, 255); mtd = (68, 62, 52, 255); mtl = (150, 140, 120, 255)
    wd = (110, 84, 52, 255)
    # wooden frame - two posts + crossbar
    d.rectangle([6, 14, 14, 108], fill=wd, outline=OL, width=2)
    d.rectangle([66, 14, 74, 108], fill=wd, outline=OL, width=2)
    d.rectangle([4, 10, 76, 20], fill=wd, outline=OL, width=2)
    # bell shape
    d.polygon([(24,22),(56,22),(62,62),(54,72),(26,72),(18,62)],
              fill=mt, outline=OL, width=2)
    d.ellipse([18,62,62,78], fill=mt, outline=OL, width=2)   # lip
    # shading
    d.polygon([(24,22),(38,22),(32,60),(24,70)], fill=mtl)
    d.polygon([(42,22),(56,22),(62,62),(54,70)], fill=mtd)
    # rope + clapper
    d.line([40, 20, 40, 24], fill=mtd, width=2)
    d.line([40, 60, 40, 72], fill=mtd, width=2)
    blob(d, 40, 76, 5, 4, mtd, OL)
    save(im, "spirit_bell")

# ── Category 6: Root / Underground ────────────────────────────────────────

def gnarled_root():
    im, d = canvas(180, 110)
    rk = (74, 58, 38, 255); rkd = (50, 38, 24, 255); rkl = (106, 84, 56, 255)
    # main arching root
    pts = [(4,104),(20,60),(50,28),(90,18),(130,28),(160,60),(176,104)]
    d.line(pts, fill=rk, width=20, joint="curve")
    d.line(pts, fill=rkl, width=6, joint="curve")
    # knobbly surface bumps
    for (bx, by) in [(40,36),(90,16),(140,36),(65,28),(115,28)]:
        blob(d, bx, by, 8, 6, rkd)
    # side rootlets
    for (x0,y0,x1,y1) in [(30,70,14,96),(70,26,60,54),(130,26,140,54),(150,70,166,96)]:
        d.line([x0,y0,x1,y1], fill=rk, width=7)
        d.line([x0,y0,x1,y1], fill=rkl, width=2)
    save(im, "gnarled_root")

def mushroom_cluster():
    im, d = canvas(96, 88)
    def shroom(cx, cy, rx, ry, cap, capl, capd, stem):
        # stem
        d.rounded_rectangle([cx-4, cy, cx+4, cy+ry+8], 3, fill=stem, outline=OL, width=2)
        # cap
        d.ellipse([cx-rx, cy-ry, cx+rx, cy+4], fill=cap, outline=OL, width=2)
        d.ellipse([cx-rx+4, cy-ry+4, cx, cy+2], fill=capl)   # left highlight
        d.ellipse([cx, cy-4, cx+rx-4, cy+4], fill=capd)       # right shadow
        # spots
        for (sx,sy) in [(cx-rx//2, cy-ry//2),(cx+rx//3, cy-ry//3)]:
            blob(d, sx, sy, 3, 2, (240,230,200,220))
    # large central mushroom
    shroom(50,54,24,22,(200,80,60,255),(230,120,90,255),(148,52,38,255),(200,180,150,255))
    # medium left
    shroom(22,64,16,14,(140,100,200,255),(180,140,230,255),(100,64,160,255),(180,160,130,255))
    # small right
    shroom(76,70,12,10,(80,180,120,255),(120,220,160,255),(50,130,80,255),(170,150,120,255))
    # glow halos under caps (bioluminescent)
    blob(d, 50, 56, 20, 8, (255,160,120,60))
    blob(d, 22, 66, 14, 5, (200,140,255,60))
    blob(d, 76, 72, 10, 4, (120,255,160,60))
    save(im, "mushroom_cluster")

def root_pillar():
    im, d = canvas(56, 160)
    rk = (70, 54, 36, 255); rkd = (48, 36, 22, 255); rkl = (100, 78, 52, 255)
    # main trunk shape — slightly tapered
    d.polygon([(10,158),(46,158),(42,10),(14,10)], fill=rk, outline=OL, width=2)
    # gnarled ridge lines
    d.line([16,12,12,156], fill=rkl, width=2)
    d.line([40,12,44,156], fill=rkd, width=2)
    # surface knots
    for (kx, ky, krx, kry) in [(28,40,8,6),(22,80,6,5),(34,120,7,5)]:
        blob(d, kx, ky, krx, kry, rkd, OL)
        blob(d, kx-2, ky-2, krx-2, kry-2, rkl)
    # branch stubs
    for (bx,by,ex,ey) in [(10,50,2,40),(46,70,54,58),(12,110,4,100)]:
        d.line([bx,by,ex,ey], fill=rk, width=6)
    save(im, "root_pillar")

def biolum_pod():
    im, d = canvas(44, 72)
    st = (60, 80, 50, 255); stl = (84, 112, 68, 255)
    pod = (100, 220, 160, 255); podl = (160, 255, 200, 255); podd = (60, 160, 110, 255)
    # stem
    d.line([22, 70, 20, 46], fill=st, width=4)
    d.line([20, 46, 24, 36], fill=st, width=3)
    # leaf
    d.polygon([(8,58),(22,50),(14,44)], fill=st, outline=stl, width=1)
    # pod body — glowing bulb
    blob(d, 22, 28, 16, 20, pod, OL)
    blob(d, 22, 28, 10, 14, podl)
    blob(d, 16, 22, 5,  6,  podl)
    # dark seed silhouette inside
    blob(d, 22, 32, 6, 8, podd)
    # glow halo
    blob(d, 22, 28, 18, 22, (100, 255, 180, 50))
    save(im, "biolum_pod")

# ── Category 7: Harbor / Tidal ────────────────────────────────────────────

def anchor():
    im, d = canvas(64, 90)
    mt = (80, 88, 96, 255); mtd = (52, 60, 68, 255); mtl = (120, 130, 140, 255)
    # ring at top
    d.arc([22, 4, 42, 20], 0, 360, fill=mt, width=6)
    # shaft
    d.rectangle([29, 14, 35, 72], fill=mt, outline=OL, width=2)
    d.line([31, 16, 31, 70], fill=mtl, width=1)
    # crossbar
    d.rectangle([8, 28, 56, 34], fill=mt, outline=OL, width=2)
    # flukes
    d.polygon([(29,70),(10,82),(6,90),(18,86),(29,76)], fill=mt, outline=OL, width=2)
    d.polygon([(35,70),(54,82),(58,90),(46,86),(35,76)], fill=mt, outline=OL, width=2)
    d.line([29,74,10,84], fill=mtl, width=1)
    # rust patches
    for (rx,ry) in [(20,32),(44,32),(30,55)]:
        blob(d, rx, ry, 4, 3, (160,80,50,160))
    save(im, "anchor")

def net_post():
    im, d = canvas(80, 100)
    wd = (110, 82, 50, 255); wdl = (146, 112, 70, 255)
    net = (100, 88, 66, 200); netd = (70, 60, 44, 200)
    # post
    d.rectangle([10, 8, 20, 98], fill=wd, outline=OL, width=2)
    d.line([13, 10, 13, 96], fill=wdl, width=1)
    # net draped over and hanging right
    net_pts = [(20,16),(72,22),(76,54),(70,72),(60,80),(44,74),(30,64),(20,52)]
    d.polygon(net_pts, fill=net, outline=OL, width=2)
    # net grid lines
    for y in range(22, 74, 10):
        d.line([20,y,72-(y-22)//2,y], fill=netd, width=1)
    for x in range(24, 72, 10):
        d.line([x,16,x-(x-20)//3,74], fill=netd, width=1)
    # small fish caught
    blob(d, 44, 48, 8, 5, (80,130,150,200), OL)
    save(im, "net_post")

def buoy():
    im, d = canvas(44, 70)
    r1 = (200, 50, 50, 255); r2 = (240, 230, 210, 255); rd = (140, 30, 30, 255)
    mt = (100, 94, 84, 255)
    # chain
    for y in range(62, 72, 4): d.ellipse([19,y,25,y+3], outline=mt, width=2)
    # body — striped
    blob(d, 22, 38, 16, 22, r1, OL)
    # stripes
    for y in range(20, 58, 10):
        col = r2 if ((y-20)//10) % 2 == 0 else r1
        d.ellipse([6,y,38,y+10], fill=col)
    d.ellipse([6, 16, 38, 60], fill=(0,0,0,0), outline=OL, width=2)
    # top knob
    blob(d, 22, 16, 5, 5, mt, OL)
    d.line([22, 4, 22, 14], fill=mt, width=3)
    # shine
    blob(d, 14, 26, 4, 6, (255,200,200,120))
    save(im, "buoy")

def shipwreck_plank():
    im, d = canvas(140, 70)
    wd = (80, 64, 44, 255); wdl = (112, 90, 60, 255); wdd = (52, 40, 26, 255)
    # main broken hull plank sticking diagonally
    d.polygon([(10,64),(50,64),(120,24),(110,14),(80,20),(40,54)],
              fill=wd, outline=OL, width=2)
    # plank seams
    for i in range(3):
        y = 30 + i*10
        x0 = int(44 + i*20); x1 = int(x0+40)
        d.line([x0, y, x1, y-12], fill=wdd, width=2)
    d.line([44,56,118,20], fill=wdl, width=2)
    # barnacles
    for (bx,by) in [(30,60),(60,50),(90,36)]:
        blob(d, bx, by, 5, 3, (100,110,90,255), OL)
    # waterline mud at base
    blob(d, 28, 65, 22, 4, (60,50,36,180))
    save(im, "shipwreck_plank")

# ── Category 8: Forge / Demon ─────────────────────────────────────────────

def demon_anvil():
    im, d = canvas(80, 66)
    mt = (50, 44, 44, 255); mtd = (32, 28, 28, 255); mtl = (80, 72, 70, 255)
    glow = (255, 140, 40, 255)
    # body
    d.polygon([(8,42),(72,42),(68,62),(12,62)], fill=mt, outline=OL, width=2)
    d.rectangle([16, 24, 64, 44], fill=mt, outline=OL, width=2)
    # horn
    d.polygon([(64,24),(78,26),(76,34),(64,34)], fill=mt, outline=OL, width=2)
    # top face
    d.rectangle([14, 18, 66, 26], fill=mtl, outline=OL, width=2)
    d.line([16,20,64,20], fill=mtl, width=2)
    # rune carvings glowing orange
    for (rx,ry) in [(24,50),(40,50),(56,50)]:
        d.ellipse([rx-4,ry-4,rx+4,ry+4], fill=glow, outline=OL, width=1)
    # hot metal on top
    d.ellipse([28,14,52,22], fill=(255,200,60,180))
    d.ellipse([34,16,46,20], fill=(255,240,120,220))
    save(im, "demon_anvil")

def heat_vent():
    im, d = canvas(64, 48)
    mt = (60, 54, 52, 255); mtd = (40, 36, 34, 255); gl = (255, 140, 40, 255)
    # grate frame
    d.rectangle([4, 22, 60, 46], fill=mt, outline=OL, width=2)
    # grate bars
    for x in range(10, 58, 8): d.rectangle([x, 24, x+4, 44], fill=mtd)
    for y in (28, 36): d.line([4, y, 60, y], fill=mtd, width=2)
    # glow underneath grate
    d.ellipse([8, 28, 56, 44], fill=(255, 120, 30, 100))
    # heat shimmer rising
    for (hx, hy) in [(16,18),(28,14),(40,18),(52,14)]:
        d.line([hx, hy, hx+2, hy-8], fill=(255,160,60,120), width=3)
    save(im, "heat_vent")

def chain_post():
    im, d = canvas(44, 100)
    mt = (68, 60, 56, 255); mtd = (44, 38, 34, 255); mtl = (100, 90, 84, 255)
    ch = (90, 82, 74, 255)
    # spike post
    d.polygon([(18,98),(26,98),(24,8),(20,8)], fill=mt, outline=OL, width=2)
    d.polygon([(20,8),(24,8),(22,2)], fill=mtl, outline=OL, width=2)   # spike tip
    d.line([20,10,20,96], fill=mtl, width=1)
    # heavy chain looped around post
    for y in range(20, 90, 12):
        # left loop
        d.arc([4,y,20,y+10], 90, 270, fill=ch, width=5)
        # right loop
        d.arc([22,y+6,38,y+16], 270, 90, fill=ch, width=5)
        d.line([12,y+2,28,y+8], fill=ch, width=4)
    save(im, "chain_post")

def demon_idol():
    im, d = canvas(60, 88)
    st = (64, 52, 50, 255); sdk = (44, 34, 32, 255); sl = (96, 78, 72, 255)
    em = (200, 60, 40, 255)
    # pedestal
    d.rectangle([8, 72, 52, 86], fill=sdk, outline=OL, width=2)
    d.rectangle([12, 66, 48, 74], fill=st, outline=OL, width=2)
    # squat body
    d.ellipse([10, 40, 50, 72], fill=st, outline=OL, width=2)
    # head
    blob(d, 30, 32, 16, 14, st, OL)
    # horns
    d.polygon([(16,22),(20,38),(24,22)], fill=sdk, outline=OL, width=2)
    d.polygon([(36,22),(40,38),(44,22)], fill=sdk, outline=OL, width=2)
    # glowing eyes
    d.ellipse([20,28,26,34], fill=em)
    d.ellipse([34,28,40,34], fill=em)
    d.ellipse([22,30,24,32], fill=(255,120,80,255))
    d.ellipse([36,30,38,32], fill=(255,120,80,255))
    # fangs
    d.polygon([(24,40),(28,40),(26,46)], fill=(220,200,180,255))
    d.polygon([(32,40),(36,40),(34,46)], fill=(220,200,180,255))
    save(im, "demon_idol")

# ── Category 9: Void / Severance ──────────────────────────────────────────

def void_tendril():
    im, d = canvas(52, 110)
    vd = (40, 32, 54, 255); vl = (80, 60, 110, 255); tip = (180, 120, 255, 255)
    # main tendril curves
    pts = [(26,108),(20,86),(14,64),(18,44),(28,28),(32,14),(28,4)]
    d.line(pts, fill=vd, width=10, joint="curve")
    d.line(pts, fill=vl, width=4, joint="curve")
    # side tendrils branching off
    d.line([18,64,8,48], fill=vd, width=6)
    d.line([18,64,8,48], fill=vl, width=2)
    d.line([28,38,40,28], fill=vd, width=5)
    d.line([28,38,40,28], fill=vl, width=2)
    # glowing tip
    blob(d, 28, 6, 6, 5, tip, OL)
    blob(d, 28, 6, 3, 3, (220,180,255,255))
    # suction cup marks
    for (sx,sy) in [(20,80),(16,56),(22,40)]:
        d.ellipse([sx-3,sy-3,sx+3,sy+3], outline=vl, width=1)
    save(im, "void_tendril")

def cracked_portal():
    im, d = canvas(100, 100)
    st = (50, 44, 58, 255); sdk = (30, 26, 38, 255); crak = (140, 100, 200, 255)
    # broken ring — draw as arc segments with gaps
    for (start, end) in [(10,80),(100,160),(190,310),(340,350)]:
        d.arc([8,8,92,92], start, end, fill=st, width=14)
    # inner dark void
    d.ellipse([20,20,80,80], fill=(10,8,16,220))
    # crack lines radiating
    for ang in (15, 95, 200, 295):
        r = math.radians(ang)
        cx, cy = 50, 50
        x0 = int(cx + 40*math.cos(r)); y0 = int(cy + 40*math.sin(r))
        x1 = int(cx + 52*math.cos(r)); y1 = int(cy + 52*math.sin(r))
        d.line([x0,y0,x1,y1], fill=crak, width=2)
    # purple glow centre
    blob(d, 50, 50, 18, 18, (80,40,140,100))
    blob(d, 50, 50, 8,  8,  (160,80,255,120))
    save(im, "cracked_portal")

def memory_shard():
    im, d = canvas(40, 90)
    base = (160, 200, 220, 200); lite = (220, 240, 255, 240); dk = (100, 140, 170, 180)
    # translucent faceted shard
    d.polygon([(20,4),(32,30),(28,86),(12,86),(8,30)], fill=base, outline=OL, width=2)
    d.polygon([(20,4),(20,86),(12,86),(8,30)], fill=dk)
    d.polygon([(20,4),(28,24),(22,44)], fill=lite)
    # inner ghostly glow
    d.ellipse([12,34,28,56], fill=(200,220,255,80))
    # floating — no ground contact, slight shine dots
    for (sx,sy) in [(14,20),(22,48),(26,68)]:
        d.point([(sx,sy)], fill=(255,255,255,200))
    save(im, "memory_shard")

def echo_pillar():
    im, d = canvas(52, 160)
    # faded/dissolved — top half is translucent
    s = (120, 110, 130, 255); sd = (88, 80, 100, 255); sl = (160, 150, 172, 255)
    fade = (120, 110, 130, 80)
    # solid base
    d.rectangle([8, 120, 44, 158], fill=sd, outline=OL, width=2)
    d.rectangle([12, 80, 40, 122], fill=s, outline=OL, width=2)
    d.line([14,82,14,120], fill=sl, width=2)
    for y in range(88,118,10): d.line([14,y,38,y], fill=sd, width=1)
    # fading upper section
    upper = Image.new("RGBA", (52, 80), (0,0,0,0))
    ud = ImageDraw.Draw(upper)
    ud.rectangle([12, 0, 40, 78], fill=(120,110,130,180))
    ud.line([14,2,14,76], fill=(160,150,172,120), width=2)
    for y in range(8,74,10): ud.line([14,y,38,y], fill=(88,80,100,100), width=1)
    # fade mask — gets more transparent toward top
    mask = Image.new("L", (52, 80))
    for y in range(80):
        alpha = int(200 * (y / 80))
        ImageDraw.Draw(mask).line([0,y,52,y], fill=alpha)
    upper.putalpha(mask)
    im.paste(upper, (0, 0), upper)
    save(im, "echo_pillar")

# ── Category 10: Ruins / Forgotten ────────────────────────────────────────

def crumbled_wall():
    im, d = canvas(140, 72)
    st = (140, 128, 108, 255); sdk = (100, 90, 74, 255); sl = (176, 162, 138, 255)
    # left standing section
    d.rectangle([4, 16, 60, 70], fill=st, outline=OL, width=2)
    # brick pattern
    for row, y in enumerate(range(20, 68, 12)):
        ox = 4 if row%2==0 else 10
        for x in range(ox, 58, 18):
            d.rectangle([x, y, min(x+16, 58), y+10], outline=sdk, width=1)
    d.line([4,18,60,18], fill=sl, width=2)
    # rubble pile in middle
    for (rx,ry,rrx,rry) in [(72,58,14,8),(88,52,12,7),(100,60,16,9),(68,64,10,6)]:
        d.ellipse([rx-rrx,ry-rry,rx+rrx,ry+rry], fill=st, outline=OL, width=1)
    # right stub — shorter
    d.rectangle([110, 34, 136, 70], fill=st, outline=OL, width=2)
    for row, y in enumerate(range(38, 68, 12)):
        ox = 110 if row%2==0 else 116
        for x in range(ox, 134, 18):
            d.rectangle([x, y, min(x+14, 134), y+10], outline=sdk, width=1)
    save(im, "crumbled_wall")

def broken_statue():
    im, d = canvas(60, 130)
    st = (140, 130, 112, 255); sdk = (100, 92, 76, 255); sl = (180, 168, 148, 255)
    # pedestal
    d.rectangle([6, 100, 54, 128], fill=sdk, outline=OL, width=2)
    d.rectangle([10, 94, 50, 102], fill=sl, outline=OL, width=2)
    # torso — armless, robed figure
    d.polygon([(18,94),(42,94),(46,56),(14,56)], fill=st, outline=OL, width=2)
    # robe folds
    for fx in (22, 30, 38): d.line([fx, 94, fx-2, 58], fill=sdk, width=1)
    d.line([16, 58, 44, 58], fill=sl, width=2)
    # neck stump (head missing)
    d.rectangle([24, 46, 36, 58], fill=sdk, outline=OL, width=2)
    d.line([24,48,36,48], fill=sl, width=2)
    # broken left arm fragment on ground
    d.polygon([(4, 118),(18,112),(22,118),(10,124)], fill=st, outline=OL, width=1)
    # moss patches
    for (mx,my) in [(14,80),(38,72),(26,60)]:
        blob(d, mx, my, 5, 4, (80,110,70,160))
    save(im, "broken_statue")

def well_cap():
    im, d = canvas(80, 100)
    st = (130, 118, 96, 255); sdk = (90, 80, 64, 255); sl = (170, 154, 126, 255)
    wd = (110, 82, 50, 255); wdd = (76, 54, 30, 255)
    # stone well ring
    d.ellipse([6, 54, 74, 78], fill=st, outline=OL, width=3)
    d.rectangle([6, 62, 74, 88], fill=st, outline=OL, width=2)
    d.ellipse([6, 78, 74, 96], fill=sdk, outline=OL, width=2)
    d.ellipse([14, 60, 66, 76], fill=sdk)   # inner dark
    # two wooden posts
    for px in (16, 64):
        d.rectangle([px-4, 18, px+4, 62], fill=wd, outline=OL, width=2)
    # rotted roof crossbeam
    d.rectangle([8, 14, 72, 22], fill=wdd, outline=OL, width=2)
    # hanging rope + bucket
    d.line([40, 20, 40, 54], fill=(130,100,60,255), width=2)
    d.polygon([(34,54),(46,54),(48,64),(32,64)], fill=wd, outline=OL, width=2)
    # bucket hoops
    d.line([32,58,48,58], fill=wdd, width=2)
    save(im, "well_cap")

def overgrown_column():
    im, d = canvas(56, 170)
    st = (130, 118, 100, 255); sdk = (92, 82, 68, 255); sl = (166, 152, 128, 255)
    vn = (72, 108, 58, 255); vnl = (96, 142, 76, 255)
    # base
    d.rectangle([6, 154, 50, 168], fill=sdk, outline=OL, width=2)
    # shaft
    d.rectangle([12, 18, 44, 156], fill=st, outline=OL, width=2)
    for y in range(24, 154, 12): d.line([16,y,40,y], fill=sdk, width=1)
    d.line([14,20,14,154], fill=sl, width=2)
    # capital (broken)
    d.polygon([(6,18),(50,18),(46,8),(10,8)], fill=sdk, outline=OL, width=2)
    # vine overlay — winding up column
    vine_pts = [(28,158),(24,138),(30,118),(22,98),(32,78),(20,58),(28,38),(24,20)]
    d.line(vine_pts, fill=vn, width=5, joint="curve")
    # leaf clusters at joints
    for (lx,ly) in [(24,138),(22,98),(20,58)]:
        blob(d, lx-6, ly, 8, 6, vn)
        blob(d, lx+6, ly-4, 7, 5, vnl)
        blob(d, lx, ly-8, 6, 5, vn)
    save(im, "overgrown_column")

# ═══════════════════════════════════════════════════════════════════════════
# ANIMATED SPRITESHEETS  (horizontal strips, N frames × frameW wide)
# ═══════════════════════════════════════════════════════════════════════════

FW, FH = 32, 64   # standard flame-size frame

def _flame_frame(t, body_col, inner_col, tip_col, base_col):
    """Single frame of a flickering flame at phase t (0..1)."""
    im, d = canvas(FW, FH)
    wobble = int(math.sin(t * math.pi * 2) * 2)
    cx = FW // 2 + wobble
    # base glow
    blob(d, cx, FH-12, 10, 6, base_col)
    # outer flame body
    h = int(28 + math.sin(t * math.pi * 2) * 4)
    d.polygon([(cx-8, FH-10),(cx+8, FH-10),(cx+4+wobble, FH-10-h),(cx+wobble, FH-10-h-4),(cx-4+wobble, FH-10-h)], fill=body_col)
    # inner flame
    hi = int(h * 0.6)
    d.polygon([(cx-5, FH-10),(cx+5, FH-10),(cx+2+wobble//2, FH-10-hi),(cx+wobble//2, FH-10-hi-3),(cx-2+wobble//2, FH-10-hi)], fill=inner_col)
    # tip
    d.polygon([(cx+wobble//2-2, FH-10-hi-2),(cx+wobble//2+2, FH-10-hi-2),(cx+wobble//2, FH-10-hi-8)], fill=tip_col)
    return im

def torch_anim():
    """Orange torch flame — 6-frame spritesheet 32×64 each."""
    frames = []
    for i in range(6):
        t = i / 6
        f = _flame_frame(t,
            (250, 160, 50, 255),
            (255, 220, 80, 255),
            (255, 240, 180, 255),
            (200, 80, 20, 180))
        d = ImageDraw.Draw(f)
        # torch handle at bottom
        d.rectangle([13, FH-16, 19, FH-2], fill=(100,74,44,255), outline=OL, width=2)
        d.rectangle([10, FH-20, 22, FH-14], fill=(70,54,38,255), outline=OL, width=2)
        frames.append(f)
    save(hstrip(frames), "torch_anim", ANIM)

def spirit_flame():
    """Blue-teal ghost flame — 6-frame spritesheet 32×64."""
    frames = []
    for i in range(6):
        t = i / 6
        f = _flame_frame(t,
            (60, 160, 200, 220),
            (120, 220, 240, 240),
            (200, 240, 255, 255),
            (40, 100, 160, 140))
        frames.append(f)
    save(hstrip(frames), "spirit_flame", ANIM)

def lava_bubble():
    """Bubbling lava surface — 4-frame spritesheet 48×48."""
    W, H = 48, 48
    frames = []
    lava = (200, 60, 20, 255); lava2 = (240, 120, 30, 255); glow = (255, 200, 80, 255)
    dark = (100, 30, 10, 255)
    for i in range(4):
        im, d = canvas(W, H)
        # lava base
        d.ellipse([2, 20, 46, 46], fill=lava, outline=dark, width=2)
        d.ellipse([8, 24, 40, 44], fill=lava2)
        # crust patches
        for (cx,cy,rx,ry) in [(12,30,8,4),(32,36,6,3),(22,40,10,5)]:
            blob(d, cx, cy, rx, ry, dark)
        # bubble at different stages
        stage = i % 4
        if stage == 0:   # small dome
            d.ellipse([18, 20, 30, 28], fill=glow, outline=lava2, width=2)
        elif stage == 1:  # growing
            d.ellipse([15, 14, 33, 28], fill=glow, outline=lava2, width=2)
        elif stage == 2:  # peak / bursting
            d.ellipse([12, 10, 36, 28], fill=glow, outline=lava2, width=2)
            d.arc([12,10,36,20], 180, 360, fill=(255,240,100,255), width=3)
        else:             # popped — splash ring
            for ang in range(0, 360, 45):
                r = math.radians(ang)
                ex = int(24 + 14*math.cos(r)); ey = int(18 + 8*math.sin(r))
                d.ellipse([ex-2,ey-2,ex+2,ey+2], fill=glow)
        frames.append(im)
    save(hstrip(frames), "lava_bubble", ANIM)

def void_pulse():
    """Pulsing void portal ring — 6-frame spritesheet 64×64."""
    W, H = 64, 64
    frames = []
    for i in range(6):
        im, d = canvas(W, H)
        t = i / 6
        # ring radius pulses
        r = int(24 + math.sin(t * math.pi * 2) * 4)
        # dark void centre
        blob(d, 32, 32, r-4, r-4, (8, 4, 16, 230))
        # outer ring glow — multiple layered arcs
        for dr, alpha in [(0, 255),(3, 160),(6, 80),(10, 40)]:
            col = (140-dr*8, 60+dr*4, 220, alpha)
            d.arc([32-r-dr, 32-r-dr, 32+r+dr, 32+r+dr], 0, 360, fill=col, width=4)
        # rotating spark at t position
        ang = t * math.pi * 2
        sx = int(32 + r * math.cos(ang)); sy = int(32 + r * math.sin(ang))
        blob(d, sx, sy, 4, 4, (220, 180, 255, 255))
        frames.append(im)
    save(hstrip(frames), "void_pulse", ANIM)

def water_ripple():
    """Water surface ripple — 4-frame spritesheet 48×48."""
    W, H = 48, 48
    frames = []
    water = (54, 104, 134, 255); sheen = (82, 140, 168, 255); bright = (140, 196, 220, 255)
    for i in range(4):
        im, d = canvas(W, H)
        # water base
        d.ellipse([2, 8, 46, 44], fill=water)
        d.ellipse([6, 12, 42, 40], fill=sheen)
        blob(d, 24, 20, 12, 6, bright)
        # expanding ripple rings at different offsets
        for ring in range(3):
            phase = (i + ring * 1.3) % 4
            r = int(6 + phase * 5)
            alpha = max(0, int(200 - phase * 60))
            col = (bright[0], bright[1], bright[2], alpha)
            d.arc([24-r, 24-r//2, 24+r, 24+r//2], 180, 360, fill=col, width=2)
        frames.append(im)
    save(hstrip(frames), "water_ripple", ANIM)

def wind_banner_anim():
    """Flapping banner — 4-frame spritesheet 64×80."""
    W, H = 64, 80
    frames = []
    red = (160, 40, 40, 255); rl = (200, 70, 60, 255); rd = (110, 26, 26, 255)
    pole = (100, 80, 52, 255)
    for i in range(4):
        im, d = canvas(W, H)
        # pole
        d.rectangle([4, 2, 12, 78], fill=pole, outline=OL, width=2)
        # banner with wave deformation
        wave = [math.sin((j/4 + i/4) * math.pi * 2) * 8 for j in range(5)]
        pts = [(12, 10)]
        for j in range(4):
            pts.append((20 + j*12 + int(wave[j]), 10 + j*3))
        pts.append((60 + int(wave[4]), 40))
        for j in range(3,-1,-1):
            pts.append((20 + j*12 + int(wave[j]), 56 - j*3))
        pts.append((12, 52))
        d.polygon(pts, fill=red, outline=OL, width=2)
        # shading
        for j in range(len(pts)//2 - 1):
            if j % 2 == 0:
                d.line([pts[j], pts[j+1]], fill=rl, width=2)
        frames.append(im)
    save(hstrip(frames), "wind_banner_anim", ANIM)

def crystal_glow():
    """Pulsing crystal — 4-frame spritesheet 64×80."""
    W, H = 64, 80
    frames = []
    base = (140, 110, 200, 255); lite = (200, 175, 245, 255); dk = (90, 65, 150, 255)
    for i in range(4):
        im, d = canvas(W, H)
        t = i / 4
        pulse = math.sin(t * math.pi * 2)
        # main crystal body
        d.polygon([(32, 4),(48, 36),(42, 76),(22, 76),(16, 36)], fill=base, outline=OL, width=2)
        d.polygon([(32, 4),(32, 76),(22, 76),(16, 36)], fill=dk)
        d.polygon([(32, 4),(42, 30),(34, 52)], fill=lite)
        # companion shards
        d.polygon([(8,54),(16,36),(20,54),(18,74),(10,74)], fill=base, outline=OL, width=2)
        d.polygon([(44,60),(54,44),(58,60),(56,76),(46,76)], fill=base, outline=OL, width=2)
        # glow halo — pulsing size
        gr = int(20 + pulse * 6)
        glow_col = (180, 140, 255, int(60 + pulse * 30))
        blob(d, 32, 40, gr, gr, glow_col)
        # inner bright spot
        blob(d, 32, 24, int(5 + pulse*2), int(5 + pulse*2), (220, 200, 255, 200))
        frames.append(im)
    save(hstrip(frames), "crystal_glow", ANIM)

def smoke_wisp():
    """Rising smoke — 6-frame spritesheet 32×64."""
    W, H = 32, 64
    frames = []
    for i in range(6):
        im, d = canvas(W, H)
        t = i / 6
        # base ember glow
        blob(d, 16, H-6, 8, 4, (200, 100, 40, 160))
        # smoke column — three overlapping blobs rising and drifting
        for j in range(5):
            progress = (j / 4)
            drift = int(math.sin((t + progress * 0.7) * math.pi * 2) * 4)
            y = int(H - 10 - progress * 44)
            r = int(3 + progress * 6)
            alpha = int(200 - progress * 160)
            col = (168, 160, 154, alpha)
            blob(d, 16 + drift, y, r, r, col)
        frames.append(im)
    save(hstrip(frames), "smoke_wisp", ANIM)

# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("Generating static props...")
    # Category 1 — Bazaar
    merchant_stall(); trade_cart(); hanging_lantern(); goods_crate(); market_bell()
    # Category 2 — Serpent/Marsh
    serpent_idol(); eel_trap(); marsh_lantern(); mangrove_root()
    # Category 3 — Sky/Wind/Cloud
    wind_chime(); storm_banner(); nest_mound(); cloud_arch()
    # Category 4 — Frost/Monastery
    prayer_wheel(); prayer_flags(); snow_lantern(); ice_wall_shard()
    # Category 5 — Soul/Shrine
    incense_stand(); torii_gate(); offering_bowl(); spirit_bell()
    # Category 6 — Root/Underground
    gnarled_root(); mushroom_cluster(); root_pillar(); biolum_pod()
    # Category 7 — Harbor/Tidal
    anchor(); net_post(); buoy(); shipwreck_plank()
    # Category 8 — Forge/Demon
    demon_anvil(); heat_vent(); chain_post(); demon_idol()
    # Category 9 — Void/Severance
    void_tendril(); cracked_portal(); memory_shard(); echo_pillar()
    # Category 10 — Ruins/Forgotten
    crumbled_wall(); broken_statue(); well_cap(); overgrown_column()

    print("Generating animated spritesheets...")
    torch_anim(); spirit_flame(); lava_bubble(); void_pulse()
    water_ripple(); wind_banner_anim(); crystal_glow(); smoke_wisp()

    print("\nStatic props ->", PROPS)
    from PIL import Image as _I
    for f in sorted(os.listdir(PROPS)):
        if f.endswith(".png"):
            w,h = _I.open(f"{PROPS}/{f}").size
            print(f"  {w:4}x{h:<4} {f}")
    print("\nAnimated spritesheets ->", ANIM)
    for f in sorted(os.listdir(ANIM)):
        if f.endswith(".png"):
            w,h = _I.open(f"{ANIM}/{f}").size
            print(f"  {w:4}x{h:<4} {f}")
