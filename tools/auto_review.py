#!/usr/bin/env python3
"""
auto_review.py — first-pass triage of docs/animations_draft.json

Two opinionated passes, so a human only reviews the genuinely-ambiguous ones:

  1. DEDUPE — the external library ships some packs twice (e.g.
     assest2/Frost_Guardian and "New folder 2"/Frost_Guardian). Animations with
     the same (entity_key, name, source, frame_count, frame_size) are duplicates;
     one canonical copy is kept (project paths preferred over external "New
     folder*"; shorter path wins) and the rest are set to status="rejected".

  2. AUTO-APPROVE — an animation is confidently a real gameplay animation when it
     is a frame_folder, belongs to an animated entity (boss/enemy/npc), has a
     recognised action name (idle/walk/run/attack/death/hurt/cast/jump/…), and has
     ≥2 frames. Those are set to status="approved", auto=true. Everything else is
     LEFT pending — that pending list is exactly what the human reviews by hand
     (spritesheets, unknown/slug names, props/ui/vfx/icons, etc.).

Only entries currently `pending` are auto-approved; existing human decisions
(approved / needs_fix / rejected) are never overridden. Dedupe only rejects
duplicates that are themselves pending or auto-approved — never a manual decision.

Run AFTER tools/scan_animations.py:
  python3 tools/scan_animations.py
  python3 tools/auto_review.py
"""
import os
import json
from collections import defaultdict

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRAFT_JSON = os.path.join(PROJECT, "docs", "animations_draft.json")

ANIMATED_TYPES = {"boss", "enemy", "npc"}
CONFIDENT_NAMES = {"idle", "walk", "run", "attack", "death", "hurt",
                   "cast", "jump", "special", "spawn"}


def within_pack(pack, a):
    """Path of this animation relative to its pack root (stable across copies)."""
    loc = a.get("dir") or a.get("spritesheet") or ""
    root = pack.get("pack_path", "")
    return loc[len(root):] if loc.startswith(root) else loc


def pack_signature(pack):
    """Content fingerprint of a whole pack — identical for true duplicate packs."""
    return frozenset(
        (within_pack(pack, a), a.get("name"), a.get("fingerprint"))
        for a in pack.get("animations", [])
    )


def pack_rank(pack):
    """Lower is better when picking which copy of a duplicate pack to keep."""
    path = pack.get("pack_path", "")
    return (1 if path.startswith("New folder") else 0, len(path), path)


def main():
    with open(DRAFT_JSON) as f:
        draft = json.load(f)

    # Flatten with back-references so we can mutate in place.
    items = []  # (pack, anim)
    for pack in draft.get("packs", []):
        for a in pack.get("animations", []):
            items.append((pack, a))

    # ── Pass 1: dedupe whole duplicate PACKS ────────────────────────────────
    # The external library ships some packs at two paths. Group packs by folder
    # name, then by identical content signature; keep one copy, reject the rest.
    # Operating at pack level avoids collapsing distinct characters that share a
    # pack-level entity_key (e.g. a 548-animation mega-pack).
    deduped = 0
    by_base = defaultdict(list)
    for pack in draft.get("packs", []):
        by_base[os.path.basename(pack.get("pack_path", ""))].append(pack)

    for base, group in by_base.items():
        if len(group) < 2:
            continue
        sig_groups = defaultdict(list)
        for pack in group:
            sig_groups[pack_signature(pack)].append(pack)
        for sig, dups in sig_groups.items():
            if len(dups) < 2:
                continue  # same name but different content → not a duplicate
            dups.sort(key=pack_rank)
            keep = dups[0]
            for pack in dups[1:]:
                for a in pack.get("animations", []):
                    # never override a human decision; skip already-rejected
                    if a.get("status") in ("approved", "needs_fix") and not a.get("auto"):
                        continue
                    if a.get("status") == "rejected":
                        continue
                    a["status"] = "rejected"
                    note = f"[auto] duplicate pack of {keep.get('pack_path')}"
                    a["remark"] = ((a.get("remark", "") + " " + note).strip())
                    a["auto"] = True
                    a["auto_reason"] = "duplicate"
                    deduped += 1

    # ── Pass 2: auto-approve confident, leave the rest pending ──────────────
    # Count how often each canonical name occurs per ENTITY (the per-animation
    # entity_key, which already splits multi-character packs). A name that still
    # repeats under one entity_key means we couldn't cleanly separate it — those
    # would collide as duplicate entity_key+name on export, so they are NOT
    # auto-approved; the human splits/relabels them in the reviewer.
    name_counts = defaultdict(lambda: defaultdict(int))  # entity_key -> {name: count}
    for pack, a in items:
        if a.get("status") != "rejected" and a.get("source") == "frame_folder":
            name_counts[a.get("entity_key")][a.get("name")] += 1

    approved = 0
    pending_left = 0
    for pack, a in items:
        if a.get("status") != "pending":
            continue
        unique = name_counts[a.get("entity_key")].get(a.get("name"), 0) == 1
        confident = (
            a.get("source") == "frame_folder"
            and pack.get("entity_type") in ANIMATED_TYPES
            and a.get("name") in CONFIDENT_NAMES
            and (a.get("frame_count") or 0) >= 2
            and unique
        )
        if confident:
            a["status"] = "approved"
            a["auto"] = True
            a["auto_reason"] = f"frame_folder '{a['name']}' for {a.get('entity_key')} ({pack['entity_type']})"
            approved += 1
        else:
            pending_left += 1

    # ── Guard: no duplicate (entity_key, name) among approved entries ───────
    # Belt-and-suspenders: if any approved pair still collides, demote the later
    # one back to pending so the export is guaranteed collision-free.
    seen = set()
    collisions = 0
    for pack in draft.get("packs", []):
        for a in pack.get("animations", []):
            if a.get("status") != "approved":
                continue
            ek = (a.get("entity_key"), a.get("name"))
            if ek in seen:
                a["status"] = "pending"
                a["auto"] = False
                note = f"[auto] entity_key collision on '{ek[0]}/{ek[1]}' — assign a unique key"
                a["remark"] = ((a.get("remark", "") + " " + note).strip())
                collisions += 1
            else:
                seen.add(ek)

    with open(DRAFT_JSON, "w") as f:
        json.dump(draft, f, indent=2)

    # Recount for the summary.
    counts = {"approved": 0, "pending": 0, "needs_fix": 0, "rejected": 0}
    for _pack, a in items:
        counts[a.get("status", "pending")] = counts.get(a.get("status", "pending"), 0) + 1

    print(f"Auto-review complete → {DRAFT_JSON}")
    print(f"  duplicate-pack anims rejected : {deduped}")
    print(f"  auto-approved (confident)     : {approved}")
    print(f"  collisions demoted to pending : {collisions}")
    print(f"  left pending (MANUAL)         : {pending_left + collisions}")
    print("  --- resulting totals ---")
    for k in ("approved", "pending", "needs_fix", "rejected"):
        print(f"  {k:9}: {counts[k]}")


if __name__ == "__main__":
    main()
