import React, { useState } from 'react';
import { Star, Send, ShieldAlert, Sparkles, AlertCircle, CheckCircle2, MessageSquare, X } from 'lucide-react';
import { UserSession } from '../types';
import { safeFetchJson } from '../utils/api';
import { safeLocalStorage } from '../utils/storage';

interface ForcedFeedbackModalProps {
  isOpen: boolean;
  user: UserSession | null;
  onCompleted: () => void;
}

export const ForcedFeedbackModal: React.FC<ForcedFeedbackModalProps> = ({
  isOpen,
  user,
  onCompleted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<'suggestion' | 'evaluation' | 'bug' | 'feature'>('evaluation');
  const [feedbackText, setFeedbackText] = useState('');
  const [senderEmail, setSenderEmail] = useState(user?.email || '');
  const [senderName, setSenderName] = useState(user?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDismiss = () => {
    safeLocalStorage.setItem('beamdrop_feedback_submitted', 'true');
    safeLocalStorage.setItem('beamdrop_feedback_given', 'true');
    onCompleted();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!feedbackText.trim() || feedbackText.trim().length < 5) {
      setError('Please provide at least a few words describing your experience or suggestion.');
      return;
    }

    setIsSubmitting(true);

    const submissionPayload = {
      rating,
      category,
      feedbackText: feedbackText.trim(),
      userEmail: senderEmail || user?.email || 'guest-user@beamdrop.app',
      userName: senderName || user?.name || 'BeamDrop User',
      deviceInfo: `${navigator.platform} - ${navigator.userAgent.slice(0, 60)}`,
      isMandatorySecondUsage: true,
    };

    try {
      await safeFetchJson('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });

      // Save flag in localStorage so user is not prompted again
      safeLocalStorage.setItem('beamdrop_feedback_submitted', 'true');
      safeLocalStorage.setItem('beamdrop_feedback_given', 'true');
      safeLocalStorage.setItem('beamdrop_feedback_submitted_at', Date.now().toString());

      onCompleted();
    } catch {
      // Even if network fails, record locally and allow continuing
      safeLocalStorage.setItem('beamdrop_feedback_submitted', 'true');
      safeLocalStorage.setItem('beamdrop_feedback_given', 'true');
      onCompleted();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Forceful Banner Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 uppercase tracking-wider">
                  2nd Usage Feedback
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mt-0.5">
                Help Us Improve BeamDrop
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Quick review to help engineer Kaif Khan improve transfers.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 transition"
            title="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Star Rating Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              How was your peer-to-peer file transfer experience?
            </label>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-neutral-50 border border-neutral-200 dark:bg-neutral-800/60 dark:border-neutral-700">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-neutral-300 dark:text-neutral-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 ml-2">
                {rating === 5 && '🌟 Outstanding Speed!'}
                {rating === 4 && '👍 Great & Smooth'}
                {rating === 3 && '👌 Good / Average'}
                {rating === 2 && '⚠️ Needs Improvement'}
                {rating === 1 && '❌ Had Connection Issues'}
              </span>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Feedback Topic
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'evaluation', label: 'Evaluation' },
                { id: 'suggestion', label: 'Suggestion' },
                { id: 'feature', label: 'Feature Idea' },
                { id: 'bug', label: 'Report Bug' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                    category === c.id
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-950 shadow-sm'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Text */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Your Review & Comments <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={3}
              required
              placeholder="What worked well? How was the QR code pairing, transfer speed, or device sync? Any suggestions for Kaif Khan?"
              className="w-full rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500 dark:focus:border-white"
            />
          </div>

          {/* User Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Name or Nickname"
                className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Your Email (Optional)
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 px-4 text-xs font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition shadow-lg disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Submitting to Admin Panel...' : 'Submit Feedback & Unlock Transfer'}</span>
            </button>
            <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400">
              <span>System Administrator & Security Review</span>
              <button
                type="button"
                onClick={handleDismiss}
                className="hover:underline hover:text-neutral-600 dark:hover:text-neutral-200 transition"
              >
                Skip for now
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
