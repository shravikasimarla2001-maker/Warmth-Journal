import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  BookOpen,
  Search,
  Tag,
  Star,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Download,
  Check,
  Feather,
  LayoutGrid,
  Clock,
  Heart,
  X,
  ExternalLink,
  Flame,
  Maximize2,
  Target,
  Plus,
  Circle,
  CheckCircle2,
  Compass,
  Bookmark,
  BookmarkCheck,
  Volume2,
  Square,
  Copy,
} from "lucide-react";
import { DailyChecklist, DailyWisdomItem, JournalEntry, MoodType, PriorityTask, WisdomStream } from "../types";
import { DailyPhotoModal } from "./DailyPhotoModal";
import {
  WISDOM_LIBRARY,
  speakWisdom,
  stopSpeakingWisdom,
  playMeditationChime,
} from "../data/wisdomLibrary";

interface MemoriesViewProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onWriteForDate: (date: string) => void;
  onDeleteEntry: (entryId: string) => Promise<void> | void;
  onToggleFavorite: (entryId: string, currentFav: boolean) => Promise<void>;
  onNewEntry: () => void;
  selectedFilterDate?: string | null;
  onClearDateFilter?: () => void;
  dailyChecklists?: Record<string, DailyChecklist>;
  onUpdateDailyChecklist?: (checklist: DailyChecklist) => Promise<void>;
  userId?: string;
  bookmarkedWisdomIds?: string[];
  onToggleWisdomBookmark?: (item: DailyWisdomItem) => void;
  onReflectWithWisdom?: (item: DailyWisdomItem) => void;
}

const MOOD_EMOJIS: Record<string, string> = {
  calm: "🌿",
  happy: "☀️",
  grateful: "🙏",
  low: "🌧️",
  overwhelmed: "🌊",
  peaceful: "🌿",
  reflective: "🕯️",
  hopeful: "🌅",
  inspired: "✨",
  content: "☕",
  curious: "🔍",
  determined: "🔥",
  joyful: "☀️",
  mindful: "🧘",
  melancholic: "🌧️",
  fatigued: "🌙",
  uncertain: "🌫️",
};

export const MemoriesView: React.FC<MemoriesViewProps> = ({
  entries,
  onSelectEntry,
  onWriteForDate,
  onDeleteEntry,
  onToggleFavorite,
  onNewEntry,
  selectedFilterDate,
  onClearDateFilter,
  dailyChecklists = {},
  onUpdateDailyChecklist,
  userId,
  bookmarkedWisdomIds = [],
  onToggleWisdomBookmark,
  onReflectWithWisdom,
}) => {
  // Mode switcher: "calendar" | "timeline" | "photos" | "wisdom"
  const [viewMode, setViewMode] = useState<"calendar" | "timeline" | "photos" | "wisdom">("calendar");

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyPhotos, setOnlyPhotos] = useState(false);

  // Wisdom Treasury specific state
  const [wisdomSubTab, setWisdomSubTab] = useState<"saved" | "explore">(
    bookmarkedWisdomIds.length > 0 ? "saved" : "explore"
  );
  const [selectedWisdomStream, setSelectedWisdomStream] = useState<WisdomStream>("all");
  const [wisdomSearchQuery, setWisdomSearchQuery] = useState("");
  const [playingWisdomId, setPlayingWisdomId] = useState<string | null>(null);
  const [expandedTransliterations, setExpandedTransliterations] = useState<Record<string, boolean>>({});
  const [copiedWisdomId, setCopiedWisdomId] = useState<string | null>(null);

  // Cleanup audio on unmount or tab switch
  useEffect(() => {
    return () => {
      stopSpeakingWisdom();
    };
  }, [viewMode]);

  // Audio Play / Stop for Wisdom Verses
  const handleTogglePlayWisdom = (item: DailyWisdomItem) => {
    if (playingWisdomId === item.id) {
      stopSpeakingWisdom();
      setPlayingWisdomId(null);
    } else {
      stopSpeakingWisdom();
      playMeditationChime();
      setPlayingWisdomId(item.id);
      speakWisdom(
        item,
        () => setPlayingWisdomId(null),
        () => setPlayingWisdomId(null)
      );
    }
  };

  // Copy Verse to Clipboard
  const handleCopyWisdom = (item: DailyWisdomItem) => {
    let text = `${item.source}\n\n`;
    if (item.originalText) text += `${item.originalText}\n\n`;
    if (item.transliteration) text += `(${item.transliteration})\n\n`;
    text += `"${item.translation}"\n\nReflection: ${item.contextBridge}`;
    navigator.clipboard.writeText(text);
    setCopiedWisdomId(item.id);
    setTimeout(() => setCopiedWisdomId(null), 2500);
  };

  // Saved Wisdom verses
  const savedWisdomItems = useMemo(() => {
    return WISDOM_LIBRARY.filter((item) => bookmarkedWisdomIds.includes(item.id));
  }, [bookmarkedWisdomIds]);

  // Filtered Wisdom verses for active sub-tab & search/stream
  const activeWisdomList = useMemo(() => {
    const baseList = wisdomSubTab === "saved" ? savedWisdomItems : WISDOM_LIBRARY;
    return baseList.filter((item) => {
      if (selectedWisdomStream !== "all" && item.stream !== selectedWisdomStream) {
        return false;
      }
      if (wisdomSearchQuery.trim()) {
        const query = wisdomSearchQuery.toLowerCase();
        const matchesTranslation = item.translation.toLowerCase().includes(query);
        const matchesSource = item.source.toLowerCase().includes(query);
        const matchesTheme = item.theme.toLowerCase().includes(query);
        const matchesContext = item.contextBridge.toLowerCase().includes(query);
        const matchesOriginal = item.originalText?.toLowerCase().includes(query);
        const matchesTransliteration = item.transliteration?.toLowerCase().includes(query);
        return (
          matchesTranslation ||
          matchesSource ||
          matchesTheme ||
          matchesContext ||
          matchesOriginal ||
          matchesTransliteration
        );
      }
      return true;
    });
  }, [wisdomSubTab, savedWisdomItems, selectedWisdomStream, wisdomSearchQuery]);

  // Selected Entry for Reading Drawer / Modal
  const [readingEntry, setReadingEntry] = useState<JournalEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Calendar Specific State
  const today = new Date();
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(today);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string>(
    today.toISOString().split("T")[0]
  );
  const [zoomedPhoto, setZoomedPhoto] = useState<{
    url: string;
    caption?: string;
    date: string;
    title?: string;
  } | null>(null);

  // Selected Day Key Focus State
  const [newFocusText, setNewFocusText] = useState("");
  const [isAddingFocus, setIsAddingFocus] = useState(false);

  // Focus tasks for currently selected calendar date
  const selectedDayChecklist = dailyChecklists[calendarSelectedDate];
  const selectedPriorityTasks: PriorityTask[] = selectedDayChecklist?.priorityTasks || [];

  // Toggle Focus Task for Selected Date
  const handleToggleFocusTask = async (taskId: string) => {
    if (!onUpdateDailyChecklist) return;

    const currentTasks = selectedPriorityTasks;
    const updatedTasks = currentTasks.map((task) => {
      if (task.id === taskId) {
        const nextCompleted = !task.completed;
        return {
          ...task,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
        };
      }
      return task;
    });

    const habits = selectedDayChecklist?.habits || [];
    const completedHabits = habits.filter((h) => h.completed).length;
    const completedTasks = updatedTasks.filter((t) => t.completed).length;
    const totalCompleted = completedHabits + completedTasks;
    const totalItems = habits.length + updatedTasks.length;

    await onUpdateDailyChecklist({
      date: calendarSelectedDate,
      userId: selectedDayChecklist?.userId || userId || "active_user",
      habits,
      priorityTasks: updatedTasks,
      totalCompleted,
      totalItems,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add Focus Task for Selected Date
  const handleAddFocusTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFocusText.trim() || !onUpdateDailyChecklist) return;

    const newTask: PriorityTask = {
      id: "task_" + Date.now(),
      text: newFocusText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = [...selectedPriorityTasks, newTask];
    setNewFocusText("");
    setIsAddingFocus(false);

    const habits = selectedDayChecklist?.habits || [];
    const completedHabits = habits.filter((h) => h.completed).length;
    const completedTasks = updatedTasks.filter((t) => t.completed).length;
    const totalCompleted = completedHabits + completedTasks;
    const totalItems = habits.length + updatedTasks.length;

    await onUpdateDailyChecklist({
      date: calendarSelectedDate,
      userId: selectedDayChecklist?.userId || userId || "active_user",
      habits,
      priorityTasks: updatedTasks,
      totalCompleted,
      totalItems,
      updatedAt: new Date().toISOString(),
    });
  };

  // Delete Focus Task for Selected Date
  const handleDeleteFocusTask = async (taskId: string) => {
    if (!onUpdateDailyChecklist) return;

    const updatedTasks = selectedPriorityTasks.filter((t) => t.id !== taskId);
    const habits = selectedDayChecklist?.habits || [];
    const completedHabits = habits.filter((h) => h.completed).length;
    const completedTasks = updatedTasks.filter((t) => t.completed).length;
    const totalCompleted = completedHabits + completedTasks;
    const totalItems = habits.length + updatedTasks.length;

    await onUpdateDailyChecklist({
      date: calendarSelectedDate,
      userId: selectedDayChecklist?.userId || userId || "active_user",
      habits,
      priorityTasks: updatedTasks,
      totalCompleted,
      totalItems,
      updatedAt: new Date().toISOString(),
    });
  };

  // Calendar Math
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentCalendarDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentCalendarDate(new Date(year, month + 1, 1));
  };
  const jumpToToday = () => {
    setCurrentCalendarDate(new Date());
    setCalendarSelectedDate(new Date().toISOString().split("T")[0]);
  };

  // Map entries by date
  const entriesByDate = entries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  // Extract the latest photo recorded on a given day
  const getDayPhotoStats = (dayEntries: JournalEntry[]) => {
    const photoEntries = dayEntries.filter(
      (e) => typeof e.photoUrl === "string" && e.photoUrl.trim().length > 0
    );
    if (photoEntries.length === 0) {
      return { latestPhotoUrl: null, latestPhotoEntry: null, photoCount: 0 };
    }

    // Sort descending: newest updatedAt or createdAt or date
    const sorted = [...photoEntries].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || a.date).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || b.date).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeB - timeA;
      }
      return (b.id || "").localeCompare(a.id || "");
    });

    return {
      latestPhotoUrl: sorted[0].photoUrl!,
      latestPhotoEntry: sorted[0],
      photoCount: sorted.length,
    };
  };

  // Filtered entries for Timeline & Photo Wall
  const filteredEntries = entries.filter((entry) => {
    if (selectedFilterDate && entry.date !== selectedFilterDate) return false;
    if (onlyFavorites && !entry.favorite) return false;
    if (onlyPhotos && !entry.photoUrl) return false;
    if (selectedMood !== "all" && entry.mood !== selectedMood) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = entry.title?.toLowerCase().includes(q);
      const matchText = entry.initialThought?.toLowerCase().includes(q);
      const matchSummary = entry.summary?.toLowerCase().includes(q);
      const matchCaption = entry.photoCaption?.toLowerCase().includes(q);
      const matchTags = entry.tags?.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchText || matchSummary || matchCaption || matchTags;
    }
    return true;
  });

  const photoEntries = entries.filter((e) => !!e.photoUrl);

  // Export entry as Markdown
  const handleExportMarkdown = (entry: JournalEntry) => {
    let md = `# ${entry.title || "Journal Reflection"}\n\n`;
    md += `**Date**: ${entry.date} | **Mood**: ${entry.mood} | **Word Count**: ${entry.wordCount}\n\n`;
    if (entry.tags && entry.tags.length > 0) {
      md += `**Tags**: ${entry.tags.map((t) => `#${t}`).join(", ")}\n\n`;
    }
    if (entry.photoCaption) {
      md += `> Photo Moment: "${entry.photoCaption}"\n\n`;
    }
    md += `## Reflection\n${entry.initialThought}\n\n`;
    if (entry.summary) {
      md += `## AI Insight\n${entry.summary}\n\n`;
    }
    if (entry.insights && entry.insights.length > 0) {
      md += `### Key Takeaways\n`;
      entry.insights.forEach((ins) => {
        md += `- ${ins}\n`;
      });
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `warmth_${entry.date}_${(entry.title || "reflection").replace(/\s+/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteEntry(entryToDelete.id);
      if (readingEntry?.id === entryToDelete.id) {
        setReadingEntry(null);
      }
      setEntryToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E8DFC8]">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#2C241E]">
              Memories & Sanctuary Archive
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F5EBE1] text-[#935116] border border-[#E8DFC8]">
              {entries.length} {entries.length === 1 ? "reflection" : "reflections"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#7E6E5F] mt-1">
            Revisit your evolving thoughts, daily photo moments, and emotional landmarks.
          </p>
        </div>

        {/* 1-Click View Switcher */}
        <div className="flex items-center space-x-1.5 bg-[#EFE7DA] p-1.5 rounded-2xl border border-[#E3D7C3] self-start md:self-auto">
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "calendar"
                ? "bg-white text-[#2C241E] shadow-sm scale-102"
                : "text-[#7E6E5F] hover:text-[#2C241E]"
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-[#D35400]" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => setViewMode("timeline")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "timeline"
                ? "bg-white text-[#2C241E] shadow-sm scale-102"
                : "text-[#7E6E5F] hover:text-[#2C241E]"
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#BA4A00]" />
            <span>Archives</span>
          </button>

          <button
            onClick={() => setViewMode("photos")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "photos"
                ? "bg-white text-[#2C241E] shadow-sm scale-102"
                : "text-[#7E6E5F] hover:text-[#2C241E]"
            }`}
          >
            <Camera className="w-4 h-4 text-[#C0392B]" />
            <span>Photo Wall</span>
            {photoEntries.length > 0 && (
              <span className="text-[10px] bg-[#FAF7F2] text-[#935116] px-1.5 py-0.2 rounded-full font-bold">
                {photoEntries.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode("wisdom")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "wisdom"
                ? "bg-white text-[#2C241E] shadow-sm scale-102"
                : "text-[#7E6E5F] hover:text-[#2C241E]"
            }`}
          >
            <Compass className="w-4 h-4 text-[#BA4A00]" />
            <span>Wisdom Treasury</span>
            {bookmarkedWisdomIds.length > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                {bookmarkedWisdomIds.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Date Filter Banner */}
      {selectedFilterDate && (
        <div className="mt-4 flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#F5EBE1] border border-[#E8DFC8] text-xs text-[#935116]">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4 text-[#BA4A00]" />
            <span>
              Showing reflections for: <strong className="font-semibold">{selectedFilterDate}</strong>
            </span>
          </div>
          {onClearDateFilter && (
            <button
              onClick={onClearDateFilter}
              className="text-xs font-semibold underline hover:text-[#78281F]"
            >
              Clear Filter
            </button>
          )}
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR (Visible on Timeline & Photos) */}
      {(viewMode === "timeline" || viewMode === "photos") && (
        <div className="mt-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFC8]">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7E6E5F]" />
            <input
              type="text"
              placeholder="Search memories, insights, photo captions, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#E5DAC6] text-xs text-[#2C241E] placeholder:text-[#9C8E7E] focus:outline-hidden focus:ring-2 focus:ring-[#E67E22]/30"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7E6E5F] hover:text-[#2C241E]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Mood Dropdown */}
            <select
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              aria-label="Filter by mood"
              className="px-3 py-2 rounded-xl bg-white border border-[#E5DAC6] text-[#2C241E] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#E67E22]/30 cursor-pointer"
            >
              <option value="all">All Moods</option>
              {Object.entries(MOOD_EMOJIS).map(([m, emoji]) => (
                <option key={m} value={m}>
                  {emoji} {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>

            {/* Starred Only Toggle */}
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-xl border transition-all ${
                onlyFavorites
                  ? "bg-amber-100 border-amber-300 text-amber-900 font-semibold"
                  : "bg-white border-[#E5DAC6] text-[#7E6E5F] hover:text-[#2C241E]"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? "fill-amber-500 text-amber-500" : ""}`} />
              <span>Starred</span>
            </button>

            {/* Photos Only Toggle (Timeline mode) */}
            {viewMode === "timeline" && (
              <button
                onClick={() => setOnlyPhotos(!onlyPhotos)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-xl border transition-all ${
                  onlyPhotos
                    ? "bg-rose-100 border-rose-300 text-rose-900 font-semibold"
                    : "bg-white border-[#E5DAC6] text-[#7E6E5F] hover:text-[#2C241E]"
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-rose-600" />
                <span>With Photos</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: TIMELINE VIEW */}
      {viewMode === "timeline" && (
        <div className="mt-8 space-y-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-[#E0D5C1]">
              <div className="w-14 h-14 rounded-2xl bg-[#F5EBE1] text-[#935116] flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#2C241E]">
                No reflections found
              </h3>
              <p className="text-xs text-[#7E6E5F] max-w-sm mx-auto mt-1 mb-5">
                {searchTerm || selectedMood !== "all" || onlyFavorites || onlyPhotos
                  ? "Try clearing your filters or search terms."
                  : "Your sanctuary is waiting for your very first written or voice reflection."}
              </p>
              <button
                onClick={onNewEntry}
                className="px-5 py-2.5 rounded-xl bg-[#2C241E] text-[#FAF7F2] text-xs font-semibold hover:bg-[#4A3B32] transition-all shadow-sm"
              >
                Begin First Reflection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEntries.map((entry) => {
                const moodEmoji = MOOD_EMOJIS[entry.mood] || "🌿";
                const isFav = !!entry.favorite;

                return (
                  <div
                    key={entry.id}
                    className="group bg-white rounded-3xl p-5 border border-[#E8DFC8] shadow-xs hover:shadow-md transition-all flex flex-col justify-between hover:border-[#D5C4A1]"
                  >
                    <div>
                      {/* Postcard Photo Header if present */}
                      {entry.photoUrl && (
                        <div
                          onClick={() =>
                            setZoomedPhoto({
                              url: entry.photoUrl!,
                              caption: entry.photoCaption,
                              date: entry.date,
                              title: entry.title,
                            })
                          }
                          className="relative h-44 w-full rounded-2xl overflow-hidden mb-4 bg-stone-100 cursor-pointer group-hover:opacity-95 transition-opacity"
                        >
                          <img
                            src={entry.photoUrl}
                            alt={entry.photoCaption || "Journal photo"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          {entry.photoCaption && (
                            <p className="absolute bottom-2 left-3 right-3 text-[11px] text-white/95 italic font-serif line-clamp-1">
                              "{entry.photoCaption}"
                            </p>
                          )}
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-xs text-white text-[10px] flex items-center space-x-1">
                            <Camera className="w-3 h-3 text-amber-300" />
                            <span>Moment</span>
                          </span>
                        </div>
                      )}

                      {/* Header Info */}
                      <div className="flex items-center justify-between text-xs text-[#7E6E5F] mb-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#E8DFC8] text-[#4A3B32] font-semibold text-[11px] flex items-center space-x-1">
                            <span>{moodEmoji}</span>
                            <span className="capitalize">{entry.mood}</span>
                          </span>
                          {entry.customFeelings && entry.customFeelings.map((cf) => (
                            <span
                              key={cf}
                              className="px-2 py-0.5 rounded-full bg-[#F5EBE1] border border-[#E8DFC8] text-[#935116] text-[10px] font-medium"
                            >
                              ✨ {cf}
                            </span>
                          ))}
                          <div className="flex items-center space-x-1.5 text-[11px] text-[#9C8E7E]" title={entry.createdAt ? `Entry created: ${new Date(entry.createdAt).toLocaleString()}` : undefined}>
                            <span>{entry.date}</span>
                            {entry.createdAt && (
                              <span className="text-[10px] text-[#B5A898]">
                                • {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Favorite Button */}
                        <button
                          onClick={() => onToggleFavorite(entry.id, isFav)}
                          className="p-1 text-[#C4B5A5] hover:text-amber-500 transition-colors"
                          title={isFav ? "Remove star" : "Star this reflection"}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              isFav ? "fill-amber-400 text-amber-500" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => onSelectEntry(entry)}
                        className="font-display font-bold text-base text-[#2C241E] group-hover:text-[#BA4A00] transition-colors cursor-pointer line-clamp-1"
                      >
                        {entry.title || "Reflective Musings"}
                      </h3>

                      {/* Snippet */}
                      <p
                        onClick={() => onSelectEntry(entry)}
                        className="text-xs text-[#5D5046] mt-2 line-clamp-3 leading-relaxed cursor-pointer font-serif"
                      >
                        {entry.initialThought || "No initial text recorded."}
                      </p>

                      {/* AI Insight Badge if present */}
                      {entry.summary && (
                        <div className="mt-3 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#EFE5D3] text-[11px] text-[#7E6E5F]">
                          <div className="flex items-center space-x-1 text-[#BA4A00] font-semibold mb-0.5">
                            <Sparkles className="w-3 h-3" />
                            <span>Warmth Synthesis</span>
                          </div>
                          <p className="line-clamp-2 text-[#4A3B32] italic">
                            "{entry.summary}"
                          </p>
                        </div>
                      )}

                      {/* Daily Wisdom / Gita Verse for this entry */}
                      {entry.wisdom && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-[#4A3B32]">
                          <div className="flex items-center space-x-1 text-[#BA4A00] font-semibold text-[10px] uppercase tracking-wider mb-0.5">
                            <span>
                              {entry.wisdom.stream === "gita"
                                ? "🪔"
                                : entry.wisdom.stream === "stoic"
                                ? "🏛️"
                                : entry.wisdom.stream === "buddhism"
                                ? "🪷"
                                : "🧠"}
                            </span>
                            <span>{entry.wisdom.source}</span>
                          </div>
                          <p className="line-clamp-2 italic font-serif text-[#3E3127]">
                            "{entry.wisdom.translation}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions Footer */}
                    <div className="mt-4 pt-3 border-t border-[#F0E8D9] flex items-center justify-between text-xs text-[#7E6E5F]">
                      <div className="flex items-center space-x-2 text-[11px]">
                        <span className="font-mono text-[#9C8E7E]">
                          {entry.wordCount || entry.initialThought.split(/\s+/).length} words
                        </span>
                        {entry.messages && entry.messages.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#F4EDE2] text-[#7E6E5F] text-[10px]">
                            {entry.messages.length} replies
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleExportMarkdown(entry)}
                          title="Export as Markdown"
                          className="p-1.5 text-[#9C8E7E] hover:text-[#2C241E] hover:bg-[#F5EBE1] rounded-lg transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectEntry(entry)}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] hover:bg-[#F5EBE1] text-[#BA4A00] font-semibold flex items-center space-x-1 transition-colors text-xs"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Open</span>
                        </button>
                        <button
                          onClick={() => setEntryToDelete(entry)}
                          title="Delete entry"
                          className="p-1.5 text-[#9C8E7E] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CALENDAR VIEW */}
      {viewMode === "calendar" && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Interactive Calendar Grid */}
          <div className="lg:col-span-2 bg-white dark:bg-[#1E1915] rounded-3xl p-6 border border-[#E8DFC8] dark:border-[#382E25] shadow-xs">
            {/* Month Header Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <h2 className="font-display font-bold text-xl text-[#2C241E] dark:text-[#F5EBE1]">
                  {currentCalendarDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <button
                  onClick={jumpToToday}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FAF7F2] dark:bg-[#2C241E] border border-[#E8DFC8] dark:border-[#3E342B] text-[#7E6E5F] dark:text-[#D5C7B7] hover:text-[#2C241E] dark:hover:text-[#F5EBE1] transition-colors cursor-pointer"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="p-2 rounded-xl hover:bg-[#F5EBE1] dark:hover:bg-[#2C241E] text-[#7E6E5F] dark:text-[#D5C7B7] hover:text-[#2C241E] dark:hover:text-[#F5EBE1] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="p-2 rounded-xl hover:bg-[#F5EBE1] dark:hover:bg-[#2C241E] text-[#7E6E5F] dark:text-[#D5C7B7] hover:text-[#2C241E] dark:hover:text-[#F5EBE1] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-medium text-xs text-[#9C8E7E] dark:text-[#A89887] pb-2 border-b border-[#F0E8D9] dark:border-[#382E25]">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-2 mt-3">
              {/* Empty leading days */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[90px] sm:min-h-[105px] rounded-2xl bg-transparent" />
              ))}

              {/* Real month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                  dayNum
                ).padStart(2, "0")}`;
                const isSelected = dateStr === calendarSelectedDate;
                const isTodayDate = dateStr === today.toISOString().split("T")[0];
                const dayEntries = entriesByDate[dateStr] || [];
                const { latestPhotoUrl, latestPhotoEntry, photoCount } = getDayPhotoStats(dayEntries);
                const firstEntry = dayEntries[0];
                const moodEmoji = firstEntry ? MOOD_EMOJIS[firstEntry.mood] : null;

                const dayChecklist = dailyChecklists[dateStr];
                const dayFocusTasks = dayChecklist?.priorityTasks || [];
                const completedFocusTasks = dayFocusTasks.filter((t) => t.completed).length;

                // Case 1: Day has photo(s) attached - Show the latest photo of that day in the cell!
                if (latestPhotoUrl) {
                  return (
                    <div
                      key={dateStr}
                      onClick={() => setCalendarSelectedDate(dateStr)}
                      className={`relative min-h-[90px] sm:min-h-[105px] p-2 rounded-2xl border overflow-hidden transition-all cursor-pointer flex flex-col justify-between group select-none ${
                        isSelected
                          ? "ring-3 ring-[#BA4A00] dark:ring-[#F39C12] border-[#BA4A00] dark:border-[#F39C12] shadow-md scale-[1.02] z-10"
                          : "border-[#E8DFC8] dark:border-[#3E342B] hover:border-[#BA4A00]/70 dark:hover:border-[#F39C12]/70 hover:shadow-sm"
                      }`}
                      title={
                        photoCount > 1
                          ? `${photoCount} photos on ${dateStr} (showing latest)`
                          : `Photo moment from ${dateStr}`
                      }
                    >
                      {/* Latest photo as crisp cover image */}
                      <img
                        src={latestPhotoUrl}
                        alt={latestPhotoEntry?.photoCaption || "Latest daily photo"}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />

                      {/* Protective gradient overlay for high text & badge contrast */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/55 pointer-events-none transition-opacity group-hover:opacity-90" />

                      {/* Top Bar: Day Number & Photo indicator / Zoom trigger */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span
                          className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-xs transition-colors ${
                            isTodayDate
                              ? "bg-[#BA4A00] text-white ring-2 ring-white/80"
                              : isSelected
                              ? "bg-white text-[#BA4A00] font-extrabold ring-1 ring-black/20"
                              : "bg-black/50 text-white backdrop-blur-xs font-semibold"
                          }`}
                        >
                          {dayNum}
                        </span>

                        <div className="flex items-center space-x-1">
                          {/* Key Focus Tag on Photo Cell if exists */}
                          {dayFocusTasks.length > 0 && (
                            <span
                              className={`px-1.5 py-0.5 rounded-full backdrop-blur-xs flex items-center space-x-0.5 text-[9px] font-semibold border ${
                                completedFocusTasks === dayFocusTasks.length
                                  ? "bg-emerald-700/85 text-white border-emerald-400/40"
                                  : "bg-black/60 text-amber-200 border-white/20"
                              }`}
                              title={`${completedFocusTasks}/${dayFocusTasks.length} focus tasks done`}
                            >
                              <Target className="w-2.5 h-2.5 shrink-0" />
                              <span>{completedFocusTasks}/{dayFocusTasks.length}</span>
                            </span>
                          )}

                          {/* Quick Lightbox Zoom Button on hover */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedPhoto({
                                url: latestPhotoUrl,
                                caption: latestPhotoEntry?.photoCaption,
                                date: dateStr,
                                title: latestPhotoEntry?.title,
                              });
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-black/60 hover:bg-black/80 text-white transition-opacity cursor-pointer"
                            title="Zoom photo"
                          >
                            <Maximize2 className="w-2.5 h-2.5" />
                          </button>

                          <span
                            className="px-1.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-xs flex items-center space-x-0.5 text-[9px] font-semibold border border-white/20"
                            title={
                              photoCount > 1
                                ? `${photoCount} photos on this day`
                                : "Daily photo moment"
                            }
                          >
                            <Camera className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                            {photoCount > 1 && (
                              <span className="text-amber-200">+{photoCount - 1}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Bar: Mood & Title Overlay */}
                      <div className="relative z-10 pt-1">
                        <div className="flex items-center space-x-1 text-[11px] font-medium text-white truncate drop-shadow-sm">
                          {moodEmoji && <span className="shrink-0">{moodEmoji}</span>}
                          <span className="truncate text-[10px] text-white/95 font-medium">
                            {latestPhotoEntry?.title || firstEntry?.title || "Reflection"}
                          </span>
                        </div>
                        {dayEntries.length > 1 && (
                          <span className="text-[9px] text-amber-200/90 font-medium block drop-shadow-xs">
                            {dayEntries.length} reflections
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                // Case 2: Standard Day without photos
                return (
                  <div
                    key={dateStr}
                    onClick={() => setCalendarSelectedDate(dateStr)}
                    className={`min-h-[90px] sm:min-h-[105px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-[#FAF7F2] dark:bg-[#2C241E] border-[#BA4A00] dark:border-[#F39C12] ring-2 ring-[#BA4A00]/20 shadow-xs"
                        : dayEntries.length > 0
                        ? "bg-white dark:bg-[#241E1A] border-[#E8DFC8] dark:border-[#3E342B] hover:border-[#C4B5A5] dark:hover:border-[#524436]"
                        : "bg-[#FCFAF7]/50 dark:bg-[#181412]/40 border-transparent hover:bg-white dark:hover:bg-[#241E1A] hover:border-[#E8DFC8] dark:hover:border-[#3E342B]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center ${
                          isTodayDate
                            ? "bg-[#BA4A00] text-white"
                            : isSelected
                            ? "text-[#BA4A00] dark:text-[#F39C12] font-bold"
                            : "text-[#4A3B32] dark:text-[#EAE0D5]"
                        }`}
                      >
                        {dayNum}
                      </span>

                      {/* Focus tasks badge in standard cell */}
                      {dayFocusTasks.length > 0 && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md inline-flex items-center space-x-1 font-medium ${
                            completedFocusTasks === dayFocusTasks.length
                              ? "bg-emerald-100/90 text-emerald-800 border border-emerald-300/60"
                              : "bg-amber-100/90 text-amber-800 border border-amber-300/60"
                          }`}
                          title={`${completedFocusTasks}/${dayFocusTasks.length} focus done`}
                        >
                          <Target className="w-2.5 h-2.5 shrink-0" />
                          <span>{completedFocusTasks}/{dayFocusTasks.length}</span>
                        </span>
                      )}
                    </div>

                    {/* Content Indicator */}
                    <div className="mt-1">
                      {dayEntries.length > 0 ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1 text-[11px] font-medium text-[#2C241E] dark:text-[#F5EBE1] truncate">
                            <span>{moodEmoji}</span>
                            <span className="truncate text-[10px] text-[#5D5046] dark:text-[#D5C7B7]">
                              {firstEntry.title || "Reflection"}
                            </span>
                          </div>
                          {dayEntries.length > 1 && (
                            <span className="text-[9px] text-[#9C8E7E] dark:text-[#A89887] block">
                              +{dayEntries.length - 1} more
                            </span>
                          )}
                        </div>
                      ) : dayFocusTasks.length > 0 ? (
                        <span className="text-[10px] text-[#8C7B6C] italic">
                          {completedFocusTasks === dayFocusTasks.length ? "Focus completed" : "Focus planned"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#C4B5A5] dark:text-[#524436] opacity-0 group-hover:opacity-100">
                          Empty
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Selected Date Drawer */}
          <div className="bg-white dark:bg-[#1E1915] rounded-3xl p-6 border border-[#E8DFC8] dark:border-[#382E25] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#F0E8D9] dark:border-[#2D241D]">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#BA4A00] dark:text-[#F39C12]">
                    Selected Date
                  </span>
                  <h3 className="font-display font-bold text-lg text-[#2C241E] dark:text-[#F5EBE1]">
                    {new Date(calendarSelectedDate + "T12:00:00Z").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h3>
                </div>
                <button
                  onClick={() => onWriteForDate(calendarSelectedDate)}
                  className="px-3 py-1.5 rounded-xl bg-[#2C241E] dark:bg-[#BA4A00] text-white text-xs font-semibold hover:bg-[#4A3B32] dark:hover:bg-[#A04000] transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Write For Date</span>
                </button>
              </div>

              {/* Key Focus Section for Selected Date */}
              <div className="mt-5 p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#241E1A] border border-[#E8DFC8] dark:border-[#3E342B] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-[#BA4A00] dark:text-[#F39C12]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#935116] dark:text-[#F39C12]">
                      Key Focus
                    </h4>
                    {selectedPriorityTasks.length > 0 && (
                      <span className="text-[11px] font-semibold text-[#7E6E5F] dark:text-[#A89887] bg-white dark:bg-[#1E1915] px-2 py-0.5 rounded-full border border-[#E8DFC8] dark:border-[#3E342B]">
                        {selectedPriorityTasks.filter((t) => t.completed).length} / {selectedPriorityTasks.length} done
                      </span>
                    )}
                  </div>

                  {!isAddingFocus && onUpdateDailyChecklist && (
                    <button
                      type="button"
                      onClick={() => setIsAddingFocus(true)}
                      className="flex items-center space-x-1 text-xs font-semibold text-[#BA4A00] dark:text-[#F39C12] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Focus</span>
                    </button>
                  )}
                </div>

                {/* Add Focus Input Form */}
                {isAddingFocus && (
                  <form onSubmit={handleAddFocusTask} className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      value={newFocusText}
                      onChange={(e) => setNewFocusText(e.target.value)}
                      placeholder="e.g. Finish writing, 45m deep focus..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-[#E8DFC8] dark:border-[#3E342B] text-xs bg-white dark:bg-[#1A1613] focus:outline-none focus:ring-1 focus:ring-[#BA4A00] text-[#2C241E] dark:text-[#F5EBE1]"
                      autoFocus
                      maxLength={80}
                    />
                    <button
                      type="submit"
                      disabled={!newFocusText.trim()}
                      className="px-3 py-1.5 bg-[#BA4A00] text-white rounded-xl text-xs font-semibold hover:bg-[#A04000] disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingFocus(false);
                        setNewFocusText("");
                      }}
                      className="px-2 py-1.5 text-xs text-[#7E6E5F] hover:bg-[#E8DFC8]/50 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                )}

                {/* Tasks List */}
                {selectedPriorityTasks.length === 0 && !isAddingFocus ? (
                  <div
                    onClick={() => onUpdateDailyChecklist && setIsAddingFocus(true)}
                    className="text-center py-3 bg-white/70 dark:bg-[#1A1613]/50 rounded-xl border border-dashed border-[#E8DFC8] dark:border-[#3E342B] cursor-pointer hover:bg-white dark:hover:bg-[#1A1613] transition-colors"
                  >
                    <p className="text-xs text-[#7E6E5F] dark:text-[#A89887]">No key focus items set for this day.</p>
                    {onUpdateDailyChecklist && (
                      <span className="text-xs text-[#BA4A00] dark:text-[#F39C12] font-semibold mt-0.5 inline-flex items-center space-x-1">
                        <Plus className="w-3 h-3" />
                        <span>Add a focus priority</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedPriorityTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          task.completed
                            ? "bg-[#F5EBE1]/60 dark:bg-[#1E1915]/60 border-[#D5C9B3] dark:border-[#382E25] text-[#7E6E5F]"
                            : "bg-white dark:bg-[#1A1613] border-[#E8DFC8] dark:border-[#3E342B] text-[#2C241E] dark:text-[#F5EBE1] shadow-2xs"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleFocusTask(task.id)}
                          className="flex items-center space-x-2.5 flex-1 min-w-0 mr-2 text-left cursor-pointer select-none group/item"
                        >
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                              task.completed
                                ? "bg-[#BA4A00] text-white"
                                : "border border-[#C5BAA5] dark:border-[#524436] bg-[#FAF7F2] dark:bg-[#241E1A] group-hover/item:border-[#BA4A00]"
                            }`}
                          >
                            {task.completed && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <span
                            className={`text-xs break-words ${
                              task.completed
                                ? "line-through text-[#8C7B6C] dark:text-[#7A6A5C]"
                                : "font-medium text-[#2C241E] dark:text-[#F5EBE1]"
                            }`}
                          >
                            {task.text}
                          </span>
                        </button>

                        {onUpdateDailyChecklist && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFocusTask(task.id)}
                            className="p-1 text-[#A89887] hover:text-[#BA4A00] dark:hover:text-[#F39C12] hover:bg-[#F5EBE1] dark:hover:bg-[#2E241E] rounded-lg transition-colors shrink-0 cursor-pointer"
                            title="Remove focus item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reflections section header */}
              <div className="mt-6 flex items-center justify-between pb-1 border-b border-[#F0E8D9] dark:border-[#2D241D]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7E6E5F] dark:text-[#A89887] flex items-center space-x-1.5">
                  <Feather className="w-3.5 h-3.5 text-[#BA4A00] dark:text-[#F39C12]" />
                  <span>Reflections ({(entriesByDate[calendarSelectedDate] || []).length})</span>
                </h4>
              </div>

              {/* Entries for this date */}
              <div className="mt-4 space-y-4">
                {(entriesByDate[calendarSelectedDate] || []).length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#7E6E5F] dark:text-[#A89887]">
                    <Feather className="w-8 h-8 mx-auto text-[#D5C4A1] dark:text-[#524436] mb-2" />
                    <p>No reflections recorded for this day yet.</p>
                    <button
                      onClick={() => onWriteForDate(calendarSelectedDate)}
                      className="mt-3 text-xs font-semibold text-[#BA4A00] dark:text-[#F39C12] underline cursor-pointer"
                    >
                      Create reflection for this date
                    </button>
                  </div>
                ) : (
                  entriesByDate[calendarSelectedDate].map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-2xl bg-[#FAF7F2] dark:bg-[#241E1A] border border-[#E8DFC8] dark:border-[#3E342B] space-y-2.5 transition-colors"
                    >
                      {entry.photoUrl && (
                        <div
                          className="relative rounded-xl overflow-hidden group/pic cursor-pointer"
                          onClick={() =>
                            setZoomedPhoto({
                              url: entry.photoUrl!,
                              caption: entry.photoCaption,
                              date: entry.date,
                              title: entry.title,
                            })
                          }
                        >
                          <img
                            src={entry.photoUrl}
                            alt={entry.photoCaption || "Entry photo"}
                            className="w-full h-32 object-cover rounded-xl transition-transform duration-300 group-hover/pic:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/pic:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-2.5 py-1 rounded-lg bg-black/60 text-white text-[10px] font-semibold flex items-center space-x-1 backdrop-blur-xs">
                              <Maximize2 className="w-3 h-3" />
                              <span>View Photo</span>
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between text-xs gap-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-[#2C241E] dark:text-[#F5EBE1] flex items-center space-x-1">
                            <span>{MOOD_EMOJIS[entry.mood.toLowerCase()] || "🌿"}</span>
                            <span className="capitalize">{entry.mood}</span>
                          </span>
                          {entry.customFeelings && entry.customFeelings.map((cf) => (
                            <span
                              key={cf}
                              className="px-2 py-0.5 rounded-full bg-[#F5EBE1] dark:bg-[#2A221C] text-[#935116] dark:text-[#E59866] border border-[#E8DFC8] dark:border-[#3E342B] text-[10px] font-medium"
                            >
                              ✨ {cf}
                            </span>
                          ))}
                        </div>
                        <span className="text-[#9C8E7E] dark:text-[#A89887]">{entry.wordCount} words</span>
                      </div>
                      <h4 className="font-display font-bold text-sm text-[#2C241E] dark:text-[#F5EBE1]">
                        {entry.title || "Reflective Musings"}
                      </h4>
                      <p className="text-xs text-[#5D5046] dark:text-[#D5C7B7] line-clamp-3 font-serif">
                        {entry.initialThought}
                      </p>
                      <div className="pt-2 flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onSelectEntry(entry)}
                          className="px-3 py-1 bg-white dark:bg-[#1A1613] border border-[#E5DAC6] dark:border-[#3E342B] hover:bg-[#F5EBE1] dark:hover:bg-[#2E241E] text-[#BA4A00] dark:text-[#F39C12] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Open in Editor
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PHOTO WALL / POLAROID SCRAPBOOK */}
      {viewMode === "photos" && (
        <div className="mt-8">
          {photoEntries.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-[#E0D5C1]">
              <Camera className="w-10 h-10 text-[#D5C4A1] mx-auto mb-3" />
              <h3 className="font-display font-bold text-lg text-[#2C241E]">
                No Daily Photo Moments Yet
              </h3>
              <p className="text-xs text-[#7E6E5F] max-w-sm mx-auto mt-1 mb-5">
                Attach a snapshot of your tea, the sky, or a desk moment in the Today editor to build your visual scrapbook.
              </p>
              <button
                onClick={onNewEntry}
                className="px-5 py-2.5 rounded-xl bg-[#2C241E] text-white text-xs font-semibold"
              >
                Attach Photo to Today's Reflection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {photoEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() =>
                    setZoomedPhoto({
                      url: entry.photoUrl!,
                      caption: entry.photoCaption,
                      date: entry.date,
                      title: entry.title,
                    })
                  }
                  className="bg-white p-3 rounded-2xl border border-[#E8DFC8] shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="relative h-48 w-full rounded-xl overflow-hidden bg-stone-100 mb-3">
                    <img
                      src={entry.photoUrl}
                      alt={entry.photoCaption || "Memory moment"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-xs text-white text-[10px]">
                      {entry.date}
                    </span>
                  </div>
                  <div className="space-y-1 px-1">
                    <div className="flex items-center space-x-1 text-xs">
                      <span>{MOOD_EMOJIS[entry.mood]}</span>
                      <span className="font-medium text-[#2C241E] truncate">
                        {entry.title || "Memory Moment"}
                      </span>
                    </div>
                    {entry.photoCaption && (
                      <p className="text-[11px] text-[#7E6E5F] italic line-clamp-1 font-serif">
                        "{entry.photoCaption}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: WISDOM TREASURY & SAVED VERSES */}
      {viewMode === "wisdom" && (
        <div className="mt-8 space-y-6">
          {/* Sub-navigation and Search Header */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#FAF7F2] p-4 rounded-3xl border border-[#E8DFC8]">
            {/* Sub-tabs: Saved Bookmarks vs Explore All */}
            <div className="flex items-center space-x-1.5 bg-[#EFE7DA] p-1.5 rounded-2xl border border-[#E3D7C3] self-start md:self-auto">
              <button
                type="button"
                onClick={() => setWisdomSubTab("saved")}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  wisdomSubTab === "saved"
                    ? "bg-white text-[#2C241E] shadow-sm scale-102"
                    : "text-[#7E6E5F] hover:text-[#2C241E]"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 text-[#BA4A00]" />
                <span>Saved Bookmarks</span>
                <span className="text-[10px] bg-[#FAF7F2] text-[#935116] px-1.5 py-0.2 rounded-full font-bold">
                  {savedWisdomItems.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWisdomSubTab("explore")}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  wisdomSubTab === "explore"
                    ? "bg-white text-[#2C241E] shadow-sm scale-102"
                    : "text-[#7E6E5F] hover:text-[#2C241E]"
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-[#BA4A00]" />
                <span>Explore Treasury</span>
                <span className="text-[10px] bg-[#FAF7F2] text-[#7E6E5F] px-1.5 py-0.2 rounded-full font-bold">
                  {WISDOM_LIBRARY.length}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7E6E5F]" />
              <input
                type="text"
                placeholder="Search teachings, shlokas, themes, or authors..."
                value={wisdomSearchQuery}
                onChange={(e) => setWisdomSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#E5DAC6] text-xs text-[#2C241E] placeholder:text-[#9C8E7E] focus:outline-hidden focus:ring-2 focus:ring-[#E67E22]/30"
              />
              {wisdomSearchQuery && (
                <button
                  type="button"
                  onClick={() => setWisdomSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7E6E5F] hover:text-[#2C241E] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tradition Stream Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#7E6E5F] mr-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Tradition:</span>
            </span>

            {[
              { id: "all", label: "All Traditions", icon: "✨" },
              { id: "gita", label: "Bhagavad Gita", icon: "🪔" },
              { id: "stoic", label: "Stoic Philosophy", icon: "🏛️" },
              { id: "buddhism", label: "Buddhist Mindfulness", icon: "☸️" },
              { id: "psychology", label: "Cognitive Reframing", icon: "🧠" },
            ].map((stream) => {
              const isActive = selectedWisdomStream === stream.id;
              return (
                <button
                  key={stream.id}
                  type="button"
                  onClick={() => setSelectedWisdomStream(stream.id as WisdomStream)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? "bg-[#2C241E] text-white shadow-xs"
                      : "bg-white border border-[#E8DFC8] text-[#5D5046] hover:bg-[#FAF7F2] hover:text-[#2C241E]"
                  }`}
                >
                  <span>{stream.icon}</span>
                  <span>{stream.label}</span>
                </button>
              );
            })}
          </div>

          {/* Empty State: No Saved Bookmarks */}
          {wisdomSubTab === "saved" && savedWisdomItems.length === 0 && (
            <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-[#E0D5C1] space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F5EBE1] text-[#935116] flex items-center justify-center mx-auto">
                <Bookmark className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-lg text-[#2C241E]">
                  No saved verses yet
                </h3>
                <p className="text-xs text-[#7E6E5F] max-w-md mx-auto">
                  When you find contemplative verses from the Gita, Stoics, or mindfulness traditions that ground you, click the bookmark icon to save them here for reflection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWisdomSubTab("explore")}
                className="px-5 py-2.5 rounded-xl bg-[#2C241E] text-[#FAF7F2] text-xs font-semibold hover:bg-[#4A3B32] transition-all shadow-sm inline-flex items-center space-x-2 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-amber-300" />
                <span>Explore Full Wisdom Treasury</span>
              </button>
            </div>
          )}

          {/* Empty State: Active Search Returned 0 Items */}
          {activeWisdomList.length === 0 && !(wisdomSubTab === "saved" && savedWisdomItems.length === 0) && (
            <div className="text-center py-14 px-4 bg-white rounded-3xl border border-dashed border-[#E0D5C1] space-y-3">
              <Compass className="w-8 h-8 text-[#D5C4A1] mx-auto" />
              <h3 className="font-display font-bold text-base text-[#2C241E]">
                No verses found
              </h3>
              <p className="text-xs text-[#7E6E5F] max-w-sm mx-auto">
                No teachings matched "{wisdomSearchQuery}". Try adjusting your search query or selecting "All Traditions".
              </p>
              <button
                type="button"
                onClick={() => {
                  setWisdomSearchQuery("");
                  setSelectedWisdomStream("all");
                }}
                className="text-xs font-semibold text-[#BA4A00] underline hover:text-[#78281F] cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Wisdom Cards Grid */}
          {activeWisdomList.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeWisdomList.map((item) => {
                const isBookmarked = bookmarkedWisdomIds.includes(item.id);
                const isPlaying = playingWisdomId === item.id;
                const isCopied = copiedWisdomId === item.id;
                const showTranslit = !!expandedTransliterations[item.id];

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-5 border border-[#E8DFC8] shadow-xs hover:shadow-md transition-all flex flex-col justify-between hover:border-[#D5C4A1] space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Bar: Tradition Icon & Source + Bookmark */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-base shrink-0">
                            {item.stream === "gita"
                              ? "🪔"
                              : item.stream === "stoic"
                              ? "🏛️"
                              : item.stream === "buddhism"
                              ? "☸️"
                              : "🧠"}
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-[#2C241E]">
                              {item.source}
                            </h4>
                            <span className="text-[10px] text-[#7E6E5F]">
                              {item.stream === "gita"
                                ? "Bhagavad Gita"
                                : item.stream === "stoic"
                                ? "Stoic Philosophy"
                                : item.stream === "buddhism"
                                ? "Buddhist Mindfulness"
                                : "Cognitive Reframing"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E8DFC8] text-[10px] font-medium text-[#4A3B32]">
                            {item.theme}
                          </span>

                          {onToggleWisdomBookmark && (
                            <button
                              type="button"
                              onClick={() => onToggleWisdomBookmark(item)}
                              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                isBookmarked
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : "text-[#A89887] hover:text-[#2C241E] hover:bg-[#FAF7F2]"
                              }`}
                              title={isBookmarked ? "Remove from bookmarks" : "Bookmark this verse"}
                            >
                              {isBookmarked ? (
                                <BookmarkCheck className="w-4 h-4 text-[#BA4A00]" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Original Sanskrit / Greek Text (if present) */}
                      {item.originalText && (
                        <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8DFC8]/70 text-center space-y-1">
                          <p className="font-serif text-sm text-[#2C241E] leading-relaxed whitespace-pre-line">
                            {item.originalText}
                          </p>
                          {item.transliteration && showTranslit && (
                            <p className="text-[11px] text-[#7E6E5F] italic font-serif pt-1 border-t border-[#E8DFC8]/50">
                              {item.transliteration}
                            </p>
                          )}
                          {item.transliteration && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTransliterations((prev) => ({
                                  ...prev,
                                  [item.id]: !prev[item.id],
                                }))
                              }
                              className="text-[10px] text-[#BA4A00] font-semibold hover:underline pt-0.5 cursor-pointer block mx-auto"
                            >
                              {showTranslit ? "Hide Transliteration" : "Show Transliteration"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Translation Quote */}
                      <blockquote className="text-sm font-serif italic text-[#2C241E] leading-relaxed pl-3 border-l-2 border-[#D35400]">
                        "{item.translation}"
                      </blockquote>

                      {/* Context Bridge / Why this helps */}
                      <p className="text-xs text-[#5D5046] leading-relaxed bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                        <strong className="text-[#BA4A00] font-semibold">Contemplation: </strong>
                        {item.contextBridge}
                      </p>
                    </div>

                    {/* Action Bar at bottom */}
                    <div className="pt-3 border-t border-[#F0E8D9] flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center space-x-1.5">
                        {/* Listen Button */}
                        <button
                          type="button"
                          onClick={() => handleTogglePlayWisdom(item)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center space-x-1 cursor-pointer ${
                            isPlaying
                              ? "bg-amber-600 border-amber-700 text-white shadow-xs"
                              : "bg-white border-[#E8DFC8] text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2]"
                          }`}
                          title={isPlaying ? "Stop audio" : "Listen to verse read aloud"}
                        >
                          {isPlaying ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyWisdom(item)}
                          className="p-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E8DFC8] text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                          title="Copy verse to clipboard"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Reflect in Today's Journal Action */}
                      {onReflectWithWisdom && (
                        <button
                          type="button"
                          onClick={() => onReflectWithWisdom(item)}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] hover:bg-[#F5EBE1] text-[#935116] border border-[#E8DFC8] text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Anchor today's journal reflection with this verse"
                        >
                          <Feather className="w-3 h-3 text-[#BA4A00]" />
                          <span>Reflect in Journal</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Zoomed Photo Modal */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-[#FAF7F2] rounded-3xl overflow-hidden shadow-2xl border border-[#E8DFC8]">
            <button
              onClick={() => setZoomedPhoto(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedPhoto.url}
              alt="Zoomed photo"
              className="w-full max-h-[65vh] object-contain bg-black/90"
            />
            <div className="p-5">
              <div className="flex items-center justify-between text-xs text-[#7E6E5F] mb-1">
                <span className="font-semibold text-[#BA4A00]">{zoomedPhoto.date}</span>
                <span>{zoomedPhoto.title || "Daily Memory Moment"}</span>
              </div>
              {zoomedPhoto.caption && (
                <p className="text-sm text-[#2C241E] italic font-serif mt-1">
                  "{zoomedPhoto.caption}"
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E8DFC8] shadow-xl">
            <h3 className="font-display font-bold text-lg text-[#2C241E]">
              Delete Reflection?
            </h3>
            <p className="text-xs text-[#7E6E5F] mt-2">
              Are you sure you want to remove <strong>"{entryToDelete.title || "this reflection"}"</strong> from {entryToDelete.date}? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7E6E5F] hover:bg-[#F5EBE1]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
