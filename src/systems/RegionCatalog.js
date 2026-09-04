// Single shared fetch/parse of /api/regions. The full catalog is ~5.8 MB of
// JSON; before this, PreloadScene, MainMenuScene (three sites), WorldMapScene
// and GameScene each ran their own fetch + parse of the whole thing. Callers
// share one in-flight promise; refresh() re-fetches (the server answers 304 via
// Last-Modified when nothing changed) for the editor-saved-data-just-changed
// paths. `failed` stays true only while the latest attempt got nothing, so the
// menu can tell the player the world is missing instead of silently loading an
// empty one.
let _promise = null;
let _failed = false;

export const RegionCatalog = {
  get() {
    if (!_promise) this.refresh();
    return _promise;
  },

  refresh() {
    _promise = fetch('/api/regions')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(list => {
        _failed = !Array.isArray(list) || list.length === 0;
        return Array.isArray(list) ? list : [];
      })
      .catch(() => {
        _failed = true;
        return [];
      });
    return _promise;
  },

  get failed() { return _failed; },
};
