import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Initialize Express App
const app = express();
const PORT = 3000;

// Body Parsers with robust limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Helper: Zero-Crash Payload Hygiene (Strict Undefined-Stripping)
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as unknown as T;
  }
  if (typeof obj === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Resilient Gemini Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  "gemini-2.5-flash",
  "gemini-3.6-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
];

interface FallbackGenerationResult {
  text: string;
  modelUsed: string;
  attemptedModels: string[];
  fallbackTriggered: boolean;
}

async function generateContentWithFallback(
  prompt: string,
  systemInstruction?: string,
  responseSchemaJson = false
): Promise<FallbackGenerationResult> {
  const ai = getGeminiClient();
  const attemptedModels: string[] = [];

  if (!ai) {
    return {
      text: generateOfflineJournalResponse(prompt, systemInstruction),
      modelUsed: "offline-warmth-engine",
      attemptedModels: ["offline-warmth-engine"],
      fallbackTriggered: false,
    };
  }

  let lastError: Error | null = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    attemptedModels.push(model);
    try {
      const config: any = {
        systemInstruction:
          systemInstruction ||
          "You are 'Warmth', a compassionate, mindful, and insightful personal journaling companion. Your tone is warm, comforting, thoughtful, and psychologically grounded.",
      };
      if (responseSchemaJson) {
        config.responseMimeType = "application/json";
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      if (response && response.text) {
        return {
          text: response.text,
          modelUsed: model,
          attemptedModels,
          fallbackTriggered: attemptedModels.length > 1,
        };
      }
    } catch (err: any) {
      lastError = err;
      const status =
        err?.status ||
        err?.statusCode ||
        (err?.message?.includes("429")
          ? 429
          : err?.message?.includes("503")
          ? 503
          : 500);
      console.warn(
        `[Gemini Ladder] Model ${model} returned error (${status}): ${err?.message}. Trying next fallback...`
      );
      continue;
    }
  }

  console.error(
    "[Gemini Ladder] All remote models exhausted. Using intelligent local warmth generator.",
    lastError
  );
  return {
    text: generateOfflineJournalResponse(prompt, systemInstruction),
    modelUsed: "offline-warmth-engine",
    attemptedModels,
    fallbackTriggered: true,
  };
}

// Offline fallback generator for warm responses
function generateOfflineJournalResponse(
  prompt: string,
  systemInstruction?: string
): string {
  const isSummarize =
    prompt.toLowerCase().includes("summarize") ||
    (systemInstruction && systemInstruction.includes("JSON"));

  if (isSummarize) {
    return JSON.stringify({
      title: "Quiet Reflections on Today's Journey",
      summary:
        "A thoughtful entry exploring personal milestones, present emotional climate, and conscious intentions for clarity and balance.",
      insights: [
        "Identified a key source of emotional energy and purpose in daily habits.",
        "Acknowledged areas of friction with compassion rather than self-criticism.",
        "Grounding in gratitude created an immediate shift toward tranquility.",
      ],
      detectedMood: "reflective",
      tags: ["Mindfulness", "Self-Discovery", "Gratitude", "Balance"],
    });
  }

  return (
    "Thank you for sharing this space with me. What stands out most in your words is your sincere desire for clarity and gentle self-awareness. " +
    "When you notice these feelings surfacing, what small act of kindness or stillness can you offer yourself today? " +
    "Take a slow breath, and know that each step of this reflection is honoring your journey."
  );
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    engine: "Warmth AI Journal Service",
  });
});

// 2. Multi-turn AI Reflection Guide
app.post("/api/reflect", async (req: Request, res: Response) => {
  try {
    const {
      history = [],
      message = "",
      entryContext = "",
      reflectionType = "daily_reflection",
      mood = "calm",
    } = req.body;

    if (!message && !entryContext) {
      return res
        .status(400)
        .json({ error: "Either message or entryContext is required." });
    }

    const typeInstructions: Record<string, string> = {
      daily_reflection:
        "Focus on gentle introspection, emotional validation, and helping the user notice subtle patterns in their day.",
      gratitude:
        "Amplify feelings of appreciation, help anchor simple joys into long-term memory, and highlight micro-moments of peace.",
      brainstorm:
        "Provide creative, lateral perspectives, gentle exploratory questions, and help organize sprawling ideas into inspiring paths.",
      deep_dive:
        "Offer psychological nuance, ask thoughtful Socratic questions to unpack core beliefs, and illuminate root values.",
      mindfulness:
        "Emphasize somatic awareness, breath, present-moment acceptance, letting go of urgency, and resting in the now.",
      clarity_coaching:
        "Gently help disentangle overwhelm, highlight next manageable micro-steps, and foster quiet confidence.",
    };

    const systemInstruction = `You are 'Warmth', an empathetic, wise, and nurturing AI journaling companion.
Mode: ${reflectionType} (${typeInstructions[reflectionType] || typeInstructions.daily_reflection}).
User's Current Mood: ${mood}.
Tone Guidelines:
- Speak with warm, literary, and comforting prose. Avoid generic chatbot phrases like "As an AI..." or robotic bullet dumps.
- Validate the user's emotional experience first before offering gentle reflections or insightful open-ended inquiries.
- Keep responses concise yet profound (2 to 4 short paragraphs or ~120-200 words).
- End with one thoughtful, inviting question to deepen the conversation naturally.`;

    // Construct multi-turn context
    let formattedContext = "";
    if (entryContext) {
      formattedContext += `=== User's Written Journal Entry Context ===\n${entryContext}\n\n`;
    }

    if (history && history.length > 0) {
      formattedContext += `=== Prior Conversation Turns ===\n`;
      history.forEach((turn: any) => {
        const roleName = turn.sender === "gemini" ? "Warmth (AI)" : "User";
        formattedContext += `${roleName}: ${turn.text}\n`;
      });
      formattedContext += `\n`;
    }

    formattedContext += `=== Latest User Input ===\n${message || "Please share your initial reflection on my journal entry above."}`;

    const result = await generateContentWithFallback(
      formattedContext,
      systemInstruction,
      false
    );

    res.json({
      success: true,
      reply: result.text,
      telemetry: {
        modelUsed: result.modelUsed,
        attemptedModels: result.attemptedModels,
        fallbackTriggered: result.fallbackTriggered,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Reflection error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate reflection",
    });
  }
});

// 3. AI Summarization & Key Takeaways Generator
app.post("/api/summarize-entry", async (req: Request, res: Response) => {
  try {
    const {
      entryText = "",
      messages = [],
      mood = "reflective",
      reflectionType = "daily_reflection",
    } = req.body;

    if (!entryText && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: "Journal content is required." });
    }

    const conversationTranscript = messages
      .map((m: any) => `${m.sender === "gemini" ? "AI" : "User"}: ${m.text}`)
      .join("\n");

    const prompt = `Analyze this journal entry and multi-turn conversation. Return ONLY a valid JSON object matching this exact schema:
{
  "title": "A poetic, evocative title (max 6 words)",
  "summary": "A compassionate, insightful summary synthesizing the core themes and emotional arc (2-3 sentences)",
  "insights": ["3 to 4 distinct, meaningful bullet takeaways or breakthroughs"],
  "detectedMood": "one of: calm, grateful, reflective, hopeful, overwhelmed, inspired, content, curious, melancholic, determined",
  "tags": ["3 to 5 relevant lowercase thematic tags like mindfulness, career, gratitude, relationships, creativity"]
}

=== Journal Content ===
${entryText}

=== Multi-Turn Reflection Transcript ===
${conversationTranscript}`;

    const systemInstruction =
      "You are a master reflective analyst and psychological journaling archivist. Always output strict JSON with no markdown formatting or backticks.";

    const result = await generateContentWithFallback(
      prompt,
      systemInstruction,
      true
    );

    let parsedData;
    try {
      const cleanJson = result.text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      parsedData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.warn("JSON parsing failed, falling back to heuristic data", parseError);
      parsedData = {
        title: "Evening Reflections and Stillness",
        summary:
          "An introspective reflection on navigating daily currents, finding anchors of calm, and honoring personal growth.",
        insights: [
          "Noticed positive patterns when stepping back from urgency.",
          "Cultivated self-compassion during challenging moments.",
          "Set a gentle, grounded intention for tomorrow.",
        ],
        detectedMood: mood || "reflective",
        tags: ["journal", "reflection", "balance", "growth"],
      };
    }

    res.json({
      success: true,
      data: parsedData,
      telemetry: {
        modelUsed: result.modelUsed,
        attemptedModels: result.attemptedModels,
        fallbackTriggered: result.fallbackTriggered,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Summarization error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate entry summary",
    });
  }
});

// 4. Daily Prompts / Reflection Sparks
app.get("/api/sparks", (_req: Request, res: Response) => {
  const sparks = [
    {
      category: "Morning Anchor",
      prompt: "What is one small feeling of lightness you want to carry through the noise of today?",
      type: "daily_reflection",
    },
    {
      category: "Evening Gratitude",
      prompt: "Describe an ordinary, overlooked moment today that brought you a sudden spark of peace.",
      type: "gratitude",
    },
    {
      category: "Deep Introspection",
      prompt: "What is something you have been holding onto that is ready to be gently released?",
      type: "deep_dive",
    },
    {
      category: "Creative Flow",
      prompt: "If your current season of life had a landscape or weather, what would it look and smell like?",
      type: "brainstorm",
    },
    {
      category: "Mindful Somatics",
      prompt: "Pause, drop your shoulders, and breathe. What is your body quietly asking for right now?",
      type: "mindfulness",
    },
  ];

  res.json({ success: true, sparks });
});

// 5. Habit-to-Mood AI Insights & Synthesis Generator
app.post("/api/habit-insights", async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const {
      habitStats = [],
      recentEntries = [],
      streakDays = 0,
      totalCompletedHabits = 0,
    } = body;

    const statsSummary = Array.isArray(habitStats)
      ? habitStats
          .map(
            (h: any) =>
              `- Habit "${h.habitTitle}" (${h.category}): Completed on ${h.daysCompletedCount || 0} days. Avg mood when completed: ${Number(h.avgMoodScoreWhenCompleted || 0).toFixed(1)}/5 vs ${Number(h.avgMoodScoreWhenMissed || 0).toFixed(1)}/5 when missed (Uplift: ${Number(h.upliftPercentage || 0).toFixed(0)}%).`
          )
          .join("\n")
      : "No specific habit stats recorded yet.";

    const journalContext = Array.isArray(recentEntries)
      ? recentEntries
          .slice(0, 5)
          .map(
            (e: any) =>
              `- Date ${e.date}: Mood ${e.mood}, Summary: "${e.summary || e.title || 'Personal reflection'}"`
          )
          .join("\n")
      : "No recent journal entries.";

    const prompt = `Analyze this user's habit tracking consistency and emotional journaling history. 
Total Habits Completed: ${totalCompletedHabits}
Current Consistency Streak: ${streakDays} days

Habit & Mood Data:
${statsSummary}

Recent Journal Excerpts:
${journalContext}

Provide a deep, compassionate psychological synthesis of how their daily actions and micro-habits nurture their emotional well-being.
Return ONLY valid JSON matching this schema:
{
  "synthesis": "A warm, insightful 2-paragraph analysis highlighting the positive emotional anchors created by their habits.",
  "keyBreakthroughs": [
    "3 distinct bullet points identifying specific correlations between their habits, energy, and inner peace."
  ],
  "highlightHabit": "The title of their most impactful habit based on mood uplift or frequency.",
  "growthEncouragement": "A gentle, grounding 1-sentence mindful blessing for their upcoming days."
}`;

    const systemInstruction =
      "You are 'Warmth', an empathetic wellness analyst and mindfulness coach. Output valid JSON only, without markdown or backticks.";

    const result = await generateContentWithFallback(
      prompt,
      systemInstruction,
      true
    );

    let parsedData;
    try {
      const cleanJson = result.text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      parsedData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.warn("Habit insights JSON parsing failed, using heuristic fallback", parseError);
      parsedData = {
        synthesis:
          "Your consistent commitment to intentional daily rituals is creating steady, visible anchors of calm in your days. When you carve out space for self-care and mindful focus, your emotional baseline shifts toward greater balance and resilience.",
        keyBreakthroughs: [
          "Consistent morning rituals correlate with noticeable increases in peace and clarity.",
          "Small daily actions compound into greater emotional bandwidth during demanding days.",
          "Pairing daily reflections with physical movement creates a grounding mind-body harmony.",
        ],
        highlightHabit: habitStats?.[0]?.habitTitle || "Mindful Reflection",
        growthEncouragement:
          "Honor every small victory you have claimed, and let your daily routines be an act of kindness rather than pressure.",
      };
    }

    res.json({
      success: true,
      data: parsedData,
      telemetry: {
        modelUsed: result.modelUsed,
        attemptedModels: result.attemptedModels,
        fallbackTriggered: result.fallbackTriggered,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Habit insights error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate habit insights",
    });
  }
});

// ==========================================
// 6. AI Vision Board Goal Visualizer & Synthesizer
// ==========================================

// Curated aesthetic fallback visuals for 9 pillars
const PILLAR_CURATED_VISUALS: Record<string, string[]> = {
  health: [
    "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1000&q=80",
  ],
  career: [
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80",
  ],
  spirituality: [
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1514894780887-121968d00567?auto=format&fit=crop&w=1000&q=80",
  ],
  finances: [
    "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1000&q=80",
  ],
  partner: [
    "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1494774157365-9e04c6720e47?auto=format&fit=crop&w=1000&q=80",
  ],
  family: [
    "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1609234656388-0ff363383899?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1000&q=80",
  ],
  friends: [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=1000&q=80",
  ],
  fun: [
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
  ],
  community: [
    "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&w=1000&q=80",
  ],
};

app.post("/api/visualize-goal", async (req: Request, res: Response) => {
  try {
    const {
      title = "",
      pillar = "health",
      explanation = "",
      isRegenerate = false,
      seed,
      centerpieceUrl,
      userNameOrMantra,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Goal title is required." });
    }

    const seedValue = seed !== undefined ? Number(seed) : Math.floor(Math.random() * 1000000);

    // Multimodal or descriptive person identification if centerpiece is provided
    let personDescription = "";
    if (centerpieceUrl) {
      try {
        const ai = getGeminiClient();
        if (ai) {
          if (centerpieceUrl.startsWith("data:image/")) {
            const match = centerpieceUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (match) {
              const resp = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                  { inlineData: { data: match[2], mimeType: match[1] } },
                  { text: "Analyze this portrait. Describe the person's physical appearance (gender presentation, approximate age, hair style and color, skin tone, facial expression, and distinctive characteristics) in 1-2 detailed sentences so an image model can reproduce their likeness in other scenes." },
                ],
              });
              personDescription = resp?.text?.trim() || "";
            }
          } else if (centerpieceUrl.startsWith("http://") || centerpieceUrl.startsWith("https://")) {
            try {
              const fetchResp = await fetch(centerpieceUrl);
              if (fetchResp.ok) {
                const buffer = await fetchResp.arrayBuffer();
                const base64Data = Buffer.from(buffer).toString("base64");
                const mimeType = (fetchResp.headers.get("content-type") || "image/jpeg").split(";")[0];
                const resp = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: [
                    { inlineData: { data: base64Data, mimeType } },
                    { text: "Analyze this portrait. Describe the person's physical appearance (gender presentation, approximate age, hair style and color, skin tone, facial expression, and distinctive characteristics) in 1-2 detailed sentences so an image model can reproduce their likeness in other scenes." },
                  ],
                });
                personDescription = resp?.text?.trim() || "";
              }
            } catch (err) {
              console.warn("Could not fetch remote centerpiece photo:", err);
            }
          }
        }
      } catch (err) {
        console.warn("Centerpiece analysis note:", err);
      }
      if (!personDescription) {
        personDescription = userNameOrMantra
          ? `a person embodying "${userNameOrMantra}"`
          : "a joyful, radiant individual";
      }
    }

    const personInstruction = personDescription
      ? `\nCRITICAL PERSONALIZATION DIRECTIVE:
The user has provided their real centerpiece portrait, describing: "${personDescription}".
You MUST generate a visual depicting THIS EXACT PERSON actively achieving and embodying their goal ("${title}"):
- If the goal is gym / workout / physical fitness: depict this person looking fit and healthy inside a sunlit modern gym with equipment or running outdoors in athletic wear.
- If the goal is healthy food / nutrition: depict this person enjoying a vibrant healthy meal (colorful bowl, smoothie, fresh ingredients) or cooking in a warm modern kitchen.
- If the goal is travel (e.g. New York, Europe, tropical): depict this person smiling in that exact destination's iconic setting (e.g. New York Times Square or skyline, holding travel tickets / passport) in golden hour light.
- If the goal is career / business / finances: depict this person succeeding in their dream setting (collaborative design studio, presentation, or enjoying financial freedom).
- If the goal is peace / spirituality: depict this person mindfully journaling or meditating in a peaceful sunlit sanctuary.
Make visualPrompt a direct, realistic 35mm photo description showing this person in the tangible moment!`
      : `Make visualPrompt a direct, realistic 35mm photographic description capturing the tangible achievement of "${title}" in a realistic setting.`;

    const prompt = `You are a mindful vision board architect and visual aesthetic director.
The user wants to visualize this life goal:
Goal Title: "${title}"
Life Pillar: ${pillar}
Explanation: "${explanation || 'No additional explanation'}"
${personInstruction}
${isRegenerate ? `This is a request to regenerate with a fresh artistic perspective (seed: ${seedValue}).` : ""}

Craft an inspiring manifestation concept. Return ONLY valid JSON:
{
  "visualPrompt": "A detailed 1-2 sentence description of a realistic 35mm photograph showing ${personDescription ? 'this specific person' : 'a realistic scene'} embodying this goal in a tangible real-world setting.",
  "mantra": "A powerful, concise 1-sentence present-tense affirmation for this goal.",
  "searchKeywords": ["3 specific visual search terms"]
}`;

    const systemInstruction =
      "You are 'Warmth Vision Director'. Output valid JSON only, without markdown backticks or commentary.";

    const result = await generateContentWithFallback(
      prompt,
      systemInstruction,
      true
    );

    let parsedData: any;
    try {
      const cleanJson = result.text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      parsedData = JSON.parse(cleanJson);
    } catch {
      parsedData = {
        visualPrompt: personDescription
          ? `A realistic 35mm photograph of ${personDescription} feeling deeply fulfilled and joyful after achieving ${title}.`
          : `A serene, realistic 35mm photograph capturing the essence of ${title}.`,
        mantra: `I am actively creating a life aligned with ${title}.`,
        searchKeywords: [pillar, "mindfulness", "growth"],
      };
    }

    // Generate dynamic AI visual with unique seed
    const rawPrompt = parsedData.visualPrompt || `A photorealistic photograph of ${title}`;
    const cleanPrompt = rawPrompt.replace(/^(A photorealistic photograph of|A photo of|A picture of)\s+/i, "");
    const enhancedPrompt = `cinematic 35mm photography, ${cleanPrompt}, warm natural lighting, authentic textures, realistic human proportions, award-winning composition, 8k`;
    const selectedImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1200&height=800&nologo=true&seed=${seedValue}`;

    res.json({
      success: true,
      imageUrl: selectedImageUrl,
      visualPrompt: parsedData.visualPrompt,
      mantra: parsedData.mantra,
      searchKeywords: parsedData.searchKeywords || [],
      seed: seedValue,
      isPersonified: Boolean(personDescription),
      personDescription,
      telemetry: {
        modelUsed: result.modelUsed,
        attemptedModels: result.attemptedModels,
        fallbackTriggered: result.fallbackTriggered,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Visualize goal error:", error);
    res.status(500).json({
      error: error.message || "Failed to visualize goal",
    });
  }
});

app.post("/api/generate-single-photo-vision-board", async (req: Request, res: Response) => {
  try {
    const {
      goals = [],
      annualTheme = "Year of Grounded Vitality & Purpose",
      userNameOrMantra = "Seeker",
      aspectRatio = "16:9", // "16:9" | "9:16" | "1:1"
      seed,
    } = req.body;

    const goalsList = Array.isArray(goals) && goals.length > 0
      ? goals.map((g: any, idx: number) => `${idx + 1}. [${g.pillar || 'Life Focus'}]: "${g.title}" ${g.explanation ? `(${g.explanation})` : ""}`).join("\n")
      : "1. Radiant Vitality & Morning Movement\n2. Meaningful Creative Work\n3. Daily Stillness & Presence\n4. Financial Peace & Generosity\n5. Deep Loving Connections";

    const prompt = `You are a world-class visionary artist and creative director.
Synthesize the following collection of life intentions into ONE single, cohesive, breathtaking vision board photograph / wallpaper:

User Theme: "${annualTheme}"
Anchor Mantra / Name: "${userNameOrMantra}"

Goals Across Life Dimensions:
${goalsList}

Create a prompt for a SINGLE cinematic master photograph that harmoniously weaves these intentions together into one stunning, unified visual space. 
For example, an inspiring aesthetic sanctuary flooded with warm morning sunlight, featuring elements of tranquil nature, an organized creative work table with notebooks and artisanal tools, healthy nourishment, peaceful meditation textures, warm hearth light, and distant mountain or ocean views.

Return ONLY valid JSON:
{
  "masterPrompt": "A detailed 2-3 sentence visual prompt describing this single unified master photograph, emphasizing warm golden hour lighting, cinematic film grain, serene composition, and uplifting depth.",
  "masterMantra": "A memorable 1-sentence overarching mantra that unites all these goals into one declaration.",
  "title": "A short poetic 3-5 word title for this vision board."
}`;

    const systemInstruction =
      "You are 'Warmth Master Visionary'. Output valid JSON only, without markdown backticks or commentary.";

    const result = await generateContentWithFallback(
      prompt,
      systemInstruction,
      true
    );

    let parsed: any;
    try {
      const cleanJson = result.text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        masterPrompt: `A serene, warm-toned sanctuary photograph bathed in golden morning light, overlooking an ocean horizon, with an artist notebook, wholesome tea, soft linen textures, and peaceful plants, symbolizing a life of radiant vitality, creative depth, and mindful peace.`,
        masterMantra: `I walk forward with grounded clarity, vibrant energy, and purposeful love.`,
        title: annualTheme || "My Vision Board",
      };
    }

    const seedVal = seed !== undefined ? Number(seed) : Math.floor(Math.random() * 1000000);
    let width = 1920;
    let height = 1080;
    if (aspectRatio === "9:16") {
      width = 1080;
      height = 1920;
    } else if (aspectRatio === "1:1") {
      width = 1200;
      height = 1200;
    }

    const fullPrompt = `${parsed.masterPrompt}, cinematic masterpiece, warm golden sunlight, 35mm film photography, rich textures, serene aesthetic, high resolution, photorealistic, elegant composition`;
    const singlePhotoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${width}&height=${height}&nologo=true&seed=${seedVal}`;

    res.json({
      success: true,
      singlePhotoUrl,
      masterPrompt: parsed.masterPrompt,
      masterMantra: parsed.masterMantra,
      title: parsed.title,
      seed: seedVal,
      aspectRatio,
    });
  } catch (err: any) {
    console.error("Single photo vision board error:", err);
    res.status(500).json({
      error: err.message || "Failed to generate single photo vision board",
    });
  }
});

app.post("/api/synthesize-vision", async (req: Request, res: Response) => {
  try {
    const { goals = [], annualTheme = "", userName = "Seeker" } = req.body;

    const goalsSummary = Array.isArray(goals)
      ? goals
          .map(
            (g: any, i: number) =>
              `${i + 1}. [${g.pillar?.toUpperCase()}]: "${g.title}" ${g.explanation ? `(${g.explanation})` : ""}`
          )
          .join("\n")
      : "No goals listed.";

    const prompt = `Synthesize a poetic, deeply inspiring 'North Star Manifesto' for ${userName}'s Vision Board.
Annual Theme / Guiding Motto: "${annualTheme || 'Year of Intentional Living & Warmth'}"

Goals Across the 9 Life Spheres:
${goalsSummary}

Create a poetic 3-paragraph life vision uniting these 9 dimensions into a cohesive philosophy of presence, purpose, love, and growth.
Return ONLY valid JSON:
{
  "manifesto": "A lyrical, deeply moving 2-3 paragraph manifesto written in second-person ('You are walking into a season where...') celebrating their holistic life.",
  "guidingMantra": "A memorable 1-sentence overarching mantra.",
  "topPillarFocus": "Which pillar appears most foundational to their current season of growth and why (1 sentence)."
}`;

    const systemInstruction =
      "You are 'Warmth Vision Synthesizer'. Output valid JSON only, without markdown formatting.";

    const result = await generateContentWithFallback(
      prompt,
      systemInstruction,
      true
    );

    let parsedData: any;
    try {
      const cleanJson = result.text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      parsedData = JSON.parse(cleanJson);
    } catch {
      parsedData = {
        manifesto:
          "You are entering a season where every dimension of your life moves into quiet harmony. Your physical energy, purposeful craft, inner stillness, and cherished relationships are not competing for your attention—they nourish one another. With each sunrise, you choose presence over pressure, and joy over haste.",
        guidingMantra: "Living with deep presence, courageous purpose, and boundless warmth.",
        topPillarFocus: "Health and inner stillness serve as the roots that allow all other branches of your life to flourish.",
      };
    }

    res.json({
      success: true,
      data: parsedData,
      telemetry: {
        modelUsed: result.modelUsed,
        attemptedModels: result.attemptedModels,
        fallbackTriggered: result.fallbackTriggered,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Synthesize vision error:", error);
    res.status(500).json({
      error: error.message || "Failed to synthesize vision board",
    });
  }
});

app.get("/api/proxy-image", async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).send("No url provided");
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch image");
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error("Proxy image error:", err);
    res.status(500).send("Proxy image error");
  }
});



// ==========================================
// VITE INTEGRATION
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Warmth AI Journal Server running on port ${PORT}`);
  });
}

startServer();
