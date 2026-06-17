#!/usr/bin/env python3
"""
scan_animations.py — build docs/animations_draft.json (the review queue)

Reads docs/assets.json (produced by tools/catalog_assets.py) and turns every
animation candidate into a reviewable draft entry with GUESSED metadata:

  - entity_key / entity_type   (from the pack id + category)
  - name                       (canonical animation name from the folder/file)
  - purpose_guess              (human-readable "what is this animation for")
  - framerate / loop           (sensible defaults)
  - status: "pending"          (you approve/remark in animation_reviewer.html)

Two animation sources are emitted:
  - source="frame_folder"  : a directory of numbered PNG frames (kind=animation_frames)
  - source="spritesheet"   : one PNG strip/grid          (kind=spritesheet)

INCREMENTAL / DIFF-MERGE
  Existing docs/animations_draft.json is loaded first. Any entry whose stable
  `id` already exists keeps its human decisions (status + remark + overridden
  name/entity_key/framerate/loop). If the underlying art changed (frame count or
  size — tracked via `fingerprint`), the entry is reset to status="pending" with
  a note so you re-review it. Brand-new candidates are added as "pending".
  Entries whose source asset has disappeared are dropped.

Run:  python3 tools/scan_animations.py
Out:  docs/animations_draft.json
"""
import os
import re
import json
import datetime

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_JSON = os.path.join(PROJECT, "docs", "assets.json")
DRAFT_JSON = os.path.join(PROJECT, "docs", "animations_draft.json")

# Per-animation fields a human may override in the reviewer; preserved across re-scans.
USER_FIELDS = ("status", "remark", "name", "framerate", "loop")
# Per-pack fields a human may override; preserved by pack_id across re-scans.
PACK_USER_FIELDS = ("entity_key", "entity_type")

# ── Canonical animation-name mapping ─────────────────────────────────────────
# Lower-cased raw folder/file name (after stripping leading index like "1_") is
# matched against these substrings, first hit wins. Order matters.
NAME_RULES = [
    (("idle", "idel", "idl"),                         "idle"),
    (("walk", "move", "moving"),                      "walk"),
    (("run", "running", "dash"),                      "run"),
    (("attack", "atk", "attact", "cleave", "slash",
      "swing", "melee", "punch"),                     "attack"),
    (("shoot", "throw", "cast", "spell", "magic",
      "ranged", "bow"),                               "cast"),
    (("death", "dead", "die", "dying"),               "death"),
    (("hurt", "hit", "take_hit", "takehit", "damage",
      "wound"),                                       "hurt"),
    (("jump", "leap"),                                "jump"),
    (("special", "skill", "ability"),                 "special"),
    (("spawn", "appear", "intro", "summon"),          "spawn"),
]

PURPOSE = {
    "idle":    "Standing / breathing loop when not acting",
    "walk":    "Walking movement loop",
    "run":     "Running / charging movement loop",
    "attack":  "Attack action — plays once per swing",
    "cast":    "Ranged / spell-cast action — plays once",
    "death":   "Death sequence — plays once",
    "hurt":    "Reaction to taking damage — plays once",
    "jump":    "Jump / leap action — plays once",
    "special": "Special move / skill — plays once",
    "spawn":   "Spawn / intro appearance — plays once",
}
LOOPING = {"idle", "walk", "run"}          # everything else plays once
FAST = {"attack", "cast"}                  # 10 fps; default is 8


def canonical_name(raw):
    """Map a raw folder/file name to a canonical animation name."""
    s = raw.lower()
    s = re.sub(r"\.png$", "", s)
    # strip a leading index prefix like "1_atk", "01-idle"
    s = re.sub(r"^\d+[\s_\-]+", "", s)
    for needles, canon in NAME_RULES:
        for n in needles:
            if n in s:
                return canon
    # no rule matched → keep a cleaned slug as-is
    slug = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return slug or "anim"


NOISE_TOKENS = {"free", "pack", "sprite", "sprites", "spritesheet",
                "png", "file", "files", "v1", "v2", "v3", "2d", "game"}


def slug_entity_key(pack_id):
    """Frost_Guardian_FREE_v1.0 → frost_guardian."""
    s = pack_id.lower()
    s = re.sub(r"_v\d+(\.\d+)*", "", s)              # drop version suffix like _v1.0
    tokens = [t for t in re.split(r"[^a-z0-9]+", s) if t]
    tokens = [t for t in tokens if t not in NOISE_TOKENS and not re.fullmatch(r"v\d+", t)]
    return "_".join(tokens) or "entity"


def entity_type_from_category(category):
    c = (category or "").lower()
    if "boss" in c:
        return "boss"
    if "enemy" in c or "creature" in c:
        return "enemy"
    if "npc" in c or "character" in c:
        return "npc"
    if "vfx" in c or "projectile" in c:
        return "vfx"
    if "tileset" in c or "environment" in c or "props" in c or "map" in c:
        return "prop"
    return "misc"


def defaults_for(name):
    return (10 if name in FAST else 8), (name in LOOPING)


def make_entry(pack, asset):
    """Return a draft animation entry dict, or None if not an animation."""
    kind = asset.get("kind")
    if kind == "animation_frames":
        raw = asset.get("name", os.path.basename(asset.get("dir", "")))
        name = canonical_name(raw)
        fr, loop = defaults_for(name)
        fc = asset.get("frame_count", 0)
        fs = asset.get("frame_size") or [0, 0]
        return {
            "id": "frames::" + asset["dir"],          # stable across re-scans
            "source": "frame_folder",
            "raw_name": raw,
            "name": name,
            "dir": asset["dir"],
            "frame_count": fc,
            "frame_size": fs,
            "example": asset.get("example", ""),
            "framerate": fr,
            "loop": loop,
            "purpose_guess": PURPOSE.get(name, "Unknown — please label what this is for"),
            "fingerprint": f"{fc}:{fs[0]}x{fs[1]}",
        }
    if kind == "spritesheet":
        raw = os.path.splitext(os.path.basename(asset["path"]))[0]
        name = canonical_name(raw)
        fr, loop = defaults_for(name)
        fc = asset.get("frames_guess", 0)
        fsz = asset.get("frame_size_guess") or [0, 0]
        size = asset.get("size") or [0, 0]
        horizontal = size[0] >= size[1]
        return {
            "id": "sheet::" + asset["path"],
            "source": "spritesheet",
            "raw_name": raw,
            "name": name,
            "spritesheet": asset["path"],
            "sheet_size": size,
            "frame_count": fc,
            "frame_size": fsz,
            "horizontal": horizontal,
            "framerate": fr,
            "loop": loop,
            "purpose_guess": PURPOSE.get(name, "Unknown — single strip, please label what this is for"),
            "fingerprint": f"{fc}:{fsz[0]}x{fsz[1]}",
        }
    return None


def main():
    with open(ASSETS_JSON) as f:
        catalog = json.load(f)

    # Load prior draft → maps to preserve human decisions (per-animation by id,
    # per-pack by pack_id).
    prior = {}
    prior_packs = {}
    if os.path.exists(DRAFT_JSON):
        try:
            with open(DRAFT_JSON) as f:
                old = json.load(f)
            for p in old.get("packs", []):
                if p.get("pack_id"):
                    prior_packs[p["pack_id"]] = p
                for a in p.get("animations", []):
                    if "id" in a:
                        prior[a["id"]] = a
        except (json.JSONDecodeError, OSError):
            pass

    packs_out = []
    stats = {"packs": 0, "new": 0, "kept": 0, "changed": 0, "total": 0}

    for pack in catalog.get("packs", []):
        anims = []
        for asset in pack.get("assets", []):
            entry = make_entry(pack, asset)
            if not entry:
                continue
            # skip "spritesheets" that are really a single still (no real frames)
            if entry["frame_count"] < 2:
                continue

            old = prior.get(entry["id"])
            if old is None:
                entry["status"] = "pending"
                entry["remark"] = ""
                stats["new"] += 1
            else:
                # Preserve human decisions.
                for k in USER_FIELDS:
                    if k in old:
                        entry[k] = old[k]
                entry.setdefault("status", "pending")
                entry.setdefault("remark", "")
                # Art changed under an approved/needs-fix entry → force re-review.
                # Rejected entries stay rejected (the user explicitly dropped them).
                if (old.get("fingerprint") != entry["fingerprint"]
                        and entry["status"] in ("approved", "needs_fix")):
                    entry["status"] = "pending"
                    note = f"[auto] art changed ({old.get('fingerprint')} → {entry['fingerprint']}), re-review"
                    entry["remark"] = (entry.get("remark", "") + " " + note).strip()
                    stats["changed"] += 1
                else:
                    stats["kept"] += 1
            anims.append(entry)

        if not anims:
            continue
        stats["packs"] += 1
        stats["total"] += len(anims)
        pack_out = {
            "pack_id": pack.get("id"),
            "pack_path": pack.get("path"),
            "category": pack.get("category"),
            "author": pack.get("author"),
            "license": pack.get("license"),
            "entity_type": entity_type_from_category(pack.get("category")),
            "entity_key": slug_entity_key(pack.get("id", "")),
            "animations": anims,
        }
        # Preserve human-overridden pack-level fields.
        old_pack = prior_packs.get(pack.get("id"))
        if old_pack:
            for k in PACK_USER_FIELDS:
                if k in old_pack:
                    pack_out[k] = old_pack[k]
        packs_out.append(pack_out)

    out = {
        "version": 1,
        "generated": datetime.date.today().isoformat(),
        "generator": "tools/scan_animations.py",
        "source_catalog": "docs/assets.json",
        "legend": {
            "status": "pending | approved | needs_fix — set in animation_reviewer.html",
            "source": "frame_folder (numbered PNGs) | spritesheet (one strip/grid)",
            "remark": "human note; 'needs_fix' entries go back to the asset-making phase",
        },
        "stats": stats,
        "packs": packs_out,
    }
    os.makedirs(os.path.dirname(DRAFT_JSON), exist_ok=True)
    with open(DRAFT_JSON, "w") as f:
        json.dump(out, f, indent=2)

    print(f"Wrote {DRAFT_JSON}")
    print(f"  packs with animations : {stats['packs']}")
    print(f"  animation candidates  : {stats['total']}")
    print(f"  new                   : {stats['new']}")
    print(f"  kept (decision held)  : {stats['kept']}")
    print(f"  art-changed (re-review): {stats['changed']}")


if __name__ == "__main__":
    main()
