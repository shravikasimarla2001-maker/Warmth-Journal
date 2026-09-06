import React, { useState } from "react";
import {
  X,
  Upload,
  User,
  Sparkles,
  Check,
  Loader2,
  Compass,
  FileText,
} from "lucide-react";
import { VisionBoardSettings } from "../types";

interface VisionProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VisionBoardSettings | null;
  onSave: (updated: Partial<VisionBoardSettings>) => Promise<void>;
  onSynthesizeManifesto?: () => Promise<void>;
  isSynthesizing?: boolean;
}

export const VisionProfileModal: React.FC<VisionProfileModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onSynthesizeManifesto,
  isSynthesizing = false,
}) => {
  const [annualTheme, setAnnualTheme] = useState(
    settings?.annualTheme || "2026: Season of Vitality, Grounded Abundance & Purpose"
  );
  const [userNameOrMantra, setUserNameOrMantra] = useState(
    settings?.userNameOrMantra || "Walking with Presence & Joy"
  );
  const [userPhotoUrl, setUserPhotoUrl] = useState(settings?.userPhotoUrl || "");
  const [manifesto, setManifesto] = useState(settings?.manifesto || "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Photo is too large. Please select a photo under 10MB.");
      return;
    }

    setErrorMsg("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX) {
            height *= MAX / width;
            width = MAX;
          }
        } else {
          if (height > MAX) {
            width *= MAX / height;
            height = MAX;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        setUserPhotoUrl(compressed);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        annualTheme: annualTheme.trim(),
        userNameOrMantra: userNameOrMantra.trim(),
        userPhotoUrl: userPhotoUrl || undefined,
        manifesto: manifesto.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="vision-profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="vision-profile-modal-container"
        className="relative w-full max-w-xl bg-amber-50/95 border border-amber-900/20 rounded-2xl shadow-2xl p-6 sm:p-8 my-8 text-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="close-vision-profile-modal-btn"
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-500 hover:text-stone-800 hover:bg-amber-200/50 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-800/80 font-semibold mb-1">
            <Compass className="w-4 h-4 text-amber-700" />
            <span>Vision Board Centerpiece</span>
          </div>
          <h2 className="text-2xl font-serif font-medium text-stone-900">
            Centerpiece & North Star Theme
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            Anchor your vision board with your portrait (Future Self) and your guiding annual theme.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* User Photo Centerpiece */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2">
              Your Portrait / "Future Self" Anchor
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-800/30 bg-amber-100/50 shadow-inner flex items-center justify-center shrink-0">
                {userPhotoUrl ? (
                  <img
                    src={userPhotoUrl}
                    alt="Centerpiece Portrait"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-8 h-8 text-amber-800/40" />
                )}
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  id="vision-centerpiece-upload"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="vision-centerpiece-upload"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-800 text-amber-50 text-xs font-medium hover:bg-amber-900 transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{userPhotoUrl ? "Change Photo" : "Upload Your Picture"}</span>
                  </label>
                  {userPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setUserPhotoUrl("")}
                      className="text-xs text-rose-700 hover:text-rose-900 px-2 py-1"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-stone-500">
                  A photo of you smiling, in nature, or representing your calm, fulfilled future self.
                </p>
              </div>
            </div>
          </div>

          {/* Annual Theme */}
          <div>
            <label
              htmlFor="annual-theme-input"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
            >
              Guiding Theme / Year Motto
            </label>
            <input
              id="annual-theme-input"
              type="text"
              value={annualTheme}
              onChange={(e) => setAnnualTheme(e.target.value)}
              placeholder="e.g. 2026: Year of Grounded Vitality & Warmth"
              className="w-full px-3.5 py-2.5 rounded-xl border border-amber-900/20 bg-white/90 text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-700"
            />
          </div>

          {/* Personal Affirmation / Mantra */}
          <div>
            <label
              htmlFor="personal-mantra-input"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
            >
              Personal Anchor Mantra
            </label>
            <input
              id="personal-mantra-input"
              type="text"
              value={userNameOrMantra}
              onChange={(e) => setUserNameOrMantra(e.target.value)}
              placeholder="e.g. I live each day with deep presence and quiet confidence"
              className="w-full px-3.5 py-2.5 rounded-xl border border-amber-900/20 bg-white/90 text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-700"
            />
          </div>

          {/* North Star Manifesto */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="vision-manifesto-input"
                className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                <span>North Star Manifesto</span>
              </label>
              {onSynthesizeManifesto && (
                <button
                  type="button"
                  onClick={onSynthesizeManifesto}
                  disabled={isSynthesizing}
                  className="text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  <span>{isSynthesizing ? "Synthesizing..." : "Synthesize with AI"}</span>
                </button>
              )}
            </div>
            <textarea
              id="vision-manifesto-input"
              rows={4}
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              placeholder="A poetic synthesis uniting your health, craft, finances, partnerships, and inner stillness..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-amber-900/20 bg-white/90 text-stone-900 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-700 placeholder:text-stone-400 font-serif leading-relaxed"
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-amber-900/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-amber-100 transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-vision-profile-btn"
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-amber-50 text-xs font-medium shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Centerpiece</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
