import React, { useState, useEffect } from "react";
import {
  Settings,
  Moon,
  Sun,
  BookOpen,
  Camera,
  Mic,
  Volume2,
  Plus,
  Trash2,
  Sparkles,
  Award,
  Check,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Feather,
  Heart,
  Flame,
  Star,
  Compass,
  VolumeX,
  ArrowUp,
  ArrowDown,
  Droplet,
  Book,
  Footprints,
  Coffee,
  Dumbbell,
  Music,
  Apple,
} from "lucide-react";
import {
  AppSettings,
  AppTheme,
  HabitTemplate,
  HabitCategory,
  WisdomStream,
  MoodType,
} from "../types";
import { HabitManagerModal, getHabitIconComponent } from "./HabitManagerModal";
import { User } from "firebase/auth";

const AVAILABLE_HABIT_ICONS = [
  { name: "Sun", icon: Sun, label: "Morning / Sun" },
  { name: "Droplet", icon: Droplet, label: "Hydration" },
  { name: "Book", icon: Book, label: "Reading" },
  { name: "Heart", icon: Heart, label: "Gratitude / Care" },
  { name: "Footprints", icon: Footprints, label: "Walk / Movement" },
  { name: "Sparkles", icon: Sparkles, label: "Focus / Deep Work" },
  { name: "Moon", icon: Moon, label: "Sleep / Wind Down" },
  { name: "Coffee", icon: Coffee, label: "Ritual / Break" },
  { name: "Dumbbell", icon: Dumbbell, label: "Fitness" },
  { name: "Compass", icon: Compass, label: "Intention / Mind" },
  { name: "Music", icon: Music, label: "Sound / Art" },
  { name: "Apple", icon: Apple, label: "Nourishment" },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  user: User | null;
  habitTemplates: HabitTemplate[];
  onSaveHabitTemplate: (template: Partial<HabitTemplate> & { title: string }) => Promise<void>;
  onDeleteHabitTemplate: (templateId: string) => Promise<void>;
  onResetHabitDefaults: () => Promise<void>;
  initialSection?: "habits" | "wisdom" | "hardware";
}

const WISDOM_STREAM_OPTIONS: {
  stream: WisdomStream;
  title: string;
  tradition: string;
  icon: string;
  description: string;
}[] = [
  {
    stream: "all",
    title: "All Traditions (Daily Rotation)",
    tradition: "Eclectic Sanctuary",
    icon: "✨",
    description: "Draws freely across Gita, Stoicism, Zen Buddhism, and Psychology based on daily mood.",
  },
  {
    stream: "gita",
    title: "Bhagavad Gita & Vedic Wisdom",
    tradition: "Gita · Upanishads · Patanjali",
    icon: "🪔",
    description: "Nishkama Karma (duty without anxiety), inner resilience, and befriending the mind.",
  },
  {
    stream: "stoic",
    title: "Stoic Philosophy & Dichotomy of Control",
    tradition: "Marcus Aurelius · Seneca · Epictetus",
    icon: "🏛️",
    description: "Focus on what is in your control, emotional equanimity, and cognitive reframing.",
  },
  {
    stream: "buddhism",
    title: "Zen & Buddhist Mindfulness",
    tradition: "Dhammapada · Zen Masters",
    icon: "☸️",
    description: "Impermanence, mindful presence, radical acceptance, and self-compassion.",
  },
  {
    stream: "psychology",
    title: "Cognitive Science & Logotherapy",
    tradition: "Viktor Frankl · Carl Jung · Modern CBT",
    icon: "🧠",
    description: "Evidence-based somatic grounding, meaning-making, and constructive habit loops.",
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  user,
  habitTemplates,
  onSaveHabitTemplate,
  onDeleteHabitTemplate,
  onResetHabitDefaults,
  initialSection = "habits",
}) => {
  const [activeSection, setActiveSection] = useState<
    "habits" | "wisdom" | "hardware"
  >(initialSection);

  useEffect(() => {
    if (isOpen && initialSection) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  // Habit configuration state
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState<HabitCategory>("mind");
  const [newHabitIcon, setNewHabitIcon] = useState("Sun");
  const [isSubmittingHabit, setIsSubmittingHabit] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editHabitTitle, setEditHabitTitle] = useState("");

  // Hardware permission test states
  const [cameraStatus, setCameraStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [micStatus, setMicStatus] = useState<"idle" | "granted" | "denied">("idle");

  if (!isOpen) return null;

  // Habit manager methods
  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;

    setIsSubmittingHabit(true);
    try {
      await onSaveHabitTemplate({
        title: newHabitTitle.trim(),
        category: newHabitCategory,
        icon: newHabitIcon,
        isActive: true,
        order: habitTemplates.length,
      });
      setNewHabitTitle("");
      setNewHabitCategory("mind");
      setNewHabitIcon("Sun");
    } finally {
      setIsSubmittingHabit(false);
    }
  };

  const handleToggleHabitActive = async (template: HabitTemplate) => {
    await onSaveHabitTemplate({
      ...template,
      isActive: !template.isActive,
    });
  };

  const handleMoveHabit = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === habitTemplates.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const current = habitTemplates[index];
    const target = habitTemplates[targetIndex];

    await onSaveHabitTemplate({ ...current, order: targetIndex });
    await onSaveHabitTemplate({ ...target, order: index });
  };

  const handleStartEditHabit = (t: HabitTemplate) => {
    setEditingHabitId(t.id);
    setEditHabitTitle(t.title);
  };

  const handleSaveEditHabit = async (t: HabitTemplate) => {
    if (!editHabitTitle.trim()) return;
    await onSaveHabitTemplate({
      ...t,
      title: editHabitTitle.trim(),
    });
    setEditingHabitId(null);
  };

  const handleTestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStatus("granted");
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setCameraStatus("denied");
    }
  };

  const handleTestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus("granted");
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setMicStatus("denied");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF7F2] dark:bg-[#1F1B18] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#E8DFC8] dark:border-[#3E342B] flex flex-col md:flex-row max-h-[90vh] overflow-hidden text-[#2C241E] dark:text-[#E8DFC8]">
        {/* Left Settings Navigation Bar */}
        <aside className="w-full md:w-64 bg-[#F4EDE2] dark:bg-[#181412] p-4 border-b md:border-b-0 md:border-r border-[#E5DAC6] dark:border-[#332A23] flex flex-col justify-between shrink-0">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 px-2 py-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E67E22] to-[#A04000] flex items-center justify-center text-white shadow-xs">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-base leading-tight text-[#2C241E] dark:text-[#F5EBE1]">
                  Sanctuary Settings
                </h2>
                <p className="text-[10px] text-[#7E6E5F] dark:text-[#A89887]">
                  Preferences & Routines
                </p>
              </div>
            </div>

            {/* Nav Items */}
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveSection("wisdom")}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                  activeSection === "wisdom"
                    ? "bg-white dark:bg-[#2C241E] text-[#BA4A00] dark:text-[#F39C12] shadow-xs"
                    : "text-[#7E6E5F] dark:text-[#A89887] hover:bg-[#EAE0D0] dark:hover:bg-[#261F1A]"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Wisdom Lens & Tradition</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("hardware")}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                  activeSection === "hardware"
                    ? "bg-white dark:bg-[#2C241E] text-[#BA4A00] dark:text-[#F39C12] shadow-xs"
                    : "text-[#7E6E5F] dark:text-[#A89887] hover:bg-[#EAE0D0] dark:hover:bg-[#261F1A]"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Camera & Microphone</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("habits")}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                  activeSection === "habits"
                    ? "bg-white dark:bg-[#2C241E] text-[#BA4A00] dark:text-[#F39C12] shadow-xs"
                    : "text-[#7E6E5F] dark:text-[#A89887] hover:bg-[#EAE0D0] dark:hover:bg-[#261F1A]"
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Habit Configurations</span>
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-[#E5DAC6] dark:border-[#332A23] text-[11px] text-[#8C7B6C] dark:text-[#7A6B5D] flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Synced Privately</span>
            </span>
            <span>v2.4</span>
          </div>
        </aside>

        {/* Right Section Content */}
        <main className="flex-1 flex flex-col justify-between overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header with Close */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFC8] dark:border-[#3E342B]">
              <h3 className="font-display font-semibold text-lg text-[#2C241E] dark:text-[#F5EBE1]">
                {activeSection === "wisdom" && "Wisdom Tradition & Philosophical Lens"}
                {activeSection === "hardware" && "Camera & Microphone Hardware"}
                {activeSection === "habits" && "Habit Routine Management"}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-xl bg-[#F4EDE2] dark:bg-[#2C241E] text-xs font-semibold text-[#7E6E5F] dark:text-[#A89887] hover:text-[#2C241E] dark:hover:text-white transition-colors"
              >
                Done
              </button>
            </div>

            {/* 1. WISDOM TRADITIONS SECTION */}
            {activeSection === "wisdom" && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#8C7B6C] dark:text-[#A89887] block mb-2">
                    Default Wisdom Tradition Stream
                  </label>
                  <p className="text-xs text-[#7E6E5F] dark:text-[#A89887] mb-3">
                    Choose which philosophy shapes your daily quotes, contemplative cards, and reflection companion context.
                  </p>

                  <div className="space-y-2.5">
                    {WISDOM_STREAM_OPTIONS.map((item) => (
                      <div
                        key={item.stream}
                        onClick={() => onUpdateSettings({ wisdomStream: item.stream })}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 ${
                          settings.wisdomStream === item.stream
                            ? "bg-white dark:bg-[#2C241E] border-[#BA4A00] dark:border-[#F39C12] shadow-xs"
                            : "bg-[#F4EDE2] dark:bg-[#181412] border-[#E8DFC8] dark:border-[#332A23] hover:bg-white dark:hover:bg-[#261F1A]"
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#2C241E] dark:text-[#F5EBE1]">
                              {item.title}
                            </span>
                            {settings.wisdomStream === item.stream && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5EBE1] dark:bg-[#3B2C1E] text-[#BA4A00] dark:text-[#F39C12] border border-[#E8DFC8] dark:border-[#523C27]">
                                Active Default
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#7E6E5F] dark:text-[#A89887] mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8DFC8] dark:border-[#3E342B] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#2C241E] dark:text-[#F5EBE1] block">
                      Audio Voice Guidance
                    </span>
                    <span className="text-[11px] text-[#7E6E5F] dark:text-[#A89887]">
                      Enable speech synthesis voice reader on wisdom cards
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoPlayWisdomAudio}
                    onChange={(e) =>
                      onUpdateSettings({ autoPlayWisdomAudio: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#BA4A00] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 3. CAMERA & MICROPHONE SECTION */}
            {activeSection === "hardware" && (
              <div className="space-y-5 animate-fade-in">
                <div className="bg-[#F5EBE1] dark:bg-[#28211B] p-4 rounded-xl border border-[#E8DFC8] dark:border-[#3E342B] space-y-1">
                  <h4 className="text-xs font-semibold text-[#2C241E] dark:text-[#F5EBE1] flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Hardware Privacy Guarantee</span>
                  </h4>
                  <p className="text-xs text-[#7E6E5F] dark:text-[#A89887]">
                    Camera captures stay compressed directly in your private journal entry. Microphone dictation runs natively via your browser engine without third-party audio eavesdropping.
                  </p>
                </div>

                {/* Camera Toggle & Test */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#241E1A] border border-[#E8DFC8] dark:border-[#3E342B] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#2C241E] dark:text-[#F5EBE1]">
                          Daily Photo Journaling (Camera)
                        </div>
                        <div className="text-[11px] text-[#7E6E5F] dark:text-[#A89887]">
                          Capture daily visual anchors and milestone moments
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enableCamera}
                      onChange={(e) =>
                        onUpdateSettings({ enableCamera: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#BA4A00] rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-2 border-t border-[#F4EDE2] dark:border-[#332A23]">
                    <button
                      type="button"
                      onClick={handleTestCamera}
                      className="px-3 py-1.5 bg-[#FAF7F2] dark:bg-[#1F1B18] border border-[#E8DFC8] dark:border-[#3E342B] text-xs font-semibold rounded-lg hover:bg-white dark:hover:bg-[#2C241E] transition-colors"
                    >
                      Test Camera Access
                    </button>
                    {cameraStatus === "granted" && (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Camera Ready & Operational</span>
                      </span>
                    )}
                    {cameraStatus === "denied" && (
                      <span className="text-xs text-rose-600 font-semibold">
                        Permission Blocked in Browser. Please click the lock icon in address bar.
                      </span>
                    )}
                  </div>
                </div>

                {/* Mic Toggle & Test */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#241E1A] border border-[#E8DFC8] dark:border-[#3E342B] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 flex items-center justify-center">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#2C241E] dark:text-[#F5EBE1]">
                          Voice Dictation & Spoken Reflections (Microphone)
                        </div>
                        <div className="text-[11px] text-[#7E6E5F] dark:text-[#A89887]">
                          Speak your thoughts freely with live speech-to-text
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enableMicrophone}
                      onChange={(e) =>
                        onUpdateSettings({ enableMicrophone: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#BA4A00] rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-2 border-t border-[#F4EDE2] dark:border-[#332A23]">
                    <button
                      type="button"
                      onClick={handleTestMic}
                      className="px-3 py-1.5 bg-[#FAF7F2] dark:bg-[#1F1B18] border border-[#E8DFC8] dark:border-[#3E342B] text-xs font-semibold rounded-lg hover:bg-white dark:hover:bg-[#2C241E] transition-colors"
                    >
                      Test Microphone Access
                    </button>
                    {micStatus === "granted" && (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Microphone Ready & Operational</span>
                      </span>
                    )}
                    {micStatus === "denied" && (
                      <span className="text-xs text-rose-600 font-semibold">
                        Permission Blocked in Browser. Please allow mic access.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. HABITS CONFIGURATION SECTION */}
            {activeSection === "habits" && (
              <div className="space-y-5 animate-fade-in">
                {/* Header & Restore Defaults */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C7B6C] dark:text-[#A89887]">
                      Configure Recurring Habits ({habitTemplates.filter((h) => h.isActive).length} active)
                    </h4>
                    <p className="text-xs text-[#7E6E5F] dark:text-[#A89887]">
                      These mindful rituals auto-populate into your daily checklist dock.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onResetHabitDefaults}
                    className="flex items-center space-x-1 text-[11px] text-[#BA4A00] dark:text-[#F39C12] hover:underline"
                    title="Reset to 6 default mindful habits"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore Defaults</span>
                  </button>
                </div>

                {/* Add Habit Form */}
                <form
                  onSubmit={handleCreateHabit}
                  className="bg-white dark:bg-[#241E1A] border border-[#E8DFC8] dark:border-[#3E342B] rounded-xl p-4 space-y-3.5 shadow-xs"
                >
                  <span className="text-xs font-bold tracking-wider text-[#935116] dark:text-[#F39C12] uppercase flex items-center space-x-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Routine Habit</span>
                  </span>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newHabitTitle}
                      onChange={(e) => setNewHabitTitle(e.target.value)}
                      placeholder="e.g. 10-min Morning Meditation"
                      className="flex-1 px-3.5 py-2 rounded-lg border border-[#E8DFC8] dark:border-[#3E342B] text-xs bg-[#FAF7F2] dark:bg-[#1A1613] text-[#2C241E] dark:text-[#F5EBE1] focus:outline-none focus:ring-1 focus:ring-[#BA4A00]"
                      maxLength={80}
                    />

                    <select
                      value={newHabitCategory}
                      onChange={(e) => setNewHabitCategory(e.target.value as HabitCategory)}
                      className="px-3 py-2 rounded-lg border border-[#E8DFC8] dark:border-[#3E342B] text-xs bg-[#FAF7F2] dark:bg-[#1A1613] focus:outline-none focus:ring-1 focus:ring-[#BA4A00] text-[#2C241E] dark:text-[#F5EBE1]"
                    >
                      <option value="mind">🧘 Mind</option>
                      <option value="body">🏃 Body</option>
                      <option value="focus">🎯 Focus</option>
                      <option value="creativity">🎨 Creativity</option>
                    </select>
                  </div>

                  {/* Icon Picker */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-[#7E6E5F] dark:text-[#A89887] font-medium">
                      Choose an icon:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_HABIT_ICONS.map((item) => {
                        const IconComp = item.icon;
                        const isSelected = newHabitIcon === item.name;
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setNewHabitIcon(item.name)}
                            className={`p-2 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#F5EBE1] dark:bg-[#3B2C1E] border-[#BA4A00] dark:border-[#F39C12] text-[#BA4A00] dark:text-[#F39C12] shadow-xs scale-105"
                                : "border-[#E8DFC8] dark:border-[#3E342B] bg-[#FAF7F2] dark:bg-[#1A1613] text-[#7E6E5F] dark:text-[#A89887] hover:text-[#2C241E] dark:hover:text-[#F5EBE1] hover:border-[#D5C9B3]"
                            }`}
                            title={item.label}
                          >
                            <IconComp className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSubmittingHabit || !newHabitTitle.trim()}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#BA4A00] hover:bg-[#A04000] text-white text-xs font-semibold disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Habit</span>
                    </button>
                  </div>
                </form>

                {/* Current Habits List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-[#7E6E5F] dark:text-[#A89887] uppercase">
                      Configured Habits ({habitTemplates.length})
                    </span>
                  </div>

                  {habitTemplates.length === 0 ? (
                    <div className="text-center py-8 px-4 bg-white dark:bg-[#241E1A] border border-dashed border-[#E8DFC8] dark:border-[#3E342B] rounded-xl">
                      <Sparkles className="w-6 h-6 text-[#BA4A00]/40 mx-auto mb-2" />
                      <p className="text-xs text-[#7E6E5F] dark:text-[#A89887]">No recurring habits configured yet.</p>
                      <button
                        type="button"
                        onClick={onResetHabitDefaults}
                        className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#F5EBE1] dark:bg-[#3B2C1E] text-[#935116] dark:text-[#F39C12] border border-[#E8DFC8] dark:border-[#523C27] text-xs font-semibold hover:bg-[#EBDDCF] cursor-pointer"
                      >
                        Load 6 Mindful Defaults
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {habitTemplates.map((template, index) => {
                        const IconComp = getHabitIconComponent(template.icon);
                        const isEditing = editingHabitId === template.id;

                        return (
                          <div
                            key={template.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                              template.isActive
                                ? "bg-white dark:bg-[#241E1A] border-[#E8DFC8] dark:border-[#3E342B] shadow-2xs"
                                : "bg-[#F5EBE1]/40 dark:bg-[#181412]/60 border-[#E8DFC8]/60 dark:border-[#2D241D] opacity-60"
                            }`}
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0 mr-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  template.category === "mind"
                                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400"
                                    : template.category === "body"
                                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                                    : template.category === "focus"
                                    ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                                    : "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400"
                                }`}
                              >
                                <IconComp className="w-4 h-4" />
                              </div>

                              {isEditing ? (
                                <div className="flex items-center space-x-2 flex-1">
                                  <input
                                    type="text"
                                    value={editHabitTitle}
                                    onChange={(e) => setEditHabitTitle(e.target.value)}
                                    className="px-2 py-1 rounded border border-[#BA4A00] text-xs bg-white dark:bg-[#1A1613] text-[#2C241E] dark:text-[#F5EBE1] w-full focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditHabit(template)}
                                    className="px-2 py-1 rounded bg-[#BA4A00] text-white text-[10px] font-semibold shrink-0 cursor-pointer hover:bg-[#A04000]"
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <div
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => handleStartEditHabit(template)}
                                  title="Click to rename"
                                >
                                  <p
                                    className={`text-xs font-semibold truncate ${
                                      template.isActive
                                        ? "text-[#2C241E] dark:text-[#F5EBE1]"
                                        : "line-through text-[#7E6E5F] dark:text-[#A89887]"
                                    }`}
                                  >
                                    {template.title}
                                  </p>
                                  <span className="text-[10px] text-[#7E6E5F] dark:text-[#A89887] capitalize">
                                    {template.category} ritual
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Action Controls */}
                            <div className="flex items-center space-x-1 shrink-0">
                              {/* Reorder Buttons */}
                              <button
                                type="button"
                                onClick={() => handleMoveHabit(index, "up")}
                                disabled={index === 0}
                                className="p-1 rounded text-[#7E6E5F] dark:text-[#A89887] hover:bg-[#F5EBE1] dark:hover:bg-[#332A23] disabled:opacity-20 cursor-pointer"
                                title="Move up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveHabit(index, "down")}
                                disabled={index === habitTemplates.length - 1}
                                className="p-1 rounded text-[#7E6E5F] dark:text-[#A89887] hover:bg-[#F5EBE1] dark:hover:bg-[#332A23] disabled:opacity-20 cursor-pointer"
                                title="Move down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Active Toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleHabitActive(template)}
                                className={`px-2 py-1 rounded-md text-[10px] font-semibold border cursor-pointer transition-colors ${
                                  template.isActive
                                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                    : "bg-gray-100 dark:bg-[#1A1613] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#332A23]"
                                }`}
                              >
                                {template.isActive ? "Active" : "Paused"}
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => onDeleteHabitTemplate(template.id)}
                                className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Delete habit"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
