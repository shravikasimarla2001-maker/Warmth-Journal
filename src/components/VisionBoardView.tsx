import React, { useState, useRef, useLayoutEffect, useCallback, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Compass,
  Download,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Edit2,
  Trash2,
  User,
  Quote,
  Layers,
  Activity,
  Briefcase,
  Coins,
  Heart,
  Home,
  Users,
  Globe,
  Loader2,
  Check,
  Maximize2,
  Info,
  X,
  Upload,
  Palette,
  Eye,
  EyeOff,
  LayoutGrid,
  Frame,
  Minus,
  MoveVertical,
  Move,
  Shuffle,
  RotateCw,
} from "lucide-react";
import confetti from "canvas-confetti";
import { toPng } from "html-to-image";
import { VisionGoal, VisionBoardSettings, VisionPillar } from "../types";
import { PILLARS_CONFIG, PILLAR_ORDER } from "../data/visionPillars";
import { VisionGoalModal } from "./VisionGoalModal";
import { VisionProfileModal } from "./VisionProfileModal";

interface VisionBoardViewProps {
  goals: VisionGoal[];
  settings: VisionBoardSettings | null;
  onSaveGoal: (goal: Partial<VisionGoal>) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onReorderGoals: (updatedGoals: VisionGoal[]) => Promise<void>;
  onSaveSettings: (settings: Partial<VisionBoardSettings>) => Promise<void>;
  onSeedDefaults?: () => Promise<void>;
}

export type BoardArrangement = "editorial" | "grid";
export type FrameStyle = "none" | "polaroid" | "editorial_black" | "washi_pin" | "soft_float";
export type CanvasTheme = "linen" | "cork" | "noir" | "clean";
export type BoardMode = "view" | "edit";
export type BoardSize = "desktop" | "phone" | "square";

interface ActiveDrag {
  goalId: string;
  type: "height" | "corner";
  startX: number;
  startY: number;
  initialHeight: number;
  initialSpan: 1 | 2 | 3;
  currentHeight: number;
  currentSpan: 1 | 2 | 3;
}

interface CardLayout {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
  span: 1 | 2 | 3;
}

const QUICK_COLORS = [
  { hex: "#faf6ef", label: "Parchment" },
  { hex: "#f5eee6", label: "Sand" },
  { hex: "#ebded2", label: "Kraft" },
  { hex: "#e9f0ea", label: "Sage" },
  { hex: "#faeee9", label: "Rose" },
  { hex: "#262422", label: "Dark" },
];

const getDefaultTextBg = (theme: CanvasTheme): string => {
  switch (theme) {
    case "noir":
      return "#262422";
    case "cork":
      return "#f5eee6";
    case "clean":
      return "#faf6ef";
    default:
      return "#faf6ef";
  }
};

const isDarkBg = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
};

const getTransparentTextColor = (theme: CanvasTheme): string => {
  return theme === "noir" ? "text-stone-100" : "text-stone-900";
};

export const VisionBoardView: React.FC<VisionBoardViewProps> = ({
  goals,
  settings,
  onSaveGoal,
  onDeleteGoal,
  onReorderGoals,
  onSaveSettings,
  onSeedDefaults,
}) => {
  const [mode, setMode] = useState<BoardMode>("view");
  const [selectedPillar, setSelectedPillar] = useState<VisionPillar | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_motion" | "manifested">("all");
  const [arrangement, setArrangement] = useState<BoardArrangement>("grid");
  const [frameStyle, setFrameStyle] = useState<FrameStyle>("washi_pin");
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>("linen");
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [boardSize, setBoardSize] = useState<BoardSize>("desktop");

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<VisionGoal | null>(null);
  const [modalDefaultPillar, setModalDefaultPillar] = useState<VisionPillar>("health");

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [deleteConfirmGoal, setDeleteConfirmGoal] = useState<VisionGoal | null>(null);
  const [showManifestedExplainer, setShowManifestedExplainer] = useState(false);

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const activeDragRef = useRef<ActiveDrag | null>(null);

  const [activeColorPickerGoalId, setActiveColorPickerGoalId] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);

  // Layout state
  const [cardLayouts, setCardLayouts] = useState<CardLayout[]>([]);
  const [boardHeight, setBoardHeight] = useState(0);

  const filteredGoals = goals.filter((g) => {
    const matchesPillar = selectedPillar === "all" || g.pillar === selectedPillar;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "manifested" && g.status === "manifested") ||
      (statusFilter === "in_motion" && g.status !== "manifested");
    return matchesPillar && matchesStatus;
  });

  const manifestedCount = goals.filter((g) => g.status === "manifested").length;

  // Fixed card dimensions
  const HEADER_H = 32;
  const FOOTER_H = 32;
  const PADDING = 8;

  const computeLayout = useCallback(() => {
    if (!boardRef.current || filteredGoals.length === 0) {
      setCardLayouts([]);
      setBoardHeight(0);
      return;
    }

    const containerWidth = boardRef.current.clientWidth;
    const paddingX = 16;
    const gap = arrangement === "editorial" ? 8 : 12;
    const cols = 3;
    const totalGaps = (cols - 1) * gap;
    const columnWidth = (containerWidth - paddingX * 2 - totalGaps) / cols;

    const sorted = [...filteredGoals].sort((a, b) => a.order - b.order);

    let colHeights = [0, 0, 0];
    const layouts: CardLayout[] = [];

    sorted.forEach((goal) => {
      const span = goal.widthSpan || 1;
      const customH = goal.customHeight || 300;
      const cardHeight = customH + HEADER_H + FOOTER_H + PADDING;
      const width = span * columnWidth + (span - 1) * gap;

      let startCol = 0;
      if (span === 1) {
        const minHeight = Math.min(...colHeights);
        startCol = colHeights.indexOf(minHeight);
      } else {
        let bestStart = 0;
        let bestMax = Infinity;
        for (let i = 0; i <= cols - span; i++) {
          const maxHeight = Math.max(...colHeights.slice(i, i + span));
          if (maxHeight < bestMax) {
            bestMax = maxHeight;
            bestStart = i;
          }
        }
        startCol = bestStart;
      }

      const top = colHeights[startCol];
      const left = paddingX + startCol * (columnWidth + gap);

      const bottom = top + cardHeight + gap;
      for (let i = startCol; i < startCol + span; i++) {
        colHeights[i] = bottom;
      }

      layouts.push({
        id: goal.id,
        top,
        left,
        width,
        height: cardHeight,
        span,
      });
    });

    const maxColHeight = Math.max(...colHeights);
    setBoardHeight(maxColHeight + 16);
    setCardLayouts(layouts);
  }, [filteredGoals, arrangement]);

  useEffect(() => {
    computeLayout();
  }, [computeLayout]);

  useEffect(() => {
    if (!boardRef.current) return;
    let timeoutId: number;
    const ro = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        computeLayout();
      }, 100);
    });
    ro.observe(boardRef.current);
    return () => {
      ro.disconnect();
      clearTimeout(timeoutId);
    };
  }, [computeLayout]);

  useLayoutEffect(() => {
    if (boardSize === "desktop") {
      setBoardScale(1);          // desktop: no scaling, no cropping, natural height
      return;
    }
    
    const container = boardContainerRef.current;
    const board = boardRef.current;
    if (!container || !board) return;

    const computeScale = () => {
      const containerRect = container.getBoundingClientRect();
      const boardRect = board.getBoundingClientRect();
      if (boardRect.width === 0 || boardRect.height === 0) return;
      const scaleX = containerRect.width / boardRect.width;
      const scaleY = containerRect.height / boardRect.height;
      // "contain", not "cover" — shrinks to fit, never crops
      setBoardScale(Math.min(scaleX, scaleY));
    };

    const ro = new ResizeObserver(computeScale);
    ro.observe(container);
    ro.observe(board);
    requestAnimationFrame(computeScale);
    setTimeout(computeScale, 100);
    return () => ro.disconnect();
  }, [boardSize, goals.length, arrangement, frameStyle]);

  // Handlers
  const handleOpenAddModal = (pillarPref?: VisionPillar) => {
    setEditingGoal(null);
    setModalDefaultPillar(pillarPref || (selectedPillar === "all" ? "health" : selectedPillar));
    setIsGoalModalOpen(true);
  };

  const handleEditGoal = (goal: VisionGoal) => {
    setEditingGoal(goal);
    setModalDefaultPillar(goal.pillar);
    setIsGoalModalOpen(true);
  };

  const handleToggleStatus = async (goal: VisionGoal) => {
    const newStatus = goal.status === "manifested" ? "in_motion" : "manifested";

    if (newStatus === "manifested") {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#d97706", "#f59e0b", "#10b981", "#8b5cf6"],
      });
    }

    await onSaveGoal({
      ...goal,
      status: newStatus,
    });
  };

  const handleMoveOrder = async (goalId: string, direction: "left" | "right") => {
    const currentIndex = goals.findIndex((g) => g.id === goalId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= goals.length) return;

    const newGoals = [...goals];
    const [moved] = newGoals.splice(currentIndex, 1);
    newGoals.splice(targetIndex, 0, moved);

    const updatedGoals = newGoals.map((g, idx) => ({ ...g, order: idx }));
    await onReorderGoals(updatedGoals);
  };

  const handleShuffleGoals = async () => {
    if (goals.length <= 1) return;
    const shuffled = [...goals].sort(() => Math.random() - 0.5);
    const reordered = shuffled.map((g, idx) => ({ ...g, order: idx }));
    await onReorderGoals(reordered);
  };

  const handleStartDrag = (
    e: React.MouseEvent | React.TouchEvent,
    goal: VisionGoal,
    type: "height" | "corner"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const initialHeight = goal.customHeight || 320;
    const initialSpan = (goal.widthSpan || 1) as 1 | 2 | 3;

    const session: ActiveDrag = {
      goalId: goal.id,
      type,
      startX: clientX,
      startY: clientY,
      initialHeight,
      initialSpan,
      currentHeight: initialHeight,
      currentSpan: initialSpan,
    };

    activeDragRef.current = session;
    setActiveDrag(session);

    const handlePointerMove = (moveEvent: MouseEvent | TouchEvent) => {
      const curX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const curY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaY = curY - clientY;
      const newHeight = Math.max(160, Math.min(680, initialHeight + deltaY));

      let newSpan = initialSpan;
      if (type === "corner") {
        const deltaX = curX - clientX;
        if (initialSpan === 1) {
          if (deltaX > 140) newSpan = 3;
          else if (deltaX > 60) newSpan = 2;
        } else if (initialSpan === 2) {
          if (deltaX > 80) newSpan = 3;
          else if (deltaX < -60) newSpan = 1;
        } else if (initialSpan === 3) {
          if (deltaX < -140) newSpan = 1;
          else if (deltaX < -60) newSpan = 2;
        }
      }

      const updatedSession: ActiveDrag = {
        goalId: goal.id,
        type,
        startX: clientX,
        startY: clientY,
        initialHeight,
        initialSpan,
        currentHeight: newHeight,
        currentSpan: newSpan,
      };

      activeDragRef.current = updatedSession;
      setActiveDrag(updatedSession);
    };

    const handlePointerUp = () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);

      const latest = activeDragRef.current;
      activeDragRef.current = null;
      setActiveDrag(null);

      if (latest) {
        onSaveGoal({
          ...goal,
          customHeight: latest.currentHeight,
          widthSpan: latest.currentSpan,
        });
      }
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove);
    window.addEventListener("touchend", handlePointerUp);
  };

  const handleAdjustWidth = async (goal: VisionGoal, delta: number) => {
    const currentSpan = (goal.widthSpan || 1) as 1 | 2 | 3;
    const newSpan = Math.max(1, Math.min(3, currentSpan + delta)) as 1 | 2 | 3;
    if (newSpan !== currentSpan) {
      await onSaveGoal({
        ...goal,
        widthSpan: newSpan,
      });
    }
  };

  const handleAdjustHeight = async (goal: VisionGoal, deltaPx: number) => {
    const currentH = goal.customHeight || 320;
    const newH = Math.max(160, Math.min(680, currentH + deltaPx));
    await onSaveGoal({
      ...goal,
      customHeight: newH,
    });
  };

  const handleToggleTextBackground = async (goal: VisionGoal) => {
    const currentHide = Boolean(goal.hideBackground);
    await onSaveGoal({
      ...goal,
      hideBackground: !currentHide,
    });
  };

  const handleChangeTextBgColor = async (goal: VisionGoal, hex: string) => {
    await onSaveGoal({
      ...goal,
      hideBackground: false,
      textBgColor: hex,
      textBgImage: undefined,
    });
    setActiveColorPickerGoalId(null);
  };

  const handleUploadBgTexture = (goal: VisionGoal, file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      await onSaveGoal({
        ...goal,
        hideBackground: false,
        textBgImage: dataUrl,
      });
      setActiveColorPickerGoalId(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDirectUploadPhoto = (goal: VisionGoal, file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      await onSaveGoal({
        ...goal,
        imageUrl: dataUrl,
        imageSource: "user_upload",
        isTextOnly: false,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRotationChange = async (goal: VisionGoal, degrees: number) => {
    const clamped = Math.min(180, Math.max(-180, degrees));
    await onSaveGoal({
      ...goal,
      rotation: clamped,
    });
  };

  const handleSynthesizeManifesto = async () => {
    if (goals.length === 0) return;
    setIsSynthesizing(true);
    try {
      const response = await fetch("/api/synthesize-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals,
          annualTheme: settings?.annualTheme || "Year of Grounded Vitality & Presence",
          userName: settings?.userNameOrMantra || "Seeker",
        }),
      });

      if (!response.ok) throw new Error("Failed to synthesize manifesto");
      const result = await response.json();

      if (result.data?.manifesto) {
        await onSaveSettings({
          manifesto: result.data.manifesto,
          userNameOrMantra: result.data.guidingMantra || settings?.userNameOrMantra,
        });
      }
    } catch (err) {
      console.error("Synthesize manifesto error:", err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const drawRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const exportViaCanvasFallback = async () => {
    let width = 1600;
    let height = 1200;
    if (boardSize === "phone") {
      width = 1080;
      height = 1920;
    } else if (boardSize === "square") {
      width = 1200;
      height = 1200;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvasTheme === "cork") {
      ctx.fillStyle = "#caa782";
    } else if (canvasTheme === "noir") {
      ctx.fillStyle = "#141312";
    } else if (canvasTheme === "clean") {
      ctx.fillStyle = "#fdfbf7";
    } else {
      ctx.fillStyle = "#e8ded2";
    }
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = canvasTheme === "noir" ? "#f5f5f0" : "#292524";
    

    if (settings?.userNameOrMantra) {
      ctx.font = "15px sans-serif";
      ctx.fillStyle = canvasTheme === "noir" ? "#a8a29e" : "#57534e";
      ctx.fillText(`"${settings.userNameOrMantra}"`, width / 2, 135);
    }

    const loadImage = (src: string): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    for (const layout of cardLayouts) {
      const goal = goals.find(g => g.id === layout.id);
      if (!goal) continue;

      const { left, top, width: cardWidth, height: cardHeight } = layout;
      const rotation = goal.rotation || 0;
      const isTextOnlyCard = goal.isTextOnly || !goal.imageUrl;
      const isTransparentText = isTextOnlyCard && goal.hideBackground;

      // Draw card background (if not transparent)
      if (!isTransparentText) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.12)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = canvasTheme === "noir" ? "#1f1e1d" : "#ffffff";
        drawRoundRect(ctx, left, top, cardWidth, cardHeight, 16);
        ctx.fill();
        ctx.restore();
      }

      // Clip and rotate the entire card content
      ctx.save();
      const cx = left + cardWidth / 2;
      const cy = top + cardHeight / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);

      // Draw card content (image or text)
      if (goal.imageUrl) {
        const img = await loadImage(goal.imageUrl);
        if (img) {
          ctx.save();
          drawRoundRect(ctx, left + 6, top + 6, cardWidth - 12, cardHeight - 52, 12);
          ctx.clip();
          const imgW = cardWidth - 12;
          const imgH = cardHeight - 52;
          ctx.drawImage(img, left + 6, top + 6, imgW, imgH);
          ctx.restore();
        }
      } else {
        const effectiveBg = goal.textBgColor || getDefaultTextBg(canvasTheme);
        if (!isTransparentText) {
          ctx.save();
          ctx.fillStyle = effectiveBg;
          drawRoundRect(ctx, left + 6, top + 6, cardWidth - 12, cardHeight - 52, 12);
          ctx.fill();
          ctx.restore();
        }

        let textColor = "#1c1917";
        if (isTransparentText) {
          textColor = canvasTheme === "noir" ? "#f5f5f0" : "#1c1917";
        } else {
          textColor = isDarkBg(effectiveBg) ? "#f5f5f0" : "#1c1917";
        }

        ctx.save();
        ctx.fillStyle = textColor;
        ctx.font = "italic 22px Georgia, serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const lines = goal.title.split("\n");
        const lineHeight = 30;
        const startY = top + (cardHeight - 52) / 2 + 10 - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, idx) => {
          ctx.fillText(line, left + cardWidth / 2, startY + idx * lineHeight);
        });
        ctx.restore();
      }

      // Draw header/title if not transparent
      if (!isTransparentText) {
        ctx.fillStyle = canvasTheme === "noir" ? "#f5f5f0" : "#1c1917";
        ctx.font = "bold 14px Georgia, serif";
        ctx.textAlign = "left";
        ctx.fillText(goal.title, left + 16, top + cardHeight - 20);
      }

      ctx.restore(); // restore rotation transform
    }

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `Vision-Board-${boardSize}-${new Date().getFullYear()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const computeContentBounds = () => {
  if (cardLayouts.length === 0) return null;
  const maxRight = Math.max(...cardLayouts.map(l => l.left + l.width));
  const maxBottom = Math.max(...cardLayouts.map(l => l.top + l.height));
  return {
    width: maxRight + 16,   // match your board padding
    height: maxBottom + 16,
  };
};

const triggerDownload = (dataUrl: string) => {
  const link = document.createElement("a");
  link.download = `Vision-Board-${canvasTheme}-${boardSize}-${new Date().getFullYear()}.png`;
  link.href = dataUrl;
  link.click();
};

const handleExportWallpaper = async () => {
  if (!boardContainerRef.current) return;
  setIsExporting(true);
  setExportSuccess(false);

  try {
    const pixelRatio = 2;
    const fullDataUrl = await toPng(boardContainerRef.current, {
      cacheBust: true,
      skipFonts: true,
      pixelRatio,
      filter: (node) =>
        !(node instanceof HTMLElement && node.classList.contains("no-export")),
      backgroundColor:
        canvasTheme === "cork" ? "#caa782" :
        canvasTheme === "noir" ? "#141312" :
        canvasTheme === "clean" ? "#fdfbf7" : "#e8ded2",
    });

    // ---- gate goes here ----
    if (boardSize === "desktop") {
      const bounds = computeContentBounds();
      if (!bounds) {
        triggerDownload(fullDataUrl);
      } else {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = fullDataUrl;
        });

        const cropW = Math.min(Math.round(bounds.width * pixelRatio), img.width);
        const cropH = Math.min(Math.round(bounds.height * pixelRatio), img.height);

        const canvas = document.createElement("canvas");
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, cropW, cropH, 0, 0, cropW, cropH);

        triggerDownload(canvas.toDataURL("image/png"));
      }
    } else {
      // phone / square: fixed-frame modes, keep as-is, no crop
      triggerDownload(fullDataUrl);
    }
    // ---- end gate ----

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 4000);
  } catch (err) {
    console.warn("toPng failed, falling back to canvas render:", err);
    try {
      await exportViaCanvasFallback();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (fallbackErr) {
      console.error("Canvas fallback export also failed:", fallbackErr);
    }
  } finally {
    setIsExporting(false);
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
        return <Sparkles className="w-3.5 h-3.5" />;
      case "community":
        return <Globe className="w-3.5 h-3.5" />;
      default:
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  const boardContainerClasses = {
    desktop: "w-full",                                   // no aspect-ratio, no overflow-hidden
    phone: "max-w-md mx-auto aspect-[9/16] overflow-hidden",
    square: "max-w-lg mx-auto aspect-square overflow-hidden",
  };

  return (
    <div id="vision-board-root" className="space-y-6">
      {/* Header (unchanged) */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-amber-900/15 shadow-sm">
        <div className="flex items-center bg-amber-900/10 p-1 rounded-xl border border-amber-900/15 text-xs">
          <button
            type="button"
            onClick={() => setMode("view")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
              mode === "view" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600"
            }`}
          >
            <Eye className="w-3.5 h-3.5" /><span>View</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
              mode === "edit" ? "bg-amber-800 text-amber-50 shadow-xs" : "text-stone-600"
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" /><span>Edit</span>
          </button>
        </div>
      
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportWallpaper}
            disabled={isExporting || goals.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-stone-800 border border-amber-900/20 text-xs font-medium disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{exportSuccess ? "Exported!" : "Download"}</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-amber-50 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /><span>Add Life Goal</span>
          </button>
        </div>
      </div>

      {/* Edit Toolbar (unchanged) */}
      {mode === "edit" && (
        <div className="flex flex-col gap-3 bg-white/90 backdrop-blur-xs p-3.5 sm:p-4 rounded-2xl border border-amber-900/15 shadow-sm no-export animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-stone-600 shrink-0">Arrangement:</span>
              <div className="flex items-center gap-1 bg-amber-100/70 p-1 rounded-xl">
                <button
                  id="arrangement-editorial-btn"
                  type="button"
                  onClick={() => setArrangement("editorial")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                    arrangement === "editorial"
                      ? "bg-white text-amber-950 font-semibold shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                  title="Editorial photo wall with tight seamless mosaic tessellation"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-stone-600" />
                  <span>Editorial Mosaic</span>
                </button>

                <button
                  id="arrangement-grid-btn"
                  type="button"
                  onClick={() => setArrangement("grid")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                    arrangement === "grid"
                      ? "bg-white text-amber-950 font-semibold shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                  title="Curated structured card grid"
                >
                  <Frame className="w-3.5 h-3.5 text-stone-600" />
                  <span>Curated Grid</span>
                </button>
              </div>

              <button
                id="shuffle-goals-btn"
                type="button"
                onClick={handleShuffleGoals}
                disabled={goals.length <= 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 text-xs font-semibold transition-all shadow-2xs disabled:opacity-40"
                title="Shuffle card order randomly across the tapestry"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-800" />
                <span>Shuffle Cards</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-600 shrink-0">Filter:</span>
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    statusFilter === "all"
                      ? "bg-white text-stone-900 shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  All ({goals.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("in_motion")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    statusFilter === "in_motion"
                      ? "bg-white text-amber-950 shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  🌱 In Motion ({goals.length - manifestedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("manifested")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    statusFilter === "manifested"
                      ? "bg-emerald-700 text-white shadow-2xs font-semibold"
                      : "text-emerald-800 hover:text-emerald-950"
                  }`}
                >
                  ✨ Manifested ({manifestedCount})
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-stone-500">Frame:</span>
              <div className="flex items-center gap-1 bg-stone-100/90 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFrameStyle("none")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    frameStyle === "none"
                      ? "bg-white text-amber-950 shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                  title="No frame - pure borderless photos"
                >
                  Raw (No Frame)
                </button>
                <button
                  type="button"
                  onClick={() => setFrameStyle("polaroid")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    frameStyle === "polaroid"
                      ? "bg-white text-amber-950 shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                  title="Polaroid with bottom caption area"
                >
                  Polaroid
                </button>
                <button
                  type="button"
                  onClick={() => setFrameStyle("washi_pin")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    frameStyle === "washi_pin"
                      ? "bg-white text-amber-950 shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                  title="Washi tape strips on top"
                >
                  Washi Tape
                </button>
                <button
                  type="button"
                  onClick={() => setFrameStyle("editorial_black")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    frameStyle === "editorial_black"
                      ? "bg-white text-amber-950 shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                  title="Editorial black border"
                >
                  Editorial Black
                </button>
                <button
                  type="button"
                  onClick={() => setFrameStyle("soft_float")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    frameStyle === "soft_float"
                      ? "bg-white text-amber-950 shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                  title="Soft floating shadow with white border"
                >
                  Soft Float
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-stone-500">Canvas:</span>
              <div className="flex items-center gap-1 bg-stone-100/90 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCanvasTheme("linen")}
                  className={`px-2.5 py-1 rounded-lg font-medium ${
                    canvasTheme === "linen" ? "bg-white text-stone-900 shadow-2xs font-semibold" : "text-stone-600"
                  }`}
                >
                  Linen Paper
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasTheme("cork")}
                  className={`px-2.5 py-1 rounded-lg font-medium ${
                    canvasTheme === "cork" ? "bg-white text-stone-900 shadow-2xs font-semibold" : "text-stone-600"
                  }`}
                >
                  Corkboard
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasTheme("noir")}
                  className={`px-2.5 py-1 rounded-lg font-medium ${
                    canvasTheme === "noir" ? "bg-stone-900 text-stone-100 shadow-2xs font-semibold" : "text-stone-600"
                  }`}
                >
                  Dark Noir
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasTheme("clean")}
                  className={`px-2.5 py-1 rounded-lg font-medium ${
                    canvasTheme === "clean" ? "bg-white text-stone-900 shadow-2xs font-semibold" : "text-stone-600"
                  }`}
                >
                  Studio Parchment
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowCaptions(!showCaptions)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  showCaptions ? "bg-amber-100/70 border-amber-300 text-amber-950" : "bg-white text-stone-500 border-stone-200"
                }`}
                title="Show or hide intention title labels over photos"
              >
                {showCaptions ? <Eye className="w-3 h-3 text-amber-800" /> : <EyeOff className="w-3 h-3 text-stone-400" />}
                <span>Captions</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-stone-500">Board Size:</span>
              <div className="flex items-center gap-1 bg-stone-100/90 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBoardSize("desktop")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    boardSize === "desktop"
                      ? "bg-white text-stone-900 shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Desktop
                </button>
                {/*<button
                  type="button"
                  onClick={() => setBoardSize("phone")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    boardSize === "phone"
                      ? "bg-white text-stone-900 shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Phone (9:16)
                </button>
                <button
                  type="button"
                  onClick={() => setBoardSize("square")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    boardSize === "square"
                      ? "bg-white text-stone-900 shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Square (1:1)
                </button>
                */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pillar Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none no-export">
        <button
          type="button"
          onClick={() => setSelectedPillar("all")}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            selectedPillar === "all"
              ? "bg-amber-800 text-amber-50 border-amber-900 shadow-xs"
              : "bg-white text-stone-700 border-amber-900/10 hover:bg-amber-50"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Spheres</span>
        </button>

        {PILLAR_ORDER.map((pKey) => {
          const meta = PILLARS_CONFIG[pKey];
          const isSelected = selectedPillar === pKey;
          const count = goals.filter((g) => g.pillar === pKey).length;
          return (
            <button
              key={pKey}
              type="button"
              onClick={() => setSelectedPillar(pKey)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isSelected
                  ? "bg-amber-800 text-amber-50 border-amber-900 shadow-xs"
                  : "bg-white text-stone-700 border-amber-900/10 hover:bg-amber-50"
              }`}
            >
              <span className={isSelected ? "text-amber-200" : "text-amber-700"}>
                {getPillarIcon(pKey)}
              </span>
              <span>{meta.label}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-amber-950/50 text-amber-200" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {mode === "edit" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-600 px-4 py-2.5 bg-amber-50/90 rounded-2xl border border-amber-900/15 no-export animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Move className="w-3.5 h-3.5 text-amber-800 shrink-0" />
            <span>
              <strong>Direct Drag Sizing:</strong> Drag card <strong>bottom edge</strong> (↕) to adjust height, or drag the <strong>bottom-right corner</strong> (↔/↕) to expand column width. You can also click the <strong>W± / H±</strong> buttons!
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 text-amber-950 font-medium text-[11px]">
            <span>Frame: <strong className="capitalize">{frameStyle.replace("_", " ")}</strong></span>
            <span>•</span>
            <span>Canvas: <strong className="capitalize">{canvasTheme}</strong></span>
            <span>•</span>
            <span>Size: <strong>{boardSize}</strong></span>
          </div>
        </div>
      )}

      {/* Board Container */}
      <div
        ref={boardContainerRef}
        className={boardContainerClasses[boardSize]}
        style={{ position: "relative" }}
      >
        <div
          ref={boardRef}
          id="vision-board-canvas"
          className={`p-3 sm:p-4 rounded-3xl transition-all duration-300 origin-top-left ${
            canvasTheme === "cork"
              ? "bg-[#caa782] border-2 border-[#a9815a] shadow-md relative"
              : canvasTheme === "noir"
              ? "bg-[#141312] text-stone-100 border border-stone-800 shadow-xl"
              : canvasTheme === "clean"
              ? "bg-[#fdfbf7] border border-amber-900/15 shadow-sm"
              : "bg-[#e8ded2] border-2 border-[#d4c3b0] shadow-md relative"
          }`}
          style={{
            transform: `scale(${boardScale})`,
            transformOrigin: "top left",
            width: "100%",
            height: boardHeight > 0 ? boardHeight : "auto",
          }}
        >
          <div className="relative w-full" style={{ height: boardHeight }}>
            {filteredGoals.map((goal) => {
              const layout = cardLayouts.find(l => l.id === goal.id);
              if (!layout) return null;

              const meta = PILLARS_CONFIG[goal.pillar] || PILLARS_CONFIG.health;
              const isManifested = goal.status === "manifested";
              const isDraggingThis = activeDrag?.goalId === goal.id;
              const span = isDraggingThis ? activeDrag.currentSpan : (goal.widthSpan || 1);
              const photoHeight = isDraggingThis ? activeDrag.currentHeight : (goal.customHeight || 300);
              const isTextOnly = goal.isTextOnly || !goal.imageUrl;
              const isTransparentText = isTextOnly && goal.hideBackground;

              const effectiveTextBg = isTextOnly && !isTransparentText
                ? (goal.textBgColor || getDefaultTextBg(canvasTheme))
                : "transparent";
              const textColor = isTextOnly && !isTransparentText && isDarkBg(effectiveTextBg)
                ? "text-stone-100"
                : getTransparentTextColor(canvasTheme);

              const cardHeight = layout.height;
              const cardWidth = layout.width;
              const rotation = goal.rotation || 0;

              // Determine frame classes for the inner rotatable div
              const frameClasses = isTransparentText
                ? "bg-transparent border-none shadow-none"
                : frameStyle === "polaroid"
                ? "bg-white p-2 pb-3 rounded-xs shadow-md hover:shadow-xl rotate-[-0.4deg] hover:rotate-0 border border-stone-200"
                : frameStyle === "editorial_black"
                ? "bg-stone-950 p-2 text-white rounded-none border border-stone-900 shadow-lg"
                : frameStyle === "soft_float"
                ? "bg-white p-2 rounded-2xl shadow-xl hover:shadow-2xl border border-stone-100"
                : arrangement === "editorial"
                ? "bg-stone-900 rounded-none border border-stone-800 hover:border-stone-600 shadow-none text-stone-100"
                : isManifested
                ? "bg-gradient-to-b from-emerald-50/40 to-white rounded-2xl border border-emerald-400/70 shadow-xs hover:shadow-md"
                : "bg-white rounded-2xl border border-amber-900/15 hover:border-amber-900/30 shadow-xs hover:shadow-md";

              return (
                <div
                  key={goal.id}
                  id={`goal-card-${goal.id}`}
                  className="group absolute flex flex-col transition-all duration-200 overflow-visible"
                  style={{
                    top: layout.top,
                    left: layout.left,
                    width: cardWidth,
                    height: cardHeight,
                    position: 'absolute',
                  }}
                >
                  {isDraggingThis && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-4 py-2 rounded-full bg-stone-950/95 text-amber-300 text-xs font-mono font-bold shadow-2xl flex items-center gap-2 pointer-events-none backdrop-blur-md border border-amber-500/50 animate-pulse">
                      <Move className="w-3.5 h-3.5" />
                      <span>↔ {span}x cols wide • ↕ {photoHeight}px high</span>
                    </div>
                  )}

                  {/* Rotatable card (background, border, content, washi tape) */}
                  <div
                    className={`flex flex-col flex-1 overflow-hidden ${frameClasses}`}
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transformOrigin: "center",
                      transition: "transform 0.2s ease",
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    {/* Washi tape decoration (inside rotation) */}
                    {frameStyle === "washi_pin" && !isTransparentText && (
                      <div
                        className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-[#e4d8c5]/90 border border-[#caa782]/50 shadow-2xs rotate-[-1deg] backdrop-blur-2xs z-20 pointer-events-none"
                        style={{
                          clipPath:
                            "polygon(0% 15%, 3% 0%, 97% 0%, 100% 15%, 98% 85%, 95% 100%, 5% 100%, 2% 85%)",
                        }}
                      />
                    )}

                    {/* Header */}
                    <div className="p-1.5 pb-1 flex items-center justify-between border-b border-stone-100/60 text-xs shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`p-0.5 rounded-md text-xs ${meta.colorBadge}`}>
                          {getPillarIcon(goal.pillar)}
                        </span>
                        <span className="font-semibold text-stone-800 text-[10px] truncate max-w-[70px]">
                          {meta.label}
                        </span>
                      </div>

                      {mode === "edit" && (
                        <div className="flex items-center gap-1 no-export">
                          <div className="flex items-center gap-0.5 bg-stone-100/90 dark:bg-stone-800 p-0.5 rounded border border-stone-200/80">
                            <button
                              type="button"
                              onClick={() => handleAdjustWidth(goal, -1)}
                              disabled={span <= 1}
                              className="p-0.5 rounded hover:bg-white text-stone-700 disabled:opacity-30 transition-colors"
                              title="Decrease Width"
                            >
                              <Minus className="w-2 h-2" />
                            </button>
                            <span className="text-[9px] font-bold text-amber-900 px-0.5">
                              {span}x
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustWidth(goal, 1)}
                              disabled={span >= 3}
                              className="p-0.5 rounded hover:bg-white text-stone-700 disabled:opacity-30 transition-colors"
                              title="Increase Width"
                            >
                              <Plus className="w-2 h-2" />
                            </button>
                            <span className="w-px h-2.5 bg-stone-300 mx-0.5" />
                            <button
                              type="button"
                              onClick={() => handleAdjustHeight(goal, -40)}
                              disabled={photoHeight <= 180}
                              className="p-0.5 rounded hover:bg-white text-stone-700 disabled:opacity-30 transition-colors"
                              title="Decrease Height"
                            >
                              <Minus className="w-2 h-2" />
                            </button>
                            <span className="text-[9px] font-mono text-stone-600 px-0.5">
                              {photoHeight}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustHeight(goal, 40)}
                              disabled={photoHeight >= 640}
                              className="p-0.5 rounded hover:bg-white text-stone-700 disabled:opacity-30 transition-colors"
                              title="Increase Height"
                            >
                              <Plus className="w-2 h-2" />
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(goal)}
                        className={`px-1.5 py-0.5 rounded-md text-[8px] font-medium flex items-center gap-0.5 transition-colors ${
                          isManifested
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            : "bg-stone-100 hover:bg-emerald-50 text-stone-500 hover:text-emerald-800"
                        }`}
                        title={isManifested ? "Click to set In Motion" : "Click to mark Manifested"}
                      >
                        <CheckCircle2
                          className={`w-2.5 h-2.5 ${
                            isManifested ? "fill-emerald-600 text-white" : "text-stone-400"
                          }`}
                        />
                        <span>{isManifested ? "✨" : "In Motion"}</span>
                      </button>
                    </div>

                    {/* Visual body */}
                    {!isTextOnly && goal.imageUrl ? (
                      <div
                        className="relative overflow-visible group/pic bg-stone-100 flex items-center justify-center transition-all shrink-0"
                        style={{ height: `${photoHeight}px` }}
                      >
                        <img
                          src={goal.imageUrl}
                          alt={goal.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />

                        {mode === "edit" && (
                          <div className="absolute top-2 left-2 opacity-0 group-hover/pic:opacity-100 transition-opacity bg-stone-900/80 backdrop-blur-xs p-1 rounded-lg flex items-center gap-1 text-[10px] text-white z-10 no-export">
                            <button
                              type="button"
                              onClick={() => handleAdjustHeight(goal, -photoHeight + 220)}
                              className={`px-1.5 py-0.5 rounded ${photoHeight === 220 ? "bg-amber-700 font-bold" : "hover:bg-stone-700"}`}
                            >
                              Short
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustHeight(goal, -photoHeight + 320)}
                              className={`px-1.5 py-0.5 rounded ${photoHeight === 320 ? "bg-amber-700 font-bold" : "hover:bg-stone-700"}`}
                            >
                              Med
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustHeight(goal, -photoHeight + 440)}
                              className={`px-1.5 py-0.5 rounded ${photoHeight === 440 ? "bg-amber-700 font-bold" : "hover:bg-stone-700"}`}
                            >
                              Tall
                            </button>
                          </div>
                        )}

                        <div className="absolute top-2 right-2 opacity-0 group-hover/pic:opacity-100 transition-opacity z-10 no-export">
                          <label
                            htmlFor={`direct-replace-photo-${goal.id}`}
                            className="cursor-pointer px-2 py-1 rounded bg-stone-900/80 hover:bg-stone-900 text-[10px] text-white backdrop-blur-xs flex items-center gap-1 shadow-sm font-medium"
                            title="Upload replacement photo"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Replace</span>
                          </label>
                          <input
                            type="file"
                            id={`direct-replace-photo-${goal.id}`}
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleDirectUploadPhoto(goal, file);
                            }}
                            className="hidden"
                          />
                        </div>

                        {showCaptions && (
                          <div className="absolute inset-x-0 bottom-0 p-2 pt-6 bg-gradient-to-t from-stone-950/85 via-stone-950/40 to-transparent text-white pointer-events-none">
                            <h4 className="text-[11px] sm:text-xs font-serif font-medium leading-snug drop-shadow-sm">
                              {goal.title}
                            </h4>
                            {goal.targetTimeframe && (
                              <span className="text-[9px] text-amber-300 font-mono opacity-90">
                                {goal.targetTimeframe}
                              </span>
                            )}
                          </div>
                        )}

                        {isManifested && (
                          <div className="absolute top-2 right-2 group-hover/pic:hidden px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[9px] font-semibold flex items-center gap-1 shadow-xs z-10">
                            <Sparkles className="w-3 h-3 text-amber-200" />
                            <span>Manifested</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`relative p-4 transition-all flex flex-col justify-between ${
                          isTransparentText
                            ? "bg-transparent"
                            : "rounded-xl border border-amber-900/10 shadow-inner"
                        }`}
                        style={{
                          minHeight: `${Math.max(140, photoHeight * 0.6)}px`,
                          backgroundColor: isTransparentText ? "transparent" : effectiveTextBg,
                          backgroundImage:
                            !isTransparentText && goal.textBgImage ? `url(${goal.textBgImage})` : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        {mode === "edit" && (
                          <div className="flex items-center justify-between gap-2 mb-2 no-export">
                            <button
                              type="button"
                              onClick={() => handleToggleTextBackground(goal)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium border transition-all ${
                                goal.hideBackground
                                  ? "bg-amber-100/90 text-amber-950 border-amber-300 shadow-2xs"
                                  : "bg-white/90 text-stone-700 border-stone-200 hover:bg-stone-50"
                              }`}
                              title={
                                goal.hideBackground
                                  ? "Background is currently removed. Click to keep/show background color or image."
                                  : "Card has background. Click to remove background color and float text transparently."
                              }
                            >
                              {goal.hideBackground ? (
                                <>
                                  <Eye className="w-3 h-3 text-amber-800" />
                                  <span>Keep BG</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3 text-stone-600" />
                                  <span>Remove BG</span>
                                </>
                              )}
                            </button>

                            {!goal.hideBackground && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveColorPickerGoalId(
                                      activeColorPickerGoalId === goal.id ? null : goal.id
                                    )
                                  }
                                  className="p-1 rounded-lg bg-white/90 hover:bg-white text-stone-700 border border-stone-200 text-[9px] flex items-center gap-1 shadow-2xs"
                                  title="Choose background tint or upload paper texture"
                                >
                                  <Palette className="w-3 h-3 text-amber-700" />
                                  <span>Tint</span>
                                </button>

                                {activeColorPickerGoalId === goal.id && (
                                  <div className="absolute right-0 top-full mt-1 z-30 p-2 bg-white rounded-xl shadow-xl border border-stone-200 text-xs w-44 space-y-2">
                                    <span className="text-[9px] font-semibold text-stone-500 uppercase tracking-wider block">
                                      Tint
                                    </span>
                                    <div className="grid grid-cols-3 gap-1">
                                      {QUICK_COLORS.map((c) => (
                                        <button
                                          key={c.hex}
                                          type="button"
                                          onClick={() => handleChangeTextBgColor(goal, c.hex)}
                                          className={`h-5 rounded border text-[8px] font-medium flex items-center justify-center ${
                                            goal.textBgColor === c.hex ? "ring-2 ring-amber-700 font-bold" : ""
                                          }`}
                                          style={{ backgroundColor: c.hex }}
                                        >
                                          <span className={c.hex === "#262422" ? "text-white" : "text-stone-800"}>
                                            {c.label}
                                          </span>
                                        </button>
                                      ))}
                                    </div>

                                    <div className="pt-1 border-t border-stone-100">
                                      <label
                                        htmlFor={`upload-bg-texture-${goal.id}`}
                                        className="cursor-pointer block text-center py-1 px-2 rounded bg-amber-50 hover:bg-amber-100 text-[9px] text-amber-900 font-medium border border-amber-200"
                                      >
                                        Upload Texture
                                      </label>
                                      <input
                                        type="file"
                                        id={`upload-bg-texture-${goal.id}`}
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadBgTexture(goal, file);
                                        }}
                                        className="hidden"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-1 my-auto">
                          <span className="text-[9px] uppercase font-bold tracking-widest opacity-60 block">
                            {goal.targetTimeframe || "2026"} • Intention
                          </span>
                          <h4
                            className={`text-base sm:text-lg font-normal leading-snug ${
                              goal.textFontStyle === "script" || arrangement === "grid"
                                ? "font-serif italic text-xl tracking-wide"
                                : goal.textFontStyle === "sans"
                                ? "font-sans font-semibold"
                                : "font-serif"
                            } ${isTransparentText ? getTransparentTextColor(canvasTheme) : textColor}`}
                          >
                            "{goal.title}"
                          </h4>
                        </div>

                        {mode === "edit" && (
                          <div className="pt-2 flex items-center justify-between text-[10px] opacity-75 no-export">
                            <label
                              htmlFor={`add-photo-to-text-${goal.id}`}
                              className="cursor-pointer text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Upload Photo</span>
                            </label>
                            <input
                              type="file"
                              id={`add-photo-to-text-${goal.id}`}
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDirectUploadPhoto(goal, file);
                              }}
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer – includes rotation slider and manual input */}
                    {mode === "edit" && (
                      <div className="p-0 border-t border-stone-100/60 flex items-center justify-between text-xs no-export shrink-0">
                        <div className="flex items-center gap-1">
                          <RotateCw className="w-3 h-3 text-stone-500" />
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            step="1"
                            value={goal.rotation || 0}
                            onChange={(e) => handleRotationChange(goal, parseInt(e.target.value))}
                            className="w-10 h-1.5 bg-stone-300 rounded-lg appearance-none cursor-pointer"
                          />
                          <input
                            type="number"
                            min="-180"
                            max="180"
                            step="1"
                            value={goal.rotation || 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                handleRotationChange(goal, val);
                              }
                            }}
                            className="w-10 h-5 text-[9px] font-mono text-stone-600 border border-stone-300 rounded px-1 text-center"
                          />
                          <span className="text-[9px] font-mono text-stone-600 w-4">°</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditGoal(goal)}
                            className="p-1 rounded-md hover:bg-amber-100 text-stone-600 hover:text-amber-900 transition-colors"
                            title="Edit Goal"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(goal.id, "left")}
                            disabled={false}
                            className="p-1 rounded hover:bg-stone-100 disabled:opacity-20 transition-colors"
                            title="Move Earlier"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(goal.id, "right")}
                            disabled={false}
                            className="p-1 rounded hover:bg-stone-100 disabled:opacity-20 transition-colors"
                            title="Move Later"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmGoal(goal)}
                            className="p-1 rounded-md hover:bg-rose-100 text-stone-400 hover:text-rose-700 transition-colors"
                            title="Delete Goal"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {mode === "view" && !isTransparentText && (
                      <div className="p-1 border-t border-stone-100/60 flex items-center justify-end text-xs text-stone-500 shrink-0">
                        <span className="text-[9px]">{goal.targetTimeframe || "2026"}</span>
                      </div>
                    )}
                  </div>

                  {/* Drag handles (outside rotation) */}
                  {mode === "edit" && (
                    <>
                      <div
                        onMouseDown={(e) => handleStartDrag(e, goal, "height")}
                        onTouchStart={(e) => handleStartDrag(e, goal, "height")}
                        className="w-full py-1 flex items-center justify-center cursor-ns-resize select-none group/drag hover:bg-amber-100/60 dark:hover:bg-stone-800/80 transition-colors border-t border-dashed border-stone-200/70 no-export shrink-0"
                        title="Click & Drag vertically to resize height"
                      >
                        <div className="flex items-center gap-1 text-[9px] text-stone-400 group-hover/drag:text-amber-800 font-mono">
                          <MoveVertical className="w-2 h-2" />
                          <span className="opacity-0 group-hover/drag:opacity-100 transition-opacity">
                            ↕ Drag Height ({photoHeight}px)
                          </span>
                        </div>
                      </div>

                      <div
                        onMouseDown={(e) => handleStartDrag(e, goal, "corner")}
                        onTouchStart={(e) => handleStartDrag(e, goal, "corner")}
                        className="absolute bottom-1 right-1 w-5 h-5 flex items-center justify-center cursor-se-resize select-none rounded-md bg-stone-900/30 hover:bg-amber-800 text-white shadow-xs z-30 transition-colors no-export"
                        title="Drag corner to resize column width (↔) and height (↕)"
                      >
                        <Maximize2 className="w-2.5 h-2.5" />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals (unchanged) */}
      {showManifestedExplainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#fdfbf7] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-amber-900/20 text-stone-900 relative">
            <button
              type="button"
              onClick={() => setShowManifestedExplainer(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-amber-100/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shadow-2xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-medium text-stone-900">
                  What is "Manifested"?
                </h3>
                <p className="text-xs text-stone-600">The living rhythm of your vision board</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
              <p>A vision board is a living mirror of your unfolding life.</p>
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-900/10 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm">🌱</span>
                  <div>
                    <strong className="text-stone-900">In Motion:</strong> Intentions you are actively nurturing through daily habits, focus, and actions.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm">✨</span>
                  <div>
                    <strong className="text-stone-900">Manifested:</strong> Actualized milestones you have achieved or brought into reality.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-amber-900/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowManifestedExplainer(false)}
                className="px-4 py-2 rounded-xl bg-amber-800 text-amber-50 text-xs font-semibold hover:bg-amber-900 transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 text-stone-900">
            <h3 className="text-base font-serif font-semibold text-stone-900">Remove Intention?</h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Are you sure you want to remove <strong>"{deleteConfirmGoal.title}"</strong> from your vision board?
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeleteConfirmGoal(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteGoal(deleteConfirmGoal.id);
                  setDeleteConfirmGoal(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 transition-colors shadow-xs"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <VisionGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={onSaveGoal}
        initialGoal={editingGoal}
        defaultPillar={modalDefaultPillar}
        settings={settings}
      />

      <VisionProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        settings={settings}
        onSave={onSaveSettings}
      />
    </div>
  );
};