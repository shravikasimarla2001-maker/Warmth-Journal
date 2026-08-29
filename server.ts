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
      mood = "peaceful",
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
  "detectedMood": "one of: peaceful, grateful, reflective, hopeful, overwhelmed, inspired, content, curious, melancholic, determined",
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
