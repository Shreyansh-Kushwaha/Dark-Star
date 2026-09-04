export class QuestManager extends EventTarget {
  constructor() {
    super();
    this.active = new Map();    // id -> questData
    this.completed = new Set();
    this.killCounts = new Map(); // questId -> count
  }

  load(completedIds = []) {
    completedIds.forEach(id => this.completed.add(id));
  }

  start(questId, questData) {
    if (this.completed.has(questId) || this.active.has(questId)) return;
    this.active.set(questId, { ...questData, progress: 0 });
    this.dispatch('quest_started', { id: questId, quest: questData });
  }

  complete(questId) {
    if (this.completed.has(questId)) return;
    const q = this.active.get(questId);
    this.active.delete(questId);
    this.completed.add(questId);
    this.dispatch('quest_completed', { id: questId, quest: q });
  }

  isComplete(questId) {
    return this.completed.has(questId);
  }

  isActive(questId) {
    return this.active.has(questId);
  }

  onBossKill(bossKey, regionId) {
    this.dispatch('boss_killed', { bossKey, regionId });
    // Complete any main quest waiting on this boss
    for (const [id, q] of this.active) {
      if (q.complete === `boss_kill:${bossKey}`) {
        this.complete(id);
      }
    }
  }

  onEnemyKill(regionId) {
    // Check active kill-count side quests
    for (const [id, q] of this.active) {
      if (q.complete && q.complete.startsWith('enemy_kills:')) {
        const target = parseInt(q.complete.split(':')[1]);
        const cur = (this.killCounts.get(id) || 0) + 1;
        this.killCounts.set(id, cur);
        if (cur >= target) {
          this.complete(id);
          this.killCounts.delete(id);
        }
      }
    }
  }

  onPressurePlate() {
    for (const [id, q] of this.active) {
      if (q.complete === 'pressure_plate') {
        this.complete(id);
      }
    }
  }

  // Completes any active quest waiting on the player opening/using the portal that
  // leads to `regionId` (quest `complete: 'portal_unlock:<regionId>'`). Called by
  // GameScene when a forward portal transition fires.
  onPortalUnlock(regionId) {
    for (const [id, q] of this.active) {
      if (q.complete === `portal_unlock:${regionId}`) {
        this.complete(id);
      }
    }
  }

  // Sequence puzzles (`complete: 'sequence:<puzzleId>'`), e.g. the Vrindavana
  // hymn stones. Called by GameScene when the full sequence is struck correctly.
  onSequenceSolved(seqId) {
    for (const [id, q] of this.active) {
      if (q.complete === `sequence:${seqId}`) {
        this.complete(id);
      }
    }
  }

  onNpcTalk(npcId) {
    this.dispatch('npc_talked', { npcId });
    // Delivery/talk quests: complete when the player speaks to the target NPC
    // (quest `complete: 'talk:<storyNpcId>'`).
    for (const [id, q] of this.active) {
      if (q.complete === `talk:${npcId}`) {
        this.complete(id);
      }
    }
  }

  // Fetch quests (`complete: 'collect:<itemId>:<N>'`). `ownedCount` is how many
  // of that item the save inventory now holds — the caller owns the inventory,
  // this just compares against each active quest's target.
  onItemCollected(itemId, ownedCount) {
    for (const [id, q] of this.active) {
      if (!q.complete || !q.complete.startsWith('collect:')) continue;
      const [, target, nStr] = q.complete.split(':');
      if (target !== itemId) continue;
      if (ownedCount >= (parseInt(nStr) || 1)) {
        this.complete(id);
      }
    }
  }

  dispatch(eventType, detail) {
    this.dispatchEvent(new CustomEvent(eventType, { detail }));
  }

  getCompletedArray() {
    return Array.from(this.completed);
  }
}
