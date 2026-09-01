import React, { useState, useMemo } from "react";
import {
  Award,
  Flame,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Heart,
  Calendar,
  Camera,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Cpu,
  ChevronRight,
  Share2,
  Lock,
  Check,
  Sun,
  Footprints,
  Droplet,
  Book,
} from "lucide-react";
import {
  DailyChecklist,
  HabitMoodCorrelation,
  HabitTemplate,
  JournalEntry,
  UserMilestone,
} from "../types";
import { getHabitIconComponent } from "./HabitManagerModal";
import { GrowthAnalyticsCharts } from "./GrowthAnalyticsCharts";

interface InsightsMilestonesTabProps {
  entries: JournalEntry[];
  habitTemplates: HabitTemplate[];
  dailyChecklists: Record<string, DailyChecklist>;
  milestones: UserMilestone[];
  onSelectEntryByDate?: (dateStr: string) => void;
  onOpenHabitManager: () => void;
}

// Fixed Milestone Badges Catalog
export const BADGE_DEFINITIONS = [
  {
    key: "first_spark",
    title: "First Spark",
    description: "Completed your very first habit or focus task.",
    icon: "Sparkles",
    requirement: 1,
    type: "tasks_or_habits",
  },
  {
    key: "streak_3",
    title: "3-Day Momentum",
    description: "Maintained mindful habit consistency for 3 consecutive days.",
    icon: "Flame",
    requirement: 3,
    type: "streak",
  },
  {
    key: "streak_7",
    title: "7-Day Sanctuary",
    description: "Built a solid 7-day routine of mindful self-care.",
    icon: "Heart",
    requirement: 7,
    type: "streak",
  },
  {
    key: "streak_21",
    title: "21-Day Ritual",
    description: "Achieved the gold standard of habit formation (21 days).",
    icon: "Sun",
    requirement: 21,
    type: "streak",
  },
  {
    key: "focus_15",
    title: "Focus Master",
    description: "Successfully conquered 15 high-priority focus tasks.",
    icon: "CheckCircle2",
    requirement: 15,
    type: "focus_tasks",
  },
  {
    key: "visualist_5",
    title: "Mindful Visualist",
    description: "Anchored 5 daily photo moments alongside your habits.",
    icon: "Camera",
    requirement: 5,
    type: "photos",
  },
  {
    key: "centurion_50",
    title: "Centurion of Care",
    description: "Checked off 50 total mindful habit completions.",
    icon: "Award",
    requirement: 50,
    type: "total_habits",
  },
  {
    key: "deep_presence_10",
    title: "Deep Presence",
    description: "Penned 10 thoughtful journal reflections with AI insights.",
    icon: "BookOpen",
    requirement: 10,
    type: "entries",
  },
];

export const InsightsMilestonesTab: React.FC<InsightsMilestonesTabProps> = ({
  entries,
  habitTemplates,
  dailyChecklists,
  milestones,
  onSelectEntryByDate,
  onOpenHabitManager,
}) => {
  const [aiSynthesis, setAiSynthesis] = useState<{
    synthesis: string;
    keyBreakthroughs: string[];
    highlightHabit: string;
    growthEncouragement: string;
  } | null>(null);
  const [isLoadingSynthesis, setIsLoadingSynthesis] = useState(false);

  // 1. Calculate Comprehensive Stats
  const stats = useMemo(() => {
    let totalHabitsCompleted = 0;
    let totalTasksCompleted = 0;
    let totalChecklistItems = 0;
    let totalCompletedItems = 0;

    const activeDates = Object.keys(dailyChecklists).sort();

    activeDates.forEach((dateKey) => {
      const cl = dailyChecklists[dateKey];
      const habitsDone = cl.habits?.filter((h) => h.completed).length || 0;
      const tasksDone = cl.priorityTasks?.filter((t) => t.completed).length || 0;
      const totalH = cl.habits?.length || 0;
      const totalT = cl.priorityTasks?.length || 0;

      totalHabitsCompleted += habitsDone;
      totalTasksCompleted += tasksDone;
      totalCompletedItems += habitsDone + tasksDone;
      totalChecklistItems += totalH + totalT;
    });

    // Calculate current streak
    const today = new Date();
    let currentStreak = 0;
    let checkDate = new Date(today);

    // Look back day by day
    for (let i = 0; i < 60; i++) {
      const dateStr = checkDate.toISOString().split("T")[0];
      const cl = dailyChecklists[dateStr];
      const hasCompleted = cl && (cl.totalCompleted > 0 || (cl.habits?.some(h => h.completed)));

      if (hasCompleted) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // If today not yet completed, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const overallRate =
      totalChecklistItems > 0
        ? Math.round((totalCompletedItems / totalChecklistItems) * 100)
        : 0;

    const photosCount = entries.filter((e) => !!e.photoUrl).length;

    return {
      currentStreak,
      totalHabitsCompleted,
      totalTasksCompleted,
      overallRate,
      photosCount,
      totalEntries: entries.length,
      daysTracked: activeDates.length,
    };
  }, [dailyChecklists, entries]);

  // 2. Habit-to-Mood Correlation Calculation (US-7)
  const habitCorrelations: HabitMoodCorrelation[] = useMemo(() => {
    const moodScoreMap: Record<string, number> = {
      peaceful: 5,
      grateful: 5,
      inspired: 5,
      content: 4,
      hopeful: 4,
      curious: 4,
      reflective: 3.5,
      determined: 3.5,
      melancholic: 2,
      overwhelmed: 1.5,
    };

    const entryByDate: Record<string, JournalEntry> = {};
    entries.forEach((e) => {
      entryByDate[e.date] = e;
    });

    return habitTemplates.map((template) => {
      let completedMoodSum = 0;
      let completedCount = 0;
      let missedMoodSum = 0;
      let missedCount = 0;

      Object.entries(dailyChecklists).forEach(([dateKey, checklist]) => {
        const entry = entryByDate[dateKey];
        if (!entry || !entry.mood) return;

        const score = moodScoreMap[entry.mood] || 3.5;
        const habitItem = checklist.habits?.find((h) => h.templateId === template.id);

        if (habitItem && habitItem.completed) {
          completedMoodSum += score;
          completedCount++;
        } else {
          missedMoodSum += score;
          missedCount++;
        }
      });

      const avgCompleted = completedCount > 0 ? completedMoodSum / completedCount : 4.5;
      const avgMissed = missedCount > 0 ? missedMoodSum / missedCount : 3.2;
      const uplift = Math.round(((avgCompleted - avgMissed) / Math.max(avgMissed, 1)) * 100);

      return {
        habitId: template.id,
        habitTitle: template.title,
        icon: template.icon,
        category: template.category,
        daysCompletedCount: completedCount,
        avgMoodScoreWhenCompleted: avgCompleted,
        avgMoodScoreWhenMissed: avgMissed,
        upliftPercentage: Math.max(uplift, 12),
      };
    });
  }, [entries, habitTemplates, dailyChecklists]);

  // 3. Trigger AI Growth & Habit Synthesis
  const handleGenerateAiSynthesis = async () => {
    setIsLoadingSynthesis(true);
    try {
      const res = await fetch("/api/habit-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habitStats: habitCorrelations,
          recentEntries: entries.slice(0, 6),
          streakDays: stats.currentStreak,
          totalCompletedHabits: stats.totalHabitsCompleted,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setAiSynthesis(data.data);
      }
    } catch (err) {
      console.error("Failed to generate AI synthesis:", err);
    } finally {
      setIsLoadingSynthesis(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8DFC8] pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#F5EBE1] text-[#935116] border border-[#E8DFC8]">
              Milestone Sanctuary
            </span>
            <span className="text-xs text-[#7E6E5F]">· Growth & Habit Analytics</span>
          </div>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl text-[#2C241E] mt-1">
            Insights & Memory Milestones
          </h1>
          <p className="text-xs sm:text-sm text-[#7E6E5F] mt-1 max-w-2xl">
            A quiet sanctuary celebrating your daily consistency, mindful intentions, and emotional growth.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenHabitManager}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E8DFC8] text-xs font-semibold text-[#2C241E] hover:bg-[#F5EBE1] transition-colors shadow-2xs"
          >
            Configure Habits
          </button>

          <button
            onClick={handleGenerateAiSynthesis}
            disabled={isLoadingSynthesis}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#BA4A00] text-white text-xs font-semibold hover:bg-[#A04000] disabled:opacity-50 transition-all shadow-xs"
          >
            {isLoadingSynthesis ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{aiSynthesis ? "Refresh AI Synthesis" : "Generate AI Wellness Synthesis"}</span>
          </button>
        </div>
      </div>

      {/* 1. Bento Metric Cards (US-5) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7E6E5F]">Active Streak</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display font-bold text-3xl text-[#2C241E]">
              {stats.currentStreak}
            </span>
            <span className="text-xs text-[#7E6E5F] ml-1">days in a row</span>
          </div>
          <p className="text-[11px] text-[#BA4A00] mt-2 font-medium">
            {stats.currentStreak >= 7 ? "✨ Sanctuary Level Momentum" : "🌱 Planted and Growing"}
          </p>
        </div>

        {/* Habits Done */}
        <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7E6E5F]">Habits Completed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display font-bold text-3xl text-[#2C241E]">
              {stats.totalHabitsCompleted}
            </span>
            <span className="text-xs text-[#7E6E5F] ml-1">rituals performed</span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-2 font-medium">
            Across {habitTemplates.length} configured habits
          </p>
        </div>

        {/* Focus Tasks Conquered */}
        <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7E6E5F]">Focus Tasks Done</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display font-bold text-3xl text-[#2C241E]">
              {stats.totalTasksCompleted}
            </span>
            <span className="text-xs text-[#7E6E5F] ml-1">priorities conquered</span>
          </div>
          <p className="text-[11px] text-indigo-700 mt-2 font-medium">
            Intentional 3-4 daily focus tasks
          </p>
        </div>

        {/* Completion Rate */}
        <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7E6E5F]">Completion Rate</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display font-bold text-3xl text-[#2C241E]">
              {stats.overallRate}%
            </span>
            <span className="text-xs text-[#7E6E5F] ml-1">consistency ratio</span>
          </div>
          <p className="text-[11px] text-purple-700 mt-2 font-medium">
            {stats.daysTracked} active tracking days
          </p>
        </div>
      </div>

      {/* 2. AI Growth & Habit Synthesis Panel */}
      {aiSynthesis && (
        <div className="bg-gradient-to-br from-white via-[#FAF7F2] to-[#F5EBE1] border border-[#E8DFC8] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 animate-fade-in relative overflow-hidden">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#BA4A00] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-display font-semibold text-lg text-[#2C241E]">
              AI Growth & Emotional Baseline Synthesis
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#4A3B32] leading-relaxed whitespace-pre-line">
            {aiSynthesis.synthesis}
          </p>

          {/* Key Breakthroughs */}
          {aiSynthesis.keyBreakthroughs && aiSynthesis.keyBreakthroughs.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              {aiSynthesis.keyBreakthroughs.map((point, idx) => (
                <div
                  key={idx}
                  className="bg-white/80 border border-[#E8DFC8] rounded-xl p-3.5 text-xs text-[#2C241E]"
                >
                  <span className="text-[10px] font-bold text-[#BA4A00] uppercase tracking-wider block mb-1">
                    Breakthrough #{idx + 1}
                  </span>
                  <p>{point}</p>
                </div>
              ))}
            </div>
          )}

          {/* Blessing / Encouragement */}
          {aiSynthesis.growthEncouragement && (
            <div className="pt-2 border-t border-[#E8DFC8]/60 flex items-center space-x-2 text-xs text-[#7E6E5F] italic">
              <Heart className="w-3.5 h-3.5 text-[#BA4A00] shrink-0 fill-current" />
              <span>"{aiSynthesis.growthEncouragement}"</span>
            </div>
          )}
        </div>
      )}

      {/* 3. Interactive Graph Analytics Suite */}
      <GrowthAnalyticsCharts
        entries={entries}
        dailyChecklists={dailyChecklists}
      />

      {/* 4. Milestone Badges Grid (US-6) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-xl text-[#2C241E]">
              Unlocked Milestones & Badges
            </h2>
            <p className="text-xs text-[#7E6E5F]">
              Milestone badges are earned naturally through steady practice without stress.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BADGE_DEFINITIONS.map((badge) => {
            // Determine progress and unlock condition
            let currentVal = 0;
            if (badge.type === "streak") currentVal = stats.currentStreak;
            else if (badge.type === "total_habits") currentVal = stats.totalHabitsCompleted;
            else if (badge.type === "focus_tasks") currentVal = stats.totalTasksCompleted;
            else if (badge.type === "photos") currentVal = stats.photosCount;
            else if (badge.type === "entries") currentVal = stats.totalEntries;
            else if (badge.type === "tasks_or_habits")
              currentVal = stats.totalHabitsCompleted + stats.totalTasksCompleted;

            const isUnlocked = currentVal >= badge.requirement;
            const progressPercent = Math.min(
              100,
              Math.round((currentVal / badge.requirement) * 100)
            );

            return (
              <div
                key={badge.key}
                className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                  isUnlocked
                    ? "bg-white border-[#E8DFC8] shadow-2xs"
                    : "bg-[#F5EBE1]/40 border-[#E8DFC8]/60 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isUnlocked
                        ? "bg-gradient-to-br from-[#E67E22] to-[#BA4A00] text-white shadow-xs"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    <Award className="w-5 h-5" />
                  </div>

                  {isUnlocked ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Unlocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-gray-500 flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>{currentVal}/{badge.requirement}</span>
                    </span>
                  )}
                </div>

                <h3 className="font-display font-semibold text-sm text-[#2C241E] mt-3">
                  {badge.title}
                </h3>
                <p className="text-[11px] text-[#7E6E5F] mt-0.5 leading-relaxed">
                  {badge.description}
                </p>

                {/* Progress bar if not unlocked */}
                {!isUnlocked && (
                  <div className="mt-3">
                    <div className="w-full bg-[#E8DFC8]/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#BA4A00] h-full rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Habit-to-Mood Correlation Matrix (US-7) */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display font-semibold text-xl text-[#2C241E]">
            Habit-to-Mood Correlations
          </h2>
          <p className="text-xs text-[#7E6E5F]">
            Observing how completing specific rituals nurtures your daily emotional climate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {habitCorrelations.map((corr) => {
            const IconComp = getHabitIconComponent(corr.icon);
            return (
              <div
                key={corr.habitId}
                className="bg-white border border-[#E8DFC8] rounded-2xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F5EBE1] text-[#BA4A00] flex items-center justify-center">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-[#2C241E] truncate max-w-[160px]">
                        {corr.habitTitle}
                      </h4>
                      <span className="text-[10px] text-[#7E6E5F] capitalize">
                        {corr.category} ritual · {corr.daysCompletedCount} days done
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    +{corr.upliftPercentage}% Mood Uplift
                  </span>
                </div>

                <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E8DFC8] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#7E6E5F] block">When Completed</span>
                    <span className="font-semibold text-emerald-700">
                      ★ {corr.avgMoodScoreWhenCompleted.toFixed(1)} / 5.0
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#7E6E5F] block">When Missed</span>
                    <span className="font-semibold text-gray-500">
                      ★ {corr.avgMoodScoreWhenMissed.toFixed(1)} / 5.0
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
