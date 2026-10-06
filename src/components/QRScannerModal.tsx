import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  X,
  Upload,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Check,
  Edit2,
  Sparkles,
} from 'lucide-react';
import { setSavedDeviceName } from '../utils/format';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedUrl: string, deviceName?: string) => void;
  currentDeviceName?: string;
  onUpdateDeviceName?: (newName: string) => void;
}

const COMMON_DEVICE_PRESETS = [
  'iPhone 15 Pro',
  'Samsung Galaxy',
  'Redmi Note 13',
  'Vivo V29',
  'OnePlus 12',
  'Pixel 8',
  'MacBook Air',
  'Windows PC',
];

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  currentDeviceName = 'My Device',
  onUpdateDeviceName,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isEditingDeviceName, setIsEditingDeviceName] = useState(false);
  const [deviceNameInput, setDeviceNameInput] = useState(currentDeviceName);
  const [scannedSuccessBadge, setScannedSuccessBadge] = useState<string | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    setDeviceNameInput(currentDeviceName);
  }, [currentDeviceName]);

  useEffect(() => {
    if (!isOpen) return;

    let stream: MediaStream | null = null;
    setCameraError(null);
    setScannedSuccessBadge(null);

    async function startCamera() {
      try {
        const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          videoRef.current.muted = true;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('iOS video play warning:', playErr);
          }
          scanFrame();
        }
      } catch (err: any) {
        console.warn('Camera access error:', err);
        const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
        setCameraError(
          err.name === 'NotAllowedError'
            ? isIOS
              ? 'Camera permission denied. On iPhone/iPad: Settings > Safari > Camera > Allow.'
              : 'Camera permission denied. Please allow camera access in browser or upload a QR screenshot below.'
            : 'Unable to access camera on this device. You can also upload a QR screenshot below.'
        );
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isOpen, facingMode]);

  const handleDeviceNameSave = () => {
    const clean = deviceNameInput.trim() || currentDeviceName;
    setSavedDeviceName(clean);
    if (onUpdateDeviceName) onUpdateDeviceName(clean);
    setIsEditingDeviceName(false);
  };

  const handleTriggerSuccess = (scannedData: string) => {
    const cleanName = deviceNameInput.trim() || currentDeviceName;
    setSavedDeviceName(cleanName);
    if (onUpdateDeviceName) onUpdateDeviceName(cleanName);

    setScannedSuccessBadge(cleanName);
    setTimeout(() => {
      onScanSuccess(scannedData, cleanName);
      onClose();
    }, 600);
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      handleTriggerSuccess(code.data);
      return;
    }

    animationFrameIdRef.current = requestAnimationFrame(scanFrame);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleTriggerSuccess(code.data);
        } else {
          setCameraError('No QR code detected in the selected image. Please try another.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-200 transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-900/40 dark:text-indigo-300 text-[11px] font-bold mb-1.5">
            <Camera className="h-3 w-3" />
            <span>QR Scanner & Device Pairing</span>
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">Scan Peer QR Code</h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Point camera at the host QR code to connect and set your device identity.
          </p>
        </div>

        {/* Set Device Name by Scanning User Card */}
        <div className="mb-3 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-800 dark:bg-neutral-900/60">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
              <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
              <span>Scanning as Device:</span>
            </span>
            <button
              type="button"
              onClick={() => setIsEditingDeviceName(!isEditingDeviceName)}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <Edit2 className="h-2.5 w-2.5" />
              <span>{isEditingDeviceName ? 'Done' : 'Change Name'}</span>
            </button>
          </div>

          {isEditingDeviceName ? (
            <div className="space-y-2 mt-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={deviceNameInput}
                  onChange={(e) => setDeviceNameInput(e.target.value)}
                  placeholder="e.g. Kaif's iPhone, Redmi Note 13"
                  className="flex-1 rounded-xl border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-900 focus:border-indigo-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleDeviceNameSave}
                  className="rounded-xl bg-neutral-900 px-2.5 py-1 text-xs font-bold text-white dark:bg-white dark:text-neutral-950 transition"
                >
                  Save
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1">
                {COMMON_DEVICE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDeviceNameInput(preset);
                      setSavedDeviceName(preset);
                      if (onUpdateDeviceName) onUpdateDeviceName(preset);
                      setIsEditingDeviceName(false);
                    }}
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-neutral-900 dark:text-white">
                {deviceNameInput || currentDeviceName}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="h-3 w-3" />
                <span>Ready to beam</span>
              </span>
            </div>
          )}
        </div>

        {/* Video / Camera Box */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-neutral-200 bg-black dark:border-neutral-800 shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Reticle Overlay */}
          <div className="pointer-events-none absolute inset-8 border-2 border-white/70 rounded-2xl">
            <div className="absolute -top-1 -left-1 h-5 w-5 border-t-3 border-l-3 border-emerald-400" />
            <div className="absolute -top-1 -right-1 h-5 w-5 border-t-3 border-r-3 border-emerald-400" />
            <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-3 border-l-3 border-emerald-400" />
            <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-3 border-r-3 border-emerald-400" />
            <div className="h-full w-full bg-emerald-500/5 animate-pulse" />
          </div>

          {/* Success Overlay */}
          {scannedSuccessBadge && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/90 p-4 text-center text-white animate-fade-in">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white mb-2 shadow-lg">
                <Check className="h-6 w-6 stroke-[3]" />
              </div>
              <p className="text-sm font-bold">QR Scanned Successfully!</p>
              <p className="text-xs text-neutral-300 mt-1">
                Device set as: <strong>{scannedSuccessBadge}</strong>
              </p>
              <p className="text-[10px] text-emerald-400 mt-1">Connecting to room peer...</p>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/95 p-4 text-center text-xs text-neutral-300">
              <AlertCircle className="h-8 w-8 text-amber-400 mb-2" />
              <p>{cameraError}</p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Flip Camera</span>
          </button>

          <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900 transition">
            <Upload className="h-3.5 w-3.5" />
            <span>Upload QR</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
