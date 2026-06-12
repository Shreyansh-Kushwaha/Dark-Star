#!/usr/bin/env python3
"""Rewrite Region(idx, "Sanskrit — Descriptor", color, seed) calls in gen_world.py
to Region(idx, "Nickname", color, seed, subtitle="Sanskrit") so regenerating the
world keeps the nickname-primary + Sanskrit-subtitle naming."""
import re

NICK = {
    12: "Withered Fields", 13: "Hunter's Thicket", 14: "Stone Gate",
    15: "Sunken Road", 16: "Ferry Village", 17: "Whisper Mire",
    18: "Serpent Marsh", 19: "Ash Flats", 20: "Copper Bazaar",
    21: "Glass Desert", 22: "Fire Caldera", 23: "Temple of Gods",
    24: "Demon Forge", 25: "Cloud Stair", 26: "Wind Cliffs", 27: "The Eyrie",
    28: "Frostpeak", 29: "Heaven's Edge", 30: "Storm's Eye", 31: "Blind Well",
    32: "Gem Hollows", 33: "Bone City", 34: "Forgotten Well", 35: "Torn Land",
    36: "The Between", 37: "Severance Fortress", 38: "The Severing",
    39: "Sixth Gate", 40: "Soul Sanctum", 41: "Silent Shrine",
}
SANS_OVERRIDE = {24: "Pāṣāṇa Daitya", 30: "Vāyu Rākṣasa"}

text = open("gen_world.py", encoding="utf-8").read()
count = 0


def repl(m):
    global count
    idx = int(m.group(1)); old = m.group(2); rest = m.group(3)
    if idx not in NICK:
        return m.group(0)
    nick = NICK[idx]
    sans = SANS_OVERRIDE.get(idx) or (old.split("—")[0].strip() if "—" in old else old)
    count += 1
    return f'Region({idx}, "{nick}",{rest}, subtitle="{sans}")'


text = re.sub(r'Region\((\d+),\s*"((?:[^"\\]|\\.)*)"\s*,(.*?)\)', repl, text)
open("gen_world.py", "w", encoding="utf-8").write(text)
print(f"updated {count} Region() calls")
