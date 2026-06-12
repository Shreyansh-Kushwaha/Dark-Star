// ─── Codex lore: bestiary, playable heroes, and NPC roster ──────────────────
// Display names for enemies live in ENEMY_TYPES[*].label (src/data/enemies.js);
// this file adds the flavour text the Codex shows once a thing has been faced.

// Bestiary lore, keyed by enemy typeKey (see ENEMY_TYPES).
export const ENEMY_LORE = {
  melee:
    'Forest rakshasas that once tended the groves of Gramavana. When Ekatmadeva’s name was scraped from the shrines, the woods began to rot from the root, and its keepers rotted with it. They strike on instinct, mourning something they can no longer name.',
  ranged:
    'Shadara archers — exiled hunters who took the dark sap as medicine and let it take them instead. Their arrows fly true because grief makes a steady hand. They keep their distance, as the severed thread taught them all to do.',
  flying:
    'Vayu Bhuta, restless wind-spirits bound to the breath of the living. Without the Akhand Sutra to carry feeling between souls, that breath curdled into spite. They dart and harry, unable to land, unable to rest.',
  orc:
    'Vana Raksha, the heavy wardens of the deep forest. Larger and slower than their lesser kin, they guard the corrupted groves with the stubborn loyalty of soldiers never told their war had ended.',
  elite:
    'Mahavir Raksha — a champion among the corrupted, its rage compressed until it cracks the earth in shockwaves. The old hermits say such beasts were once heroes of the forest, hollowed into weapons by a lie too large to hold.',
  bat:
    'Vayu Pakshi, swarming sky-vermin that nest where memory has gone quiet. They feed on the silence the broken thread left behind, and grow bold wherever the living have stopped asking questions.',
  rat:
    'Kshetra Mooshak, field-vermin swollen on tainted grain. Weakest of the corrupted, yet the most numerous — proof that rot, once seeded, spreads fastest through the small and overlooked.',
  slimem:
    'Vikrit Kshira — “spoiled milk,” the villagers call it. Congealed corruption that oozes through the lowlands, dissolving whatever it touches into more of itself. Slow, but patient as a forgotten grudge.',
  mimic:
    'Mayavi Peti, the deceiver-chest. It wears the shape of treasure because the corruption learned what the lonely crave most: the promise that something was left for them. It waits, perfectly still, until hope leans close.',
};

// Playable heroes. Both are always shown — they are the player’s own.
export const CHARACTERS = [
  {
    key: 'dhruva',
    name: 'Dhruva',
    title: 'The Unmoving Star',
    color: '#cc99ff',
    lore:
      'Named for the pole star that never wanders, Dhruva walks toward the truth and refuses to be turned aside. Where others accept the temples’ five gods, Dhruva counts the empty sixth pedestal and asks why. Steadfast, deliberate, and dangerous to any story built on a buried name — Dhruva was chosen by Elder Mahesh not for strength of arm, but for the refusal to look away.',
  },
  {
    key: 'tara',
    name: 'Tara',
    title: 'The Guiding Light',
    color: '#88ccff',
    lore:
      'Tara means “star,” but also “she who ferries across.” Quick where Dhruva is certain, Tara reads people the way scholars read stone — finding the grief beneath the silence, the question beneath the obedience. She believes the Akhand Sutra is not gone but waiting, like roots that outlived the tree, and she fights to give the world back the feeling it was made to share.',
  },
];

// Curated NPC roster, keyed by the npcId used at spawn. Region tags the page.
// NPCs the player actually meets are unlocked; the rest read as undiscovered.
export const NPC_CODEX = {
  // ── Region 0 — Gramavana ──────────────────────────────────────────────
  elder_mahesh: { name: 'Elder Mahesh', region: 0,
    lore: 'The eldest voice of Gramavana, keeper of the question the temples forbid. He remembers when grief was shared and joy travelled between souls, and he sends the heroes out not to conquer but to ask — why must the guilty be so loudly named?' },
  gramavana_villager: { name: 'Rukmini', region: 0,
    lore: 'A village mother whose children burn with fever for want of stolen herbs. She notices what others train themselves to ignore: a grove shrine with five carvings and six pedestals.' },
  village_warrior: { name: 'Arjun, Village Guard', region: 0,
    lore: 'Gramavana’s drill-hardened guard, who teaches that a perfect dodge steps toward fear, not away. He half-suspects the thread of combat and the thread of the world are the same discipline.' },
  village_child: { name: 'Kavi', region: 0,
    lore: 'A child who repeats his grandmother’s heresy: that there were once six gods, and the sixth loved people most of all. He asks the question the adults swallowed — why would such a god simply vanish?' },
  village_healer: { name: 'Devi, Village Healer', region: 0,
    lore: 'A healer who warns that priests re-carved every shrine three generations past — six-pointed stars made five, one name melted from each listing. The stone, she insists, remembers even when the carving is gone.' },

  // ── Region 1 — Mahavana ──────────────────────────────────────────────
  mahavana_hermit: { name: 'Hermit Veda', region: 1,
    lore: 'A heretic scribe who stopped praying the day he found the lie: “he who severed the thread” was a mistranslation of “he who refused to surrender it.” He names Vanaraksha not a demon, but a guardian wounded by an erasure too vast to bear.' },
  forest_scholar: { name: 'Scholar Priya', region: 1,
    lore: 'A scholar who cross-referenced temple records against pre-temple stone and found the same gap everywhere — a missing central symbol. She is the first to speak the erased name aloud: Ekatmadeva, the god of one soul.' },
  lost_merchant: { name: 'Merchant Gopal', region: 1,
    lore: 'A peddler of honest maps and fake charms who traced the old thread-roads pilgrims walked before the gods rerouted them. They all lead to a site no temple map admits exists.' },

  // ── Region 2 — Vrindavana ────────────────────────────────────────────
  vrindavana_sage: { name: 'Sage Ananta', region: 2,
    lore: 'A sage who teaches that truth arrives not as revelation but as contradiction — to be sat inside, not resolved. He points the heroes to a mural the priests walled away three centuries ago.' },
  vrindavana_dancer: { name: 'Dancer Ishani', region: 2,
    lore: 'A keeper of memory through movement, who still performs the forbidden sixth step of the old dances alone at night. In the sacred pool she sees a figure kneeling before five others — not in defeat, but in offering.' },

  // ── Region 3 — Naga Patal ────────────────────────────────────────────
  naga_oracle: { name: 'Naga Oracle', region: 3,
    lore: 'A serpent-seer of the drowned underworld who reveals that “Viyogasur” is no name but a sentence — viyoga, separation; sur, divine. A curse dressed as a title, hung on the god of union himself.' },
  naga_merchant: { name: 'Naga Merchant', region: 3,
    lore: 'A trader in jal tears — crystallized memory formed where grief and truth meet deep water. Each tear shows the same betrayal from a different angle: six gods in a circle, five hands reaching in.' },

  // ── Region 4 — Deva Mandira ──────────────────────────────────────────
  temple_priest: { name: 'Priest Vamadeva', region: 4,
    lore: 'A priest of forty years’ faith who is shown the chamber beneath his own temple — and the melted sixth face named Ekatmadeva, originator of the very thread the five gods claimed to protect. He learns he has prayed inside a lie.' },
  deva_guardian: { name: 'Temple Guardian', region: 4,
    lore: 'A warden taught that some doors stay sealed as mercy. He comes to understand the empty sixth alcove was never for contemplation — it held a god removed for being inconvenient, not evil.' },

  // ── Region 5 — Swarga Seema ──────────────────────────────────────────
  apsara_guide: { name: 'Apsara', region: 5,
    lore: 'A celestial who has watched heaven’s story rewritten seventeen times in three thousand years. The latest revision unmade an entire god — and she guides the heroes to the memory-locks that suppress his name in the sky.' },
  deva_warrior: { name: 'Deva Warrior', region: 5,
    lore: 'A heavenly soldier who realizes how easily one fights bravely for a lie given a beautiful enough name. He leaves the choice of the thread — restore, break, or remake — to the heroes, not the gods.' },

  // ── Region 6 — Viyoga Durga ──────────────────────────────────────────
  akhand_voice: { name: 'Voice in the Void', region: 6,
    lore: 'What remains of Ekatmadeva: not a body, not a god, only the resonance of a name spoken into emptiness for a thousand years. He made the Akhand Sutra and refused to surrender it as a leash — and that refusal is the whole of his crime.' },
};
