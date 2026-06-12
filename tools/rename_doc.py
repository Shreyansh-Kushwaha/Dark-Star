#!/usr/bin/env python3
"""Update WORLD_MAP_DESIGN.md to lead with nicknames (Sanskrit kept as subtitle).

  - Region headings:  **N. Sanskrit — Descriptor** ...  ->  **N. Nickname — *Sanskrit*** ...
  - Mermaid nodes:    Rxx["… N · Sanskrit<br/>(blurb)"]  ->  Rxx["… N · Nickname<br/>(Sanskrit · blurb)"]
"""
import re

DOC = "docs/WORLD_MAP_DESIGN.md"

# doc heading number -> (nickname, sanskrit-as-written-in-doc)
HEAD = {
    1: ("Ash Village", "Gramavana"), 2: ("Memory Grove", "Smrtivana"),
    3: ("Withered Fields", "Dhanyakshetra"), 4: ("Broken Bridge", "Setubandha"),
    5: ("Hunter's Thicket", "Mrgavana"), 6: ("Stone Gate", "Pasanadvara"),
    7: ("Sunken Road", "Plavita"), 8: ("Ferry Village", "Naditira"),
    9: ("Whisper Mire", "Kardama"), 10: ("Stone Vale", "Shilavana"),
    11: ("Serpent Marsh", "Nagakshetra"), 12: ("Serpent Court", "Nagaraja Sabha"),
    13: ("Ash Flats", "Bhasmabhumi"), 14: ("Copper Bazaar", "Tamrapura"),
    15: ("Glass Desert", "Marusthala"), 16: ("Fire Caldera", "Agnikunda"),
    17: ("Temple of Gods", "Deva Mandira"), 18: ("Demon Forge", "Pasana Daitya"),
    19: ("Cloud Stair", "Meghasopana"), 20: ("Wind Cliffs", "Vayupatha"),
    21: ("The Eyrie", "Garudalaya"), 22: ("Frostpeak", "Himashikhara"),
    23: ("Heaven's Edge", "Swarga Seema"), 24: ("Storm's Eye", "Vayu Rakshasa"),
    25: ("Blind Well", "Andhakupa"), 26: ("Gem Hollows", "Ratnaguha"),
    27: ("Sunless Deep", "Patala Guha"), 28: ("Bone City", "Asthinagara"),
    29: ("Forgotten Well", "Vismrti Kupa"), 30: ("Torn Land", "Chidrabhumi"),
    31: ("The Between", "Antarala"), 32: ("Severance Fortress", "Viyoga Durga"),
    33: ("The Severing", "Sutracheda"), 34: ("Sixth Gate", "Shashtha Dvara"),
    35: ("Soul Sanctum", "Ekatmalaya"), 36: ("Silent Shrine", "Maunamandira"),
}

# mermaid node id -> full new inner label (between the quotes)
NODE = {
    "R0":  '🟢 0 · Ash Village<br/>(Gramavana)',
    "R7":  '🟢 2 · Memory Grove<br/>(Smrtivana)',
    "R3":  '★ 3 · Withered Fields<br/>(Dhanyakshetra)',
    "R4":  '🏘️ 4 · Broken Bridge<br/>(Setubandha · HUB)',
    "R5":  '★ 5 · Hunter\'s Thicket<br/>(Mrgavana)',
    "R6":  '⚔️ 6 · Stone Gate<br/>(Pasanadvara)',
    "R8":  '7 · Sunken Road<br/>(Plavita)',
    "R9h": '🏘️ 8 · Ferry Village<br/>(Naditira · HUB)',
    "R10": '★ 9 · Whisper Mire<br/>(Kardama)',
    "R9k": '🟢★ 10 · Stone Vale<br/>(Shilavana)',
    "R11": '11 · Serpent Marsh<br/>(Nagakshetra)',
    "R12": '🟢⚔️ 12 · Serpent Court<br/>(Nagaraja Sabha)',
    "R13": '13 · Ash Flats<br/>(Bhasmabhumi)',
    "R14": '🏘️ 14 · Copper Bazaar<br/>(Tamrapura · HUB)',
    "R15": '★ 15 · Glass Desert<br/>(Marusthala)',
    "R16": '16 · Fire Caldera<br/>(Agnikunda)',
    "R17": '17 · Temple of Gods<br/>(Deva Mandira)',
    "R18": '⚔️ 18 · Demon Forge<br/>(Pasana Daitya)',
    "R19": '19 · Cloud Stair<br/>(Meghasopana)',
    "R20": '20 · Wind Cliffs<br/>(Vayupatha)',
    "R21": '🏘️ 21 · The Eyrie<br/>(Garudalaya · HUB)',
    "R22": '★ 22 · Frostpeak<br/>(Himashikhara)',
    "R23": '23 · Heaven\'s Edge<br/>(Swarga Seema)',
    "R24": '⚔️ 24 · Storm\'s Eye<br/>(Vayu Rakshasa)',
    "R25": '25 · Blind Well<br/>(Andhakupa)',
    "R26": '★ 26 · Gem Hollows<br/>(Ratnaguha)',
    "R27": '🟢 27 · Sunless Deep<br/>(Patala Guha)',
    "R28": '28 · Bone City<br/>(Asthinagara)',
    "R29": '✦ 29 · Forgotten Well<br/>(Vismrti Kupa)',
    "R30": '30 · Torn Land<br/>(Chidrabhumi)',
    "R31": '🏘️ 31 · The Between<br/>(Antarala · last save)',
    "R32": '32 · Severance Fortress<br/>(Viyoga Durga)',
    "R33": '⚔️ 33 · The Severing<br/>(Sutracheda · FINAL BOSS)',
    "R34": '✦ 34 · Sixth Gate<br/>(Shashtha Dvara)',
    "R35": '✦ 35 · Soul Sanctum<br/>(Ekatmalaya)',
    "R36": '✦ 36 · Silent Shrine<br/>(Maunamandira)',
}

text = open(DOC, encoding="utf-8").read()

# --- headings ---
def head_sub(m):
    n = int(m.group(1)); rest = m.group(3)
    nick, sans = HEAD[n]
    return f"**{n}. {nick} — *{sans}***{rest}"

text, n_head = re.subn(r"^\*\*(\d+)\. (.+?)\*\*(.*)$", head_sub, text, flags=re.MULTILINE)

# --- mermaid node labels ---
n_node = 0
for nid, label in NODE.items():
    pat = re.compile(r'(\b' + re.escape(nid) + r'\[")(.*?)("\])')
    text, c = pat.subn(lambda m, lbl=label: m.group(1) + lbl + m.group(3), text, count=1)
    n_node += c

open(DOC, "w", encoding="utf-8").write(text)
print(f"headings updated: {n_head}, mermaid nodes updated: {n_node}")
