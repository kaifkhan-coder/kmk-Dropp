import React from 'react';
import {
  Shield,
  Lock,
  Unlock,
  Zap,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  KeyRound,
  FileCheck2,
} from 'lucide-react';
import { UserSession } from '../types';

interface EncryptionChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession | null;
  isPaid: boolean;
  userPaidEmail?: string;
  onSelectStandard: () => void;
  onSelectEncrypted: () => void;
  onOpenPayment: () => void;
}

export const EncryptionChoiceModal: React.FC<EncryptionChoiceModalProps> = ({
  isOpen,
  onClose,
  user,
  isPaid,
  userPaidEmail,
  onSelectStandard,
  onSelectEncrypted,
  onOpenPayment,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 sm:p-7">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="mb-6 space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Transfer Security Protocol</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">
            Do you want this transfer to be Encrypted?
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Choose whether to send with standard direct peer transit, or protect files with client-side Zero-Knowledge End-to-End Encryption & Decryption.
          </p>
        </div>

        {/* Two Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option 1: Standard Free Transfer */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-5 dark:border-neutral-800 dark:bg-neutral-900/40 flex flex-col justify-between hover:border-neutral-300 transition">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-200/80 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  100% Free
                </span>
              </div>

              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Standard Transfer
              </h3>
              <p className="mt-1 text-[11px] text-neutral-500 leading-relaxed">
                Direct WebRTC peer-to-peer data stream. High speed, zero server storage, standard transport security.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectStandard();
                onClose();
              }}
              className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white py-2 px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 transition"
            >
              <span>Send Standard (Free)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Option 2: Military-Grade Encrypted & Decrypted Transfer (Paid) */}
          <div className="relative rounded-2xl border-2 border-indigo-500/80 bg-gradient-to-b from-indigo-50/40 to-white p-5 dark:from-indigo-950/30 dark:to-neutral-900/60 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                  <Lock className="h-4 w-4" />
                </div>
                {isPaid ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Unlocked for You</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-600" />
                    <span>Paid (₹199 Lifetime)</span>
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <span>Encrypted & Decrypted</span>
              </h3>
              <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Zero-knowledge client-side AES-256-GCM encryption & recipient decryption. Keys never leave the browser.
              </p>

              {isPaid ? (
                <div className="mt-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80 p-2 text-[10px] text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-900/60 dark:text-emerald-300 font-medium">
                  Verified license active for {userPaidEmail || user?.email || 'your Gmail'}.
                </div>
              ) : (
                <div className="mt-2.5 rounded-lg bg-amber-50 border border-amber-200/80 p-2 text-[10px] text-amber-800 dark:bg-amber-950/50 dark:border-amber-900/60 dark:text-amber-300">
                  Scan UPI QR to pay ₹199 once. Permanent lifetime access whenever you visit with your Gmail.
                </div>
              )}
            </div>

            {isPaid ? (
              <button
                type="button"
                onClick={() => {
                  onSelectEncrypted();
                  onClose();
                }}
                className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 px-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Send with E2EE Encryption</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPayment();
                }}
                className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2 px-3 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                <span>Unlock for ₹199 (Open QR)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
