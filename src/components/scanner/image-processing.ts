import type { ScanMode, ImageAdjustments, EdgeRect } from './types';

/**
 * Core image processing utilities — all client-side via Canvas API.
 */

// ─── Grayscale conversion weights (BT.601) ───
const R_WEIGHT = 0.299;
const G_WEIGHT = 0.587;
const B_WEIGHT = 0.114;

function toGray(r: number, g: number, b: number): number {
  return r * R_WEIGHT + g * G_WEIGHT + b * B_WEIGHT;
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// ─── Apply scan mode filter ───

export function applyScanMode(
  canvas: HTMLCanvasElement,
  mode: ScanMode
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  // Compute statistics
  let sum = 0;
  let min = 255;
  let max = 0;
  const pixelCount = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    const gray = toGray(d[i], d[i + 1], d[i + 2]);
    sum += gray;
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }
  const mean = sum / pixelCount;

  switch (mode) {
    case 'document': {
      // CamScanner-style document enhancement
      // Adaptive threshold with contrast boost + white balance
      const contrastFactor = 1.6;
      const whiteBoost = 20;
      const blackDeepen = 15;

      for (let i = 0; i < d.length; i += 4) {
        const gray = toGray(d[i], d[i + 1], d[i + 2]);
        let v = ((gray - mean) * contrastFactor) + mean;

        // Push whites whiter and blacks blacker
        if (v > mean + 25) v = Math.min(255, v + whiteBoost);
        else if (v < mean - 25) v = Math.max(0, v - blackDeepen);

        v = clamp(v);
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      break;
    }

    case 'photo': {
      // Subtle enhancement: auto-levels + slight saturation boost
      const range = max - min || 1;
      const satBoost = 1.15;
      for (let i = 0; i < d.length; i += 4) {
        // Auto-levels stretch
        d[i] = clamp(((d[i] - min) / range) * 255);
        d[i + 1] = clamp(((d[i + 1] - min) / range) * 255);
        d[i + 2] = clamp(((d[i + 2] - min) / range) * 255);
        // Saturation boost
        const gray = toGray(d[i], d[i + 1], d[i + 2]);
        d[i] = clamp(gray + (d[i] - gray) * satBoost);
        d[i + 1] = clamp(gray + (d[i + 1] - gray) * satBoost);
        d[i + 2] = clamp(gray + (d[i + 2] - gray) * satBoost);
      }
      break;
    }

    case 'bw': {
      // Clean black & white with Otsu-like threshold
      // Build histogram
      const hist = new Uint32Array(256);
      for (let i = 0; i < d.length; i += 4) {
        hist[Math.round(toGray(d[i], d[i + 1], d[i + 2]))]++;
      }

      // Otsu's method
      let bestThreshold = 128;
      let bestVariance = 0;
      let sumAll = 0;
      for (let t = 0; t < 256; t++) sumAll += t * hist[t];
      let sumBg = 0;
      let wBg = 0;
      for (let t = 0; t < 256; t++) {
        wBg += hist[t];
        if (wBg === 0) continue;
        const wFg = pixelCount - wBg;
        if (wFg === 0) break;
        sumBg += t * hist[t];
        const meanBg = sumBg / wBg;
        const meanFg = (sumAll - sumBg) / wFg;
        const variance = wBg * wFg * (meanBg - meanFg) * (meanBg - meanFg);
        if (variance > bestVariance) {
          bestVariance = variance;
          bestThreshold = t;
        }
      }

      for (let i = 0; i < d.length; i += 4) {
        const gray = toGray(d[i], d[i + 1], d[i + 2]);
        const v = gray > bestThreshold ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      break;
    }

    case 'highContrast': {
      // Extreme contrast with edge preservation
      const contrastFactor = 2.5;
      for (let i = 0; i < d.length; i += 4) {
        const gray = toGray(d[i], d[i + 1], d[i + 2]);
        let v = ((gray - 128) * contrastFactor) + 128;
        v = clamp(v);
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      break;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ─── Apply adjustments (brightness, contrast, sharpness) ───

export function applyAdjustments(
  canvas: HTMLCanvasElement,
  adjustments: ImageAdjustments
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;

  const brightnessFactor = adjustments.brightness * 2.55; // -100..100 → -255..255
  const contrastFactor = adjustments.contrast > 0
    ? 1 + adjustments.contrast / 50
    : 1 + adjustments.contrast / 100; // more sensitive reduction

  for (let i = 0; i < d.length; i += 4) {
    // Brightness
    let r = d[i] + brightnessFactor;
    let g = d[i + 1] + brightnessFactor;
    let b = d[i + 2] + brightnessFactor;

    // Contrast
    r = ((r - 128) * contrastFactor) + 128;
    g = ((g - 128) * contrastFactor) + 128;
    b = ((b - 128) * contrastFactor) + 128;

    d[i] = clamp(r);
    d[i + 1] = clamp(g);
    d[i + 2] = clamp(b);
  }

  ctx.putImageData(imageData, 0, 0);

  // Sharpness (unsharp mask via canvas composite)
  if (adjustments.sharpness !== 0) {
    applySharpness(canvas, adjustments.sharpness);
  }

  return canvas;
}

function applySharpness(canvas: HTMLCanvasElement, amount: number): void {
  // Unsharp mask technique: blend with a blurred version
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;

  if (amount > 0) {
    // Sharpen: draw original with increased weight over blurred
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d')!;

    // Draw blurred version
    tCtx.filter = `blur(${Math.max(1, amount / 25)}px)`;
    tCtx.drawImage(canvas, 0, 0);
    tCtx.filter = 'none';

    // Subtract blurred from original (unsharp mask)
    const original = ctx.getImageData(0, 0, width, height);
    const blurred = tCtx.getImageData(0, 0, width, height);
    const od = original.data;
    const bd = blurred.data;
    const strength = amount / 100 * 2;

    for (let i = 0; i < od.length; i += 4) {
      od[i] = clamp(od[i] + (od[i] - bd[i]) * strength);
      od[i + 1] = clamp(od[i + 1] + (od[i + 1] - bd[i + 1]) * strength);
      od[i + 2] = clamp(od[i + 2] + (od[i + 2] - bd[i + 2]) * strength);
    }

    ctx.putImageData(original, 0, 0);
  }
}

// ─── Shadow removal ───

export function removeShadows(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;

  // Simple shadow removal: normalize using local mean in blocks
  const blockSize = Math.max(32, Math.round(Math.min(width, height) / 15));

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      const bw = Math.min(blockSize, width - bx);
      const bh = Math.min(blockSize, height - by);

      // Compute block mean
      let sum = 0;
      let count = 0;
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          const idx = (y * width + x) * 4;
          sum += toGray(d[idx], d[idx + 1], d[idx + 2]);
          count++;
        }
      }
      const blockMean = sum / count;
      const globalTarget = 200; // target white-ish background
      const factor = blockMean > 30 ? globalTarget / blockMean : 1;

      // Apply normalization
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          const idx = (y * width + x) * 4;
          d[idx] = clamp(d[idx] * factor);
          d[idx + 1] = clamp(d[idx + 1] * factor);
          d[idx + 2] = clamp(d[idx + 2] * factor);
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ─── Edge detection for document boundary ───

export function detectDocumentEdges(
  video: HTMLVideoElement,
  tempCanvas: HTMLCanvasElement
): EdgeRect | null {
  const scale = 0.25;
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  if (w < 10 || h < 10) return null;

  tempCanvas.width = w;
  tempCanvas.height = h;
  const ctx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  let minX = w, maxX = 0, minY = h, maxY = 0;
  let edgeCount = 0;
  const margin = Math.round(w * 0.04);

  for (let y = margin; y < h - margin; y++) {
    for (let x = margin; x < w - margin; x++) {
      const idx = (y * w + x) * 4;
      const gray = toGray(d[idx], d[idx + 1], d[idx + 2]);

      const idxR = (y * w + (x + 1)) * 4;
      const idxD = ((y + 1) * w + x) * 4;
      const grayR = toGray(d[idxR], d[idxR + 1], d[idxR + 2]);
      const grayD = toGray(d[idxD], d[idxD + 1], d[idxD + 2]);

      const gradient = Math.abs(gray - grayR) + Math.abs(gray - grayD);

      if (gradient > 28) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        edgeCount++;
      }
    }
  }

  const area = (maxX - minX) * (maxY - minY);
  const minArea = w * h * 0.08;
  const maxArea = w * h * 0.95;

  if (edgeCount < 80 || area < minArea || area > maxArea) return null;
  if (minX >= maxX || minY >= maxY) return null;

  return {
    x: (minX / w) * 100,
    y: (minY / h) * 100,
    w: ((maxX - minX) / w) * 100,
    h: ((maxY - minY) / h) * 100,
  };
}

// ─── Crop image to detected edges ───

export function cropToEdges(
  sourceCanvas: HTMLCanvasElement,
  edges: EdgeRect
): HTMLCanvasElement {
  const sx = (edges.x / 100) * sourceCanvas.width;
  const sy = (edges.y / 100) * sourceCanvas.height;
  const sw = (edges.w / 100) * sourceCanvas.width;
  const sh = (edges.h / 100) * sourceCanvas.height;

  if (sw < 50 || sh < 50) return sourceCanvas;

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = sw;
  cropCanvas.height = sh;
  const ctx = cropCanvas.getContext('2d')!;
  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return cropCanvas;
}

// ─── Rotate image ───

export function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  if (degrees === 0) return canvas;

  const radians = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const newW = Math.round(canvas.width * cos + canvas.height * sin);
  const newH = Math.round(canvas.width * sin + canvas.height * cos);

  const rotated = document.createElement('canvas');
  rotated.width = newW;
  rotated.height = newH;
  const ctx = rotated.getContext('2d')!;
  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(radians);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return rotated;
}

// ─── Full processing pipeline ───

export function processImage(
  imageSrc: string,
  mode: ScanMode,
  adjustments: ImageAdjustments,
  edges: EdgeRect | null,
  doShadowRemoval: boolean
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        // 1. Crop to edges
        if (edges) {
          canvas = cropToEdges(canvas, edges);
        }

        // 2. Shadow removal
        if (doShadowRemoval) {
          canvas = removeShadows(canvas);
        }

        // 3. Apply scan mode
        canvas = applyScanMode(canvas, mode);

        // 4. Apply adjustments
        canvas = applyAdjustments(canvas, adjustments);

        // 5. Rotation
        if (adjustments.rotation !== 0) {
          canvas = rotateCanvas(canvas, adjustments.rotation);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}

// ─── Quick preview (apply mode only, no crop) ───

export function quickPreview(imageSrc: string, mode: ScanMode): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Use smaller size for quick preview
        const maxDim = 800;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        applyScanMode(canvas, mode);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}
