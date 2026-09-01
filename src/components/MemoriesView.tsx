import React, { useState } from "react";
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
} from "lucide-react";
import { JournalEntry, MoodType } from "../types";
import { DailyPhotoModal } from "./DailyPhotoModal";

interface MemoriesViewProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onWriteForDate: (date: string) => void;
  onDeleteEntry: (entryId: string) => Promise<void> | void;
  onToggleFavorite: (entryId: string, currentFav: boolean) => Promise<void>;
  onNewEntry: () => void;
  selectedFilterDate?: string | null;
  onClearDateFilter?: () => void;
}

const MOOD_EMOJIS: Record<string, string> = {
  peaceful: "🌿",
  grateful: "🙏",
  reflective: "🕯️",
  hopeful: "🌅",
  inspired: "✨",
  content: "☕",
  curious: "🔍",
  overwhelmed: "🌊",
  melancholic: "🌧️",
  determined: "🔥",
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
}) => {
  // Mode switcher: "timeline" | "calendar" | "photos"
  const [viewMode, setViewMode] = useState<"timeline" | "calendar" | "photos">("timeline");

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyPhotos, setOnlyPhotos] = useState(false);

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
            onClick={() => setViewMode("timeline")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              viewMode === "timeline"
                ? "bg-white text-[#2C241E] shadow-sm scale-102"
                : "text-[#7E6E5F] hover:text-[#2C241E]"
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#BA4A00]" />
            <span>Timeline</span>
          </button>

          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              viewMode === "calendar"
                ? "bg-white text-[#2C241E] shadow-sm scale-102"
                : "text-[#7E6E5F] hover:text-[#2C241E]"
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-[#D35400]" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => setViewMode("photos")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
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
      {viewMode !== "calendar" && (
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
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#E8DFC8] text-[#4A3B32] font-semibold text-[11px] flex items-center space-x-1">
                            <span>{moodEmoji}</span>
                            <span className="capitalize">{entry.mood}</span>
                          </span>
                          <span className="text-[11px] text-[#9C8E7E]">{entry.date}</span>
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
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#E8DFC8] shadow-xs">
            {/* Month Header Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <h2 className="font-display font-bold text-xl text-[#2C241E]">
                  {currentCalendarDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <button
                  onClick={jumpToToday}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FAF7F2] border border-[#E8DFC8] text-[#7E6E5F] hover:text-[#2C241E]"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="p-2 rounded-xl hover:bg-[#F5EBE1] text-[#7E6E5F] hover:text-[#2C241E] transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="p-2 rounded-xl hover:bg-[#F5EBE1] text-[#7E6E5F] hover:text-[#2C241E] transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-medium text-xs text-[#9C8E7E] pb-2 border-b border-[#F0E8D9]">
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
                <div key={`empty-${i}`} className="min-h-[85px] rounded-2xl bg-transparent" />
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
                const hasPhoto = dayEntries.some((e) => !!e.photoUrl);
                const firstEntry = dayEntries[0];
                const moodEmoji = firstEntry ? MOOD_EMOJIS[firstEntry.mood] : null;

                return (
                  <div
                    key={dateStr}
                    onClick={() => setCalendarSelectedDate(dateStr)}
                    className={`min-h-[85px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-[#FAF7F2] border-[#BA4A00] ring-2 ring-[#BA4A00]/20 shadow-xs"
                        : dayEntries.length > 0
                        ? "bg-white border-[#E8DFC8] hover:border-[#C4B5A5]"
                        : "bg-[#FCFAF7]/50 border-transparent hover:bg-white hover:border-[#E8DFC8]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center ${
                          isTodayDate
                            ? "bg-[#BA4A00] text-white"
                            : isSelected
                            ? "text-[#BA4A00] font-bold"
                            : "text-[#4A3B32]"
                        }`}
                      >
                        {dayNum}
                      </span>
                      {hasPhoto && (
                        <span title="Photo attached">
                          <Camera className="w-3 h-3 text-[#C0392B]" />
                        </span>
                      )}
                    </div>

                    {/* Content Indicator */}
                    <div className="mt-1">
                      {dayEntries.length > 0 ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1 text-[11px] font-medium text-[#2C241E] truncate">
                            <span>{moodEmoji}</span>
                            <span className="truncate text-[10px] text-[#5D5046]">
                              {firstEntry.title || "Reflection"}
                            </span>
                          </div>
                          {dayEntries.length > 1 && (
                            <span className="text-[9px] text-[#9C8E7E] block">
                              +{dayEntries.length - 1} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#C4B5A5] opacity-0 group-hover:opacity-100">
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
          <div className="bg-white rounded-3xl p-6 border border-[#E8DFC8] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#F0E8D9]">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#BA4A00]">
                    Selected Date
                  </span>
                  <h3 className="font-display font-bold text-lg text-[#2C241E]">
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
                  className="px-3 py-1.5 rounded-xl bg-[#2C241E] text-white text-xs font-semibold hover:bg-[#4A3B32] transition-colors flex items-center space-x-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Write For Date</span>
                </button>
              </div>

              {/* Entries for this date */}
              <div className="mt-5 space-y-4">
                {(entriesByDate[calendarSelectedDate] || []).length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#7E6E5F]">
                    <Feather className="w-8 h-8 mx-auto text-[#D5C4A1] mb-2" />
                    <p>No reflections recorded for this day yet.</p>
                    <button
                      onClick={() => onWriteForDate(calendarSelectedDate)}
                      className="mt-3 text-xs font-semibold text-[#BA4A00] underline"
                    >
                      Create reflection for this date
                    </button>
                  </div>
                ) : (
                  entriesByDate[calendarSelectedDate].map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DFC8] space-y-2.5"
                    >
                      {entry.photoUrl && (
                        <img
                          src={entry.photoUrl}
                          alt="Day photo"
                          className="w-full h-32 object-cover rounded-xl"
                        />
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#2C241E] flex items-center space-x-1">
                          <span>{MOOD_EMOJIS[entry.mood]}</span>
                          <span className="capitalize">{entry.mood}</span>
                        </span>
                        <span className="text-[#9C8E7E]">{entry.wordCount} words</span>
                      </div>
                      <h4 className="font-display font-bold text-sm text-[#2C241E]">
                        {entry.title || "Reflective Musings"}
                      </h4>
                      <p className="text-xs text-[#5D5046] line-clamp-3 font-serif">
                        {entry.initialThought}
                      </p>
                      <div className="pt-2 flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onSelectEntry(entry)}
                          className="px-3 py-1 bg-white border border-[#E5DAC6] hover:bg-[#F5EBE1] text-[#BA4A00] text-xs font-semibold rounded-lg"
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
