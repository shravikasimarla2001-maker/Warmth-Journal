import React, { useState, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  PieChart as PieIcon,
  Sparkles,
  Info,
  CheckCircle2,
  Target,
  Layers,
} from "lucide-react";
import { DailyChecklist, JournalEntry } from "../types";

interface GrowthAnalyticsChartsProps {
  entries: JournalEntry[];
  dailyChecklists: Record<string, DailyChecklist>;
}

export const MOOD_META: Record<
  string,
  { label: string; emoji: string; score: number; color: string; bg: string }
> = {
  peaceful: { label: "Peaceful", emoji: "🌿", score: 9, color: "#2E7D32", bg: "#E8F5E9" },
  grateful: { label: "Grateful", emoji: "🙏", score: 8.5, color: "#D97706", bg: "#FEF3C7" },
  inspired: { label: "Inspired", emoji: "✨", score: 9.5, color: "#EA580C", bg: "#FFEDD5" },
  content: { label: "Content", emoji: "☕", score: 7.5, color: "#854D0E", bg: "#FEF9C3" },
  hopeful: { label: "Hopeful", emoji: "🌅", score: 8, color: "#D97706", bg: "#FEF3C7" },
  determined: { label: "Determined", emoji: "🔥", score: 8, color: "#B91C1C", bg: "#FEE2E2" },
  curious: { label: "Curious", emoji: "🔍", score: 7, color: "#2563EB", bg: "#DBEAFE" },
  melancholic: { label: "Melancholic", emoji: "🌧️", score: 4, color: "#64748B", bg: "#F1F5F9" },
  overwhelmed: { label: "Overwhelmed", emoji: "🌊", score: 3.5, color: "#0284C7", bg: "#E0F2FE" },
};

const DEFAULT_MOOD_META = {
  label: "Reflective",
  emoji: "🕯️",
  score: 6.5,
  color: "#935116",
  bg: "#FAF7F2",
};

export const GrowthAnalyticsCharts: React.FC<GrowthAnalyticsChartsProps> = ({
  entries,
  dailyChecklists,
}) => {
  // Timeframe selector: 7, 14, 30 days
  const [timeframeDays, setTimeframeDays] = useState<7 | 14 | 30>(14);

  // Generate continuous date array for the selected timeframe
  const timelineData = useMemo(() => {
    const dataPoints: Array<{
      dateKey: string;
      displayDate: string;
      dayOfWeek: string;
      moodScore: number | null;
      moodName: string | null;
      moodEmoji: string;
      entryTitle: string | null;
      habitsCompleted: number;
      totalHabits: number;
      tasksCompleted: number;
      wordCount: number;
    }> = [];

    const now = new Date();
    const entryMap: Record<string, JournalEntry> = {};
    entries.forEach((e) => {
      entryMap[e.date] = e;
    });

    for (let i = timeframeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" });

      const entry = entryMap[dateKey];
      const checklist = dailyChecklists[dateKey];

      const habitsDone = checklist?.habits?.filter((h) => h.completed).length || 0;
      const totalHabits = checklist?.habits?.length || 0;
      const tasksDone = checklist?.priorityTasks?.filter((t) => t.completed).length || 0;

      let moodScore: number | null = null;
      let moodName: string | null = null;
      let moodEmoji = "";

      if (entry && entry.mood) {
        const meta = MOOD_META[entry.mood.toLowerCase()] || DEFAULT_MOOD_META;
        moodScore = meta.score;
        moodName = meta.label;
        moodEmoji = meta.emoji;
      }

      dataPoints.push({
        dateKey,
        displayDate,
        dayOfWeek,
        moodScore,
        moodName,
        moodEmoji,
        entryTitle: entry?.title || null,
        habitsCompleted: habitsDone,
        totalHabits: totalHabits > 0 ? totalHabits : 4,
        tasksCompleted: tasksDone,
        wordCount: entry?.wordCount || (entry?.initialThought ? entry.initialThought.split(/\s+/).length : 0),
      });
    }

    return dataPoints;
  }, [entries, dailyChecklists, timeframeDays]);

  // Emotional Spectrum Breakdown for Donut Chart
  const moodDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    const relevantDateSet = new Set(timelineData.map((d) => d.dateKey));

    entries.forEach((entry) => {
      if (relevantDateSet.has(entry.date) && entry.mood) {
        const moodKey = entry.mood.toLowerCase();
        counts[moodKey] = (counts[moodKey] || 0) + 1;
      }
    });

    const totalLogged = Object.values(counts).reduce((a, b) => a + b, 0);

    const items = Object.entries(counts).map(([moodKey, count]) => {
      const meta = MOOD_META[moodKey] || DEFAULT_MOOD_META;
      const percentage = totalLogged > 0 ? Math.round((count / totalLogged) * 100) : 0;
      return {
        key: moodKey,
        name: meta.label,
        emoji: meta.emoji,
        count,
        percentage,
        color: meta.color,
      };
    });

    return {
      items: items.sort((a, b) => b.count - a.count),
      totalLogged,
      dominantMood: items.length > 0 ? items.sort((a, b) => b.count - a.count)[0] : null,
    };
  }, [entries, timelineData]);

  // Grouped vs Stacked bar mode
  const [barMode, setBarMode] = useState<"grouped" | "stacked">("grouped");

  // Custom Tooltip for Habits vs Mood
  const CustomHabitMoodTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalActions = (data.habitsCompleted || 0) + (data.tasksCompleted || 0);
      return (
        <div className="bg-[#FAF7F2] border border-[#E8DFC8] rounded-2xl p-3.5 shadow-xl text-xs space-y-2 z-50 min-w-[190px]">
          <div className="font-semibold text-[#2C241E] flex items-center justify-between gap-4 border-b border-[#E8DFC8]/70 pb-1.5">
            <span>{data.displayDate} ({data.dayOfWeek})</span>
            {data.moodName && (
              <span className="text-[11px] font-medium text-[#935116] flex items-center space-x-1">
                <span>{data.moodEmoji}</span>
                <span>{data.moodName}</span>
              </span>
            )}
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-[#355E52]">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-xs bg-[#52796F]" />
                <span>Daily Habits:</span>
              </span>
              <span className="font-bold">{data.habitsCompleted}</span>
            </div>
            <div className="flex items-center justify-between text-[#9C4210]">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-xs bg-[#C05621]" />
                <span>Key Focus Done:</span>
              </span>
              <span className="font-bold">{data.tasksCompleted}</span>
            </div>
            <div className="flex items-center justify-between text-[#7E6E5F] pt-1 border-t border-[#E8DFC8]/50">
              <span>Total Intentional Actions:</span>
              <span className="font-bold text-[#2C241E]">{totalActions}</span>
            </div>
            {data.moodScore !== null && (
              <div className="flex items-center justify-between text-[#B45309] pt-1 border-t border-[#E8DFC8]/50">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-1 rounded-full bg-[#D97706]" />
                  <span>Mood Equilibrium:</span>
                </span>
                <span className="font-bold">{data.moodScore} / 10</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Timeframe Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E8DFC8] shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#BA4A00]" />
            <h3 className="font-display font-semibold text-base text-[#2C241E]">
              Habit & Emotional Analytics
            </h3>
          </div>
          <p className="text-xs text-[#7E6E5F] mt-0.5">
            Clear visual relationship between daily routines and your emotional state.
          </p>
        </div>

        {/* Range Pill Buttons */}
        <div className="flex items-center space-x-1.5 bg-[#FAF7F2] p-1 rounded-xl border border-[#E8DFC8] self-start sm:self-auto">
          {[
            { label: "7 Days", val: 7 },
            { label: "14 Days", val: 14 },
            { label: "30 Days", val: 30 },
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => setTimeframeDays(item.val as 7 | 14 | 30)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeframeDays === item.val
                  ? "bg-[#BA4A00] text-white shadow-2xs"
                  : "text-[#7E6E5F] hover:text-[#2C241E]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of the 2 Focused Charts: Habit vs Mood + Emotional Spectrum */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 1: Habits & Focus Completion vs Emotional Equilibrium (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-[#E8DFC8] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#52796F] flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-sm sm:text-base text-[#2C241E] flex items-center space-x-1.5">
                    <span>Habits, Focus & Emotional Equilibrium</span>
                  </h4>
                  <span className="text-[11px] text-[#7E6E5F]">
                    Correlating daily ritual discipline and key priorities with your emotional state
                  </span>
                </div>
              </div>

              {/* Legend & Layout Toggle Controls */}
              <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
                <div className="flex items-center space-x-2.5 text-xs bg-[#FAF7F2] px-3 py-1 rounded-full border border-[#E8DFC8]">
                  <span className="flex items-center space-x-1 text-[#355E52] font-medium" title="Mindful habits completed">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#52796F] inline-block" />
                    <span>Habits</span>
                  </span>
                  <span className="flex items-center space-x-1 text-[#9C4210] font-medium" title="Key focus priority tasks completed">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#C05621] inline-block" />
                    <span>Focus Done</span>
                  </span>
                  <span className="flex items-center space-x-1 text-[#B45309] font-medium" title="Mood Equilibrium Score (0-10)">
                    <span className="w-2.5 h-1 bg-[#D97706] rounded-full inline-block" />
                    <span>Mood</span>
                  </span>
                </div>

                {/* Grouped vs Stacked pill */}
                <div className="flex items-center space-x-0.5 bg-[#FAF7F2] p-0.5 rounded-xl border border-[#E8DFC8]">
                  <button
                    type="button"
                    onClick={() => setBarMode("grouped")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      barMode === "grouped"
                        ? "bg-white text-[#2C241E] shadow-2xs border border-[#E8DFC8]"
                        : "text-[#7E6E5F] hover:text-[#2C241E]"
                    }`}
                    title="View habits and focus side-by-side"
                  >
                    Grouped
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarMode("stacked")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      barMode === "stacked"
                        ? "bg-white text-[#2C241E] shadow-2xs border border-[#E8DFC8]"
                        : "text-[#7E6E5F] hover:text-[#2C241E]"
                    }`}
                    title="View habits and focus stacked as total daily intentions"
                  >
                    Stacked
                  </button>
                </div>
              </div>
            </div>

            {/* Dual Axis Composed Chart Canvas */}
            <div className="h-64 sm:h-72 w-full pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={timelineData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4EDE2" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fill: "#9C8E7E", fontSize: 11 }}
                    axisLine={{ stroke: "#E8DFC8" }}
                    tickLine={false}
                  />
                  {/* Left Axis: Daily Habits & Focus actions count */}
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    domain={[0, "dataMax + 1"]}
                    allowDecimals={false}
                    tick={{ fill: "#52796F", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  {/* Right Axis: Mood score (0 - 10) */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[2, 10]}
                    ticks={[4, 7, 10]}
                    tickFormatter={(val) => `${val}`}
                    tick={{ fill: "#D97706", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomHabitMoodTooltip />} />

                  {/* Dual Series Bars: Sage Green for Habits, Terracotta for Focus */}
                  {barMode === "grouped" ? (
                    <>
                      <Bar
                        yAxisId="left"
                        dataKey="habitsCompleted"
                        name="Daily Habits"
                        fill="#52796F"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={15}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="tasksCompleted"
                        name="Key Focus Done"
                        fill="#C05621"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={15}
                      />
                    </>
                  ) : (
                    <>
                      <Bar
                        yAxisId="left"
                        dataKey="habitsCompleted"
                        name="Daily Habits"
                        stackId="dailyIntentions"
                        fill="#52796F"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={22}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="tasksCompleted"
                        name="Key Focus Done"
                        stackId="dailyIntentions"
                        fill="#C05621"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                    </>
                  )}

                  {/* Mood Equilibrium Curve (Warm Amber) */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="moodScore"
                    stroke="#D97706"
                    strokeWidth={2.5}
                    connectNulls={true}
                    dot={{ r: 4, fill: "#D97706", stroke: "#FFFFFF", strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: "#D97706", stroke: "#FFFFFF", strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFC8] flex items-center justify-between text-xs text-[#7E6E5F]">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-[#BA4A00] shrink-0" />
              <span>
                <strong>Insight:</strong> Days combining completed habits with 1–3 focus priorities show higher sustained mood scores and emotional clarity.
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#2C241E] shrink-0 hidden sm:inline">
              Last {timeframeDays} Days
            </span>
          </div>
        </div>

        {/* CHART 2: Emotional Spectrum (Donut Chart, 1 Col) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8DFC8] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <PieIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-sm sm:text-base text-[#2C241E]">
                  Emotional Spectrum
                </h4>
                <span className="text-[11px] text-[#7E6E5F]">
                  Overall balance of logged emotions
                </span>
              </div>
            </div>

            {moodDistributionData.totalLogged === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-center p-4 text-[#8C7B6C] space-y-2">
                <Sparkles className="w-8 h-8 text-[#D5C4A1]" />
                <p className="text-xs font-semibold text-[#2C241E]">No moods logged in this window</p>
                <p className="text-[11px] max-w-xs">
                  Write reflections in Today's desk to populate your emotional spectrum pie.
                </p>
              </div>
            ) : (
              <div>
                {/* Donut Canvas */}
                <div className="h-48 w-full relative flex items-center justify-center mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={moodDistributionData.items}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                        dataKey="count"
                      >
                        {moodDistributionData.items.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [
                          `${val} days (${item.payload.percentage}%)`,
                          item.payload.name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered dominant mood label */}
                  {moodDistributionData.dominantMood && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-xl">
                        {moodDistributionData.dominantMood.emoji}
                      </span>
                      <span className="text-[11px] font-bold text-[#2C241E] leading-tight">
                        {moodDistributionData.dominantMood.percentage}%
                      </span>
                      <span className="text-[9px] text-[#7E6E5F] capitalize">
                        {moodDistributionData.dominantMood.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mood legend list */}
                <div className="space-y-1.5 mt-3 max-h-36 overflow-y-auto pr-1">
                  {moodDistributionData.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-[#FAF7F2] transition-colors"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[11px]">{item.emoji}</span>
                        <span className="text-xs font-medium text-[#2C241E] capitalize">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-[#7E6E5F]">{item.count} days</span>
                        <span className="font-bold text-[#2C241E] w-8 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0E8D9] text-[11px] text-[#7E6E5F] text-center">
            {moodDistributionData.totalLogged} total entries analyzed
          </div>
        </div>
      </div>
    </div>
  );
};
