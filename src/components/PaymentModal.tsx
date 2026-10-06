import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Shield,
  Lock,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Mail,
  Zap,
  Upload,
  Image as ImageIcon,
  Clock,
  ShieldCheck,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import { UserSession } from '../types';
import { safeLocalStorage } from '../utils/storage';
import { formatBytes } from '../utils/format';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession | null;
  onPaymentSuccess: (email: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  user,
  onPaymentSuccess,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form states
  const [emailInput, setEmailInput] = useState('');
  const [utrInput, setUtrInput] = useState('');
  const [payerNameInput, setPayerNameInput] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string | null>(null);
  const [screenshotFileSize, setScreenshotFileSize] = useState<number>(0);

  // Dynamic admin-configured details
  const [payeeName, setPayeeName] = useState('Kaif Khan');
  const [upiId, setUpiId] = useState('khankaifcom551@oksbi');
  const [priceAmount, setPriceAmount] = useState<number>(199);

  // Status and submission states
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Approval flow status: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  const [approvalStatus, setApprovalStatus] = useState<'not_submitted' | 'pending' | 'approved' | 'rejected'>('not_submitted');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [showResubmitForm, setShowResubmitForm] = useState(false);

  // Fetch dynamic payment details (admin price)
  const fetchPaymentDetails = async () => {
    try {
      const res = await fetch('/api/payment/details');
      if (res.ok) {
        const data = await res.json();
        if (data.name) setPayeeName(data.name);
        if (data.upiId) setUpiId(data.upiId);
        if (data.amount) setPriceAmount(Number(data.amount));
      }
    } catch {
      // fallback
    }
  };

  // Check current approval status for email
  const checkStatusForEmail = async (emailToCheck: string, silent = false) => {
    if (!emailToCheck || !emailToCheck.includes('@')) return;
    if (!silent) setIsCheckingStatus(true);
    try {
      const res = await fetch(`/api/payment/status?email=${encodeURIComponent(emailToCheck)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.isPaid && data.status === 'approved') {
          setApprovalStatus('approved');
          safeLocalStorage.setItem('beamdrop_paid_email', emailToCheck);
          safeLocalStorage.setItem(`beamdrop_paid_${emailToCheck}`, 'true');
          onPaymentSuccess(emailToCheck);
        } else if (data.status === 'pending') {
          setApprovalStatus('pending');
          safeLocalStorage.removeItem('beamdrop_paid_email');
          safeLocalStorage.removeItem(`beamdrop_paid_${emailToCheck}`);
        } else if (data.status === 'rejected') {
          setApprovalStatus('rejected');
          safeLocalStorage.removeItem('beamdrop_paid_email');
          safeLocalStorage.removeItem(`beamdrop_paid_${emailToCheck}`);
          setRejectionReason(data.rejectionReason || 'Receipt was not recognized or payment unverified.');
        } else {
          setApprovalStatus('not_submitted');
          safeLocalStorage.removeItem('beamdrop_paid_email');
          safeLocalStorage.removeItem(`beamdrop_paid_${emailToCheck}`);
        }
      }
    } catch {
      // ignore
    } finally {
      if (!silent) setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPaymentDetails();
      const currentEmail = user?.email || safeLocalStorage.getItem('beamdrop_last_gmail') || '';
      if (currentEmail) {
        setEmailInput(currentEmail);
        checkStatusForEmail(currentEmail, true);
      }
      if (user?.name) {
        setPayerNameInput(user.name);
      }
    }
  }, [isOpen, user]);

  // Periodic polling when pending approval
  useEffect(() => {
    if (!isOpen || approvalStatus !== 'pending' || !emailInput) return;
    const interval = setInterval(() => {
      checkStatusForEmail(emailInput, true);
    }, 8000);
    return () => clearInterval(interval);
  }, [isOpen, approvalStatus, emailInput]);

  // Draw UPI QR Canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const upiPayload = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${priceAmount.toFixed(2)}&cu=INR&tn=BeamDrop%20E2EE%20Lifetime%20Access`;

    QRCode.toCanvas(
      canvasRef.current,
      upiPayload,
      {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (err) => {
        if (err) console.error('Failed to generate payment QR:', err);
      }
    );
  }, [isOpen, upiId, payeeName, priceAmount]);

  if (!isOpen) return null;

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, or screenshot).');
      return;
    }

    setScreenshotFileName(file.name);
    setScreenshotFileSize(file.size);

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotBase64(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid Gmail address to link your lifetime license.');
      return;
    }

    if (!screenshotBase64) {
      setError('A payment receipt screenshot is required. Please upload your transaction screenshot.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payment/submit-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          payerName: payerNameInput.trim() || cleanEmail.split('@')[0],
          utr: utrInput.trim() || `UPI_${Date.now().toString(36).toUpperCase()}`,
          amount: priceAmount,
          screenshotBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit payment proof.');
      }

      setApprovalStatus('pending');
      setShowResubmitForm(false);
      safeLocalStorage.setItem('beamdrop_last_gmail', cleanEmail);
      setSuccessMsg('Screenshot successfully submitted to administrator Kaif Khan for approval!');
    } catch (err: any) {
      setError(err.message || 'Submission error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const upiPayload = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${priceAmount.toFixed(2)}&cu=INR&tn=BeamDrop%20E2EE%20Lifetime%20Access`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative my-8 w-full max-w-2xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Top Title */}
        <div className="text-center space-y-1 mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300 mb-1">
            <Lock className="h-3.5 w-3.5 text-indigo-600" />
            <span>Paid Feature · Admin Configured Price</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">
            Unlock Zero-Knowledge E2EE Transfers
          </h2>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Pay ₹{priceAmount} via UPI, upload your payment screenshot, and administrator Kaif Khan will review and approve your lifetime access.
          </p>
        </div>

        {/* Key Advantages of E2EE Section */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-950 dark:bg-indigo-950/30 mb-6">
          <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 mb-2.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Key Advantages of End-to-End Encryption (E2EE):</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-neutral-600 dark:text-neutral-300">
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Zero-Knowledge:</strong> Keys never leave your device; servers cannot read your files.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>AES-256-GCM + PBKDF2:</strong> Quantum-resistant authenticated cipher with 100,000 rounds.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Anti-MITM Protection:</strong> Complete immunity from Wi-Fi interceptors and ISP snooping.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span><strong>Ephemeral RAM Transit:</strong> No file fragments are ever cached or stored on server disks.</span>
            </div>
          </div>
        </div>

        {/* APPROVAL STATUS BANNER (If Pending or Rejected) */}
        {approvalStatus === 'pending' && !showResubmitForm && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/40 animate-fade-in space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Payment Screenshot Submitted · Awaiting Administrator Approval
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  Your screenshot and details have been forwarded to administrator Kaif Khan ({payeeName}). Once reviewed and approved in the Admin Console, your lifetime license will automatically unlock here.
                </p>
                <div className="mt-2 text-[11px] font-mono text-amber-900/80 dark:text-amber-200/80">
                  <span>Linked Gmail: <strong>{emailInput}</strong></span> · <span>Amount: ₹{priceAmount}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-amber-200 dark:border-amber-900/40">
              <button
                type="button"
                onClick={() => checkStatusForEmail(emailInput)}
                disabled={isCheckingStatus}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                <span>Check Live Status</span>
              </button>
              <button
                type="button"
                onClick={() => setShowResubmitForm(true)}
                className="text-xs text-amber-800 dark:text-amber-300 hover:underline"
              >
                Re-submit different receipt
              </button>
            </div>
          </div>
        )}

        {approvalStatus === 'rejected' && !showResubmitForm && (
          <div className="mb-6 rounded-2xl border border-rose-300 bg-rose-50 p-5 dark:border-rose-900/60 dark:bg-rose-950/40 animate-fade-in space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-700 dark:text-rose-300">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Payment Submission Rejected by Administrator
                </h4>
                <div className="mt-1 rounded-xl bg-white/70 p-2.5 text-xs font-medium text-rose-900 border border-rose-200 dark:bg-neutral-900/70 dark:border-rose-900 dark:text-rose-300">
                  <strong>Reason from Administrator:</strong> {rejectionReason}
                </div>
                <p className="text-[11px] text-rose-800 dark:text-rose-400 mt-2">
                  Please verify your UPI transaction, ensure the amount (₹{priceAmount}) is correct, and upload a valid, clear screenshot.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowResubmitForm(true)}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Upload New Screenshot & Re-submit</span>
              </button>
            </div>
          </div>
        )}

        {approvalStatus === 'approved' && (
          <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/40 animate-fade-in text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
              Payment Approved by Administrator!
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Lifetime Zero-Knowledge Encrypted & Decrypted Transfer is now active for <strong>{emailInput}</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              Start Encrypted Transfer Now
            </button>
          </div>
        )}

        {/* Payment & Screenshot Form (Shown if not yet submitted, or if user is re-submitting) */}
        {(approvalStatus === 'not_submitted' || showResubmitForm) && (
          <div className="space-y-6">
            {/* The UPI Payment Card */}
            <div className="flex flex-col sm:flex-row items-center gap-6 rounded-3xl border border-neutral-200/90 bg-neutral-50/50 p-5 dark:border-neutral-800 dark:bg-neutral-900/50">
              {/* Left: Scannable Canvas QR */}
              <div className="relative rounded-2xl border border-neutral-200 bg-white p-2.5 shadow-sm dark:border-neutral-700 shrink-0">
                <canvas ref={canvasRef} className="rounded-xl" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-neutral-100 p-1">
                    <Zap className="h-4 w-4 text-indigo-600" />
                  </div>
                </div>
              </div>

              {/* Right: Payment Instructions */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Recipient Account</span>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                    <span>{payeeName}</span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Verified Admin
                    </span>
                  </h3>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-neutral-700 dark:text-neutral-200 font-medium">
                  <span>UPI ID:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">{upiId}</span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    title="Copy UPI ID"
                    className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  >
                    {copiedUpi ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  Admin Price: <span className="text-emerald-600 dark:text-emerald-400 text-base">₹{priceAmount}</span>
                  <span className="text-[11px] font-normal text-neutral-400 ml-1.5">(One-Time Lifetime)</span>
                </p>

                <a
                  href={upiPayload}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 py-1.5 px-3 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition shadow-sm"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-400 dark:text-amber-500" />
                  <span>Open in UPI App (GPay / PhonePe / Paytm)</span>
                </a>
              </div>
            </div>

            {/* Step 2: Upload Screenshot & Submit Proof */}
            <form onSubmit={handleSubmitProof} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Your Gmail Address:
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full rounded-xl border border-neutral-300 bg-white py-2 pl-9 pr-3 text-xs text-neutral-900 focus:border-indigo-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    UPI Ref / UTR (12-digit number):
                  </label>
                  <input
                    type="text"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value)}
                    placeholder="e.g. 427819234812"
                    className="w-full rounded-xl border border-neutral-300 bg-white py-2 px-3 text-xs font-mono text-neutral-900 focus:border-indigo-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Screenshot Upload Requirement */}
              <div>
                <label className="text-xs font-bold text-neutral-900 dark:text-white flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-indigo-500" />
                    <span>Upload Payment Screenshot (Required):</span>
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    * Admin verifies this receipt
                  </span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotFileChange}
                  className="hidden"
                />

                {!screenshotBase64 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 p-5 text-center hover:border-indigo-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:border-indigo-500 dark:hover:bg-neutral-900 transition"
                  >
                    <Upload className="h-7 w-7 text-indigo-500 mb-1.5" />
                    <p className="text-xs font-bold text-neutral-900 dark:text-white">
                      Click to upload payment screenshot
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      PNG, JPG, or screenshot from Google Pay, PhonePe, or Paytm
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50/60 p-3 dark:border-emerald-800 dark:bg-emerald-950/40">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl overflow-hidden border border-emerald-200 shrink-0 bg-white">
                        <img src={screenshotBase64} alt="Receipt preview" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate max-w-xs">
                          {screenshotFileName || 'payment_screenshot.png'}
                        </p>
                        <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                          {formatBytes(screenshotFileSize)} · Screenshot Attached
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotBase64(null);
                        setScreenshotFileName(null);
                      }}
                      className="rounded-lg p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-900 dark:text-rose-300 animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-900 dark:text-emerald-300 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={() => checkStatusForEmail(emailInput)}
                  disabled={isCheckingStatus}
                  className="w-full sm:w-auto flex-1 rounded-xl border border-neutral-300 py-2.5 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
                >
                  {isCheckingStatus ? 'Checking...' : 'Check Approval Status'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !screenshotBase64 || !emailInput.trim()}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 px-5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending to Admin...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      <span>Send Screenshot for Admin Approval</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
