# Future Visual Upgrades — Akhand Sutra

A prioritized, codebase-grounded plan for improving the game's visuals. The engine
is **Phaser 3.60 running on WebGL** (`type: Phaser.AUTO` in `src/main.js`), which means
the built-in **FX API** (bloom, glow, vignette, colour-grade) and **Lights2D** are
available with **no GLSL required**. All heavy effects should be gated through the
existing `src/systems/QualitySettings.js` (low / medium / high).

---

## Current state (audit)

**What exists:**
- Pixel-art sprites, y-depth sorted (`setDepth(this.y)`).
- Blob shadows under players/enemies (`ellipse`, quality-gated via `QualitySettings.shadows`).
- Hand-drawn VFX: circles/rectangles + tweens (`_onAbilityFx`, `_onAmritUsed`, shrine flame, heal burst).
- One generic white-dot ambient emitter per region (`_spawnAmbientParticles`, texture `amb_particle`).
- Flat edge-silhouette parallax (`_buildParallaxBorder`).
- Checkerboard ground patches (`_buildGroundTexture`).
- Camera shake + fade (`cameras.main.shake/fadeOut`).
- Low-HP red rectangle vignette (`UIScene._createVignette`).

**Now DONE (was missing):**
- ✅ **Bloom** — `_setupPostFx` adds a camera bloom pass (medium/high), so emissive/additive props glow.
- ✅ **Per-object glow** — `_glow()` adds an `addGlow` pass to fire props / portals / projectiles (high only, count-capped).
- ✅ **Per-biome weather** — `_spawnAmbientParticles` has 15 biome particle profiles (embers, leaves, snow, spores, void motes…).
- ✅ **Per-biome colour grade + vignette** — `_setupPostFx` now adds a real `ColorMatrix`
  (saturation/brightness/contrast) **and** a `vignette` keyed by biome via `_biomeGrade()`.
  All 50 regions are graded (`_regionBiome` covers every index), so each province has a true
  colour identity — warm Emberwastes, desaturated/oppressive caves & void, bright airy Skyward —
  not just a darker tint. The old flat `_applyRegionColorOverlay` rect stays as the low-quality fallback.
- ✅ **Combat juice (partial)** — `_popSprite` (squash/stretch) and `_impactDust` exist.

**Still missing (the big levers):**
- ❌ **Fake lighting for dark zones** — Tier 1.3 below; additive radial lights punched through a dark
  layer in caves / the Sunless Deep would still add a lot over the grade+vignette alone.
- ❌ **God-rays, distance haze** — Tier 2 atmosphere not yet built.
- ❌ **Floating damage numbers, hit-flash** — Tier 3 juice not yet built (`_popSprite`/`_impactDust` aside).

**All post-FX is gated behind `QualitySettings.postFx` (medium/high).** On the `low` preset —
auto-selected on weak devices — bloom, grade, and glow are all skipped; that's the intended
perf tradeoff. Verify visuals with `node tools/gradeshot.mjs <regions>` (forces the high preset).

---

## Tier 1 — Highest impact (the "wow" layer)

### 1.1 Emissive glow + bloom (FX API) — *low effort, huge payoff*
One line per glowing object makes it actually emit light.
```js
// on objects we already create
this._shrine.flame.postFX.addGlow(0xffd870, 6);   // Thread Shrine flame
portal.visual.postFX.addGlow(color, 4);            // portals
// global bloom (WebGL only — gate behind quality)
this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 1, 1.1);
```
Apply to: shrine flame, braziers, portals, Amrit/heal burst, magic projectiles,
lava/fire, boss attack tells. Hook in `GameScene.create` after objects are built.

### 1.2 Per-province colour grade + real vignette — ✅ DONE (`_setupPostFx` / `_biomeGrade`)
Replace the flat overlay rectangle with a **camera ColorMatrix + vignette**, keyed by
province using the `act` map already defined in `src/data/worldMapLayout.js`.
```js
const cm = this.cameras.main.postFX.addColorMatrix();
// e.g. Sunless Deep → desaturate + darken; Emberwastes → warm; Drowned Reach → cool/teal
cm.saturate(-0.3).brightness(0.8);
this.cameras.main.postFX.addVignette(0.5, 0.5, 0.5, 0.4);
```
Now all 36 regions feel distinct and atmospheric.

### 1.3 Fake lighting for dark zones — *moderate effort, defines the caves*
For the Sunless Deep / Severance: a full-screen dark layer with **additive radial
"light" sprites** punched through it (around the player, torches, the shrine).
Cheaper than true Lights2D (no per-sprite pipeline changes) and reads beautifully
top-down. Promote to true `Lights2D` later if normal maps get authored.

---

## Tier 2 — Atmosphere (high impact, low effort)

- **Weather / particles per province** — diversify the single emitter by `act`:
  embers + ash (Emberwastes), falling leaves (forests), rain (Drowned Reach),
  snow (Skyward), drifting spores/dark motes (Sunless Deep), dust motes everywhere.
- **God-rays / light shafts** — additive vertical gradient sprites in temples / forest / heaven.
- **Distance haze** — soft gradient near the top of the world to fake depth (complements the parallax silhouettes).
- **Animated environment** — sway trees/grass with a small sine tween, water shimmer,
  torch flicker (extend the shrine-flame yoyo tween to braziers).

---

## Tier 3 — Game feel / juice

- **Hit-flash** — tint sprite `0xffffff` for ~60ms on damage (`Player.takeDamage` / `Enemy.takeDamage`).
- **Squash / stretch** on attack windup and landing.
- **Floating damage numbers** — rising, fading text on hits.
- **Knockback dust puffs** on impacts and dashes.
- **Camera juice** — zoom-punch on heavy/boss hits; dash speed-lines (FX blur).
- **Sprite outlines** — `postFX.addGlow` thin dark outline so characters pop in dense forests.

---

## Tier 4 — UI & cohesion

- **Bitmap / pixel font** to replace the system serif/monospace — unifies the whole look.
- **Diegetic HUD frames** — extend the craftsmanship already shown in the leather Codex
  book and the gem-studded boss bar to the plain player HUD (currently bare rectangles).
- **Themed transitions** — a "thread" wipe for region/fast-travel transitions
  (currently white-flash + fade).

---

## Tier 5 — Deeper (bigger effort)

- **Normal maps + true Lights2D** for real dynamic lighting on characters (labor-intensive for pixel art).
- **Tilemap-based environments** instead of scattered sprites for denser, cohesive scenes.
- **Day/night cycle** tied to story Acts.

---

## Recommended "starter pack" (do these first)

Mostly one-liners; would change the game's feel dramatically:

1. **Glow / bloom** on all emissive objects (shrine, portals, fire, magic).
2. **Per-province colour-grade + vignette** (also fixes the 30 ungraded regions).
3. **Weather particles** by province.
4. **Hit-flash + floating damage numbers** (combat juice).

All perf-gated through `QualitySettings` (low disables FX; medium/high enable).

### Implementation hooks
- FX / grade / vignette → `GameScene.create`, after world + entities are built; key off the
  province/`act` mapping in `src/data/worldMapLayout.js`.
- Weather → extend `GameScene._spawnAmbientParticles`.
- Hit-flash → `Player.takeDamage` / `Enemy.takeDamage`.
- Damage numbers → new helper in `GameScene`, emitted from the damage handlers.
- Quality gating → read flags from `src/systems/QualitySettings.js` (add e.g. `postFx`, `weather`).
