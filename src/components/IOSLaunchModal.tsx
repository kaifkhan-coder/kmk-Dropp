import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  QrCode,
  Download,
  Copy,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Eye,
  Check,
} from 'lucide-react';

interface IOSLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOSDevice?: boolean;
}

export const IOSLaunchModal: React.FC<IOSLaunchModalProps> = ({
  isOpen,
  onClose,
  isIOSDevice = false,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'instructions' | 'qrcode' | 'profile'>('instructions');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://beamdrop.app';

  useEffect(() => {
    if (activeTab === 'qrcode' && canvasRef.current && currentUrl) {
      QRCode.toCanvas(
        canvasRef.current,
        currentUrl,
        {
          width: 200,
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
    }
  }, [activeTab, currentUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownloadMobileConfig = () => {
    const configXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>BeamDrop</string>
            <key>PayloadDescription</key>
            <string>BeamDrop Encrypted P2P File Transfer iOS Web Application</string>
            <key>PayloadDisplayName</key>
            <string>BeamDrop iOS WebClip</string>
            <key>PayloadIdentifier</key>
            <string>com.beamdrop.ios.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>2df25069-28b0-4288-a451-428e7e7a8967</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>${currentUrl}</string>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>BeamDrop iOS Application</string>
    <key>PayloadIdentifier</key>
    <string>com.beamdrop.ios.profile</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>9a73c09b-11bc-4523-96e0-251914445199</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

    const blob = new Blob([configXml], { type: 'application/x-apple-aspen-config' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BeamDrop_iOS_App.mobileconfig';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
                Launch on iOS
              </h2>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                iPhone & iPad
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Run BeamDrop as a full-screen native iOS application on your Apple devices.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800/80 mb-4">
          <button
            onClick={() => setActiveTab('instructions')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              activeTab === 'instructions'
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            Installation Guide
          </button>
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              activeTab === 'qrcode'
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            Scan on iPhone
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              activeTab === 'profile'
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            iOS Profile (.mobileconfig)
          </button>
        </div>

        {/* Tab 1: Step-by-Step iOS Install Instructions */}
        {activeTab === 'instructions' && (
          <div className="space-y-3.5">
            <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/80 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/60">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  1
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white">
                    Open in Apple Safari
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Navigate to BeamDrop in Safari on your iPhone or iPad.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/80 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/60">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  2
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    Tap the iOS Share Button
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-white text-xs">
                      <Share className="h-3 w-3" />
                    </span>
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Look at the bottom toolbar in Safari (or top bar on iPad) and tap the Share icon.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/80 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/60">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  3
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    Choose "Add to Home Screen"
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-white text-xs">
                      <PlusSquare className="h-3 w-3" />
                    </span>
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Scroll down through the share sheet options and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/80 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/60">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  4
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white">
                    Tap "Add" in Top Right
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    BeamDrop will appear on your iOS Home Screen with its official Apple Touch Icon, standalone view, and camera access!
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Link Share & Copy */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopyLink}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-100 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy iOS Link'}</span>
              </button>

              <button
                onClick={() => setActiveTab('qrcode')}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/30"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Show QR Code</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: QR Code to open directly on iPhone camera */}
        {activeTab === 'qrcode' && (
          <div className="flex flex-col items-center justify-center py-2 space-y-3 text-center">
            <div className="rounded-2xl border-2 border-indigo-500/20 bg-white p-3 shadow-inner dark:bg-white flex items-center justify-center">
              <canvas ref={canvasRef} className="rounded-xl max-w-full" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Scan with your iPhone or iPad Camera
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mt-1">
                Open the native Camera app on iOS, point it at this QR code, and tap the yellow Safari link banner to launch immediately.
              </p>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 transition"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? 'Copied to Clipboard' : 'Copy URL for Safari'}</span>
            </button>
          </div>
        )}

        {/* Tab 3: iOS MobileConfig WebClip profile */}
        {activeTab === 'profile' && (
          <div className="space-y-3 py-1">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm">
                <ShieldCheck className="h-4 w-4" />
                <span>Apple iOS WebClip Configuration Profile</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 leading-relaxed">
                Download an official Apple iOS <code className="font-mono text-indigo-600 dark:text-indigo-400">.mobileconfig</code> payload. Once opened on your iPhone/iPad, it installs BeamDrop directly to your iOS Home Screen in managed standalone mode with full hardware acceleration.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                <span className="text-neutral-500 dark:text-neutral-400">App Name:</span>
                <span className="font-semibold">BeamDrop</span>
              </div>
              <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                <span className="text-neutral-500 dark:text-neutral-400">Display Mode:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Full-Screen Standalone</span>
              </div>
              <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                <span className="text-neutral-500 dark:text-neutral-400">Apple Icon:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Precomposed High-Res 180px</span>
              </div>
            </div>

            <button
              onClick={handleDownloadMobileConfig}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-xs sm:text-sm font-bold text-white hover:opacity-95 transition shadow-md shadow-indigo-600/30"
            >
              <Download className="h-4 w-4" />
              <span>Download iOS .mobileconfig Profile</span>
            </button>
          </div>
        )}

        {/* Benefits Footer */}
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center">
            <Zap className="h-3.5 w-3.5 text-amber-500 mb-0.5" />
            <span className="text-[10px] font-semibold text-neutral-800 dark:text-neutral-200">Full-Screen</span>
            <span className="text-[9px] text-neutral-400">Zero browser bars</span>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 mb-0.5" />
            <span className="text-[10px] font-semibold text-neutral-800 dark:text-neutral-200">Local WebRTC</span>
            <span className="text-[9px] text-neutral-400">Direct phone-to-PC</span>
          </div>
          <div className="flex flex-col items-center">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 mb-0.5" />
            <span className="text-[10px] font-semibold text-neutral-800 dark:text-neutral-200">Offline PWA</span>
            <span className="text-[9px] text-neutral-400">Cached on device</span>
          </div>
        </div>
      </div>
    </div>
  );
};
