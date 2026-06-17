# Animation Pipeline — Scan → Review → Export

A declarative pipeline that turns raw asset packs into approved animation
definitions, replacing hand-written configs like `src/data/bossAssets.js`.

```
 asset packs on disk
        │  python3 tools/catalog_assets.py   (existing)
        ▼
 docs/assets.json            filesystem metadata (paths, dims, frame counts)
        │  python3 tools/scan_animations.py
        ▼
 docs/animations_draft.json  every animation candidate, with GUESSED metadata
        │  open  /animation_reviewer.html   (server on :8080)
        │  approve ✓ / needs-fix ✗ / remark, fix name·fps·loop·entity_key
        ▼
 docs/animations.json        APPROVED definitions only — the clean source of truth
```

## 1. Scan

```
python3 tools/scan_animations.py
```

Reads `docs/assets.json` and emits one entry per animation candidate
(`kind: animation_frames` → `source: frame_folder`; `kind: spritesheet` →
`source: spritesheet`, only when it has ≥2 frames). Each entry is auto-guessed:

| Field | Guessed from |
|-------|--------------|
| `entity_key` | pack id, version/“free”/“pack” tokens stripped |
| `entity_type` | pack category (`boss`/`enemy`/`npc`/`vfx`/`prop`/`misc`) |
| `name` | folder/file name → canonical (`1_atk`→`attack`, `idel`→`idle`, `take_hit`→`hurt`, …) |
| `purpose_guess` | the canonical name (“Attack action — plays once”) |
| `framerate` | 10 for attack/cast, else 8 |
| `loop` | true for idle/walk/run, else false |
| `status` | `pending` |

**Incremental & safe to re-run.** Existing draft decisions are preserved by a
stable `id` (per animation) and `pack_id` (per pack). New packs come in as
`pending`. If an asset’s art changes (frame count/size — tracked by
`fingerprint`), that one entry is reset to `pending` with an auto-remark so you
re-review it. Vanished assets are dropped.

## 2. Review

Start the server and open the reviewer:

```
node server/combined_server.js          # http://localhost:8080
# →  http://localhost:8080/animation_reviewer.html
```

- **Filter** by status (defaults to *Pending*), entity type (defaults to *boss*),
  or text. Click a pack header to collapse it.
- **▶ on the thumbnail** plays the actual animation — frame folders are played
  from the real files (`/api/list-frames`); spritesheets are sliced on a canvas
  using the guessed frame size. Playback is on-demand (one row at a time) to stay
  light on low-RAM machines.
- Per row: **✓ Approve**, **✗ Needs Fix** (+ remark explaining what to redo in
  the asset-making phase), and edit `name` / `fps` / `loop`.
- Per pack: edit `entity_key` and `entity_type`.
- **💾 Save Draft** persists to `docs/animations_draft.json`.
- **⬇ Export** writes the approved entries to `docs/animations.json`.

> **Duplicate entity_keys:** the external library ships some packs twice (e.g.
> `assest2/Frost_Guardian_FREE_v1.0` and `New folder 2/Frost_Guardian_FREE_v1.0`).
> They appear as two cards with the same `entity_key`; approve/rename only the one
> you actually use so the export has no collisions.

## 3. Adding new assets later

1. Drop the new pack into the asset folders.
2. `python3 tools/catalog_assets.py` → refresh `docs/assets.json`.
3. `python3 tools/scan_animations.py` → only the new candidates are added as `pending`.
4. Open the reviewer, filter to **Pending**, review just the new ones, **Export**.

## Files

| File | Role |
|------|------|
| `tools/scan_animations.py` | assets.json → animations_draft.json (guesses + diff-merge) |
| `docs/animations_draft.json` | working review queue (status + remarks) |
| `animation_reviewer.html` | the review UI (served statically at `/animation_reviewer.html`) |
| `docs/animations.json` | approved output (consumed by the future runtime loader) |
| `server/combined_server.js` | endpoints: `/api/list-frames`, `/api/animations-draft/save`, `/api/animations/export`, `/api/animations` |

## Next (not yet built)

`docs/animations.json` is the input for a future generic `AnimationLoader`
(`src/systems/AnimationLoader.js`) that would replace `src/data/bossAssets.js`.
That runtime swap is intentionally deferred until enough entries are approved,
since the loader needs a populated `animations.json` to read.
