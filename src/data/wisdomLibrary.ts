import { DailyWisdomItem, MoodType, WisdomStream } from "../types";

export const WISDOM_LIBRARY: DailyWisdomItem[] = [
  // =========================================================================
  // 🪔 BHAGAVAD GITA (Authentic Public Domain: Swarupananda / Sivananda / Besant)
  // =========================================================================
  {
    id: "gita_2_47",
    stream: "gita",
    source: "Bhagavad Gita 2.47",
    authorOrTradition: "Bhagavad Gita",
    originalText: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥",
    transliteration: "karmaṇy-evādhikāras te mā phaleṣu kadācana |\nmā karma-phala-hetur bhūr mā te saṅgo 'stvakarmaṇi ||",
    translation:
      "You have a right only to perform your prescribed duty, never to its fruits. Let not the fruits of action be your motive, nor let your attachment be to inaction.",
    contextBridge:
      "When feeling overwhelmed by targets and outcomes, redirect 100% of your energy into the craftsmanship of this present task. Let go of future anxieties.",
    moods: ["overwhelmed", "determined", "reflective"],
    theme: "Duty Without Anxiety (Nishkama Karma)",
  },
  {
    id: "gita_2_14",
    stream: "gita",
    source: "Bhagavad Gita 2.14",
    authorOrTradition: "Bhagavad Gita",
    originalText: "मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः ।\nआगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत ॥",
    transliteration: "mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ |\nāgamāpāyino 'nityās tāṁs titikṣasva bhārata ||",
    translation:
      "The contact of the senses with their objects gives rise to cold and heat, pleasure and pain. They come and go and are impermanent. Endure them with equanimity.",
    contextBridge:
      "Remind yourself that emotional heaviness is like passing weather across an open sky. You have the inner stillness to observe it without being swept away.",
    moods: ["melancholic", "overwhelmed", "reflective"],
    theme: "Endurance & Impermanence (Titiksha)",
  },
  {
    id: "gita_6_5",
    stream: "gita",
    source: "Bhagavad Gita 6.5",
    authorOrTradition: "Bhagavad Gita",
    originalText: "उद्धरेदात्मनात्मानं नात्मानमवसादयेत् ।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ॥",
    transliteration: "uddhared ātmanātmānaṁ nātmānam avasādayet |\nātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ ||",
    translation:
      "Let a person elevate oneself by one's own mind, and not degrade oneself. For the mind alone is one's friend, and the mind alone is one's enemy.",
    contextBridge:
      "Be a gentle friend to your own mind today. Replace harsh self-criticism with patient, encouraging self-dialogue.",
    moods: ["hopeful", "reflective", "determined"],
    theme: "Mastery & Befriending the Mind (Atma-Mitra)",
  },
  {
    id: "gita_2_70",
    stream: "gita",
    source: "Bhagavad Gita 2.70",
    authorOrTradition: "Bhagavad Gita",
    originalText: "आपूर्यमाणमचलप्रतिष्ठं समुद्रमापः प्रविशन्ति यद्वत् ।\nतद्वत्कामा यं प्रविशन्ति सर्वे स शान्तिमप्नोति न कामकामी ॥",
    transliteration: "āpūryamāṇam acala-pratiṣṭhaṁ samudram āpaḥ praviśanti yadvat |\ntadvat kāmā yaṁ praviśanti sarve sa śāntim āpnoti na kāma-kāmī ||",
    translation:
      "As the ocean remains undisturbed while rivers continuously flow into it, so does the peaceful person remain unshaken when desires and thoughts enter the mind.",
    contextBridge:
      "You do not need to silence the bustling world to feel peace; hold your center like the deep ocean, allowing outer events to flow past without displacing you.",
    moods: ["peaceful", "content", "reflective"],
    theme: "Oceanic Stillness & Equanimity (Samatvam)",
  },
  {
    id: "gita_12_15",
    stream: "gita",
    source: "Bhagavad Gita 12.15",
    authorOrTradition: "Bhagavad Gita",
    originalText: "यस्मान्नोद्विजते लोको लोकान्नोद्विजते च यः ।\nहर्षामर्षभयोद्वेगैर्मुक्तो यः स च मे प्रियः ॥",
    transliteration: "yasmān nodvijate loko lokān nodvijate ca yaḥ |\nharṣāmarṣa-bhayodvegair mukto yaḥ sa ca me priyaḥ ||",
    translation:
      "He by whom the world is not agitated, and who is not agitated by the world, who is freed from joy, envy, fear, and anxiety—he is dear to Me.",
    contextBridge:
      "Protect your sacred inner space today: refuse to disturb others with tension, and refuse to let external reactivity disturb your gentle poise.",
    moods: ["peaceful", "grateful", "content"],
    theme: "Freedom from Agitation (Prasada)",
  },
  {
    id: "gita_18_54",
    stream: "gita",
    source: "Bhagavad Gita 18.54",
    authorOrTradition: "Bhagavad Gita",
    originalText: "ब्रह्मभूतः प्रसन्नात्मा न शोचति न काङ्क्षति ।\nसमः सर्वेषु भूतेषु मद्भक्तिं लभते पराम् ॥",
    transliteration: "brahma-bhūtaḥ prasannātmā na śocati na kāṅkṣati |\nsamaḥ sarveṣu bhūteṣu mad-bhaktiṁ labhate parām ||",
    translation:
      "Becoming established in the Supreme, serene-minded, one neither grieves nor craves. Regarding all beings with equal vision, one attains supreme peace.",
    contextBridge:
      "Celebrate contentment with what you already have today. True wealth is an absence of constant grasping and grief over what has passed.",
    moods: ["grateful", "peaceful", "content"],
    theme: "Serenity & Contentment (Prasannatma)",
  },
  {
    id: "gita_6_26",
    stream: "gita",
    source: "Bhagavad Gita 6.26",
    authorOrTradition: "Bhagavad Gita",
    originalText: "यतो यतो निश्चरति मनश्चञ्चलमस्थिरम् ।\nततस्ततो नियम्यैतदात्मन्येव वशं नयेत् ॥",
    transliteration: "yato yato niścarati manaś cañcalam asthiram |\ntatas tato niyamyaitad ātmanyeva vaśaṁ nayet ||",
    translation:
      "From whatever cause the restless and unsteady mind wanders away, from that let him bring it back and place it under the control of the Self alone.",
    contextBridge:
      "Whenever you catch your attention straying toward worry or comparison today, gently—without anger—bring it back to this present moment.",
    moods: ["curious", "reflective", "determined"],
    theme: "Gentle Mindful Refocusing (Abhyasa)",
  },
  {
    id: "gita_10_20",
    stream: "gita",
    source: "Bhagavad Gita 10.20",
    authorOrTradition: "Bhagavad Gita",
    originalText: "अहमात्मा गुडाकेश सर्वभूताशयस्थितः ।\nअहमादिश्च मध्यं च भूतानामन्त एव च ॥",
    transliteration: "aham ātmā guḍākeśa sarva-bhūtāśaya-sthitaḥ |\naham ādiś ca madhyaṁ ca bhūtānām anta eva ca ||",
    translation:
      "I am the Self, O Gudakesha, seated in the hearts of all creatures. I am the beginning, the middle, and the end of all beings.",
    contextBridge:
      "Look for the sacred spark in everyone you interact with today. Acknowledge your own creative spark as part of the vast tapestry of life.",
    moods: ["inspired", "curious", "hopeful"],
    theme: "Universal Interconnection (Sarva-Bhuta)",
  },
  {
    id: "gita_3_30",
    stream: "gita",
    source: "Bhagavad Gita 3.30",
    authorOrTradition: "Bhagavad Gita",
    originalText: "मयि सर्वाणि कर्माणि संन्यस्याध्यात्मचेतसा ।\nनिराशीर्निर्ममो भूत्वा युध्यस्व विगतज्वरः ॥",
    transliteration: "mayi sarvāṇi karmāṇi sannyasyādhyātma-cetasā |\nnirāśīr nirmamo bhūtvā yudhyasva vigata-jvaraḥ ||",
    translation:
      "Surrendering all actions to higher purpose, with the mind fixed on the inner Self, free from expectation and selfishness, engage in your work free from feverishness.",
    contextBridge:
      "Work with devotion rather than stress. Doing your best without ego makes even complex challenges feel light and meaningful.",
    moods: ["determined", "inspired", "hopeful"],
    theme: "Action Free from Feverishness (Vigata-Jvara)",
  },

  // =========================================================================
  // 🏛️ STOIC PHILOSOPHY (Public Domain: Marcus Aurelius / Epictetus / Seneca)
  // =========================================================================
  {
    id: "stoic_marcus_4_3",
    stream: "stoic",
    source: "Marcus Aurelius · Meditations 4.3",
    authorOrTradition: "Stoic Wisdom",
    translation:
      "People look for retreats for themselves, in the country, by the coast, or in the hills. There is nowhere that a person can find a more peaceful and trouble-free retreat than in their own mind.",
    contextBridge:
      "You don't need a far-off vacation to find stillness. Return to your quiet center whenever today feels chaotic.",
    moods: ["overwhelmed", "peaceful", "reflective"],
    theme: "The Inner Citadel",
  },
  {
    id: "stoic_epictetus_ench_1",
    stream: "stoic",
    source: "Epictetus · Enchiridion 1.1",
    authorOrTradition: "Stoic Wisdom",
    translation:
      "Some things are in our control and others not. Things in our control are opinion, pursuit, desire, aversion, and whatever are our own actions. Things not in our control are body, property, reputation, and whatever are not our own actions.",
    contextBridge:
      "Draw a clear line today: invest your precious focus solely in your choices, kindness, and effort; release what others say or do.",
    moods: ["overwhelmed", "determined", "reflective"],
    theme: "Dichotomy of Control",
  },
  {
    id: "stoic_seneca_prov_4",
    stream: "stoic",
    source: "Seneca · Letters to Lucilius 13",
    authorOrTradition: "Stoic Wisdom",
    translation:
      "We suffer more often in imagination than in reality. What I advise you to do is, not to be unhappy before the crisis comes.",
    contextBridge:
      "Notice how much energy is spent worrying about things that may never happen. Bring your feet back onto solid ground right now.",
    moods: ["melancholic", "overwhelmed", "hopeful"],
    theme: "Releasing Imagined Sufferings",
  },
  {
    id: "stoic_marcus_2_1",
    stream: "stoic",
    source: "Marcus Aurelius · Meditations 2.1",
    authorOrTradition: "Stoic Wisdom",
    translation:
      "When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good.",
    contextBridge:
      "Respond to difficult people with patience rather than resentment. Their friction cannot harm your integrity unless you let it.",
    moods: ["reflective", "content", "determined"],
    theme: "Compassionate Resilience",
  },
  {
    id: "stoic_seneca_happy",
    stream: "stoic",
    source: "Seneca · On the Shortness of Life",
    authorOrTradition: "Stoic Wisdom",
    translation:
      "Life is long if you know how to use it. It is not that we have a short time to live, but that we waste a lot of it.",
    contextBridge:
      "Treat today's hours like golden coins. Spend them deliberately on what brings true warmth, creativity, and connection.",
    moods: ["inspired", "curious", "determined"],
    theme: "Conscious Time & Presence",
  },
  {
    id: "stoic_marcus_grateful",
    stream: "stoic",
    source: "Marcus Aurelius · Meditations 7.27",
    authorOrTradition: "Stoic Wisdom",
    translation:
      "Treat what you have as though it were already a blessing. Count your blessings and notice how much you would yearn for them if they were not yours.",
    contextBridge:
      "Pause and admire the simple comforts in your life today—warm water, shelter, quiet morning air—that we so easily take for granted.",
    moods: ["grateful", "peaceful", "content"],
    theme: "Appreciating the Present Blessing",
  },

  // =========================================================================
  // 🪷 BUDDHIST MINDFULNESS (Public Domain: Dhammapada / Sutta Translations)
  // =========================================================================
  {
    id: "buddhism_dhammapada_1",
    stream: "buddhism",
    source: "Dhammapada v. 1–2",
    authorOrTradition: "Dhammapada",
    originalText: "मनोपुब्बङ्गमा धम्मा मनोसेट्ठा मनोमया ।\nमनसा चे पदुट्ठेन भासति वा करोति वा ।\nततो नं दुक्खमन्वेति चक्कं व वहतो पदं ॥",
    transliteration: "manopubbaṅgamā dhammā manoseṭṭhā manomayā |\nmanasā ce paduṭṭhena bhāsati vā karoti vā |\ntato naṁ dukkhamanveti cakkaṁ va vahato padaṁ ||",
    translation:
      "Mind precedes all mental states. Mind is their chief; they are all mind-wrought. If with a pure mind a person speaks or acts, happiness follows him like his never-departing shadow.",
    contextBridge:
      "Tend to the garden of your mind first today. When your thoughts are rooted in kindness and gentleness, your actions naturally bring peace.",
    moods: ["peaceful", "reflective", "inspired"],
    theme: "Primordial Power of Mind",
  },
  {
    id: "buddhism_dhammapada_103",
    stream: "buddhism",
    source: "Dhammapada v. 103",
    authorOrTradition: "Dhammapada",
    originalText: "यो सहस्सं सहस्सेन सङ्गामे मानुसे जिने ।\nएकञ्च जेय्यमत्तानं स वे सङ्गामजुत्तमो ॥",
    transliteration: "yo sahassaṁ sahassena saṅgāme mānuse jine |\nekañca jeyyamattānaṁ sa ve saṅgāmajuttamo ||",
    translation:
      "Though one may conquer a thousand times a thousand men in battle, yet he indeed is the noblest victor who conquers himself alone.",
    contextBridge:
      "Mastery is not dominating external circumstances, but calmly mastering your own reactions, habits, and impulses with patience.",
    moods: ["determined", "hopeful", "reflective"],
    theme: "Self-Mastery Over External Strife",
  },
  {
    id: "buddhism_metta",
    stream: "buddhism",
    source: "Metta Sutta (Karaniya Sutta)",
    authorOrTradition: "Mindful Compassion",
    translation:
      "Just as a mother protects her only child with her life, even so let one cultivate a boundless heart toward all living beings, radiating kindness over the entire world.",
    contextBridge:
      "Extend unconditional kindness to yourself first, and let that soft warmth overflow effortlessly to everyone you meet today.",
    moods: ["grateful", "peaceful", "melancholic"],
    theme: "Boundless Loving-Kindness (Metta)",
  },
  {
    id: "buddhism_dhammapada_water",
    stream: "buddhism",
    source: "Dhammapada v. 122",
    authorOrTradition: "Dhammapada",
    translation:
      "Do not underestimate good, saying, 'It will not come to me.' Even a water jar is filled by drops of water falling one by one. The wise person fills themselves with good, gathering it little by little.",
    contextBridge:
      "Every small mindful ritual, single glass of water, or kind sentence you write today is quietly filling your reservoir of peace.",
    moods: ["content", "hopeful", "curious"],
    theme: "Accumulation of Micro-Moments",
  },

  // =========================================================================
  // 🧠 PSYCHOLOGICAL REFRAMING (CBT / ACT / Self-Compassion Principles)
  // =========================================================================
  {
    id: "psych_defusion",
    stream: "psychology",
    source: "Cognitive Defusion · ACT Science",
    authorOrTradition: "Modern Psychological Wisdom",
    translation:
      "Thoughts are merely passing words and mental events in the mind, not commands to obey or absolute truths to fear. You are the open sky in which thoughts float.",
    contextBridge:
      "Notice your worries today as simple clouds passing across your consciousness. You don't have to fight them; simply let them float by.",
    moods: ["overwhelmed", "melancholic", "reflective"],
    theme: "Cognitive Defusion & Observing Ego",
  },
  {
    id: "psych_self_compassion",
    stream: "psychology",
    source: "Self-Compassion Principle (Dr. Kristin Neff)",
    authorOrTradition: "Compassion Science",
    translation:
      "Suffering and imperfection are part of the shared human experience. Treating yourself with kindness when stumbling is what builds true resilience.",
    contextBridge:
      "Give yourself permission to be human today. When something doesn't go smoothly, place a hand over your heart and speak with warm encouragement.",
    moods: ["melancholic", "overwhelmed", "reflective"],
    theme: "Shared Humanity & Self-Kindness",
  },
  {
    id: "psych_growth_mindset",
    stream: "psychology",
    source: "Neuroplasticity & Growth Mindset",
    authorOrTradition: "Mindset Science",
    translation:
      "The brain is like a muscle that strengthens with every curious attempt. Difficulty is not a verdict of inadequacy, but the active process of learning.",
    contextBridge:
      "Reframe friction as growth in disguise. You are adapting, evolving, and building mental strength with every challenge faced.",
    moods: ["curious", "inspired", "determined"],
    theme: "Growth & Adaptive Plasticity",
  },
  {
    id: "psych_somatic_grounding",
    stream: "psychology",
    source: "Polyvagal Safety & Somatic Grounding",
    authorOrTradition: "Somatic Psychology",
    translation:
      "When the body feels safe, the mind can rest. A lengthened exhale and relaxed shoulders signal your nervous system that you are safe in this moment.",
    contextBridge:
      "Take one deep breath in, drop your shoulders away from your ears, and exhale slowly. Your nervous system is finding its natural equilibrium.",
    moods: ["peaceful", "content", "grateful"],
    theme: "Physiological Regulation & Presence",
  },
];

/**
 * Speak the wisdom out loud using the browser's Web Speech Synthesis API.
 * Reads the source, translation, and practical guidance in a calm, clear cadence.
 */
export function speakWisdom(
  wisdom: DailyWisdomItem,
  onEnd?: () => void,
  onError?: () => void
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onError?.();
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Construct calming speech narration
  let narration = `${wisdom.source}. `;
  if (wisdom.transliteration) {
    // Add transliteration if present for phonetic guidance
    narration += `${wisdom.transliteration}. `;
  }
  narration += `"${wisdom.translation}" `;
  narration += `Why this helps today: ${wisdom.contextBridge}`;

  const utterance = new SpeechSynthesisUtterance(narration);
  utterance.rate = 0.9; // Slightly slower, serene contemplative pace
  utterance.pitch = 1.0;

  // Try to pick a natural, gentle voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (v) =>
      (v.lang.startsWith("en") &&
        (v.name.includes("Natural") ||
          v.name.includes("Serena") ||
          v.name.includes("Samantha") ||
          v.name.includes("Daniel") ||
          v.name.includes("Google UK English Female") ||
          v.name.includes("Google US English"))) ||
      v.lang.startsWith("en")
  );
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = () => {
    onError?.();
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Stop any current speech synthesis
 */
export function stopSpeakingWisdom(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Sound synthesizer: Play a calming harmonic Tibetan singing bowl / meditation chime
 */
export function playMeditationChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Fundamental Tone (A4 = 432Hz harmonic / 216Hz grounding)
    const baseFreq = 216;

    // Harmonics for a rich singing bowl texture
    const frequencies = [baseFreq, baseFreq * 2.76, baseFreq * 5.4, baseFreq * 8.9];
    const gains = [0.22, 0.08, 0.03, 0.01];

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(gains[i], now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 3.3);
    });
  } catch (err) {
    console.warn("Could not play meditation chime:", err);
  }
}

/**
 * Retrieve the best matching wisdom item for an entry based on mood, preferred stream, and cycle offset.
 */
export function getDailyWisdom(
  mood: MoodType = "peaceful",
  stream: WisdomStream = "all",
  cycleOffset = 0
): DailyWisdomItem {
  // 1. Filter by tradition stream
  let candidates =
    stream === "all"
      ? WISDOM_LIBRARY
      : WISDOM_LIBRARY.filter((item) => item.stream === stream);

  if (candidates.length === 0) {
    candidates = WISDOM_LIBRARY;
  }

  // 2. Filter by mood match
  const moodMatched = candidates.filter((item) => item.moods.includes(mood));
  const pool = moodMatched.length > 0 ? moodMatched : candidates;

  // 3. Select with cycle offset
  const index = Math.abs(cycleOffset) % pool.length;
  return pool[index];
}
