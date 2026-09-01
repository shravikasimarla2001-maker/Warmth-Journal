import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  Sparkles,
  Calendar,
  Settings,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Check,
  CalendarPlus,
} from "lucide-react";
import {
  DailyChecklist,
  HabitCheckItem,
  HabitTemplate,
  PriorityTask,
} from "../types";
import { getHabitIconComponent } from "./HabitManagerModal";

interface DailyChecklistDockProps {
  currentDate: string; // "YYYY-MM-DD"
  checklist: DailyChecklist | null;
  habitTemplates: HabitTemplate[];
  tomorrowChecklist: DailyChecklist | null;
  onUpdateChecklist: (checklist: DailyChecklist) => Promise<void>;
  onUpdateTomorrowChecklist: (checklist: DailyChecklist) => Promise<void>;
  onOpenHabitManager: () => void;
  streakDays?: number;
}

export const DailyChecklistDock: React.FC<DailyChecklistDockProps> = ({
  currentDate,
  checklist,
  habitTemplates,
  tomorrowChecklist,
  onUpdateChecklist,
  onUpdateTomorrowChecklist,
  onOpenHabitManager,
  streakDays = 0,
}) => {
  const [newTodayTaskText, setNewTodayTaskText] = useState("");
  const [newTomorrowTaskText, setNewTomorrowTaskText] = useState("");
  const [isTomorrowDockOpen, setIsTomorrowDockOpen] = useState(false);
  const [isAddingTodayTask, setIsAddingTodayTask] = useState(false);

  // Compute date strings
  const todayDateStr = new Date().toISOString().split("T")[0];
  const isToday = currentDate === todayDateStr;

  const tomorrowDateObj = new Date(currentDate + "T12:00:00Z");
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const tomorrowDateStr = tomorrowDateObj.toISOString().split("T")[0];

  // Active templates
  const activeTemplates = habitTemplates.filter((t) => t.isActive);

  // Build merged habits list for today's checklist
  const habitsList: HabitCheckItem[] = activeTemplates.map((template) => {
    const existing = checklist?.habits?.find((h) => h.templateId === template.id);
    return {
      templateId: template.id,
      title: template.title,
      category: template.category,
      icon: template.icon,
      completed: existing ? existing.completed : false,
      completedAt: existing?.completedAt,
    };
  });

  const priorityTasksList: PriorityTask[] = checklist?.priorityTasks || [];
  const tomorrowTasksList: PriorityTask[] = tomorrowChecklist?.priorityTasks || [];

  const totalItems = habitsList.length + priorityTasksList.length;
  const completedHabitsCount = habitsList.filter((h) => h.completed).length;
  const completedTasksCount = priorityTasksList.filter((t) => t.completed).length;
  const totalCompleted = completedHabitsCount + completedTasksCount;
  const completionPercentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  // Toggle Habit Completion
  const handleToggleHabit = async (templateId: string) => {
    const updatedHabits = habitsList.map((h) => {
      if (h.templateId === templateId) {
        return {
          ...h,
          completed: !h.completed,
          completedAt: !h.completed ? new Date().toISOString() : undefined,
        };
      }
      return h;
    });

    const newCompletedCount =
      updatedHabits.filter((h) => h.completed).length + completedTasksCount;

    await onUpdateChecklist({
      date: currentDate,
      userId: checklist?.userId || "active_user",
      habits: updatedHabits,
      priorityTasks: priorityTasksList,
      totalCompleted: newCompletedCount,
      totalItems,
      updatedAt: new Date().toISOString(),
    });
  };

  // Toggle Priority Task Completion
  const handleToggleTask = async (taskId: string) => {
    const updatedTasks = priorityTasksList.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          completed: !t.completed,
          completedAt: !t.completed ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });

    const newCompletedCount =
      completedHabitsCount + updatedTasks.filter((t) => t.completed).length;

    await onUpdateChecklist({
      date: currentDate,
      userId: checklist?.userId || "active_user",
      habits: habitsList,
      priorityTasks: updatedTasks,
      totalCompleted: newCompletedCount,
      totalItems,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add Task to Today's Checklist
  const handleAddTodayTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodayTaskText.trim()) return;

    const newTask: PriorityTask = {
      id: "task_" + Date.now(),
      text: newTodayTaskText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = [...priorityTasksList, newTask];
    setNewTodayTaskText("");
    setIsAddingTodayTask(false);

    await onUpdateChecklist({
      date: currentDate,
      userId: checklist?.userId || "active_user",
      habits: habitsList,
      priorityTasks: updatedTasks,
      totalCompleted,
      totalItems: habitsList.length + updatedTasks.length,
      updatedAt: new Date().toISOString(),
    });
  };

  // Delete Today's Task
  const handleDeleteTodayTask = async (taskId: string) => {
    const updatedTasks = priorityTasksList.filter((t) => t.id !== taskId);
    const newCompletedCount =
      completedHabitsCount + updatedTasks.filter((t) => t.completed).length;

    await onUpdateChecklist({
      date: currentDate,
      userId: checklist?.userId || "active_user",
      habits: habitsList,
      priorityTasks: updatedTasks,
      totalCompleted: newCompletedCount,
      totalItems: habitsList.length + updatedTasks.length,
      updatedAt: new Date().toISOString(),
    });
  };

  // Move Unfinished Task to Tomorrow (1-Click Rollover - US-4)
  const handleMoveTaskToTomorrow = async (task: PriorityTask) => {
    // 1. Remove from today's list
    const updatedTodayTasks = priorityTasksList.filter((t) => t.id !== task.id);
    await onUpdateChecklist({
      date: currentDate,
      userId: checklist?.userId || "active_user",
      habits: habitsList,
      priorityTasks: updatedTodayTasks,
      totalCompleted,
      totalItems: habitsList.length + updatedTodayTasks.length,
      updatedAt: new Date().toISOString(),
    });

    // 2. Add to tomorrow's list with flag `isPlannedFromYesterday: true`
    const rolledOverTask: PriorityTask = {
      id: "task_" + Date.now(),
      text: task.text,
      completed: false,
      isPlannedFromYesterday: true,
      createdAt: new Date().toISOString(),
    };

    const updatedTomorrowTasks = [
      ...(tomorrowChecklist?.priorityTasks || []),
      rolledOverTask,
    ];

    await onUpdateTomorrowChecklist({
      date: tomorrowDateStr,
      userId: tomorrowChecklist?.userId || "active_user",
      habits: tomorrowChecklist?.habits || [],
      priorityTasks: updatedTomorrowTasks,
      totalCompleted: tomorrowChecklist?.totalCompleted || 0,
      totalItems: (tomorrowChecklist?.habits?.length || 0) + updatedTomorrowTasks.length,
      updatedAt: new Date().toISOString(),
    });

    setIsTomorrowDockOpen(true);
  };

  // Add Task to Tomorrow's Focus (US-3)
  const handleAddTomorrowTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTomorrowTaskText.trim()) return;

    const newTask: PriorityTask = {
      id: "task_" + Date.now(),
      text: newTomorrowTaskText.trim(),
      completed: false,
      isPlannedFromYesterday: true,
      createdAt: new Date().toISOString(),
    };

    const updatedTomorrowTasks = [...tomorrowTasksList, newTask];
    setNewTomorrowTaskText("");

    await onUpdateTomorrowChecklist({
      date: tomorrowDateStr,
      userId: tomorrowChecklist?.userId || "active_user",
      habits: tomorrowChecklist?.habits || [],
      priorityTasks: updatedTomorrowTasks,
      totalCompleted: tomorrowChecklist?.totalCompleted || 0,
      totalItems: (tomorrowChecklist?.habits?.length || 0) + updatedTomorrowTasks.length,
      updatedAt: new Date().toISOString(),
    });
  };

  // Delete Tomorrow's Task
  const handleDeleteTomorrowTask = async (taskId: string) => {
    const updatedTomorrowTasks = tomorrowTasksList.filter((t) => t.id !== taskId);
    await onUpdateTomorrowChecklist({
      date: tomorrowDateStr,
      userId: tomorrowChecklist?.userId || "active_user",
      habits: tomorrowChecklist?.habits || [],
      priorityTasks: updatedTomorrowTasks,
      totalCompleted: tomorrowChecklist?.totalCompleted || 0,
      totalItems: (tomorrowChecklist?.habits?.length || 0) + updatedTomorrowTasks.length,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-[#FAF7F2] border border-[#E8DFC8] rounded-2xl p-5 shadow-xs space-y-5">
      {/* Header & Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#F5EBE1] border border-[#E8DFC8] flex items-center justify-center text-[#BA4A00]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-[#2C241E] flex items-center space-x-1.5">
                <span>Daily Rituals & Focus</span>
                {isToday && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                    Today
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[#7E6E5F]">
                {totalCompleted} of {totalItems} items completed · {completionPercentage}%
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {streakDays > 0 && (
              <span className="flex items-center space-x-1 text-[11px] font-bold text-[#BA4A00] bg-[#F5EBE1] px-2 py-1 rounded-lg border border-[#E8DFC8]">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{streakDays}d streak</span>
              </span>
            )}

            <button
              onClick={onOpenHabitManager}
              className="p-1.5 rounded-lg text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#F5EBE1] border border-transparent hover:border-[#E8DFC8] transition-all"
              title="Configure global habits"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-[#E8DFC8]/60 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#E67E22] to-[#BA4A00] h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Section 1: Recurring Mindful Habits */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-[#935116] uppercase">
            Mindful Habits ({habitsList.filter((h) => h.completed).length}/{habitsList.length})
          </span>
          <button
            onClick={onOpenHabitManager}
            className="text-[10px] text-[#7E6E5F] hover:text-[#BA4A00] hover:underline"
          >
            Customize
          </button>
        </div>

        {habitsList.length === 0 ? (
          <div className="text-center py-3 bg-white/60 rounded-xl border border-dashed border-[#E8DFC8]">
            <p className="text-xs text-[#7E6E5F]">No habits enabled.</p>
            <button
              onClick={onOpenHabitManager}
              className="text-xs text-[#BA4A00] font-semibold mt-1 hover:underline"
            >
              + Configure daily rituals
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {habitsList.map((habit) => {
              const IconComp = getHabitIconComponent(habit.icon);
              return (
                <div
                  key={habit.templateId}
                  onClick={() => handleToggleHabit(habit.templateId)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                    habit.completed
                      ? "bg-[#F5EBE1]/60 border-[#D5C9B3] text-[#7E6E5F]"
                      : "bg-white border-[#E8DFC8] text-[#2C241E] hover:border-[#BA4A00]/40 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 flex-1 min-w-0 mr-2">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                        habit.completed
                          ? "bg-[#BA4A00] text-white"
                          : "border border-[#C5BAA5] bg-[#FAF7F2]"
                      }`}
                    >
                      {habit.completed && <Check className="w-3.5 h-3.5" />}
                    </div>

                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                        habit.category === "mind"
                          ? "bg-indigo-50 text-indigo-700"
                          : habit.category === "body"
                          ? "bg-emerald-50 text-emerald-700"
                          : habit.category === "focus"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-purple-50 text-purple-700"
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </div>

                    <span
                      className={`text-xs font-medium truncate ${
                        habit.completed ? "line-through opacity-75" : ""
                      }`}
                    >
                      {habit.title}
                    </span>
                  </div>

                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FAF7F2] text-[#7E6E5F] shrink-0 font-medium">
                    {habit.category}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Today's Priority Focus Tasks (3–4 Focus Tasks) */}
      <div className="space-y-2 pt-2 border-t border-[#E8DFC8]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold tracking-wider text-[#935116] uppercase">
              Today's Key Focus ({priorityTasksList.filter((t) => t.completed).length}/{priorityTasksList.length})
            </span>
            <span className="text-[10px] text-[#7E6E5F]" title="Target 3-4 main tasks for mindful focus">
              (max 4)
            </span>
          </div>

          {!isAddingTodayTask && priorityTasksList.length < 4 && (
            <button
              onClick={() => setIsAddingTodayTask(true)}
              className="flex items-center space-x-1 text-[11px] font-semibold text-[#BA4A00] hover:underline"
            >
              <Plus className="w-3 h-3" />
              <span>Add Focus</span>
            </button>
          )}
        </div>

        {/* Add Task Input */}
        {isAddingTodayTask && (
          <form onSubmit={handleAddTodayTask} className="flex gap-1.5 pt-1">
            <input
              type="text"
              value={newTodayTaskText}
              onChange={(e) => setNewTodayTaskText(e.target.value)}
              placeholder="e.g. Finish report or call doctor"
              className="flex-1 px-3 py-1.5 rounded-lg border border-[#E8DFC8] text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#BA4A00]"
              autoFocus
              maxLength={80}
            />
            <button
              type="submit"
              disabled={!newTodayTaskText.trim()}
              className="px-3 py-1.5 bg-[#BA4A00] text-white rounded-lg text-xs font-semibold hover:bg-[#A04000] disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingTodayTask(false)}
              className="px-2 py-1.5 text-xs text-[#7E6E5F] hover:bg-[#F5EBE1] rounded-lg"
            >
              Cancel
            </button>
          </form>
        )}

        {priorityTasksList.length === 0 && !isAddingTodayTask ? (
          <div
            onClick={() => setIsAddingTodayTask(true)}
            className="text-center py-3 bg-white/60 rounded-xl border border-dashed border-[#E8DFC8] cursor-pointer hover:bg-white transition-colors"
          >
            <p className="text-xs text-[#7E6E5F]">No priority tasks set for today.</p>
            <span className="text-xs text-[#BA4A00] font-semibold mt-0.5 inline-block">
              + Set 1–3 focus tasks
            </span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {priorityTasksList.map((task) => (
              <div
                key={task.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  task.completed
                    ? "bg-[#F5EBE1]/60 border-[#D5C9B3] text-[#7E6E5F]"
                    : "bg-white border-[#E8DFC8] text-[#2C241E] shadow-2xs"
                }`}
              >
                <div
                  onClick={() => handleToggleTask(task.id)}
                  className="flex items-center space-x-2.5 flex-1 min-w-0 mr-2 cursor-pointer select-none"
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                      task.completed
                        ? "bg-[#BA4A00] text-white"
                        : "border border-[#C5BAA5] bg-[#FAF7F2]"
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-medium truncate ${
                        task.completed ? "line-through opacity-75" : ""
                      }`}
                    >
                      {task.text}
                    </p>
                    {task.isPlannedFromYesterday && (
                      <span className="text-[9px] text-[#935116] font-semibold flex items-center space-x-0.5 mt-0.5">
                        <Sparkles className="w-2.5 h-2.5 inline" />
                        <span>Planned yesterday</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {/* 1-Click Rollover / Move to Tomorrow (US-4) */}
                  {!task.completed && (
                    <button
                      type="button"
                      onClick={() => handleMoveTaskToTomorrow(task)}
                      className="p-1 rounded text-[#7E6E5F] hover:text-[#BA4A00] hover:bg-[#F5EBE1] transition-colors"
                      title="Move task to tomorrow"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteTodayTask(task.id)}
                    className="p-1 rounded text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: "Plan Tomorrow's Focus" Evening Dock (US-3) */}
      <div className="pt-2 border-t border-[#E8DFC8]">
        <div
          onClick={() => setIsTomorrowDockOpen(!isTomorrowDockOpen)}
          className="flex items-center justify-between p-2.5 rounded-xl bg-[#F5EBE1] border border-[#E8DFC8] cursor-pointer hover:bg-[#EBDDCF] transition-colors select-none"
        >
          <div className="flex items-center space-x-2">
            <CalendarPlus className="w-4 h-4 text-[#BA4A00]" />
            <div>
              <span className="text-xs font-semibold text-[#2C241E]">
                Plan Tomorrow's Focus ({tomorrowTasksList.length})
              </span>
              <p className="text-[10px] text-[#7E6E5F]">
                Clear your mind before sleep by setting 2-4 tomorrow targets
              </p>
            </div>
          </div>

          <div className="text-[#7E6E5F]">
            {isTomorrowDockOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Collapsible Tomorrow Input & List */}
        {isTomorrowDockOpen && (
          <div className="mt-2.5 p-3 rounded-xl bg-white border border-[#E8DFC8] space-y-3 animate-fade-in shadow-xs">
            <form onSubmit={handleAddTomorrowTask} className="flex gap-1.5">
              <input
                type="text"
                value={newTomorrowTaskText}
                onChange={(e) => setNewTomorrowTaskText(e.target.value)}
                placeholder="What is 1 essential target for tomorrow?"
                className="flex-1 px-3 py-1.5 rounded-lg border border-[#E8DFC8] text-xs bg-[#FAF7F2] focus:outline-none focus:ring-1 focus:ring-[#BA4A00]"
                maxLength={80}
              />
              <button
                type="submit"
                disabled={!newTomorrowTaskText.trim()}
                className="px-3 py-1.5 bg-[#BA4A00] text-white rounded-lg text-xs font-semibold hover:bg-[#A04000] disabled:opacity-50"
              >
                Queue
              </button>
            </form>

            {tomorrowTasksList.length === 0 ? (
              <p className="text-[11px] text-[#7E6E5F] text-center italic py-1">
                No tasks planned for tomorrow yet. Adding them now will greet you ready in the morning.
              </p>
            ) : (
              <div className="space-y-1.5">
                {tomorrowTasksList.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E8DFC8] text-xs text-[#2C241E]"
                  >
                    <span className="truncate mr-2">• {task.text}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTomorrowTask(task.id)}
                      className="text-red-500 hover:text-red-700 p-0.5"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
