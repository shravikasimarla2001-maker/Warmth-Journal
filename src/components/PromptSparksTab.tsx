import React, { useState } from "react";
import {
  Flame,
  Sparkles,
  Sun,
  Moon,
  Compass,
  Heart,
  Feather,
  RefreshCw,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { DailySpark, ReflectionType } from "../types";

interface PromptSparksTabProps {
  onUsePrompt: (prompt: string, type: ReflectionType) => void;
}

const STATIC_SPARKS: DailySpark[] = [
  {
    category: "Morning Anchor",
    prompt: "What is one small feeling of lightness or peace you wish to protect throughout today?",
    type: "daily_reflection",
  },
  {
    category: "Morning Anchor",
    prompt: "Before the world asks for your energy, what does your own spirit ask of you this morning?",
    type: "mindfulness",
  },
  {
    category: "Evening Gratitude",
    prompt: "Describe an ordinary, easily overlooked detail from today that made you smile or feel comforted.",
    type: "gratitude",
  },
  {
    category: "Evening Gratitude",
    prompt: "Who crossed your path today that you feel quietly thankful for, even in a subtle way?",
    type: "gratitude",
  },
  {
    category: "Deep Introspection",
    prompt: "What is something heavy you have been carrying out of habit that is ready to be gently set down?",
    type: "deep_dive",
  },
  {
    category: "Deep Introspection",
    prompt: "What belief about yourself did you hold five years ago that no longer rings true today?",
    type: "deep_dive",
  },
  {
    category: "Creative Flow",
    prompt: "If your current season of life were a quiet landscape or cozy room, how would you describe the light, the scents, and the weather?",
    type: "brainstorm",
  },
  {
    category: "Creative Flow",
    prompt: "What wild, unpolished curiosity has been knocking at the back of your mind lately?",
    type: "brainstorm",
  },
  {
    category: "Mindful Somatics",
    prompt: "Take a deep breath and soften your jaw. What physical sensation in your body is asking for your gentle attention?",
    type: "mindfulness",
  },
  {
    category: "Clarity & Intentions",
    prompt: "If today could only accomplish one single meaningful thing, what would leave you feeling deeply content?",
    type: "clarity_coaching",
  },
];

export const PromptSparksTab: React.FC<PromptSparksTabProps> = ({
  onUsePrompt,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [customSparks, setCustomSparks] = useState<DailySpark[]>(STATIC_SPARKS);
  const [isGenerating, setIsGenerating] = useState(false);

  const categories = [
    { id: "all", label: "All Sparks", icon: Flame },
    { id: "Morning Anchor", label: "Morning Anchors", icon: Sun },
    { id: "Evening Gratitude", label: "Evening Gratitude", icon: Moon },
    { id: "Deep Introspection", label: "Deep Introspection", icon: Compass },
    { id: "Creative Flow", label: "Creative Flow", icon: Sparkles },
    { id: "Mindful Somatics", label: "Mindful Somatics", icon: Heart },
  ];

  const filteredSparks =
    selectedCategory === "all"
      ? customSparks
      : customSparks.filter((s) => s.category === selectedCategory);

  const handleGenerateFreshSparks = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/sparks");
      const data = await res.json();
      if (data.sparks && Array.isArray(data.sparks)) {
        setCustomSparks([...data.sparks, ...STATIC_SPARKS]);
      }
    } catch (err) {
      console.warn("Could not fetch remote sparks:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8DFC8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2C241E] flex items-center space-x-2">
            <Flame className="w-6 h-6 text-[#E67E22]" />
            <span>Reflection Sparks & Writing Prompts</span>
          </h2>
          <p className="text-xs text-[#7E6E5F] mt-0.5 font-journal">
            Gentle catalysts for mindfulness, gratitude, self-compassion, and creative flow.
          </p>
        </div>

        <button
          onClick={handleGenerateFreshSparks}
          disabled={isGenerating}
          className="px-4 py-2 bg-[#F5EBE1] hover:bg-[#E8DFC8] text-[#935116] text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
          <span>Generate Fresh AI Sparks</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                selectedCategory === c.id
                  ? "bg-[#D35400] text-white border-[#D35400] shadow-2xs font-semibold"
                  : "bg-white text-[#6E5D4F] border-[#E8DFC8] hover:bg-[#FAF7F2]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sparks Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSparks.map((spark, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 border border-[#E8DFC8] shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#935116] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F5EBE1] border border-[#E8DFC8]">
                  {spark.category}
                </span>
                <span className="text-[10px] text-[#8C7B6C] capitalize">
                  {spark.type.replace("_", " ")}
                </span>
              </div>

              <p className="font-journal text-sm text-[#2C241E] leading-relaxed italic pt-1">
                "{spark.prompt}"
              </p>
            </div>

            <div className="pt-2 border-t border-[#F5EBE1] flex items-center justify-between">
              <span className="text-[11px] text-[#8C7B6C]">
                Ready to inspire your pen
              </span>
              <button
                onClick={() => onUsePrompt(spark.prompt, spark.type)}
                className="px-3 py-1.5 bg-[#F5EBE1] group-hover:bg-[#D35400] text-[#935116] group-hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-2xs"
              >
                <Feather className="w-3.5 h-3.5" />
                <span>Write With This Prompt</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
