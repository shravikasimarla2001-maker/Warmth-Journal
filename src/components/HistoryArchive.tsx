import React, { useState } from "react";
import {
  BookOpen,
  Search,
  Calendar,
  Tag,
  Star,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
  Download,
  Check,
  Feather,
  Layers,
  MessageSquare,
} from "lucide-react";
import { JournalEntry, MoodType } from "../types";

interface HistoryArchiveProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onToggleFavorite: (entryId: string, currentFav: boolean) => Promise<void>;
  selectedFilterDate?: string | null;
  onClearDateFilter?: () => void;
  onNewEntry: () => void;
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

export const HistoryArchive: React.FC<HistoryArchiveProps> = ({
  entries,
  onSelectEntry,
  onDeleteEntry,
  onToggleFavorite,
  selectedFilterDate,
  onClearDateFilter,
  onNewEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [readingEntry, setReadingEntry] = useState<JournalEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    // Date filter (from calendar click)
    if (selectedFilterDate && entry.date !== selectedFilterDate) {
      return false;
    }

    // Favorites
    if (onlyFavorites && !entry.favorite) {
      return false;
    }

    // Mood
    if (selectedMood !== "all" && entry.mood !== selectedMood) {
      return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = entry.title?.toLowerCase().includes(q);
      const matchText = entry.initialThought?.toLowerCase().includes(q);
      const matchSummary = entry.summary?.toLowerCase().includes(q);
      const matchTags = entry.tags?.some((t) => t.toLowerCase().includes(q));
      const matchMessages = entry.messages?.some((m) =>
        m.text.toLowerCase().includes(q)
      );
      return matchTitle || matchText || matchSummary || matchTags || matchMessages;
    }

    return true;
  });

  // Export entry as Markdown
  const handleExportMarkdown = (entry: JournalEntry) => {
    let md = `# ${entry.title || "Journal Entry"}\n\n`;
    md += `**Date**: ${entry.date} | **Mood**: ${entry.mood} | **Word Count**: ${entry.wordCount}\n\n`;
    if (entry.tags && entry.tags.length > 0) {
      md += `**Tags**: ${entry.tags.map((t) => `#${t}`).join(", ")}\n\n`;
    }
    if (entry.summary) {
      md += `## AI Summary\n${entry.summary}\n\n`;
    }
    if (entry.insights && entry.insights.length > 0) {
      md += `## Key Insights\n${entry.insights.map((i) => `- ${i}`).join("\n")}\n\n`;
    }
    md += `## Journal Content\n${entry.initialThought}\n\n`;
    if (entry.messages && entry.messages.length > 0) {
      md += `## AI Reflection Dialogue\n`;
      entry.messages.forEach((m) => {
        md += `**${m.sender === "user" ? "You" : "Warmth AI"}** (${new Date(
          m.timestamp
        ).toLocaleTimeString()}):\n${m.text}\n\n`;
      });
    }

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-${entry.date}-${(entry.title || "entry")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .slice(0, 20)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-5 border border-[#E8DFC8] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#2C241E] flex items-center space-x-2">
              <BookOpen className="w-6 h-6 text-[#BA4A00]" />
              <span>Past Journal & Reflection Archive</span>
            </h2>
            <p className="text-xs text-[#7E6E5F] mt-0.5">
              Securely stored and isolated under your private Cloud Firestore
              account.
            </p>
          </div>

          <button
            onClick={onNewEntry}
            className="px-4 py-2 bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 self-start sm:self-auto transition-all hover:scale-102"
          >
            <Feather className="w-3.5 h-3.5" />
            <span>Write New Entry</span>
          </button>
        </div>

        {/* Date Filter Alert Banner */}
        {selectedFilterDate && (
          <div className="p-3 bg-[#F5EBE1] border border-[#E8DFC8] rounded-xl flex items-center justify-between text-xs text-[#935116]">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>
                Filtering entries written on <strong>{selectedFilterDate}</strong>
              </span>
            </div>
            <button
              onClick={onClearDateFilter}
              className="text-xs font-semibold underline hover:text-[#2C241E]"
            >
              Show All Dates
            </button>
          </div>
        )}

        {/* Search and Filters Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-[#8C7B6C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search across titles, reflections, insights, tags..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] text-xs text-[#2C241E] placeholder-[#9E8E80] focus:outline-none focus:ring-2 focus:ring-[#BA4A00]/40 font-journal"
            />
          </div>

          {/* Mood Filter */}
          <div className="md:col-span-4 flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-[#8C7B6C] shrink-0" />
            <select
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] text-xs text-[#2C241E] focus:outline-none cursor-pointer"
            >
              <option value="all">All Moods</option>
              <option value="peaceful">🌿 Peaceful</option>
              <option value="grateful">🙏 Grateful</option>
              <option value="reflective">🕯️ Reflective</option>
              <option value="hopeful">🌅 Hopeful</option>
              <option value="inspired">✨ Inspired</option>
              <option value="content">☕ Content</option>
              <option value="curious">🔍 Curious</option>
              <option value="overwhelmed">🌊 Overwhelmed</option>
              <option value="melancholic">🌧️ Melancholic</option>
              <option value="determined">🔥 Determined</option>
            </select>
          </div>

          {/* Favorites Only Toggle */}
          <div className="md:col-span-2 flex items-center">
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                onlyFavorites
                  ? "bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                  : "bg-[#FAF7F2] text-[#7E6E5F] border-[#E8DFC8] hover:bg-white"
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  onlyFavorites ? "fill-amber-400 text-amber-500" : "text-[#7E6E5F]"
                }`}
              />
              <span>Favorites</span>
            </button>
          </div>
        </div>
      </div>

      {/* Entries List / Grid */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8DFC8] p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-[#F5EBE1] text-[#BA4A00] flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-display font-semibold text-lg text-[#2C241E]">
              No matching journal entries found
            </h3>
            <p className="text-xs text-[#7E6E5F]">
              {entries.length === 0
                ? "Your archive is currently empty. Write your first journal entry and converse with Gemini to begin building your sanctuary."
                : "Try adjusting your search query or removing mood and date filters."}
            </p>
          </div>
          {entries.length === 0 && (
            <button
              onClick={onNewEntry}
              className="px-5 py-2.5 bg-[#D35400] hover:bg-[#BA4A00] text-white text-xs font-semibold rounded-xl shadow-xs inline-flex items-center space-x-2 transition-all hover:scale-102"
            >
              <Feather className="w-4 h-4" />
              <span>Write Your First Reflection</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredEntries.map((entry) => {
            const formattedDate = new Date(
              entry.date + "T12:00:00"
            ).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={entry.id}
                className="bg-white rounded-2xl p-5 border border-[#E8DFC8] shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-[#8C7B6C]">
                      <Calendar className="w-3.5 h-3.5 text-[#BA4A00]" />
                      <span className="font-medium">{formattedDate}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8DFC8] text-[#4A3B32] font-medium flex items-center space-x-1">
                        <span>{MOOD_EMOJIS[entry.mood] || "🕯️"}</span>
                        <span className="capitalize">{entry.mood}</span>
                      </span>

                      <button
                        onClick={() =>
                          onToggleFavorite(entry.id, !!entry.favorite)
                        }
                        className="p-1 rounded-lg hover:bg-[#FAF7F2] text-[#8C7B6C] transition-colors"
                        title="Toggle Favorite"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            entry.favorite
                              ? "fill-amber-400 text-amber-500"
                              : "text-[#B5A595]"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => onSelectEntry(entry)}
                    className="font-display text-lg font-semibold text-[#2C241E] group-hover:text-[#BA4A00] transition-colors cursor-pointer leading-snug line-clamp-1"
                  >
                    {entry.title || "Reflective Musings"}
                  </h3>

                  {/* Daily Photo Thumbnail if present */}
                  {entry.photoUrl && (
                    <div
                      onClick={() => onSelectEntry(entry)}
                      className="flex items-center space-x-3 bg-[#FAF7F2] p-2 rounded-xl border border-[#E8DFC8] cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-black/5 shrink-0 border border-[#E8DFC8]">
                        <img
                          src={entry.photoUrl}
                          alt="Daily photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-[#BA4A00] uppercase tracking-wider block">
                          Daily Photo Moment
                        </span>
                        <p className="text-xs font-journal italic text-[#2C241E] truncate">
                          "{entry.photoCaption || "Captured moment"}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AI Summary Snippet or Initial Thought */}
                  <p className="text-xs font-journal text-[#5A4B3F] leading-relaxed line-clamp-3">
                    {entry.summary || entry.initialThought || "No text content recorded."}
                  </p>
                </div>

                {/* Insights / Bullet Highlights */}
                {entry.insights && entry.insights.length > 0 && (
                  <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8DFC8]/70 space-y-1">
                    <span className="text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider block">
                      Key Takeaway
                    </span>
                    <p className="text-xs text-[#3E3127] font-journal truncate">
                      • {entry.insights[0]}
                    </p>
                  </div>
                )}

                {/* Tags & Action Bar */}
                <div className="pt-2 border-t border-[#F5EBE1] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {entry.messages && entry.messages.length > 0 && (
                      <span className="text-[11px] text-[#8C7B6C] flex items-center space-x-1">
                        <MessageSquare className="w-3.5 h-3.5 text-[#BA4A00]" />
                        <span>{entry.messages.length} turns</span>
                      </span>
                    )}
                    <span className="text-[11px] text-[#8C7B6C]">
                      {entry.wordCount || 0} words
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleExportMarkdown(entry)}
                      title="Export as Markdown"
                      className="p-1.5 text-[#8C7B6C] hover:text-[#2C241E] hover:bg-[#FAF7F2] rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setReadingEntry(entry)}
                      className="px-2.5 py-1 text-xs text-[#4A3B32] hover:text-[#2C241E] hover:bg-[#FAF7F2] rounded-lg transition-colors font-medium"
                    >
                      Read Full
                    </button>

                    <button
                      onClick={() => onSelectEntry(entry)}
                      className="px-3 py-1 bg-[#F5EBE1] hover:bg-[#E8DFC8] text-[#935116] rounded-lg font-semibold flex items-center space-x-1 transition-all"
                    >
                      <span>Continue</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setEntryToDelete(entry)}
                      className="p-1.5 text-[#8C7B6C] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Entry"
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

      {/* Delete Confirmation Modal */}
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
                  if (!entryToDelete) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteEntry(entryToDelete.id);
                    if (readingEntry?.id === entryToDelete.id) {
                      setReadingEntry(null);
                    }
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

      {/* Full Entry Reader Modal */}
      {readingEntry && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-[#E8DFC8] shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 bg-[#FAF7F2] border-b border-[#E8DFC8] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#BA4A00] font-semibold">
                  {readingEntry.date} · {readingEntry.mood}
                </span>
                <h3 className="font-display text-xl font-bold text-[#2C241E]">
                  {readingEntry.title || "Journal Entry"}
                </h3>
              </div>
              <button
                onClick={() => setReadingEntry(null)}
                className="p-1.5 text-[#8C7B6C] hover:text-[#2C241E] rounded-lg hover:bg-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Daily Photo if present */}
              {readingEntry.photoUrl && (
                <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFC8] space-y-2 text-center">
                  <div className="max-h-72 rounded-xl overflow-hidden bg-black/5 border border-[#E8DFC8] mx-auto">
                    <img
                      src={readingEntry.photoUrl}
                      alt="Daily photo moment"
                      className="w-full h-full max-h-72 object-contain mx-auto"
                    />
                  </div>
                  {readingEntry.photoCaption && (
                    <p className="text-xs font-journal italic text-[#2C241E]">
                      "{readingEntry.photoCaption}"
                    </p>
                  )}
                </div>
              )}

              {readingEntry.summary && (
                <div className="p-4 rounded-xl bg-[#F5EBE1]/70 border border-[#E8DFC8] space-y-1.5">
                  <span className="text-[10px] font-bold text-[#BA4A00] uppercase tracking-wider flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 inline" />
                    <span>AI Reflection Summary</span>
                  </span>
                  <p className="text-xs font-journal text-[#3E3127] leading-relaxed">
                    {readingEntry.summary}
                  </p>
                </div>
              )}

              {readingEntry.insights && readingEntry.insights.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-[#8C7B6C] uppercase tracking-wider">
                    Key Insights & Takeaways
                  </span>
                  <ul className="space-y-1 text-xs font-journal text-[#4A3B32]">
                    {readingEntry.insights.map((i, idx) => (
                      <li key={idx} className="flex items-start space-x-1.5">
                        <span className="text-[#BA4A00] font-bold">•</span>
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-xs font-bold text-[#8C7B6C] uppercase tracking-wider">
                  Journal Entry
                </span>
                <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] text-sm font-journal leading-relaxed text-[#2C241E] whitespace-pre-line">
                  {readingEntry.initialThought || "No text content recorded."}
                </div>
              </div>

              {readingEntry.messages && readingEntry.messages.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#8C7B6C] uppercase tracking-wider">
                    AI Reflection Dialogue ({readingEntry.messages.length} turns)
                  </span>
                  <div className="space-y-2.5">
                    {readingEntry.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-xl text-xs font-journal leading-relaxed ${
                          m.sender === "user"
                            ? "bg-[#2C241E] text-[#FAF7F2] ml-6"
                            : "bg-[#FAF7F2] border border-[#E8DFC8] text-[#2C241E] mr-6"
                        }`}
                      >
                        <div className="text-[10px] opacity-70 mb-1 font-sans">
                          {m.sender === "user" ? "You" : "Warmth AI"}
                        </div>
                        {m.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#FAF7F2] border-t border-[#E8DFC8] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExportMarkdown(readingEntry)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#E8DFC8] text-xs font-medium text-[#4A3B32] hover:bg-white flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export as Markdown</span>
                </button>

                <button
                  onClick={() => setEntryToDelete(readingEntry)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center space-x-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <button
                onClick={() => {
                  onSelectEntry(readingEntry);
                  setReadingEntry(null);
                }}
                className="px-4 py-1.5 bg-[#D35400] hover:bg-[#BA4A00] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Open in Editor</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
