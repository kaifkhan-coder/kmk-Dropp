import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Smartphone,
  RefreshCw,
  Camera,
} from 'lucide-react';

interface QRCodeDisplayProps {
  url: string;
  roomId: string;
  peersCount: number;
  peers?: { id: string; deviceName: string; deviceType: string }[];
  onRegenerateRoom?: () => void;
  isSignedIn?: boolean;
  onRequireAuth?: () => void;
  onJoinRoom?: (newRoomId: string) => void;
  onOpenQRScanner?: () => void;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  url,
  roomId,
  peersCount,
  peers = [],
  onRegenerateRoom,
  isSignedIn = true,
  onRequireAuth,
  onOpenQRScanner,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !url) return;

    QRCode.toCanvas(
      canvasRef.current,
      url,
      {
        width: 230,
        margin: 1.5,
        color: {
          dark: '#0a0a0a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (error) => {
        if (error) console.error('QR Render Error:', error);
      }
    );
  }, [url]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleOpenTestWindow = () => {
    if (!isSignedIn && onRequireAuth) {
      onRequireAuth();
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col items-center rounded-3xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60 w-full">
      {/* Title Header */}
      <div className="mb-4 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-900/40 dark:text-indigo-300 text-xs font-bold mb-2">
          <QrCode className="h-3.5 w-3.5 text-indigo-500" />
          <span>Instant Device Pairing</span>
        </div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center justify-center gap-2">
          <span>Point Camera at QR Code</span>
        </h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-xs">
          Scan from your mobile phone camera or tablet to pair devices instantly via WebRTC.
        </p>
      </div>

      {/* QR Code Canvas */}
      <div className="relative flex items-center justify-center rounded-2xl border border-neutral-200 bg-white p-3 shadow-inner dark:border-neutral-700">
        <canvas ref={canvasRef} className="rounded-xl" />

        {peersCount > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-neutral-950/85 backdrop-blur-[2px] p-4 text-center animate-fade-in">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white mb-2 shadow-lg">
              <Check className="h-5 w-5 stroke-[2.5]" />
            </div>
            <p className="text-xs font-bold text-white">Device Connected</p>
            <p className="text-[10px] text-neutral-300 mt-0.5">
              Ready for high-speed encrypted peer-to-peer file transfer
            </p>
          </div>
        )}
      </div>

      {/* Room Badge */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
        <span>Room ID:</span>
        <span className="font-mono font-bold text-neutral-900 dark:text-white tracking-wider">
          {roomId}
        </span>
        <button
          onClick={handleCopyCode}
          title="Copy room code"
          className="rounded p-0.5 hover:text-indigo-500 text-neutral-400 transition"
        >
          {copiedCode ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-col w-full gap-2">
        <div className="flex w-full gap-2">
          <button
            onClick={handleCopyLink}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2.5 px-3 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 transition dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Pairing Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenTestWindow}
            title="Open test peer tab in this browser"
            className="flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 text-neutral-700 hover:bg-neutral-50 transition dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
          </button>

          {onRegenerateRoom && (
            <button
              onClick={() => {
                if (!isSignedIn && onRequireAuth) {
                  onRequireAuth();
                  return;
                }
                onRegenerateRoom();
              }}
              title="Generate new secure room & encryption key"
              className="flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 text-neutral-700 hover:bg-neutral-50 transition dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <RefreshCw className="h-3.5 w-3.5 text-neutral-400" />
            </button>
          )}
        </div>

        {onOpenQRScanner && (
          <button
            type="button"
            onClick={onOpenQRScanner}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
          >
            <Camera className="h-3.5 w-3.5 text-indigo-500" />
            <span>Launch Camera Scanner</span>
          </button>
        )}
      </div>

      {/* Connected Devices in this Room */}
      {peers.length > 0 && (
        <div className="mt-3 w-full rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/40">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected Devices ({peers.length}):</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {peers.map((p, idx) => (
              <span
                key={p.id || idx}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-800 shadow-xs border border-emerald-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
              >
                <Smartphone className="h-2.5 w-2.5 text-emerald-600" />
                <span>{p.deviceName}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* E2EE Info Footnote */}
      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span>Direct peer-to-peer data transport · Multi-device sync</span>
      </div>
    </div>
  );
};
