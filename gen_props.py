#!/usr/bin/env python3
"""
Custom pixel-art props for the open-world regions, in the chunky Tiny-Swords
style (flat fills, dark outline, simple top-light). The craftpix/Tiny-Swords
packs cover forests, towns and caves; these fill the gaps for desert, fields,
swamp, temple, sky, snow, bone and void biomes. One PNG per prop, base-anchored
when placed (origin = foot).
"""
import os, math
from PIL import Image, ImageDraw

OUT = "assets_custom/props"
os.makedirs(OUT, exist_ok=True)

def canvas(w, h):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); return im, ImageDraw.Draw(im)
def save(im, name):
    im.save(f"{OUT}/{name}.png")

def blob(d, cx, cy, rx, ry, fill, outline=None):
    d.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=fill, outline=outline, width=2)

# ----- palettes ----
OL = (34, 28, 24, 255)        # universal dark outline

def cactus():
    im, d = canvas(48, 92); g=(74,118,58,255); gd=(50,86,40,255); gl=(108,150,84,255)
    d.rounded_rectangle([19,18,29,90], 5, fill=g, outline=OL, width=2)
    d.rounded_rectangle([4,40,15,66], 4, fill=g, outline=OL, width=2)     # left arm
    d.rounded_rectangle([4,30,11,46], 3, fill=g, outline=OL, width=2)
    d.rounded_rectangle([33,32,44,58], 4, fill=g, outline=OL, width=2)    # right arm
    d.rounded_rectangle([37,22,44,38], 3, fill=g, outline=OL, width=2)
    for yy in range(24,88,8): d.line([24,yy,24,yy+4], fill=gd, width=1)
    d.line([22,20,22,88], fill=gl, width=1)
    save(im, "cactus")

def dead_tree():
    im, d = canvas(96, 132); b=(92,80,68,255); bd=(60,50,42,255)
    d.polygon([(44,130),(52,130),(50,60),(46,60)], fill=b, outline=OL)
    # gnarled branches
    for (x0,y0,x1,y1,w) in [(48,66,20,34,6),(48,72,78,40,6),(20,34,8,18,4),
                            (78,40,90,22,4),(48,80,30,60,4),(48,58,60,30,4)]:
        d.line([x0,y0,x1,y1], fill=b, width=w); d.line([x0,y0,x1,y1], fill=bd, width=max(1,w-4))
    blob(d, 50, 60, 10, 8, b, OL)
    save(im, "dead_tree")

def scarecrow():
    im, d = canvas(56, 104); wood=(120,86,52,255); cloth=(150,120,70,255)
    d.rectangle([26,30,30,100], fill=wood, outline=OL)          # post
    d.rectangle([8,40,48,46], fill=wood, outline=OL)            # cross arm
    d.polygon([(16,46),(40,46),(44,78),(12,78)], fill=cloth, outline=OL)  # tunic
    blob(d, 28, 26, 13, 13, (190,170,120,255), OL)             # burlap head
    d.line([22,24,26,28], fill=OL, width=2); d.line([34,24,30,28], fill=OL, width=2)
    d.polygon([(14,16),(42,16),(28,4)], fill=wood, outline=OL)  # hat
    for hx in (12,18,44,38): d.line([hx,78,hx-2,92], fill=cloth, width=2)  # straw
    save(im, "scarecrow")

def bone_pile():
    im, d = canvas(76, 54); bn=(214,206,188,255); bs=(170,160,140,255)
    for (x,y,r) in [(20,38,12),(40,42,14),(58,36,11)]: blob(d,x,y,r,r*0.7,bn,OL)
    for (x0,y0,x1,y1) in [(10,30,34,22),(30,40,58,30),(40,20,62,16)]:
        d.line([x0,y0,x1,y1], fill=bn, width=6);
        blob(d,x0,y0,4,4,bn,OL); blob(d,x1,y1,4,4,bn,OL)
    save(im, "bone_pile")

def skull():
    im, d = canvas(40, 38); bn=(220,212,196,255)
    blob(d, 20, 16, 14, 13, bn, OL)
    d.ellipse([11,12,18,20], fill=OL); d.ellipse([22,12,29,20], fill=OL)
    d.polygon([(17,22),(23,22),(20,28)], fill=OL)
    d.rectangle([12,26,28,34], fill=bn, outline=OL)
    for xx in range(14,28,4): d.line([xx,26,xx,34], fill=OL, width=1)
    save(im, "skull")

def bone_arch():
    im, d = canvas(128, 156); bn=(206,198,180,255); bs=(168,158,138,255)
    for sx in (28, 100):
        d.rounded_rectangle([sx-12,40,sx+12,150], 8, fill=bn, outline=OL, width=2)
        for yy in range(54,148,18): d.line([sx-12,yy,sx+12,yy], fill=bs, width=2)
    d.arc([16,4,112,96], 180, 360, fill=bn, width=22)
    d.arc([16,4,112,96], 180, 360, fill=OL, width=2)
    blob(d, 64, 18, 16, 12, bn, OL)
    save(im, "bone_arch")

def cloud_platform():
    im, d = canvas(220, 104); w=(238,242,250,255); ws=(206,214,232,255); wd=(176,186,210,255)
    for (x,y,r) in [(48,52,40),(96,40,46),(150,50,44),(186,58,34),(20,60,26)]:
        blob(d, x, y, r, r*0.82, w)
    d.rectangle([14,58,206,86], fill=w)
    d.ellipse([6,70,214,100], fill=ws)          # shaded underside
    for (x,y,r) in [(60,80,30),(120,84,34),[170,80,28]]:
        blob(d, x, y, r, r*0.5, wd)
    # re-light tops
    for (x,y,r) in [(48,46,30),(96,34,36),(150,44,34)]: blob(d, x, y, r, r*0.6, w)
    save(im, "cloud_platform")

def ice_shard():
    im, d = canvas(52, 116); ic=(150,206,232,255); il=(206,238,250,255); idk=(96,150,196,255)
    d.polygon([(26,4),(44,64),(34,112),(18,112),(8,64)], fill=ic, outline=OL)
    d.polygon([(26,4),(26,112),(18,112),(8,64)], fill=idk)
    d.polygon([(26,4),(34,40),(26,60)], fill=il)
    save(im, "ice_shard")

def brazier():
    im, d = canvas(44, 78); st=(110,104,96,255); bowl=(78,72,66,255)
    d.polygon([(18,76),(26,76),(30,46),(14,46)], fill=st, outline=OL)   # stand
    d.rectangle([10,70,34,77], fill=st, outline=OL)
    d.ellipse([8,38,36,54], fill=bowl, outline=OL)                       # bowl
    for (c,r) in [((250,180,60,255),12),((250,120,40,255),8),((255,230,150,255),4)]:
        d.polygon([(22,44-r*2),(22-r//2,46),(22+r//2,46)], fill=c)        # flame
    save(im, "brazier")

def pillar():
    im, d = canvas(60, 196); s=(196,180,150,255); ss=(166,150,122,255); sl=(220,206,180,255)
    d.rectangle([8,176,52,192], fill=ss, outline=OL)        # base
    d.rectangle[14,18,46,178] if False else d.rectangle([14,18,46,178], fill=s, outline=OL)  # shaft
    for yy in range(24,176,10): d.line([18,yy,42,yy], fill=ss, width=1)  # fluting
    d.line([18,20,18,176], fill=sl, width=2)
    d.rectangle([6,4,54,20], fill=ss, outline=OL)           # capital
    save(im, "pillar")

def mural():
    im, d = canvas(140, 100); st=(150,138,116,255); sd=(120,108,90,255)
    d.rectangle([4,4,136,96], fill=st, outline=OL, width=2)
    d.rectangle([4,4,136,96], outline=sd, width=4)
    # six halos — the sixth scraped away
    cols=[28,50,72,94,116];
    for i,cx in enumerate([22,46,70,94,118]):
        gold=(214,180,70,255) if i<4 else (150,138,116,255)
        d.ellipse([cx-9,30,cx+9,48], outline=gold if i<4 else sd, width=3)
        d.ellipse([cx-4,50,cx+4,64], fill=(96,86,72,255))   # figure
        if i==4:  # scraped-bare niche
            d.line([cx-10,28,cx+10,66], fill=sd, width=2); d.line([cx+10,28,cx-10,66], fill=sd, width=2)
    save(im, "mural")

def void_shard():
    im, d = canvas(120, 86); rk=(46,40,58,255); rl=(78,68,96,255); rd=(28,24,36,255)
    d.polygon([(10,40),(44,14),(96,22),(112,52),(78,78),(30,72)], fill=rk, outline=OL)
    d.polygon([(44,14),(96,22),(70,40),(40,34)], fill=rl)         # lit top
    d.polygon([(30,72),(78,78),(112,52),(80,60),(40,60)], fill=rd)
    for (x,y) in [(58,44),(74,52),(50,56)]:                        # faint cracks of light
        d.line([x,y,x+6,y+10], fill=(150,120,200,255), width=1)
    save(im, "void_shard")

def reed():
    im, d = canvas(34, 74); g=(86,120,72,255); gd=(58,86,52,255)
    for (x0,bend) in [(10,-4),(17,2),(24,5),(14,0)]:
        d.line([x0,72,x0+bend,8], fill=g, width=3)
        d.line([x0+bend,8,x0+bend+2,2], fill=(120,98,60,255), width=4)  # cattail head
    save(im, "reed")

def gate_arch():
    im, d = canvas(236, 224); s=(150,140,120,255); sd=(112,104,88,255); sl=(184,174,150,255)
    for sx in (8, 168):
        d.rectangle([sx,30,sx+60,222], fill=s, outline=OL, width=2)
        for yy in range(44,216,22):
            for xx in range(sx+4,sx+58,28): d.rectangle([xx,yy,xx+24,yy+18], outline=sd)
        d.line([sx+2,32,sx+2,220], fill=sl, width=2)
    d.rectangle([0,0,236,34], fill=s, outline=OL, width=2)        # lintel
    d.rectangle([20,2,216,30], outline=sd, width=2)
    # weathered carving band (five marks)
    for i,cx in enumerate(range(54,200,30)):
        d.ellipse([cx-7,8,cx+7,24], outline=(190,170,90,255) if i<4 else sd, width=2)
    save(im, "gate_arch")

def lava_rock():
    im, d = canvas(72, 56); rk=(54,46,44,255); rl=(86,74,70,255)
    d.polygon([(6,40),(24,18),(50,16),(66,38),(54,50),(20,50)], fill=rk, outline=OL)
    d.polygon([(24,18),(50,16),(40,30),(22,30)], fill=rl)
    for (x,y) in [(30,40),(44,42),(38,46)]:
        d.line([x,y,x+8,y], fill=(250,140,40,255), width=2)        # lava seams
    save(im, "lava_rock")

def crystal(name, base, light, dark):
    im, d = canvas(64, 116)
    d.polygon([(32,6),(50,60),(40,112),(24,112),(14,60)], fill=base, outline=OL)
    d.polygon([(32,6),(32,112),(24,112),(14,60)], fill=dark)
    d.polygon([(32,6),(40,44),(32,66)], fill=light)
    # small companion shards
    d.polygon([(8,80),(18,56),(24,80),(20,108),(10,108)], fill=base, outline=OL)
    d.polygon([(46,86),(54,66),(60,86),(56,110),(48,110)], fill=base, outline=OL)
    save(im, name)

if __name__ == "__main__":
    cactus(); dead_tree(); scarecrow(); bone_pile(); skull(); bone_arch()
    cloud_platform(); ice_shard(); brazier(); pillar(); mural(); void_shard()
    reed(); gate_arch(); lava_rock()
    crystal("crystal_cyan",   (108,196,210,255), (190,238,244,255), (64,140,158,255))
    crystal("crystal_purple", (140,110,196,255), (206,180,244,255), (92,64,150,255))
    crystal("crystal_amber",  (210,160,72,255),  (244,212,140,255), (150,104,40,255))
    print("wrote props ->", OUT)
    for f in sorted(os.listdir(OUT)):
        w,h = Image.open(f"{OUT}/{f}").size
        print(f"  {w}x{h}  {f}")
