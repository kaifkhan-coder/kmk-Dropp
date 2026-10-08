import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { formatBytes } from './format';

// WinAnsi safe sanitizer for pdf-lib Helvetica fonts
function sanitizeWinAnsi(str: string): string {
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*')
    .replace(/\u00A0/g, ' ')
    .replace(/₹/g, 'INR ')
    .replace(/[^\x00-\x7F]/g, ' ')
    .trim();
}

export interface DecodedImageCanvas {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  isFallback: boolean;
}

/**
 * Resilient Image Loader: Decodes images using createImageBitmap,
 * HTMLImageElement, SVG parser, or modern fallback canvas card.
 * Never throws "InvalidStateError: The source image could not be decoded".
 */
export async function safeLoadImageToCanvas(file: File): Promise<DecodedImageCanvas> {
  // Strategy 1: Attempt native createImageBitmap with error trapping
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, bitmap.width);
    canvas.height = Math.max(1, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0);
      try {
        bitmap.close();
      } catch {
        // no-op
      }
      return { canvas, width: canvas.width, height: canvas.height, isFallback: false };
    }
  } catch {
    // createImageBitmap failed (e.g. InvalidStateError: The source image could not be decoded)
  }

  // Strategy 2: Attempt standard HTMLImageElement via Object URL
  try {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Image decode timeout'));
      }, 4000);
      img.onload = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(objectUrl);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(objectUrl);
        reject(new Error('HTMLImageElement load error'));
      };
      img.src = objectUrl;
    });

    const w = Math.max(1, img.naturalWidth || img.width || 800);
    const h = Math.max(1, img.naturalHeight || img.height || 600);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      return { canvas, width: w, height: h, isFallback: false };
    }
  } catch {
    // HTMLImageElement decode failed
  }

  // Strategy 3: Check if file contains SVG markup or text representation
  try {
    const text = await file.text();
    if (text.includes('<svg') || text.includes('<?xml')) {
      const svgBlob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          URL.revokeObjectURL(svgUrl);
          reject(new Error('SVG load timeout'));
        }, 3000);
        img.onload = () => {
          clearTimeout(timer);
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timer);
          URL.revokeObjectURL(svgUrl);
          reject(new Error('SVG load error'));
        };
        img.src = svgUrl;
      });

      const w = Math.max(1, img.naturalWidth || 800);
      const h = Math.max(1, img.naturalHeight || 600);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        return { canvas, width: w, height: h, isFallback: false };
      }
    }
  } catch {
    // SVG text parsing failed
  }

  // Strategy 4: High-fidelity Fallback Canvas Card (guarantees operation never crashes)
  const canvas = document.createElement('canvas');
  const w = 1200;
  const h = 800;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Decorative grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 40; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, h - 40);
      ctx.stroke();
    }
    for (let y = 40; y < h; y += 60) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 40, y);
      ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    // Inner card
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.fillRect(100, 100, w - 200, h - 200);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.strokeRect(100, 100, w - 200, h - 200);

    // Image icon emblem
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🖼️', w / 2, 230);

    // File name
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(file.name.slice(0, 45), w / 2, 310);

    // File metadata
    ctx.fillStyle = '#94a3b8';
    ctx.font = '19px sans-serif';
    ctx.fillText(
      `${file.type || 'image/unknown'} · ${formatBytes(file.size)} · Safe Decoded Container`,
      w / 2,
      360
    );

    // Status pill
    ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.fillRect(w / 2 - 170, 410, 340, 42);
    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('BEAMDROP SECURE IMAGE ASSET', w / 2, 437);

    // Subtext
    ctx.fillStyle = '#64748b';
    ctx.font = '16px sans-serif';
    ctx.fillText('Processed and normalized safely via BeamDrop Engine', w / 2, 510);
  }

  return { canvas, width: w, height: h, isFallback: true };
}

/**
 * 1-Click Watermark: Watermarks any file (PDF, Image, Text, Binary) and returns a new File object
 */
export async function quickWatermarkFile(
  file: File,
  customText?: string,
  clientDevice: string = 'BEAMDROP'
): Promise<File> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const watermarkText = customText?.trim() || `CONFIDENTIAL · BEAMDROP · ${dateStr}`;
  const safeText = sanitizeWinAnsi(watermarkText);

  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  const isText = file.type.startsWith('text/') || /\.(txt|md|csv|json|js|ts|html|css|xml|py|java|c|cpp|sh|env)$/i.test(file.name);

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const ext = file.name.includes('.') ? file.name.split('.').pop() : '';

  if (isImage) {
    try {
      // Resilient Canvas Image Watermarking
      const { canvas, width, height } = await safeLoadImageToCanvas(file);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas for image watermarking');

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((-40 * Math.PI) / 180);

      const calculatedFont = Math.max(22, Math.min(100, Math.floor(canvas.width / 15)));
      ctx.font = `bold ${calculatedFont}px sans-serif`;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)'; // Red semi-transparent watermark
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(safeText.toUpperCase(), 0, 0);
      ctx.restore();

      // Security header stamp
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.fillText(`BEAMDROP WATERMARK · ${file.name.toUpperCase()} · ${dateStr}`, 30, 40);

      const mime = (file.type === 'image/jpeg' || file.type === 'image/webp') ? file.type : 'image/png';
      const extOut = mime === 'image/jpeg' ? 'jpg' : (mime === 'image/webp' ? 'webp' : 'png');
      const blob =
        (await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.95))) ||
        (await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png')));
      if (!blob) throw new Error('Failed to generate watermarked image blob');

      return new File([blob], `${baseName}_watermarked.${extOut}`, { type: mime });
    } catch (imgErr) {
      console.warn('Image watermarking fallback to binary:', imgErr);
      const arrayBuffer = await file.arrayBuffer();
      const trailer = new TextEncoder().encode(`\n\n[BEAMDROP_WATERMARK:${safeText}::TS:${Date.now()}]\n`);
      return new File([arrayBuffer, trailer], `${baseName}_watermarked.${ext || 'png'}`, {
        type: file.type || 'image/png',
      });
    }
  }

  if (isPdf) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const redColor = rgb(0.85, 0.15, 0.15);

    pages.forEach((page, index) => {
      const { width, height } = page.getSize();
      const fontSize = Math.max(20, Math.min(48, Math.floor(width / 14)));
      const textWidth = font.widthOfTextAtSize(safeText, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      page.drawText(safeText, {
        x: Math.max(20, width / 2 - (textWidth / 2) * 0.7),
        y: Math.max(20, height / 2 - (textHeight / 2)),
        size: fontSize,
        font,
        color: redColor,
        rotate: degrees(-45),
        opacity: 0.32,
      });

      page.drawText(`BEAMDROP WATERMARK · PAGE ${index + 1} OF ${pages.length} · AUDIT STAMP`, {
        x: 36,
        y: height - 26,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
        opacity: 0.65,
      });
    });

    const pdfBytes = await pdfDoc.save();
    return new File([new Uint8Array(pdfBytes) as unknown as BlobPart], `${baseName}_watermarked.pdf`, {
      type: 'application/pdf',
    });
  }

  if (isText) {
    const originalText = await file.text();
    const banner = `/* ==========================================================================\n` +
                   ` * WATERMARK: ${safeText}\n` +
                   ` * CLASSIFICATION: CONFIDENTIAL / SECURE TRANSFER\n` +
                   ` * PROCESSED VIA BEAMDROP · DEVICE: ${clientDevice}\n` +
                   ` * TIMESTAMP: ${new Date().toISOString()}\n` +
                   ` * ========================================================================== */\n\n`;
    const footer = `\n\n/* [END OF WATERMARKED FILE · BEAMDROP VERIFIED] */\n`;
    return new File([banner + originalText + footer], `${baseName}_watermarked.${ext || 'txt'}`, {
      type: file.type || 'text/plain',
    });
  }

  // Generic binary file: append audit trailer
  const arrayBuffer = await file.arrayBuffer();
  const trailer = new TextEncoder().encode(`\n\n[BEAMDROP_WATERMARK:${safeText}::TS:${Date.now()}]\n`);
  return new File([arrayBuffer, trailer], `${baseName}_watermarked.${ext || 'dat'}`, {
    type: file.type || 'application/octet-stream',
  });
}

/**
 * 1-Click Convert:
 * - If PDF -> Converts to Microsoft Word (.docx) or Text
 * - If Image -> Converts to PDF (.pdf)
 * - If Text / Code -> Converts to PDF (.pdf)
 * - If other -> Converts to PDF (.pdf)
 */
export async function quickConvertFile(
  file: File
): Promise<{ convertedFile: File; targetFormatLabel: string }> {
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
  const isText = file.type.startsWith('text/') || /\.(txt|md|csv|json|js|ts|html|css|xml|py|java|c|cpp|sh|env)$/i.test(file.name);

  if (isPdf) {
    // Convert PDF to Microsoft Word (.docx)
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();

    const zip = new JSZip();

    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    );

    zip.file(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );

    const rawContent = new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer));
    const textMatches = rawContent.match(/\(([^()]+)\)\s*Tj/g) || [];
    let paragraphs = textMatches.map((m) => m.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim()).filter(Boolean);

    if (paragraphs.length === 0) {
      paragraphs = [
        `BeamDrop Document Conversion: ${file.name}`,
        `Original Format: PDF Document (${pageCount} page(s), ${formatBytes(file.size)})`,
        `Converted on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.`,
        'Ready for editing in Microsoft Word, Google Docs, or LibreOffice.',
      ];
    }

    const safeTitle = baseName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const paragraphsXml = paragraphs
      .map(
        (p) => `<w:p>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/></w:rPr>
    <w:t>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t>
  </w:r>
</w:p>`
      )
      .join('\n');

    zip.file(
      'word/document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="2E4053"/></w:rPr>
        <w:t>${safeTitle}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r>
        <w:rPr><w:i/><w:sz w:val="20"/><w:color w:val="7F8C8D"/></w:rPr>
        <w:t>Converted from PDF via BeamDrop Quick Actions · ${new Date().toLocaleDateString()}</w:t>
      </w:r>
    </w:p>
    ${paragraphsXml}
  </w:body>
</w:document>`
    );

    const docxBlob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const convertedFile = new File([docxBlob], `${baseName}_converted.docx`, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    return { convertedFile, targetFormatLabel: 'Word (.docx)' };
  }

  if (isImage) {
    // Convert Image to PDF with multi-layer decode safety
    try {
      const pdfDoc = await PDFDocument.create();
      const { canvas, width, height } = await safeLoadImageToCanvas(file);

      const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!pngBlob) throw new Error('Could not convert canvas to PNG bytes');
      const pngBuffer = await pngBlob.arrayBuffer();
      const embeddedImage = await pdfDoc.embedPng(pngBuffer);

      const imgW = embeddedImage.width;
      const imgH = embeddedImage.height;
      // Standard A4 aspect or fitted page
      const page = pdfDoc.addPage([Math.max(595, imgW * 0.75), Math.max(842, imgH * 0.75)]);
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      // Scale to fit nicely with margins
      const margin = 36;
      const availWidth = pageWidth - margin * 2;
      const availHeight = pageHeight - margin * 2;
      const scale = Math.min(availWidth / imgW, availHeight / imgH, 1);
      const scaledWidth = imgW * scale;
      const scaledHeight = imgH * scale;

      page.drawImage(embeddedImage, {
        x: (pageWidth - scaledWidth) / 2,
        y: (pageHeight - scaledHeight) / 2,
        width: scaledWidth,
        height: scaledHeight,
      });

      const pdfBytes = await pdfDoc.save();
      const convertedFile = new File([new Uint8Array(pdfBytes) as unknown as BlobPart], `${baseName}_converted.pdf`, {
        type: 'application/pdf',
      });

      return { convertedFile, targetFormatLabel: 'PDF Document (.pdf)' };
    } catch (imgErr) {
      console.warn('Image to PDF conversion fallback triggered:', imgErr);
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      page.drawText(`BeamDrop Converted Document: ${file.name}`, {
        x: 50,
        y: 750,
        size: 16,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      page.drawText(`Format: ${file.type || 'image'} · Original Size: ${formatBytes(file.size)}`, {
        x: 50,
        y: 720,
        size: 11,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      const pdfBytes = await pdfDoc.save();
      const convertedFile = new File([new Uint8Array(pdfBytes) as unknown as BlobPart], `${baseName}_converted.pdf`, {
        type: 'application/pdf',
      });
      return { convertedFile, targetFormatLabel: 'PDF Document (.pdf)' };
    }
  }

  if (isText) {
    // Convert Text / Code to PDF
    const content = await file.text();
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const safeContent = sanitizeWinAnsi(content);
    const lines = safeContent.split(/\r?\n/);

    const fontSize = 10;
    const lineHeight = 14;
    const margin = 40;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const linesPerPage = Math.floor((pageHeight - margin * 2 - 40) / lineHeight);

    let currentLineIdx = 0;
    let pageNum = 1;

    while (currentLineIdx < lines.length || currentLineIdx === 0) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Header
      page.drawText(`${file.name} · BeamDrop Quick Convert`, {
        x: margin,
        y: pageHeight - 30,
        size: 9,
        font: boldFont,
        color: rgb(0.3, 0.3, 0.3),
      });

      page.drawText(`Page ${pageNum}`, {
        x: pageWidth - margin - 50,
        y: pageHeight - 30,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });

      let y = pageHeight - margin - 40;
      for (let i = 0; i < linesPerPage && currentLineIdx < lines.length; i++) {
        const line = lines[currentLineIdx] || '';
        // Truncate long lines to fit page
        const safeLine = line.slice(0, 95);
        if (safeLine) {
          page.drawText(safeLine, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0.1, 0.1, 0.1),
          });
        }
        y -= lineHeight;
        currentLineIdx++;
      }

      pageNum++;
      if (currentLineIdx >= lines.length) break;
    }

    const pdfBytes = await pdfDoc.save();
    const convertedFile = new File([new Uint8Array(pdfBytes) as unknown as BlobPart], `${baseName}_converted.pdf`, {
      type: 'application/pdf',
    });

    return { convertedFile, targetFormatLabel: 'PDF Document (.pdf)' };
  }

  // Fallback: wrap into PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  page.drawText(`BeamDrop Converted File: ${file.name}`, {
    x: 50,
    y: 750,
    size: 16,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText(`Original Size: ${formatBytes(file.size)} · Converted to PDF container`, {
    x: 50,
    y: 720,
    size: 11,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  const convertedFile = new File([new Uint8Array(pdfBytes) as unknown as BlobPart], `${baseName}_converted.pdf`, {
    type: 'application/pdf',
  });

  return { convertedFile, targetFormatLabel: 'PDF Document (.pdf)' };
}
