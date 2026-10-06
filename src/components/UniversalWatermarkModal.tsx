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
} from 'lucide-react';
import { formatBytes, getFileCategory } from '../utils/format';

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

export const UniversalWatermarkModal: React.FC<UniversalWatermarkModalProps> = ({
  isOpen,
  onClose,
  initialFile,
  clientDevice = 'mobile',
  onWatermarkCompleted,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState(
    `CONFIDENTIAL · BEAMDROP · ${new Date().toISOString().slice(0, 10)}`
  );
  const [color, setColor] = useState<'red' | 'blue' | 'gray' | 'black' | 'emerald' | 'amber'>('red');
  const [opacity, setOpacity] = useState<number>(0.32);
  const [fontSize, setFontSize] = useState<number>(36);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    savedFileName: string;
    downloadUrl: string;
    watermarkedBase64: string;
    fileSize: number;
    watermarkText: string;
  } | null>(null);

  const [savedFiles, setSavedFiles] = useState<SavedWatermarkItem[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'process' | 'downloads'>('process');

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
    } catch (e) {
      console.error('Failed to fetch watermarked files:', e);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  // Watermark any file type (PDFs, Images, Documents, Text, etc.)
  const handleApplyWatermark = async () => {
    if (!selectedFile) {
      setError('Please select or upload a file first.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // If it's an image, we can also overlay client-side or send to server
      const isImage = selectedFile.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(selectedFile.name);

      if (isImage) {
        // Image Canvas Watermarking
        const img = new Image();
        img.src = URL.createObjectURL(selectedFile);
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not initialize canvas context');

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Watermark styling
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((-45 * Math.PI) / 180);

            let strokeColor = 'rgba(239, 68, 68, ';
            if (color === 'blue') strokeColor = 'rgba(59, 130, 246, ';
            else if (color === 'emerald') strokeColor = 'rgba(16, 185, 129, ';
            else if (color === 'amber') strokeColor = 'rgba(245, 158, 11, ';
            else if (color === 'black') strokeColor = 'rgba(10, 10, 10, ';
            else strokeColor = 'rgba(107, 114, 128, ';

            const finalFontPx = Math.max(24, Math.min(120, Math.floor(canvas.width / 18)));
            ctx.font = `bold ${finalFontPx}px sans-serif`;
            ctx.fillStyle = `${strokeColor}${opacity})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Draw center diagonal text
            ctx.fillText(watermarkText.toUpperCase(), 0, 0);

            // Additional stamps top and bottom
            ctx.restore();
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = `${strokeColor}${Math.min(1, opacity + 0.2)})`;
            ctx.fillText(`BEAMDROP WATERMARK · ${selectedFile.name.toUpperCase()} · ${new Date().toLocaleDateString()}`, 30, 40);

            const watermarkedDataUrl = canvas.toDataURL(selectedFile.type || 'image/png', 0.92);

            // Also post to server to save in downloads folder
            const res = await fetch('/api/file/watermark', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileBase64: watermarkedDataUrl,
                fileName: selectedFile.name,
                fileType: selectedFile.type || 'image/png',
                watermarkText,
                color,
                opacity,
                fontSize,
                clientDevice,
              }),
            });
            const data = await res.json();

            setResult({
              savedFileName: data.savedFileName || `watermarked_${selectedFile.name}`,
              downloadUrl: data.downloadUrl || watermarkedDataUrl,
              watermarkedBase64: watermarkedDataUrl,
              fileSize: data.fileSize || selectedFile.size,
              watermarkText,
            });

            fetchSavedDownloads();
            if (onWatermarkCompleted) {
              onWatermarkCompleted({
                fileName: data.savedFileName || selectedFile.name,
                downloadUrl: data.downloadUrl || watermarkedDataUrl,
                fileSize: data.fileSize || selectedFile.size,
              });
            }
          } catch (err: any) {
            setError(err.message || 'Error processing image watermark.');
          } finally {
            setIsProcessing(false);
          }
        };
        img.onerror = () => {
          setError('Failed to load image for watermarking.');
          setIsProcessing(false);
        };
        return;
      }

      // For PDFs, Documents, Text, and all other files
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        try {
          const fileBase64 = reader.result as string;

          const res = await fetch('/api/file/watermark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64,
              fileName: selectedFile.name,
              fileType: selectedFile.type || 'application/octet-stream',
              watermarkText,
              color,
              opacity,
              fontSize,
              clientDevice,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to watermark file.');
          }

          setResult(data);
          fetchSavedDownloads();

          if (onWatermarkCompleted) {
            onWatermarkCompleted({
              fileName: data.savedFileName,
              downloadUrl: data.downloadUrl,
              fileSize: data.fileSize,
            });
          }
        } catch (err: any) {
          setError(err.message || 'Error communicating with server.');
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read the local file.');
        setIsProcessing(false);
      };
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsProcessing(false);
    }
  };

  const category = selectedFile ? getFileCategory(selectedFile.name, selectedFile.type) : 'document';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-neutral-200 bg-white shadow-2xl transition-all dark:border-neutral-800 dark:bg-neutral-950">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 p-6 dark:border-neutral-800">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>Universal File Watermarking Engine</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <Stamp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Watermark Any File & Save to Downloads</span>
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Apply dynamic confidentiality watermarks across any file (PDFs, Images, Documents, Code, Media) and automatically save to the server downloads folder.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switchers: Process Watermark vs View Server Downloads Folder */}
        <div className="flex border-b border-neutral-100 px-6 pt-2 dark:border-neutral-800">
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
              {/* File Selection / Upload */}
              <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                      {category === 'image' ? (
                        <ImageIcon className="h-5 w-5" />
                      ) : category === 'pdf' ? (
                        <FileText className="h-5 w-5" />
                      ) : (
                        <File className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {selectedFile ? selectedFile.name : 'No file selected yet'}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {selectedFile
                          ? `${formatBytes(selectedFile.size)} · ${selectedFile.type || 'File'} · Ready to watermark`
                          : 'Select ANY file (PDF, Image, Text, Code, Document) to watermark and save'}
                      </p>
                    </div>
                  </div>

                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition shrink-0">
                    <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{selectedFile ? 'Change File' : 'Select Any File'}</span>
                    <input type="file" onChange={handleFileChange} className="hidden" />
                  </label>
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

                {/* Watermark Text */}
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Watermark Text:
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g. CONFIDENTIAL · SENDER EMAIL · TIMESTAMP"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-white py-2 px-3 text-xs font-mono font-bold text-neutral-900 focus:border-indigo-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {[
                      'CONFIDENTIAL · DO NOT SHARE',
                      'BEAMDROP VERIFIED · PRIVATE',
                      'STRICTLY PROPRIETARY',
                      `DEVICE ${clientDevice.toUpperCase()} · ${new Date().toLocaleDateString()}`,
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

                {/* Color, Opacity & Size */}
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

              {/* Watermark Result Card */}
              {result && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 animate-fade-in space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>File Watermarked & Saved to Server Downloads!</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/80 p-3 text-[11px] font-mono dark:bg-neutral-900/80 space-y-1 text-neutral-700 dark:text-neutral-300">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Saved Filename:</span>
                      <span className="font-bold truncate max-w-[280px]">{result.savedFileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Output Size:</span>
                      <span>{formatBytes(result.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Watermark Applied:</span>
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
                      <span>Preview</span>
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
                    Files saved on the server after dynamic watermarking
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
        <div className="flex items-center justify-between border-t border-neutral-100 p-4 dark:border-neutral-800">
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
                    <span>Watermarking...</span>
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
