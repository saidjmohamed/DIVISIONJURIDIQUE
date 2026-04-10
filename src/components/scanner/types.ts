export type ScanMode = 'document' | 'photo' | 'bw' | 'highContrast';

export type PageSize = 'a4' | 'a5' | 'letter';

export type ExportFormat = 'pdf' | 'jpg' | 'png';

export type ViewMode = 'menu' | 'camera' | 'preview' | 'pages' | 'export' | 'list';

export interface ScannedPage {
  id: string;
  originalImage: string;
  processedImage: string;
  scanMode: ScanMode;
  timestamp: number;
}

export interface ScanSession {
  id: string;
  name: string;
  pages: ScannedPage[];
  createdAt: number;
}

export interface EdgeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  sharpness: number;
  rotation: number;
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  sharpness: 0,
  rotation: 0,
};

export const SCAN_MODE_LABELS: Record<ScanMode, string> = {
  document: 'وثيقة',
  photo: 'صورة',
  bw: 'أبيض وأسود',
  highContrast: 'تباين عالي',
};

export const PAGE_SIZE_LABELS: Record<PageSize, string> = {
  a4: 'A4',
  a5: 'A5',
  letter: 'Letter',
};

export const PAGE_SIZE_DIMENSIONS: Record<PageSize, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  a5: { w: 148, h: 210 },
  letter: { w: 216, h: 279 },
};
