import React, { useState } from "react";
import {
  Sparkles,
  Flame,
  Sun,
  Moon,
  Compass,
  Heart,
  RefreshCw,
  X,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { DailySpark, ReflectionType } from "../types";

interface PromptSparkPopoverProps {
  onApplyPrompt: (prompt: string, type: ReflectionType) => void;
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
    prompt: "If your current season of life were a quiet landscape or cozy room, how would you describe the light, scents, and weather?",
    type: "brainstorm",
  },
  {
    category: "Mindful Somatics",
    prompt: "Take a deep breath and soften your shoulders. What physical sensation in your body is asking for your gentle attention?",
    type: "mindfulness",
  },
  {
    category: "Clarity & Intentions",
    prompt: "If today could only accomplish one single meaningful thing, what would leave you feeling deeply content?",
    type: "clarity_coaching",
  },
];

export const PromptSparkPopover: React.FC<PromptSparkPopoverProps> = ({
  onApplyPrompt,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sparksList, setSparksList] = useState<DailySpark[]>(STATIC_SPARKS);
  const [isGenerating, setIsGenerating] = useState(false);

  const categories = [
    { id: "all", label: "All", icon: Flame },
    { id: "Morning Anchor", label: "Morning", icon: Sun },
    { id: "Evening Gratitude", label: "Evening", icon: Moon },
    { id: "Deep Introspection", label: "Deep Dive", icon: Compass },
    { id: "Creative Flow", label: "Creative", icon: Sparkles },
    { id: "Mindful Somatics", label: "Somatics", icon: Heart },
  ];

  const filteredSparks =
    selectedCategory === "all"
      ? sparksList
      : sparksList.filter((s) => s.category === selectedCategory);

  const handleGenerateFresh = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/sparks");
      const data = await res.json();
      if (data.sparks && Array.isArray(data.sparks)) {
        setSparksList([...data.sparks, ...STATIC_SPARKS]);
      }
    } catch (e) {
      console.warn("Could not fetch new sparks:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelect = (spark: DailySpark) => {
    onApplyPrompt(spark.prompt, spark.type);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#F5EBE1] text-[#935116] border border-[#E8DFC8] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
        title="Browse reflection prompt sparks"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#E67E22]" />
        <span>✨ Spark an Idea</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop click dismiss */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Popover Card */}
          <div className="absolute left-0 mt-2 z-50 w-80 sm:w-96 bg-white rounded-3xl p-4 border border-[#E8DFC8] shadow-2xl space-y-3 animate-scale-up">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#F0E8D9]">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-[#2C241E]">
                <Flame className="w-4 h-4 text-[#BA4A00]" />
                <span>Reflection Sparks</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handleGenerateFresh}
                  disabled={isGenerating}
                  className="p-1 rounded-lg hover:bg-[#FAF7F2] text-[#7E6E5F] hover:text-[#BA4A00] transition-colors"
                  title="Generate fresh AI prompts"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin text-[#BA4A00]" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#FAF7F2] text-[#7E6E5F]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1 text-[10px]">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2 py-0.5 rounded-full border transition-all ${
                    selectedCategory === c.id
                      ? "bg-[#935116] text-white border-[#935116] font-semibold"
                      : "bg-[#FAF7F2] text-[#7E6E5F] border-[#E8DFC8] hover:bg-white"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Prompts list */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {filteredSparks.slice(0, 8).map((spark, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelect(spark)}
                  className="p-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F5EBE1] border border-[#EFE5D3] cursor-pointer transition-all group flex items-start justify-between space-x-2"
                >
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-[#BA4A00]">
                      {spark.category}
                    </span>
                    <p className="text-xs text-[#2C241E] font-journal italic line-clamp-2 leading-relaxed">
                      "{spark.prompt}"
                    </p>
                  </div>
                  <span className="text-[10px] text-[#935116] font-bold opacity-0 group-hover:opacity-100 shrink-0 self-center">
                    + Insert
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
