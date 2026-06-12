#!/usr/bin/env python3
"""
One-shot repair: the "Animated Objects" campfires and flags were saved as
multi-file frame animations (frames ["1.png","2.png",...]), but each of those
PNGs is itself a 6-frame 32x64 strip — so the game (and editor) drew the whole
sheet: six little fires / a row of pennants instead of one animated prop.

Converts every such record in every region to a proper spritesheet record
(frames ["1.png"], frameW 32, frameH 64, frameCount 6). The anchor keeps the
same relative point (sheet 96/63 → frame 16/60 ≈ centre-bottom), so nothing
moves. Idempotent: records that already have frameW are skipped.
"""
import glob, json

fixed = 0
for path in sorted(glob.glob("regions/region_*.json")):
    d = json.load(open(path))
    n = 0
    for s in d["sprites"]:
        if s.get("type") != "sprite" or "Animated Objects" not in s.get("dir", ""):
            continue
        if s.get("frameW"):
            continue
        s["frames"] = ["1.png"]
        s["animated"] = True
        s["frameW"] = 32
        s["frameH"] = 64
        s["frameCount"] = 6
        s["frameRow"] = 0
        s["offsetX"] = 16.0
        s["offsetY"] = 60
        n += 1
    if n:
        json.dump(d, open(path, "w"), indent=1)
        print(f"{path}: {n} converted")
        fixed += n
print(f"total {fixed} records converted")
