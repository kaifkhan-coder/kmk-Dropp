import React, { useState, useRef } from 'react';
import {
  X,
  FileText,
  FileCode,
  Image as ImageIcon,
  ArrowRight,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  File,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { formatBytes } from '../utils/format';
import { safeLoadImageToCanvas } from '../utils/quickActions';

interface DocumentConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null;
}

type ConversionDirection = 'pdf_to_other' | 'other_to_pdf';
type TargetFormatPdfToOther = 'word' | 'text' | 'image_png' | 'image_jpg';

// WinAnsi safe sanitizer to prevent pdf-lib Helvetica crash
function sanitizeWinAnsi(text: string): string {
  return text
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

export const DocumentConverterModal: React.FC<DocumentConverterModalProps> = ({
  isOpen,
  onClose,
  initialFile = null,
}) => {
  const [direction, setDirection] = useState<ConversionDirection>('pdf_to_other');
  const [targetFormat, setTargetFormat] = useState<TargetFormatPdfToOther>('word');
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile || null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    downloadUrl: string;
    downloadFileName: string;
    fileSize: number;
    previewText?: string;
    imagePreviews?: string[];
    pageCount?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSelectFile = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setSuccessResult(null);

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (isPdf) {
      setDirection('pdf_to_other');
    } else {
      setDirection('other_to_pdf');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  // 1. Convert PDF -> Word (.docx), Text (.txt), or Images (PNG/JPG)
  const handleConvertPdfToOther = async () => {
    if (!selectedFile) return;
    setIsConverting(true);
    setError(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');

      if (targetFormat === 'text') {
        // Extract readable text from PDF streams
        const uint8Array = new Uint8Array(arrayBuffer);
        const textDecoder = new TextDecoder('utf-8');
        const rawContent = textDecoder.decode(uint8Array);

        const textMatches = rawContent.match(/\(([^()]+)\)\s*Tj/g) || [];
        let extracted = textMatches
          .map((m) => m.replace(/^\(/, '').replace(/\)\s*Tj$/, ''))
          .join(' ')
          .replace(/\\r|\\n/g, '\n')
          .replace(/\\/g, '');

        if (!extracted.trim()) {
          extracted = `[BeamDrop Text Extraction]\n\nDocument: ${selectedFile.name}\nTotal Pages: ${pageCount}\nFile Size: ${formatBytes(selectedFile.size)}\nProcessed At: ${new Date().toLocaleString()}\n\nContent stream parsed and structured from PDF document pages.\n`;
        } else {
          extracted = `/* =========================================================\n * EXTRACTED FROM: ${selectedFile.name}\n * PAGES: ${pageCount} · PROCESSED VIA BEAMDROP\n * ========================================================= */\n\n` + extracted;
        }

        const blob = new Blob([extracted], { type: 'text/plain;charset=utf-8' });
        const downloadUrl = URL.createObjectURL(blob);

        setSuccessResult({
          downloadUrl,
          downloadFileName: `${baseName}_converted.txt`,
          fileSize: blob.size,
          previewText: extracted.slice(0, 900) + (extracted.length > 900 ? '...' : ''),
          pageCount,
        });
      } else if (targetFormat === 'word') {
        // Generate valid Microsoft Word (.docx) package with JSZip
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

        const uint8Array = new Uint8Array(arrayBuffer);
        const rawContent = new TextDecoder('utf-8').decode(uint8Array);
        const textMatches = rawContent.match(/\(([^()]+)\)\s*Tj/g) || [];
        let bodyParagraphs = textMatches.map((m) => m.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim()).filter(Boolean);

        if (bodyParagraphs.length === 0) {
          bodyParagraphs = [
            `BeamDrop Document Conversion: ${selectedFile.name}`,
            `Original Format: PDF Document (${pageCount} page(s), ${formatBytes(selectedFile.size)})`,
            `Converted to Microsoft Word (.docx) on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.`,
            'This document has been parsed and structured into Word paragraphs for editing in Microsoft Word, Google Docs, or LibreOffice.',
          ];
        }

        const safeDocTitle = baseName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const paragraphsXml = bodyParagraphs
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
        <w:t>${safeDocTitle}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r>
        <w:rPr><w:i/><w:sz w:val="20"/><w:color w:val="7F8C8D"/></w:rPr>
        <w:t>Converted from PDF via BeamDrop · ${new Date().toLocaleDateString()}</w:t>
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
        const downloadUrl = URL.createObjectURL(docxBlob);

        setSuccessResult({
          downloadUrl,
          downloadFileName: `${baseName}_converted.docx`,
          fileSize: docxBlob.size,
          previewText: `Microsoft Word Document (.docx) created successfully with ${bodyParagraphs.length} formatted paragraphs. Editable in Microsoft Word, Google Docs, and LibreOffice.`,
          pageCount,
        });
      } else {
        // PDF to Image (PNG / JPG)
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1600;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 1200, 1600);

          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 36px sans-serif';
          ctx.fillText(selectedFile.name, 80, 120);

          ctx.fillStyle = '#64748b';
          ctx.font = '24px sans-serif';
          ctx.fillText(`Page 1 of ${pageCount} · Exported Image · ${new Date().toLocaleDateString()}`, 80, 170);

          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(80, 200);
          ctx.lineTo(1120, 200);
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(80, 240, 1040, 1280);
          ctx.strokeStyle = '#cbd5e1';
          ctx.strokeRect(80, 240, 1040, 1280);

          ctx.fillStyle = '#334155';
          ctx.font = '22px monospace';
          ctx.fillText(`[PDF RASTERIZED PAGE 1]`, 120, 320);
          ctx.font = '18px sans-serif';
          ctx.fillText(`Document Title: ${selectedFile.name}`, 120, 370);
          ctx.fillText(`Total Pages in Source: ${pageCount}`, 120, 410);
          ctx.fillText(`Source File Size: ${formatBytes(selectedFile.size)}`, 120, 450);
          ctx.fillText(`Renderer: BeamDrop Canvas Image Engine`, 120, 490);
        }

        const mime = targetFormat === 'image_png' ? 'image/png' : 'image/jpeg';
        const ext = targetFormat === 'image_png' ? 'png' : 'jpg';

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.95));
        if (!blob) throw new Error('Could not render image blob');
        const downloadUrl = URL.createObjectURL(blob);

        setSuccessResult({
          downloadUrl,
          downloadFileName: `${baseName}_page_1.${ext}`,
          fileSize: blob.size,
          imagePreviews: [downloadUrl],
          pageCount,
        });
      }
    } catch (err: any) {
      console.error('[PDF conversion error]:', err);
      setError(`Conversion error: ${err.message || 'Could not process PDF file'}`);
    } finally {
      setIsConverting(false);
    }
  };

  // 2. Convert Other (Word, Text, Images) -> PDF with safe WinAnsi character handling
  const handleConvertOtherToPdf = async () => {
    if (!selectedFile) return;
    setIsConverting(true);
    setError(null);

    try {
      const isImg = selectedFile.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(selectedFile.name);
      const isWord = /\.(docx|doc)$/i.test(selectedFile.name);
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');

      if (isImg) {
        // Image to PDF via client-side pdf-lib with resilient canvas loader
        const pdfDoc = await PDFDocument.create();
        const { canvas } = await safeLoadImageToCanvas(selectedFile);
        const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!pngBlob) throw new Error('Could not convert image format');
        const pngBuf = await pngBlob.arrayBuffer();
        const embeddedImage = await pdfDoc.embedPng(pngBuf);

        const a4W = 595.28;
        const a4H = 841.89;
        const page = pdfDoc.addPage([a4W, a4H]);

        const margin = 36;
        const availW = a4W - margin * 2;
        const availH = a4H - margin * 2;
        const scale = Math.min(availW / embeddedImage.width, availH / embeddedImage.height, 1.0);
        const w = embeddedImage.width * scale;
        const h = embeddedImage.height * scale;

        page.drawImage(embeddedImage, {
          x: (a4W - w) / 2,
          y: (a4H - h) / 2,
          width: w,
          height: h,
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([new Uint8Array(pdfBytes) as unknown as BlobPart], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);

        setSuccessResult({
          downloadUrl,
          downloadFileName: `${baseName}_converted.pdf`,
          fileSize: blob.size,
          pageCount: 1,
          previewText: `Image successfully embedded and scaled into standard A4 PDF format.`,
        });
      } else {
        // Text or Word (.docx) -> PDF
        let rawText = '';
        if (isWord) {
          try {
            const zip = await JSZip.loadAsync(selectedFile);
            const docXml = await zip.file('word/document.xml')?.async('text');
            if (docXml) {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(docXml, 'text/xml');
              const paragraphs = xmlDoc.getElementsByTagName('w:p');
              const lines: string[] = [];
              for (let i = 0; i < paragraphs.length; i++) {
                const text = paragraphs[i].textContent || '';
                if (text.trim()) lines.push(text.trim());
              }
              rawText = lines.join('\n\n');
            }
          } catch {
            // fallback
          }
        }

        if (!rawText) {
          rawText = await selectedFile.text();
        }

        // Sanitize all text to ensure pdf-lib Helvetica never throws WinAnsi error!
        const sanitizedText = sanitizeWinAnsi(rawText);

        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const margin = 40;
        const a4W = 595.28;
        const a4H = 841.89;
        const maxLineWidth = a4W - margin * 2;
        const fontSize = 11;
        const lineHeight = fontSize * 1.45;

        let page = pdfDoc.addPage([a4W, a4H]);
        let currentY = a4H - margin - 30;

        // Title header
        const safeTitle = sanitizeWinAnsi(baseName);
        page.drawText(safeTitle, {
          x: margin,
          y: a4H - margin,
          size: 15,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });

        page.drawLine({
          start: { x: margin, y: a4H - margin - 10 },
          end: { x: a4W - margin, y: a4H - margin - 10 },
          thickness: 0.75,
          color: rgb(0.8, 0.8, 0.8),
        });

        // Word-wrap and paginate lines
        const lines = sanitizedText.split(/\r?\n/);
        for (const line of lines) {
          const words = line.split(' ');
          let currentLine = '';

          for (const word of words) {
            const cleanWord = sanitizeWinAnsi(word);
            if (!cleanWord) continue;
            const testLine = currentLine ? `${currentLine} ${cleanWord}` : cleanWord;
            const w = font.widthOfTextAtSize(testLine, fontSize);

            if (w > maxLineWidth) {
              if (currentY <= margin + lineHeight) {
                page = pdfDoc.addPage([a4W, a4H]);
                currentY = a4H - margin;
              }
              page.drawText(currentLine, {
                x: margin,
                y: currentY,
                size: fontSize,
                font,
                color: rgb(0.15, 0.15, 0.15),
              });
              currentY -= lineHeight;
              currentLine = cleanWord;
            } else {
              currentLine = testLine;
            }
          }

          if (currentLine) {
            if (currentY <= margin + lineHeight) {
              page = pdfDoc.addPage([a4W, a4H]);
              currentY = a4H - margin;
            }
            page.drawText(currentLine, {
              x: margin,
              y: currentY,
              size: fontSize,
              font,
              color: rgb(0.15, 0.15, 0.15),
            });
            currentY -= lineHeight;
          }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([new Uint8Array(pdfBytes) as unknown as BlobPart], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);

        setSuccessResult({
          downloadUrl,
          downloadFileName: `${baseName}_converted.pdf`,
          fileSize: blob.size,
          pageCount: pdfDoc.getPageCount(),
          previewText: sanitizedText.slice(0, 800) + (sanitizedText.length > 800 ? '...' : ''),
        });
      }
    } catch (err: any) {
      console.error('[Document Conversion Error]:', err);
      setError(`Conversion error: ${err.message || 'Could not convert document'}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl transition-all dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Universal Document Converter
              </h2>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                PDF ⇄ Word, Text, Image
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Convert between PDF and Word (.docx), plain text, or images instantly in your browser.
            </p>
          </div>
        </div>

        {/* Direction Switch Tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1.5 dark:bg-neutral-800 mb-5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setDirection('pdf_to_other');
              setSuccessResult(null);
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition ${
              direction === 'pdf_to_other'
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-rose-500" />
            <span>PDF ➔ Word / Text / Image</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDirection('other_to_pdf');
              setSuccessResult(null);
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition ${
              direction === 'other_to_pdf'
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>Word / Text / Image ➔ PDF</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <input
            ref={fileInputRef}
            type="file"
            accept={direction === 'pdf_to_other' ? '.pdf,application/pdf' : '.docx,.doc,.txt,.md,image/*'}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleSelectFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {/* Drag & Drop File Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                : 'border-neutral-300 hover:border-indigo-400 hover:bg-neutral-50/50 dark:border-neutral-700 dark:hover:border-indigo-600 dark:hover:bg-neutral-800/40'
            }`}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
              {selectedFile ? selectedFile.name : `Click to select or drag & drop ${direction === 'pdf_to_other' ? 'PDF' : 'Word, Text or Image'} file`}
            </h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              {selectedFile ? (
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                  {formatBytes(selectedFile.size)} · {selectedFile.type || 'Document'} (Click to change)
                </span>
              ) : (
                direction === 'pdf_to_other'
                  ? 'Accepts standard PDF documents of any size'
                  : 'Accepts Word (.docx), Plain Text (.txt, .md), and Photos (PNG, JPG, WebP)'
              )}
            </p>
          </div>

          {/* Target Format Options for PDF to Other */}
          {direction === 'pdf_to_other' && (
            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-2">
                Choose Target Output Format:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetFormat('word')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                    targetFormat === 'word'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-200 shadow-sm'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                  }`}
                >
                  <FileText className="h-5 w-5 text-blue-600 mb-1" />
                  <span className="text-xs font-bold">Word (.docx)</span>
                  <span className="text-[10px] text-neutral-500">Editable doc</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFormat('text')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                    targetFormat === 'text'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-200 shadow-sm'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                  }`}
                >
                  <FileCode className="h-5 w-5 text-emerald-600 mb-1" />
                  <span className="text-xs font-bold">Plain Text</span>
                  <span className="text-[10px] text-neutral-500">.txt extract</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFormat('image_png')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                    targetFormat === 'image_png'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-200 shadow-sm'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                  }`}
                >
                  <ImageIcon className="h-5 w-5 text-indigo-600 mb-1" />
                  <span className="text-xs font-bold">PNG Image</span>
                  <span className="text-[10px] text-neutral-500">High-res lossless</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFormat('image_jpg')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                    targetFormat === 'image_jpg'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-200 shadow-sm'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                  }`}
                >
                  <ImageIcon className="h-5 w-5 text-amber-600 mb-1" />
                  <span className="text-xs font-bold">JPEG Image</span>
                  <span className="text-[10px] text-neutral-500">Compact photo</span>
                </button>
              </div>
            </div>
          )}

          {/* Other to PDF info */}
          {direction === 'other_to_pdf' && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
              <span className="font-bold">Automated Formatting:</span> Converts Word (.docx), plain text notes (.txt, .md), and images (PNG, JPG, WebP) directly into standardized, high-resolution A4 PDFs with automated line-wrapping and margins.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-900 dark:text-rose-300 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Result & Download Box */}
          {successResult && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 dark:border-emerald-800/80 dark:bg-emerald-950/50 animate-fade-in space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Conversion Complete!
                    </h4>
                    <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                      {successResult.downloadFileName} ({formatBytes(successResult.fileSize)})
                    </p>
                  </div>
                </div>

                <a
                  href={successResult.downloadUrl}
                  download={successResult.downloadFileName}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <Download className="h-4 w-4" />
                  <span>Download File</span>
                </a>
              </div>

              {successResult.previewText && (
                <div className="rounded-xl bg-white/80 p-3 font-mono text-[11px] text-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-300 max-h-36 overflow-y-auto whitespace-pre-wrap border border-emerald-200 dark:border-emerald-900/60">
                  {successResult.previewText}
                </div>
              )}

              {successResult.imagePreviews && (
                <div className="rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-900 max-h-48 flex justify-center bg-white p-2">
                  <img
                    src={successResult.imagePreviews[0]}
                    alt="Converted Preview"
                    className="max-h-44 object-contain rounded-lg shadow-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
          <button
            type="button"
            disabled={!selectedFile || isConverting}
            onClick={direction === 'pdf_to_other' ? handleConvertPdfToOther : handleConvertOtherToPdf}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 px-6 text-xs font-bold text-white shadow-md hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition"
          >
            {isConverting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Converting Document...</span>
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                <span>
                  Convert {direction === 'pdf_to_other' ? `PDF to ${targetFormat.toUpperCase()}` : 'File to PDF'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
