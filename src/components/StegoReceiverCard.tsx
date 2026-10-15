import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Eye,
  Download,
  Key,
  CheckCircle2,
  AlertTriangle,
  FileText,
  File,
  Copy,
  Check,
  Zap,
  Sparkles,
  ArrowRight,
  Loader2,
  Scan,
} from 'lucide-react';
import { ReceivedFileItem } from '../types';
import { formatBytes } from '../utils/format';
import { decodeDataFromImage } from '../utils/steganography';
import { soundFx } from '../utils/soundEffects';

interface StegoReceiverCardProps {
  item: ReceivedFileItem;
  onConvertSuccess?: (fileId: string, result: any) => void;
  onPreviewFile?: (file: ReceivedFileItem) => void;
}

export const StegoReceiverCard: React.FC<StegoReceiverCardProps> = ({
  item,
  onConvertSuccess,
  onPreviewFile,
}) => {
  const [isDecoding, setIsDecoding] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [scanLaser, setScanLaser] = useState(false);

  const extracted = item.stegoExtractedResult;

  const handleConvert = async () => {
    setError(null);
    setIsDecoding(true);
    setScanLaser(true);
    soundFx.playSound('stego_encode');
    soundFx.triggerHaptic('medium');

    try {
      const decoded = await decodeDataFromImage(item.blob, password.trim() || undefined);
      soundFx.playSound('stego_decode');
      soundFx.triggerHaptic('success');

      let downloadUrl: string | undefined = undefined;
      if (decoded.file) {
        downloadUrl = URL.createObjectURL(decoded.file);
      }

      const result = {
        type: decoded.type,
        file: decoded.file,
        text: decoded.text,
        name: decoded.name,
        size: decoded.size,
        mimeType: decoded.mimeType,
        downloadUrl,
      };

      if (onConvertSuccess) {
        onConvertSuccess(item.id, result);
      }
      setShowPasswordInput(false);
    } catch (err: any) {
      const msg = err?.message || 'Failed to extract payload';
      setError(msg);
      soundFx.playSound('alert');
      if (msg.toLowerCase().includes('passcode') || msg.toLowerCase().includes('password')) {
        setShowPasswordInput(true);
      }
    } finally {
      setIsDecoding(false);
      setTimeout(() => setScanLaser(false), 600);
    }
  };

  const handleDownloadExtracted = () => {
    if (!extracted?.downloadUrl) return;
    const a = document.createElement('a');
    a.href = extracted.downloadUrl;
    a.download = extracted.name || 'normal_data';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyText = async () => {
    if (!extracted?.text) return;
    try {
      await navigator.clipboard.writeText(extracted.text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-br from-cyan-500/5 via-indigo-500/5 to-purple-500/5 p-4 shadow-lg dark:border-cyan-500/30 dark:bg-neutral-900/90"
    >
      {/* Laser Scanning Effect */}
      {scanLaser && (
        <motion.div
          initial={{ top: '-10%' }}
          animate={{ top: '110%' }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="pointer-events-none absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#06b6d4] z-20"
        />
      )}

      {/* Top Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
            <Shield className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                Steganography Carrier Image Detected
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
                <Sparkles className="h-2.5 w-2.5" />
                <span>LSB Concealed</span>
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Hidden confidential data is embedded inside this innocent cover picture
            </p>
          </div>
        </div>

        {extracted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Converted to Normal Data</span>
          </span>
        )}
      </div>

      {/* Body: Carrier Image Preview + Extracted State */}
      <div className="mt-3 flex flex-col sm:flex-row items-center gap-3.5">
        {/* Cover Preview Thumbnail */}
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-950 shadow-inner">
          <img
            src={item.url}
            alt="Carrier Cover"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute bottom-1 left-1.5 text-[9px] font-mono font-bold text-white/90">
            Cover PNG
          </span>
        </div>

        {/* Carrier Details */}
        <div className="flex-1 min-w-0 text-left w-full">
          <p className="truncate text-xs font-mono font-medium text-neutral-900 dark:text-white">
            {item.name}
          </p>
          <p className="text-[11px] font-mono text-neutral-500">
            Carrier Size: {formatBytes(item.size)} · Sent by {item.senderDevice || 'Mobile Peer'}
          </p>

          {!extracted ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleConvert}
                disabled={isDecoding}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:from-cyan-500 hover:to-indigo-500 active:scale-95 transition disabled:opacity-50 cursor-pointer"
              >
                {isDecoding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                <span>{isDecoding ? 'Extracting Normal Data...' : 'Convert to Normal Data'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPasswordInput((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white/60 dark:bg-neutral-800/60 px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
              >
                <Key className="h-3 w-3" />
                <span>Passcode</span>
              </button>

              <a
                href={item.url}
                download={item.name}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 underline underline-offset-2 ml-1"
              >
                Download Cover Only
              </a>
            </div>
          ) : (
            /* EXTRACTED NORMAL DATA BANNER */
            <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 dark:bg-emerald-950/40">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    {extracted.type === 'file' ? <FileText className="h-3.5 w-3.5" /> : <File className="h-3.5 w-3.5" />}
                  </div>
                  <div className="truncate">
                    <p className="truncate text-xs font-bold text-emerald-950 dark:text-emerald-200 font-mono">
                      {extracted.type === 'file' ? extracted.name : 'Secret Text Message'}
                    </p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      Normal Data: {formatBytes(extracted.size)} · Converted Successfully
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {extracted.type === 'file' && extracted.downloadUrl && (
                    <button
                      type="button"
                      onClick={handleDownloadExtracted}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow hover:bg-emerald-500 active:scale-95 transition"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download Normal File</span>
                    </button>
                  )}

                  {extracted.type === 'text' && extracted.text && (
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow hover:bg-emerald-500 active:scale-95 transition"
                    >
                      {copiedText ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedText ? 'Copied!' : 'Copy Normal Text'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Text content preview if payload was text */}
              {extracted.type === 'text' && extracted.text && (
                <div className="mt-2 rounded-lg bg-white/80 p-2 text-xs font-mono text-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-200 max-h-24 overflow-y-auto select-all">
                  {extracted.text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Password Prompt Drawer */}
      <AnimatePresence>
        {showPasswordInput && !extracted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-cyan-500/20"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConvert();
                  }}
                  placeholder="Enter steganography password (if sender protected it)..."
                  className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-1.5 pl-9 pr-3 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <button
                type="button"
                onClick={handleConvert}
                disabled={isDecoding}
                className="rounded-xl bg-cyan-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 transition disabled:opacity-50"
              >
                {isDecoding ? 'Unlocking...' : 'Unlock & Convert'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </motion.div>
  );
};
