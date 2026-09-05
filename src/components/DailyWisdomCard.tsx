import React, { useState, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  Volume2,
  Copy,
  Check,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Compass,
  Feather,
  Square,
} from "lucide-react";
import { DailyWisdomItem, MoodType, WisdomStream } from "../types";
import {
  playMeditationChime,
  speakWisdom,
  stopSpeakingWisdom,
} from "../data/wisdomLibrary";

interface DailyWisdomCardProps {
  wisdom: DailyWisdomItem;
  currentMood: MoodType;
  preferredStream?: WisdomStream;
  onChangeStream?: (stream: WisdomStream) => void;
  onCycleWisdom?: () => void;
  onSaveBookmark?: (wisdom: DailyWisdomItem) => void;
  isBookmarked?: boolean;
  onOpenTreasury?: () => void;
  className?: string;
  readOnly?: boolean;
  embedded?: boolean;
  dateControl?: React.ReactNode;
}

const STREAM_LABELS: Record<
  WisdomStream,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  all: {
    label: "All Traditions",
    icon: "✨",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-900 dark:text-amber-200",
    border: "border-amber-200 dark:border-amber-800",
  },
  gita: {
    label: "Bhagavad Gita",
    icon: "🪔",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-900 dark:text-amber-200",
    border: "border-amber-200 dark:border-amber-800",
  },
  stoic: {
    label: "Stoic Philosophy",
    icon: "🏛️",
    bg: "bg-stone-50 dark:bg-stone-900/60",
    text: "text-stone-900 dark:text-stone-200",
    border: "border-stone-200 dark:border-stone-800",
  },
  buddhism: {
    label: "Buddhist Mindfulness",
    icon: "☸️",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-900 dark:text-emerald-200",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  psychology: {
    label: "Psychological Reframing",
    icon: "🧠",
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-900 dark:text-cyan-200",
    border: "border-cyan-200 dark:border-cyan-800",
  },
};

export const DailyWisdomCard: React.FC<DailyWisdomCardProps> = ({
  wisdom,
  currentMood,
  preferredStream = "gita",
  onChangeStream,
  onCycleWisdom,
  onSaveBookmark,
  isBookmarked = false,
  onOpenTreasury,
  className = "",
  readOnly = false,
  embedded = false,
  dateControl,
}) => {
  const [copied, setCopied] = useState(false);
  const [showTransliteration, setShowTransliteration] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRevealed, setIsRevealed] = useState(readOnly ? true : false);

  // Stop audio on unmount or when wisdom changes
  useEffect(() => {
    return () => {
      stopSpeakingWisdom();
    };
  }, [wisdom.id]);

  const streamInfo =
    STREAM_LABELS[wisdom.stream] || STREAM_LABELS.gita;

  const handleCopy = () => {
    let textToCopy = `${wisdom.source}\n\n`;
    if (wisdom.originalText) {
      textToCopy += `${wisdom.originalText}\n\n`;
    }
    if (wisdom.transliteration) {
      textToCopy += `(${wisdom.transliteration})\n\n`;
    }
    textToCopy += `"${wisdom.translation}"\n\nReflection: ${wisdom.contextBridge}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleSpeak = () => {
    if (isPlayingAudio) {
      stopSpeakingWisdom();
      setIsPlayingAudio(false);
    } else {
      // Play a soft opening chime then begin speech narration
      playMeditationChime();
      setIsPlayingAudio(true);
      speakWisdom(
        wisdom,
        () => setIsPlayingAudio(false),
        () => setIsPlayingAudio(false)
      );
    }
  };

  // Intentional On-Demand Reveal (Grounding Collapsible State)
  if (!isRevealed) {
    if (embedded) {
      return (
        <div
          className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 ${className}`}
        >
          {dateControl && (
            <div className="shrink-0 self-start lg:self-auto">
              {dateControl}
            </div>
          )}

          <div
            className={`flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              dateControl ? "lg:pl-3.5 lg:border-l lg:border-[#F0E8D9]" : ""
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] shadow-2xs flex items-center justify-center text-base shrink-0">
                {streamInfo.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#BA4A00]">
                    Wisdom For Today
                  </span>
                  <span className="text-[11px] font-semibold text-[#2C241E]">
                    · {streamInfo.label}
                  </span>
                </div>
                <p className="text-xs text-[#7E6E5F] mt-0.5 truncate max-w-xs sm:max-w-sm md:max-w-md">
                  A contemplative verse curated for feeling{" "}
                  <strong className="text-[#BA4A00] capitalize">
                    {currentMood}
                  </strong>
                  .
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  playMeditationChime();
                  setIsRevealed(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#2C241E] hover:bg-[#4A3B32] text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Reveal Today's Verse</span>
              </button>
              {onOpenTreasury && (
                <button
                  type="button"
                  onClick={onOpenTreasury}
                  className="p-1.5 rounded-xl text-xs font-semibold bg-[#FAF7F2] border border-[#E8DFC8] text-[#7E6E5F] hover:text-[#2C241E] hover:bg-white transition-colors cursor-pointer"
                  title="Explore Wisdom Treasury"
                >
                  <Compass className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`bg-white rounded-3xl border border-[#E8DFC8] shadow-xs p-4 sm:p-5 transition-all relative overflow-hidden ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] shadow-2xs flex items-center justify-center text-base shrink-0">
              {streamInfo.icon}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#BA4A00]">
                  Wisdom For Today
                </span>
                <span className="text-[11px] font-semibold text-[#2C241E]">
                  · {streamInfo.label}
                </span>
              </div>
              <p className="text-xs text-[#7E6E5F] mt-0.5">
                A contemplative verse curated for feeling <strong className="text-[#BA4A00] capitalize">{currentMood}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                playMeditationChime();
                setIsRevealed(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#2C241E] hover:bg-[#4A3B32] text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Reveal Today's Verse</span>
            </button>
            {onOpenTreasury && (
              <button
                type="button"
                onClick={onOpenTreasury}
                className="p-2 rounded-xl text-xs font-semibold bg-white border border-[#E8DFC8] text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                title="Explore Wisdom Treasury"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        embedded
          ? `space-y-3 transition-all relative animate-fade-in ${className}`
          : `bg-white rounded-3xl border border-[#E8DFC8] shadow-xs overflow-hidden transition-all relative animate-fade-in ${className}`
      }
    >
      {/* If embedded with dateControl, show dateControl row on top */}
      {embedded && dateControl && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#F0E8D9]">
          <div className="shrink-0 self-start lg:self-auto">{dateControl}</div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#7E6E5F] flex items-center space-x-1.5">
              <span>{streamInfo.icon}</span>
              <strong className="text-[#2C241E]">Wisdom For Today</strong>
              <span className="hidden sm:inline">· {wisdom.source}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsRevealed(false)}
              className="px-2.5 py-1 text-xs font-semibold text-[#7E6E5F] hover:text-[#2C241E] bg-[#FAF7F2] hover:bg-[#F5EBE1] border border-[#E8DFC8] rounded-xl flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
              title="Collapse verse"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hide Verse</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Wisdom Lens Selector */}
      <div
        className={
          embedded
            ? "p-3 sm:p-3.5 bg-[#FAF7F2]/90 rounded-2xl border border-[#E8DFC8] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            : "p-4 sm:p-5 bg-gradient-to-r from-[#FAF7F2] to-[#F5EBE1]/60 border-b border-[#E8DFC8] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        }
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-white border border-[#E8DFC8] shadow-2xs flex items-center justify-center text-base shrink-0">
            {streamInfo.icon}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#BA4A00]">
                Wisdom For Today
              </span>
              <span className="text-[11px] font-semibold text-[#2C241E] truncate">
                · {wisdom.source}
              </span>
            </div>
            <p className="text-[11px] text-[#7E6E5F] capitalize">
              Anchored for feeling: <strong className="text-[#BA4A00]">{currentMood}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 self-start sm:self-auto flex-wrap">
          {/* Audio Reader (TTS + Chime) */}
          <button
            type="button"
            onClick={handleToggleSpeak}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 cursor-pointer ${
              isPlayingAudio
                ? "bg-amber-600 border-amber-700 text-white shadow-xs"
                : "bg-white border-[#E8DFC8] text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2]"
            }`}
            title={isPlayingAudio ? "Stop reading wisdom aloud" : "Listen to wisdom read aloud"}
          >
            {isPlayingAudio ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>Stop Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Listen</span>
              </>
            )}
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-xl text-xs font-semibold bg-white border border-[#E8DFC8] text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            title="Copy shloka / quote to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Bookmark Button */}
          {onSaveBookmark && (
            <button
              type="button"
              onClick={() => onSaveBookmark(wisdom)}
              className={`p-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                isBookmarked
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-white border-[#E8DFC8] text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2]"
              }`}
              title={isBookmarked ? "Saved in Wisdom Treasury" : "Save to Wisdom Treasury"}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-[#BA4A00]" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Refresh / Next Verse */}
          {onCycleWisdom && !readOnly && (
            <button
              type="button"
              onClick={onCycleWisdom}
              className="p-2 rounded-xl text-xs font-semibold bg-white border border-[#E8DFC8] text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              title="View another matching verse for today"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Stream Selector Dropdown */}
          {onChangeStream && !readOnly && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E8DFC8] text-xs font-semibold text-[#2C241E] flex items-center space-x-1 hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                <span>{streamInfo.icon}</span>
                <span className="hidden sm:inline text-[11px]">{streamInfo.label}</span>
                <ChevronDown className="w-3 h-3 text-[#7E6E5F]" />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#E8DFC8] rounded-2xl shadow-xl p-1.5 z-30 space-y-0.5 animate-fade-in text-left">
                    <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-[#8C7B6C] tracking-wider">
                      Wisdom Tradition Lens
                    </div>
                    {(
                      [
                        "gita",
                        "stoic",
                        "buddhism",
                        "psychology",
                      ] as WisdomStream[]
                    ).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          onChangeStream(st);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center space-x-2 transition-colors cursor-pointer ${
                          preferredStream === st
                            ? "bg-[#F5EBE1] text-[#935116] font-bold"
                            : "text-[#4A3B32] hover:bg-[#FAF7F2]"
                        }`}
                      >
                        <span className="text-sm">{STREAM_LABELS[st].icon}</span>
                        <span className="text-[11px]">{STREAM_LABELS[st].label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Collapse / Tuck away button */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                stopSpeakingWisdom();
                setIsPlayingAudio(false);
                setIsRevealed(false);
              }}
              className="p-2 rounded-xl text-xs font-semibold bg-white border border-[#E8DFC8] text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              title="Tuck away / Quiet view"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Body: Sanskrit / Original Text + Translation + Context */}
      <div className={embedded ? "p-1 sm:p-2 space-y-3.5" : "p-5 sm:p-6 space-y-4"}>
        {/* Sanskrit Original & Transliteration (for Gita / Buddhism) */}
        {wisdom.originalText && (
          <div className="bg-[#FAF7F2]/80 border border-[#E8DFC8]/80 rounded-2xl p-4 sm:p-5 text-center space-y-2">
            <p className="font-serif text-base sm:text-lg text-[#2C241E] whitespace-pre-line leading-relaxed tracking-wide">
              {wisdom.originalText}
            </p>

            {wisdom.transliteration && showTransliteration && (
              <p className="text-xs text-[#7E6E5F] font-serif italic whitespace-pre-line pt-1 border-t border-[#E8DFC8]/50 leading-relaxed">
                {wisdom.transliteration}
              </p>
            )}

            {wisdom.transliteration && (
              <button
                type="button"
                onClick={() => setShowTransliteration(!showTransliteration)}
                className="text-[10px] text-[#BA4A00] font-semibold hover:underline pt-1 cursor-pointer"
              >
                {showTransliteration ? "Hide Transliteration" : "Show Transliteration"}
              </button>
            )}
          </div>
        )}

        {/* User Transparency Context Badge: clearly explaining why this quote was chosen */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-[11px] text-[#8C4A16] font-medium shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#E67E22] shrink-0" />
          <span>
            Reflected for <strong>{currentMood || "today's reflection"}</strong> · {wisdom.contextBridge}
          </span>
        </div>

        {/* Translation Quote */}
        <div className="space-y-1">
          <blockquote className="text-sm sm:text-base font-serif italic text-[#2C241E] leading-relaxed pl-3.5 border-l-2 border-[#D35400] py-0.5">
            "{wisdom.translation}"
          </blockquote>
        </div>

        {/* Footer Meta & Treasury Link */}
        <div className="pt-2 flex items-center justify-between text-xs text-[#7E6E5F]">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E8DFC8] text-[10px] font-medium text-[#4A3B32]">
              {wisdom.theme}
            </span>
          </div>

          {onOpenTreasury && (
            <button
              type="button"
              onClick={onOpenTreasury}
              className="text-[11px] font-semibold text-[#BA4A00] hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <Compass className="w-3 h-3" />
              <span>Explore Wisdom Treasury</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
