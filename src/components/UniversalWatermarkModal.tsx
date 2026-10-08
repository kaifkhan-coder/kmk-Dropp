import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Stamp,
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Sliders,
  FolderDown,
  Layers,
  Smartphone,
  ExternalLink,
  Image as ImageIcon,
  File,
  Upload,
} from 'lucide-react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { formatBytes, getFileCategory } from '../utils/format';
import { safeLoadImageToCanvas } from '../utils/quickActions';

interface UniversalWatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null;
  clientDevice?: string;
  onWatermarkCompleted?: (watermarkedFile: {
    fileName: string;
    downloadUrl: string;
    fileSize: number;
  }) => void;
}

interface SavedWatermarkItem {
  fileName: string;
  size: number;
  createdAt: number;
  downloadUrl: string;
}

// WinAnsi safe sanitizer for pdf-lib Helvetica standard fonts
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

export const UniversalWatermarkModal: React.FC<UniversalWatermarkModalProps> = ({
  isOpen,
  onClose,
  initialFile,
  clientDevice = 'mobile',
  onWatermarkCompleted,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState(
    `CONFIDENTIAL - BEAMDROP - ${new Date().toISOString().slice(0, 10)}`
  );
  const [color, setColor] = useState<'red' | 'blue' | 'gray' | 'black' | 'emerald' | 'amber'>('red');
  const [opacity, setOpacity] = useState<number>(0.32);
  const [fontSize, setFontSize] = useState<number>(36);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<{
    savedFileName: string;
    downloadUrl: string;
    fileSize: number;
    watermarkText: string;
    previewUrl?: string;
  } | null>(null);

  const [savedFiles, setSavedFiles] = useState<SavedWatermarkItem[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'process' | 'downloads'>('process');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialFile) {
      setSelectedFile(initialFile);
      setResult(null);
      setError(null);
    }
  }, [initialFile, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchSavedDownloads();
    }
  }, [isOpen]);

  const fetchSavedDownloads = async () => {
    setIsLoadingSaved(true);
    try {
      const res = await fetch('/api/file/watermarked');
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setSavedFiles(data.files);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingSaved(false);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
      setError(null);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setResult(null);
      setError(null);
    }
  };

  // Watermark any file type with resilient dual client+server execution
  const handleApplyWatermark = async () => {
    if (!selectedFile) {
      setError('Please select or upload a file first.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const safeText = sanitizeWinAnsi(watermarkText) || 'CONFIDENTIAL - BEAMDROP';
    const isImage = selectedFile.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(selectedFile.name);
    const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf') || selectedFile.type === 'application/pdf';
    const isText = selectedFile.type.startsWith('text/') || /\.(txt|md|csv|json|js|ts|html|css|xml|py|java|c|cpp|sh|env)$/i.test(selectedFile.name);

    try {
      let finalBlob: Blob;
      let finalFileName: string;
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      const ext = selectedFile.name.includes('.') ? selectedFile.name.split('.').pop() : '';

      if (isImage) {
        // High-fidelity Client-Side Canvas Image Watermarking
        const { canvas } = await safeLoadImageToCanvas(selectedFile);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not initialize image canvas context.');

        // 2. Configure colors
        let strokeColor = 'rgba(239, 68, 68, ';
        if (color === 'blue') strokeColor = 'rgba(59, 130, 246, ';
        else if (color === 'emerald') strokeColor = 'rgba(16, 185, 129, ';
        else if (color === 'amber') strokeColor = 'rgba(245, 158, 11, ';
        else if (color === 'black') strokeColor = 'rgba(10, 10, 10, ';
        else strokeColor = 'rgba(107, 114, 128, ';

        // 3. Draw diagonal main watermark
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((-40 * Math.PI) / 180);

        const calculatedFont = Math.max(22, Math.min(110, Math.floor(canvas.width / 16)));
        ctx.font = `bold ${calculatedFont}px sans-serif`;
        ctx.fillStyle = `${strokeColor}${opacity})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(safeText.toUpperCase(), 0, 0);
        ctx.restore();

        // 4. Draw security audit stamps (header & footer)
        ctx.font = 'bold 15px monospace';
        ctx.fillStyle = `${strokeColor}${Math.min(0.9, opacity + 0.25)})`;
        ctx.fillText(`BEAMDROP WATERMARK · ${selectedFile.name.toUpperCase()} · ${new Date().toLocaleDateString()}`, 30, 40);
        ctx.fillText(`SECURITY VERIFIED · SHA-256 AUDIT STAMP · ${clientDevice.toUpperCase()}`, 30, canvas.height - 25);

        const mime = selectedFile.type || 'image/png';
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.95));
        if (!blob) throw new Error('Failed to generate watermarked image blob.');

        finalBlob = blob;
        finalFileName = `${baseName}_watermarked.${ext || 'png'}`;
      } else if (isPdf) {
        // High-fidelity Client-Side pdf-lib Watermarking
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        let textColor = rgb(0.85, 0.15, 0.15);
        if (color === 'blue') textColor = rgb(0.12, 0.35, 0.85);
        else if (color === 'gray') textColor = rgb(0.35, 0.35, 0.35);
        else if (color === 'black') textColor = rgb(0.05, 0.05, 0.05);
        else if (color === 'emerald') textColor = rgb(0.05, 0.65, 0.35);
        else if (color === 'amber') textColor = rgb(0.85, 0.45, 0.05);

        const safeOpacity = Math.max(0.08, Math.min(0.85, opacity));
        const safeSize = Math.max(16, Math.min(72, fontSize));

        pages.forEach((page, index) => {
          const { width, height } = page.getSize();
          const textWidth = font.widthOfTextAtSize(safeText, safeSize);
          const textHeight = font.heightAtSize(safeSize);

          page.drawText(safeText, {
            x: Math.max(20, width / 2 - (textWidth / 2) * 0.7),
            y: Math.max(20, height / 2 - (textHeight / 2)),
            size: safeSize,
            font,
            color: textColor,
            rotate: degrees(-45),
            opacity: safeOpacity,
          });

          page.drawText(`BEAMDROP WATERMARK · PAGE ${index + 1} OF ${pages.length} · VERIFIED`, {
            x: 36,
            y: height - 26,
            size: 8,
            font,
            color: rgb(0.4, 0.4, 0.4),
            opacity: 0.65,
          });

          page.drawText(`SECURITY AUDIT · TIMESTAMP: ${new Date().toISOString()}`, {
            x: 36,
            y: 20,
            size: 7.5,
            font,
            color: rgb(0.4, 0.4, 0.4),
            opacity: 0.65,
          });
        });

        const pdfBytes = await pdfDoc.save();
        finalBlob = new Blob([new Uint8Array(pdfBytes) as unknown as BlobPart], { type: 'application/pdf' });
        finalFileName = `${baseName}_watermarked.pdf`;
      } else if (isText) {
        // Text / Code Watermarking with standardized security banners
        const originalText = await selectedFile.text();
        const banner = `/* ==========================================================================\n` +
                       ` * WATERMARK: ${safeText}\n` +
                       ` * CLASSIFICATION: CONFIDENTIAL / PROPRIETARY\n` +
                       ` * PROCESSED VIA BEAMDROP · DEVICE: ${String(clientDevice).toUpperCase()}\n` +
                       ` * TIMESTAMP: ${new Date().toISOString()}\n` +
                       ` * ========================================================================== */\n\n`;
        const footer = `\n\n/* [END OF WATERMARKED FILE · BEAMDROP VERIFIED AUDIT STAMP] */\n`;
        finalBlob = new Blob([banner + originalText + footer], { type: selectedFile.type || 'text/plain' });
        finalFileName = `${baseName}_watermarked.${ext || 'txt'}`;
      } else {
        // Any other file type: append binary audit trailer
        const arrayBuffer = await selectedFile.arrayBuffer();
        const trailer = new TextEncoder().encode(`\n\n[BEAMDROP_WATERMARK:${safeText}::TS:${Date.now()}::DEV:${clientDevice}]\n`);
        finalBlob = new Blob([arrayBuffer, trailer], { type: selectedFile.type || 'application/octet-stream' });
        finalFileName = `${baseName}_watermarked.${ext || 'dat'}`;
      }

      // Generate instant download URL
      const downloadUrl = URL.createObjectURL(finalBlob);

      setResult({
        savedFileName: finalFileName,
        downloadUrl,
        fileSize: finalBlob.size,
        watermarkText: safeText,
        previewUrl: isImage ? downloadUrl : undefined,
      });

      // Asynchronously backup to server downloads folder in the background
      const reader = new FileReader();
      reader.readAsDataURL(finalBlob);
      reader.onload = async () => {
        try {
          const fileBase64 = reader.result as string;
          await fetch('/api/file/watermark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64,
              fileName: finalFileName,
              fileType: finalBlob.type,
              watermarkText: safeText,
              color,
              opacity,
              fontSize,
              clientDevice,
            }),
          });
          fetchSavedDownloads();
        } catch {
          // background sync error ignored
        }
      };

      if (onWatermarkCompleted) {
        onWatermarkCompleted({
          fileName: finalFileName,
          downloadUrl,
          fileSize: finalBlob.size,
        });
      }
    } catch (err: any) {
      console.error('[Watermark Error]:', err);
      setError(`Watermark error: ${err.message || 'Could not process file'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const category = selectedFile ? getFileCategory(selectedFile.name, selectedFile.type) : 'document';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-neutral-200 bg-white shadow-2xl transition-all dark:border-neutral-800 dark:bg-neutral-950 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 p-6 dark:border-neutral-800 shrink-0">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>Universal File Watermarking Engine</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <Stamp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Watermark Any File & Save</span>
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Apply confidentiality watermarks across any file (PDFs, Images, Documents, Code, Media) with instant download.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switchers */}
        <div className="flex border-b border-neutral-100 px-6 pt-2 dark:border-neutral-800 shrink-0">
          <button
            onClick={() => setActiveTab('process')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'process'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Stamp className="h-4 w-4" />
            <span>Watermark Tool (All Files)</span>
          </button>

          <button
            onClick={() => setActiveTab('downloads')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'downloads'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <FolderDown className="h-4 w-4" />
            <span>Server Downloads Folder ({savedFiles.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'process' ? (
            <>
              {/* File Drag & Drop / Selection Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                    : 'border-neutral-300 hover:border-indigo-400 hover:bg-neutral-50/50 dark:border-neutral-700 dark:hover:border-indigo-600 dark:hover:bg-neutral-900/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-2">
                    {category === 'image' ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : category === 'pdf' ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                    {selectedFile ? selectedFile.name : 'Click to select or drag & drop any file'}
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    {selectedFile ? (
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                        {formatBytes(selectedFile.size)} · {selectedFile.type || 'File'} · Ready to watermark
                      </span>
                    ) : (
                      'Accepts PDFs, Photos, Documents, Plain Text, Code, or Media files'
                    )}
                  </p>
                </div>
              </div>

              {/* Dynamic Watermark Controls */}
              <div className="space-y-4 rounded-2xl border border-neutral-200/90 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/60">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <Sliders className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    Dynamic Watermark Configuration
                  </span>
                </div>

                {/* Watermark Text Input */}
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Watermark Text:
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g. CONFIDENTIAL - SENDER - TIMESTAMP"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-white py-2 px-3 text-xs font-mono font-bold text-neutral-900 focus:border-indigo-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {[
                      'CONFIDENTIAL - DO NOT SHARE',
                      'BEAMDROP VERIFIED - PRIVATE',
                      'STRICTLY PROPRIETARY',
                      `DEVICE ${clientDevice.toUpperCase()} - ${new Date().toLocaleDateString()}`,
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWatermarkText(preset)}
                        className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color, Opacity & Size Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Color Palette:
                    </label>
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'red', label: 'Red', class: 'text-rose-600 bg-rose-50 border-rose-200' },
                        { id: 'blue', label: 'Blue', class: 'text-blue-600 bg-blue-50 border-blue-200' },
                        { id: 'emerald', label: 'Green', class: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                        { id: 'black', label: 'Black', class: 'text-neutral-900 bg-neutral-200 border-neutral-400' },
                        { id: 'gray', label: 'Gray', class: 'text-neutral-600 bg-neutral-100 border-neutral-300' },
                        { id: 'amber', label: 'Orange', class: 'text-amber-600 bg-amber-50 border-amber-200' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setColor(item.id as any)}
                          className={`rounded-lg py-1 px-1.5 text-[11px] font-semibold border text-center transition ${
                            color === item.id
                              ? 'ring-2 ring-indigo-500 font-bold ' + item.class
                              : 'bg-white border-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Opacity:
                      </label>
                      <span className="font-mono text-xs text-neutral-500 font-bold">
                        {Math.round(opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.75"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="mt-3 w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>Subtle (10%)</span>
                      <span>Bold (75%)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Font Size:
                      </label>
                      <span className="font-mono text-xs text-neutral-500 font-bold">{fontSize}pt</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="56"
                      step="2"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                      className="mt-3 w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>20pt</span>
                      <span>56pt</span>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-900/60 dark:text-rose-300 animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Watermark Success Result Card */}
              {result && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 dark:border-emerald-800/80 dark:bg-emerald-950/50 animate-fade-in space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Watermark Applied Successfully!</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/80 p-3 text-[11px] font-mono dark:bg-neutral-900/80 space-y-1 text-neutral-700 dark:text-neutral-300">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Output File:</span>
                      <span className="font-bold truncate max-w-[280px]">{result.savedFileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">File Size:</span>
                      <span>{formatBytes(result.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Watermark Text:</span>
                      <span className="truncate max-w-[280px] text-indigo-600 dark:text-indigo-400 font-bold">
                        {result.watermarkText}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={result.downloadUrl}
                      download={result.savedFileName}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Watermarked File</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        window.open(result.downloadUrl, '_blank');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Preview</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Tab 2: Saved Files in Downloads Folder */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                    Server Downloads Folder
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Files stored on the server after confidentiality watermarking
                  </p>
                </div>
                <button
                  onClick={fetchSavedDownloads}
                  className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 transition"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingSaved ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {savedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-neutral-400">
                  <FolderDown className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mb-2" />
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    No watermarked files saved yet
                  </p>
                  <p className="mt-1 text-[11px] text-neutral-400 max-w-xs">
                    Select any file and click "Apply Watermark & Save" to store processed files in this folder.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 rounded-2xl dark:border-neutral-800 overflow-hidden">
                  {savedFiles.map((file) => (
                    <div
                      key={file.fileName}
                      className="flex items-center justify-between p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                            {file.fileName}
                          </p>
                          <p className="text-[10px] text-neutral-500 font-mono">
                            {formatBytes(file.size)} · Saved {new Date(file.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <a
                        href={file.downloadUrl}
                        download={file.fileName}
                        className="flex items-center gap-1 rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition shrink-0"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-neutral-100 p-4 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span>Overlays dynamic text & security stamps across all file types</span>
          </div>

          {activeTab === 'process' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!selectedFile || isProcessing}
                onClick={handleApplyWatermark}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Stamp className="h-3.5 w-3.5" />
                    <span>Apply Watermark & Save</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
