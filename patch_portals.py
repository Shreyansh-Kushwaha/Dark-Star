#!/usr/bin/env python3
"""
patch_portals.py — wire the EXISTING editor-made regions (0,7,8,9,10) into the
open-world graph from docs/WORLD_MAP_DESIGN.md without touching their art.
Sets each region's `portals` array; leaves sprites/enemies/boss untouched.
(Setubandha=11 and the generated regions 12-41 carry their own portals.)
"""
import json

# regionIndex -> portals list (directional back/next + direction-less spurs)
WIRE = {
    0:  [  # Gramavana (start) -> Smrtivana
        {"id": "p0_next", "direction": "next", "targetRegion": 7, "x": 3080, "y": 1000},
    ],
    7:  [  # Smrtivana: back to the village, on to Setubandha
        {"id": "p7_back", "direction": "back", "targetRegion": 0, "x": 60, "y": 1000},
        {"id": "p7_next", "direction": "next", "targetRegion": 11, "x": 3120, "y": 1065},
    ],
    8:  [  # Nagaraja Sabha (boss): from the Serpent Marsh, on to the Emberwastes
        {"id": "p8_back", "direction": "back", "targetRegion": 18, "x": 60, "y": 1000},
        {"id": "p8_next", "direction": "next", "targetRegion": 19, "x": 3120, "y": 1000},
    ],
    9:  [  # Shilavana: a quiet spur off the ferry village
        {"id": "p9_back", "direction": "back", "targetRegion": 16, "x": 60, "y": 1000},
    ],
    10: [  # Patala Guha: deep chain between the Gem Hollows and the City of Bone
        {"id": "p10_back", "direction": "back", "targetRegion": 32, "x": 60, "y": 1000},
        {"id": "p10_next", "direction": "next", "targetRegion": 33, "x": 3120, "y": 1000},
    ],
}

for idx, portals in WIRE.items():
    path = f"regions/region_{idx}.json"
    d = json.load(open(path))
    d["portals"] = portals
    json.dump(d, open(path, "w"), indent=1)
    print(f"R{idx:<2} portals -> " + ", ".join(
        (("%s→%d" % (p.get("direction","to"), p["targetRegion"])) for p in portals)))
print("wired existing regions into the world graph.")
