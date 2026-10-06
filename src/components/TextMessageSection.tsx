import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Trash2,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Share2,
  Laptop,
} from 'lucide-react';
import { PeerTextMessage, PeerDevice } from '../types';

interface TextMessageSectionProps {
  messages: PeerTextMessage[];
  peers: PeerDevice[];
  onSendMessage: (text: string) => void;
  onClearMessages: () => void;
  isSignedIn: boolean;
  onRequireAuth: () => void;
  onOpenQR: () => void;
}

export const TextMessageSection: React.FC<TextMessageSectionProps> = ({
  messages,
  peers,
  onSendMessage,
  onClearMessages,
  isSignedIn,
  onRequireAuth,
  onOpenQR,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }
    if (!inputText.trim()) return;

    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  const isUrl = (str: string) => {
    return /^https?:\/\/[^\s]+$/i.test(str.trim());
  };

  const quickSnippets = [
    { label: 'Paste Clipboard', action: async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) setInputText(text);
      } catch {
        // clipboard permission might be restricted
      }
    }},
    { label: 'Current Page URL', action: () => setInputText(window.location.href) },
    { label: 'Test Ping: Hello PC 👋', action: () => setInputText('Hello from mobile! Connected successfully. 🚀') },
  ];

  const hasMobilePeer = peers.some((p) => p.deviceType === 'mobile');
  const hasDesktopPeer = peers.some((p) => p.deviceType === 'desktop' || p.deviceType === 'tablet');

  return (
    <section className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100/80 px-3 py-1 text-xs font-semibold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 mb-2">
            <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
            <span>Mobile ⇄ PC Instant Text Beam</span>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Send Text & Clipboard Messages
          </h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-xl">
            Instantly beam links, passwords, OTP codes, notes, or copied text between your smartphone and computer with zero server storage and real-time P2P synchronization.
          </p>
        </div>

        {/* Peer Connection Status */}
        <div className="flex items-center gap-3">
          {peers.length > 0 ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex items-center gap-1.5 font-medium">
                {hasMobilePeer ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
                <span>
                  Connected to {peers.map((p) => p.deviceName).join(', ')}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenQR}
              className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-800 hover:bg-amber-500/20 dark:text-amber-300 transition"
            >
              <Smartphone className="h-3.5 w-3.5 text-amber-600" />
              <span>Scan QR on Mobile to Pair</span>
            </button>
          )}

          {messages.length > 0 && (
            <button
              onClick={onClearMessages}
              title="Clear message history"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-neutral-800 dark:hover:bg-neutral-800 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Thread Display */}
      <div className="mt-6 flex flex-col rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-neutral-800/80 dark:bg-neutral-950/40">
        <div className="min-h-[220px] max-h-[380px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center p-6 text-neutral-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-200/50 text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400 mb-3">
                <Share2 className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                No text messages sent yet
              </p>
              <p className="mt-1 text-[11px] max-w-sm text-neutral-500 dark:text-neutral-400">
                Type a message or paste a link below to send directly from mobile to PC or from PC to mobile in real time.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isSent = m.direction === 'sent';
              const isLink = isUrl(m.text);

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isSent ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender meta */}
                  <div className="flex items-center gap-1.5 px-1 pb-1 text-[10px] text-neutral-400">
                    {m.senderDeviceType === 'mobile' ? (
                      <Smartphone className="h-3 w-3" />
                    ) : (
                      <Laptop className="h-3 w-3" />
                    )}
                    <span className="font-medium">
                      {isSent ? 'You' : m.senderName || 'Peer Device'}
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`group relative max-w-lg rounded-2xl p-3.5 shadow-sm transition ${
                      isSent
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 rounded-br-xs'
                        : 'border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-xs leading-relaxed font-sans select-text">
                      {m.text}
                    </p>

                    {/* Action buttons inside bubble */}
                    <div className="mt-2.5 flex items-center justify-end gap-2 border-t border-white/10 dark:border-neutral-800 pt-2">
                      {isLink && (
                        <a
                          href={m.text.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium transition ${
                            isSent
                              ? 'bg-white/10 hover:bg-white/20 text-white dark:bg-black/10 dark:text-neutral-950'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Open Link</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleCopy(m.id, m.text)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium transition ${
                          isSent
                            ? 'bg-white/10 hover:bg-white/20 text-white dark:bg-black/10 dark:text-neutral-950'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Snippet Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
          <span className="text-[10px] font-medium text-neutral-400">Quick:</span>
          {quickSnippets.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={chip.action}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[10px] font-medium text-neutral-600 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700 transition"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input Text Form */}
        <form onSubmit={handleSend} className="mt-3">
          <div className="relative">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isSignedIn
                  ? 'Type a message, paste a link, or note to beam to peer... (Press Ctrl/Cmd + Enter to send)'
                  : 'Sign in to send text messages to PC'
              }
              disabled={!isSignedIn}
              className="w-full resize-none rounded-xl border border-neutral-200 bg-white p-3 pr-24 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:focus:border-white dark:focus:ring-white"
            />

            <button
              type="submit"
              disabled={!isSignedIn || !inputText.trim()}
              className="absolute right-2 bottom-3 flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-40 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition"
            >
              <Send className="h-3 w-3" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
