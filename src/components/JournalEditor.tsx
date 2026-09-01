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
  Camera,
  Mic,
  MicOff,
  Square,
  X,
  Image as ImageIcon,
  Edit3,
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
import { DailyPhotoModal } from "./DailyPhotoModal";
import { VoiceDictationBar } from "./VoiceDictationBar";
import { DailyChecklistDock } from "./DailyChecklistDock";
import { PromptSparkPopover } from "./PromptSparkPopover";
import {
  DailyChecklist,
  HabitTemplate,
} from "../types";

interface JournalEditorProps {
  user: User | null;
  currentEntry: JournalEntry | null;
  onSaveEntry: (entry: Partial<JournalEntry>) => Promise<string | void>;
  onNewEntry: () => void;
  onDeleteEntry?: (entryId: string) => Promise<void> | void;
  telemetry: ModelTelemetry | null;
  onSelectDateInCalendar?: (date: string) => void;
  dailyChecklist?: DailyChecklist | null;
  tomorrowChecklist?: DailyChecklist | null;
  habitTemplates?: HabitTemplate[];
  onUpdateChecklist?: (checklist: DailyChecklist) => Promise<void>;
  onUpdateTomorrowChecklist?: (checklist: DailyChecklist) => Promise<void>;
  onOpenHabitManager?: () => void;
  streakDays?: number;
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
  onDeleteEntry,
  telemetry,
  dailyChecklist,
  tomorrowChecklist,
  habitTemplates = [],
  onUpdateChecklist,
  onUpdateTomorrowChecklist,
  onOpenHabitManager,
  streakDays = 0,
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
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(
    currentEntry?.photoUrl
  );
  const [photoCaption, setPhotoCaption] = useState<string>(
    currentEntry?.photoCaption || ""
  );
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showVoiceBar, setShowVoiceBar] = useState(false);

  // Speech Recognition / Voice Diary State
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [interimSpeech, setInterimSpeech] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const voiceTimerRef = useRef<any>(null);

  // Stop voice dictation
  const stopVoiceDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    setIsVoiceListening(false);
    setInterimSpeech("");
  };

  // Start voice dictation
  const startVoiceDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    setVoiceError(null);
    setVoiceDuration(0);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsVoiceListening(true);
        if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = setInterval(() => {
          setVoiceDuration((d) => d + 1);
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + " ";
          } else {
            currentInterim += transcript;
          }
        }

        if (finalChunk.trim()) {
          setInitialThought((prev) => {
            const cleaned = finalChunk.trim();
            if (!prev.trim()) return cleaned;
            const needsSpace = !prev.endsWith(" ") && !prev.endsWith("\n");
            return prev + (needsSpace ? " " : "") + cleaned;
          });
        }
        setInterimSpeech(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setVoiceError(
            "Microphone access was denied. Please allow microphone permission in your browser."
          );
        } else if (event.error === "no-speech") {
          // Keep listening
        } else {
          setVoiceError(`Microphone notice: ${event.error}`);
        }
        stopVoiceDictation();
      };

      recognition.onend = () => {
        stopVoiceDictation();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn("Could not start speech recognition:", err);
      setVoiceError("Could not activate microphone: " + (err.message || "Unknown error"));
      setIsVoiceListening(false);
    }
  };

  useEffect(() => {
    return () => {
      stopVoiceDictation();
    };
  }, []);

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
      setPhotoUrl(currentEntry.photoUrl);
      setPhotoCaption(currentEntry.photoCaption || "");
    } else {
      setEntryId("entry_" + Date.now());
      setDate(getTodayString());
      setTitle("");
      setMood("peaceful");
      setReflectionType("daily_reflection");
      setInitialThought("");
      setMessages([]);
      setSummary("");
      setInsights([]);
      setTags(["reflection"]);
      setFavorite(false);
      setPhotoUrl(undefined);
      setPhotoCaption("");
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
      photoUrl: photoUrl || undefined,
      photoCaption: photoCaption || undefined,
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveEntry(payload);
      setSaveStatus("Saved your entry!");

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

  // Append transcribed speech to thought
  const handleAppendVoiceTranscript = (text: string) => {
    setInitialThought((prev) => {
      const cleaned = text.trim();
      if (!cleaned) return prev;
      if (!prev.trim()) return cleaned;
      return prev.trim() + " " + cleaned;
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Daily Photo Modal */}
      <DailyPhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        date={date}
        initialPhotoUrl={photoUrl}
        initialCaption={photoCaption}
        onSavePhoto={(url, cap) => {
          setPhotoUrl(url);
          setPhotoCaption(cap);
        }}
        onRemovePhoto={() => {
          setPhotoUrl(undefined);
          setPhotoCaption("");
        }}
      />
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
          {currentEntry && onDeleteEntry && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Delete this reflection"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

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

      {/* Delete Confirmation Modal for Journal Editor */}
      {isDeleteModalOpen && currentEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E8DFC8] shadow-2xl space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-display text-lg font-bold text-[#2C241E]">
                Delete Reflection?
              </h3>
              <p className="text-xs text-[#7E6E5F] leading-relaxed">
                Are you sure you want to delete <strong className="text-[#2C241E]">"{title || currentEntry.title || "Reflective Musings"}"</strong> dated <strong>{date}</strong>? This action cannot be undone.
              </p>
            </div>

            {photoUrl && (
              <div className="p-2.5 bg-[#FAF7F2] rounded-xl border border-[#E8DFC8] flex items-center space-x-3 text-xs text-[#7E6E5F]">
                <img
                  src={photoUrl}
                  alt="Entry thumbnail"
                  className="w-10 h-10 rounded-lg object-cover border border-[#E8DFC8]"
                />
                <span className="truncate italic">
                  Includes associated daily photo moment
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="py-2.5 rounded-xl border border-[#E8DFC8] text-xs font-semibold text-[#4A3B32] hover:bg-[#FAF7F2] transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeleteEntry || !currentEntry) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteEntry(currentEntry.id);
                    setIsDeleteModalOpen(false);
                    onNewEntry();
                  } catch (err) {
                    console.error("Delete error:", err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Reflection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save status notification banner */}
      {saveStatus && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-900 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveStatus}</span>
          </div>
          {user && (
            <span className="text-[10px] text-amber-700">
              User: {user.email?.split("@")[0]}
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

            {/* Quick Sparks Carousel (Commented Out) */}
            {/*
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
            */}

            {/* Written Thoughts & Voice Diary Area */}
            <div className="space-y-2">
              {/* Compact Header Bar with Voice Diary & Photo Anchor */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#4A3B32] uppercase tracking-wider">
                    Written Thoughts
                  </span>
                  <span className="text-[10px] text-[#8C7B6C] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#E8DFC8]">
                    {wordCount} words
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Prompt Sparks 1-Click Dropdown */}
                  <PromptSparkPopover
                    onApplyPrompt={(promptText, sparkType) => {
                      handleApplySpark(promptText);
                      setReflectionType(sparkType);
                    }}
                  />

                  {/* Speak Thoughts / Voice Diary Button */}
                  {isVoiceListening ? (
                    <button
                      type="button"
                      onClick={stopVoiceDictation}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs animate-pulse"
                      title="Click to stop listening"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Listening ({voiceDuration}s) · Done</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startVoiceDictation}
                      className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-[#F5EBE1] text-[#935116] border border-[#E8DFC8] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                      title="Speak your thoughts directly into this entry"
                    >
                      <Mic className="w-3.5 h-3.5 text-[#BA4A00]" />
                      <span>Speak Thoughts</span>
                    </button>
                  )}

                  {/* Daily Photo Moment Visual Anchor Button */}
                  {photoUrl ? (
                    <div className="flex items-center space-x-1 bg-[#FAF7F2] pl-1 pr-1.5 py-0.5 rounded-xl border border-[#E8DFC8] shadow-2xs">
                      <div
                        onClick={() => setIsPhotoModalOpen(true)}
                        className="w-5 h-5 rounded-md overflow-hidden bg-black/5 cursor-pointer hover:opacity-80 border border-[#E8DFC8]"
                        title="View / change daily photo"
                      >
                        <img
                          src={photoUrl}
                          alt="Moment"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPhotoModalOpen(true)}
                        className="text-[11px] font-semibold text-[#BA4A00] hover:underline px-1"
                      >
                        Photo Attached
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoUrl(undefined);
                          setPhotoCaption("");
                        }}
                        className="text-[#8C7B6C] hover:text-red-600 p-0.5"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-[#F5EBE1] text-[#4A3B32] border border-[#E8DFC8] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                      title="Capture or select a daily photo moment"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#BA4A00]" />
                      <span>+ Daily Photo</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Slim Live Voice Feedback Banner (when active) */}
              {isVoiceListening && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-orange-50/90 border border-orange-200 text-xs text-orange-950">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <span className="flex space-x-0.5 items-center">
                      <span
                        className="w-1 h-3 bg-[#D35400] rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-1 h-4 bg-[#D35400] rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-1 h-2.5 bg-[#D35400] rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </span>
                    <span className="font-semibold text-[11px] text-[#BA4A00]">
                      Transcribing live:
                    </span>
                    <span className="italic text-[11px] text-[#5A4B3F] truncate">
                      {interimSpeech || "Speak freely into your microphone..."}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopVoiceDictation}
                    className="text-[11px] font-bold text-[#BA4A00] hover:underline shrink-0 ml-2"
                  >
                    Finish Dictation
                  </button>
                </div>
              )}

              {/* Voice Notice (if any) */}
              {voiceError && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                  <span>{voiceError}</span>
                  <button
                    type="button"
                    onClick={() => setVoiceError(null)}
                    className="text-amber-800 font-bold ml-2 p-0.5"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Writing Textarea Canvas */}
              <div className="relative">
                <textarea
                  value={initialThought}
                  onChange={(e) => setInitialThought(e.target.value)}
                  placeholder="Pour your thoughts freely onto this page... Or click 'Speak Thoughts' above to dictate naturally with your voice."
                  rows={12}
                  className="w-full p-4 rounded-xl bg-[#FAF7F2]/50 border border-[#E8DFC8] text-base text-[#2C241E] placeholder-[#A8988A] focus:outline-none focus:ring-2 focus:ring-[#BA4A00]/30 font-journal leading-relaxed resize-y"
                />

                {/* Minimalist Floating Photo Anchor Stamp (if photo exists) */}
                {photoUrl && (
                  <div
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="absolute top-3 right-3 w-16 h-16 rounded-lg overflow-hidden bg-white p-1 shadow-md border border-[#E8DFC8] cursor-pointer hover:scale-105 transition-transform group"
                    title="Click to preview or edit daily photo"
                  >
                    <img
                      src={photoUrl}
                      alt="Visual Anchor"
                      className="w-full h-full object-cover rounded"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
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

        {/* Right Column (5 cols): Daily Habits & Focus Tasks + Multi-Turn AI Reflections */}
        <div className="lg:col-span-5 space-y-6">
          {/* Interactive Daily Checklist & Tomorrow Planning Dock */}
          {onUpdateChecklist && onUpdateTomorrowChecklist && onOpenHabitManager && (
            <DailyChecklistDock
              currentDate={date}
              checklist={dailyChecklist || null}
              habitTemplates={habitTemplates}
              tomorrowChecklist={tomorrowChecklist || null}
              onUpdateChecklist={onUpdateChecklist}
              onUpdateTomorrowChecklist={onUpdateTomorrowChecklist}
              onOpenHabitManager={onOpenHabitManager}
              streakDays={streakDays}
            />
          )}

          {/* Unified Multi-Turn AI Companion & Insights Panel */}
          <div className="bg-white rounded-2xl border border-[#E8DFC8] shadow-xs flex flex-col h-[600px] overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-[#FAF7F2] border-b border-[#E8DFC8] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#D35400] text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-sm text-[#2C241E]">
                    Warmth AI Companion
                  </h4>
                  <p className="text-[10px] text-[#7E6E5F]">
                    Empathetic reflections & insights
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleSummarizeEntry}
                  disabled={isSummarizing || (!initialThought.trim() && messages.length === 0)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white border border-[#E8DFC8] text-[#935116] font-semibold hover:bg-[#F5EBE1] disabled:opacity-40 transition-colors flex items-center space-x-1"
                  title="Synthesize core essence & takeaways"
                >
                  {isSummarizing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Layers className="w-3 h-3 text-[#BA4A00]" />
                  )}
                  <span>{summary ? "Re-Synthesize" : "Synthesize"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendReflection()}
                  disabled={isReflecting || !initialThought.trim()}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[#D35400] text-white font-semibold hover:bg-[#BA4A00] disabled:opacity-40 transition-colors shadow-xs"
                >
                  Reflect
                </button>
              </div>
            </div>

            {/* Scrollable Content Stream: Highlights + Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF7F2]/30">
              {/* Optional Synthesized Essence Block (if present) */}
              {summary && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-[#E67E22]" />
                      <span>Distilled Essence</span>
                    </span>
                    {insights.length > 0 && <span>{insights.length} Takeaways</span>}
                  </div>
                  <p className="text-xs font-journal text-[#3E3127] italic leading-relaxed">
                    "{summary}"
                  </p>
                  {insights.length > 0 && (
                    <div className="pt-1.5 border-t border-amber-200/50 space-y-1">
                      {insights.map((insight, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-[#4A3B32] font-journal flex items-start space-x-1.5"
                        >
                          <span className="text-[#BA4A00] font-bold">•</span>
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chat Message Stream */}
              {messages.length === 0 && !summary ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8C7B6C] space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#F5EBE1] flex items-center justify-center text-[#BA4A00]">
                    <Feather className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#4A3B32]">
                      Your reflective sanctuary is quiet
                    </p>
                    <p className="text-[11px] max-w-xs">
                      Write your thoughts on the left, then click <strong>"Reflect"</strong> or <strong>"Synthesize"</strong> above to explore deeper.
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
                  placeholder="Ask a question or explore a thought deeper..."
                  disabled={isReflecting}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] text-xs text-[#2C241E] placeholder-[#9E8E80] focus:outline-none focus:ring-2 focus:ring-[#BA4A00]/40 font-journal"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isReflecting}
                  className="p-2 bg-[#D35400] hover:bg-[#BA4A00] disabled:opacity-40 text-white rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
