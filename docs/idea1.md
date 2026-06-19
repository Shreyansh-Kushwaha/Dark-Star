# Idea 1: Seamless Open-World Region Streaming

## Problem

Currently, moving between regions requires walking into a portal which triggers:
1. A white flash + black fade-out animation (~600ms)
2. A full scene restart (`scene.restart(...)`)
3. A `/api/regions` fetch to reload editor data
4. A complete rebuild of the 3200×2000 world from scratch

This breaks immersion — it feels like teleporting, not exploring a connected world.

## Goal

When the player approaches the edge of the current region, silently pre-load the next region's content offset beside the current one. The player walks across the boundary seamlessly with no portal, no loading screen, and no stutter. The old region unloads behind them after they've moved far enough in.

---

## How It Works (Streaming Approach)

### Region Layout

Define a direction for each region connection:

| From | To | Direction |
|------|----|-----------|
| Region 0 | Region 1 | Right (east) |
| Region 1 | Region 2 | Right |
| Region 2 | Region 3 | Right |
| … | … | … |

For a horizontal chain, region N's content sits at x-offset `N * WORLD_W`. The player moves through a single continuous 22,400 × 2,000 world (7 regions × 3200px wide).

Vertical connections (north/south) use y-offset `N * WORLD_H`.

### Three Phases per Crossing

**Phase 1 — Trigger (player is ~400px from edge)**
- Fetch next region's JSON from `/api/regions` (already cached in registry most of the time)
- Call `_buildRegionAtOffset(newIndex, offsetX, offsetY)` — a new method that creates all sprites, enemies, spawners, shrines, portals at their positions + offset
- Expand `physics.world.setBounds` and `cameras.main.setBounds` to cover both regions

**Phase 2 — Crossing (player walks across boundary)**
- Nothing special — camera follows player as normal
- Both regions' physics and enemies are live

**Phase 3 — Unload (~600px past boundary)**
- Destroy all Phaser objects belonging to the old region (sprites, enemies, NPCs, spawners, fragments, no-walk zones)
- Contract physics/camera bounds back to just the new region's space
- Remap all positions: subtract the old offset so the new region is back at 0,0 (avoids ever-growing coordinate numbers)

---

## Key Code Changes

### 1. New method: `_buildRegionAtOffset(regionIndex, dx, dy)`

Mirrors the existing `create()` setup but:
- Takes a coordinate offset `(dx, dy)` and adds it to every `x, y` value
- Skips: player spawn, camera setup, physics setup (those are already live)
- Runs `_buildFromMapData` with all sprite positions shifted by `(dx, dy)`
- Tags all created objects with `._regionIndex = regionIndex` for later cleanup

Reuses existing internal methods:
- `_buildFromMapData(mapData)` → extend to accept optional offset param
- `_makePortal(x, y, ...)` → already parameterised, just pass offset coords
- `new Enemy(this, x, y, ...)` → just pass `x + dx, y + dy`

### 2. Expand bounds on trigger

```js
// When streaming in region to the right:
const totalW = WORLD_W * 2; // current + next
this.physics.world.setBounds(0, 0, totalW, WORLD_H);
this.cameras.main.setBounds(0, 0, totalW, WORLD_H);
```

### 3. Remapping positions after crossing

Once the old region is unloaded, translate all live objects back:
```js
const shift = -dx; // e.g. -3200 if old region was at x=0
for (const obj of allLiveObjects) obj.x += shift;
this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
```
This keeps coordinates small and avoids floating-point drift over many regions.

### 4. Remove portals at region edges

Instead of the visible portal circles at the transition edge, place an invisible trigger zone (a rectangle) at the boundary that fires the stream-in logic. Keep portals for back-connections to non-adjacent regions (e.g. fast-travel hubs).

### 5. Gate system → invisible wall

Where portal gates currently block passage (locked portals), replace with a static physics body wall at the boundary + the existing sealed feedback message. Remove the wall when the gate requirement is met.

---

## Data changes needed

### `regions.js` / region JSON

Add a `connections` field per region:
```js
{
  index: 0,
  connections: {
    next: { regionIndex: 1, edge: 'right' },  // 'right' | 'left' | 'top' | 'bottom'
    back: null,
  },
  // ...existing fields
}
```

This replaces `portalBack` / `portalNext` position objects for the streaming edge, though non-edge portals (fast travel) stay as-is.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/constants.js` | No change needed |
| `src/data/regions.js` | Add `connections` field to each region definition |
| `src/scenes/GameScene.js` | Main work: add `_buildRegionAtOffset`, `_streamInRegion`, `_unloadRegion`, `_remapPositions`; modify `_checkPortals` to detect edge proximity; modify `_buildFromMapData` to accept offset |
| `regions/region_*.json` | Add `connections` to editor-saved overrides (or handle fallback from regions.js) |

---

## What Stays Unchanged

- Enemy AI, combat, boss arenas — all work at any x/y coordinate
- Co-op networking — `REGION_CHANGE` message can carry offset instead of restarting
- Map editor — editor still saves JSON per-region; streaming just loads them at runtime with offsets
- Save system — still saves `regionIndex`; on load, just place player at correct position in the unified world
- Portal system — kept for non-edge fast-travel portals (e.g. back to hub)

---

## Performance Budget

| Concern | Assessment |
|---------|------------|
| Two regions simultaneously | ~2000 sprites for ~1600ms during crossing. Phaser handles 5000+ static sprites fine in browser. |
| Enemy AI overlap | Only enemies in camera view + nearby run full AI. Off-screen enemies are dormant. |
| Asset textures | Already pre-loaded in PreloadScene; no extra network cost. |
| Region JSON fetch | Cached in `registry.regionMaps` at startup; no fetch needed at edge. |

---

## Tradeoffs vs Current Portal System

| | Portal System (current) | Seamless Streaming (this idea) |
|--|--|--|
| Immersion | Breaks (teleport feel) | Continuous, open-world |
| Implementation | Simple scene restart | Moderate complexity |
| Memory | 1 region at a time | 2 regions briefly during crossing |
| Gate locks | Portal visual | Invisible wall + message |
| Fast travel | Portals work anywhere | Keep portals for non-edge travel |
| Save/load | regionIndex only | regionIndex + needs position context |

---

## Implementation Order

1. Add `connections` to `regions.js`
2. Add `_buildRegionAtOffset(index, dx, dy)` — reuses `_buildFromMapData` with offset param
3. Add edge-proximity check in the slow-tick (runs every 8 frames, same as `_checkPortals`)
4. Expand bounds on stream-in, contract + remap on unload
5. Replace edge portals with invisible trigger zones
6. Replace gate portals with static wall bodies
7. Test single crossing (region 0 → 1) before wiring all 7
