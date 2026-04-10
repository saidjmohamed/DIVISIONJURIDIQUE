import type { ScanMode, ImageAdjustments, EdgeRect } from './types';

/**
 * Professional document scanning image processing — CamScanner-quality results.
 * All processing is client-side via Canvas API pixel manipulation.
 *
 * Key techniques:
 * - Background subtraction (divide by blurred version) to remove shadows/uneven lighting
 * - Adaptive thresholding (local mean) for clean document binarization
 * - Box blur (3-pass approximation of Gaussian) for efficient large-radius blurring
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

// ─── Box blur (horizontal + vertical pass) ───
// Three passes of box blur closely approximate Gaussian blur.

function boxBlurH(src: Float32Array, dst: Float32Array, w: number, h: number, r: number): void {
  const diameter = r + r + 1;
  for (let y = 0; y < h; y++) {
    const rowStart = y * w;
    let ti = rowStart;
    let li = rowStart;
    let ri = rowStart + r;

    const fv = src[rowStart];
    const lv = src[rowStart + w - 1];
    let val = (r + 1) * fv;
    for (let j = 0; j < r; j++) val += src[rowStart + Math.min(j, w - 1)];

    for (let j = 0; j <= r; j++) {
      val += src[Math.min(ri, rowStart + w - 1)] - fv;
      dst[ti] = val / diameter;
      ri++;
      ti++;
    }
    for (let j = r + 1; j < w - r; j++) {
      val += src[ri] - src[li];
      dst[ti] = val / diameter;
      li++;
      ri++;
      ti++;
    }
    for (let j = w - r; j < w; j++) {
      val += lv - src[li];
      dst[ti] = val / diameter;
      li++;
      ti++;
    }
  }
}

function boxBlurV(src: Float32Array, dst: Float32Array, w: number, h: number, r: number): void {
  const diameter = r + r + 1;
  for (let x = 0; x < w; x++) {
    let ti = x;
    let li = x;
    let ri = x + r * w;

    const fv = src[x];
    const lv = src[x + w * (h - 1)];
    let val = (r + 1) * fv;
    for (let j = 0; j < r; j++) val += src[x + Math.min(j, h - 1) * w];

    for (let j = 0; j <= r; j++) {
      val += src[Math.min(ri, x + (h - 1) * w)] - fv;
      dst[ti] = val / diameter;
      ri += w;
      ti += w;
    }
    for (let j = r + 1; j < h - r; j++) {
      val += src[ri] - src[li];
      dst[ti] = val / diameter;
      li += w;
      ri += w;
      ti += w;
    }
    for (let j = h - r; j < h; j++) {
      val += lv - src[li];
      dst[ti] = val / diameter;
      li += w;
      ti += w;
    }
  }
}

function gaussianBlurApprox(data: Float32Array, w: number, h: number, radius: number): Float32Array {
  // 3-pass box blur approximation of Gaussian
  const r = Math.max(1, Math.round(radius));
  const temp = new Float32Array(data.length);
  const result = new Float32Array(data.length);
  result.set(data);

  // 3 passes
  for (let pass = 0; pass < 3; pass++) {
    boxBlurH(result, temp, w, h, r);
    boxBlurV(temp, result, w, h, r);
  }
  return result;
}

// ─── Extract grayscale channel from ImageData ───

function extractGrayscale(d: Uint8ClampedArray, pixelCount: number): Float32Array {
  const gray = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    gray[i] = toGray(d[idx], d[idx + 1], d[idx + 2]);
  }
  return gray;
}

// ─── Background subtraction ───
// Divides image by its heavily blurred version to remove shadows and uneven lighting.
// This is the core technique behind CamScanner's clean results.

function backgroundSubtraction(gray: Float32Array, w: number, h: number, blurRadius: number): Float32Array {
  const blurred = gaussianBlurApprox(gray, w, h, blurRadius);
  const result = new Float32Array(gray.length);

  for (let i = 0; i < gray.length; i++) {
    const bg = blurred[i];
    if (bg > 1) {
      // Divide original by background, scale to ~255
      result[i] = Math.min(255, (gray[i] / bg) * 255);
    } else {
      result[i] = 255;
    }
  }

  // Normalize to full 0-255 range
  let min = 255, max = 0;
  for (let i = 0; i < result.length; i++) {
    if (result[i] < min) min = result[i];
    if (result[i] > max) max = result[i];
  }
  const range = max - min || 1;
  for (let i = 0; i < result.length; i++) {
    result[i] = ((result[i] - min) / range) * 255;
  }

  return result;
}

// ─── Adaptive thresholding (local mean) ───
// For each pixel, compare to the mean of surrounding block.
// If significantly darker than local mean → text (black), else → background (white).

function adaptiveThreshold(
  gray: Float32Array,
  w: number,
  h: number,
  blockRadius: number,
  sensitivity: number
): Uint8ClampedArray {
  const localMean = gaussianBlurApprox(gray, w, h, blockRadius);
  const output = new Uint8ClampedArray(gray.length);

  for (let i = 0; i < gray.length; i++) {
    // If pixel is darker than local mean minus sensitivity → it's text
    output[i] = gray[i] < (localMean[i] - sensitivity) ? 0 : 255;
  }

  return output;
}

// ─── Morphological noise cleanup (simple erosion then dilation) ───

function denoiseThresholded(binary: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  // Remove isolated black noise pixels: if a black pixel has fewer than 2 black neighbors, make it white
  const result = new Uint8ClampedArray(binary.length);
  result.set(binary);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (binary[idx] === 0) {
        // Count black neighbors (4-connected)
        let blackNeighbors = 0;
        if (binary[idx - 1] === 0) blackNeighbors++;
        if (binary[idx + 1] === 0) blackNeighbors++;
        if (binary[idx - w] === 0) blackNeighbors++;
        if (binary[idx + w] === 0) blackNeighbors++;
        // Also check diagonals
        if (binary[idx - w - 1] === 0) blackNeighbors++;
        if (binary[idx - w + 1] === 0) blackNeighbors++;
        if (binary[idx + w - 1] === 0) blackNeighbors++;
        if (binary[idx + w + 1] === 0) blackNeighbors++;

        if (blackNeighbors < 2) {
          result[idx] = 255; // Remove isolated noise
        }
      }
    }
  }

  return result;
}

// ─── Apply scan mode filter ───

export function applyScanMode(
  canvas: HTMLCanvasElement,
  mode: ScanMode
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;
  const pixelCount = width * height;

  switch (mode) {
    case 'document': {
      // ── CamScanner-style professional document enhancement ──
      // Pipeline: grayscale → background subtraction → adaptive threshold → denoise

      const gray = extractGrayscale(d, pixelCount);

      // 1. Background subtraction to remove shadows and uneven lighting
      // Use a large blur radius relative to image size
      const blurRadius = Math.max(30, Math.round(Math.min(width, height) / 8));
      const corrected = backgroundSubtraction(gray, width, height, blurRadius);

      // 2. Unsharp mask on corrected image for sharper text edges
      const sharpBlur = gaussianBlurApprox(corrected, width, height, 2);
      const sharpened = new Float32Array(pixelCount);
      const sharpStrength = 1.5;
      for (let i = 0; i < pixelCount; i++) {
        sharpened[i] = clamp(corrected[i] + (corrected[i] - sharpBlur[i]) * sharpStrength);
      }

      // 3. Adaptive thresholding
      // Block radius scales with image size for consistent results
      const blockRadius = Math.max(15, Math.round(Math.min(width, height) / 25));
      const sensitivity = 12; // Lower = more aggressive (more text detected)
      const binary = adaptiveThreshold(sharpened, width, height, blockRadius, sensitivity);

      // 4. Denoise
      const clean = denoiseThresholded(binary, width, height);

      // Write back to image data (pure B&W for document mode)
      for (let i = 0; i < pixelCount; i++) {
        const idx = i * 4;
        d[idx] = d[idx + 1] = d[idx + 2] = clean[i];
      }
      break;
    }

    case 'bw': {
      // ── Aggressive binary B&W ──
      // Same pipeline as document but with more aggressive thresholding

      const gray = extractGrayscale(d, pixelCount);

      // Background subtraction with larger radius
      const blurRadius = Math.max(40, Math.round(Math.min(width, height) / 6));
      const corrected = backgroundSubtraction(gray, width, height, blurRadius);

      // Sharpen
      const sharpBlur = gaussianBlurApprox(corrected, width, height, 2);
      const sharpened = new Float32Array(pixelCount);
      for (let i = 0; i < pixelCount; i++) {
        sharpened[i] = clamp(corrected[i] + (corrected[i] - sharpBlur[i]) * 2.0);
      }

      // More aggressive thresholding (lower sensitivity = more black)
      const blockRadius = Math.max(12, Math.round(Math.min(width, height) / 30));
      const sensitivity = 8;
      const binary = adaptiveThreshold(sharpened, width, height, blockRadius, sensitivity);

      const clean = denoiseThresholded(binary, width, height);

      for (let i = 0; i < pixelCount; i++) {
        const idx = i * 4;
        d[idx] = d[idx + 1] = d[idx + 2] = clean[i];
      }
      break;
    }

    case 'highContrast': {
      // ── High contrast with partial color preservation ──
      // Background subtraction + extreme contrast, keeping color info for stamps/seals

      const gray = extractGrayscale(d, pixelCount);

      // Background correction
      const blurRadius = Math.max(30, Math.round(Math.min(width, height) / 8));
      const blurred = gaussianBlurApprox(gray, width, height, blurRadius);

      // Compute per-pixel correction factor
      for (let i = 0; i < pixelCount; i++) {
        const idx = i * 4;
        const bg = blurred[i] > 1 ? blurred[i] : 1;
        const factor = 220 / bg; // Normalize background to near-white

        // Apply correction to each channel (preserves color)
        let r = d[idx] * factor;
        let g = d[idx + 1] * factor;
        let b = d[idx + 2] * factor;

        // Extreme contrast: push toward white or black
        const grayVal = toGray(r, g, b);
        const contrastFactor = 3.0;

        if (grayVal > 180) {
          // Background: push to white
          r = Math.min(255, r + (255 - r) * 0.8);
          g = Math.min(255, g + (255 - g) * 0.8);
          b = Math.min(255, b + (255 - b) * 0.8);
        } else {
          // Foreground: boost contrast and saturation for colored elements
          r = clamp(128 + (r - 128) * contrastFactor);
          g = clamp(128 + (g - 128) * contrastFactor);
          b = clamp(128 + (b - 128) * contrastFactor);

          // Boost saturation on dark areas (stamps, signatures)
          const newGray = toGray(r, g, b);
          const satBoost = 1.8;
          r = clamp(newGray + (r - newGray) * satBoost);
          g = clamp(newGray + (g - newGray) * satBoost);
          b = clamp(newGray + (b - newGray) * satBoost);
        }

        d[idx] = clamp(r);
        d[idx + 1] = clamp(g);
        d[idx + 2] = clamp(b);
      }
      break;
    }

    case 'photo': {
      // ── Subtle photo enhancement only ──
      // Auto-levels + slight saturation + brightness boost

      // Compute stats
      let min = 255, max = 0;
      for (let i = 0; i < d.length; i += 4) {
        const gray = toGray(d[i], d[i + 1], d[i + 2]);
        if (gray < min) min = gray;
        if (gray > max) max = gray;
      }
      const range = max - min || 1;
      const satBoost = 1.15;
      const brightnessAdd = 10;

      for (let i = 0; i < d.length; i += 4) {
        // Auto-levels stretch
        let r = ((d[i] - min) / range) * 255 + brightnessAdd;
        let g = ((d[i + 1] - min) / range) * 255 + brightnessAdd;
        let b = ((d[i + 2] - min) / range) * 255 + brightnessAdd;

        // Saturation boost
        const gray = toGray(r, g, b);
        r = gray + (r - gray) * satBoost;
        g = gray + (g - gray) * satBoost;
        b = gray + (b - gray) * satBoost;

        d[i] = clamp(r);
        d[i + 1] = clamp(g);
        d[i + 2] = clamp(b);
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
    : 1 + adjustments.contrast / 100;

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
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;

  if (amount > 0) {
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

// ─── Shadow removal (improved with background subtraction) ───

export function removeShadows(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;
  const pixelCount = width * height;

  // Extract per-channel data
  const rChan = new Float32Array(pixelCount);
  const gChan = new Float32Array(pixelCount);
  const bChan = new Float32Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    rChan[i] = d[idx];
    gChan[i] = d[idx + 1];
    bChan[i] = d[idx + 2];
  }

  // Background subtraction per channel (removes shadows while preserving color)
  const blurRadius = Math.max(40, Math.round(Math.min(width, height) / 6));

  const rBlurred = gaussianBlurApprox(rChan, width, height, blurRadius);
  const gBlurred = gaussianBlurApprox(gChan, width, height, blurRadius);
  const bBlurred = gaussianBlurApprox(bChan, width, height, blurRadius);

  const targetBrightness = 230; // Target background brightness

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const rBg = rBlurred[i] > 1 ? rBlurred[i] : 1;
    const gBg = gBlurred[i] > 1 ? gBlurred[i] : 1;
    const bBg = bBlurred[i] > 1 ? bBlurred[i] : 1;

    d[idx] = clamp((rChan[i] / rBg) * targetBrightness);
    d[idx + 1] = clamp((gChan[i] / gBg) * targetBrightness);
    d[idx + 2] = clamp((bChan[i] / bBg) * targetBrightness);
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

        // 2. Shadow removal (for photo/highContrast modes; document/bw have built-in background subtraction)
        if (doShadowRemoval && mode !== 'document' && mode !== 'bw') {
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
