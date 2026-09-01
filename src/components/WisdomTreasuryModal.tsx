import React, { useState, useEffect } from "react";
import {
  X,
  Compass,
  Search,
  BookOpen,
  Volume2,
  Square,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Feather,
} from "lucide-react";
import { DailyWisdomItem, MoodType, WisdomStream } from "../types";
import {
  WISDOM_LIBRARY,
  playMeditationChime,
  speakWisdom,
  stopSpeakingWisdom,
} from "../data/wisdomLibrary";

interface WisdomTreasuryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarkedIds?: string[];
  onToggleBookmark?: (item: DailyWisdomItem) => void;
  onSelectWisdomForToday?: (item: DailyWisdomItem) => void;
}

const STREAM_FILTERS: { id: WisdomStream | "all"; label: string; icon: string }[] = [
  { id: "all", label: "All Traditions", icon: "✨" },
  { id: "gita", label: "Bhagavad Gita", icon: "🪔" },
  { id: "stoic", label: "Stoic Philosophy", icon: "🏛️" },
  { id: "buddhism", label: "Buddhist Mindfulness", icon: "🪷" },
  { id: "psychology", label: "Psychological Reframing", icon: "🧠" },
];

export const WisdomTreasuryModal: React.FC<WisdomTreasuryModalProps> = ({
  isOpen,
  onClose,
  bookmarkedIds = [],
  onToggleBookmark,
  onSelectWisdomForToday,
}) => {
  const [selectedStream, setSelectedStream] = useState<WisdomStream | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>("all");
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopSpeakingWisdom();
    };
  }, []);

  if (!isOpen) return null;

  const handleToggleSpeakItem = (item: DailyWisdomItem) => {
    if (speakingId === item.id) {
      stopSpeakingWisdom();
      setSpeakingId(null);
    } else {
      playMeditationChime();
      setSpeakingId(item.id);
      speakWisdom(
        item,
        () => setSpeakingId(null),
        () => setSpeakingId(null)
      );
    }
  };

  const filteredItems = WISDOM_LIBRARY.filter((item) => {
    if (selectedStream !== "all" && item.stream !== selectedStream) return false;
    if (onlyBookmarks && !bookmarkedIds.includes(item.id)) return false;
    if (selectedMoodFilter !== "all" && !item.moods.includes(selectedMoodFilter as MoodType)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSource = item.source.toLowerCase().includes(q);
      const matchTrans = item.translation.toLowerCase().includes(q);
      const matchTheme = item.theme.toLowerCase().includes(q);
      const matchContext = item.contextBridge.toLowerCase().includes(q);
      const matchOrig = item.originalText?.toLowerCase().includes(q);
      if (!matchSource && !matchTrans && !matchTheme && !matchContext && !matchOrig) {
        return false;
      }
    }
    return true;
  });

  const handleCopy = (item: DailyWisdomItem) => {
    let text = `${item.source}\n\n`;
    if (item.originalText) text += `${item.originalText}\n\n`;
    if (item.transliteration) text += `(${item.transliteration})\n\n`;
    text += `"${item.translation}"\n\nWhy this helps: ${item.contextBridge}`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF7F2] border border-[#E8DFC8] rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-white border-b border-[#E8DFC8] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center text-lg">
              🪔
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-display font-semibold text-lg sm:text-xl text-[#2C241E]">
                  Wisdom Treasury
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#F5EBE1] text-[#935116]">
                  {WISDOM_LIBRARY.length} Verses
                </span>
              </div>
              <p className="text-xs text-[#7E6E5F]">
                Verified teachings from Bhagavad Gita, Stoicism, Mindfulness, and Psychology.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="p-4 bg-white/70 border-b border-[#E8DFC8] space-y-3">
          {/* Stream Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {STREAM_FILTERS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStream(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
                  selectedStream === s.id
                    ? "bg-[#BA4A00] text-white shadow-2xs"
                    : "bg-white border border-[#E8DFC8] text-[#7E6E5F] hover:text-[#2C241E]"
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setOnlyBookmarks(!onlyBookmarks)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
                onlyBookmarks
                  ? "bg-amber-500 text-white shadow-2xs"
                  : "bg-white border border-[#E8DFC8] text-[#7E6E5F] hover:text-[#2C241E]"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved ({bookmarkedIds.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7B6C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by chapter, concept, keyword, or emotion..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#E8DFC8] text-xs text-[#2C241E] focus:outline-none focus:border-[#BA4A00]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8C7B6C] hover:text-[#2C241E]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Verses Scroll View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Compass className="w-8 h-8 text-[#D5C4A1] mx-auto" />
              <p className="text-sm font-semibold text-[#2C241E]">No verses found</p>
              <p className="text-xs text-[#7E6E5F]">
                Try adjusting your search terms or selecting a different wisdom stream.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSaved = bookmarkedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="bg-white border border-[#E8DFC8] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 hover:border-[#BA4A00]/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-display font-semibold text-sm sm:text-base text-[#2C241E]">
                          {item.source}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8DFC8] text-[#935116] font-medium">
                          {item.theme}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7E6E5F] capitalize">
                        Tradition: {item.authorOrTradition}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSpeakItem(item)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          speakingId === item.id
                            ? "bg-amber-600 text-white"
                            : "text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2]"
                        }`}
                        title={speakingId === item.id ? "Stop audio" : "Listen to wisdom aloud"}
                      >
                        {speakingId === item.id ? (
                          <Square className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(item)}
                        className="p-1.5 rounded-lg text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2] cursor-pointer"
                        title="Copy verse"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {onToggleBookmark && (
                        <button
                          type="button"
                          onClick={() => onToggleBookmark(item)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isSaved
                              ? "text-[#BA4A00] bg-amber-50"
                              : "text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2]"
                          }`}
                          title={isSaved ? "Remove bookmark" : "Bookmark verse"}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sanskrit text if available */}
                  {item.originalText && (
                    <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8DFC8]/60 text-center space-y-1">
                      <p className="font-serif text-sm text-[#2C241E] whitespace-pre-line">
                        {item.originalText}
                      </p>
                      {item.transliteration && (
                        <p className="text-[11px] text-[#7E6E5F] font-serif italic whitespace-pre-line">
                          {item.transliteration}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Translation */}
                  <blockquote className="text-xs sm:text-sm font-serif italic text-[#3E3127] pl-3 border-l-2 border-[#D35400] leading-relaxed">
                    "{item.translation}"
                  </blockquote>

                  {/* Context Bridge */}
                  <div className="bg-amber-50/70 p-2.5 rounded-xl text-[11px] text-[#4A3B32] border border-amber-200/50 flex items-start space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D35400] shrink-0 mt-0.5" />
                    <span>{item.contextBridge}</span>
                  </div>

                  {onSelectWisdomForToday && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectWisdomForToday(item);
                          onClose();
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] text-[#BA4A00] hover:bg-[#F5EBE1] transition-colors cursor-pointer"
                      >
                        Set as Today's Wisdom Anchor →
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#E8DFC8] flex items-center justify-between text-xs text-[#7E6E5F]">
          <span>Public domain authentic translations & philosophical frameworks</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#2C241E] text-white font-semibold hover:bg-black transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
