#!/usr/bin/env python3
"""
catalog_assets.py — build docs/assets.json

Walks every asset root in the project and in the external ~/Documents/Projects/game-assets
library, reads image dimensions with PIL, and classifies each asset as:
  - "image"            : a single still sprite / texture
  - "spritesheet"      : a single PNG that is an animation strip / grid (width or height is
                          an integer multiple of the other -> frame count guessed)
  - "animation_frames" : a directory of numbered frames (01.png, 02.png ... or walk_0.png ...)
                          collapsed into ONE entry with frame_count + frame_size
  - "tileset"          : a large image living in a tiles/tileset folder

Auxiliary (non-image) files (.aseprite/.psd/.eps/.ai/.tmx/.tsx/.wav/.ogg/.mp3/.ttf/.gif ...)
are counted per pack and audio/gif are listed.

Run:  python3 tools/catalog_assets.py
Out:  docs/assets.json
"""
import os, re, json, datetime
from collections import defaultdict
from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # some tilesets are huge; we trust local files

PROJECT = "/home/shreyansh/Documents/Projects/Game/Dark-Star"
EXTERNAL = "/home/shreyansh/Documents/Projects/game-assets"

IMG_EXT = (".png", ".jpg", ".jpeg", ".webp", ".bmp")
AUX_EXT = {
    ".aseprite": "aseprite_source", ".ase": "aseprite_source",
    ".psd": "photoshop_source", ".eps": "vector_source", ".ai": "vector_source",
    ".tmx": "tiled_map", ".tsx": "tiled_tileset", ".tiled-session": "tiled_session",
    ".wav": "audio", ".ogg": "audio", ".mp3": "audio", ".flac": "audio",
    ".ttf": "font", ".otf": "font", ".fnt": "font",
    ".gif": "gif_preview", ".txt": "text", ".md": "text", ".unitypackage": "unity_package",
    ".json": "data", ".csv": "data", ".pdf": "doc",
}

SKIP_DIR_PARTS = {"__MACOSX", ".git", "node_modules", "__pycache__"}

# ----------------------------------------------------------------------------
# Pack roots.  (path, location, is_collection)
#   is_collection -> each immediate sub-directory is treated as its own pack.
#   otherwise the directory itself is one pack.
# ----------------------------------------------------------------------------
ROOTS = [
    (f"{PROJECT}/assest2",                                              "project", True),
    (f"{PROJECT}/assest4",                                              "project", True),
    (f"{PROJECT}/assets3",                                              "project", True),
    (f"{PROJECT}/assets5",                                              "project", True),
    (f"{PROJECT}/assets6",                                              "project", True),
    (f"{PROJECT}/assets_custom",                                        "project", True),
    (f"{PROJECT}/cropped",                                              "project", False),
    (f"{PROJECT}/THE PACK",                                             "project", False),
    (f"{PROJECT}/Tiny Swords (Free Pack)",                              "project", False),
    (f"{PROJECT}/craftpix-net-168228-free-tree-pixel-art-asset-pack",   "project", False),
    (f"{PROJECT}/src/map",                                              "project", False),
    (f"{EXTERNAL}/New folder",                                          "external", True),
    (f"{EXTERNAL}/New folder 2",                                        "external", True),
    (f"{EXTERNAL}/New folder 3",                                        "external", True),
    (f"{EXTERNAL}/New folder 4",                                        "external", True),
    (f"{EXTERNAL}/New folder 5",                                        "external", True),
    (f"{EXTERNAL}/craftpix-net-168228-free-tree-pixel-art-asset-pack",  "external", False),
]

# Hand-written descriptions keyed by directory basename (matched case-insensitively).
# author / license / category / description for packs I could identify.
PACK_INFO = {
    # ---- assest2 / New folder 2 : free monster & boss sprite packs ----
    "mino_v1.1_free": dict(author="LuizMelo (itch.io)", license="Free for commercial use", category="boss/enemy",
        desc="Minotaur boss. Per-action horizontal spritesheets + split frame folders (idle/walk/atk) + GIF previews + healthbar UI."),
    "boss_demon_slime_free_v1.0": dict(author="LuizMelo (itch.io)", license="Free for commercial use", category="boss",
        desc="Demon Slime boss. Per-action spritesheets, individual frame folders (idle/walk/cleave/take_hit/death), aseprite sources, GIFs."),
    "monster pack (free)": dict(author="itch.io free pack", license="Free", category="enemy",
        desc="Small critters (rabbit / horned rabbit variants) provided as animation spritesheets."),
    "craftpix-064112-free-orc-ogre-and-goblin-chibi-2d-game-sprites": dict(author="CraftPix.net", license="CraftPix free license (credit, no resale)", category="enemy",
        desc="Chibi Orc / Ogre / Goblin. PNG full-anim spritesheets + PNG Sequences (frame-by-frame) + EPS/AI vector + Unity packages."),
    "frost_guardian_free_v1.0": dict(author="LuizMelo (itch.io)", license="Free for commercial use", category="boss",
        desc="Frost Guardian boss. Per-action PNG frame folders (idle/atk/walk/death/take_hit) + GIF samples."),
    # ---- assest4 / New folder 4 craftpix tilesets ----
    "map_objects": dict(author="CraftPix.net (Free Fields tileset)", license="CraftPix free license", category="environment/props",
        desc="Top-down field map objects: grass, fence, stone, decor, flowers, bushes, camp, shadows, pointers + animated flag & campfire."),
    "next2": dict(author="CraftPix.net (Free Village tileset)", license="CraftPix free license", category="environment/props",
        desc="Top-down village objects: stone, box, decor, tent, house, grass, shadows."),
    "craftpix-net-305231-free-tower-defense-2d-vector-tileset": dict(author="CraftPix.net", license="CraftPix free license", category="environment/tileset",
        desc="Tower-defense vector tileset: 4 game backgrounds + tile TAILS (PNG + Tiled TMX/TSX maps)."),
    "craftpix-net-665131-free-fields-tileset-pixel-art-for-tower-defense": dict(author="CraftPix.net", license="CraftPix free license", category="environment/tileset",
        desc="Pixel-art fields tileset (tower defense): ground tiles + objects + animated objects + PSD sources."),
    "craftpix-net-734372-free-poison-swamp-game-tileset-and-environment-pack": dict(author="CraftPix.net", license="CraftPix free license", category="environment/tileset",
        desc="Poison-swamp tileset & environment pack (PNG + EPS/AI vector sources)."),
    "craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense": dict(author="CraftPix.net", license="CraftPix free license", category="environment/tileset",
        desc="Top-down village pixel tileset: tiles, objects, animated objects + PSD sources."),
    "attacks": dict(author="itch.io / CraftPix-style pack", license="See license.txt", category="vfx/projectile",
        desc="Spell/projectile FX: Fire & Water Arrow/Ball/Spell animations + skill icons (PNG + EPS)."),
    # ---- assets3 : curated VFX / monsters / food (cropped from New folder 3) ----
    "vfx": dict(author="various (itch.io VFX packs)", license="Free", category="vfx",
        desc="Curated skill/spell VFX strips: fireball, frost, lightning, smoke, green, yellow."),
    "monsters": dict(author="LuizMelo 'Monsters Creatures Fantasy'", license="Free for commercial use", category="enemy",
        desc="Bat / slime / mimic / rat. Per-action horizontal spritesheet strips (idle/run/attack/hurt/death)."),
    "food": dict(author="the_steam_gamer (Fiverr)", license="Free", category="item/icon",
        desc="Food item sprites used as pickups / consumable icons."),
    # ---- assets5 packs (documented in assets5/SOURCES.md) ----
    "ninja_adventure_pack": dict(author="Pixel-Boy & AAA", license="CC0", category="mega-pack",
        desc="Ninja Adventure: 95 NPC chars (4-dir walk), 66 monsters, 20 bosses, 27 animals, 140 items, multiple tilesets, FX, UI, music & SFX."),
    "dungeon_crawl_32x32_cc0": dict(author="Dungeon Crawl Stone Soup team", license="CC0", category="mega-pack/tiles",
        desc="~6000 individual 32px PNGs: statues, altars, floors (lava/ice/desert), demons, undead, gems, bones, items, effects."),
    "0x72_dungeon_tileset_ii": dict(author="0x72", license="CC0", category="tileset/characters",
        desc="16px dungeon tileset II: walls/floors, animated wall fountains, spikes, chests, small heroes & monsters."),
    "cainos_pixel_art_top_down": dict(author="Cainos", license="CC0", category="tileset/props",
        desc="Clean 32px top-down grass/stone tiles, ruin pillars & walls, props, wood structures."),
    "shikashi_fantasy_icons": dict(author="Shikashi", license="Free commercial (credit appreciated; some CC-BY 3.0 game-icons.net)", category="ui/icons",
        desc="245 32px item/skill icons: potions, gems, weapons, status effects."),
    "kenney_fantasy-ui-borders": dict(author="Kenney", license="CC0", category="ui",
        desc="282 PNG panel/dialog/button borders (gold, stone, wood themes)."),
    "kenney_roguelike-rpg-pack": dict(author="Kenney", license="CC0", category="tileset",
        desc="1700+ tile spritesheet (16px grid): snow & desert terrain, interiors, props."),
    "kenney_roguelike-characters": dict(author="Kenney", license="CC0", category="characters",
        desc="450 16px character variation spritesheet (NPC variety)."),
    "mystic_woods": dict(author="Game Endeavor", license="NON-COMMERCIAL ONLY (free version)", category="tileset/characters",
        desc="Painterly 16px forest/village tiles, animated player & slime. Style reference / non-commercial only."),
    # ---- assets6 : free boss / animal sprite packs ----
    "enemy": dict(author="itch.io free packs", license="See license.txt", category="enemy/boss",
        desc="Skeleton, Plent (plant), Fire Spirit enemies with PSD sources + PNG animations."),
    "enemy 2": dict(author="itch.io free packs", license="See license.txt", category="boss",
        desc="Faction leader bosses: Maya / Nordic / Aztec leaders (PNG animations)."),
    "enemy 3": dict(author="CraftPix-style", license="See license.txt", category="boss",
        desc="Seer enemies (Seer_1/2/3) with PNG animations + TXT info."),
    "enemy 4": dict(author="itch.io free packs", license="See license.txt", category="boss",
        desc="Viking Leader, Caveman Boss, Giant Goblin (PNG animations)."),
    "animal": dict(author="itch.io free pack", license="See license.txt", category="creature",
        desc="Animal sprites — PNG anims + PSD/Aseprite/Tiled sources."),
    "animal 2": dict(author="itch.io free pack", license="See license.txt", category="creature",
        desc="Second animal set — PNG anims + PSD/Aseprite/Tiled sources."),
    "slime": dict(author="itch.io free pack", license="See license.txt", category="enemy",
        desc="Slime enemy — PNG anims + PSD/Aseprite/Tiled sources."),
    "minotaur": dict(author="itch.io free pack", license="See license.txt", category="boss",
        desc="Minotaur boss variants (Minotaur_1/2/3) with PSD + PNG animations."),
    # ---- assets_custom : procedurally generated by repo gen_*.py scripts ----
    "props": dict(author="this project (gen_props*.py)", license="project-owned", category="props",
        desc="Custom-generated region prop sprites."),
    "rocks_void": dict(author="this project (gen_*.py)", license="project-owned", category="props",
        desc="Custom void-biome rock sprites."),
    "rocks_basalt": dict(author="this project (gen_*.py)", license="project-owned", category="props",
        desc="Custom basalt rock sprites."),
    "rocks_sand": dict(author="this project (gen_*.py)", license="project-owned", category="props",
        desc="Custom sandstone/desert rock sprites."),
    "structures": dict(author="this project (gen_*.py)", license="project-owned", category="props",
        desc="Custom structure / building sprites."),
    "anim": dict(author="this project (gen_*.py)", license="project-owned", category="vfx",
        desc="Custom animated effect frames."),
    # ---- atomic packs ----
    "the pack": dict(author="pixel_ankousse (instagram)", license="Free & commercial, credit appreciated", category="enemy",
        desc="Monsters: Slime, Slime2, King Slime, Orc, Orc2, Tree. Each split into numbered frame folders (Idle/Run/Attack/Dead)."),
    "tiny swords (free pack)": dict(author="Pixel Frog (itch.io)", license="CC0 / free", category="mega-pack",
        desc="Tiny Swords: colored unit factions (warrior/archer/pawn/monk/lancer), buildings, terrain tileset, decorations, resources, particle FX, UI."),
    "craftpix-net-168228-free-tree-pixel-art-asset-pack": dict(author="CraftPix.net", license="CraftPix free license", category="environment/props",
        desc="Free pixel-art tree pack (multiple tree types & sizes)."),
    "map": dict(author="this project", license="project-owned", category="map",
        desc="Pre-rendered region background image used by the game scenes."),
    # ---- New folder 1 extras ----
    "tiny rpg character asset pack v1.03 -free soldier&orc": dict(author="LurkerGames (itch.io)", license="Free", category="characters",
        desc="100x100 Soldier & Orc characters with full anim sets, shadows, split-effects, arrow projectiles + Aseprite sources."),
    "monsters creatures fantasy 2": dict(author="LuizMelo (itch.io)", license="Free for commercial use", category="enemy",
        desc="Rat / Bat / Mimic / Slime — per-action horizontal spritesheet strips."),
    "food assets": dict(author="the_steam_gamer (Fiverr)", license="Free", category="item/icon",
        desc="Food items: GIF + PNG + spritesheets + 32x32 'pizza eaten' frames."),
    # ---- New folder 3 VFX skill-effect packs (source of assets3/vfx) ----
    "blue lightning": dict(author="itch.io VFX pack", license="Free", category="vfx",
        desc="Blue lightning skill VFX (multiple variants VFX1-6) as spritesheets + frame folders."),
    "frost skill": dict(author="itch.io VFX pack", license="Free", category="vfx",
        desc="Frost/ice skill VFX (VFX1-3) as spritesheets + frame folders."),
    "green attack": dict(author="itch.io VFX pack", license="Free", category="vfx",
        desc="Green attack skill VFX (VFX1-5) as spritesheets + frame folders."),
    "red fireball attack": dict(author="itch.io VFX pack", license="Free", category="vfx",
        desc="Red fireball skill VFX (VFX1-3) as spritesheets + frame folders."),
    "white smoke": dict(author="itch.io VFX pack", license="Free", category="vfx",
        desc="White smoke / dust skill VFX (VFX1-4) as spritesheets + frame folders."),
    "yellow power": dict(author="itch.io VFX pack", license="Free", category="vfx",
        desc="Yellow power/holy skill VFX (VFX1-3) as spritesheets + frame folders."),
    "cropped": dict(author="this project", license="project-owned", category="misc",
        desc="Manually cropped sprites pulled out of source packs for in-game use."),
}


def is_skipped(path):
    parts = set(path.split(os.sep))
    return bool(parts & SKIP_DIR_PARTS)


def numeric_key(stem):
    """Return (base, number) if stem ends in digits, else (stem, None)."""
    m = re.match(r"^(.*?)[ _\-]?(\d+)$", stem)
    if m:
        return m.group(1), int(m.group(2))
    return stem, None


def classify_single(w, h):
    """Guess if a lone image is an animation strip/grid. Returns (kind, frames, frame_size)."""
    if w == h:
        return "image", 1, [w, h]
    big, small = (w, h) if w > h else (h, w)
    if small > 0 and big % small == 0 and big // small >= 2:
        n = big // small
        return "spritesheet", n, [small, small]
    return "image", 1, [w, h]


def scan_dir_images(dirpath):
    """Return list of (filename, width, height, mode, bytes) for images directly in dirpath."""
    out = []
    try:
        names = sorted(os.listdir(dirpath))
    except OSError:
        return out
    for n in names:
        p = os.path.join(dirpath, n)
        if not os.path.isfile(p):
            continue
        if os.path.splitext(n)[1].lower() in IMG_EXT:
            try:
                with Image.open(p) as im:
                    out.append((n, im.width, im.height, im.mode, os.path.getsize(p)))
            except Exception:
                out.append((n, None, None, None, os.path.getsize(p)))
    return out


def build_groups_for_dir(dirpath, rel_to):
    """Within a single directory, produce asset entries (collapsing numbered frame sequences)."""
    imgs = scan_dir_images(dirpath)
    groups = []
    if not imgs:
        return groups

    # bucket by (base) for numbered sequences
    buckets = defaultdict(list)
    for (n, w, h, mode, sz) in imgs:
        stem = os.path.splitext(n)[0]
        base, num = numeric_key(stem)
        buckets[base if num is not None else f"__single__::{n}"].append((n, w, h, mode, sz, num))

    reldir = os.path.relpath(dirpath, rel_to)
    for base, items in buckets.items():
        seq = [it for it in items if it[5] is not None]
        if len(seq) >= 2 and not base.startswith("__single__"):
            # frame-sequence animation
            seq.sort(key=lambda it: it[5])
            dims = [(it[1], it[2]) for it in seq if it[1]]
            fw, fh = (dims[0] if dims else (None, None))
            uniform = len(set(dims)) <= 1
            groups.append({
                "kind": "animation_frames",
                "name": base.strip(" _-") or os.path.basename(dirpath),
                "dir": reldir,
                "frame_count": len(seq),
                "frame_size": [fw, fh],
                "uniform_frames": uniform,
                "example": seq[0][0],
            })
        else:
            for (n, w, h, mode, sz, _num) in items:
                if w is None:
                    groups.append({"kind": "unreadable", "path": os.path.join(reldir, n)})
                    continue
                kind, frames, fsize = classify_single(w, h)
                low = (reldir + "/" + n).lower()
                if kind == "image" and ("tile" in low) and w >= 128 and h >= 128:
                    kind = "tileset"
                entry = {"kind": kind, "path": os.path.join(reldir, n),
                         "size": [w, h], "mode": mode, "bytes": sz}
                if kind == "spritesheet":
                    entry["frames_guess"] = frames
                    entry["frame_size_guess"] = fsize
                groups.append(entry)
    return groups


def pack_meta(name):
    info = PACK_INFO.get(name.lower())
    if info:
        return {"author": info["author"], "license": info["license"],
                "category": info["category"], "description": info["desc"]}
    return {"author": None, "license": None, "category": None, "description": None}


def build_pack(pack_path, pack_root_for_rel, location):
    name = os.path.basename(pack_path.rstrip("/"))
    asset_groups = []
    aux = defaultdict(int)
    audio_files = []
    for cur, dirs, files in os.walk(pack_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIR_PARTS]
        if is_skipped(cur):
            continue
        asset_groups.extend(build_groups_for_dir(cur, pack_root_for_rel))
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in IMG_EXT:
                continue
            cat = AUX_EXT.get(ext)
            if cat:
                aux[cat] += 1
                if cat == "audio":
                    audio_files.append(os.path.relpath(os.path.join(cur, f), pack_root_for_rel))

    # counts
    counts = defaultdict(int)
    total_frames = 0
    for g in asset_groups:
        counts[g["kind"]] += 1
        if g["kind"] == "animation_frames":
            total_frames += g.get("frame_count", 0)
    meta = pack_meta(name)
    return {
        "id": name,
        "location": location,
        "path": os.path.relpath(pack_path, PROJECT if location == "project" else EXTERNAL),
        **meta,
        "counts": {
            "single_images": counts.get("image", 0),
            "spritesheets": counts.get("spritesheet", 0),
            "frame_animations": counts.get("animation_frames", 0),
            "frame_animation_total_frames": total_frames,
            "tilesets": counts.get("tileset", 0),
            "unreadable": counts.get("unreadable", 0),
            "aux_files": dict(aux),
        },
        "audio_files": sorted(audio_files) if audio_files else [],
        "assets": asset_groups,
    }


def main():
    packs = []
    for (root, location, is_collection) in ROOTS:
        if not os.path.isdir(root):
            continue
        rel_base = PROJECT if location == "project" else EXTERNAL
        if is_collection:
            for child in sorted(os.listdir(root)):
                cp = os.path.join(root, child)
                if os.path.isdir(cp) and child not in SKIP_DIR_PARTS:
                    pk = build_pack(cp, rel_base, location)
                    pk["collection"] = os.path.basename(root)
                    packs.append(pk)
        else:
            packs.append(build_pack(root, rel_base, location))

    # totals
    tot = defaultdict(int)
    for p in packs:
        c = p["counts"]
        tot["single_images"] += c["single_images"]
        tot["spritesheets"] += c["spritesheets"]
        tot["frame_animations"] += c["frame_animations"]
        tot["tilesets"] += c["tilesets"]
        tot["packs"] += 1

    doc = {
        "meta": {
            "generated": datetime.date.today().isoformat(),
            "generator": "tools/catalog_assets.py",
            "project_root": PROJECT,
            "external_library_root": EXTERNAL,
            "classification_legend": {
                "image": "single still sprite / texture",
                "spritesheet": "one PNG that is an animation strip or grid; frames_guess = long_side / short_side",
                "animation_frames": "a folder of numbered frames collapsed into one entry (frame_count, frame_size)",
                "tileset": "large image inside a tiles/tileset folder",
                "unreadable": "file present but PIL could not decode dimensions",
            },
            "notes": [
                "External 'New folder', 'New folder 2', 'New folder 3' are the upstream copies of the project's THE PACK/Tiny Swords, assest2, and assets3 packs respectively.",
                "assest4 'map_objects'/'next2' are subsets of the craftpix Fields/Village tilesets in external 'New folder 4'.",
                "Spritesheet frame counts are heuristic guesses from aspect ratio; verify against the pack's own grid before slicing.",
                "Engine note (from assets5/SOURCES.md): warrior visible body ~100px, so 16px-grid packs need 4-6x and 32px packs 2-3x nearest-neighbour upscaling.",
            ],
            "totals": dict(tot),
        },
        "packs": packs,
    }

    out = os.path.join(PROJECT, "docs", "assets.json")
    with open(out, "w") as f:
        json.dump(doc, f, indent=2)

    md_out = os.path.join(PROJECT, "docs", "ASSETS.md")
    with open(md_out, "w") as f:
        f.write(render_markdown(doc))

    print(f"wrote {out}")
    print(f"wrote {md_out}")
    print(f"packs={tot['packs']} singles={tot['single_images']} sheets={tot['spritesheets']} "
          f"frame_anims={tot['frame_animations']} tilesets={tot['tilesets']}")


def render_markdown(doc):
    """Render a human-readable summary of the catalog from the JSON document."""
    meta = doc["meta"]
    t = meta["totals"]
    packs = doc["packs"]
    L = []
    L.append("# Asset Catalog")
    L.append("")
    L.append(f"_Generated {meta['generated']} by `{meta['generator']}` — "
             f"summary view of [`assets.json`](assets.json). Regenerate both with "
             f"`python3 tools/catalog_assets.py`._")
    L.append("")
    L.append("## Totals")
    L.append("")
    L.append("| Metric | Count |")
    L.append("|---|--:|")
    L.append(f"| Packs | {t['packs']} |")
    L.append(f"| Single images | {t['single_images']} |")
    L.append(f"| Spritesheet strips/grids | {t['spritesheets']} |")
    L.append(f"| Frame-sequence animations | {t['frame_animations']} |")
    L.append(f"| Tilesets | {t['tilesets']} |")
    L.append("")
    L.append("## How assets are classified")
    L.append("")
    for k, v in meta["classification_legend"].items():
        L.append(f"- **`{k}`** — {v}")
    L.append("")
    L.append("## Notes")
    L.append("")
    for n in meta["notes"]:
        L.append(f"- {n}")
    L.append("")

    # group packs by (location, collection)
    groups = defaultdict(list)
    for p in packs:
        groups[(p["location"], p.get("collection", "(standalone)"))].append(p)

    def fmt_aux(aux):
        if not aux:
            return ""
        return ", ".join(f"{v} {k.replace('_', ' ')}" for k, v in sorted(aux.items()))

    L.append("## Packs")
    L.append("")
    # project collections first, then external
    order = sorted(groups, key=lambda k: (k[0] != "project", k[1]))
    for (location, collection) in order:
        ps = sorted(groups[(location, collection)], key=lambda p: p["id"].lower())
        header = collection if collection != "(standalone)" else "standalone packs"
        L.append(f"### `{header}` — {location}")
        L.append("")
        L.append("| Pack | Category | Images | Sheets | Frame-anims (frames) | Tilesets | Author | License |")
        L.append("|---|---|--:|--:|--:|--:|---|---|")
        for p in ps:
            c = p["counts"]
            fa = c["frame_animations"]
            faf = c["frame_animation_total_frames"]
            fa_cell = f"{fa} ({faf})" if fa else "0"
            L.append("| {id} | {cat} | {img} | {sh} | {fa} | {ts} | {auth} | {lic} |".format(
                id=p["id"], cat=p["category"] or "—",
                img=c["single_images"], sh=c["spritesheets"], fa=fa_cell, ts=c["tilesets"],
                auth=(p["author"] or "—"), lic=(p["license"] or "—")))
        L.append("")
        # descriptions + aux/audio detail
        for p in ps:
            c = p["counts"]
            bits = []
            aux = fmt_aux(c.get("aux_files"))
            if aux:
                bits.append(f"aux: {aux}")
            if p.get("audio_files"):
                bits.append(f"{len(p['audio_files'])} audio files")
            detail = f" _({'; '.join(bits)})_" if bits else ""
            L.append(f"- **{p['id']}** — {p['description'] or '_no description_'}{detail}")
        L.append("")
    return "\n".join(L)


if __name__ == "__main__":
    main()
