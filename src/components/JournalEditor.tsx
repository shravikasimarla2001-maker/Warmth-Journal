import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  Send,
  Save,
  CheckCircle2,
  Check,
  AlertTriangle,
  Calendar,
  Smile,
  Plus,
  Tag,
  Feather,
  BookOpen,
  RefreshCw,
  Trash2,
  Lightbulb,
  Heart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  DailyWisdomItem,
  WisdomStream,
  DailyChecklist,
  HabitTemplate,
} from "../types";
import { User } from "firebase/auth";
import { DailyPhotoModal } from "./DailyPhotoModal";
// import { VoiceDictationBar } from "./VoiceDictationBar";
import { DailyChecklistDock } from "./DailyChecklistDock";
import { PromptSparkPopover } from "./PromptSparkPopover";
import { DailyWisdomCard } from "./DailyWisdomCard";
import { WisdomTreasuryModal } from "./WisdomTreasuryModal";
import { getDailyWisdom } from "../data/wisdomLibrary";

interface JournalEditorProps {
  user: User | null;
  currentEntry: JournalEntry | null;
  onSaveEntry: (entry: Partial<JournalEntry>) => Promise<string | void>;
  onNewEntry: () => void;
  onDeleteEntry?: (entryId: string) => Promise<void> | void;
  telemetry: ModelTelemetry | null;
  onSelectDateInCalendar?: (date: string) => void;
  entries?: JournalEntry[];
  onChangeDate?: (date: string) => void;
  dailyChecklist?: DailyChecklist | null;
  tomorrowChecklist?: DailyChecklist | null;
  dailyChecklists?: Record<string, DailyChecklist>;
  habitTemplates?: HabitTemplate[];
  onUpdateChecklist?: (checklist: DailyChecklist) => Promise<void>;
  onUpdateTomorrowChecklist?: (checklist: DailyChecklist) => Promise<void>;
  onOpenHabitManager?: () => void;
  streakDays?: number;
  bookmarkedWisdomIds?: string[];
  onToggleWisdomBookmark?: (item: DailyWisdomItem) => void;
  defaultWisdomStream?: WisdomStream;
  enableCamera?: boolean;
  enableMicrophone?: boolean;
  onSaveEnabledChange?: (canSave: boolean) => void;
}

const DEFAULT_FEELINGS: { type: MoodType; label: string; icon: string; color: string }[] = [
  { type: "calm", label: "Calm", icon: "🌿", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { type: "happy", label: "Happy", icon: "😊", color: "bg-amber-50 text-amber-900 border-amber-200" },
  { type: "grateful", label: "Grateful", icon: "🙏", color: "bg-yellow-50 text-yellow-900 border-yellow-200" },
  { type: "low", label: "Low", icon: "🌧️", color: "bg-blue-50 text-blue-900 border-blue-200" },
  { type: "overwhelmed", label: "Overwhelmed", icon: "⚡", color: "bg-orange-50 text-orange-900 border-orange-200" },
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
  dailyChecklists = {},
  entries = [],
  onChangeDate,
  habitTemplates = [],
  onUpdateChecklist,
  onUpdateTomorrowChecklist,
  onOpenHabitManager,
  streakDays = 0,
  bookmarkedWisdomIds = [],
  onToggleWisdomBookmark,
  defaultWisdomStream = "all",
  enableCamera = true,
  enableMicrophone = true,
  onSaveEnabledChange,
}) => {
  // Today's date YYYY-MM-DD
  const getTodayString = () => new Date().toISOString().split("T")[0];

  const [entryId, setEntryId] = useState<string>(
    currentEntry?.id || "entry_" + Date.now()
  );
  const [date, setDate] = useState<string>(
    currentEntry?.date || getTodayString()
  );

  // Active checklist dynamically derived strictly from current selected editor date
  const activeChecklist = useMemo(() => {
    if (dailyChecklists && dailyChecklists[date]) {
      return dailyChecklists[date];
    }
    return null;
  }, [dailyChecklists, date]);

  // Tomorrow checklist dynamically derived strictly from day after current selected date
  const activeTomorrowChecklist = useMemo(() => {
    const nextDayObj = new Date(date + "T12:00:00Z");
    nextDayObj.setDate(nextDayObj.getDate() + 1);
    const nextDayStr = nextDayObj.toISOString().split("T")[0];
    if (dailyChecklists && dailyChecklists[nextDayStr]) {
      return dailyChecklists[nextDayStr];
    }
    return null;
  }, [dailyChecklists, date]);

  // Date navigation helpers for top action bar
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isDateToday = date === todayStr;

  // Textarea ref for auto-expand: starts compact (min-h 110px), grows up to 290px, then adds vertical scroll
  const thoughtTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState<string>(
    currentEntry?.title || ""
  );
  const [mood, setMood] = useState<MoodType>(
    currentEntry?.mood || "calm"
  );
  const [customFeelings, setCustomFeelings] = useState<string[]>(
    currentEntry?.customFeelings || []
  );
  const [feelingInput, setFeelingInput] = useState<string>("");
  const [reflectionType, setReflectionType] = useState<ReflectionType>(
    currentEntry?.reflectionType ||
     "daily_reflection"
  );
  const [initialThought, setInitialThought] = useState<string>(
    currentEntry?.initialThought || ""
  );

  useEffect(() => {
    if (thoughtTextareaRef.current) {
      thoughtTextareaRef.current.style.height = "auto";
      const scrollH = thoughtTextareaRef.current.scrollHeight;
      const clampedHeight = Math.min(Math.max(scrollH, 110), 290);
      thoughtTextareaRef.current.style.height = `${clampedHeight}px`;
    }
  }, [initialThought]);
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
  const [favorite, setFavorite] = useState<boolean>(
    currentEntry?.favorite || false
  );
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(
    currentEntry?.photoUrl
  );
  const [photoCaption, setPhotoCaption] = useState<string>(
    currentEntry?.photoCaption || ""
  );
  // Real creation timestamp for this entry (irrespective of calendar date)
  const [createdAtState, setCreatedAtState] = useState<string>(
    currentEntry?.createdAt || new Date().toISOString()
  );

  // Exactly ONE entry per day: check whether an entry exists for the currently selected calendar date
  const existingSavedEntry = useMemo(() => {
    return entries.find((e) => e.date === date);
  }, [entries, date]);

  const isExistingEntry = !!existingSavedEntry;

  // Has user added any core content to an entry
  const hasAddedContent = useMemo(() => {
    return (
      title.trim().length > 0 ||
      initialThought.trim().length > 0 ||
      messages.length > 0 ||
      !!photoUrl ||
      photoCaption.trim().length > 0 ||
      summary.trim().length > 0 ||
      insights.length > 0
    );
  }, [title, initialThought, messages, photoUrl, photoCaption, summary, insights]);

  // Check whether user has unsaved edits/additions on this reflection
  const hasUnsavedChanges = useMemo(() => {
    if (isExistingEntry && existingSavedEntry) {
      const titleChanged = title.trim() !== (existingSavedEntry.title || "").trim();
      const thoughtChanged = initialThought.trim() !== (existingSavedEntry.initialThought || "").trim();
      const moodChanged = mood !== existingSavedEntry.mood;
      const feelingsChanged =
        JSON.stringify(customFeelings) !==
        JSON.stringify(existingSavedEntry.customFeelings || []);
      const typeChanged = reflectionType !== (existingSavedEntry.reflectionType || "daily_reflection");
      const summaryChanged = summary.trim() !== (existingSavedEntry.summary || "").trim();
      const photoChanged = (photoUrl || null) !== (existingSavedEntry.photoUrl || null);
      const photoCaptionChanged = photoCaption.trim() !== (existingSavedEntry.photoCaption || "").trim();
      const favChanged = favorite !== (existingSavedEntry.favorite || false);
      const insightsChanged = JSON.stringify(insights) !== JSON.stringify(existingSavedEntry.insights || []);
      const messagesChanged = messages.length !== (existingSavedEntry.messages?.length || 0);

      return (
        titleChanged ||
        thoughtChanged ||
        moodChanged ||
        feelingsChanged ||
        typeChanged ||
        summaryChanged ||
        photoChanged ||
        photoCaptionChanged ||
        favChanged ||
        insightsChanged ||
        messagesChanged
      );
    } else {
      // For a day without an existing entry: consider modified ONLY if actual inputs have been added
      return hasAddedContent;
    }
  }, [
    isExistingEntry,
    existingSavedEntry,
    title,
    initialThought,
    mood,
    customFeelings,
    reflectionType,
    summary,
    photoUrl,
    photoCaption,
    favorite,
    insights,
    messages,
    hasAddedContent,
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Save is enabled ONLY if user has added anything / there are unsaved changes
  const isSaveDisabled = isSaving || (!isExistingEntry ? !hasAddedContent : !hasUnsavedChanges);

  // Warn user about leaving ONLY if save entry is enabled and there are unsaved inputs
  const shouldWarnOnLeave = !isSaveDisabled && hasUnsavedChanges;

  useEffect(() => {
    if (onSaveEnabledChange) {
      onSaveEnabledChange(shouldWarnOnLeave);
    }
  }, [shouldWarnOnLeave, onSaveEnabledChange]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldWarnOnLeave) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldWarnOnLeave]);

  // Unsaved changes warning state
  const [isUnsavedWarningModalOpen, setIsUnsavedWarningModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "date_change";
    targetDate?: string;
  } | null>(null);

  const executeDateChange = (targetDate: string) => {
    setDate(targetDate);
    if (onChangeDate) {
      onChangeDate(targetDate);
    }
    // Check if an entry already exists for targetDate in memories archive (strictly 1 entry per day)
    const existing = entries.find((e) => e.date === targetDate);
    if (existing) {
      setEntryId(existing.id);
      setTitle(existing.title || "");
      setMood(existing.mood || "calm");
      setCustomFeelings(existing.customFeelings || []);
      setReflectionType(existing.reflectionType || "daily_reflection");
      setInitialThought(existing.initialThought || "");
      setMessages(existing.messages || []);
      setSummary(existing.summary || "");
      setInsights(existing.insights || []);
      setTags(existing.tags || ["reflection"]);
      setFavorite(existing.favorite || false);
      setPhotoUrl(existing.photoUrl);
      setPhotoCaption(existing.photoCaption || "");
      setCreatedAtState(existing.createdAt || new Date().toISOString());
      if (existing.wisdom) {
        setCurrentWisdom(existing.wisdom);
      } else {
        setCurrentWisdom(getDailyWisdom(existing.mood || "calm", preferredStream, 0));
      }
    } else {
      // Fresh new reflection entry for this date
      setEntryId("entry_" + Date.now());
      setTitle("");
      setMood("calm");
      setCustomFeelings([]);
      setReflectionType("daily_reflection");
      setInitialThought("");
      setMessages([]);
      setSummary("");
      setInsights([]);
      setTags(["reflection"]);
      setFavorite(false);
      setPhotoUrl(undefined);
      setPhotoCaption("");
      setCreatedAtState(new Date().toISOString());
      setCurrentWisdom(getDailyWisdom("calm", preferredStream, 0));
    }
  };

  const handleDateChange = (targetDate: string) => {
    if (targetDate === date) return;
    if (shouldWarnOnLeave) {
      setPendingAction({ type: "date_change", targetDate });
      setIsUnsavedWarningModalOpen(true);
    } else {
      executeDateChange(targetDate);
    }
  };

  const goToPreviousDate = () => {
    const d = new Date(date + "T12:00:00Z");
    d.setDate(d.getDate() - 1);
    handleDateChange(d.toISOString().split("T")[0]);
  };

  const goToNextDate = () => {
    const d = new Date(date + "T12:00:00Z");
    d.setDate(d.getDate() + 1);
    handleDateChange(d.toISOString().split("T")[0]);
  };

  const jumpToToday = () => {
    handleDateChange(todayStr);
  };

  // Add a new feeling on top of the basic 4-5 discrete feelings
  const handleAddFeeling = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && "key" in e && e.key !== "Enter") return;
    if (e) e.preventDefault();
    const trimmed = feelingInput.trim();
    if (!trimmed) return;
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (
      !customFeelings.includes(capitalized) &&
      !DEFAULT_FEELINGS.some((f) => f.label.toLowerCase() === trimmed.toLowerCase())
    ) {
      setCustomFeelings([...customFeelings, capitalized]);
    }
    setMood(capitalized);
    setFeelingInput("");
    triggerDynamicWisdomMatch(initialThought, capitalized, preferredStream);
  };

  // Remove a custom feeling
  const handleRemoveCustomFeeling = (feelingToRemove: string) => {
    const updated = customFeelings.filter((f) => f !== feelingToRemove);
    setCustomFeelings(updated);
    if (mood === feelingToRemove) {
      setMood("calm");
    }
  };

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showVoiceBar, setShowVoiceBar] = useState(false);

  // Daily Wisdom & Gita Shloka State
  const [preferredStream, setPreferredStream] = useState<WisdomStream>(() => {
    try {
      return (
        (localStorage.getItem("warmth_wisdom_stream") as WisdomStream) ||
        defaultWisdomStream
      );
    } catch {
      return defaultWisdomStream;
    }
  });

  // Sync if defaultWisdomStream changes from Settings
  useEffect(() => {
    if (defaultWisdomStream) {
      setPreferredStream(defaultWisdomStream);
      setCurrentWisdom(getDailyWisdom(mood, defaultWisdomStream, wisdomCycleOffset));
    }
  }, [defaultWisdomStream]);

  const [wisdomCycleOffset, setWisdomCycleOffset] = useState(0);
  const [currentWisdom, setCurrentWisdom] = useState<DailyWisdomItem>(() => {
    if (currentEntry?.wisdom) return currentEntry.wisdom;
    return getDailyWisdom(currentEntry?.mood || "calm", defaultWisdomStream, 0);
  });
  const [isTreasuryOpen, setIsTreasuryOpen] = useState(false);

  // Debounced auto-matching of wisdom based on entry content and mood
  const autoMatchTimeoutRef = useRef<any>(null);

  const triggerDynamicWisdomMatch = (text: string, currentSelectedMood: MoodType, stream: WisdomStream) => {
    // If text has substantive thoughts (> 25 chars), call the LLM backend to analyze both mood & reflection
    if (text.trim().length > 25) {
      if (autoMatchTimeoutRef.current) {
        clearTimeout(autoMatchTimeoutRef.current);
      }
      autoMatchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/analyze-wisdom", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entryText: text,
              preferredStream: stream,
              userMood: currentSelectedMood,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.wisdom) {
              setCurrentWisdom(data.wisdom);
            }
          }
        } catch (e) {
          // Graceful fallback to mood library
          setCurrentWisdom(getDailyWisdom(currentSelectedMood, stream, 0));
        }
      }, 1200); // 1.2s typing pause debounce
    } else {
      // For short / initial text, instantly synchronize with curated mood library
      setCurrentWisdom(getDailyWisdom(currentSelectedMood, stream, 0));
    }
  };
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
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const userHasInteractedWithChat = useRef(false);

  // When routed to Today page or mounted, stay at the top of the page
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // Sync state when currentEntry changes
  useEffect(() => {
    if (currentEntry) {
      setEntryId(currentEntry.id);
      setDate(currentEntry.date || getTodayString());
      setTitle(currentEntry.title || "");
      setMood(currentEntry.mood || "calm");
      setCustomFeelings(currentEntry.customFeelings || []);
      setReflectionType(currentEntry.reflectionType || "daily_reflection");
      setInitialThought(currentEntry.initialThought || "");
      setMessages(currentEntry.messages || []);
      setSummary(currentEntry.summary || "");
      setInsights(currentEntry.insights || []);
      setTags(currentEntry.tags || ["reflection"]);
      setFavorite(currentEntry.favorite || false);
      setPhotoUrl(currentEntry.photoUrl);
      setPhotoCaption(currentEntry.photoCaption || "");
      setCreatedAtState(currentEntry.createdAt || new Date().toISOString());
      if (currentEntry.wisdom) {
        setCurrentWisdom(currentEntry.wisdom);
      } else {
        setCurrentWisdom(getDailyWisdom(currentEntry.mood || "calm", preferredStream, 0));
      }
    }
  }, [currentEntry]);

  // Scroll chat messages internally ONLY when user actively reflects or chats, NEVER on initial mount or page navigation
  useEffect(() => {
    if (!userHasInteractedWithChat.current) return;
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
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

    userHasInteractedWithChat.current = true;
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

    if (!title.trim() && finalTitle) {
      setTitle(finalTitle);
    }

    const payload: Partial<JournalEntry> = {
      id: entryId,
      date,
      title: finalTitle,
      mood,
      customFeelings,
      reflectionType,
      initialThought,
      summary,
      insights,
      tags,
      wisdom: currentWisdom,
      messages: customMessages || messages,
      favorite,
      wordCount,
      photoUrl: photoUrl || null,
      photoCaption: photoCaption || null,
      createdAt: createdAtState || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveEntry(payload);
      setSaveStatus(`Saved your journaling & AI reflections for ${date}!`);

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

  // Warning Modal Action Handlers
  const handleModalSaveAndContinue = async () => {
    try {
      await handleSave();
      setIsUnsavedWarningModalOpen(false);
      const action = pendingAction;
      setPendingAction(null);
      if (action?.type === "date_change" && action.targetDate) {
        executeDateChange(action.targetDate);
      }
    } catch (e) {
      console.error("Failed to save before proceeding:", e);
    }
  };

  const handleModalDiscardAndContinue = () => {
    setIsUnsavedWarningModalOpen(false);
    const action = pendingAction;
    setPendingAction(null);
    if (action?.type === "date_change" && action.targetDate) {
      executeDateChange(action.targetDate);
    }
  };

  const handleModalCancel = () => {
    setIsUnsavedWarningModalOpen(false);
    setPendingAction(null);
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

      {/* Top Action Bar: Date Navigation & Wisdom for Today side-by-side */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-[#E8DFC8] shadow-xs">
        <DailyWisdomCard
          embedded={true}
          dateControl={
            <div className="flex items-center space-x-0.5 bg-[#FAF7F2] p-1 rounded-xl border border-[#E8DFC8]">
              <button
                type="button"
                onClick={goToPreviousDate}
                className="p-1.5 rounded-lg text-[#7E6E5F] hover:text-[#2C241E] hover:bg-white transition-colors cursor-pointer"
                title="Go to previous day"
                aria-label="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1.5 px-2 py-0.5">
                <Calendar className="w-4 h-4 text-[#BA4A00] shrink-0" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#2C241E] focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={goToNextDate}
                className="p-1.5 rounded-lg text-[#7E6E5F] hover:text-[#2C241E] hover:bg-white transition-colors cursor-pointer"
                title="Go to next day"
                aria-label="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {!isDateToday && (
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="ml-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#BA4A00] text-white hover:bg-[#A04000] transition-colors cursor-pointer"
                  title="Jump to today"
                >
                  Today
                </button>
              )}
            </div>
          }
          wisdom={currentWisdom}
          currentMood={mood}
          preferredStream={preferredStream}
          onChangeStream={(stream) => {
            setPreferredStream(stream);
            try {
              localStorage.setItem("warmth_wisdom_stream", stream);
            } catch (e) {
              // ignore
            }
            setWisdomCycleOffset(0);
            setCurrentWisdom(getDailyWisdom(mood, stream, 0));
            triggerDynamicWisdomMatch(initialThought, mood, stream);
          }}
          onCycleWisdom={() => {
            const nextOffset = wisdomCycleOffset + 1;
            setWisdomCycleOffset(nextOffset);
            setCurrentWisdom(getDailyWisdom(mood, preferredStream, nextOffset));
          }}
          onSaveBookmark={onToggleWisdomBookmark}
          isBookmarked={bookmarkedWisdomIds?.includes(currentWisdom.id) || false}
          onOpenTreasury={() => setIsTreasuryOpen(true)}
        />
      </div>

      {/* Unsaved Changes Warning Modal */}
      {isUnsavedWarningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E8DFC8] shadow-2xl space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-display text-lg font-bold text-[#2C241E]">
                Save Entry First?
              </h3>
              <p className="text-xs text-[#7E6E5F] leading-relaxed">
                You have unsaved edits on your reflection for{" "}
                <strong className="text-[#2C241E]">{date}</strong>.
                Save your entry now so your thoughts and AI reflections are saved, or choose to discard before switching dates.
              </p>
            </div>

            {/* Quick Preview of Unsaved Content */}
            <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8DFC8] text-xs text-[#5C4D42] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#8C7B6C] font-semibold uppercase tracking-wider">
                <span>Unsaved Reflection</span>
                <span>{wordCount} words</span>
              </div>
              <p className="line-clamp-2 italic text-[#4A3B32]">
                "{title || initialThought || "Draft reflection in progress..."}"
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {/* Option 1: Save and continue */}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleModalSaveAndContinue}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:opacity-95 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Entry &amp; Switch Date</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Option 2: Discard and proceed */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleModalDiscardAndContinue}
                  className="py-2.5 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-50 text-xs font-semibold text-red-700 transition-colors cursor-pointer text-center"
                >
                  Discard &amp; Switch Date
                </button>

                {/* Option 3: Keep editing / cancel */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleModalCancel}
                  className="py-2.5 rounded-xl border border-[#E8DFC8] bg-white hover:bg-[#FAF7F2] text-xs font-semibold text-[#4A3B32] transition-colors cursor-pointer text-center"
                >
                  Keep Editing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    executeDateChange(date);
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
            {/* Entry Differentiation & Favorite Bar in Journal Card */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-[#E8DFC8]/70">
              <div className="flex flex-wrap items-center gap-2">
                {isExistingEntry ? (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Editing Saved Day</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                    <Feather className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>New Day Draft</span>
                  </span>
                )}

                <div className="text-xs text-[#7E6E5F] flex items-center space-x-1">
                  {isExistingEntry ? (
                    <span>
                      Reflection for <strong className="text-[#2C241E]">{date}</strong>
                      {createdAtState && (
                        <span className="text-[#9C8E7E]">
                          {" "}• Saved at {new Date(createdAtState).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>
                      Reflection for <strong className="text-[#2C241E]">{date}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons in Journal Card: Delete (if saved), Favorite, and Save Entry */}
              <div className="flex items-center space-x-2">
                {isExistingEntry && onDeleteEntry && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all flex items-center space-x-1 cursor-pointer"
                    title="Delete this saved reflection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}

                {/* Favorite Toggle Button directly in Journal Card */}
                <button
                  type="button"
                  onClick={() => setFavorite(!favorite)}
                  className={`px-3 py-1.5 rounded-xl border transition-all flex items-center space-x-1.5 text-xs font-medium cursor-pointer ${
                    favorite
                      ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs"
                      : "bg-[#FAF7F2] text-[#7E6E5F] border-[#E8DFC8] hover:bg-white hover:text-[#2C241E]"
                  }`}
                  title="Mark as Favorite Reflection"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      favorite ? "fill-amber-400 text-amber-500" : "text-[#7E6E5F]"
                    }`}
                  />
                  <span>{favorite ? "Favorited" : "Favorite"}</span>
                </button>

                {/* Save Entry Button directly inside Journaling Card */}
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={isSaveDisabled}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all ${
                    isSaveDisabled
                      ? "bg-[#EDE5D8] text-[#A39282] cursor-not-allowed border border-[#DFD5C4]"
                      : "bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:opacity-95 text-white hover:scale-102 cursor-pointer shadow-md"
                  }`}
                  title="Saves your written journaling thoughts and all AI reflections for this day"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : !hasUnsavedChanges && isExistingEntry ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isSaving
                      ? "Saving..."
                      : !hasUnsavedChanges && isExistingEntry
                      ? "Saved"
                      : isExistingEntry
                      ? "Save Changes"
                      : "Save Entry"}
                  </span>
                </button>
              </div>
            </div>

            {/* Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title your reflection... (or let AI suggest one)"
              className="w-full font-display text-2xl sm:text-3xl font-semibold text-[#2C241E] placeholder-[#B5A595] focus:outline-none border-b border-transparent focus:border-[#E8DFC8] pb-1 transition-all"
            />

            {/* Feelings Selector: 4-5 Discrete Feelings + Custom Add Feeling */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#8C7B6C] uppercase tracking-wider flex items-center space-x-1.5">
                  <Smile className="w-3.5 h-3.5 text-[#BA4A00]" />
                  <span>How are you feeling today?</span>
                </label>
                {mood && (
                  <span className="text-[11px] text-[#7E6E5F]">
                    Active feeling: <strong className="text-[#2C241E] capitalize">{mood}</strong>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* 4-5 Discrete Feelings */}
                {DEFAULT_FEELINGS.map((f) => {
                  const isSelected =
                    mood.toLowerCase() === f.type.toLowerCase() ||
                    mood.toLowerCase() === f.label.toLowerCase();
                  return (
                    <button
                      key={f.type}
                      type="button"
                      onClick={() => {
                        setMood(f.type);
                        setWisdomCycleOffset(0);
                        triggerDynamicWisdomMatch(initialThought, f.type, preferredStream);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center space-x-1.5 cursor-pointer ${
                        isSelected
                          ? `${f.color} ring-2 ring-[#BA4A00]/40 font-semibold scale-102 shadow-2xs`
                          : "bg-[#FAF7F2] text-[#6E5D4F] border-[#E8DFC8] hover:bg-white"
                      }`}
                    >
                      <span>{f.icon}</span>
                      <span>{f.label}</span>
                    </button>
                  );
                })}

                {/* Custom Feelings Added by User */}
                {customFeelings.map((cf) => {
                  const isSelected = mood.toLowerCase() === cf.toLowerCase();
                  return (
                    <span
                      key={cf}
                      onClick={() => {
                        setMood(cf);
                        triggerDynamicWisdomMatch(initialThought, cf, preferredStream);
                      }}
                      className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-[#BA4A00]/40 font-semibold scale-102 shadow-2xs"
                          : "bg-[#F5EBE1] text-[#935116] border-[#E8DFC8] hover:bg-white"
                      }`}
                    >
                      <span>✨ {cf}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCustomFeeling(cf);
                        }}
                        className="hover:text-red-600 font-bold ml-1 text-xs cursor-pointer"
                        title="Remove custom feeling"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}

                {/* Add Feeling Input */}
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={feelingInput}
                    onChange={(e) => setFeelingInput(e.target.value)}
                    onKeyDown={handleAddFeeling}
                    placeholder="+ Add feeling (Enter)"
                    className="px-3 py-1.5 text-xs rounded-full bg-[#FAF7F2] border border-[#E8DFC8] text-[#2C241E] placeholder-[#9E8E80] focus:outline-none focus:border-[#BA4A00] focus:ring-1 focus:ring-[#BA4A00]/30 w-36 transition-all"
                  />
                  {feelingInput.trim() && (
                    <button
                      type="button"
                      onClick={handleAddFeeling}
                      className="p-1.5 rounded-full bg-[#BA4A00] text-white hover:bg-[#A04000] cursor-pointer transition-colors shadow-2xs"
                      title="Add feeling"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
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
                  {enableMicrophone && (
                    isVoiceListening ? (
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
                    )
                  )}

                  {/* Daily Photo Moment Visual Anchor Button */}
                  {enableCamera && (
                    photoUrl ? (
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
                        <span>+ Photo Moment</span>
                      </button>
                    )
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
                  ref={thoughtTextareaRef}
                  value={initialThought}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setInitialThought(nextVal);
                    triggerDynamicWisdomMatch(nextVal, mood, preferredStream);
                  }}
                  placeholder="Pour your thoughts freely onto this page... Or click 'Speak Thoughts' above to dictate naturally with your voice."
                  className="w-full min-h-[140px] max-h-[320px] overflow-y-auto p-4 rounded-xl bg-[#FAF7F2]/50 border border-[#E8DFC8] text-base text-[#2C241E] placeholder-[#A8988A] focus:outline-none focus:ring-2 focus:ring-[#BA4A00]/30 font-journal leading-relaxed resize-none"
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

              {/* Integrated Writing Toolbar & AI Actions (In the Same Continuous Space) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E8DFC8]/60">
                <div className="text-xs text-[#7E6E5F] font-journal space-x-1">
                  <span>{initialThought.trim() ? initialThought.trim().split(/\s+/).length : 0} words written</span>
                  {/* Reading Time Indicator */}
                  <span>~{estimatedReadTime} min read</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleSummarizeEntry}
                    disabled={isSummarizing || (!initialThought.trim() && messages.length === 0)}
                    className="text-xs px-2.5 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] text-[#935116] font-semibold hover:bg-[#F5EBE1] disabled:opacity-40 transition-colors flex items-center space-x-1 cursor-pointer"
                    title="Synthesize core essence & takeaways from your thoughts"
                  >
                    {isSummarizing ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Layers className="w-3 h-3 text-[#BA4A00]" />
                    )}
                    <span>{summary ? "Re-Synthesize" : "Synthesize Essence"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendReflection()}
                    disabled={isReflecting || !initialThought.trim()}
                    className="text-xs px-3 py-1.5 rounded-xl bg-[#D35400] text-white font-semibold hover:bg-[#BA4A00] disabled:opacity-40 transition-colors shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                    title="Receive an empathetic AI reflection on your written thoughts"
                  >
                    {isReflecting ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-200" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-amber-200" />
                    )}
                    <span>Reflect with AI</span>
                  </button>
                </div>
              </div>

              {/* Distilled Summary & Insights (In Same Space if Generated) */}
              {summary && (
                <div className="mt-2 p-4 rounded-2xl bg-amber-50/80 border-l-4 border-[#D35400] border-t border-r border-b border-amber-200/70 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-950 uppercase tracking-wider">
                    <span className="flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#E67E22]" />
                      <span>Distilled Essence</span>
                    </span>
                    {insights.length > 0 && <span className="text-[10px] text-amber-800 font-medium">{insights.length} Takeaways</span>}
                  </div>
                  <p className="text-sm font-journal text-[#3E3127] italic leading-relaxed">
                    "{summary}"
                  </p>
                  {insights.length > 0 && (
                    <div className="pt-2 border-t border-amber-200/50 space-y-1">
                      {insights.map((insight, idx) => (
                        <div key={idx} className="text-xs text-[#4A3B32] font-journal flex items-start space-x-2">
                          <span className="text-[#BA4A00] font-bold">•</span>
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Seamless AI Reflections Stream & Inline Prompt in the Same Canvas */}
              {messages.length > 0 || isReflecting ? (
                <div className="mt-3 pt-3 border-t border-[#E8DFC8]/70 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#5A4B3E]">
                      <Sparkles className="w-3.5 h-3.5 text-[#BA4A00]" />
                      <span>Reflective Dialogue for {date}</span>
                    </div>
                    <span className="text-[10px] text-[#8C7B6C]">Saved into this day's entry</span>
                  </div>

                  <div
                    ref={chatContainerRef}
                    className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1"
                  >
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.sender === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <div className="flex items-center space-x-1 text-[10px] text-[#8C7B6C] mb-0.5 px-1">
                          <span className="font-semibold">{msg.sender === "user" ? "You" : "Warmth AI"}</span>
                          <span>·</span>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          className={`p-3 rounded-2xl text-xs sm:text-sm font-journal leading-relaxed whitespace-pre-line ${
                            msg.sender === "user"
                              ? "bg-[#2C241E] text-[#FAF7F2] rounded-br-xs max-w-[88%] shadow-2xs"
                              : "bg-[#FAF7F2] text-[#2C241E] border border-[#E8DFC8] rounded-bl-xs w-full shadow-2xs"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {isReflecting && (
                      <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8DFC8] text-xs font-journal text-[#7E6E5F] flex items-center space-x-2 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-[#E67E22] animate-spin" />
                        <span>Warmth is contemplating your words...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Inline Conversational Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendReflection();
                    }}
                    className="flex items-center space-x-2 pt-1"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask a reflective question or continue exploring deeper..."
                      disabled={isReflecting}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] text-xs text-[#2C241E] placeholder-[#9E8E80] focus:outline-none focus:ring-2 focus:ring-[#BA4A00]/40 font-journal"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isReflecting}
                      className="p-2 bg-[#D35400] hover:bg-[#BA4A00] disabled:opacity-40 text-white rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                      title="Send message to AI companion"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="pt-2 text-center text-[11px] text-[#8C7B6C] font-journal">
                  Pour your thoughts above, then click <strong className="text-[#935116]">Reflect with AI</strong> to weave dialogue and insights right onto this page.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Daily Habits & Focus Tasks */}
        <div className="lg:col-span-5 space-y-6">
          {/* Interactive Daily Checklist & Tomorrow Planning Dock */}
          {onUpdateChecklist && onUpdateTomorrowChecklist && onOpenHabitManager && (
            <DailyChecklistDock
              currentDate={date}
              checklist={activeChecklist}
              habitTemplates={habitTemplates}
              tomorrowChecklist={activeTomorrowChecklist}
              onUpdateChecklist={onUpdateChecklist}
              onUpdateTomorrowChecklist={onUpdateTomorrowChecklist}
              onOpenHabitManager={onOpenHabitManager}
              streakDays={streakDays}
            />
          )}
        </div>
      </div>

      {/* Full Wisdom Treasury Modal */}
      <WisdomTreasuryModal
        isOpen={isTreasuryOpen}
        onClose={() => setIsTreasuryOpen(false)}
        bookmarkedIds={bookmarkedWisdomIds}
        onToggleBookmark={onToggleWisdomBookmark}
        onSelectWisdomForToday={(selectedItem) => {
          setCurrentWisdom(selectedItem);
        }}
      />
    </div>
  );
};
