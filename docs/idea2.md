# Asset Management System Overhaul — Idea 2

**Status:** Concept  
**Created:** 2026-06-17  
**Problem:** Manual asset configuration doesn't scale. Adding new packs/animations requires editing multiple files (bossAssets.js, editor tabs, entity configs).  
**Goal:** Auto-discover and auto-wire assets so adding a new pack is a 5-minute data task, not code changes.

---

## Current State

### What's Working
- **Asset Catalog** (`docs/assets.json`): Comprehensive auto-generated index of all 61 packs, 6,812 images, 1,152 spritesheets, 1,092 frame animations
- **Catalog Generator** (`tools/catalog_assets.py`): Python script that scans the filesystem and produces the catalog
- **Map Editor**: Full asset browser with tabs, search, preview
- **Boss Asset Loader** (`src/data/bossAssets.js`): Manual configuration for boss animations (King Slime, Frost Guardian, Tree Boss, etc.)

### The Scaling Problem
1. **Hardcoded Boss Animations**: Adding a new boss requires:
   - Writing ~30-50 lines in `bossAssets.js` (load frame URLs + define anim sequences)
   - Testing the exact frame counts
   - Manually padding frame numbers
   - If animation structure changes → rewrite config

2. **Manual Editor Tab Registration**: Each asset pack needs:
   - A tab entry in the editor UI
   - Category/subcategory mappings
   - Animation detection (does this pack have frame folders or spritesheets?)

3. **Animation Format Fragmentation**:
   - Bosses: per-action folders (`idle/`, `attack/`, etc.)
   - NPCs: scattered spritesheet or frame strips
   - Props: single images, spritesheets, or frame sequences
   - No unified way to say "this is an animation"

4. **Discovery Gaps**:
   - Editor doesn't know which packs have animations vs. static props
   - No metadata about frame count, framerate, sprite size
   - Adding animation support requires editing code, not data

---

## Professional Game Dev Solution: Three-Tier Asset System

### Tier 1: Metadata (Auto-Generated) ✓
**`docs/assets.json`** contains:
- All file paths, dimensions, pixel counts
- Classification: `image`, `spritesheet`, `animation_frames`, `tileset`
- Frame counts, sizes, uniformity

**Status:** Complete. Generator works. Regenerate with `python3 tools/catalog_assets.py`

---

### Tier 2: Animation Definitions (NEW)
**Problem:** How does the engine know which frame folders = "idle walk attack"?

**Solution:** Create a declarative **Animation Definition Format** that maps folder structures to animation playback specs.

#### Schema Example: `animations.json` (per-pack or global)

```json
{
  "packs": [
    {
      "id": "assest2/Frost_Guardian_FREE_v1.0",
      "entity_type": "boss",
      "entity_key": "frost_guardian",
      "animations": [
        {
          "name": "idle",
          "source": "frame_folder",
          "frames_dir": "PNG files/idle",
          "framerate": 8,
          "loop": true,
          "notes": "6 frames, 192x128"
        },
        {
          "name": "attack",
          "source": "frame_folder",
          "frames_dir": "PNG files/1_atk",
          "framerate": 10,
          "loop": false,
          "notes": "14 frames, attack action, plays once"
        },
        {
          "name": "walk",
          "source": "frame_folder",
          "frames_dir": "PNG files/walk",
          "framerate": 8,
          "loop": true
        },
        {
          "name": "death",
          "source": "frame_folder",
          "frames_dir": "PNG files/death",
          "framerate": 7,
          "loop": false
        }
      ],
      "spritesheet_url": "Frost_Guardian_FREE_v1.0/frost_guardian_free_192x128_SpriteSheet.png",
      "notes": "From LuizMelo (itch.io), commercial-use OK. Upscale 3-4x for ~100px visible height."
    },
    {
      "id": "THE PACK/Monsters",
      "entity_type": "boss",
      "entity_key": "slime_boss",
      "animations": [
        {
          "name": "idle",
          "source": "frame_folder",
          "frames_dir": "KING SLIME/idel",
          "framerate": 8,
          "loop": true
        },
        {
          "name": "attack",
          "source": "frame_folder",
          "frames_dir": "KING SLIME/attack",
          "framerate": 10,
          "loop": false
        },
        {
          "name": "run",
          "source": "reuse",
          "reuse_from": "idle",
          "notes": "No run art; reuse idle frames"
        },
        {
          "name": "death",
          "source": "frame_folder",
          "frames_dir": "KING SLIME/Dead",
          "framerate": 8,
          "loop": false
        }
      ]
    }
  ]
}
```

**Benefits:**
- Single source of truth for animation wiring
- Supports: frame folders, spritesheets, frame reuse, custom framerates
- Human-readable; reviewable in PRs
- Can be split per-pack or centralized
- Regenerator can auto-guess defaults from `assets.json` (framerate, frame count)

---

### Tier 3: Editor Auto-Discovery (WIRE TO UI)
The map editor **reads both Tier 1 & 2** and auto-populates:

#### Feature: Auto-Tab Generation
```javascript
// Pseudo-code: editor loads assets.json + animations.json
const tabs = generateTabsFromCatalog(assetsJSON, animationsJSON);
// → Produces tabs for each pack category, with animation indicators
```

#### Feature: Animation Preview in Tray
When browsing assets, show indicators:
- **Badge**: `3-frame` on animation_frames
- **Auto-play**: First frame with play button preview
- **Info popover**: Frame count, size, recommended upscale

#### Feature: Entity Configuration UI
Instead of typing in bossAssets.js:
1. Editor dropdown: "Select Boss Type" → picks from `animations.json` list
2. Shows preview of all animations for that boss
3. Click "Place" → marks spawn on canvas
4. Auto-loads correct frames on region entry

---

## Implementation Plan

### Phase 1: Animation Definition Format (Effort: 2–3 hours)

**Goal:** Build the schema + a Python generator that auto-creates `animations.json` from existing hardcoded configs.

**Files:**
- Create `/docs/animations.json` with schema
- Create `tools/generate_animations.py` to:
  - Parse existing `bossAssets.js` → extract frame configs
  - Auto-detect frame folders in `assets.json`
  - Generate JSON with smart defaults
  - Allow manual overrides via YAML/JSON for edge cases

**Deliverable:**
- `animations.json` with all current bosses + any new packs scanned
- Schema with validation
- Regenerator script (`python3 tools/generate_animations.py`)

**Why first:** Unblocks Tiers 2 & 3; converts hardcoded knowledge into shareable data.

---

### Phase 2: Animation Loader Engine (Effort: 3–4 hours)

**Goal:** Replace `bossAssets.js` with a generic loader that reads `animations.json`.

**Changes:**
- Create `/src/systems/AnimationLoader.js`:
  - `loadAnimationPack(packId, scene)` → reads JSON, loads all frames, defines anims
  - Handles: frame folders, spritesheets, frame reuse, variable framerates
  - Idempotent (safe for co-op region entry)
  - Cache mechanism to avoid re-loading

- Deprecate `bossAssets.js` (or keep as fallback):
  - Scenes call `AnimationLoader.load('frost_guardian', scene)` instead
  - Lighter, no per-boss boilerplate

**Benefits:**
- New boss in 2 lines of code: just add to animations.json + call loader
- No asset-specific branching logic
- Same loader works for enemies, NPCs, props

---

### Phase 3: Map Editor Auto-Discovery (Effort: 4–6 hours)

**Goal:** Editor tray auto-populates from `assets.json` + `animations.json`.

**Changes:**
- Modify `/server/combined_server.js` or editor JS:
  - Serve `animations.json` alongside assets
  - Build tab structure from catalog categories
  - Show animation metadata (frame count, size, framerate) on hover

- Editor UI enhancements:
  - **Animation badges**: "12-frame", "loop", "sprite: 96x96"
  - **Smart search**: "bosses with idle animation" or "100px+ sprites"
  - **Quick-place buttons** for bosses/enemies/NPCs
  - **Anim preview**: Click to see sprite preview + all animation states

**Deliverable:**
- Editor loads from `/api/animations.json` endpoint
- Tabs auto-populate from pack catalog
- Entity placement UI pre-fills animation configs

---

### Phase 4: Migration & Polish (Effort: 2–3 hours)

**Goal:** Deprecate manual configs, write docs.

**Changes:**
- Write `/docs/ANIMATION_FORMAT.md` with:
  - Schema reference
  - How to add a new boss/enemy/NPC
  - How to customize framerate/loop behavior
  - Troubleshooting frame count mismatches

- Update `/docs/ASSETS.md` to link to animation system
- Add regenerator to CI/pre-commit hook (optional, keep asset catalog in sync)
- Update bossAssets.js or split into legacy fallback

**Deliverable:**
- Docs + migration guide
- Zero per-asset code changes needed going forward

---

## Effort Summary

| Phase | Time | Blocker? | Benefit |
|-------|------|----------|---------|
| 1. Animation Definitions | 2–3h | No | Data layer; unblocks 2 & 3 |
| 2. Animation Loader | 3–4h | No | Replaces bossAssets.js; generic |
| 3. Editor UI | 4–6h | No | UX: auto-discovery, preview |
| 4. Docs & Migration | 2–3h | No | Operational: how to use |
| **Total** | **11–16h** | **None** | **Fully automated asset pipeline** |

---

## Before/After: Adding a New Boss

### Before (Manual)
1. Add frame folders to assset2 or assets5 ✓ (already done)
2. Write ~40 lines in `bossAssets.js` (load URLs + frame counts + anim specs)
3. Test in game, tweak frame counts
4. Restart server, reload editor
5. **Time: ~30–45 min** (error-prone, easy to typo frame paths)

### After (Declarative)
1. Add frame folders to assset2/assets5 ✓ (already done)
2. Run `python3 tools/generate_animations.py` (scans & auto-detects)
3. Review generated `animations.json` entry, tweak framerate if needed
4. Scene calls `AnimationLoader.load('new_boss', scene)` (1 line)
5. Editor tab auto-appears with preview
6. **Time: ~5–10 min** (JSON review only, no code changes)

---

## Key Design Decisions

### Why This Order?
1. **Definitions first** (tier 2) because it's the data bottleneck. Tiers 1 & 3 depend on clean animation specs.
2. **Loader second** because it's the bridge: converts JSON → runtime (no UI churn).
3. **Editor UI last** because it's polish; the system works without it (but UX is worse).

### Why Not "Single Metadata File"?
- `assets.json` is filesystem metadata (file paths, dimensions, counts) — auto-generated from disk
- `animations.json` is semantic metadata (what an animation *means*, how to play it) — human-curated
- Keeping separate keeps concerns clear + lets both regenerate independently

### Why JSON Instead of Hardcoding?
- **Shareable:** Non-programmers can update animation data
- **Reviewable:** Git diffs show exactly what changed
- **Composable:** Can merge multiple definitions or override per-region
- **Tooling:** Easier to write validators, UX tools, export pipelines

### What About Spritesheet-Based Animations?
The schema supports them:
```json
{
  "name": "walk",
  "source": "spritesheet",
  "spritesheet_url": "assets/sprites.png",
  "grid": { "cols": 4, "rows": 2, "frame_width": 64, "frame_height": 64 },
  "frames": [0, 1, 2, 3],
  "framerate": 10
}
```

---

## Success Criteria

- ✓ Adding a new boss animation ≤ 5 min (JSON only, no code)
- ✓ Editor auto-discovers all asset packs + animations
- ✓ All existing bosses/enemies/NPCs work via the new loader
- ✓ Animation preview in editor tray works
- ✓ Documentation complete; no per-asset special cases needed
- ✓ Animation system scales to 100+ packs without code changes

---

## Related Docs

- `docs/assets.json` — Filesystem catalog (auto-generated)
- `docs/ASSETS.md` — Human-readable asset inventory
- `src/data/bossAssets.js` — Current hardcoded boss animations (to replace)
- `tools/catalog_assets.py` — Asset scanner (can be extended for animations)
- `tools/generate_animations.py` — NEW: Will auto-generate `animations.json`

---

## Open Questions / Next Steps

1. **Should we auto-detect frame folder structure?**  
   E.g., if a folder has `idle/`, `attack/`, `walk/` subfolders, assume standard boss structure?  
   → Decision: Yes, with manual override in JSON for non-standard cases.

2. **Multi-language animation names?**  
   E.g., "idle" vs. "idel" (typo in THE PACK). Should we normalize?  
   → Decision: Keep as-is in JSON, map to canonical names in loader if needed.

3. **Framerate auto-detection?**  
   Can we guess from GIF metadata or sprite timing?  
   → Decision: Default to 8 fps, allow override in JSON per-animation.

4. **Version the animation format?**  
   In case we need to extend (new source types, metadata fields)?  
   → Decision: Add `version: 1` to schema; regenerator handles migration.

5. **Serve animations.json from server or embed in editor?**  
   → Decision: Serve from `/api/animations.json` endpoint; editor fetches on load.

---

## References

**Industry standards used:**
- **Godot/Unity asset import pipelines:** Declarative configs + auto-loaders (no hardcoding)
- **Aseprite sprite data format:** JSON-based animation metadata
- **Phaser animation system:** Declarative frame arrays + playback specs
- **Spine/DragonBones:** XML/JSON animation hierarchy (similar tier-2 concept)
