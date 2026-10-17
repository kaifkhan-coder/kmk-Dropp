import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  File,
  FileText,
  Image as ImageIcon,
  Archive,
  Music,
  Video,
  Code,
  Trash2,
  Copy,
  Check,
  Download,
  Share2,
  QrCode,
  Clock,
  KeyRound,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Laptop,
  Layers,
  Send,
  Zap,
} from 'lucide-react';
import QRCode from 'qrcode';
import { formatBytes, getFileCategory } from '../utils/format';
import { soundFx } from '../utils/soundEffects';

interface SelectedFileItem {
  file: File;
  name: string;
  size: number;
  type: string;
}

interface CodeTransferInfo {
  code: string;
  formattedCode: string;
  senderDeviceName?: string;
  filesCount: number;
  totalSize: number;
  createdAt: number;
  expiresAt: number;
  files: { name: string; size: number; type: string }[];
}

interface CodeTransferSectionProps {
  myDeviceName?: string;
  initialCode?: string;
  initialMode?: 'send' | 'receive';
  onFileDownloaded?: (name: string, size: number) => void;
  onSwitchToSendTab?: () => void;
}

export const CodeTransferSection: React.FC<CodeTransferSectionProps> = ({
  myDeviceName = 'My Device',
  initialCode = '',
  initialMode = 'send',
  onFileDownloaded,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'send' | 'receive'>(initialMode);

  // --- SEND STATE ---
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState<string>('15:00');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- RECEIVE STATE ---
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [retrievedPackage, setRetrievedPackage] = useState<CodeTransferInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Initialize with initialCode if provided via URL
  useEffect(() => {
    if (initialCode && initialCode.trim()) {
      const clean = initialCode.replace(/\D/g, '').slice(0, 6);
      if (clean.length === 6) {
        setActiveSubTab('receive');
        const digits = clean.split('');
        setCodeDigits(digits);
        handleLookupCode(clean);
      }
    }
  }, [initialCode]);

  // Countdown timer for active code
  useEffect(() => {
    if (!codeExpiresAt) return;

    const interval = setInterval(() => {
      const remainingMs = codeExpiresAt - Date.now();
      if (remainingMs <= 0) {
        setTimeLeftStr('Expired');
        clearInterval(interval);
      } else {
        const totalSecs = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeftStr(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [codeExpiresAt]);

  // Helper to read file as Base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Add files to selection
  const handleAddFiles = (files: FileList | File[]) => {
    setSendError(null);
    const newItems: SelectedFileItem[] = [];
    let currentTotal = selectedFiles.reduce((acc, f) => acc + f.size, 0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (currentTotal + file.size > 50 * 1024 * 1024) {
        setSendError('Total file size cannot exceed 50MB for 6-digit code transfer.');
        break;
      }
      currentTotal += file.size;
      newItems.push({
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
      });
    }

    if (newItems.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newItems]);
      soundFx.playSound('click');
      soundFx.triggerHaptic('light');
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
    soundFx.playSound('click');
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
    setGeneratedCode(null);
    setCodeExpiresAt(null);
    setQrCodeDataUrl(null);
    setSendError(null);
  };

  // Generate 6-Digit Transfer Code
  const handleGenerateCode = async () => {
    if (selectedFiles.length === 0) {
      setSendError('Please select at least one file to transfer.');
      return;
    }

    setIsGenerating(true);
    setSendError(null);
    soundFx.playSound('beam');
    soundFx.triggerHaptic('medium');

    try {
      const preparedFiles = await Promise.all(
        selectedFiles.map(async (item) => {
          const dataBase64 = await readFileAsBase64(item.file);
          return {
            name: item.name,
            size: item.size,
            type: item.type,
            dataBase64,
          };
        })
      );

      const res = await fetch('/api/code-transfer/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: preparedFiles,
          senderDeviceName: myDeviceName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate transfer code');
      }

      setGeneratedCode(data.code);
      setCodeExpiresAt(data.expiresAt);

      // Generate QR Code for mobile retrieval
      const downloadLink = `${window.location.origin}/?code=${data.code}#code-transfer`;
      try {
        const qrData = await QRCode.toDataURL(downloadLink, {
          width: 240,
          margin: 1,
          color: { dark: '#09090b', light: '#ffffff' },
        });
        setQrCodeDataUrl(qrData);
      } catch {
        // ignore QR error
      }

      soundFx.playSound('complete');
      soundFx.triggerHaptic('success');
    } catch (err: any) {
      console.error('Code generation failed:', err);
      setSendError(err.message || 'Could not generate transfer code. Please try again.');
      soundFx.playSound('alert');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopiedCode(true);
      soundFx.playSound('click');
      soundFx.triggerHaptic('light');
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {}
  };

  const handleCopyLink = async () => {
    if (!generatedCode) return;
    try {
      const link = `${window.location.origin}/?code=${generatedCode}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      soundFx.playSound('click');
      soundFx.triggerHaptic('light');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  // --- RECEIVE HANDLERS ---
  const handleDigitChange = (index: number, val: string) => {
    setReceiveError(null);
    setRetrievedPackage(null);

    // Only allow single digit
    const cleaned = val.replace(/\D/g, '');
    const updated = [...codeDigits];

    if (cleaned.length > 0) {
      updated[index] = cleaned[cleaned.length - 1];
      setCodeDigits(updated);
      soundFx.playSound('click');

      // Auto-advance to next slot
      if (index < 5) {
        digitInputRefs.current[index + 1]?.focus();
      } else {
        // Last digit entered, check if all are filled
        const full = updated.join('');
        if (full.length === 6) {
          handleLookupCode(full);
        }
      }
    } else {
      updated[index] = '';
      setCodeDigits(updated);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...codeDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setCodeDigits(newDigits);
      soundFx.playSound('click');

      const nextFocus = Math.min(5, pasted.length);
      digitInputRefs.current[nextFocus]?.focus();

      if (pasted.length === 6) {
        handleLookupCode(pasted);
      }
    }
  };

  const handleLookupCode = async (codeToLookup?: string) => {
    const targetCode = (codeToLookup || codeDigits.join('')).trim();
    if (targetCode.length !== 6) {
      setReceiveError('Please enter a complete 6-digit code.');
      return;
    }

    setIsSearching(true);
    setReceiveError(null);
    setRetrievedPackage(null);
    setDownloadSuccess(false);

    try {
      const res = await fetch(`/api/code-transfer/${targetCode}/info`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Code not found or expired.');
      }

      setRetrievedPackage(data);
      soundFx.playSound('complete');
      soundFx.triggerHaptic('success');
    } catch (err: any) {
      setReceiveError(err.message || 'Transfer code not found or expired.');
      soundFx.playSound('alert');
    } finally {
      setIsSearching(false);
    }
  };

  // Download All Files
  const handleDownloadFiles = async () => {
    if (!retrievedPackage) return;

    setIsDownloading(true);
    soundFx.playSound('beam');
    soundFx.triggerHaptic('medium');

    try {
      // Trigger native browser download directly via stream endpoint
      const downloadUrl = `/api/code-transfer/${retrievedPackage.code}/download`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download =
        retrievedPackage.filesCount === 1
          ? retrievedPackage.files[0]?.name || 'download'
          : `BeamDrop_Batch_${retrievedPackage.code}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadSuccess(true);
      soundFx.playSound('complete');
      soundFx.triggerHaptic('success');

      if (onFileDownloaded) {
        onFileDownloaded(
          retrievedPackage.filesCount === 1
            ? retrievedPackage.files[0]?.name
            : `Batch (${retrievedPackage.filesCount} files)`,
          retrievedPackage.totalSize
        );
      }
    } catch (err: any) {
      console.error('Download error:', err);
      setReceiveError('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderFileIcon = (fileName: string, mime: string) => {
    const cat = getFileCategory(fileName, mime);
    switch (cat) {
      case 'image':
        return <ImageIcon className="h-4 w-4 text-indigo-500" />;
      case 'pdf':
      case 'document':
        return <FileText className="h-4 w-4 text-rose-500" />;
      case 'archive':
        return <Archive className="h-4 w-4 text-amber-500" />;
      case 'audio':
        return <Music className="h-4 w-4 text-violet-500" />;
      case 'video':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'code':
        return <Code className="h-4 w-4 text-emerald-500" />;
      default:
        return <File className="h-4 w-4 text-neutral-500" />;
    }
  };

  const totalSelectedBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-neutral-200/90 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-cyan-500/10 p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300 mb-2">
              <KeyRound className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Universal 6-Digit Key Transfer</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Send & Receive Files with a 6-Digit Code
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
              Select one file or a group of files on your mobile or laptop. A 6-digit key will be generated. Enter this key on any laptop, PC, phone, or tablet to immediately download your files with zero app installation.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center rounded-2xl border border-neutral-200/90 bg-white/80 p-1 dark:border-neutral-800 dark:bg-neutral-950/80 shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('send');
                soundFx.playSound('click');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'send'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Send (Generate Code)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('receive');
                soundFx.playSound('click');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'receive'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Receive (Enter Code)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================= TAB 1: SEND (GENERATE 6-DIGIT CODE) ======================= */}
      {activeSubTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* File Picker & Queue (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) {
                  handleAddFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-50/70 dark:border-indigo-400 dark:bg-indigo-950/60 scale-[0.995]'
                  : 'border-neutral-300 hover:border-neutral-400 bg-white dark:border-neutral-800 dark:bg-neutral-900/50 dark:hover:border-neutral-700'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    handleAddFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mb-3 shadow-inner">
                <UploadCloud className="h-6 w-6" />
              </div>

              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Click to select one file or a <span className="underline decoration-indigo-400 underline-offset-4">group of files</span>
              </h4>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
                Supports PDF, Photos, Word, ZIP, Video, Audio, or any documents (up to 50MB per batch).
              </p>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-neutral-400">
                <span>Direct Mobile ⇄ PC</span>
                <span>·</span>
                <span>Auto-expiring 15 min TTL</span>
                <span>·</span>
                <span>Zero login needed</span>
              </div>
            </div>

            {/* Error Message */}
            {sendError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            {/* Selected Files Queue */}
            {selectedFiles.length > 0 && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      Selected Files ({selectedFiles.length})
                    </span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {formatBytes(totalSelectedBytes)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition"
                  >
                    Clear All
                  </button>
                </div>

                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 max-h-56 overflow-y-auto space-y-1">
                  {selectedFiles.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 text-xs">
                      <div className="flex items-center gap-2.5 truncate pr-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                          {renderFileIcon(item.name, item.type)}
                        </div>
                        <div className="truncate">
                          <p className="truncate font-medium text-neutral-900 dark:text-white font-mono">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-mono">
                            {formatBytes(item.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-rose-500 dark:hover:bg-neutral-800 transition"
                        title="Remove file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-xs font-bold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Packaging & Generating 6-Digit Code...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      <span>
                        Generate 6-Digit Code for {selectedFiles.length === 1 ? '1 File' : `${selectedFiles.length} Files`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Code Display & Share Card (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {generatedCode ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden rounded-3xl border-2 border-indigo-500/80 bg-gradient-to-b from-indigo-50/70 via-white to-purple-50/50 p-6 shadow-xl dark:from-indigo-950/40 dark:via-neutral-900 dark:to-purple-950/30 text-center space-y-4"
              >
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <Sparkles className="h-4 w-4 text-indigo-500 animate-spin" />
                  <span>Transfer Code Ready!</span>
                </div>

                {/* Big 6-Digit Box Display */}
                <div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block mb-2 font-medium">
                    Enter this code on your Laptop, PC, or Mobile:
                  </span>
                  <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                    {generatedCode.split('').map((digit, idx) => (
                      <React.Fragment key={idx}>
                        {idx === 3 && (
                          <span className="text-xl font-bold text-neutral-400 select-none">-</span>
                        )}
                        <div className="flex h-12 w-9 sm:h-14 sm:w-11 items-center justify-center rounded-xl border-2 border-indigo-500 bg-white dark:bg-neutral-950 shadow-md">
                          <span className="font-mono text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            {digit}
                          </span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Expiry Timer Badge */}
                <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900/5 dark:bg-white/10 px-3 py-1 text-xs font-mono font-medium text-neutral-600 dark:text-neutral-300">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>Expires in: {timeLeftStr}</span>
                </div>

                {/* Copy Code & Copy Link Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 px-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 active:scale-95 transition"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white py-2.5 px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 active:scale-95 transition"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Share Link'}</span>
                  </button>
                </div>

                {/* QR Code Lightbox for Instant Mobile Scanning */}
                {qrCodeDataUrl && (
                  <div className="pt-2 border-t border-indigo-100 dark:border-indigo-950">
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mb-2 font-medium">
                      Or scan with phone camera to download:
                    </span>
                    <div className="inline-block p-2 rounded-2xl bg-white shadow-inner border border-neutral-200">
                      <img src={qrCodeDataUrl} alt="Quick Code QR" className="h-32 w-32 object-contain" />
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Placeholder Instructions */
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 font-bold">
                    1-2-3
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      How 6-Digit Transfer Works
                    </h3>
                    <p className="text-[11px] text-neutral-500">Cross-device seamless download</p>
                  </div>
                </div>

                <ol className="space-y-3 text-xs text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 font-bold text-[10px]">
                      1
                    </span>
                    <span>
                      Select any one file or a group of files on this phone or laptop.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 font-bold text-[10px]">
                      2
                    </span>
                    <span>
                      Click <strong>"Generate 6-Digit Code"</strong> to create a temporary transfer key.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 font-bold text-[10px]">
                      3
                    </span>
                    <span>
                      On your other device (PC, Laptop, or Phone), go to <strong>"Receive (Enter Code)"</strong> and type the 6 digits. It will download immediately!
                    </span>
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 2: RECEIVE (ENTER 6-DIGIT CODE) ======================= */}
      {activeSubTab === 'receive' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50 text-center space-y-5">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mx-auto mb-3 shadow-inner">
                <Download className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Enter the 6-Digit Transfer Code
              </h3>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                Type the 6-digit key displayed on the sending phone or computer. The files will be fetched and downloaded immediately.
              </p>
            </div>

            {/* 6 Digit Input Slots */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 my-4">
              {codeDigits.map((digit, idx) => (
                <React.Fragment key={idx}>
                  {idx === 3 && (
                    <span className="text-xl font-bold text-neutral-400 select-none">-</span>
                  )}
                  <input
                    key={idx}
                    ref={(el) => {
                      digitInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className="h-12 w-10 sm:h-16 sm:w-12 rounded-2xl border-2 border-neutral-300 bg-neutral-50 text-center font-mono text-xl sm:text-2xl font-black text-neutral-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-indigo-400 transition shadow-xs"
                  />
                </React.Fragment>
              ))}
            </div>

            {/* Error Banner */}
            {receiveError && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400 max-w-md mx-auto">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{receiveError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleLookupCode()}
                disabled={isSearching || codeDigits.join('').length !== 6}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-500 active:scale-95 transition disabled:opacity-40 cursor-pointer"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Locating Files...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Find & Download Files</span>
                  </>
                )}
              </button>

              {codeDigits.some((d) => d !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setCodeDigits(['', '', '', '', '', '']);
                    setRetrievedPackage(null);
                    setReceiveError(null);
                    digitInputRefs.current[0]?.focus();
                  }}
                  className="rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Retrieved Package Card */}
            {retrievedPackage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-2xl border-2 border-emerald-500/50 bg-emerald-50/50 p-5 dark:border-emerald-500/40 dark:bg-emerald-950/20 text-left space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                        {retrievedPackage.filesCount === 1
                          ? '1 File Found & Ready'
                          : `${retrievedPackage.filesCount} Files Ready for Download`}
                      </h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Sent from {retrievedPackage.senderDeviceName || 'Mobile / PC'} · Combined {formatBytes(retrievedPackage.totalSize)}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-white/70 dark:bg-neutral-900 px-2.5 py-1 rounded-lg">
                    Code: {retrievedPackage.formattedCode}
                  </span>
                </div>

                {/* Files List */}
                <div className="divide-y divide-emerald-500/10 max-h-48 overflow-y-auto space-y-1">
                  {retrievedPackage.files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white dark:bg-neutral-800">
                          {renderFileIcon(file.name, file.type)}
                        </div>
                        <span className="truncate font-medium text-neutral-900 dark:text-white font-mono">
                          {file.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Download Button */}
                <button
                  type="button"
                  onClick={handleDownloadFiles}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Downloading to this Device...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>
                        {retrievedPackage.filesCount === 1
                          ? `Download "${retrievedPackage.files[0]?.name}"`
                          : `Download All ${retrievedPackage.filesCount} Files (.ZIP)`}
                      </span>
                    </>
                  )}
                </button>

                {downloadSuccess && (
                  <p className="text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-bounce">
                    🎉 Download completed and saved to your device!
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
