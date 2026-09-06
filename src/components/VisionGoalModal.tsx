import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Calendar,
  Layers,
  Heart,
  Briefcase,
  Activity,
  Compass,
  Coins,
  Home,
  Users,
  Globe,
  Quote,
  Eye,
  EyeOff,
  Palette,
  Type,
  FileImage,
  Trash2,
} from "lucide-react";
import { VisionGoal, VisionPillar, VisionBoardSettings } from "../types";
import { PILLARS_CONFIG, PILLAR_ORDER } from "../data/visionPillars";

interface VisionGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Partial<VisionGoal>) => Promise<void>;
  initialGoal?: VisionGoal | null;
  defaultPillar?: VisionPillar;
  settings?: VisionBoardSettings | null;
}

const TEXT_BG_PRESETS = [
  { id: "sand", label: "Warm Sand", hex: "#f5eee6", textClass: "text-stone-900" },
  { id: "parchment", label: "Parchment", hex: "#faf6ef", textClass: "text-stone-900" },
  { id: "kraft", label: "Kraft Paper", hex: "#ebded2", textClass: "text-amber-950" },
  { id: "sage", label: "Sage Linen", hex: "#e9f0ea", textClass: "text-emerald-950" },
  { id: "rose", label: "Dusty Rose", hex: "#faeee9", textClass: "text-rose-950" },
  { id: "charcoal", label: "Dark Noir", hex: "#262422", textClass: "text-stone-100" },
];

export const VisionGoalModal: React.FC<VisionGoalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialGoal,
  defaultPillar = "health",
}) => {
  const [title, setTitle] = useState("");
  const [explanation, setExplanation] = useState("");
  const [pillar, setPillar] = useState<VisionPillar>(defaultPillar);
  const [timeframe, setTimeframe] = useState("2026");

  // Mode: Upload photo vs Text-only
  const [mode, setMode] = useState<"photo" | "text_only">("photo");

  // Photo states
  const [imageUrl, setImageUrl] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Text-only customization
  const [hideBackground, setHideBackground] = useState(false);
  const [textBgColor, setTextBgColor] = useState("#faf6ef");
  const [textBgImage, setTextBgImage] = useState("");
  const [textFontStyle, setTextFontStyle] = useState<"serif" | "script" | "sans">("serif");

  // Sizing
  const [widthSpan, setWidthSpan] = useState<1 | 2 | 3>(1);
  const [customHeight, setCustomHeight] = useState<number>(300);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialGoal) {
      setTitle(initialGoal.title);
      setExplanation(initialGoal.explanation || "");
      setPillar(initialGoal.pillar);
      setTimeframe(initialGoal.targetTimeframe || "2026");
      setImageUrl(initialGoal.imageUrl || "");
      setWidthSpan(initialGoal.widthSpan || 1);
      setCustomHeight(initialGoal.customHeight || 300);

      const isText = initialGoal.isTextOnly || !initialGoal.imageUrl;
      setMode(isText ? "text_only" : "photo");
      setHideBackground(Boolean(initialGoal.hideBackground));
      setTextBgColor(initialGoal.textBgColor || "#faf6ef");
      setTextBgImage(initialGoal.textBgImage || "");
      setTextFontStyle(initialGoal.textFontStyle || "serif");
    } else {
      setTitle("");
      setExplanation("");
      setPillar(defaultPillar);
      setTimeframe("2026");
      setImageUrl("");
      setMode("photo");
      setHideBackground(false);
      setTextBgColor("#faf6ef");
      setTextBgImage("");
      setTextFontStyle("serif");
      setWidthSpan(1);
      setCustomHeight(300);
      setUploadError("");
    }
  }, [initialGoal, defaultPillar, isOpen]);

  if (!isOpen) return null;

  const currentPillarMeta = PILLARS_CONFIG[pillar];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose a valid image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image is too large. Please select a photo under 10MB.");
      return;
    }

    setUploadError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      // Compress with canvas if large to guarantee fast local storage
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1400;
        const MAX_HEIGHT = 1400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

        setImageUrl(compressedDataUrl);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose a valid texture or background image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setTextBgImage(result);
      setHideBackground(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const isText = mode === "text_only" || !imageUrl;
      await onSave({
        id: initialGoal?.id,
        title: title.trim(),
        explanation: explanation.trim(),
        pillar,
        targetTimeframe: timeframe.trim() || "2026",
        imageUrl: isText ? undefined : imageUrl || undefined,
        imageSource: isText ? undefined : "user_upload",
        isTextOnly: isText,
        hideBackground: isText ? hideBackground : false,
        textBgColor: isText ? textBgColor : undefined,
        textBgImage: isText ? textBgImage || undefined : undefined,
        textFontStyle: isText ? textFontStyle : undefined,
        widthSpan,
        customHeight,
        order: initialGoal?.order,
        status: initialGoal?.status || "in_motion",
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const getPillarIcon = (key: VisionPillar) => {
    switch (key) {
      case "health":
        return <Activity className="w-3.5 h-3.5" />;
      case "career":
        return <Briefcase className="w-3.5 h-3.5" />;
      case "spirituality":
        return <Compass className="w-3.5 h-3.5" />;
      case "finances":
        return <Coins className="w-3.5 h-3.5" />;
      case "partner":
        return <Heart className="w-3.5 h-3.5" />;
      case "family":
        return <Home className="w-3.5 h-3.5" />;
      case "friends":
        return <Users className="w-3.5 h-3.5" />;
      case "fun":
        return <Globe className="w-3.5 h-3.5" />;
      case "community":
        return <Globe className="w-3.5 h-3.5" />;
      default:
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      id="vision-goal-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="vision-goal-modal-container"
        className="relative w-full max-w-2xl bg-[#fdfbf7] border border-amber-900/20 rounded-2xl shadow-2xl p-5 sm:p-7 my-6 text-stone-800 transition-all max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/10 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-amber-800 font-semibold">
              <Compass className="w-3.5 h-3.5 text-amber-700" />
              <span>Vision Board Goal</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-medium text-stone-900 mt-0.5">
              {initialGoal ? "Edit Life Intention" : "Add Life Intention"}
            </h2>
          </div>
          <button
            id="close-vision-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-500 hover:text-stone-800 hover:bg-amber-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 py-4 space-y-5">
          {/* 1. Life Sphere / Pillar */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Life Sphere (Select 1 of 9)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {PILLAR_ORDER.map((pKey) => {
                const meta = PILLARS_CONFIG[pKey];
                const isSelected = pillar === pKey;
                return (
                  <button
                    key={pKey}
                    id={`select-pillar-${pKey}`}
                    type="button"
                    onClick={() => setPillar(pKey)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border text-left transition-all ${
                      isSelected
                        ? "bg-amber-800 text-amber-50 border-amber-900 shadow-2xs"
                        : "bg-white text-stone-700 border-amber-900/10 hover:bg-amber-100/50"
                    }`}
                  >
                    <span className={isSelected ? "text-amber-200" : "text-amber-700"}>
                      {getPillarIcon(pKey)}
                    </span>
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Goal Title & Timeframe */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="goal-title-input"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
              >
                Intention / Goal Title *
              </label>
              <input
                id="goal-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={currentPillarMeta.example}
                className="w-full px-3.5 py-2 rounded-xl border border-amber-900/20 bg-white text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-700"
              />
            </div>
            <div>
              <label
                htmlFor="goal-timeframe-input"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1 flex items-center justify-between"
              >
                <span>Target Year</span>
                <span className="text-[10px] text-amber-800 font-mono font-normal">
                  {timeframe}
                </span>
              </label>
              <div className="flex flex-wrap gap-1 mb-1">
                {["2026", "2027", "2028", "2029", "2030"].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setTimeframe(yr)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      timeframe === yr
                        ? "bg-amber-800 text-white"
                        : "bg-amber-100/80 hover:bg-amber-200 text-amber-900"
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
              <input
                id="goal-timeframe-input"
                type="text"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder="Or custom e.g. Summer 2026"
                className="w-full px-2.5 py-1.5 rounded-lg border border-amber-900/20 bg-white text-stone-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-700"
              />
            </div>
          </div>

          {/* 3. Explanation / Narrative */}
          <div>
            <label
              htmlFor="goal-explanation-input"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
            >
              Why this matters & how you will live it
            </label>
            <textarea
              id="goal-explanation-input"
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Describe the feeling, daily habits, or specific milestone that embodies this aspiration..."
              className="w-full px-3.5 py-2 rounded-xl border border-amber-900/20 bg-white text-stone-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-700"
            />
          </div>

          {/* 4. VISUAL TYPE SELECTOR: Upload Pic vs Text Only */}
          <div className="pt-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Visual Mode (Choose Photo or Text-Only)
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-amber-100/60 rounded-xl">
              <button
                id="mode-tab-photo"
                type="button"
                onClick={() => setMode("photo")}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  mode === "photo"
                    ? "bg-white text-amber-950 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-amber-700" />
                <span>Upload Picture</span>
              </button>
              <button
                id="mode-tab-text-only"
                type="button"
                onClick={() => setMode("text_only")}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  mode === "text_only"
                    ? "bg-white text-amber-950 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Quote className="w-3.5 h-3.5 text-amber-700" />
                <span>Text Only</span>
              </button>
            </div>
          </div>

          {/* MODE 1: UPLOAD PICTURE */}
          {mode === "photo" && (
            <div className="p-4 bg-white rounded-xl border border-amber-900/15 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-800">
                  Select Picture from Your Device
                </span>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="text-xs text-rose-700 hover:text-rose-900 flex items-center gap-1 font-medium"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>

              {/* Upload Input */}
              {!imageUrl ? (
                <div className="border-2 border-dashed border-amber-900/25 rounded-xl p-5 text-center bg-amber-50/40 hover:bg-amber-50/70 transition-colors">
                  <input
                    type="file"
                    id="photo-file-upload-input"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="photo-file-upload-input"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-800 text-amber-50 text-xs font-medium hover:bg-amber-900 transition-colors shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose Photo from Device</span>
                  </label>
                  <p className="text-[11px] text-stone-500 mt-2">
                    JPG, PNG, WebP or GIF up to 10MB. You can also paste an image URL below.
                  </p>
                  <div className="mt-3 max-w-sm mx-auto flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="Or paste image URL (e.g. from Pinterest / Unsplash)"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white rounded-lg border border-stone-200"
                    />
                  </div>
                </div>
              ) : (
                /* Photo Preview with Size Settings */
                <div className="space-y-3">
                  <div className="relative aspect-16/10 rounded-xl overflow-hidden border border-stone-200 shadow-inner bg-stone-900/5">
                    <img
                      src={imageUrl}
                      alt={title || "Vision Goal"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <label
                        htmlFor="replace-photo-input"
                        className="cursor-pointer px-2.5 py-1 rounded-md bg-stone-900/75 hover:bg-stone-900 text-[11px] text-white backdrop-blur-xs font-medium transition-colors"
                      >
                        Replace
                      </label>
                      <input
                        type="file"
                        id="replace-photo-input"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {uploadError && <p className="text-xs text-rose-600 font-medium">{uploadError}</p>}
            </div>
          )}

          {/* MODE 2: TEXT ONLY (WITH BACKGROUND CUSTOMIZATION & UPLOAD BACKGROUND IMAGE) */}
          {mode === "text_only" && (
            <div className="p-4 bg-white rounded-xl border border-amber-900/15 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-800">
                    Text-Only Styling & Background
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Customize typography and whether to keep or remove the card background.
                  </p>
                </div>
              </div>

              {/* Font Style Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1.5">
                  Typography Aesthetic
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTextFontStyle("serif")}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-serif transition-all ${
                      textFontStyle === "serif"
                        ? "bg-amber-100 border-amber-800 text-amber-950 font-bold shadow-2xs"
                        : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    Serif (Editorial)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextFontStyle("script")}
                    className={`px-3 py-1.5 rounded-lg border text-xs italic font-serif transition-all ${
                      textFontStyle === "script"
                        ? "bg-amber-100 border-amber-800 text-amber-950 font-bold shadow-2xs"
                        : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    Script (Handwritten)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextFontStyle("sans")}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-sans transition-all ${
                      textFontStyle === "sans"
                        ? "bg-amber-100 border-amber-800 text-amber-950 font-bold shadow-2xs"
                        : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    Clean Sans
                  </button>
                </div>
              </div>

              {/* Toggle: Keep Background vs Remove Background (Transparent) */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-900/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-stone-900 block">
                    Card Background
                  </span>
                  <span className="text-[11px] text-stone-600">
                    {hideBackground
                      ? "Background removed — transparent text floats on your board (like script notes)"
                      : "Card has background color or custom texture"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-amber-900/15">
                  <button
                    type="button"
                    onClick={() => setHideBackground(false)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      !hideBackground
                        ? "bg-amber-800 text-amber-50 shadow-2xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    Keep Background
                  </button>
                  <button
                    type="button"
                    onClick={() => setHideBackground(true)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      hideBackground
                        ? "bg-amber-800 text-amber-50 shadow-2xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    Remove (Transparent)
                  </button>
                </div>
              </div>

              {/* Background Color & Image Options (when not transparent) */}
              {!hideBackground && (
                <div className="space-y-3 pt-1">
                  {/* Preset Colors */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1.5">
                      Background Color Tint
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {TEXT_BG_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setTextBgColor(preset.hex);
                            setTextBgImage("");
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                            textBgColor === preset.hex && !textBgImage
                              ? "border-amber-800 ring-2 ring-amber-700/30 font-semibold"
                              : "border-stone-200 hover:border-stone-400"
                          }`}
                          style={{ backgroundColor: preset.hex }}
                        >
                          <span className={preset.textClass}>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option to Upload Background Image / Texture */}
                  <div className="pt-2 border-t border-stone-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-stone-700 flex items-center gap-1.5">
                        <FileImage className="w-3.5 h-3.5 text-amber-700" />
                        <span>Upload Background Image or Paper Texture</span>
                      </label>
                      {textBgImage && (
                        <button
                          type="button"
                          onClick={() => setTextBgImage("")}
                          className="text-[10px] text-rose-700 hover:text-rose-900 font-medium"
                        >
                          Remove Texture
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="bg-texture-upload"
                        accept="image/*"
                        onChange={handleBgImageUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="bg-texture-upload"
                        className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium border border-stone-300 transition-colors"
                      >
                        <Upload className="w-3 h-3 text-stone-600" />
                        <span>{textBgImage ? "Change Background Texture" : "Upload Background Texture"}</span>
                      </label>
                      <span className="text-[11px] text-stone-500">
                        (e.g., notebook page, crumpled kraft, or floral texture)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive Live Preview of Text Card */}
              <div className="pt-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block mb-1">
                  Live Card Preview
                </span>
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    hideBackground
                      ? "border-dashed border-amber-900/30 bg-transparent"
                      : "border-amber-900/20 shadow-xs"
                  }`}
                  style={{
                    backgroundColor: hideBackground ? "transparent" : textBgColor,
                    backgroundImage: !hideBackground && textBgImage ? `url(${textBgImage})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-900/70 block mb-1">
                    {currentPillarMeta.label} • {timeframe}
                  </span>
                  <h4
                    className={`text-base font-normal leading-snug ${
                      textFontStyle === "serif"
                        ? "font-serif"
                        : textFontStyle === "script"
                        ? "font-serif italic text-lg"
                        : "font-sans font-medium"
                    } ${textBgColor === "#262422" && !hideBackground ? "text-stone-100" : "text-stone-900"}`}
                  >
                    "{title || currentPillarMeta.example}"
                  </h4>
                  {explanation && (
                    <p
                      className={`text-xs mt-1.5 leading-relaxed ${
                        textBgColor === "#262422" && !hideBackground ? "text-stone-300" : "text-stone-700"
                      }`}
                    >
                      {explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. DEFAULT SIZING ON THE BOARD */}
          <div className="p-3 bg-stone-100/70 rounded-xl border border-stone-200/80">
            <label className="block text-xs font-semibold text-stone-700 mb-2">
              Initial Board Dimensions (You can also resize directly on the board anytime)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[11px] text-stone-500 block mb-1">Width Column Span</span>
                <div className="flex items-center gap-1">
                  {([1, 2, 3] as const).map((span) => (
                    <button
                      key={span}
                      type="button"
                      onClick={() => setWidthSpan(span)}
                      className={`flex-1 py-1 rounded border font-medium text-xs ${
                        widthSpan === span
                          ? "bg-amber-800 text-white border-amber-900"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {span}x {span === 1 ? "(1 col)" : span === 2 ? "(Wide)" : "(Full)"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-stone-500 block mb-1">Height</span>
                <div className="flex items-center gap-1">
                  {[220, 320, 420].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setCustomHeight(h)}
                      className={`flex-1 py-1 rounded border font-medium text-xs ${
                        customHeight === h
                          ? "bg-amber-800 text-white border-amber-900"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {h === 220 ? "Short" : h === 320 ? "Med" : "Tall"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-900/10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-amber-100 transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-vision-goal-btn"
              type="submit"
              disabled={isSaving || !title.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-amber-50 text-xs font-medium shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{initialGoal ? "Save Changes" : "Anchor to Board"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
