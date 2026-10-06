import React, { useState } from 'react';
import {
  Smartphone,
  Camera,
  QrCode,
  Zap,
  Wifi,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  FileUp,
  MessageSquare,
  Lock,
} from 'lucide-react';

interface MobileConnectionStepsProps {
  pairingUrl: string;
  roomId: string;
  peersCount: number;
  onOpenQRScanner?: () => void;
  onOpenMessages?: () => void;
  onOpenJoinModal?: () => void;
  onJoinRoom?: (newRoomId: string) => void;
}

export const MobileConnectionSteps: React.FC<MobileConnectionStepsProps> = ({
  pairingUrl,
  roomId,
  peersCount,
  onOpenQRScanner,
  onOpenMessages,
  onOpenJoinModal,
  onJoinRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pairingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleTestInNewTab = () => {
    window.open(pairingUrl, '_blank', 'noopener,noreferrer');
  };

  const steps = [
    {
      step: 1,
      title: 'Open Your Phone Camera',
      tag: 'No App Install Needed',
      tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      icon: <Camera className="h-5 w-5 text-indigo-500" />,
      desc: 'Unlock your iPhone or Android phone and open the default built-in Camera app (or Google Lens).',
      detail: 'BeamDrop runs entirely in your mobile browser (Safari, Chrome, Firefox, Edge) — no App Store or Play Store downloads needed.',
    },
    {
      step: 2,
      title: 'Point Camera at the QR Code',
      tag: 'Instant Handshake',
      tagColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
      icon: <QrCode className="h-5 w-5 text-indigo-500" />,
      desc: 'Aim your phone camera at the QR code displayed on this PC. A notification badge will appear at the top of your camera view.',
      detail: 'Tap the banner to open the encrypted session directly. The end-to-end encryption key is exchanged automatically via the URL hash.',
    },
    {
      step: 3,
      title: 'Beam Files & Clipboard Instantly',
      tag: 'Local P2P Speed',
      tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      icon: <Zap className="h-5 w-5 text-amber-500" />,
      desc: 'Your phone and PC are now paired in a direct WebRTC tunnel! Select photos, 4K videos, documents, or paste text.',
      detail: 'Files transfer directly device-to-device through your local Wi-Fi or hotspot at blazing speeds without passing through any cloud servers.',
    },
  ];

  return (
    <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100/80 px-3 py-1 text-xs font-semibold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 mb-2">
            <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
            <span>Mobile Pairing Guide</span>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <span>How to Connect Your Mobile to this PC</span>
            {peersCount > 0 ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Connected ({peersCount})
              </span>
            ) : (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                Awaiting Phone
              </span>
            )}
          </h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Follow these 3 simple steps to pair your smartphone with your computer in under 5 seconds.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900 transition"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-neutral-400" />
                <span>Copy Pairing Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleTestInNewTab}
            title="Open a mock mobile peer tab to test P2P transfer"
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900 transition"
          >
            <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Test Tab</span>
          </button>
        </div>
      </div>

      {/* 3 Step Cards Grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((item) => (
          <div
            key={item.step}
            onClick={() => setActiveStep(item.step)}
            className={`cursor-pointer rounded-2xl border p-5 transition relative flex flex-col justify-between ${
              activeStep === item.step
                ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20 dark:border-indigo-500/80 dark:bg-indigo-950/20'
                : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:border-neutral-700'
            }`}
          >
            <div>
              {/* Step number badge & tag */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-xs font-bold text-white dark:bg-white dark:text-neutral-950">
                  {item.step}
                </div>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${item.tagColor}`}>
                  {item.tag}
                </span>
              </div>

              {/* Title & Icon */}
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded-md bg-neutral-100 dark:bg-neutral-800 shrink-0">
                  {item.icon}
                </div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {item.title}
                </h4>
              </div>

              {/* Description */}
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-3">
                {item.desc}
              </p>
            </div>

            {/* Detail snippet */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 text-[11px] text-neutral-500 dark:text-neutral-400">
              {item.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Streamlined QR Camera Scan Banner */}
      <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-5 dark:border-neutral-800 dark:bg-neutral-950/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Instant QR Camera Pairing
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Scan the QR code on your PC screen with your phone camera for instant zero-config pairing.
              </p>
            </div>
          </div>

          {onOpenQRScanner && (
            <button
              type="button"
              onClick={onOpenQRScanner}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition active:scale-95"
            >
              <Camera className="h-4 w-4" />
              <span>Launch Camera Scan</span>
            </button>
          )}
        </div>
      </div>

      {/* Accordion: Troubleshooting & Network FAQs */}
      <div className="mt-4">
        <button
          onClick={() => setShowTroubleshooting(!showTroubleshooting)}
          className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition"
        >
          <span className="flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5 text-indigo-500" />
            <span>Connection Tips & Troubleshooting (Same Wi-Fi vs Hotspot)</span>
          </span>
          {showTroubleshooting ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showTroubleshooting && (
          <div className="mt-2 space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-300 animate-fade-in">
            <div className="flex items-start gap-2">
              <span className="font-bold text-neutral-900 dark:text-white shrink-0">1. Wi-Fi Speed:</span>
              <span>If your phone and PC are connected to the same Wi-Fi router, transfers run entirely over the local LAN with zero cellular data usage and speeds up to 50–100 MB/s.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-neutral-900 dark:text-white shrink-0">2. Mobile Hotspot:</span>
              <span>You can turn on your phone's personal hotspot and connect your computer to it. BeamDrop will work seamlessly offline without needing external internet once loaded.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-neutral-900 dark:text-white shrink-0">3. QR Scan issues:</span>
              <span>If your camera does not automatically recognize the QR code, increase your computer screen brightness or tap the QR code to view it full screen.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-neutral-900 dark:text-white shrink-0">4. Zero Server Storage:</span>
              <span>Your files are encrypted with AES-256-GCM using a key in the link hash (#key=...). Google and BeamDrop servers never see or hold your decrypted files.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
