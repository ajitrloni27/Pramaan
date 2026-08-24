import React, { useState, useCallback } from 'react';
import './BBoxOverlay.css';
import { CaptureType } from '../context/SessionContext';

export interface BBoxField {
  id: string;
  value: string;
  bbox: [number, number, number, number]; // [x, y, width, height] in PIXELS from Tesseract
  low_conf: boolean;
}

interface BBoxOverlayProps {
  captureType: CaptureType | null;
  captureData: string | null;
  fields: BBoxField[];
  onConfirmField?: (id: string) => void;
}

/**
 * BBoxOverlay — renders OCR bounding boxes over a document image.
 *
 * Coordinate contract (per murgesh.pdf §5.4):
 *   Engine returns bbox: [x, y, w, h] in PIXELS.
 *   This component converts pixels → percentages relative to the image's
 *   naturalWidth / naturalHeight so boxes align regardless of display size.
 *
 * For text-mode presets (no real image), bbox values are already small
 * normalized numbers (e.g., [0, 0, 100, 20]) and we fall through to
 * percentage rendering without conversion.
 */
export const BBoxOverlay: React.FC<BBoxOverlayProps> = ({ captureType, captureData, fields, onConfirmField }) => {
  const isImage = captureType === 'image' || captureType === 'camera' || captureType === 'file';

  // Track the image's natural (intrinsic) pixel dimensions for bbox scaling
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, []);

  /**
   * Convert a pixel bbox → percentage bbox relative to the image.
   * Safety: if imgDims is unavailable OR if the bbox values look like they're
   * already percentage-based (all values ≤ 100), assume they're pre-normalized
   * (text-mode preset path) and use them as-is.
   */
  const toPercent = (bbox: [number, number, number, number]): { left: number; top: number; width: number; height: number } => {
    const [x, y, w, h] = bbox;

    // Heuristic: if any coordinate exceeds 100 or image dimensions are known
    // and any coordinate exceeds them * 0.01 (i.e., clearly pixel-scale), scale
    const looksLikePixels = imgDims && (x > 100 || y > 100 || w > 100 || h > 100 || imgDims.w > 200);

    if (looksLikePixels) {
      return {
        left:   (x / imgDims.w) * 100,
        top:    (y / imgDims.h) * 100,
        width:  (w / imgDims.w) * 100,
        height: (h / imgDims.h) * 100,
      };
    }

    // Fallback: treat as percentage-based (text-mode presets)
    return { left: x, top: y, width: w, height: h };
  };

  // Determine the image source: use captured data (base64/URL) or fallback placeholder
  const imageSrc = isImage && captureData
    ? captureData
    : 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=800&h=1000';

  return (
    <div className="glass-read-screen">
      <div className="glass-filter"></div>
      <div className="glass-overlay"></div>
      <div className="glass-specular"></div>
      <div
        className="glass-content document-container"
        style={{
          paddingBottom: isImage ? '120%' : 'auto',
          minHeight: isImage ? 0 : 200,
        }}
      >
        {isImage ? (
          <img
            src={imageSrc}
            alt="Document"
            className="document-image"
            style={{ filter: 'grayscale(0.5)' }}
            onLoad={handleImageLoad}
          />
        ) : (
          <div style={{ padding: 24, fontSize: 16, lineHeight: 1.6, color: 'var(--glass-text)', opacity: 0.9 }}>
            {captureData || "No text provided"}
          </div>
        )}

        {/* OCR Bounding Boxes — pixel→percentage scaled */}
        {isImage && fields.map(field => {
          const pct = toPercent(field.bbox);
          return (
            <div
              key={field.id}
              className={`ocr-box ${field.low_conf ? 'low-confidence' : 'high-confidence'}`}
              style={{
                left:   `${pct.left}%`,
                top:    `${pct.top}%`,
                width:  `${pct.width}%`,
                height: `${pct.height}%`,
              }}
            >
              {field.low_conf && (
                <div
                  className="tap-to-confirm"
                  onClick={() => onConfirmField && onConfirmField(field.id)}
                >
                  <span>Tap to confirm: {field.value}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
