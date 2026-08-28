export const QUESTS = {
  // ─── Main Quests ───────────────────────────────────────────────
  gramavana_main: {
    id: 'gramavana_main', type: 'main',
    title: "The Elder's Warning",
    desc: 'Elder Mahesh speaks of Viyogasur and the breaking of the Akhand Sutra. He believes the old stories may hide broken lies.',
    trigger: 'npc_talk:elder_mahesh', complete: 'portal_unlock:7', reward: null,
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
    reward: null,
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
    reward: null,
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
    reward: null,
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
    first:     '⟨Elder Mahesh⟩ "You stand on sacred ground, child. Long ago, a living thread — the Akhand Sutra — bound every soul to every other. People felt each other\'s grief, shared each other\'s joy. Now that thread is broken, and fear grows where memory should live."',
    active:    '⟨Elder Mahesh⟩ "There are whispers of Viyogasur again. The old stories say he shattered the thread out of hatred. But I have lived long enough to know: when a story is told by those who benefited from it, it is worth questioning. The gods wrote Viyogasur\'s guilt into every temple. Ask yourself — why would the guilty need to be so loudly named?"',
    completed: '⟨Elder Mahesh⟩ "You hear the world more clearly than most. That is the beginning of wisdom. The Akhand Sutra is not gone — it waits beneath everything, like a root system that outlived the tree. Keep walking. Keep questioning. The truth will not come to you. You must walk all the way to it."',
  },
  gramavana_villager: {
    first:     '⟨Rukmini⟩ "Oh! You must be the ones the elder spoke of — warriors who came to set things right. The rakshasas in the forest took our healing herbs. Our children burn with fever and we have nothing left to give them. Please — clear the forest path and the herbs will be free again."',
    active:    '⟨Rukmini⟩ "Please hurry. Three children have not slept in two days. The rakshasas nest near the old grove — some say that grove used to be a shrine, before the gods removed a name from it. Strange that the beasts settled there of all places."',
    completed: '⟨Rukmini⟩ "Bless you both. My daughter is already breathing easier. You know, she keeps asking why the shrine in that grove has only five carvings but six pedestals. Children notice things we train ourselves to ignore."',
  },
  village_warrior: {
    first:     '⟨Arjun, Village Guard⟩ "So — the elder\'s chosen ones. Before you go further, let me arm you with knowledge. Press J to strike light, K for a heavy blow. Shift to dodge — time it perfectly and you\'ll feel time slow. Q, E, and R trigger your special abilities. Now — go east and test yourself on those rakshasas. Return when you\'ve drawn real blood."',
    active:    '⟨Arjun⟩ "One lesson most warriors never learn: dodge into their attacks, not away. A perfect parry refills your stamina and empowers your next strike. The Akhand Sutra said the same — connection is not comfort. Sometimes it means stepping toward the thing that frightens you."',
    completed: '⟨Arjun⟩ "You fight well. Clean, purposeful, no wasted motion. I had a mentor once who said the thread of combat is the same as the thread of the world — it rewards attention and punishes arrogance. He must have known something of the old lore."',
  },
  village_child: {
    first:     '⟨Kavi, Village Child⟩ "My grandmother says there used to be six gods, not five. She says the sixth one loved people most of all — so much he made a thread that let everyone feel everyone else. But the temple only shows five. Why would a god who made something so beautiful just disappear?"',
    active:    '⟨Kavi⟩ "I asked the priest why there are only five gods and he told me to stop asking questions like that. But if someone erased a god, maybe they were afraid of what that god knew — or what people would do if they remembered him."',
    completed: '⟨Kavi⟩ "You saved everyone! I knew you would. My grandmother says the real warriors are the ones who ask why before they swing. She says if the sixth god ever comes back, it won\'t be through a sword — it will be through someone finally remembering his real name."',
  },
  village_healer: {
    first:     '⟨Devi, Village Healer⟩ "When people grieve, they think their pain belongs only to them. But the Akhand Sutra — the Unbroken Thread — taught otherwise. While it lived, a widow\'s sorrow reached the whole village, and the village reached back. We healed because we remembered we were not alone. Now that it is broken, people grieve in silence, and silence becomes rot."',
    active:    '⟨Devi⟩ "If you find old shrines on your path, do not trust the names carved into them. Three generations ago, the priests came through and re-carved every shrine — replacing six-pointed stars with five-pointed ones, melting one name from every listing. Many truths were buried under fresh prayer. The stone remembers even when the carving is gone."',
    completed: '⟨Devi⟩ "You\'ve done good work today. Now breathe. You are carrying less than before — less doubt, less noise. That matters more than you know. The healers of the old world said the thread could be felt in silence first. Whatever you\'re chasing, let yourself be quiet long enough to feel where it pulls."',
  },
  mahavana_hermit: {
    first:     '⟨Hermit Veda⟩ "I do not worship the gods anymore. I study what they left behind when they lied. Thirty years I spent copying sacred texts — until I found a passage that had been deliberately mistranslated across every temple. \'He who severed the thread\' — the original word was not \'severed.\' It was \'refused to surrender.\' That is the day I stopped praying and started digging."',
    active:    '⟨Hermit Veda⟩ "This forest remembers a god that the temples forgot. Find the carved roots beneath the ancient tree — they predate the temples by at least a thousand years. You will find six figures in the bark, not five. Do not trust the first face you see on the path. The beasts here were not always beasts. Corruption is often a wound, not a birth."',
    completed: '⟨Hermit Veda⟩ "You found it. Good. Now understand what you are looking at: Vanaraksha is not a demon. He is a guardian corrupted by proximity to a lie too large to hold. When the gods erased Ekatmadeva, the forest that worshipped him began to rot from the inside. Every beast you have fought here is a casualty of that erasure, not a villain."',
  },
  forest_scholar: {
    first:     '⟨Scholar Priya⟩ "Every kingdom edits its past. But when gods do it, the edits become doctrine. I have spent years cross-referencing temple records against pre-temple inscriptions. In every region, there is the same gap: a missing symbol, a melted face, a name replaced with a slur. The pattern is too consistent to be coincidence. Someone systematically rewrote the divine record."',
    active:    '⟨Scholar Priya⟩ "Look carefully at the carved markers in this forest. Six symbols were here once — each representing one of the original six divine forces. Now only five remain. That is not erosion. That is a removal. The missing symbol always appears in the same position: the center. Whatever was erased was not peripheral. It was the axis around which the others turned."',
    completed: '⟨Scholar Priya⟩ "You\'ve recovered the inscription fragment. This is what I needed. It names the erased god — not Viyogasur, but Ekatmadeva. \'Ekatma\' means \'one soul.\' He was the god of connection itself. And the five gods who erased him were the very ones who benefited most from connection being broken."',
  },
  lost_merchant: {
    first:     '⟨Merchant Gopal⟩ "I sell rope, candles, maps, and charms. The charms are fake, I\'ll be honest — just carved wood soaked in incense. But the maps are real. I traced the old thread-roads myself, the paths pilgrims used before the gods changed the official routes. They always lead to the same place: a site that isn\'t on any temple map."',
    active:    '⟨Merchant Gopal⟩ "Those rakshasas took my cargo — three sealed jars I was hired to deliver. I didn\'t ask what was inside, but one cracked when they grabbed it and I saw scrolls. Old ones. The kind with six-pointed seals, not five. Please hurry — whoever hired me to carry those scrolls does not seem like someone patient."',
    completed: '⟨Merchant Gopal⟩ "Grateful — truly. You know, some travelers say the same dream follows them across regions: a silver thread, a voice, a broken crown in a sealed room. I\'ve heard that dream described by a woman in the swamp, a monk in the mountains, and a sailor who\'d never left the coast. Whatever that dream is, it\'s not random. Something is trying to be remembered."',
  },
  vrindavana_sage: {
    first:     '⟨Sage Ananta⟩ "You seek the truth? Then learn this first: truth does not arrive as a revelation. It arrives as contradiction. You will feel it when something you were told to believe bumps against something you have seen with your own eyes. Do not resolve the contradiction quickly. Sit inside it. Let it teach you the shape of what was hidden."',
    active:    '⟨Sage Ananta⟩ "In the eastern grove lies a mural older than every temple in this region. The priests built a wall in front of it three hundred years ago and told people the mural depicted heresy. Defeat the corrupted beasts that now nest there, and you will see what the wall was meant to hide. The stone will speak more clearly than any scripture."',
    completed: '⟨Sage Ananta⟩ "There — do you see it? Six halos. Six thrones. One halo was scraped away so deeply the stone itself still bleeds rust where the tool cut. And beneath the damaged stone, if you look at the angle of the shadow: the outline of a figure who was not standing apart from the others. He was at the center. He was the reason they were gathered."',
  },
  vrindavana_dancer: {
    first:     '⟨Dancer Ishani⟩ "I dance to keep memory alive. Steps are safer than scripture — scripture can be changed, burned, re-translated. But the body remembers. The oldest dance forms in this region have six movements in their opening sequence. Every formal temple version has five. The sixth movement was removed. I still perform it, alone, at night. It is the most beautiful of all of them."',
    active:    '⟨Dancer Ishani⟩ "When I perform the old sequence beneath the moon, I hear a hymn with six notes. The last note is always the lowest — not mournful, but settling, like the final stone placed in an arch. The arch cannot stand without it. The priests removed the last note and called the hymn complete. But a hymn without its root note is just sound pretending to be music."',
    completed: '⟨Dancer Ishani⟩ "The sacred pool reflected the full sequence tonight — every six movements, clear as breath on glass. In the water I saw a figure kneeling before five others, not in defeat. In offering. He was giving something to them freely — and they took it and used it against him. Not a monster. Not a madman. A sacrifice, calling itself a god."',
  },
  naga_oracle: {
    first:     '⟨Naga Oracle⟩ "You came to slay the serpent king — I see it in how you hold your weapons. But consider this: Nagraj Kaliya guards a door, not a throne. He has stood at this threshold for a thousand years, and he remembers what lies behind it. Perhaps the serpent king is the only one in this underworld who still knows the shape of the chain that was used to seal a god."',
    active:    '⟨Oracle⟩ "The oldest testimony in this world was not written in temples — it was drowned. When Ekatmadeva was sealed, his last words were spoken into water. The priests could not burn water. They tried to poison the river instead. Find the drowned reliquary at the deepest point and listen to what the current has been carrying for a thousand years."',
    completed: '⟨Oracle⟩ "I see it now. The prison was made by gods, not demons. Viyogasur is not a name — it is a sentence. Viyoga means separation. Sur means divine. They named him \'the divine separation\' and called it a title. It was a curse. His real name was Ekatmadeva — the god of union, of the thread, of the unbroken bond. And they sealed him because he refused to let them control what connection meant."',
  },
  naga_merchant: {
    first:     '⟨Merchant⟩ "Ah — warriors from above! A rare sight down here. I trade in things too old for the surface world to value. Help me recover the jal tears scattered when the rakshasas raided my camp, and I\'ll share what I know about this underworld\'s oldest secret. Fair trade — knowledge for effort."',
    active:    '⟨Merchant⟩ "Those jal tears are crystallized memory — they form where grief and truth mix with deep water. Every one I\'ve examined shows the same scene from a different angle: six gods in a circle, one at the center, and five hands reaching in. Each tear shows a different moment of the same betrayal. Together, they are a testimony no single temple could erase."',
    completed: '⟨Merchant⟩ "Excellent work. Here is what the tears showed me, assembled: Ekatmadeva did not break the thread. He refused to hand it over when the five gods demanded control of it. They wanted to use the thread as a leash — to rule through connection rather than free it. He said no. So they erased him and rewrote the fracture as his crime."',
  },
  temple_priest: {
    first:     '⟨Priest Vamadeva⟩ "The gods are benevolent, child. Their order protects the world from chaos. The five divine forces — Fire, Water, Wind, Earth, and Light — balance each other in eternal harmony. This is what we are taught. This is what we must believe. The temples were built to remind us of that harmony. The laws were written to preserve it."',
    active:    '⟨Priest Vamadeva⟩ "...Why do you carry that look? As if you have seen a lie standing on an altar. I have served this temple for forty years and I — beneath this vault is a chamber no priest is permitted to enter. The high priests say it contains \'materials dangerous to faith.\' I was never curious before. I am curious now. I cannot go there. But you can."',
    completed: '⟨Priest Vamadeva⟩ "No. No, this cannot be. The relief you uncovered shows six divine figures — and one face has been deliberately melted, not by time but by tools. The records beneath it name the erased god: Ekatmadeva. He is listed not as an enemy but as the originator of the Akhand Sutra — the thread the other five gods claimed to protect while they destroyed its maker. I have prayed in a lie for forty years."',
  },
  deva_guardian: {
    first:     '⟨Temple Guardian⟩ "The temple protects sacred law. Some doors are closed for the peace of the world — not as cruelty, but as mercy. There are truths that destabilize, that uproot faith, that leave people with nothing to hold. The gods understood this. Certain knowledge must remain sealed. That is the bargain that keeps order."',
    active:    '⟨Guardian⟩ "I was told never to ask why there are only five statues in the Hall of the Divine. I was told the sixth alcove was always empty — a space for contemplation. But I have spent years watching pilgrims stop in front of that empty space with a grief they cannot name. As if something in them remembers what was removed before they were born."',
    completed: '⟨Guardian⟩ "I know the answer now, and it is not peace. The sixth alcove held Ekatmadeva — the god of the unbroken thread. He was removed not because he was evil but because his existence was inconvenient. Connection without control threatened the order of the five. They feared him more than they feared chaos. So they made him the name of chaos itself."',
  },
  apsara_guide: {
    first:     '⟨Apsara⟩ "Heaven is not a place. It is a story the powerful tell to make obedience feel holy. I have lived in the divine realm for three thousand years and I have watched the story change seventeen times. Each revision erases something — a name, a record, a face from a mural. The most recent revision is the largest. An entire god, unmade."',
    active:    '⟨Apsara⟩ "Climb the windswept platforms above the cloudline and recover the cloud seals hidden at each summit. They were installed during the great revision — the moment the gods decided to remove Ekatmadeva\'s name from the celestial record. The seals are memory-locks: they suppress the resonance his name once left in the atmosphere. Remove them and the sky will remember."',
    completed: '⟨Apsara⟩ "Yes. The seals are ancient enough to predate every temple on the surface world. And beneath each one, carved into the original stone: the same name. Not Viyogasur — Ekatmadeva. The god of union. The maker of the Akhand Sutra. The one the five gods called \'demon of separation\' precisely because he refused to let them turn connection into control."',
  },
  deva_warrior: {
    first:     '⟨Deva Warrior⟩ "I have defended this sky for ages. Every enemy I faced, I believed I was protecting something sacred. Now I see how easy it is to fight bravely for a lie — if the lie is given a beautiful enough name. Duty is comfortable when you are never asked what it actually protects. I was never asked. That was deliberate."',
    active:    '⟨Warrior⟩ "A cloud crystal forms only when two hearts beat in perfect unity at the sacred resonance stones — no deception, no distance, just complete presence. The gods used to grant these as sacred gifts. They stopped when they realized the crystals only formed in the presence of Ekatmadeva\'s thread. Proof of his power, hidden in plain sight."',
    completed: '⟨Warrior⟩ "If the heavens lied once, deliberately, systematically, at cost — they lied again. And again. The question is not whether to trust the gods. It is what to build when you stop. You carry the thread now. Whether you restore it, break it, or remake it — the choice belongs to you, not them."',
  },
  akhand_voice: {
    first:     '⟨Voice in the Void⟩ "At last. You came far enough to hear the name they buried. I am what remains of Ekatmadeva — not a body, not a god, just the resonance of a name spoken into a void for a thousand years. I did not break the Akhand Sutra. I created it. And when the five demanded I surrender it so they could use connection as a leash, I refused. That refusal is why you are here."',
    active:    '⟨Voice⟩ "The five gods will tell you that freeing me means chaos — that the thread without governance is fire without a hearth. They are not entirely wrong. Unconstrained connection is as dangerous as its absence. But controlled connection is not freedom. It is a prettier cage. You must decide what the thread is for — before you touch it."',
    completed: '⟨Voice⟩ "You know now. The final prison is not stone — it is belief. As long as people believe the name Viyogasur, the seal holds. As long as the story stands, I am a demon. You are the first in a thousand years to arrive here having questioned the story. Whatever you choose next — restore, break, or rewrite — you choose freely. That is all I ever wanted for anyone."',
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

  // ── Region 17 — Whisper Mire (hidden, found by cross-referencing 3 NPCs) ──
  {
    id: 'lore_kardama_hollow', region: 17, source: 'world',
    title: 'The Hollow of Kardama',
    text: '⟨Lore Fragment⟩ Sunk beneath the widest pool, a half-buried tablet reads: "Ekatmadeva walked here once, before the naming. The mire remembers what the temples erased."',
  },
];
