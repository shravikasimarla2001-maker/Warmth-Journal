import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  X,
  RotateCw,
  Sparkles,
  Check,
  Trash2,
  Image as ImageIcon,
  Clock,
  Smartphone,
} from "lucide-react";
import {
  compressImageFile,
  captureVideoFrame,
  CompressionOptions,
} from "../utils/imageCompressor";

interface DailyPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  initialPhotoUrl?: string;
  initialCaption?: string;
  onSavePhoto: (photoUrl: string, caption: string) => void;
  onRemovePhoto?: () => void;
}

type FilterType = "natural" | "warm" | "vintage" | "golden" | "monochrome";

export const DailyPhotoModal: React.FC<DailyPhotoModalProps> = ({
  isOpen,
  onClose,
  date,
  initialPhotoUrl,
  initialCaption = "",
  onSavePhoto,
  onRemovePhoto,
}) => {
  const [activeTab, setActiveTab] = useState<"camera" | "upload">(
    initialPhotoUrl ? "upload" : "camera"
  );
  const [capturedImage, setCapturedImage] = useState<string | null>(
    initialPhotoUrl || null
  );
  const [caption, setCaption] = useState<string>(initialCaption || "");
  const [filter, setFilter] = useState<FilterType>("warm");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const userCameraInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream safely
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Track stop error:", e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsInitializing(false);
  };

  // Start in-browser WebRTC camera stream
  const startCamera = async (facing: "user" | "environment" = cameraFacing) => {
    stopCamera();
    setCameraError(null);
    setIsInitializing(true);

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error("Live stream not available in this sandbox. Use Device Camera directly.");
      }

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err1) {
        console.warn("Constraint match failed, attempting facingMode only...", err1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: false,
          });
        } catch (err2) {
          console.warn("FacingMode failed, attempting default video...", err2);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) {
        throw new Error("Could not acquire camera stream.");
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video play error:", playErr);
        }
      }
    } catch (err: any) {
      console.warn("Camera stream access failed:", err);
      const isDenied =
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError" ||
        err.name === "SecurityError";

      setCameraError(
        isDenied
          ? "Camera stream restricted. Click 'Open Device Camera' to capture directly from your device!"
          : "Webcam stream unavailable. Click 'Open Device Camera' to snap photo directly."
      );
      setIsCameraActive(false);
    } finally {
      setIsInitializing(false);
    }
  };

  // Keep stream synced if active
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((e) => console.warn(e));
      }
    }
  }, [isCameraActive, activeTab]);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(initialPhotoUrl || null);
      setCaption(initialCaption || "");
      if (activeTab === "camera" && !initialPhotoUrl) {
        // Attempt web viewfinder gently
        startCamera(cameraFacing);
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Tab switch
  const handleTabChange = (tab: "camera" | "upload") => {
    setActiveTab(tab);
    if (tab === "camera" && !capturedImage) {
      startCamera(cameraFacing);
    } else {
      stopCamera();
    }
  };

  // Flip Camera
  const handleFlipCamera = () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      startCamera(nextFacing);
    }
  };

  // Trigger Device Camera Directly (Native OS Camera App)
  const handleTriggerDeviceCamera = (facing?: "user" | "environment") => {
    const targetFacing = facing || cameraFacing;
    if (targetFacing === "user") {
      userCameraInputRef.current?.click();
    } else {
      nativeCameraInputRef.current?.click();
    }
  };

  // Trigger capture with optional countdown
  const handleTriggerSnap = (withTimer: boolean = false) => {
    if (!isCameraActive) {
      // If WebRTC is not active, immediately open device camera
      handleTriggerDeviceCamera();
      return;
    }

    if (withTimer) {
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            executeSnap();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      executeSnap();
    }
  };

  const executeSnap = () => {
    if (!videoRef.current) {
      handleTriggerDeviceCamera();
      return;
    }
    try {
      const dataUrl = captureVideoFrame(videoRef.current, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.78,
        filter,
        mirror: cameraFacing === "user",
      });
      setCapturedImage(dataUrl);
      stopCamera();
    } catch (err) {
      console.error("Snap error, falling back to device camera:", err);
      handleTriggerDeviceCamera();
    }
  };

  // Handle File Upload or Native Camera Input
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }
    setIsProcessing(true);
    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.75,
        filter,
      });
      setCapturedImage(dataUrl);
      stopCamera();
    } catch (err) {
      console.error("File processing failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Confirm
  const handleConfirmSave = () => {
    if (capturedImage) {
      onSavePhoto(capturedImage, caption.trim());
      onClose();
    }
  };

  // Retake
  const handleRetake = () => {
    setCapturedImage(null);
    if (activeTab === "camera") {
      startCamera(cameraFacing);
    }
  };

  if (!isOpen) return null;

  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString(
    undefined,
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col border border-[#E8DFC8] shadow-2xl overflow-hidden animate-scale-up">
        {/* Hidden Native Camera Inputs (100% Reliable across all browsers/devices) */}
        {/* Environment / Rear camera */}
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileUpload(e.target.files[0]);
            }
            e.target.value = "";
          }}
        />

        {/* User / Front selfie camera */}
        <input
          ref={userCameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileUpload(e.target.files[0]);
            }
            e.target.value = "";
          }}
        />

        {/* Gallery / File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileUpload(e.target.files[0]);
            }
            e.target.value = "";
          }}
        />

        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#FAF7F2] border-b border-[#E8DFC8] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D35400] to-[#F39C12] text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-[#2C241E]">
                Daily Photo Moment
              </h3>
              <p className="text-[11px] text-[#7E6E5F]">
                Anchor your reflection with a visual memory · {formattedDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#8C7B6C] hover:text-[#2C241E] hover:bg-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* If no photo captured yet, show camera / upload choices */}
          {!capturedImage ? (
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex bg-[#FAF7F2] p-1 rounded-xl border border-[#E8DFC8]">
                <button
                  type="button"
                  onClick={() => handleTabChange("camera")}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    activeTab === "camera"
                      ? "bg-white text-[#935116] shadow-xs"
                      : "text-[#7E6E5F] hover:text-[#2C241E]"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Device Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("upload")}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    activeTab === "upload"
                      ? "bg-white text-[#935116] shadow-xs"
                      : "text-[#7E6E5F] hover:text-[#2C241E]"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
              </div>

              {/* Camera Viewfinder & Direct Device Shutter */}
              {activeTab === "camera" && (
                <div className="space-y-3.5">
                  {/* Viewfinder Frame */}
                  <div className="relative aspect-4/3 sm:aspect-square bg-[#2C241E] rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-[#E8DFC8]">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={() => {
                        if (videoRef.current) {
                          videoRef.current.play().catch((e) => console.warn(e));
                        }
                      }}
                      className={`w-full h-full object-cover ${
                        cameraFacing === "user" ? "-scale-x-100" : ""
                      }`}
                    />

                    {/* Countdown Overlay */}
                    {countdown !== null && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30">
                        <span className="text-6xl font-display font-bold text-white animate-ping">
                          {countdown}
                        </span>
                      </div>
                    )}

                    {/* Processing Overlay */}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-30 space-y-2">
                        <div className="w-8 h-8 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold">Processing photo...</span>
                      </div>
                    )}

                    {/* Active Live Stream Controls Overlay */}
                    {isCameraActive && (
                      <>
                        <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium z-10">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Live Viewfinder</span>
                        </div>

                        <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
                          <button
                            type="button"
                            onClick={handleFlipCamera}
                            title="Flip Camera"
                            className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs transition-colors cursor-pointer"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}

                    {/* Fallback / Device Camera Prompt when stream isn't live */}
                    {!isCameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 space-y-3.5 bg-gradient-to-b from-[#2C241E] to-[#1E1712] z-10">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D35400] to-[#F39C12] flex items-center justify-center text-white shadow-lg">
                          <Camera className="w-7 h-7" />
                        </div>

                        <div className="text-center space-y-1 max-w-sm">
                          <h4 className="font-display font-bold text-sm text-white">
                            Take Live Photo with Device Camera
                          </h4>
                          <p className="text-[11px] text-white/75 leading-relaxed">
                            Opens your phone or computer camera instantly to capture today's visual memory.
                          </p>
                        </div>

                        {/* Primary Instant Device Camera Trigger */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 w-full max-w-xs">
                          <button
                            type="button"
                            onClick={() => handleTriggerDeviceCamera("environment")}
                            className="w-full py-2.5 px-4 bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-md transition-all hover:scale-102 flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <Smartphone className="w-4 h-4" />
                            <span>Open Device Camera</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTriggerDeviceCamera("user")}
                            className="w-full sm:w-auto py-2.5 px-3 bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-xl border border-white/20 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                            title="Take selfie using front camera"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Front Selfie</span>
                          </button>
                        </div>

                        {/* Secondary: Try In-Browser WebRTC */}
                        <button
                          type="button"
                          disabled={isInitializing}
                          onClick={() => startCamera(cameraFacing)}
                          className="text-[11px] text-[#E8DFC8] hover:text-white underline transition-colors pt-1 cursor-pointer"
                        >
                          {isInitializing ? "Initializing web viewfinder..." : "Or try in-browser webcam viewfinder"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filter Tone Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#8C7B6C] uppercase tracking-wider block">
                        Warmth Filter Tone
                      </label>
                      <span className="text-[10px] text-[#A8988A] italic">
                        Applied upon capture
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 text-center">
                      {(
                        [
                          { id: "warm", label: "Warm Gold" },
                          { id: "natural", label: "Natural" },
                          { id: "vintage", label: "Vintage" },
                          { id: "golden", label: "Golden Hour" },
                          { id: "monochrome", label: "Calm B&W" },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFilter(f.id)}
                          className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                            filter === f.id
                              ? "bg-[#D35400] text-white border-[#D35400] shadow-xs"
                              : "bg-[#FAF7F2] text-[#6E5D4F] border-[#E8DFC8] hover:bg-white"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shutter Action Buttons */}
                  <div className="flex items-center justify-center space-x-3 pt-1">
                    {isCameraActive ? (
                      <>
                        {/* 3s Timer option commented out */}
                        {/*
                        <button
                          type="button"
                          onClick={() => handleTriggerSnap(true)}
                          className="px-4 py-2.5 bg-[#FAF7F2] hover:bg-[#F5EBE1] border border-[#E8DFC8] text-[#4A3B32] text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 text-[#BA4A00]" />
                          <span>3s Timer</span>
                        </button>
                        */}

                        <button
                          type="button"
                          onClick={() => handleTriggerSnap(false)}
                          className="px-6 py-3 bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:opacity-95 text-white text-sm font-semibold rounded-2xl shadow-md flex items-center space-x-2 transition-all hover:scale-105 cursor-pointer"
                        >
                          <Camera className="w-5 h-5" />
                          <span>Snap Photo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTriggerDeviceCamera()}
                          className="p-3 bg-[#FAF7F2] hover:bg-[#F5EBE1] border border-[#E8DFC8] text-[#4A3B32] rounded-xl transition-colors cursor-pointer"
                          title="Open native device camera app"
                        >
                          <Smartphone className="w-4 h-4 text-[#BA4A00]" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center space-x-2 w-full">
                        <button
                          type="button"
                          onClick={() => handleTriggerDeviceCamera("environment")}
                          className="flex-1 py-3 bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:opacity-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all hover:scale-102 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Take Photo (Device Camera)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTriggerDeviceCamera("user")}
                          className="py-3 px-3.5 bg-[#FAF7F2] hover:bg-[#F5EBE1] border border-[#E8DFC8] text-[#4A3B32] text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0"
                          title="Front Selfie Camera"
                        >
                          <RotateCw className="w-3.5 h-3.5 text-[#BA4A00]" />
                          <span>Selfie</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upload View */}
              {activeTab === "upload" && (
                <div className="space-y-3.5">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className="border-2 border-dashed border-[#E8DFC8] hover:border-[#BA4A00] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3 group"
                  >
                    <div className="w-14 h-14 rounded-full bg-white text-[#BA4A00] flex items-center justify-center mx-auto border border-[#E8DFC8] group-hover:scale-105 transition-transform shadow-xs">
                      <ImageIcon className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#2C241E]">
                        Click to select an image from your device or drag & drop here
                      </p>
                      <p className="text-[11px] text-[#7E6E5F]">
                        Supports JPG, PNG, WEBP · Auto-compressed to warmth polaroid format
                      </p>
                    </div>
                  </div>

                  {/* Filter Tone Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#8C7B6C] uppercase tracking-wider block">
                      Warmth Filter Tone
                    </label>
                    <div className="grid grid-cols-5 gap-1.5 text-center">
                      {(
                        [
                          { id: "warm", label: "Warm Gold" },
                          { id: "natural", label: "Natural" },
                          { id: "vintage", label: "Vintage" },
                          { id: "golden", label: "Golden Hour" },
                          { id: "monochrome", label: "Calm B&W" },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFilter(f.id)}
                          className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                            filter === f.id
                              ? "bg-[#D35400] text-white border-[#D35400] shadow-xs"
                              : "bg-[#FAF7F2] text-[#6E5D4F] border-[#E8DFC8] hover:bg-white"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Polaroid Preview & Caption Card */
            <div className="space-y-4">
              {/* Polaroid Frame */}
              <div className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-[#E8DFC8] shadow-sm max-w-sm mx-auto space-y-3">
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-black/5 border border-[#E8DFC8] relative shadow-inner">
                  <img
                    src={capturedImage}
                    alt="Daily moment"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-xs text-[10px] text-white font-medium">
                    {formattedDate}
                  </div>
                </div>

                {/* Caption in Polaroid */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider block">
                    Moment Caption & Memory
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="e.g. Morning coffee in the quiet sunlight..."
                    maxLength={140}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8DFC8] text-xs text-[#2C241E] placeholder-[#A8988A] focus:outline-none focus:ring-2 focus:ring-[#BA4A00]/30 font-journal italic"
                  />
                </div>
              </div>

              {/* Action Buttons: Retake / Delete / Confirm */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="px-3 py-1.5 text-xs text-[#7E6E5F] hover:text-[#2C241E] hover:bg-[#FAF7F2] rounded-lg border border-[#E8DFC8] transition-colors cursor-pointer"
                  >
                    Retake / Change
                  </button>
                  {initialPhotoUrl && onRemovePhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        onRemovePhoto();
                        onClose();
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="px-5 py-2 bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all hover:scale-102 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Daily Photo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
