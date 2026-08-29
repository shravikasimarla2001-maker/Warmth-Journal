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
} from "lucide-react";
import { JournalEntry, MoodType } from "../types";

interface CalendarViewProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onWriteForDate: (date: string) => void;
  onViewDateInHistory: (date: string) => void;
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
}) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [selectedDateString, setSelectedDateString] = useState<string>(
    today.toISOString().split("T")[0]
  );

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
  const monthEntries = entries.filter((e) => e.date?.startsWith(currentMonthPrefix));
  const totalWordsThisMonth = monthEntries.reduce(
    (acc, cur) => acc + (cur.wordCount || 0),
    0
  );
  const activeDaysThisMonth = new Set(monthEntries.map((e) => e.date)).size;

  // Selected date entries
  const selectedDayEntries = entriesByDate[selectedDateString] || [];
  const selectedDateObj = new Date(selectedDateString + "T12:00:00");
  const selectedDateFormatted = selectedDateObj.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const monthName = currentDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header & Monthly Navigation */}
      <div className="bg-white rounded-2xl p-5 border border-[#E8DFC8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2C241E] flex items-center space-x-2">
            <CalendarIcon className="w-6 h-6 text-[#D35400]" />
            <span>Calendar & Reflection Rhythm</span>
          </h2>
          <p className="text-xs text-[#7E6E5F] mt-0.5">
            Track daily entries, moods, and open past reflections directly from any day.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
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

      {/* Monthly Statistics Overview Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-[#E8DFC8] shadow-xs">
          <span className="text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider block mb-1">
            Month Entries
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-display text-2xl font-bold text-[#2C241E]">
              {monthEntries.length}
            </span>
            <span className="text-xs text-[#7E6E5F]">reflections</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#E8DFC8] shadow-xs">
          <span className="text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider block mb-1">
            Active Days
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-display text-2xl font-bold text-[#BA4A00]">
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

        <div className="bg-white rounded-xl p-4 border border-[#E8DFC8] shadow-xs">
          <span className="text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider block mb-1">
            Reflection Rhythms
          </span>
          <div className="flex items-center space-x-1 mt-1">
            <Flame className="w-5 h-5 text-[#E67E22]" />
            <span className="font-display text-sm font-semibold text-[#935116]">
              {monthEntries.length > 0 ? "Active Flow" : "Ready to start"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Calendar Layout: Grid + Selected Day Inspector */}
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
            {/* Empty offset padding for days before month starts */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="h-20 sm:h-24 rounded-xl bg-[#FAF7F2]/40 border border-transparent"
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

              // Dominant mood for the day
              const dayMoods = dayEntries.map((e) => e.mood);

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDateString(dayString)}
                  className={`h-20 sm:h-24 p-1.5 sm:p-2 rounded-xl text-left border transition-all flex flex-col justify-between group relative ${
                    isSelected
                      ? "bg-[#F5EBE1] border-[#BA4A00] ring-2 ring-[#BA4A00]/40 shadow-xs"
                      : hasEntries
                      ? "bg-[#FAF7F2] hover:bg-white border-[#E8DFC8]"
                      : "bg-white hover:bg-[#FAF7F2]/60 border-[#E8DFC8]/60"
                  }`}
                >
                  {/* Top Day Number & Today Indicator */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-semibold rounded-md w-5 h-5 flex items-center justify-center ${
                        isToday
                          ? "bg-[#D35400] text-white font-bold"
                          : isSelected
                          ? "text-[#BA4A00] font-bold"
                          : "text-[#4A3B32]"
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Entry Count Dot Badge */}
                    {hasEntries && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#E67E22] text-white shadow-2xs">
                        {dayEntries.length}
                      </span>
                    )}
                  </div>

                  {/* Middle / Bottom Mood & Indicator */}
                  {hasEntries ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1 text-xs">
                        {dayMoods.slice(0, 3).map((m, i) => (
                          <span key={i} title={m}>
                            {MOOD_EMOJIS[m] || "🕯️"}
                          </span>
                        ))}
                      </div>
                      <div className="text-[10px] text-[#7E6E5F] truncate font-journal">
                        {dayEntries[0].title || "Reflection"}
                      </div>
                    </div>
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 text-[10px] text-[#A8988A] font-journal transition-opacity">
                      + Write
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Inspector & Entries Panel (4 cols) */}
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

            {/* List of Entries on this selected date */}
            {selectedDayEntries.length > 0 ? (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {selectedDayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] space-y-2 hover:border-[#BA4A00] transition-colors"
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

                    <h4 className="font-display font-semibold text-sm text-[#2C241E] line-clamp-1">
                      {entry.title || "Reflective Musings"}
                    </h4>

                    {entry.summary && (
                      <p className="text-xs font-journal text-[#6E5D4F] line-clamp-2">
                        {entry.summary}
                      </p>
                    )}

                    <div className="pt-1 flex items-center justify-between">
                      <button
                        onClick={() => onSelectEntry(entry)}
                        className="text-xs font-semibold text-[#BA4A00] hover:underline flex items-center space-x-1"
                      >
                        <span>Open in Editor</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      {entry.messages && entry.messages.length > 0 && (
                        <span className="text-[10px] text-[#8C7B6C]">
                          {entry.messages.length} AI turns
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[#FAF7F2] border border-dashed border-[#E8DFC8] text-center text-xs text-[#8C7B6C] space-y-2">
                <Feather className="w-6 h-6 text-[#B5A595] mx-auto" />
                <p>
                  This day has no journal entries yet. Would you like to record
                  your thoughts for this date?
                </p>
              </div>
            )}
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
    </div>
  );
};
