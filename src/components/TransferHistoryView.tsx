import React, { useState } from 'react';
import {
  Clock,
  ArrowUp,
  ArrowDown,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  QrCode,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Lock,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { TransferHistoryItem, ScannedQRConnection } from '../types';
import { formatBytes, formatSpeed } from '../utils/format';

interface TransferHistoryViewProps {
  history: TransferHistoryItem[];
  onClearHistory: () => void;
  isSignedIn: boolean;
  onRequireAuth: () => void;
  userEmail?: string;
  recentConnections: ScannedQRConnection[];
  onReconnect: (connection: ScannedQRConnection) => void;
  onRemoveConnection: (id: string) => void;
  onClearConnections: () => void;
}

export const TransferHistoryView: React.FC<TransferHistoryViewProps> = ({
  history,
  onClearHistory,
  isSignedIn,
  onRequireAuth,
  userEmail,
  recentConnections,
  onReconnect,
  onRemoveConnection,
  onClearConnections,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const formatScannedTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // STRICT LOGIN GATE: If user is not authenticated, lock the history tab
  if (!isSignedIn) {
    return (
      <div className="w-full rounded-3xl border border-neutral-200/90 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60 animate-fade-in text-center max-w-2xl mx-auto my-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 mb-4 shadow-inner">
          <Lock className="h-8 w-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 mb-2">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
          <span>Strict Access Control · Login Required</span>
        </div>

        <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Sign In to Access Transfer History
        </h3>

        <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto leading-relaxed">
          Transfer receipts, audit logs, and your <strong>last 5 frequent device QR connection URLs</strong> are strictly protected and available only to logged-in users.
        </p>

        {/* Benefits list */}
        <div className="my-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5 dark:border-neutral-800 dark:bg-neutral-900/50">
            <Clock className="h-4 w-4 text-indigo-500 mb-1.5" />
            <p className="text-xs font-bold text-neutral-900 dark:text-white">Audit Log Receipts</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">Permanent record of sent & received files with SHA-256 checks.</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5 dark:border-neutral-800 dark:bg-neutral-900/50">
            <QrCode className="h-4 w-4 text-emerald-500 mb-1.5" />
            <p className="text-xs font-bold text-neutral-900 dark:text-white">Frequent Reconnect</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">Instant 1-click reconnect to your last 5 scanned mobile QR devices.</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5 dark:border-neutral-800 dark:bg-neutral-900/50">
            <UserCheck className="h-4 w-4 text-amber-500 mb-1.5" />
            <p className="text-xs font-bold text-neutral-900 dark:text-white">Linked to Gmail</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">Your settings and paid transfer perks stay bound to your account.</p>
          </div>
        </div>

        <button
          onClick={onRequireAuth}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 transition"
        >
          <span>Sign In With Gmail or Magic Link</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* SECTION 1: FREQUENT DEVICES & LAST 5 SCANNED QR CONNECTION URLS */}
      <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Frequent Devices & Quick Reconnect
                </h3>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  Last {recentConnections.length}/5 Scanned
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Stores your last 5 scanned QR connection URLs for fast 1-click device pairing.
              </p>
            </div>
          </div>

          {recentConnections.length > 0 && (
            <button
              onClick={onClearConnections}
              className="text-xs text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 transition self-start sm:self-auto"
            >
              Clear Scanned QR List
            </button>
          )}
        </div>

        {recentConnections.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-2">
              <Smartphone className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-neutral-900 dark:text-white">
              No scanned QR connections saved yet
            </p>
            <p className="mt-1 text-[11px] text-neutral-500 max-w-sm mx-auto">
              Whenever you scan a QR code using the in-app camera or join a peer room, the last 5 connection URLs will be recorded here for instant reconnection.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
            {recentConnections.slice(0, 5).map((conn, idx) => (
              <div
                key={conn.id || idx}
                className="relative flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 hover:border-indigo-300 dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:border-indigo-800 transition group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-mono text-[10px] font-bold">
                        #{idx + 1}
                      </span>
                      <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                        Room {conn.roomId}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {formatScannedTime(conn.scannedAt)}
                      </span>
                      <button
                        onClick={() => onRemoveConnection(conn.id)}
                        title="Remove from frequent list"
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 truncate mb-3" title={conn.url}>
                    {conn.url}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800">
                  <button
                    onClick={() => onReconnect(conn)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-1.5 px-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>Reconnect Now</span>
                  </button>

                  <button
                    onClick={() => handleCopyUrl(conn.id, conn.url)}
                    title="Copy connection URL"
                    className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 transition"
                  >
                    {copiedId === conn.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: TRANSFER RECEIPTS & ACTIVITY AUDIT LOG */}
      <div className="w-full rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span>Transfer Receipts & Activity Audit</span>
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Audit log linked to user session ({userEmail || 'Authenticated User'}).
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-3">
              <Clock className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              No transfer receipts recorded yet
            </p>
            <p className="mt-1 text-xs text-neutral-500 max-w-xs mx-auto">
              Files transferred between your PC and mobile device will record encrypted receipts here with integrity verification.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 uppercase font-mono text-[10px]">
                  <th className="py-3 px-2">Direction</th>
                  <th className="py-3 px-2">Filename</th>
                  <th className="py-3 px-2">Size</th>
                  <th className="py-3 px-2">Avg Speed</th>
                  <th className="py-3 px-2">Device</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition">
                    <td className="py-3 px-2 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 font-medium">
                        {item.direction === 'sent' ? (
                          <>
                            <ArrowUp className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="text-neutral-700 dark:text-neutral-300">Sent</span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-neutral-700 dark:text-neutral-300">Received</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3 px-2 font-medium text-neutral-900 dark:text-white truncate max-w-[200px]">
                      {item.fileName}
                    </td>

                    <td className="py-3 px-2 font-mono text-neutral-500 tabular-nums whitespace-nowrap">
                      {formatBytes(item.fileSize)}
                    </td>

                    <td className="py-3 px-2 font-mono text-neutral-500 tabular-nums whitespace-nowrap">
                      {item.speedAvgBps ? formatSpeed(item.speedAvgBps) : '--'}
                    </td>

                    <td className="py-3 px-2 text-neutral-500 truncate max-w-[140px]">
                      {item.peerName || 'Direct Peer'}
                    </td>

                    <td className="py-3 px-2 whitespace-nowrap">
                      {item.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-500">
                          <XCircle className="h-3.5 w-3.5" />
                          <span className="capitalize">{item.status}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-right font-mono text-neutral-400 tabular-nums whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
