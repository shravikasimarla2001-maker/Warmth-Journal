import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Feather,
  Sparkles,
  Flame,
  Star,
  CheckCircle2,
  Clock,
  Heart,
  ArrowRight,
  Camera,
  Image as ImageIcon,
  LayoutGrid,
  Film,
  ZoomIn,
  Trash2,
  Edit3,
  X,
} from "lucide-react";
import { JournalEntry, MoodType } from "../types";
import { DailyPhotoModal } from "./DailyPhotoModal";

interface CalendarViewProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onWriteForDate: (date: string) => void;
  onViewDateInHistory: (date: string) => void;
  onSavePhotoForDate?: (
    date: string,
    photoUrl: string,
    caption: string
  ) => Promise<void> | void;
  onSaveEntry?: (entry: Partial<JournalEntry>) => Promise<string | void>;
  onDeleteEntry?: (entryId: string) => Promise<void> | void;
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

export const CalendarView: React.FC<CalendarViewProps> = ({
  entries,
  onSelectEntry,
  onWriteForDate,
  onViewDateInHistory,
  onSaveEntry,
  onDeleteEntry,
}) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [selectedDateString, setSelectedDateString] = useState<string>(
    today.toISOString().split("T")[0]
  );
  const [viewMode, setViewMode] = useState<"grid" | "photowall">("grid");
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Daily photo modal state for calendar quick snap
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<{
    url: string;
    caption?: string;
    date: string;
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const jumpToToday = () => {
    setCurrentDate(new Date());
    setSelectedDateString(new Date().toISOString().split("T")[0]);
  };

  // Calendar Math
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map entries by date YYYY-MM-DD
  const entriesByDate: Record<string, JournalEntry[]> = {};
  entries.forEach((entry) => {
    if (entry.date) {
      if (!entriesByDate[entry.date]) {
        entriesByDate[entry.date] = [];
      }
      entriesByDate[entry.date].push(entry);
    }
  });

  // Calculate monthly stats
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEntries = entries.filter((e) =>
    e.date?.startsWith(currentMonthPrefix)
  );
  const totalWordsThisMonth = monthEntries.reduce(
    (acc, cur) => acc + (cur.wordCount || 0),
    0
  );
  const activeDaysThisMonth = new Set(monthEntries.map((e) => e.date)).size;

  // Entries with photos
  const entriesWithPhotos = entries.filter((e) => !!e.photoUrl);
  const monthEntriesWithPhotos = monthEntries.filter((e) => !!e.photoUrl);

  // Selected date entries & photo
  const selectedDayEntries = entriesByDate[selectedDateString] || [];
  const selectedDateObj = new Date(selectedDateString + "T12:00:00");
  const selectedDateFormatted = selectedDateObj.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Find if selected day has a photo
  const selectedEntryWithPhoto = selectedDayEntries.find((e) => !!e.photoUrl);

  const monthName = currentDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Handle saving photo directly from calendar
  const handleSavePhotoFromCalendar = async (
    photoUrl: string,
    caption: string
  ) => {
    if (!onSaveEntry) return;

    if (selectedDayEntries.length > 0) {
      // Update existing entry on that day
      const targetEntry = selectedDayEntries[0];
      await onSaveEntry({
        ...targetEntry,
        photoUrl,
        photoCaption: caption,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create new photo anchor entry for this date
      const newEntry: Partial<JournalEntry> = {
        id: "entry_" + Date.now(),
        date: selectedDateString,
        title: `Photo Moment: ${selectedDateString}`,
        mood: "peaceful",
        initialThought: caption || `Daily photo captured for ${selectedDateString}`,
        reflectionType: "daily_reflection",
        tags: ["photo-moment", "calendar-anchor"],
        photoUrl,
        photoCaption: caption,
        wordCount: caption ? caption.split(/\s+/).length : 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await onSaveEntry(newEntry);
    }
  };

  // Handle removing photo
  const handleRemovePhotoFromCalendar = async () => {
    if (!onSaveEntry || !selectedEntryWithPhoto) return;
    await onSaveEntry({
      ...selectedEntryWithPhoto,
      photoUrl: undefined,
      photoCaption: undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Daily Photo Modal */}
      <DailyPhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        date={selectedDateString}
        initialPhotoUrl={selectedEntryWithPhoto?.photoUrl}
        initialCaption={selectedEntryWithPhoto?.photoCaption}
        onSavePhoto={handleSavePhotoFromCalendar}
        onRemovePhoto={handleRemovePhotoFromCalendar}
      />

      {/* Lightbox Photo Zoom Modal */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomedPhoto(null)}
        >
          <div
            className="bg-[#FAF7F2] p-4 sm:p-6 rounded-3xl max-w-2xl w-full border border-[#E8DFC8] shadow-2xl space-y-3 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#BA4A00]">
                {zoomedPhoto.date}
              </span>
              <button
                onClick={() => setZoomedPhoto(null)}
                className="p-1 text-[#8C7B6C] hover:text-[#2C241E] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black/5 border border-[#E8DFC8]">
              <img
                src={zoomedPhoto.url}
                alt="Enlarged moment"
                className="w-full max-h-[70vh] object-contain mx-auto"
              />
            </div>
            {zoomedPhoto.caption && (
              <p className="text-sm font-journal italic text-[#2C241E] text-center pt-2">
                "{zoomedPhoto.caption}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top Header & Monthly Navigation */}
      <div className="bg-white rounded-2xl p-5 border border-[#E8DFC8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2C241E] flex items-center space-x-2">
            <CalendarIcon className="w-6 h-6 text-[#D35400]" />
            <span>Calendar & Daily Photo Wall</span>
          </h2>
          <p className="text-xs text-[#7E6E5F] mt-0.5">
            Take one photo per day to build your visual calendar timeline and journal your thoughts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* View Mode Toggle: Grid vs Photo Wall */}
          <div className="flex items-center bg-[#FAF7F2] rounded-xl border border-[#E8DFC8] p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                viewMode === "grid"
                  ? "bg-white text-[#935116] shadow-xs"
                  : "text-[#7E6E5F] hover:text-[#2C241E]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode("photowall")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                viewMode === "photowall"
                  ? "bg-white text-[#935116] shadow-xs"
                  : "text-[#7E6E5F] hover:text-[#2C241E]"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Photo Wall ({entriesWithPhotos.length})</span>
            </button>
          </div>

          <button
            onClick={jumpToToday}
            className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] text-xs font-semibold text-[#4A3B32] hover:bg-white transition-colors"
          >
            Today
          </button>
          <div className="flex items-center bg-[#FAF7F2] rounded-xl border border-[#E8DFC8] p-0.5">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-white rounded-lg text-[#7E6E5F] hover:text-[#2C241E] transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-display font-semibold text-xs text-[#2C241E] px-3">
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-white rounded-lg text-[#7E6E5F] hover:text-[#2C241E] transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Statistics Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-[#E8DFC8] shadow-xs">
          <span className="text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider block mb-1">
            Month Reflections
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-display text-2xl font-bold text-[#2C241E]">
              {monthEntries.length}
            </span>
            <span className="text-xs text-[#7E6E5F]">entries</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#E8DFC8] shadow-xs">
          <span className="text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider block mb-1">
            Daily Photos
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-display text-2xl font-bold text-[#BA4A00]">
              {monthEntriesWithPhotos.length}
            </span>
            <span className="text-xs text-[#7E6E5F]">captured moments</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#E8DFC8] shadow-xs">
          <span className="text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider block mb-1">
            Active Days
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-display text-2xl font-bold text-[#2C241E]">
              {activeDaysThisMonth}
            </span>
            <span className="text-xs text-[#7E6E5F]">/ {daysInMonth} days</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#E8DFC8] shadow-xs">
          <span className="text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider block mb-1">
            Words Written
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-display text-2xl font-bold text-[#2C241E]">
              {totalWordsThisMonth.toLocaleString()}
            </span>
            <span className="text-xs text-[#7E6E5F]">words</span>
          </div>
        </div>
      </div>

      {/* VIEW MODE: PHOTO WALL / MEMORY REEL */}
      {viewMode === "photowall" ? (
        <div className="bg-white rounded-2xl p-6 border border-[#E8DFC8] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F5EBE1]">
            <div>
              <h3 className="font-display font-semibold text-lg text-[#2C241E] flex items-center space-x-2">
                <Camera className="w-5 h-5 text-[#BA4A00]" />
                <span>Daily Photo Memory Reel</span>
              </h3>
              <p className="text-xs text-[#7E6E5F]">
                A visual timeline of one photo per day with captions and emotions.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedDateString(today.toISOString().split("T")[0]);
                setIsPhotoModalOpen(true);
              }}
              className="px-4 py-2 bg-[#D35400] hover:bg-[#BA4A00] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-all shadow-xs self-start sm:self-auto"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>+ Take Today's Photo</span>
            </button>
          </div>

          {entriesWithPhotos.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#FAF7F2] text-[#BA4A00] flex items-center justify-center mx-auto border border-[#E8DFC8]">
                <Camera className="w-7 h-7" />
              </div>
              <h4 className="font-display font-semibold text-base text-[#2C241E]">
                No daily photos saved yet
              </h4>
              <p className="text-xs text-[#7E6E5F] max-w-sm mx-auto">
                Snap a live camera photo or upload an image for any date on your calendar to start building your visual life story.
              </p>
              <button
                onClick={() => {
                  setSelectedDateString(today.toISOString().split("T")[0]);
                  setIsPhotoModalOpen(true);
                }}
                className="px-4 py-2 bg-[#FAF7F2] hover:bg-[#F5EBE1] border border-[#E8DFC8] text-[#935116] text-xs font-semibold rounded-xl"
              >
                Capture First Daily Photo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {entriesWithPhotos.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E8DFC8] shadow-xs space-y-2.5 hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Polaroid Image */}
                    <div
                      onClick={() =>
                        setZoomedPhoto({
                          url: entry.photoUrl!,
                          caption: entry.photoCaption,
                          date: entry.date,
                        })
                      }
                      className="aspect-square rounded-xl overflow-hidden bg-black/5 border border-[#E8DFC8] relative cursor-pointer group-hover:scale-102 transition-transform shadow-2xs"
                    >
                      <img
                        src={entry.photoUrl}
                        alt={entry.photoCaption || "Daily moment"}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-xs text-[10px] text-white font-medium flex items-center space-x-1">
                        <span>{entry.date}</span>
                      </div>
                      <div className="absolute top-2 right-2 p-1 rounded-md bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Caption */}
                    <p className="text-xs font-journal italic text-[#2C241E] line-clamp-2 px-1">
                      "{entry.photoCaption || "Moment captured."}"
                    </p>
                  </div>

                  {/* Footer & Action */}
                  <div className="pt-2 border-t border-[#E8DFC8]/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#4A3B32] font-semibold flex items-center space-x-1">
                      <span>{MOOD_EMOJIS[entry.mood] || "🌿"}</span>
                      <span className="capitalize">{entry.mood}</span>
                    </span>

                    <button
                      onClick={() => onSelectEntry(entry)}
                      className="text-xs font-semibold text-[#BA4A00] hover:underline flex items-center space-x-1"
                    >
                      <span>Reflection</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE: CALENDAR GRID + SELECTED DAY INSPECTOR */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Grid (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-[#E8DFC8] shadow-xs space-y-3">
            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] font-bold text-[#8C7B6C] uppercase tracking-wider pb-2 border-b border-[#F5EBE1]">
              {daysOfWeek.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Day Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Empty offset padding */}
              {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="h-24 sm:h-28 rounded-xl bg-[#FAF7F2]/40 border border-transparent"
                />
              ))}

              {/* Days in Month */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dayString = `${year}-${String(month + 1).padStart(
                  2,
                  "0"
                )}-${String(dayNum).padStart(2, "0")}`;
                const dayEntries = entriesByDate[dayString] || [];
                const hasEntries = dayEntries.length > 0;
                const isSelected = selectedDateString === dayString;
                const isToday =
                  today.getFullYear() === year &&
                  today.getMonth() === month &&
                  today.getDate() === dayNum;

                // Check for day photo
                const dayPhotoEntry = dayEntries.find((e) => !!e.photoUrl);
                const dayPhotoUrl = dayPhotoEntry?.photoUrl;

                return (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedDateString(dayString)}
                    className={`h-24 sm:h-28 p-1.5 sm:p-2 rounded-xl text-left border transition-all flex flex-col justify-between group relative overflow-hidden ${
                      dayPhotoUrl
                        ? isSelected
                          ? "border-[#BA4A00] ring-3 ring-[#BA4A00]/50 shadow-md scale-[1.02]"
                          : "border-amber-900/20 hover:border-[#BA4A00] hover:shadow-md"
                        : isSelected
                        ? "bg-[#F5EBE1] border-[#BA4A00] ring-2 ring-[#BA4A00]/40 shadow-xs"
                        : hasEntries
                        ? "bg-[#FAF7F2] hover:bg-white border-[#E8DFC8]"
                        : "bg-white hover:bg-[#FAF7F2]/60 border-[#E8DFC8]/60"
                    }`}
                  >
                    {/* If photo exists: Full Photo Background with overlay */}
                    {dayPhotoUrl && (
                      <>
                        <img
                          src={dayPhotoUrl}
                          alt={`Daily moment for ${dayString}`}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 z-0"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/45 z-1" />
                      </>
                    )}

                    {/* Top Row: Day Number & Photo indicator */}
                    <div className="flex items-center justify-between w-full z-10 relative">
                      <span
                        className={`text-xs font-semibold rounded-md min-w-[20px] h-5 px-1 flex items-center justify-center transition-colors ${
                          isToday
                            ? "bg-[#D35400] text-white font-bold shadow-xs"
                            : dayPhotoUrl
                            ? "bg-white/90 text-[#2C241E] font-bold backdrop-blur-xs shadow-2xs"
                            : isSelected
                            ? "text-[#BA4A00] font-bold"
                            : "text-[#4A3B32]"
                        }`}
                      >
                        {dayNum}
                      </span>

                      {/* Photo indicator badge */}
                      {dayPhotoUrl ? (
                        <span className="w-5 h-5 rounded-full bg-white/90 text-[#BA4A00] flex items-center justify-center shadow-xs backdrop-blur-xs">
                          <Camera className="w-3 h-3 text-[#D35400]" />
                        </span>
                      ) : hasEntries ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#E67E22] text-white shadow-2xs">
                          {dayEntries.length}
                        </span>
                      ) : null}
                    </div>

                    {/* Bottom Content: Caption / Mood / Action */}
                    {dayPhotoUrl ? (
                      <div className="w-full z-10 relative space-y-0.5">
                        <div className="text-[10px] text-white font-journal italic font-medium truncate drop-shadow-sm">
                          {dayPhotoEntry?.photoCaption ||
                            dayEntries[0]?.title ||
                            "Daily Moment"}
                        </div>
                        <div className="flex items-center space-x-1 text-[9px] text-white/80">
                          {dayEntries.length > 1 && (
                            <span className="bg-black/40 px-1 rounded text-white/90 font-sans font-semibold">
                              +{dayEntries.length} notes
                            </span>
                          )}
                        </div>
                      </div>
                    ) : hasEntries ? (
                      <div className="space-y-0.5 z-10">
                        <div className="flex items-center space-x-1 text-xs">
                          {dayEntries.slice(0, 2).map((e, i) => (
                            <span key={i} title={e.mood}>
                              {MOOD_EMOJIS[e.mood] || "🕯️"}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] text-[#7E6E5F] truncate font-journal">
                          {dayEntries[0].title || "Reflection"}
                        </div>
                      </div>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 text-[10px] text-[#A8988A] font-journal transition-opacity">
                        + Photo/Write
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Inspector & Photo Panel (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-[#E8DFC8] shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Header for selected date */}
              <div className="space-y-1 pb-3 border-b border-[#F5EBE1]">
                <span className="text-[10px] font-bold text-[#BA4A00] uppercase tracking-wider block">
                  Selected Day
                </span>
                <h3 className="font-display font-semibold text-lg text-[#2C241E]">
                  {selectedDateFormatted}
                </h3>
                <p className="text-xs text-[#7E6E5F]">
                  {selectedDayEntries.length === 0
                    ? "No reflections recorded on this day."
                    : `${selectedDayEntries.length} reflection${
                        selectedDayEntries.length === 1 ? "" : "s"
                      } logged.`}
                </p>
              </div>

              {/* Daily Photo Card for Selected Date */}
              {selectedEntryWithPhoto?.photoUrl ? (
                <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E8DFC8] shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4A3B32] flex items-center space-x-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#BA4A00]" />
                      <span>Daily Photo Moment</span>
                    </span>
                    <button
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="text-[11px] text-[#BA4A00] hover:underline font-semibold"
                    >
                      Change Photo
                    </button>
                  </div>

                  <div
                    onClick={() =>
                      setZoomedPhoto({
                        url: selectedEntryWithPhoto.photoUrl!,
                        caption: selectedEntryWithPhoto.photoCaption,
                        date: selectedDateString,
                      })
                    }
                    className="aspect-square w-full rounded-xl overflow-hidden bg-black/5 border border-[#E8DFC8] relative cursor-pointer group shadow-2xs"
                  >
                    <img
                      src={selectedEntryWithPhoto.photoUrl}
                      alt="Selected day photo"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                    />
                    <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                  </div>

                  {selectedEntryWithPhoto.photoCaption && (
                    <p className="text-xs font-journal italic text-[#2C241E] text-center px-1">
                      "{selectedEntryWithPhoto.photoCaption}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-dashed border-[#E8DFC8] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#E8DFC8] flex items-center justify-center text-[#BA4A00]">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#2C241E]">
                        No photo for this date
                      </div>
                      <div className="text-[10px] text-[#7E6E5F]">
                        Snap one photo to represent this day
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="px-3 py-1.5 bg-white hover:bg-[#F5EBE1] border border-[#E8DFC8] text-[#935116] rounded-xl text-xs font-semibold transition-colors shadow-2xs"
                  >
                    + Add Photo
                  </button>
                </div>
              )}

              {/* List of Entries on this selected date */}
              {selectedDayEntries.length > 0 ? (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {selectedDayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] space-y-1.5 hover:border-[#BA4A00] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#4A3B32] flex items-center space-x-1">
                          <span>{MOOD_EMOJIS[entry.mood] || "🕯️"}</span>
                          <span className="capitalize">{entry.mood}</span>
                        </span>
                        <span className="text-[10px] text-[#8C7B6C]">
                          {entry.wordCount || 0} words
                        </span>
                      </div>

                      <h4 className="font-display font-semibold text-xs text-[#2C241E] line-clamp-1">
                        {entry.title || "Reflective Musings"}
                      </h4>

                      <div className="pt-1 flex items-center justify-between">
                        <button
                          onClick={() => onSelectEntry(entry)}
                          className="text-xs font-semibold text-[#BA4A00] hover:underline flex items-center space-x-1"
                        >
                          <span>Open in Editor</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>

                        {onDeleteEntry && (
                          <button
                            onClick={() => setEntryToDelete(entry)}
                            className="p-1 text-[#8C7B6C] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete this reflection"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-3 border-t border-[#F5EBE1]">
              <button
                onClick={() => onWriteForDate(selectedDateString)}
                className="w-full py-2.5 bg-[#D35400] hover:bg-[#BA4A00] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-all"
              >
                <Feather className="w-3.5 h-3.5" />
                <span>Write Entry for This Day</span>
              </button>

              {selectedDayEntries.length > 0 && (
                <button
                  onClick={() => onViewDateInHistory(selectedDateString)}
                  className="w-full py-2 bg-[#FAF7F2] hover:bg-[#F5EBE1] text-[#4A3B32] text-xs font-semibold rounded-xl border border-[#E8DFC8] flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#BA4A00]" />
                  <span>Filter Archive for This Day</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Calendar View */}
      {entryToDelete && (
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
                Are you sure you want to delete <strong className="text-[#2C241E]">"{entryToDelete.title || "Reflective Musings"}"</strong> dated <strong>{entryToDelete.date}</strong>? This action cannot be undone.
              </p>
            </div>

            {entryToDelete.photoUrl && (
              <div className="p-2.5 bg-[#FAF7F2] rounded-xl border border-[#E8DFC8] flex items-center space-x-3 text-xs text-[#7E6E5F]">
                <img
                  src={entryToDelete.photoUrl}
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
                onClick={() => setEntryToDelete(null)}
                className="py-2.5 rounded-xl border border-[#E8DFC8] text-xs font-semibold text-[#4A3B32] hover:bg-[#FAF7F2] transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeleteEntry || !entryToDelete) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteEntry(entryToDelete.id);
                    setEntryToDelete(null);
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
    </div>
  );
};
