import React from "react";
import { Award, Sparkles, X, Heart, Flame, Shield, ArrowRight } from "lucide-react";
import { UserMilestone } from "../types";

interface MilestoneCelebrationModalProps {
  milestone: UserMilestone | null;
  onClose: () => void;
  onViewInsights: () => void;
}

export const MilestoneCelebrationModal: React.FC<MilestoneCelebrationModalProps> = ({
  milestone,
  onClose,
  onViewInsights,
}) => {
  if (!milestone) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF7F2] border border-[#E8DFC8] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center">
        {/* Background glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#F3D5B5]/60 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#BA4A00]/10 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#F5EBE1] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Milestone Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E67E22] via-[#D35400] to-[#A04000] text-white mx-auto flex items-center justify-center shadow-lg mb-4 animate-bounce-gentle">
          <Award className="w-8 h-8" />
        </div>

        <span className="text-[10px] uppercase font-bold tracking-widest text-[#BA4A00] bg-[#F5EBE1] px-3 py-1 rounded-full border border-[#E8DFC8] inline-block mb-2">
          Milestone Unlocked
        </span>

        <h3 className="font-display font-bold text-2xl text-[#2C241E] mb-2">
          {milestone.title}
        </h3>

        <p className="text-xs text-[#7E6E5F] leading-relaxed mb-6 max-w-xs mx-auto">
          {milestone.description}
        </p>

        {milestone.postcardData && (
          <div className="bg-white border border-[#E8DFC8] rounded-xl p-3 mb-6 text-left shadow-2xs">
            <div className="flex items-center justify-between text-[11px] text-[#7E6E5F] mb-1.5">
              <span>Date: {milestone.postcardData.date}</span>
              <span className="capitalize font-semibold text-[#BA4A00]">
                {milestone.postcardData.mood} mood
              </span>
            </div>
            <p className="text-xs font-medium text-[#2C241E] truncate">
              ✨ {milestone.postcardData.habitsCompleted.length} habits &{" "}
              {milestone.postcardData.tasksCompleted.length} focus tasks achieved
            </p>
          </div>
        )}

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              onClose();
              onViewInsights();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-[#BA4A00] text-white text-xs font-semibold hover:bg-[#A04000] transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
          >
            <span>View in Insights</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-white border border-[#E8DFC8] text-[#2C241E] text-xs font-semibold hover:bg-[#F5EBE1] transition-colors"
          >
            Keep Journaling
          </button>
        </div>
      </div>
    </div>
  );
};
