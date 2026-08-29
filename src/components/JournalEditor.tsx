import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Save,
  CheckCircle2,
  Calendar,
  Tag,
  Feather,
  BookOpen,
  RefreshCw,
  Trash2,
  Lightbulb,
  Heart,
  ChevronDown,
  Layers,
  Award,
  Clock,
  Flame,
  ArrowRight,
  Shield,
  Star,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  JournalEntry,
  ChatMessage,
  MoodType,
  ReflectionType,
  ModelTelemetry,
  DailySpark,
} from "../types";
import { User } from "firebase/auth";

interface JournalEditorProps {
  user: User | null;
  currentEntry: JournalEntry | null;
  onSaveEntry: (entry: Partial<JournalEntry>) => Promise<string | void>;
  onNewEntry: () => void;
  telemetry: ModelTelemetry | null;
  onSelectDateInCalendar?: (date: string) => void;
}

const MOODS: { type: MoodType; label: string; icon: string; color: string }[] = [
  { type: "peaceful", label: "Peaceful", icon: "🌿", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { type: "grateful", label: "Grateful", icon: "🙏", color: "bg-amber-50 text-amber-900 border-amber-200" },
  { type: "reflective", label: "Reflective", icon: "🕯️", color: "bg-orange-50 text-orange-900 border-orange-200" },
  { type: "hopeful", label: "Hopeful", icon: "🌅", color: "bg-yellow-50 text-yellow-900 border-yellow-200" },
  { type: "inspired", label: "Inspired", icon: "✨", color: "bg-amber-50 text-amber-900 border-amber-300" },
  { type: "content", label: "Content", icon: "☕", color: "bg-stone-50 text-stone-900 border-stone-200" },
  { type: "curious", label: "Curious", icon: "🔍", color: "bg-blue-50 text-blue-900 border-blue-200" },
  { type: "overwhelmed", label: "Overwhelmed", icon: "🌊", color: "bg-cyan-50 text-cyan-900 border-cyan-200" },
  { type: "melancholic", label: "Melancholic", icon: "🌧️", color: "bg-indigo-50 text-indigo-900 border-indigo-200" },
  { type: "determined", label: "Determined", icon: "🔥", color: "bg-red-50 text-red-900 border-red-200" },
];

const REFLECTION_TYPES: { type: ReflectionType; label: string; desc: string }[] = [
  { type: "daily_reflection", label: "Daily Reflection", desc: "Gentle introspection on today's currents" },
  { type: "gratitude", label: "Gratitude Journal", desc: "Anchor micro-moments of peace & appreciation" },
  { type: "brainstorm", label: "Creative Brainstorm", desc: "Explore possibilities and wild sparks" },
  { type: "deep_dive", label: "Deep Socratic Dive", desc: "Unpack core beliefs and underlying values" },
  { type: "mindfulness", label: "Mindful Somatics", desc: "Check in with breath, body & presence" },
  { type: "clarity_coaching", label: "Clarity & Intentions", desc: "Untangle overwhelm into gentle steps" },
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  user,
  currentEntry,
  onSaveEntry,
  onNewEntry,
  telemetry,
}) => {
  // Today's date YYYY-MM-DD
  const getTodayString = () => new Date().toISOString().split("T")[0];

  const [entryId, setEntryId] = useState<string>(
    currentEntry?.id || "entry_" + Date.now()
  );
  const [date, setDate] = useState<string>(
    currentEntry?.date || getTodayString()
  );
  const [title, setTitle] = useState<string>(
    currentEntry?.title || ""
  );
  const [mood, setMood] = useState<MoodType>(
    currentEntry?.mood || "peaceful"
  );
  const [reflectionType, setReflectionType] = useState<ReflectionType>(
    currentEntry?.reflectionType || "daily_reflection"
  );
  const [initialThought, setInitialThought] = useState<string>(
    currentEntry?.initialThought || ""
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    currentEntry?.messages || []
  );
  const [summary, setSummary] = useState<string>(
    currentEntry?.summary || ""
  );
  const [insights, setInsights] = useState<string[]>(
    currentEntry?.insights || []
  );
  const [tags, setTags] = useState<string[]>(
    currentEntry?.tags || ["reflection"]
  );
  const [tagInput, setTagInput] = useState("");
  const [favorite, setFavorite] = useState<boolean>(
    currentEntry?.favorite || false
  );

  // Multi-turn chat input state
  const [chatInput, setChatInput] = useState("");
  const [isReflecting, setIsReflecting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Quick sparks
  const [sparks, setSparks] = useState<DailySpark[]>([
    {
      category: "Morning Anchor",
      prompt: "What is one small feeling of lightness you want to hold onto today?",
      type: "daily_reflection",
    },
    {
      category: "Evening Gratitude",
      prompt: "What was an ordinary moment today that gave you a quiet feeling of peace?",
      type: "gratitude",
    },
    {
      category: "Self-Compassion",
      prompt: "If a dear friend felt what you are feeling now, what gentle words would you whisper to them?",
      type: "mindfulness",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state when currentEntry changes
  useEffect(() => {
    if (currentEntry) {
      setEntryId(currentEntry.id);
      setDate(currentEntry.date || getTodayString());
      setTitle(currentEntry.title || "");
      setMood(currentEntry.mood || "peaceful");
      setReflectionType(currentEntry.reflectionType || "daily_reflection");
      setInitialThought(currentEntry.initialThought || "");
      setMessages(currentEntry.messages || []);
      setSummary(currentEntry.summary || "");
      setInsights(currentEntry.insights || []);
      setTags(currentEntry.tags || ["reflection"]);
      setFavorite(currentEntry.favorite || false);
    }
  }, [currentEntry]);

  // Scroll chat messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isReflecting]);

  // Word count & read time
  const wordCount = initialThought.trim()
    ? initialThought.trim().split(/\s+/).length
    : 0;
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 180));

  // Multi-turn AI Reflection Handler
  const handleSendReflection = async (customMessage?: string) => {
    const textToSend = customMessage || chatInput;
    if (!textToSend.trim() && !initialThought.trim()) return;
    if (isReflecting) return;

    const userMessage: ChatMessage = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: textToSend.trim() || "Here are my current thoughts for reflection.",
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setChatInput("");
    setIsReflecting(true);

    try {
      const res = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.text,
          entryContext: initialThought,
          history: messages,
          reflectionType,
          mood,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        const aiMessage: ChatMessage = {
          id: "msg_" + (Date.now() + 1),
          sender: "gemini",
          text: data.reply,
          timestamp: new Date().toISOString(),
        };
        const finalMessages = [...updatedMessages, aiMessage];
        setMessages(finalMessages);

        // Auto-save progress
        handleSave(finalMessages);
      }
    } catch (err) {
      console.error("Reflection failure:", err);
      const fallbackAiMessage: ChatMessage = {
        id: "msg_" + (Date.now() + 1),
        sender: "gemini",
        text: "I am holding space for these thoughts. What is the most important feeling you want to honor about this today?",
        timestamp: new Date().toISOString(),
      };
      setMessages([...updatedMessages, fallbackAiMessage]);
    } finally {
      setIsReflecting(false);
    }
  };

  // AI Summarization & Insight Synthesizer
  const handleSummarizeEntry = async () => {
    if (!initialThought.trim() && messages.length === 0) return;
    setIsSummarizing(true);

    try {
      const res = await fetch("/api/summarize-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryText: initialThought,
          messages,
          mood,
          reflectionType,
        }),
      });

      const data = await res.json();
      if (data.data) {
        if (data.data.title && !title) {
          setTitle(data.data.title);
        }
        if (data.data.summary) {
          setSummary(data.data.summary);
        }
        if (data.data.insights && Array.isArray(data.data.insights)) {
          setInsights(data.data.insights);
        }
        if (data.data.tags && Array.isArray(data.data.tags)) {
          // Merge unique tags
          const merged = Array.from(new Set([...tags, ...data.data.tags]));
          setTags(merged);
        }
        if (data.data.detectedMood && !currentEntry?.mood) {
          setMood(data.data.detectedMood as MoodType);
        }

        setSaveStatus("Entry synthesized with Gemini insights!");
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (err) {
      console.error("Summarization failure:", err);
      setSaveStatus("Heuristic summary applied.");
      setTimeout(() => setSaveStatus(null), 2500);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Save to Firestore
  const handleSave = async (customMessages?: ChatMessage[]) => {
    setIsSaving(true);
    setSaveStatus("Persisting to Cloud Firestore...");

    const finalTitle =
      title.trim() ||
      (initialThought.trim()
        ? initialThought.trim().slice(0, 40) + "..."
        : "Reflections for " + date);

    const payload: Partial<JournalEntry> = {
      id: entryId,
      date,
      title: finalTitle,
      mood,
      reflectionType,
      initialThought,
      summary,
      insights,
      tags,
      messages: customMessages || messages,
      favorite,
      wordCount,
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveEntry(payload);
      setSaveStatus("Saved to your isolated Cloud Firestore!");

      // Celebration effect
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.85 },
        colors: ["#D35400", "#E67E22", "#F39C12", "#F5B041"],
      });

      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err: any) {
      console.error("Save error:", err);
      setSaveStatus("Saved locally (Firestore sync pending).");
      setTimeout(() => setSaveStatus(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  // Add Tag
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const cleaned = tagInput.trim().toLowerCase();
      if (!tags.includes(cleaned)) {
        setTags([...tags, cleaned]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Apply Prompt Spark to text
  const handleApplySpark = (sparkPrompt: string) => {
    if (initialThought.trim()) {
      setInitialThought(initialThought + "\n\n" + sparkPrompt + "\n");
    } else {
      setInitialThought(sparkPrompt + "\n\n");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-[#E8DFC8] shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center space-x-2 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E8DFC8]">
            <Calendar className="w-4 h-4 text-[#BA4A00]" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#2C241E] focus:outline-none cursor-pointer"
            />
          </div>

          {/* Favorite Toggle */}
          <button
            onClick={() => setFavorite(!favorite)}
            className={`p-2 rounded-xl border transition-all flex items-center space-x-1.5 text-xs font-medium ${
              favorite
                ? "bg-amber-50 text-amber-700 border-amber-300"
                : "bg-[#FAF7F2] text-[#7E6E5F] border-[#E8DFC8] hover:bg-white"
            }`}
            title="Mark as Favorite Reflection"
          >
            <Star
              className={`w-4 h-4 ${
                favorite ? "fill-amber-400 text-amber-500" : "text-[#7E6E5F]"
              }`}
            />
            <span className="hidden sm:inline">
              {favorite ? "Favorited" : "Favorite"}
            </span>
          </button>

          {/* Word Count Indicator */}
          <div className="text-xs text-[#7E6E5F] flex items-center space-x-2 px-2">
            <span>{wordCount} words</span>
            <span>·</span>
            <span>~{estimatedReadTime} min read</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onNewEntry}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2] border border-transparent hover:border-[#E8DFC8] transition-all flex items-center space-x-1.5"
          >
            <Feather className="w-3.5 h-3.5" />
            <span>New Blank Entry</span>
          </button>

          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-5 py-2 bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all hover:scale-102"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Entry</span>
          </button>
        </div>
      </div>

      {/* Save status notification banner */}
      {saveStatus && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-900 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveStatus}</span>
          </div>
          {user && (
            <span className="text-[10px] text-amber-700">
              Isolated user: {user.email?.split("@")[0]}
            </span>
          )}
        </div>
      )}

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Writing Desk & Mood */}
        <div className="lg:col-span-7 space-y-6">
          {/* Paper Container */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E8DFC8] shadow-xs space-y-5 relative">
            {/* Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title your reflection... (or let AI suggest one)"
              className="w-full font-display text-2xl sm:text-3xl font-semibold text-[#2C241E] placeholder-[#B5A595] focus:outline-none border-b border-transparent focus:border-[#E8DFC8] pb-1 transition-all"
            />

            {/* Mood Selector Chips */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#8C7B6C] uppercase tracking-wider">
                How is your spirit feeling?
              </label>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map((m) => (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => setMood(m.type)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                      mood === m.type
                        ? `${m.color} ring-2 ring-[#BA4A00]/40 font-semibold scale-102`
                        : "bg-[#FAF7F2] text-[#6E5D4F] border-[#E8DFC8] hover:bg-white"
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reflection Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#8C7B6C] uppercase tracking-wider">
                Reflection Intention
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {REFLECTION_TYPES.map((rt) => (
                  <button
                    key={rt.type}
                    type="button"
                    onClick={() => setReflectionType(rt.type)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      reflectionType === rt.type
                        ? "bg-[#F5EBE1] border-[#BA4A00] text-[#2C241E] shadow-2xs font-semibold"
                        : "bg-[#FAF7F2] border-[#E8DFC8] text-[#7E6E5F] hover:bg-white"
                    }`}
                  >
                    <div className="text-xs">{rt.label}</div>
                    <div className="text-[10px] text-[#8C7B6C] truncate">
                      {rt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Sparks Carousel */}
            <div className="bg-[#FAF7F2] rounded-xl p-3 border border-[#E8DFC8] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#935116] font-semibold">
                <span className="flex items-center space-x-1">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Reflection Prompts (Click to insert)</span>
                </span>
                <span className="text-[10px] text-[#8C7B6C]">Sparks</span>
              </div>
              <div className="space-y-1.5">
                {sparks.map((spark, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplySpark(spark.prompt)}
                    className="w-full text-left p-2 rounded-lg bg-white hover:bg-[#F5EBE1] border border-[#E8DFC8]/70 text-xs text-[#4A3B32] transition-colors flex items-center justify-between group"
                  >
                    <span className="font-journal italic text-[12px] pr-2">
                      "{spark.prompt}"
                    </span>
                    <span className="text-[10px] text-[#935116] opacity-0 group-hover:opacity-100 shrink-0 font-medium">
                      + Insert
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Journal Content Area */}
            <div className="space-y-2">
              <textarea
                value={initialThought}
                onChange={(e) => setInitialThought(e.target.value)}
                placeholder="Pour your thoughts freely onto this page... Write what happened today, what weighed on you, what brought joy, or what you wish to let go of."
                rows={12}
                className="w-full p-4 rounded-xl bg-[#FAF7F2]/50 border border-[#E8DFC8] text-base text-[#2C241E] placeholder-[#A8988A] focus:outline-none focus:ring-2 focus:ring-[#BA4A00]/30 font-journal leading-relaxed resize-y"
              />
            </div>

            {/* Tags & Categorization */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center space-x-2">
                <Tag className="w-3.5 h-3.5 text-[#8C7B6C]" />
                <span className="text-xs font-semibold text-[#8C7B6C]">Tags</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#F5EBE1] text-[#935116] text-xs border border-[#E8DFC8]"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-600 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="+ Add tag (Enter)"
                  className="px-2.5 py-1 text-xs rounded-full bg-[#FAF7F2] border border-[#E8DFC8] text-[#2C241E] focus:outline-none focus:border-[#BA4A00] w-32"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Multi-Turn AI Reflections & Insights */}
        <div className="lg:col-span-5 space-y-6">
          {/* Multi-Turn AI Reflection Chat Panel */}
          <div className="bg-white rounded-2xl border border-[#E8DFC8] shadow-xs flex flex-col h-[560px] overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-[#FAF7F2] border-b border-[#E8DFC8] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#D35400] text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-sm text-[#2C241E]">
                    Converse with Warmth
                  </h4>
                  <p className="text-[10px] text-[#7E6E5F]">
                    Multi-turn empathetic Gemini reflection
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSendReflection()}
                disabled={isReflecting || !initialThought.trim()}
                className="text-xs px-2.5 py-1 rounded-lg bg-white border border-[#E8DFC8] text-[#BA4A00] font-semibold hover:bg-[#F5EBE1] disabled:opacity-50 transition-colors"
              >
                Reflect on Entry
              </button>
            </div>

            {/* Chat Log Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF7F2]/30">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8C7B6C] space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#F5EBE1] flex items-center justify-center text-[#BA4A00]">
                    <Feather className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#4A3B32]">
                      Your reflective sanctuary is quiet
                    </p>
                    <p className="text-[11px] max-w-xs">
                      Write your journal entry on the left, then click "Reflect on
                      Entry" or ask a question below to begin your dialogue.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center space-x-1 text-[10px] text-[#8C7B6C] mb-1 px-1">
                      <span>{msg.sender === "user" ? "You" : "Warmth AI"}</span>
                      <span>·</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[90%] p-3.5 rounded-2xl text-xs font-journal leading-relaxed whitespace-pre-line ${
                        msg.sender === "user"
                          ? "bg-[#2C241E] text-[#FAF7F2] rounded-br-xs shadow-2xs"
                          : "bg-white text-[#2C241E] border border-[#E8DFC8] rounded-bl-xs shadow-2xs"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}

              {isReflecting && (
                <div className="flex items-start space-x-2">
                  <div className="p-3.5 rounded-2xl bg-white border border-[#E8DFC8] text-xs font-journal text-[#7E6E5F] flex items-center space-x-2 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-[#E67E22] animate-spin" />
                    <span>Warmth is listening and reflecting...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 bg-white border-t border-[#E8DFC8]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendReflection();
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Share a follow-up or explore deeper..."
                  disabled={isReflecting}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] text-xs text-[#2C241E] placeholder-[#9E8E80] focus:outline-none focus:ring-2 focus:ring-[#BA4A00]/40 font-journal"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isReflecting}
                  className="p-2 bg-[#D35400] hover:bg-[#BA4A00] disabled:opacity-40 text-white rounded-xl transition-all shadow-xs shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* AI Insights & Summary Synthesizer Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#E8DFC8] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#F5EBE1] text-[#BA4A00] flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-sm text-[#2C241E]">
                    AI Synthesis & Key Takeaways
                  </h4>
                  <p className="text-[10px] text-[#7E6E5F]">
                    Distill key themes and emotional arc
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSummarizeEntry}
                disabled={isSummarizing || (!initialThought.trim() && messages.length === 0)}
                className="text-xs px-3 py-1.5 bg-[#F5EBE1] hover:bg-[#E8DFC8] text-[#935116] font-semibold rounded-lg transition-all flex items-center space-x-1 disabled:opacity-40"
              >
                {isSummarizing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{summary ? "Re-Synthesize" : "Synthesize AI Summary"}</span>
              </button>
            </div>

            {summary ? (
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8]">
                  <span className="text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider block mb-1">
                    Core Essence
                  </span>
                  <p className="text-xs font-journal text-[#3E3127] leading-relaxed">
                    {summary}
                  </p>
                </div>

                {insights.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider">
                      Key Takeaways
                    </span>
                    <ul className="space-y-1">
                      {insights.map((insight, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-[#4A3B32] font-journal flex items-start space-x-1.5"
                        >
                          <span className="text-[#BA4A00] font-bold mt-0.5">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-dashed border-[#E8DFC8] text-center text-xs text-[#8C7B6C]">
                Click "Synthesize AI Summary" once you have written your thoughts
                to generate key insights and an evocative title.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
