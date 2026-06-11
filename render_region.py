#!/usr/bin/env python3
"""
render_region.py — offline validator + previewer for a region JSON.

Usage:  python3 render_region.py <index> [<index> ...]
For each region it: verifies every sprite asset resolves (reports missing),
warns on animated-sprite count, then renders a top-down PNG to /tmp/region_<N>.png
(and a downscaled contact thumbnail). Renders by the same depth rule the engine
uses (depth = y, 'above' = y+1 else y-1), base/center origins from offsetX/Y.
"""
import json, sys, os
from PIL import Image, ImageDraw

def hex2(c):
    c = c.lstrip("#")[:6]
    if len(c) < 6: c = (c + "000000")[:6]
    return tuple(int(c[i:i+2], 16) for i in (0, 2, 4)) + (255,)

def render(idx, overlay=False):
    path = f"regions/region_{idx}.json"
    data = json.load(open(path))
    W, H = 3200, 2000
    canvas = Image.new("RGBA", (W, H), hex2(data["background"]["value"]))
    d = ImageDraw.Draw(canvas)
    for s in data["sprites"]:
        if s["type"] != "stroke": continue
        pts = s["points"]; xy = [(pts[i], pts[i+1]) for i in range(0, len(pts), 2)]
        if len(xy) >= 2:
            d.line(xy, fill=hex2(s["stroke"]), width=int(s["strokeWidth"]), joint="curve")
    def depth(s): return s["y"] + 1 if s.get("spriteLayer") == "above" else s["y"] - 1
    imgs = [s for s in data["sprites"] if s["type"] == "sprite"]
    missing = set()
    for s in sorted(imgs, key=depth):
        p = s["dir"] + "/" + s["frames"][0]
        try:
            im = Image.open(p).convert("RGBA")
        except Exception:
            missing.add(p); continue
        sx, sy = s.get("scaleX", 1), s.get("scaleY", 1)
        im = im.resize((max(1, int(im.width * sx)), max(1, int(im.height * sy))))
        ox = s.get("offsetX", im.width / 2 / sx) * sx
        oy = s.get("offsetY", im.height / 2 / sy) * sy
        canvas.alpha_composite(im, (int(s["x"] - ox), int(s["y"] - oy)))
    # also verify every animated frame exists (load-time 404 guard)
    for s in imgs:
        if s.get("animated") and len(s.get("frames", [])) > 1 and not s.get("frameW"):
            for fr in s["frames"]:
                if not os.path.exists(s["dir"] + "/" + fr): missing.add(s["dir"] + "/" + fr)
    if overlay:
        od = ImageDraw.Draw(canvas)
        for z in data["noWalkZones"]:
            od.rectangle([z["x"], z["y"], z["x"]+z["w"], z["y"]+z["h"]], outline=(255,40,40,255), width=4)
        def dot(x,y,c,r=24): od.ellipse([x-r,y-r,x+r,y+r], fill=c, outline=(0,0,0,255))
        for e in data["enemies"]: dot(e["x"], e["y"], (225,40,40,255))
        for n in data["npcs"]: dot(n["x"], n["y"], (40,225,225,255))
        if data.get("boss"): dot(data["boss"]["x"], data["boss"]["y"], (255,0,255,255), 40)
        for p in data["portals"]:
            c = (120,255,230,255)
            if p.get("direction") == "back": c = (60,160,255,255)
            if p.get("direction") == "next": c = (255,170,60,255)
            dot(p["x"], p["y"], c, 30)
        dot(380, 1000, (255,255,255,255), 16)
    out = f"/tmp/region_{idx}.png"
    canvas.convert("RGB").save(out)
    canvas.convert("RGB").resize((800, 500)).save(f"/tmp/region_{idx}_thumb.png")
    anim = sum(1 for s in imgs if s.get("animated"))
    flag = "  ⚠ANIM>18" if anim > 18 else ""
    print(f"R{idx:<2} '{(data.get('regionName') or f'region {idx}')[:38]:38}' sprites={len(data['sprites']):4} "
          f"anim={anim:2}{flag} zones={len(data['noWalkZones']):2} "
          f"enemies={len(data['enemies']):2} npcs={len(data['npcs'])} "
          f"boss={data.get('boss') and data['boss']['key']} miss={len(missing)}")
    for m in sorted(missing): print("      MISSING:", m)
    return len(missing)

if __name__ == "__main__":
    args = sys.argv[1:]
    overlay = "--overlay" in args
    idxs = [a for a in args if a.lstrip("-").isdigit()]
    bad = 0
    for a in idxs:
        bad += render(int(a), overlay=overlay)
    sys.exit(1 if bad else 0)
