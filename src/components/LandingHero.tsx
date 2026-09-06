import React, { useState } from "react";
import {
  Sparkles,
  Lock,
  Calendar,
  Feather,
  Heart,
  Flame,
  ArrowRight,
  ShieldCheck,
  Send,
  LogIn,
  Sun,
} from "lucide-react";

interface LandingHeroProps {
  onSignIn: () => void;
  onContinueAsGuest: () => void;
  onQuickPromptSelect?: (prompt: string) => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onSignIn,
  onContinueAsGuest,
}) => {
  const [quickThought, setQuickThought] = useState("");
  const [previewReflection, setPreviewReflection] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handlePreviewReflect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickThought.trim() || isPreviewLoading) return;

    setIsPreviewLoading(true);
    try {
      const res = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: quickThought,
          reflectionType: "daily_reflection",
          mood: "reflective",
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setPreviewReflection(data.reply);
      }
    } catch (err) {
      setPreviewReflection(
        "There is a quiet strength in naming your current moment. As you step into this space, know that every feeling is allowed here."
      );
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="py-8 sm:py-12 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Warm Ambient Hero Badge */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#F5EBE1] border border-[#E8DFC8] text-[#935116] text-xs font-medium shadow-2xs">
          <Sun className="w-3.5 h-3.5 text-[#E67E22] animate-spin-slow" />
          <span>A Warm Sanctuary for Mindful Introspection</span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-[#2C241E] tracking-tight leading-[1.15]">
          A quiet haven for your thoughts, guided by{" "}
          <span className="italic text-[#BA4A00] underline decoration-[#FADBD8] underline-offset-8">
            thoughtful AI
          </span>
          .
        </h1>

        <p className="text-[#6E5D4F] text-base sm:text-lg max-w-2xl mx-auto font-journal leading-relaxed">
          Write multi-turn journal entries, converse with a compassionate Gemini
          companion, and keep your memories securely in your private Cloud
          Firestore.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onSignIn}
            className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-[#D35400] via-[#E67E22] to-[#CA6F1E] hover:opacity-95 text-white font-semibold text-sm rounded-xl shadow-md flex items-center justify-center space-x-2.5 transition-all hover:scale-102"
          >
            <LogIn className="w-4 h-4 text-amber-100" />
            <span>Sign In with Google Account</span>
            <ArrowRight className="w-4 h-4 text-amber-200" />
          </button>

          <button
            onClick={onContinueAsGuest}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#FAF7F2] hover:bg-[#F4EDE2] text-[#4A3B32] font-semibold text-sm rounded-xl border border-[#E5DAC6] transition-all flex items-center justify-center space-x-2"
          >
            <Feather className="w-4 h-4 text-[#935116]" />
            <span>Try Interactive Scratchpad</span>
          </button>
        </div>

        <p className="text-[11px] text-[#8C7B6C] flex items-center justify-center space-x-1.5 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
          <span>
            Zero data sharing · Strictly isolated under your authenticated Firestore subcollection
          </span>
        </p>
      </div>

      {/* Feature Bento Grid */}
      {/* Card 1: Multi-Turn AI Reflections */}
      {/* Card 2: Calendar & Heatmap */}
      {/* Card 3: User Isolated Privacy */}
      {/*<div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-12">
        <div className="bg-[#FFFFFF]/90 rounded-2xl p-6 border border-[#E8DFC8] shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5EBE1] text-[#BA4A00] flex items-center justify-center border border-[#E8DFC8]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-[#2C241E]">
              Multi-Turn Conversational AI
            </h3>
            <p className="text-xs text-[#6E5D4F] leading-relaxed">
              Don't just write and close the book. Have meaningful back-and-forth
              dialogues with Gemini to unpack emotions, brainstorm creative angles,
              or discover gentle insights.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F5EBE1] text-[11px] font-medium text-[#935116] flex items-center space-x-1">
            <span>Powered by Gemini 3.6 Flash</span>
          </div>
        </div>
 
        <div className="bg-[#FFFFFF]/90 rounded-2xl p-6 border border-[#E8DFC8] shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5EBE1] text-[#D35400] flex items-center justify-center border border-[#E8DFC8]">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-[#2C241E]">
              Interactive Calendar Heatmap
            </h3>
            <p className="text-xs text-[#6E5D4F] leading-relaxed">
              See your writing rhythm across every day of the month with warm
              indicators, entry counts, and mood palettes. Click any date to jump
              directly to that day's memories.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F5EBE1] text-[11px] font-medium text-[#935116] flex items-center space-x-1">
            <span>Daily entry counts & mood tags</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF]/90 rounded-2xl p-6 border border-[#E8DFC8] shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5EBE1] text-[#935116] flex items-center justify-center border border-[#E8DFC8]">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-[#2C241E]">
              Strict Cloud Firestore Isolation
            </h3>
            <p className="text-xs text-[#6E5D4F] leading-relaxed">
              Each user's reflections, chat history, and summaries are securely
              isolated under <code className="text-[10px] bg-[#F5EBE1] px-1 py-0.5 rounded">/users/&#123;uid&#125;/entries</code> with zero cross-tenant access.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F5EBE1] text-[11px] font-medium text-[#935116] flex items-center space-x-1">
            <span>Hardened Security Rules deployed</span>
          </div>
        </div>
      </div>
      */}

      {/* Interactive Live Scratchpad Preview */}
      <div className="bg-gradient-to-b from-[#FFFFFF] to-[#FDFBF7] rounded-2xl border-2 border-[#E5DAC6] p-6 sm:p-8 shadow-sm">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-center space-y-1">
            <h3 className="font-display text-xl font-semibold text-[#2C241E]">
              Experience a Moment of Warmth
            </h3>
            <p className="text-xs text-[#7E6E5F]">
              Share a thought on your mind, and see how Gemini gently responds.
            </p>
          </div>

          <form onSubmit={handlePreviewReflect} className="space-y-3">
            <div className="relative">
              <textarea
                value={quickThought}
                onChange={(e) => setQuickThought(e.target.value)}
                placeholder="e.g., Today felt a bit scattered. I tried to do too many things at once and didn't leave room to breathe..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] text-sm text-[#2C241E] placeholder-[#9E8E80] focus:outline-none focus:ring-2 focus:ring-[#E67E22]/50 font-journal resize-none"
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[11px] text-[#8C7B6C]">
                {quickThought.length} characters
              </span>
              <button
                type="submit"
                disabled={!quickThought.trim() || isPreviewLoading}
                className="px-4 py-2 bg-[#D35400] hover:bg-[#BA4A00] disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
              >
                {isPreviewLoading ? (
                  <span>Reflecting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Get AI Reflection</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* AI Response Preview Card */}
          {previewReflection && (
            <div className="mt-4 p-5 rounded-xl bg-[#F5EBE1]/70 border border-[#E8DFC8] space-y-3 animate-fade-in">
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#BA4A00]">
                <Sparkles className="w-4 h-4" />
                <span>Reflection from Warmth</span>
              </div>
              <p className="text-sm font-journal text-[#3E3127] leading-relaxed whitespace-pre-line">
                {previewReflection}
              </p>
              <div className="pt-2 border-t border-[#E8DFC8]/60 flex items-center justify-between">
                <span className="text-[11px] text-[#7E6E5F]">
                  Sign in to save this entry to your private history & calendar!
                </span>
                <button
                  onClick={onSignIn}
                  className="text-xs font-semibold text-[#BA4A00] hover:underline flex items-center space-x-1"
                >
                  <span>Sign In & Save</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
