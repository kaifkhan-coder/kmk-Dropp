import React, { useState } from 'react';
import { Shield, KeyRound, Lock, AlertCircle, CheckCircle2, ArrowRight, X, Mail } from 'lucide-react';
import { safeFetchJson } from '../utils/api';
import { AdminSession } from '../types';
import { safeLocalStorage } from '../utils/storage';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: AdminSession) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [secretCode, setSecretCode] = useState('');
  const [generatedHintCode, setGeneratedHintCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your administrator email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await safeFetchJson<{ success: boolean; message: string; code?: string }>('/api/admin/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      if (res.ok && res.data?.success) {
        setStep('code');
        setMessage(res.data.message);
        if (res.data.code) {
          setGeneratedHintCode(res.data.code);
          setSecretCode(res.data.code);
        }
      } else {
        setError(res.error || 'Access Denied: Entered email is not recognized as an authorized system administrator.');
      }
    } catch {
      setError('Network error while requesting verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = secretCode.trim();

    if (!cleanCode) {
      setError('Please enter your secret verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        token: string;
        email: string;
        name: string;
      }>('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
      });

      if (res.ok && res.data?.success && res.data.token) {
        const session: AdminSession = {
          token: res.data.token,
          email: res.data.email,
          name: res.data.name,
          authenticatedAt: Date.now(),
        };
        safeLocalStorage.setItem('beamdrop_admin_session', JSON.stringify(session));
        onSuccess(session);
        onClose();
      } else {
        setError(res.error || 'Invalid secret verification code. Please try again.');
      }
    } catch {
      setError('Authentication error while verifying code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Security Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span>Admin Security Portal</span>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                Restricted
              </span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Authorized System Administrator Verification
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {message && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{message}</span>
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleRequestCode} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Administrator Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your administrator email address"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 pl-10 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500 dark:focus:border-white"
                />
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                Only the designated system administrator can unlock full administrative controls.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 px-4 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition shadow-sm disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{isLoading ? 'Verifying Identity...' : 'Generate Secret Verification Code'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="mt-5 space-y-4">
            <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-200 dark:bg-neutral-800/60 dark:border-neutral-700">
              <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                Verifying for: <strong className="text-neutral-900 dark:text-white font-mono">{email}</strong>
              </p>
              {generatedHintCode && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                  <span>Generated Security Code:</span>
                  <span className="font-mono font-bold tracking-widest text-sm">{generatedHintCode}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Secret 6-Digit Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="Enter secret code (e.g. 78692 or 6-digit code)"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 pl-10 text-xs font-mono font-bold tracking-wider text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500 dark:focus:border-white"
                />
                <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
              </div>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                Enter the secret code or your master admin passkey (<code className="font-mono">78692</code>).
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-1/3 rounded-xl border border-neutral-200 py-2.5 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 px-4 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition shadow-sm disabled:opacity-50"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>{isLoading ? 'Verifying...' : 'Unlock Admin Panel'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
