// IBM: Docling — PDF/image structured extraction (Ajit)
// Built with IBM Bob — AI SDLC Partner

import type { RunRequest, ExtractedField } from "@pramaan/contracts";
import { applyConfidenceGate } from "../confidence.js";

export async function read(req: RunRequest): Promise<ExtractedField[]> {
  // ═══════════════ AJIT SEAM — START ═══════════════
  try {
    // Guard: reject empty / missing input immediately
    if (!req.image || req.image.trim() === "") return [];

    // Guard: sanity-check base64 size (~10 MB limit unencoded)
    const estimatedBytes = (req.image.length * 3) / 4;
    if (estimatedBytes > 10 * 1024 * 1024) {
      console.warn("[01_read] Input exceeds 10 MB limit — returning [].");
      return [];
    }

    // ── Format detection ──────────────────────────────────────────────────
    const isPdf =
      req.image.startsWith("data:application/pdf") ||
      req.image.startsWith("%PDF") ||
      req.image.toLowerCase().endsWith(".pdf");
    const isImageBase64 = req.image.startsWith("data:image/") || req.image.includes(";base64,");
    const isFilePath = req.image.startsWith("/") || req.image.startsWith("./");

    if (!isImageBase64 && !isFilePath && !isPdf) {
      const lines = req.image.split("\n").map(l => l.trim()).filter(Boolean);
      const textFields: ExtractedField[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        // Skip purely metadata lines (dates, patient names, headers) unless they have monetary or penalty values
        const lower = line.toLowerCase();
        const isHeader = lower.startsWith("patient:") || lower.startsWith("date:") || lower.startsWith("department:") || lower.startsWith("store:") || lower.startsWith("landlord:") || lower.startsWith("tenant:") || lower.startsWith("property:") || lower.startsWith("driver:") || lower.startsWith("platform:") || lower.startsWith("week:") || lower.startsWith("policyholder:") || lower.startsWith("insurer:") || lower.startsWith("hospital:") || lower.startsWith("notice no:") || lower.startsWith("vehicle no:");

        // Extract currency amount / value
        const numMatch = line.match(/(?:₹|INR|Rs\.?|:\s*₹?)\s*([\d,]+(?:\.\d+)?)/i) || 
                         (!isHeader ? line.match(/[:=-]\s*([\d,]+(?:\.\d+)?)/) : null) ||
                         (!isHeader ? line.match(/([\d,]+(?:\.\d+)?)\s*$/) : null);
        
        let value: number | null = null;
        if (numMatch && numMatch[1]) {
          const parsedVal = parseFloat(numMatch[1].replace(/,/g, ""));
          if (!isNaN(parsedVal)) {
            value = parsedVal;
          }
        }

        let unit: ExtractedField["unit"] = null;
        if (lower.includes("per tablet") || lower.includes("/tab") || lower.includes("per strip") || lower.includes("/strip"))
          unit = "per tablet";
        else if (lower.includes("per scan") || lower.includes("/scan"))
          unit = "per scan";
        else if (lower.includes("per day") || lower.includes("/day"))
          unit = "per day";
        else if (lower.includes("per procedure") || lower.includes("/procedure"))
          unit = "per procedure";
        else if (lower.includes("grand total") || lower.includes("total amount") || lower.includes("net payable"))
          unit = "total";

        // If line has an explicit item or number
        if (value !== null || !isHeader) {
          textFields.push({
            text: line,
            value,
            unit,
            bbox: [0, Math.min(100, i * 15), 100, 15] as [number, number, number, number],
            confidence: 0.98,
            low_conf: false
          });
        }
      }

      if (textFields.length > 0) {
        return applyConfidenceGate(textFields);
      }
    }

    if (isPdf) {
      try {
        // Dynamic import — trunk compiles without @docling/core installed.
        // If the package is absent the import throws and we fall through to [].
        const { DoclingProcessor } = await import("@docling/core" as string);
        const processor = new (DoclingProcessor as any)();
        const result = await processor.process(req.image);
        const rawFields = parseDoclingOutput(result);
        console.log(`[01_read] Docling extracted ${rawFields.length} fields from PDF.`);
        return applyConfidenceGate(rawFields);
      } catch (doclingError: any) {
        console.warn(`[01_read] Docling failed, returning [] (Tesseract cannot handle PDFs): ${doclingError.message || "Module not found"}`);
        return [];
      }
    }

    // ── Helper: parse Docling output into ExtractedField[] ───────────────────
    // Defined here (inside seam zone) — used only by the PDF path above.
    function parseDoclingOutput(result: any): ExtractedField[] {
      const fields: ExtractedField[] = [];

      // Number extraction — mirrors the Tesseract path below
      const extractNumber = (text: string): number | null => {
        const m = text.match(/[₹\s]*([\d,]+\.?\d*)/);
        return m ? parseFloat(m[1]!.replace(/,/g, "")) : null;
      };

      // Unit detection — same heuristic as Tesseract path
      const extractUnit = (text: string): ExtractedField["unit"] => {
        const lower = text.toLowerCase();
        if (lower.includes("per tablet") || lower.includes("/tab") || lower.includes("per strip") || lower.includes("/strip"))
          return "per tablet";
        if (lower.includes("per scan") || lower.includes("/scan"))
          return "per scan";
        if (lower.includes("per day") || lower.includes("/day"))
          return "per day";
        if (lower.includes("per procedure") || lower.includes("/procedure"))
          return "per procedure";
        if (lower.includes("grand total") || lower.includes("total amount") || lower.includes("net payable"))
          return "total";
        return null;
      };

      if (result.tables && result.tables.length > 0) {
        for (const table of result.tables) {
          for (const row of table.rows ?? []) {
            const text = (row.cells ?? []).map((c: any) => c.text ?? "").join(" ").trim();
            if (!text) continue;
            const value = extractNumber(text);
            const unit = extractUnit(text);
            const bbox: [number, number, number, number] = row.bbox
              ? [row.bbox.x ?? 0, row.bbox.y ?? 0, row.bbox.w ?? 0, row.bbox.h ?? 0]
              : [0, 0, 0, 0];
            const confidence: number = typeof row.confidence === "number" ? row.confidence : 0.95;
            fields.push({ text, value, unit, bbox, confidence, low_conf: false });
          }
        }
      } else if (result.text) {
        // Fallback: split text into lines, treat each as a field
        const lines: string[] = (result.text as string).split("\n").filter((l: string) => l.trim());
        for (const line of lines) {
          const value = extractNumber(line);
          const unit = extractUnit(line);
          fields.push({ text: line, value, unit, bbox: [0, 0, 0, 0], confidence: 0.90, low_conf: false });
        }
      }

      return fields;
    }

    // ── Image path: Tesseract OCR ─────────────────────────────────────────────
    // Dynamic import — trunk compiles without this dep installed
    const { createWorker } = await import("tesseract.js");

    const worker = await createWorker("eng");

    // Set DPI so that data.blocks is populated (Tesseract 4+ requirement)
    await worker.setParameters({ user_defined_dpi: "70" });

    // Pass { blocks: true } so the block/paragraph/line hierarchy is populated
    const { data } = await worker.recognize(req.image, {}, { blocks: true });
    await worker.terminate();

    // ── Row-grouping helper ──────────────────────────────────────────────────
    // Tesseract's line segmentation can split a single visual row into multiple
    // "line" objects when columns are detected. We instead group all words that
    // share a Y-band (±10 px) into a single logical row, then build one
    // ExtractedField per row. This prevents split-row duplicates on tables.

    interface RawWord {
      text: string;
      confidence: number; // 0-100
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    }

    const allWords: RawWord[] = [];

    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const line of para.lines ?? []) {
          for (const word of line.words ?? []) {
            const t = word.text?.trim() ?? "";
            if (!t) continue;
            allWords.push({
              text: t,
              confidence: word.confidence ?? 0,
              x0: word.bbox?.x0 ?? 0,
              y0: word.bbox?.y0 ?? 0,
              x1: word.bbox?.x1 ?? 0,
              y1: word.bbox?.y1 ?? 0,
            });
          }
        }
      }
    }

    if (allWords.length === 0) return applyConfidenceGate([]);

    // Sort words by vertical centre then horizontal position
    allWords.sort((a, b) => {
      const aCy = (a.y0 + a.y1) / 2;
      const bCy = (b.y0 + b.y1) / 2;
      return aCy !== bCy ? aCy - bCy : a.x0 - b.x0;
    });

    // Cluster words into rows by Y-band tolerance
    const Y_BAND = 10;
    const rows: RawWord[][] = [];
    let currentRow: RawWord[] = [allWords[0]!];

    for (let i = 1; i < allWords.length; i++) {
      const word = allWords[i]!;
      const lastWord = currentRow[currentRow.length - 1]!;
      const lastCy = (lastWord.y0 + lastWord.y1) / 2;
      const thisCy = (word.y0 + word.y1) / 2;

      if (Math.abs(thisCy - lastCy) <= Y_BAND) {
        currentRow.push(word);
      } else {
        rows.push(currentRow);
        currentRow = [word];
      }
    }
    rows.push(currentRow);

    // ── Build one ExtractedField per row ────────────────────────────────────
    const rawFields: ExtractedField[] = [];

    for (const row of rows) {
      const text = row.map((w) => w.text).join(" ").trim();
      if (!text) continue;

      // Minimum confidence across all words in the row
      const confidence =
        Math.min(...row.map((w) => w.confidence)) / 100;

      // Union bounding box of all words in the row
      const x0 = Math.min(...row.map((w) => w.x0));
      const y0 = Math.min(...row.map((w) => w.y0));
      const x1 = Math.max(...row.map((w) => w.x1));
      const y1 = Math.max(...row.map((w) => w.y1));

      // Extract numeric value — handles ₹1,234.56 and plain 1234
      // Never round or correct — use the exact digits as read
      const numMatch = text.match(/[₹\s]*([\d,]+\.?\d*)/);
      const value = numMatch
        ? parseFloat(numMatch[1]!.replace(/,/g, ""))
        : null;

      // Heuristic unit detection — restricted to allowed contract values
      let unit: ExtractedField["unit"] = null;
      const lower = text.toLowerCase();
      if (lower.includes("per tablet") || lower.includes("/tab") || lower.includes("per strip") || lower.includes("/strip"))
        unit = "per tablet";
      else if (lower.includes("per scan") || lower.includes("/scan"))
        unit = "per scan";
      else if (lower.includes("per day") || lower.includes("/day"))
        unit = "per day";
      else if (lower.includes("per procedure") || lower.includes("/procedure"))
        unit = "per procedure";
      else if (lower.includes("grand total") || lower.includes("total amount") || lower.includes("net payable"))
        unit = "total";

      rawFields.push({
        text,
        value,
        unit,
        bbox: [x0, y0, x1 - x0, y1 - y0],
        confidence,
        low_conf: false, // applyConfidenceGate will set this correctly
      });
    }

    return applyConfidenceGate(rawFields);
  } catch (err) {
    console.error("[01_read] OCR failed gracefully on blurry/tilted image:", err);
    return []; // Return empty array to force hold: null
  }
  // ═══════════════ AJIT SEAM — END ══════════════════
}
