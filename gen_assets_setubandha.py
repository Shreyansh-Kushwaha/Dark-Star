#!/usr/bin/env python3
"""
Custom pixel-art assets for Region 11 — "Setubandha, The Broken Bridge Town".

The Tiny-Swords / craftpix packs have no bridge or lift, and the broken stone
bridge over the chasm is this region's centrepiece, so we generate them here:

  bridge_deck.png    160x120  a tileable top-down stone bridge span (rails N/S)
  bridge_break_r.png 160x120  span whose RIGHT end crumbles into the void
  bridge_break_l.png 160x120  span whose LEFT  end crumbles (far stub, mirrored)
  lift_platform.png  128x120  a roped wooden cargo-lift deck over the chasm
  bridge_rubble.png   96x64   loose fallen planks/blocks for the gap edges

Style: hard-edged pixel blocks, no anti-aliasing, limited stone/wood palette,
sized so a span reads ~2x the warrior's ~100px body when placed.
"""
import os
from PIL import Image, ImageDraw

OUT = "assets_custom/structures"
os.makedirs(OUT, exist_ok=True)

# ---- palettes ---------------------------------------------------------------
STONE_D = (74, 68, 60, 255)    # deep mortar / shadow
STONE_M = (138, 128, 118, 255) # mid stone
STONE_L = (170, 160, 148, 255) # highlight stone
STONE_H = (196, 187, 174, 255) # top-lit edge
RAIL_D  = (58, 53, 47, 255)
RAIL_M  = (104, 96, 86, 255)
WOOD_D  = (74, 52, 30, 255)
WOOD_M  = (122, 90, 54, 255)
WOOD_L  = (158, 122, 76, 255)
WOOD_H  = (186, 150, 100, 255)
ROPE    = (150, 134, 96, 255)
VOIDCRK = (24, 20, 18, 255)


def _deck(d, x0, x1):
    """Paint a cobbled stone deck band (walkway) from x0..x1 on draw d."""
    top, bot = 24, 96          # walkway vertical extent
    d.rectangle([x0, top, x1 - 1, bot - 1], fill=STONE_M)
    # cobble seams: staggered blocks
    bw, bh = 20, 18
    for j, yy in enumerate(range(top, bot, bh)):
        off = (bw // 2) if (j % 2) else 0
        for xx in range(x0 - bw, x1 + bw, bw):
            bx = xx + off
            rx0, rx1 = max(bx, x0), min(bx + bw - 2, x1 - 1)
            ry1 = min(yy + bh - 2, bot - 1)
            if rx1 <= rx0 or ry1 <= yy:
                continue
            d.rectangle([rx0, yy, rx1, ry1], outline=STONE_D)
            # a few lighter stones for texture
            if (bx + yy) % 60 == 0 and rx1 - 2 > rx0 + 2:
                d.rectangle([rx0 + 2, yy + 2, rx1 - 2, ry1 - 2], fill=STONE_L)


def _rails(d, x0, x1):
    """North & south stone parapets framing the deck."""
    # north rail
    d.rectangle([x0, 10, x1 - 1, 24 - 1], fill=RAIL_M)
    d.rectangle([x0, 10, x1 - 1, 12], fill=STONE_H)           # top-lit edge
    for xx in range(x0, x1, 18):
        d.rectangle([xx, 12, xx + 1, 23], fill=RAIL_D)        # baluster gaps
    # south rail (in shadow)
    d.rectangle([x0, 96, x1 - 1, 112 - 1], fill=RAIL_D)
    d.rectangle([x0, 108, x1 - 1, 111], fill=(40, 36, 31, 255))
    for xx in range(x0, x1, 18):
        d.rectangle([xx, 98, xx + 1, 109], fill=RAIL_M)


def bridge_deck():
    im = Image.new("RGBA", (160, 120), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    _deck(d, 0, 160)
    _rails(d, 0, 160)
    im.save(f"{OUT}/bridge_deck.png")


def _crumble(im, d, broken_right=True):
    """Erase a jagged chunk at one end and add cracks + dangling stones."""
    W, H = im.size
    # jagged break profile (column heights of surviving deck)
    import math
    edge_cols = range(W - 64, W) if broken_right else range(0, 64)
    for i, cx in enumerate(edge_cols):
        # how deep the break eats in, grows toward the open end
        t = (i / 64.0) if broken_right else (1 - i / 64.0)
        bite = int((t ** 1.6) * 150)
        jag = int(10 * math.sin(cx * 0.7) + 8 * math.sin(cx * 0.31))
        cut = bite + jag
        if cut <= 0:
            continue
        # clear from both rails inward toward centre for a snapped look
        d.rectangle([cx, 10, cx, 10 + cut // 2], fill=(0, 0, 0, 0))
        d.rectangle([cx, 112 - cut // 2, cx, 112], fill=(0, 0, 0, 0))
        # narrow the walkway as it nears the break
        if t > 0.55:
            d.rectangle([cx, 24, cx, 24 + int((t - 0.55) * 80)], fill=(0, 0, 0, 0))
            d.rectangle([cx, 96 - int((t - 0.55) * 80), cx, 96], fill=(0, 0, 0, 0))
    # crack lines reaching back from the break
    bx = W - 60 if broken_right else 60
    d.line([bx, 52, bx + (40 if broken_right else -40), 60], fill=VOIDCRK, width=2)
    d.line([bx, 70, bx + (44 if broken_right else -44), 64], fill=VOIDCRK, width=2)
    # a couple of dislodged blocks hanging at the lip
    lx = W - 18 if broken_right else 6
    d.rectangle([lx, 60, lx + 12, 74], fill=STONE_M, outline=STONE_D)
    bx2a, bx2b = sorted([lx - 6 if broken_right else lx + 12, lx + 6])
    d.rectangle([bx2a, 78, bx2b, 88], fill=STONE_L, outline=STONE_D)


def bridge_break(broken_right=True):
    im = Image.new("RGBA", (160, 120), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    _deck(d, 0, 160)
    _rails(d, 0, 160)
    _crumble(im, d, broken_right)
    name = "bridge_break_r.png" if broken_right else "bridge_break_l.png"
    im.save(f"{OUT}/{name}")


def lift_platform():
    W, H = 128, 120
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # deck plate (slightly isometric-flat square) sits in lower half
    dx0, dy0, dx1, dy1 = 14, 40, 114, 104
    d.rectangle([dx0, dy0, dx1, dy1], fill=WOOD_M)
    # horizontal planks
    for yy in range(dy0, dy1, 10):
        d.rectangle([dx0, yy, dx1, yy + 8], outline=WOOD_D)
        d.rectangle([dx0 + 1, yy + 1, dx1 - 1, yy + 2], fill=WOOD_L)
    # rim frame
    d.rectangle([dx0, dy0, dx1, dy1], outline=WOOD_D, width=3)
    d.rectangle([dx0, dy0, dx1, dy0 + 3], fill=WOOD_H)        # lit front lip
    # four corner posts + rope rings
    for px in (dx0 + 6, dx1 - 10):
        for py in (dy0 + 4, dy1 - 16):
            d.rectangle([px, py - 4, px + 4, py + 12], fill=WOOD_D)
    # ropes rising to an off-screen winch (corner diagonals up)
    for (sx, sy) in [(dx0 + 8, dy0 + 2), (dx1 - 8, dy0 + 2)]:
        d.line([sx, sy, W // 2, 2], fill=ROPE, width=2)
    # central down-hatch hint (dark) — the cargo hole
    d.rectangle([W // 2 - 14, dy0 + 18, W // 2 + 14, dy1 - 12], fill=(30, 24, 18, 255))
    d.rectangle([W // 2 - 14, dy0 + 18, W // 2 + 14, dy1 - 12], outline=WOOD_D, width=2)
    im.save(f"{OUT}/lift_platform.png")


def bridge_rubble():
    W, H = 96, 64
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    blocks = [(8, 30, 30, 48, STONE_M), (26, 38, 44, 56, STONE_L),
              (50, 28, 78, 50, STONE_M), (40, 14, 60, 30, STONE_L),
              (66, 44, 88, 60, STONE_D)]
    for (x0, y0, x1, y1, c) in blocks:
        d.rectangle([x0, y0, x1, y1], fill=c, outline=STONE_D)
    # a snapped plank
    d.rectangle([14, 18, 70, 26], fill=WOOD_M, outline=WOOD_D)
    d.rectangle([15, 19, 69, 21], fill=WOOD_L)
    im.save(f"{OUT}/bridge_rubble.png")


if __name__ == "__main__":
    bridge_deck()
    bridge_break(True)
    bridge_break(False)
    lift_platform()
    bridge_rubble()
    print("wrote custom assets ->", OUT)
    for f in sorted(os.listdir(OUT)):
        im = Image.open(f"{OUT}/{f}")
        print(f"  {im.size[0]}x{im.size[1]}  {f}")
