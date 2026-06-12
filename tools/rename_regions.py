#!/usr/bin/env python3
"""Rename regions to nickname-primary + Sanskrit subtitle.

For each regions/region_*.json:
  - regionName     -> short English nickname (approved list, keyed by regionIndex)
  - regionSubtitle -> the Sanskrit name (derived from the existing regionName so
                      diacritics stay exact; overridden for special cases)
Edits are surgical: the regionName line is replaced in place and a regionSubtitle
line is inserted right after it. Files lacking a regionName get both fields added
near the top. ASCII (\\u) escaping is kept to match the existing file style.
"""
import glob
import json
import os
import re

# regionIndex -> nickname
NICK = {
    0: "Ash Village", 7: "Memory Grove", 8: "Serpent Court", 9: "Stone Vale",
    10: "Sunless Deep", 11: "Broken Bridge", 12: "Withered Fields",
    13: "Hunter's Thicket", 14: "Stone Gate", 15: "Sunken Road",
    16: "Ferry Village", 17: "Whisper Mire", 18: "Serpent Marsh",
    19: "Ash Flats", 20: "Copper Bazaar", 21: "Glass Desert",
    22: "Fire Caldera", 23: "Temple of Gods", 24: "Demon Forge",
    25: "Cloud Stair", 26: "Wind Cliffs", 27: "The Eyrie", 28: "Frostpeak",
    29: "Heaven's Edge", 30: "Storm's Eye", 31: "Blind Well",
    32: "Gem Hollows", 33: "Bone City", 34: "Forgotten Well", 35: "Torn Land",
    36: "The Between", 37: "Severance Fortress", 38: "The Severing",
    39: "Sixth Gate", 40: "Soul Sanctum", 41: "Silent Shrine",
}
# Sanskrit subtitle overrides for files where it can't be split off the descriptor
SANSKRIT_OVERRIDE = {
    0: "Gramavana", 7: "Smṛtivana", 8: "Nāgarāja Sabha",
    24: "Pāṣāṇa Daitya", 30: "Vāyu Rākṣasa",
}


def sanskrit_for(idx, old_name):
    if idx in SANSKRIT_OVERRIDE:
        return SANSKRIT_OVERRIDE[idx]
    if old_name and "—" in old_name:        # split on em-dash
        return old_name.split("—")[0].strip()
    return old_name or ""


def enc(value):
    """JSON-encode a string value with ASCII escaping (matches file style)."""
    return json.dumps(value, ensure_ascii=True)


RE_NAME_LINE = re.compile(r'^[ \t]*"regionName"\s*:.*\n', re.MULTILINE)

rows = []
for f in sorted(glob.glob("regions/region_*.json"),
                key=lambda p: int(p.split("_")[-1].split(".")[0])):
    d = json.load(open(f, encoding="utf-8"))
    idx = d.get("regionIndex")
    if idx not in NICK:
        print(f"SKIP {f} (idx={idx} not in nickname list)")
        continue
    old = d.get("regionName")
    nick = NICK[idx]
    sans = sanskrit_for(idx, old)

    text = open(f, encoding="utf-8").read()
    new_lines = f' "regionName": {enc(nick)},\n "regionSubtitle": {enc(sans)},\n'

    if RE_NAME_LINE.search(text):
        text = RE_NAME_LINE.sub(lambda _m: new_lines, text, count=1)
    else:
        # insert right after the opening brace (first line)
        nl = text.index("\n") + 1
        text = text[:nl] + new_lines + text[nl:]

    json.loads(text)  # validate before writing
    open(f, "w", encoding="utf-8").write(text)
    rows.append((idx, old, nick, sans))

print(f"{'idx':>3}  {'old regionName':38} -> {'nickname':18} | subtitle")
print("-" * 90)
for idx, old, nick, sans in rows:
    print(f"{idx:>3}  {str(old):38} -> {nick:18} | {sans}")
print(f"\n{len(rows)} regions updated.")
