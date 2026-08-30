/**
 * Image compression and warm filter utility for Daily Photos
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  filter?: "natural" | "warm" | "vintage" | "monochrome" | "golden";
  mirror?: boolean;
}

export function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.75,
    filter = "natural",
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            width = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not get 2D canvas context"));
          return;
        }

        // Apply warmth filters if requested
        if (filter === "warm") {
          ctx.filter = "sepia(0.2) saturate(1.15) brightness(1.02)";
        } else if (filter === "vintage") {
          ctx.filter = "sepia(0.4) contrast(1.1) brightness(0.95)";
        } else if (filter === "golden") {
          ctx.filter = "sepia(0.25) hue-rotate(-10deg) saturate(1.2)";
        } else if (filter === "monochrome") {
          ctx.filter = "grayscale(1) contrast(1.15) brightness(1.05)";
        } else {
          ctx.filter = "none";
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image file"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export function captureVideoFrame(
  videoElement: HTMLVideoElement,
  options: CompressionOptions = {}
): string {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.78,
    filter = "natural",
    mirror = false,
  } = options;

  const canvas = document.createElement("canvas");
  let width = videoElement.videoWidth || 640;
  let height = videoElement.videoHeight || 480;

  if (width > maxWidth || height > maxHeight) {
    if (width > height) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    } else {
      width = Math.round((width * maxHeight) / height);
      width = maxHeight;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  if (filter === "warm") {
    ctx.filter = "sepia(0.2) saturate(1.15) brightness(1.02)";
  } else if (filter === "vintage") {
    ctx.filter = "sepia(0.4) contrast(1.1) brightness(0.95)";
  } else if (filter === "golden") {
    ctx.filter = "sepia(0.25) hue-rotate(-10deg) saturate(1.2)";
  } else if (filter === "monochrome") {
    ctx.filter = "grayscale(1) contrast(1.15) brightness(1.05)";
  } else {
    ctx.filter = "none";
  }

  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(videoElement, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}
