import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Sparkles,
  Sun,
  Droplet,
  Book,
  Heart,
  Footprints,
  Coffee,
  Moon,
  Dumbbell,
  Compass,
  Music,
  Apple,
  RotateCcw,
} from "lucide-react";
import { HabitCategory, HabitTemplate } from "../types";
import { DEFAULT_HABIT_TEMPLATES } from "../lib/firebase";

interface HabitManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: HabitTemplate[];
  onSaveTemplate: (template: Partial<HabitTemplate> & { title: string }) => Promise<void>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  onResetToDefaults: () => Promise<void>;
}

const AVAILABLE_ICONS = [
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

export const getHabitIconComponent = (iconName: string) => {
  const found = AVAILABLE_ICONS.find((i) => i.name === iconName);
  return found ? found.icon : Sparkles;
};

export const HabitManagerModal: React.FC<HabitManagerModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onResetToDefaults,
}) => {
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<HabitCategory>("mind");
  const [newIcon, setNewIcon] = useState("Sun");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  if (!isOpen) return null;

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await onSaveTemplate({
        title: newTitle.trim(),
        category: newCategory,
        icon: newIcon,
        isActive: true,
        order: templates.length,
      });
      setNewTitle("");
      setNewCategory("mind");
      setNewIcon("Sun");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (template: HabitTemplate) => {
    await onSaveTemplate({
      ...template,
      isActive: !template.isActive,
    });
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === templates.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const current = templates[index];
    const target = templates[targetIndex];

    await onSaveTemplate({ ...current, order: targetIndex });
    await onSaveTemplate({ ...target, order: index });
  };

  const handleStartEdit = (t: HabitTemplate) => {
    setEditingId(t.id);
    setEditTitle(t.title);
  };

  const handleSaveEdit = async (t: HabitTemplate) => {
    if (!editTitle.trim()) return;
    await onSaveTemplate({
      ...t,
      title: editTitle.trim(),
    });
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF7F2] border border-[#E8DFC8] rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8DFC8] flex items-center justify-between bg-white/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F5EBE1] border border-[#E8DFC8] flex items-center justify-center text-[#BA4A00]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-[#2C241E]">
                Configure Recurring Habits
              </h2>
              <p className="text-xs text-[#7E6E5F]">
                These mindful rituals auto-populate into your daily checklist.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#F5EBE1] transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add Habit Form */}
          <form
            onSubmit={handleCreateHabit}
            className="bg-white border border-[#E8DFC8] rounded-xl p-4 space-y-3.5 shadow-xs"
          >
            <span className="text-xs font-bold tracking-wider text-[#935116] uppercase">
              Add New Routine Habit
            </span>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. 10-min Morning Meditation"
                className="flex-1 px-3.5 py-2 rounded-lg border border-[#E8DFC8] text-xs bg-[#FAF7F2] focus:outline-none focus:ring-1 focus:ring-[#BA4A00]"
                maxLength={80}
              />

              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as HabitCategory)}
                className="px-3 py-2 rounded-lg border border-[#E8DFC8] text-xs bg-[#FAF7F2] focus:outline-none focus:ring-1 focus:ring-[#BA4A00] text-[#2C241E]"
              >
                <option value="mind">🧘 Mind</option>
                <option value="body">🏃 Body</option>
                <option value="focus">🎯 Focus</option>
                <option value="creativity">🎨 Creativity</option>
              </select>
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-[#7E6E5F] font-medium">Choose an icon:</span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_ICONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = newIcon === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setNewIcon(item.name)}
                      className={`p-2 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-[#F5EBE1] border-[#BA4A00] text-[#BA4A00] shadow-xs scale-105"
                          : "border-[#E8DFC8] bg-[#FAF7F2] text-[#7E6E5F] hover:text-[#2C241E] hover:border-[#D5C9B3]"
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
                disabled={isSubmitting || !newTitle.trim()}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#BA4A00] text-white text-xs font-semibold hover:bg-[#A04000] disabled:opacity-50 transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Habit</span>
              </button>
            </div>
          </form>

          {/* Current Habits List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-[#7E6E5F] uppercase">
                Active Habits ({templates.length})
              </span>

              <button
                type="button"
                onClick={onResetToDefaults}
                className="text-[11px] text-[#935116] hover:underline flex items-center space-x-1"
                title="Reset to default mindful habits"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-8 px-4 bg-white border border-dashed border-[#E8DFC8] rounded-xl">
                <Sparkles className="w-6 h-6 text-[#BA4A00]/40 mx-auto mb-2" />
                <p className="text-xs text-[#7E6E5F]">No recurring habits configured yet.</p>
                <button
                  type="button"
                  onClick={onResetToDefaults}
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#F5EBE1] text-[#935116] border border-[#E8DFC8] text-xs font-semibold hover:bg-[#EBDDCF]"
                >
                  Load 6 Mindful Defaults
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template, index) => {
                  const IconComp = getHabitIconComponent(template.icon);
                  const isEditing = editingId === template.id;

                  return (
                    <div
                      key={template.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        template.isActive
                          ? "bg-white border-[#E8DFC8] shadow-2xs"
                          : "bg-[#F5EBE1]/40 border-[#E8DFC8]/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0 mr-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            template.category === "mind"
                              ? "bg-indigo-50 text-indigo-700"
                              : template.category === "body"
                              ? "bg-emerald-50 text-emerald-700"
                              : template.category === "focus"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>

                        {isEditing ? (
                          <div className="flex items-center space-x-2 flex-1">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="px-2 py-1 rounded border border-[#BA4A00] text-xs bg-white w-full"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(template)}
                              className="px-2 py-1 rounded bg-[#BA4A00] text-white text-[10px] font-semibold shrink-0"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleStartEdit(template)}
                            title="Click to rename"
                          >
                            <p
                              className={`text-xs font-semibold truncate ${
                                template.isActive ? "text-[#2C241E]" : "line-through text-[#7E6E5F]"
                              }`}
                            >
                              {template.title}
                            </p>
                            <span className="text-[10px] text-[#7E6E5F] capitalize">
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
                          onClick={() => handleMove(index, "up")}
                          disabled={index === 0}
                          className="p-1 rounded text-[#7E6E5F] hover:bg-[#F5EBE1] disabled:opacity-20"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, "down")}
                          disabled={index === templates.length - 1}
                          className="p-1 rounded text-[#7E6E5F] hover:bg-[#F5EBE1] disabled:opacity-20"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Active Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(template)}
                          className={`px-2 py-1 rounded-md text-[10px] font-semibold border ${
                            template.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                        >
                          {template.isActive ? "Active" : "Paused"}
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => onDeleteTemplate(template.id)}
                          className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors"
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

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E8DFC8] bg-white/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#2C241E] text-white text-xs font-semibold hover:bg-[#4A3B32] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
