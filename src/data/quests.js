export const QUESTS = {
  // ─── Main Quests ───────────────────────────────────────────────
  gramavana_main: {
    id: 'gramavana_main', type: 'main',
    title: "The Elder's Warning",
    desc: 'Elder Mahesh speaks of Viyogasur and the breaking of the Akhand Sutra. He believes the old stories may hide broken lies.',
    trigger: 'npc_talk:elder_mahesh', complete: 'portal_unlock:1', reward: null,
  },
  mahavana_main: {
    id: 'mahavana_main', type: 'main',
    title: "The Hermit's Silence",
    desc: 'Hermit Veda studies what the gods left behind when they lied. The forest hides evidence of an erased god.',
    trigger: 'region_enter:1', complete: 'boss_kill:vanaraksha', reward: null,
  },
  vrindavana_main: {
    id: 'vrindavana_main', type: 'main',
    title: 'The Grove Remembers',
    desc: 'A mural in the sacred grove shows six halos. One was scraped away so deeply the stone still bleeds.',
    trigger: 'region_enter:2', complete: 'boss_kill:vanasur', reward: null,
  },
  nagapatal_main: {
    id: 'nagapatal_main', type: 'main',
    title: "The Serpent's Memory",
    desc: 'The oracle of the deep says the prison here was built by gods, not demons. Viyogasur was sealed, not conquered.',
    trigger: 'region_enter:3', complete: 'boss_kill:nagraj_kaliya', reward: null,
  },
  devamandira_main: {
    id: 'devamandira_main', type: 'main',
    title: 'The Temple of the Hidden Face',
    desc: 'A vault no priest is permitted to open holds a mural of five gods raising weapons against a sixth who is kneeling.',
    trigger: 'region_enter:4', complete: 'boss_kill:pashana_daitya', reward: null,
  },
  swargaseema_main: {
    id: 'swargaseema_main', type: 'main',
    title: 'The Sky That Lied',
    desc: 'Cloud seals in the heavens were installed to hide a name. The name beneath them is not Viyogasur.',
    trigger: 'region_enter:5', complete: 'boss_kill:vayu_rakshasa', reward: null,
  },
  viyogadurga_main: {
    id: 'viyogadurga_main', type: 'main',
    title: 'The Forgotten Name',
    desc: 'The Voice in the Void says the final prison is not stone. It is belief.',
    trigger: 'region_enter:6', complete: 'boss_kill:viyogasur', reward: null,
  },

  // ─── Side Quests ───────────────────────────────────────────────
  gramavana_sq1: {
    id: 'gramavana_sq1', type: 'side',
    title: 'Healing Herbs',
    desc: 'Rukmini needs medicinal herbs — she says the oldest remedies carry memory alongside medicine. Defeat forest rakshasas to recover them.',
    trigger: 'npc_talk:gramavana_villager', complete: 'enemy_kills:5',
    reward: { item: 'healing_herb', name: 'Healing Herb' },
  },
  gramavana_sq2: {
    id: 'gramavana_sq2', type: 'side',
    title: 'The Prithvi Shard',
    desc: 'A glowing earth crystal stolen by forest rakshasas. The elder believes it may hold an old memory.',
    trigger: 'npc_talk:elder_mahesh', complete: 'enemy_kills:8',
    reward: { item: 'prithvi_shard', name: 'Prithvi Shard' },
  },
  mahavana_sq1: {
    id: 'mahavana_sq1', type: 'side',
    title: "The Hermit's Totem",
    desc: 'Hermit Veda lost a sacred totem to the forest spirits. It hums near the places where the sixth god was worshipped.',
    trigger: 'npc_talk:mahavana_hermit', complete: 'enemy_kills:10',
    reward: { item: 'forest_totem', name: 'Forest Totem' },
  },
  mahavana_sq2: {
    id: 'mahavana_sq2', type: 'side',
    title: "The Scholar's Specimen",
    desc: 'Scholar Priya needs a spirit-fern whose roots may hold memory dust of the erased god.',
    trigger: 'npc_talk:forest_scholar', complete: 'enemy_kills:5',
    reward: { item: 'spirit_fern', name: 'Spirit Fern' },
  },
  mahavana_sq3: {
    id: 'mahavana_sq3', type: 'side',
    title: "The Merchant's Lost Goods",
    desc: 'Merchant Gopal was ambushed near a broken shrine that reacted to the presence of outsiders.',
    trigger: 'npc_talk:lost_merchant', complete: 'enemy_kills:3',
    reward: { item: 'merchants_coin', name: "Merchant's Coin" },
  },
  vrindavana_sq1: {
    id: 'vrindavana_sq1', type: 'side',
    title: "The Sage's Blessing",
    desc: 'Sage Ananta offers a blessing to those who cleanse the grove — and listen to what the mural reveals.',
    trigger: 'npc_talk:vrindavana_sage', complete: 'enemy_kills:12',
    reward: { item: 'ashram_blessing', name: 'Ashram Blessing' },
  },
  vrindavana_sq2: {
    id: 'vrindavana_sq2', type: 'side',
    title: 'Water of Life',
    desc: 'Dancer Ishani seeks pure water. She hears a hymn with six notes — the last note always missing.',
    trigger: 'npc_talk:vrindavana_dancer', complete: 'pressure_plate',
    reward: { item: 'water_blessing', name: 'Water Blessing' },
  },
  nagapatal_sq1: {
    id: 'nagapatal_sq1', type: 'side',
    title: 'The Naga Scale',
    desc: 'The oracle needs a scale from an ancient naga guard. It vibrates near old lies.',
    trigger: 'npc_talk:naga_oracle', complete: 'enemy_kills:15',
    reward: { item: 'naga_scale', name: 'Naga Scale' },
  },
  nagapatal_sq2: {
    id: 'nagapatal_sq2', type: 'side',
    title: 'Tears of the Deep',
    desc: 'The merchant needs jal tears that reflect memories instead of faces — always the same scene: five judges, one accused.',
    trigger: 'npc_talk:naga_merchant', complete: 'enemy_kills:10',
    reward: { item: 'jal_tear', name: 'Jal Tear' },
  },
  devamandira_sq1: {
    id: 'devamandira_sq1', type: 'side',
    title: 'Sacred Offering',
    desc: 'The temple priest requests sacred offerings stained with names erased from the scriptures.',
    trigger: 'npc_talk:temple_priest', complete: 'enemy_kills:15',
    reward: { item: 'temple_offering', name: 'Temple Offering' },
  },
  devamandira_sq2: {
    id: 'devamandira_sq2', type: 'side',
    title: 'The Agni Ember',
    desc: 'The guardian seeks a sacred ember. When heated, it shows the sixth god not as a tyrant, but as the one who refused to abandon mortals.',
    trigger: 'npc_talk:deva_guardian', complete: 'pressure_plate',
    reward: { item: 'agni_ember', name: 'Agni Ember' },
  },
  swargaseema_sq1: {
    id: 'swargaseema_sq1', type: 'side',
    title: "The Apsara's Song",
    desc: "The apsara's divine song was stolen. The final verse names Ekatmadeva as the keeper of willing bonds.",
    trigger: 'npc_talk:apsara_guide', complete: 'enemy_kills:18',
    reward: { item: 'vayu_note', name: 'Vayu Note' },
  },
  swargaseema_sq2: {
    id: 'swargaseema_sq2', type: 'side',
    title: 'Cloud Crystal',
    desc: 'The heavenly warrior needs a crystal that refracts memory — it shows a council of gods with one empty seat they chose to call empty.',
    trigger: 'npc_talk:deva_warrior', complete: 'pressure_plate',
    reward: { item: 'cloud_crystal', name: 'Cloud Crystal' },
  },
};

export const NPC_DIALOGUE = {
  elder_mahesh: {
    first:     '⟨Elder Mahesh⟩ "You stand on sacred ground, child. Long ago, the thread bound us all. Now the villages forget, and fear grows where memory should live."',
    active:    '⟨Elder Mahesh⟩ "There are whispers of Viyogasur again. The old stories say he broke the world. I once believed that too. But broken stories often hide broken lies."',
    completed: '⟨Elder Mahesh⟩ "You hear the world more clearly than most. That is the beginning of wisdom. Keep walking, and keep questioning."',
  },
  gramavana_villager: {
    first:     '⟨Rukmini⟩ "Oh! You must be the warriors the elder spoke of. The rakshasas that lurk in the forest took our healing herbs — our children grow sick. Please, can you help?"',
    active:    '⟨Rukmini⟩ "Please hurry — defeat those forest rakshasas and the herbs should fall free..."',
    completed: '⟨Rukmini⟩ "Bless you both. The thread holds because of souls like yours."',
  },
  village_warrior: {
    first:     '⟨Arjun, Village Guard⟩ "So — the elder\'s chosen ones. Let me teach you what I know. Press J to strike light, K for a heavy blow. Shift to dodge — time it perfectly and you\'ll feel time slow. Q, E, and R use your special abilities. Now go — practice on those rakshasas east of the village."',
    active:    '⟨Arjun⟩ "Remember: dodge into their attacks, not away. A perfect dodge refills your stamina and empowers your next strike."',
    completed: '⟨Arjun⟩ "You fight well. The thread holds in strong hands."',
  },
  village_child: {
    first:     '⟨Kavi, Village Child⟩ "My grandmother says there used to be six gods, not five. But the temple only shows five. Why would a god disappear?"',
    active:    '⟨Kavi⟩ "If someone erased a god, maybe they were afraid of what that god knew."',
    completed: '⟨Kavi⟩ "You saved everyone! The thread holds! I\'m going to be a warrior too someday."',
  },
  village_healer: {
    first:     '⟨Devi, Village Healer⟩ "When people grieve, they think their pain belongs only to them. But the thread once taught us otherwise. We healed because we remembered we were not alone."',
    active:    '⟨Devi⟩ "If you find old shrines, do not trust the names carved into them. Many were changed. Many truths were buried under prayer."',
    completed: '⟨Devi⟩ "Now breathe. You are carrying less than before. That matters."',
  },
  mahavana_hermit: {
    first:     '⟨Hermit Veda⟩ "I do not worship the gods anymore. I study what they left behind when they lied."',
    active:    '⟨Hermit Veda⟩ "This forest remembers a god that the temples forgot. Find the carved roots beneath the ancient tree. Do not trust the first face you see."',
    completed: '⟨Hermit Veda⟩ "The beasts here are corrupted, yes, but corruption is often a wound, not a birth. Remember that."',
  },
  forest_scholar: {
    first:     '⟨Scholar Priya⟩ "Every kingdom edits its past. But when the gods do it, the edits become law."',
    active:    '⟨Scholar Priya⟩ "Look for patterns. Six symbols were carved here once. Now only five remain. That is not a mistake. That is a removal."',
    completed: '⟨Scholar Priya⟩ "You have recovered not just evidence, but context. Context is the enemy of lies."',
  },
  lost_merchant: {
    first:     '⟨Merchant Gopal⟩ "I sell rope, candles, maps, and charms. The charms are fake. The maps are not."',
    active:    '⟨Merchant Gopal⟩ "Three of those rakshasas took my cargo — please hurry, it\'s all I have."',
    completed: '⟨Merchant Gopal⟩ "You know, some travelers say the same dream follows them across regions. A silver thread. A voice. A broken crown."',
  },
  vrindavana_sage: {
    first:     '⟨Sage Ananta⟩ "You seek the truth? Then learn this first: truth does not arrive as a revelation. It arrives as contradiction."',
    active:    '⟨Sage Ananta⟩ "In the grove lies a mural older than the temple. Defeat the corrupted beasts around it, and the stone will speak."',
    completed: '⟨Sage Ananta⟩ "There. Do you see it? Six halos. Six thrones. One was scraped away so deeply the stone itself still bleeds."',
  },
  vrindavana_dancer: {
    first:     '⟨Dancer Ishani⟩ "I dance to keep memory alive. Steps are safer than scripture. Scripture can be changed. Steps are harder to erase."',
    active:    '⟨Dancer Ishani⟩ "When I move beneath the moon, I hear a hymn with six notes. The last note is always missing."',
    completed: '⟨Dancer Ishani⟩ "The pool showed a man kneeling before the gods. Not a monster. Not a beast. A sacrifice."',
  },
  naga_oracle: {
    first:     '⟨Naga Oracle⟩ "You came to slay the serpent king, but perhaps the serpent king is the only one who remembers the shape of the chain."',
    active:    '⟨Oracle⟩ "The underworld holds the oldest testimony. Find the drowned reliquary and listen to what the water has kept hidden."',
    completed: '⟨Oracle⟩ "Yes... I see it now. The prison was made by gods, not demons. Viyogasur was sealed, not conquered."',
  },
  naga_merchant: {
    first:     '⟨Merchant⟩ "Ah, warriors from above! I trade in rare treasures. Help me gather jal tears and I\'ll reward you."',
    active:    '⟨Merchant⟩ "These tears show the same scene from different angles. Always the same: six gods, one accused, five judges."',
    completed: '⟨Merchant⟩ "Excellent! The thread holds — and so does good business."',
  },
  temple_priest: {
    first:     '⟨Priest Vamadeva⟩ "The gods are benevolent, child. Their order protects the world from chaos. That is what we are taught. That is what we must believe."',
    active:    '⟨Priest Vamadeva⟩ "...Why do you carry that look? As if you have seen a lie standing on an altar. Beneath this temple is a vault no priest is permitted to open. I cannot go there. But you can."',
    completed: '⟨Priest Vamadeva⟩ "No... no, this cannot be. The reliefs show six gods, but one face has been melted away. The records are false."',
  },
  deva_guardian: {
    first:     '⟨Temple Guardian⟩ "The temple protects sacred law. Some doors are closed for the peace of the world."',
    active:    '⟨Guardian⟩ "I was told never to ask why there were only five statues. Now I wonder if the answer would break something in me."',
    completed: '⟨Guardian⟩ "I was told never to ask why there were only five statues. Now I know the answer: someone feared the sixth more than death."',
  },
  apsara_guide: {
    first:     '⟨Apsara⟩ "Heaven is not a place. It is a story the powerful tell to make obedience feel holy."',
    active:    '⟨Apsara⟩ "Climb the windswept platforms and recover the cloud seals. They were installed when the gods sealed a name from the sky."',
    completed: '⟨Apsara⟩ "Yes... the seals are old enough to predate the temples. The name underneath them is not Viyogasur. It is Ekatmadeva."',
  },
  deva_warrior: {
    first:     '⟨Deva Warrior⟩ "I defended this sky for ages. I never questioned its purity. Now I see: duty is easy when you are never asked what it protects."',
    active:    '⟨Warrior⟩ "A cloud crystal forms only when two hearts beat in perfect unity at the sacred stones."',
    completed: '⟨Warrior⟩ "If the heavens lied once, how many times did they lie again?"',
  },
  akhand_voice: {
    first:     '⟨Voice in the Void⟩ "At last. You came far enough to hear the name they buried."',
    active:    '⟨Voice⟩ "The gods will use your uncertainty as a weapon. Dig deeper or be used."',
    completed: '⟨Voice⟩ "You know now. The final prison is not stone. It is belief."',
  },
};

export const LORE_FRAGMENTS = [
  // ── Region 0 — Gramavana (2 fragments) ────────────────────────────────
  {
    id: 'lore_mahesh_first', region: 0, source: 'npc', npcId: 'elder_mahesh',
    title: "The Elder's Doubt",
    text: '⟨Lore Fragment⟩ The oldest stone in Gramavana bears six symbols. The priests say one was a mistake. The stone knows better.',
  },
  {
    id: 'lore_gramavana_stone', region: 0, source: 'world',
    title: 'The Cracked Stone',
    text: '⟨Lore Fragment⟩ The stone hums faintly when touched. Carved into its underside: six thrones, six crowns. One throne has been chipped away. Someone did not want it remembered.',
  },

  // ── Region 1 — Mahāvana (3 fragments) ─────────────────────────────────
  {
    id: 'lore_hermit_first', region: 1, source: 'npc', npcId: 'mahavana_hermit',
    title: "The Hermit's Notes",
    text: '⟨Lore Fragment⟩ The hermit\'s notebook reads: "Six symbols were carved at the dawn of the gods. Now only five remain carved in any temple or shrine. Someone was erased, not forgotten. There is a difference."',
  },
  {
    id: 'lore_vanaraksha_kill', region: 1, source: 'boss', bossKey: 'vanaraksha',
    title: "The Guardian's Secret",
    text: '⟨Lore Fragment⟩ Vanaraksha was not merely guarding the forest. He was protecting the remains of a shrine that once honored the forgotten sixth god — Ekatmadeva, keeper of the bond between all souls.',
  },
  {
    id: 'lore_mahavana_roots', region: 1, source: 'world',
    title: 'The Carved Roots',
    text: '⟨Lore Fragment⟩ Beneath the ancient tree roots, old script reads: "Here stood the temple of Ekatmadeva, keeper of the bond between all souls. Do not let them erase him. Do not let them call him monster."',
  },

  // ── Region 2 — Vrindavana (3 fragments) ───────────────────────────────
  {
    id: 'lore_sage_first', region: 2, source: 'npc', npcId: 'vrindavana_sage',
    title: 'The Mural With Six Halos',
    text: '⟨Lore Fragment⟩ The sage points to the mural: "Six halos. Six thrones. One scraped away so deeply the stone still bleeds. Someone feared what this face knew — or what it would make others remember."',
  },
  {
    id: 'lore_vanasur_kill', region: 2, source: 'boss', bossKey: 'vanasur',
    title: "The Grove's True Guardian",
    text: '⟨Lore Fragment⟩ Vanasur was not merely corrupting the grove. He was drawn to the power that still emanated from a hidden shrine — the last sanctuary of Ekatmadeva, defaced but not destroyed.',
  },
  {
    id: 'lore_grove_mural', region: 2, source: 'world',
    title: 'The Six-Halo Mural',
    text: '⟨Lore Fragment⟩ The mural shows a circle of gods. One figure stands apart, arms outstretched — not attacking, but embracing. The face has been destroyed. The posture has not. He was not a threat. He was a protector.',
  },

  // ── Region 3 — Nāga Pātāl (3 fragments) ──────────────────────────────
  {
    id: 'lore_oracle_first', region: 3, source: 'npc', npcId: 'naga_oracle',
    title: "The Prison's True Builders",
    text: '⟨Lore Fragment⟩ The oracle whispers: "The prison here was built by divine hands — not to contain a monster, but to silence a truth. Ekatmadeva was not conquered. He was sealed. A prison made by gods, not earned by demons."',
  },
  {
    id: 'lore_nagraj_kill', region: 3, source: 'boss', bossKey: 'nagraj_kaliya',
    title: "The Threshold's Purpose",
    text: '⟨Lore Fragment⟩ Nagraj Kaliya guarded the threshold because no mortal was meant to learn what was buried beyond it — the first-person testimony of a god who watched himself be renamed into a villain.',
  },
  {
    id: 'lore_drowned_reliquary', region: 3, source: 'world',
    title: 'The Drowned Reliquary',
    text: '⟨Lore Fragment⟩ The water-logged tablet reads: "By our hands it was done. By our hands it shall be remembered as righteous. The people must never know it was fear, not justice, that moved us. — The Five."',
  },

  // ── Region 4 — Deva Mandira (3 fragments) ─────────────────────────────
  {
    id: 'lore_priest_first', region: 4, source: 'npc', npcId: 'temple_priest',
    title: "The Priest's Confession",
    text: '⟨Lore Fragment⟩ The priest\'s voice breaks: "The vault mural shows five gods raising weapons against a sixth. The sixth is not attacking. He is kneeling. Asking them to stop. The records we were given are false."',
  },
  {
    id: 'lore_pashana_kill', region: 4, source: 'boss', bossKey: 'pashana_daitya',
    title: 'The Stone Lock',
    text: '⟨Lore Fragment⟩ Pashana Daitya was a stone lock placed upon a deeper sin — the vault beneath the temple where the gods\' crime was recorded in gold and then buried under their own sacred ground.',
  },
  {
    id: 'lore_vault_mural', region: 4, source: 'world',
    title: 'The Vault Mural',
    text: '⟨Lore Fragment⟩ The vault mural glows gold. Ekatmadeva kneels. Suryadeva raises his hand. The inscription at the base reads: "He asked only for the people to remain whole. We could not allow that. Unity is power. Power must be governed."',
  },

  // ── Region 5 — Swarga Seema (3 fragments) ─────────────────────────────
  {
    id: 'lore_apsara_first', region: 5, source: 'npc', npcId: 'apsara_guide',
    title: 'The Name Beneath the Seal',
    text: '⟨Lore Fragment⟩ The apsara reads the cloud seal inscription: "These seals predate every temple in the world. The name beneath them is not Viyogasur — the Demon of Separation. It is Ekatmadeva — the Keeper of Willing Bonds."',
  },
  {
    id: 'lore_vayu_kill', region: 5, source: 'boss', bossKey: 'vayu_rakshasa',
    title: 'What the Sky Defended',
    text: '⟨Lore Fragment⟩ Vayu Rakshasa defended the sky not from invaders, but from truth — the inscriptions on the cloud bridges that name the sixth god in the language that predates the gods\' own rewriting of history.',
  },
  {
    id: 'lore_cloud_inscription', region: 5, source: 'world',
    title: 'The Cloud Council',
    text: '⟨Lore Fragment⟩ The cloud crystal refracts a memory: a council of gods, five figures, one empty seat. Suryadeva speaks: "The seat was never empty. We chose to call it so. History belongs to those who write it last."',
  },

  // ── Region 6 — Viyoga Durga (3 fragments) ─────────────────────────────
  {
    id: 'lore_akhand_first', region: 6, source: 'npc', npcId: 'akhand_voice',
    title: "The Voice's Testimony",
    text: '⟨Lore Fragment⟩ The Voice speaks: "He held the thread together when the heavens began to fear it. He was not rewarded. He was renamed. He was made into the very thing he fought against — so the gods could call themselves the ones who stopped it."',
  },
  {
    id: 'lore_viyogasur_kill', region: 6, source: 'boss', bossKey: 'viyogasur',
    title: 'Ekatmadeva Unmasked',
    text: '⟨Lore Fragment⟩ Viyogasur. The Demon of Separation. He who was renamed. Ekatmadeva — the god who refused to let the powerful own the bonds between souls. This was his crime. This was his punishment. This was their lie.',
  },
  {
    id: 'lore_prison_stone', region: 6, source: 'world',
    title: 'The Prison Echo Stone',
    text: '⟨Lore Fragment⟩ The stone whispers: "I did not destroy the thread. I was punished for protecting it. The gods called me a demon because I refused to become their instrument. Remember this. Tell it to those who come after. The truth is not dead. It is only waiting."',
  },
];
