import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  FileUp,
  Download,
  Send,
  Sparkles,
  Check,
  Copy,
  AlertTriangle,
  RefreshCw,
  X,
  Image as ImageIcon,
  FileText,
  Key,
  Layers,
  Zap,
  Info,
  CheckCircle2,
  Scan,
} from 'lucide-react';
import {
  encodeDataToImage,
  decodeDataFromImage,
  calculateCapacity,
  generateCoverCanvas,
  loadImageToCanvas,
  isSteganographyImage,
  StegoDecodedResult,
} from '../utils/steganography';
import { formatBytes } from '../utils/format';

interface SteganographyStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null;
  onSendStegoFile?: (file: File) => void;
  isPeerConnected?: boolean;
}

export const SteganographyStudioModal: React.FC<SteganographyStudioModalProps> = ({
  isOpen,
  onClose,
  initialFile = null,
  onSendStegoFile,
  isPeerConnected = false,
}) => {
  // Mode: 'encode' (Hide data) or 'decode' (Reveal data)
  const [activeTab, setActiveTab] = useState<'encode' | 'decode'>('encode');

  // --- ENCODE STATE ---
  const [payloadType, setPayloadType] = useState<'text' | 'file'>('file');
  const [textPayload, setTextPayload] = useState('');
  const [filePayload, setFilePayload] = useState<File | null>(null);
  const [coverSource, setCoverSource] = useState<'preset' | 'upload'>('preset');
  const [coverTheme, setCoverTheme] = useState<'nebula' | 'cyber' | 'waves' | 'sunset' | 'prism' | 'emerald'>('nebula');
  const [customCoverFile, setCustomCoverFile] = useState<File | null>(null);
  const [customCoverPreview, setCustomCoverPreview] = useState<string | null>(null);
  const [encodePassword, setEncodePassword] = useState('');
  const [showEncodePassword, setShowEncodePassword] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const [encodedResult, setEncodedResult] = useState<{
    file: File;
    previewUrl: string;
    dimensions: { width: number; height: number };
  } | null>(null);

  // --- DECODE STATE ---
  const [decodeCarrierFile, setDecodeCarrierFile] = useState<File | null>(null);
  const [decodeCarrierPreview, setDecodeCarrierPreview] = useState<string | null>(null);
  const [decodePassword, setDecodePassword] = useState('');
  const [showDecodePassword, setShowDecodePassword] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isStegoDetected, setIsStegoDetected] = useState<boolean | null>(null);
  const [decodedResult, setDecodedResult] = useState<StegoDecodedResult | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Animation and status state
  const [scanAnimation, setScanAnimation] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize with initialFile if provided
  useEffect(() => {
    if (!isOpen) {
      setEncodedResult(null);
      setDecodedResult(null);
      setDecodeError(null);
      return;
    }

    if (initialFile) {
      // Check if it's an image that might already have stego data
      if (initialFile.type.startsWith('image/')) {
        isSteganographyImage(initialFile).then((detected) => {
          if (detected) {
            setActiveTab('decode');
            setDecodeCarrierFile(initialFile);
            setDecodeCarrierPreview(URL.createObjectURL(initialFile));
            setIsStegoDetected(true);
          } else {
            // Use as payload to hide
            setActiveTab('encode');
            setPayloadType('file');
            setFilePayload(initialFile);
          }
        });
      } else {
        setActiveTab('encode');
        setPayloadType('file');
        setFilePayload(initialFile);
      }
    }
  }, [isOpen, initialFile]);

  // Generate live preset preview canvas
  useEffect(() => {
    if (coverSource === 'preset' && previewCanvasRef.current) {
      const generated = generateCoverCanvas(coverTheme, 320, 240);
      const ctx = previewCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(generated, 0, 0, 320, 240);
      }
    }
  }, [coverTheme, coverSource, activeTab]);

  // Handle custom cover upload
  const handleCustomCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomCoverFile(file);
      setCustomCoverPreview(URL.createObjectURL(file));
      setCoverSource('upload');
    }
  };

  // Handle decode carrier file change
  const handleDecodeCarrierChange = async (file: File) => {
    setDecodeCarrierFile(file);
    setDecodeCarrierPreview(URL.createObjectURL(file));
    setDecodedResult(null);
    setDecodeError(null);
    const detected = await isSteganographyImage(file);
    setIsStegoDetected(detected);
  };

  // Execute Encoding
  const handleExecuteEncode = async () => {
    if (payloadType === 'text' && !textPayload.trim()) return;
    if (payloadType === 'file' && !filePayload) return;

    setIsEncoding(true);
    setScanAnimation(true);

    try {
      const result = await encodeDataToImage({
        coverImage: coverSource === 'upload' && customCoverFile ? customCoverFile : undefined,
        coverTheme: coverSource === 'preset' ? coverTheme : undefined,
        textPayload: payloadType === 'text' ? textPayload : undefined,
        filePayload: payloadType === 'file' && filePayload ? filePayload : undefined,
        password: encodePassword.trim() || undefined,
      });

      // Brief pause for visual laser scan animation
      await new Promise((r) => setTimeout(r, 600));

      setEncodedResult({
        file: result.stegoFile,
        previewUrl: result.previewUrl,
        dimensions: result.dimensions,
      });
    } catch (err: any) {
      alert(`Steganography encoding error: ${err?.message || err}`);
    } finally {
      setIsEncoding(false);
      setScanAnimation(false);
    }
  };

  // Execute Decoding
  const handleExecuteDecode = async () => {
    if (!decodeCarrierFile) return;

    setIsDecoding(true);
    setDecodeError(null);
    setScanAnimation(true);

    try {
      await new Promise((r) => setTimeout(r, 500));
      const res = await decodeDataFromImage(decodeCarrierFile, decodePassword.trim() || undefined);
      setDecodedResult(res);
    } catch (err: any) {
      setDecodeError(err?.message || 'Failed to extract hidden data from image.');
    } finally {
      setIsDecoding(false);
      setScanAnimation(false);
    }
  };

  const handleCopyText = async () => {
    if (decodedResult?.text) {
      try {
        await navigator.clipboard.writeText(decodedResult.text);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  const handleDownloadExtractedFile = () => {
    if (!decodedResult?.file) return;
    const url = URL.createObjectURL(decodedResult.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = decodedResult.name || 'extracted_data.bin';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCarrierPNG = () => {
    if (!encodedResult?.file) return;
    const a = document.createElement('a');
    a.href = encodedResult.previewUrl;
    a.download = encodedResult.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 transition-all my-auto max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-3 shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <Scan className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
                Steganography Studio
              </h2>
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                LSB 1-Bit Invisible
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Conceal secret files or messages inside innocent images, beam to mobile, and extract back to original data.
            </p>
          </div>
        </div>

        {/* Top Mode Segmented Control */}
        <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800/80 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('encode')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
              activeTab === 'encode'
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <Lock className="h-3.5 w-3.5 text-indigo-500" />
            <span>Hide Data into Image (Sender)</span>
          </button>
          <button
            onClick={() => setActiveTab('decode')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
              activeTab === 'decode'
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <Unlock className="h-3.5 w-3.5 text-cyan-500" />
            <span>Reveal Secret from Image (Receiver)</span>
          </button>
        </div>

        {/* Scrollable Main Body */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {/* ======================= TAB 1: ENCODE / HIDE ======================= */}
          {activeTab === 'encode' && (
            <div className="space-y-4">
              {/* Step 1: Payload Selection */}
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">1</span>
                    <span>What secret data do you want to hide?</span>
                  </label>
                  <div className="flex items-center gap-1 bg-neutral-200/70 dark:bg-neutral-800 rounded-lg p-0.5 text-[11px]">
                    <button
                      onClick={() => setPayloadType('file')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        payloadType === 'file'
                          ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      File / Document
                    </button>
                    <button
                      onClick={() => setPayloadType('text')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        payloadType === 'text'
                          ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      Secret Text / Note
                    </button>
                  </div>
                </div>

                {payloadType === 'file' ? (
                  <div>
                    {filePayload ? (
                      <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-white p-3 dark:border-indigo-900/60 dark:bg-neutral-900">
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold truncate text-neutral-900 dark:text-white">
                              {filePayload.name}
                            </p>
                            <p className="text-[10px] text-neutral-400">
                              {formatBytes(filePayload.size)} · {filePayload.type || 'Binary Document'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setFilePayload(null)}
                          className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-white p-5 cursor-pointer hover:border-indigo-400 dark:border-neutral-700 dark:bg-neutral-900/50 transition">
                        <FileUp className="h-6 w-6 text-indigo-500 mb-1.5" />
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          Click to select confidential file to hide
                        </span>
                        <span className="text-[10px] text-neutral-400 mt-0.5">
                          PDF, Word, Code, Photos, Zip, or any document
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setFilePayload(f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <div>
                    <textarea
                      value={textPayload}
                      onChange={(e) => setTextPayload(e.target.value)}
                      placeholder="Type or paste your secret message, recovery phrase, or confidential notes here..."
                      rows={3}
                      className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                      <span>Payload Size: {new TextEncoder().encode(textPayload).length} bytes</span>
                      <span>{textPayload.length} characters</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Innocent Cover Image Selection */}
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">2</span>
                    <span>Choose Cover Carrier Image (The disguise)</span>
                  </label>
                  <div className="flex items-center gap-1 bg-neutral-200/70 dark:bg-neutral-800 rounded-lg p-0.5 text-[11px]">
                    <button
                      onClick={() => setCoverSource('preset')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        coverSource === 'preset'
                          ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      Aesthetic Theme
                    </button>
                    <button
                      onClick={() => setCoverSource('upload')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        coverSource === 'upload'
                          ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      Upload Photo
                    </button>
                  </div>
                </div>

                {coverSource === 'preset' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { id: 'nebula', name: 'Nebula', color: 'bg-indigo-600' },
                        { id: 'cyber', name: 'Cyber Grid', color: 'bg-cyan-600' },
                        { id: 'waves', name: 'Ocean Waves', color: 'bg-teal-600' },
                        { id: 'sunset', name: 'Sunset', color: 'bg-pink-600' },
                        { id: 'prism', name: 'Prism', color: 'bg-purple-600' },
                        { id: 'emerald', name: 'Emerald', color: 'bg-emerald-600' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setCoverTheme(t.id as any)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
                            coverTheme === t.id
                              ? 'border-indigo-600 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                              : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900'
                          }`}
                        >
                          <span className={`h-4 w-4 rounded-full ${t.color} shadow-sm`} />
                          <span className="text-[10px] font-semibold text-neutral-800 dark:text-neutral-200">
                            {t.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="relative h-28 w-full rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-black flex items-center justify-center">
                      <canvas
                        ref={previewCanvasRef}
                        width={320}
                        height={240}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2.5">
                        <span className="text-[11px] font-bold text-white flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-cyan-400" />
                          <span>Lossless Cover Canvas · 960x720</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {customCoverPreview ? (
                      <div className="relative h-28 w-full rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 group">
                        <img
                          src={customCoverPreview}
                          alt="Custom cover preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            setCustomCoverFile(null);
                            setCustomCoverPreview(null);
                          }}
                          className="absolute right-2 top-2 rounded-lg bg-black/70 p-1 text-white hover:bg-black transition"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-white p-5 cursor-pointer hover:border-indigo-400 dark:border-neutral-700 dark:bg-neutral-900/50 transition">
                        <ImageIcon className="h-6 w-6 text-cyan-500 mb-1.5" />
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          Upload Custom Cover Photo
                        </span>
                        <span className="text-[10px] text-neutral-400 mt-0.5">
                          Use any photo from camera or gallery (PNG, JPEG)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCustomCoverChange}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: Optional Passcode Encryption */}
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">3</span>
                    <span>Passcode Protection (Optional)</span>
                  </label>
                  <span className="text-[10px] text-neutral-400">AES-256-GCM Layer</span>
                </div>
                <div className="relative">
                  <input
                    type={showEncodePassword ? 'text' : 'password'}
                    value={encodePassword}
                    onChange={(e) => setEncodePassword(e.target.value)}
                    placeholder="Set a secret passcode or leave blank for open stego"
                    className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-8 pr-10 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                  />
                  <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <button
                    type="button"
                    onClick={() => setShowEncodePassword(!showEncodePassword)}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    {showEncodePassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1">
                <button
                  onClick={handleExecuteEncode}
                  disabled={isEncoding || (payloadType === 'text' && !textPayload.trim()) || (payloadType === 'file' && !filePayload)}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-lg transition active:scale-[0.99] ${
                    isEncoding
                      ? 'bg-neutral-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:opacity-95 shadow-indigo-600/25'
                  }`}
                >
                  {isEncoding ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Modulating Pixels into Stego Carrier...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Embed Secret into Stego Carrier Image</span>
                    </>
                  )}
                </button>
              </div>

              {/* Encoded Result Lightbox */}
              {encodedResult && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 dark:border-emerald-800/80 dark:bg-emerald-950/30 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Steganography Carrier Ready! (Zero Visual Distortion)</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                      {formatBytes(encodedResult.file.size)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-white dark:bg-neutral-900 rounded-xl p-2.5 border border-emerald-200 dark:border-emerald-900/50">
                    <img
                      src={encodedResult.previewUrl}
                      alt="Stego Result"
                      className="h-16 w-16 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
                    />
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-bold truncate text-neutral-900 dark:text-white">
                        {encodedResult.file.name}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {encodedResult.dimensions.width}x{encodedResult.dimensions.height} PNG · LSB 1-Bit Channel Payload
                      </p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                        Innocent to viewers, contains your secret data inside
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {onSendStegoFile && (
                      <button
                        onClick={() => {
                          onSendStegoFile(encodedResult.file);
                          onClose();
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-sm"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{isPeerConnected ? 'Beam to Mobile Now' : 'Stage to Send'}</span>
                      </button>
                    )}

                    <button
                      onClick={handleDownloadCarrierPNG}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs font-bold text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PNG</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= TAB 2: DECODE / REVEAL ======================= */}
          {activeTab === 'decode' && (
            <div className="space-y-4">
              {/* Carrier Image Upload */}
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/40 space-y-3">
                <label className="text-xs font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                  <span>Select Steganography Carrier Image</span>
                  {isStegoDetected !== null && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isStegoDetected
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {isStegoDetected ? '✓ Stego Magic Signature Confirmed' : 'No Stego Payload Detected'}
                    </span>
                  )}
                </label>

                {decodeCarrierPreview ? (
                  <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={decodeCarrierPreview}
                        alt="Carrier"
                        className="h-12 w-12 rounded-lg object-cover shrink-0 border border-neutral-200 dark:border-neutral-800"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate text-neutral-900 dark:text-white">
                          {decodeCarrierFile?.name}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {decodeCarrierFile ? formatBytes(decodeCarrierFile.size) : ''} · PNG Image
                        </p>
                      </div>
                    </div>
                    <label className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer px-2 py-1 hover:underline">
                      Change Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleDecodeCarrierChange(f);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-white p-6 cursor-pointer hover:border-cyan-400 dark:border-neutral-700 dark:bg-neutral-900/50 transition">
                    <Scan className="h-7 w-7 text-cyan-500 mb-2" />
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      Upload Steganographic Image Received on Mobile or PC
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">
                      Extracts hidden documents, files, or messages
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleDecodeCarrierChange(f);
                      }}
                    />
                  </label>
                )}

                {/* Password if needed */}
                <div className="pt-2">
                  <div className="relative">
                    <input
                      type={showDecodePassword ? 'text' : 'password'}
                      value={decodePassword}
                      onChange={(e) => setDecodePassword(e.target.value)}
                      placeholder="Passcode (only required if sender set a password)"
                      className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-8 pr-10 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-cyan-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                    />
                    <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                    <button
                      type="button"
                      onClick={() => setShowDecodePassword(!showDecodePassword)}
                      className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      {showDecodePassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleExecuteDecode}
                  disabled={isDecoding || !decodeCarrierFile}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-lg transition active:scale-[0.99] ${
                    isDecoding || !decodeCarrierFile
                      ? 'bg-neutral-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-600 via-teal-600 to-indigo-600 hover:opacity-95 shadow-cyan-600/25'
                  }`}
                >
                  {isDecoding ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Scanning LSB Matrix & Extracting Data...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      <span>Extract & Reveal Hidden Secret Data</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error Notice */}
              {decodeError && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <div>
                    <p className="font-bold">Decoding Error</p>
                    <p className="text-[11px] mt-0.5">{decodeError}</p>
                  </div>
                </div>
              )}

              {/* Extracted Secret Lightbox */}
              {decodedResult && (
                <div className="rounded-2xl border border-cyan-300 bg-cyan-50/60 p-4 dark:border-cyan-800/80 dark:bg-cyan-950/30 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      <span>Secret Unmasked Successfully!</span>
                    </div>
                    <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono">
                      {formatBytes(decodedResult.size)} · {decodedResult.encrypted ? 'Encrypted' : 'Cleartext'}
                    </span>
                  </div>

                  {decodedResult.type === 'file' && decodedResult.file ? (
                    <div className="rounded-xl border border-cyan-200 bg-white p-3.5 dark:border-cyan-900/60 dark:bg-neutral-900 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate text-neutral-900 dark:text-white">
                            {decodedResult.name}
                          </p>
                          <p className="text-[10px] text-neutral-400">
                            {formatBytes(decodedResult.size)} · {decodedResult.mimeType || 'Application Payload'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={handleDownloadExtractedFile}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 py-2.5 text-xs font-bold text-white hover:bg-cyan-700 transition shadow-sm"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Save Extracted File</span>
                        </button>

                        {onSendStegoFile && (
                          <button
                            onClick={() => {
                              if (decodedResult.file) {
                                onSendStegoFile(decodedResult.file);
                                onClose();
                              }
                            }}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-neutral-100 px-3.5 py-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 transition"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Beam Forward</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-cyan-200 bg-white p-3.5 dark:border-cyan-900/60 dark:bg-neutral-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Extracted Secret Message
                        </span>
                        <button
                          onClick={handleCopyText}
                          className="flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                          {copiedText ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedText ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="rounded-lg bg-neutral-50 dark:bg-neutral-950 p-3 font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                        {decodedResult.text}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Informational Footer */}
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-cyan-500" />
            <span>Zero-Cloud Local Browser Stego (Pixel-LSB)</span>
          </div>
          <span>Bi-directional: Mobile ⇄ PC</span>
        </div>
      </div>
    </div>
  );
};
