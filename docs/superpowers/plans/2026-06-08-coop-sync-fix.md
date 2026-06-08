# Co-op Multiplayer Sync Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix co-op so host controls Dhruva, client controls Tara, and both players' movements are visible on each other's screen in real time.

**Architecture:** Three things are broken: (1) `isLocal` is hardcoded so both players end up controlling P1, (2) `PLAYER_STATE` packets are sent but never received/applied, (3) P2's `update()` call passes `null` for keyboard input even when local. Fix all three in `GameScene.js`; add lobby character label in `MainMenuScene.js`.

**Tech Stack:** Phaser 3, ES modules, WebSocket relay server (`server/combined_server.js`), `NetworkManager.js`

---

## Files to Modify

- `src/scenes/GameScene.js` — player role assignment, input routing, camera, network listener, broadcast fix
- `src/scenes/MainMenuScene.js` — lobby character name display

---

### Task 1: Role-based `isLocal` assignment + camera

**Files:**
- Modify: `src/scenes/GameScene.js` (lines ~122–136)

- [ ] **Step 1: Replace the player creation + camera block**

Find this block (lines ~122–136):
```js
    // ── Players ───────────────────────────────────────────────────
    const spawnPos = region.spawnPos;
    this.players = [];

    const p1 = new Player(this, spawnPos.x, spawnPos.y, true, saveData);
    this.players.push(p1);

    // P2: spawn next to P1 (will be controlled by remote or follow AI)
    const p2 = new Player(this, spawnPos.x + 60, spawnPos.y, false, saveData);
    p2.isLocal = false; // will be set true if P2 joins
    this.players.push(p2);

    // Camera
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(p1, true, 0.1, 0.1);
```

Replace with:
```js
    // ── Players ───────────────────────────────────────────────────
    const spawnPos = region.spawnPos;
    this.players = [];

    // In co-op: host=Dhruva(P1 local), client=Tara(P2 local). Solo: P1 local only.
    const isClient = this.network.connected && this.network.isClient();
    const p1 = new Player(this, spawnPos.x, spawnPos.y, true, saveData);
    p1.isLocal = !isClient;
    this.players.push(p1);

    const p2 = new Player(this, spawnPos.x + 60, spawnPos.y, false, saveData);
    p2.isLocal = isClient;
    this.players.push(p2);

    // Camera follows the local player
    const localPlayer = isClient ? p2 : p1;
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(localPlayer, true, 0.1, 0.1);
```

- [ ] **Step 2: Commit**
```bash
git add src/scenes/GameScene.js
git commit -m "fix: co-op role assignment — host=Dhruva local, client=Tara local"
```

---

### Task 2: Fix input routing in update loop

**Files:**
- Modify: `src/scenes/GameScene.js` (lines ~843–845)

- [ ] **Step 1: Replace the player update lines**

Find:
```js
    if (p1) p1.update(time, delta, this._cursors, this._keys, this.enemies, this);
    if (p2 && p2.isLocal) p2.update(time, delta, null, null, this.enemies, this);
    else if (p2 && !p2.isLocal) this._taraAI(p1, p2, delta);
```

Replace with:
```js
    if (p1 && p1.isLocal)  p1.update(time, delta, this._cursors, this._keys, this.enemies, this);
    if (p2 && p2.isLocal)  p2.update(time, delta, this._cursors, this._keys, this.enemies, this);
    // Solo only: Tara follows P1 via AI when there is no network connection
    if (p2 && !p2.isLocal && !this.network.connected) this._taraAI(p1, p2, delta);
```

- [ ] **Step 2: Commit**
```bash
git add src/scenes/GameScene.js
git commit -m "fix: route keyboard input to local player; skip AI when network connected"
```

---

### Task 3: Add network receive handler (the missing piece)

**Files:**
- Modify: `src/scenes/GameScene.js` (after network init, ~line 114)

- [ ] **Step 1: Add network listener after `this.registry.remove('network')`**

Find:
```js
    this.network = this.registry.get('network') || new NetworkManager();
    this.registry.remove('network');
```

Replace with:
```js
    this.network = this.registry.get('network') || new NetworkManager();
    this.registry.remove('network');

    // Apply remote player state when packet arrives
    if (this.network.connected) {
      this.network.on('PLAYER_STATE', ({ playerIndex, state }) => {
        const remote = this.players[playerIndex];
        if (remote && !remote.isLocal) remote.applyNetState(state);
      });
    }
```

Note: `this.players` array doesn't exist yet at this line, but `network.on` only registers a callback — the callback runs later during gameplay when `this.players` is fully populated, so this is safe.

- [ ] **Step 2: Commit**
```bash
git add src/scenes/GameScene.js
git commit -m "fix: listen for PLAYER_STATE and apply to remote player"
```

---

### Task 4: Fix broadcast to send local player index

**Files:**
- Modify: `src/scenes/GameScene.js` (`_netBroadcast` method, ~line 1227)

- [ ] **Step 1: Replace `_netBroadcast`**

Find:
```js
  _netBroadcast() {
    if (!this.network?.connected) return;
    const p = this.players[0];
    if (!p) return;
    this.network.send('PLAYER_STATE', {
      state: p.getNetState(),
      enemies: this.enemies.filter(e => e?.alive).map(e => ({
        id: e._id, x: e.x, y: e.y, hp: e.hp,
      })),
    });
  }
```

Replace with:
```js
  _netBroadcast() {
    if (!this.network?.connected) return;
    const localIdx = this.network.isHost() ? 0 : 1;
    const p = this.players[localIdx];
    if (!p) return;
    this.network.send('PLAYER_STATE', {
      playerIndex: localIdx,
      state: p.getNetState(),
    });
  }
```

- [ ] **Step 2: Commit**
```bash
git add src/scenes/GameScene.js
git commit -m "fix: broadcast local player index so remote knows which player to update"
```

---

### Task 5: Disable tether in co-op mode

The tether was designed for solo (AI Tara). It must not fight network-driven position updates.

**Files:**
- Modify: `src/scenes/GameScene.js` (`_enforceTether`, ~line 1204)

- [ ] **Step 1: Guard tether behind solo check**

Find:
```js
  _enforceTether() {
    const [p1, p2] = this.players;
    if (!p1 || !p2 || !p2.isLocal) return;
```

Replace with:
```js
  _enforceTether() {
    const [p1, p2] = this.players;
    // Tether only applies in solo mode; in co-op positions come from network
    if (!p1 || !p2 || !p2.isLocal || this.network.connected) return;
```

- [ ] **Step 2: Commit**
```bash
git add src/scenes/GameScene.js
git commit -m "fix: disable tether in co-op — remote player position is network-driven"
```

---

### Task 6: Show character name in lobby

**Files:**
- Modify: `src/scenes/MainMenuScene.js` (`_hostCoop` and `_onKey` join handler)

- [ ] **Step 1: Update `_hostCoop` to show character**

Find:
```js
      net.on('ROOM_READY', ({ code }) => {
        this._roomInput.setText(code);
        this._roomPrompt.setText('WAITING FOR PARTNER...');
      });
```

Replace with:
```js
      net.on('ROOM_READY', ({ code }) => {
        this._roomInput.setText(code);
        this._roomPrompt.setText('YOU ARE DHRUVA  ·  WAITING FOR TARA...');
      });
```

- [ ] **Step 2: Update join `ROOM_READY` handler to show character**

Find:
```js
          net.on('ROOM_READY', () => {
            this._roomPrompt.setText('CONNECTED!  STARTING...');
            this.registry.set('network', net);
            this.time.delayedCall(800, () => this._startGame(true));
          });
```

Replace with:
```js
          net.on('ROOM_READY', () => {
            this._roomPrompt.setText('YOU ARE TARA  ·  CONNECTED!  STARTING...');
            this.registry.set('network', net);
            this.time.delayedCall(800, () => this._startGame(true));
          });
```

- [ ] **Step 3: Commit**
```bash
git add src/scenes/MainMenuScene.js
git commit -m "feat: show character name (Dhruva/Tara) in co-op lobby"
```

---

## Testing Checklist

After all tasks complete, open two browser tabs to `http://localhost:8080`:

1. Tab A: Click "HOST CO-OP" → should see "YOU ARE DHRUVA · WAITING FOR TARA..." + room code
2. Tab B: Click "JOIN CO-OP" → enter the room code → should see "YOU ARE TARA · CONNECTED! STARTING..."
3. Both tabs enter the game
4. Tab A (host): WASD moves Dhruva → Tab B should see Dhruva moving
5. Tab B (client): WASD moves Tara → Tab A should see Tara moving
6. Neither tab should have AI-controlled Tara following Dhruva
7. Each tab's camera should follow their own character
