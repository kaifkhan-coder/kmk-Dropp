import React, { useState, useEffect, useMemo } from 'react';
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
  Copy,
  Check,
  Zap,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code,
  File,
  Search,
  Filter,
  FileSpreadsheet,
  FileCode,
  Database,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { TransferHistoryItem, ScannedQRConnection } from '../types';
import { formatBytes, formatSpeed, getFileCategory } from '../utils/format';
import {
  getAllTransfersFromDB,
  deleteTransferFromDB,
  clearAllTransfersInDB,
  exportHistoryAsJSON,
  exportHistoryAsCSV,
  getTransferStatistics,
  ExtendedHistoryRecord,
} from '../utils/indexedDBHistory';
import { soundFx } from '../utils/soundEffects';

interface TransferHistoryViewProps {
  history: TransferHistoryItem[];
  onClearHistory: () => void;
  isSignedIn?: boolean;
  onRequireAuth?: () => void;
  userEmail?: string;
  recentConnections?: ScannedQRConnection[];
  onReconnect?: (connection: ScannedQRConnection) => void;
  onRemoveConnection?: (id: string) => void;
  onClearConnections?: () => void;
}

export const TransferHistoryView: React.FC<TransferHistoryViewProps> = ({
  history: propHistory,
  onClearHistory,
  isSignedIn = false,
  onRequireAuth,
  userEmail,
  recentConnections = [],
  onReconnect,
  onRemoveConnection,
  onClearConnections,
}) => {
  const [dbRecords, setDbRecords] = useState<ExtendedHistoryRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirection, setFilterDirection] = useState<'all' | 'sent' | 'received'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [stats, setStats] = useState<{
    totalFiles: number;
    totalBytes: number;
    sentCount: number;
    receivedCount: number;
    sentBytes: number;
    receivedBytes: number;
  }>({
    totalFiles: 0,
    totalBytes: 0,
    sentCount: 0,
    receivedCount: 0,
    sentBytes: 0,
    receivedBytes: 0,
  });

  // Load records directly from browser IndexedDB
  const refreshFromIndexedDB = async () => {
    try {
      const records = await getAllTransfersFromDB();
      const currentStats = await getTransferStatistics();

      // If IndexedDB has items, use them; otherwise merge with propHistory
      if (records && records.length > 0) {
        setDbRecords(records);
        setStats(currentStats);
      } else if (propHistory && propHistory.length > 0) {
        setDbRecords(propHistory as ExtendedHistoryRecord[]);
        let total = 0;
        let sent = 0;
        let recv = 0;
        propHistory.forEach((h) => {
          total += h.fileSize;
          if (h.direction === 'sent') sent++;
          else recv++;
        });
        setStats({
          totalFiles: propHistory.length,
          totalBytes: total,
          sentCount: sent,
          receivedCount: recv,
          sentBytes: total,
          receivedBytes: 0,
        });
      } else {
        setDbRecords([]);
      }
    } catch {
      setDbRecords(propHistory as ExtendedHistoryRecord[]);
    }
  };

  useEffect(() => {
    refreshFromIndexedDB();
  }, [propHistory]);

  const handleCopyUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      soundFx.playSound('click');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleDeleteItem = async (id: string) => {
    soundFx.playSound('click');
    await deleteTransferFromDB(id);
    await refreshFromIndexedDB();
  };

  const handleClearAllHistory = async () => {
    if (window.confirm('Are you sure you want to clear your local transfer history from IndexedDB?')) {
      soundFx.playSound('alert');
      await clearAllTransfersInDB();
      onClearHistory();
      await refreshFromIndexedDB();
    }
  };

  const handleExportJSON = async () => {
    soundFx.playSound('click');
    const jsonStr = await exportHistoryAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beamdrop_history_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    soundFx.playSound('click');
    const csvStr = await exportHistoryAsCSV();
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beamdrop_history_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatScannedTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <ImageIcon className="h-4 w-4 text-indigo-500" />;
      case 'pdf':
      case 'document':
        return <FileText className="h-4 w-4 text-rose-500" />;
      case 'archive':
        return <Archive className="h-4 w-4 text-amber-500" />;
      case 'audio':
        return <Music className="h-4 w-4 text-violet-500" />;
      case 'video':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'code':
        return <Code className="h-4 w-4 text-emerald-500" />;
      default:
        return <File className="h-4 w-4 text-neutral-500" />;
    }
  };

  // Filtered and searched records
  const filteredRecords = useMemo(() => {
    return dbRecords.filter((item) => {
      // Direction filter
      if (filterDirection !== 'all' && item.direction !== filterDirection) {
        return false;
      }

      // Category filter
      if (filterCategory !== 'all') {
        const cat = getFileCategory(item.fileName, item.fileType);
        if (cat !== filterCategory) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (item.fileName || '').toLowerCase().includes(q);
        const matchesPeer = (item.peerName || '').toLowerCase().includes(q);
        const matchesType = (item.fileType || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPeer && !matchesType) return false;
      }

      return true;
    });
  }, [dbRecords, filterDirection, filterCategory, searchQuery]);

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* SECTION: IndexedDB Local Storage Analytics Card */}
      <div className="rounded-3xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 p-5 sm:p-7 shadow-sm dark:border-indigo-900/50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-neutral-900 dark:text-white tracking-tight">
                  Past Transfers History
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Local IndexedDB (No Login Required)</span>
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                Saved 100% locally in your browser. All your file records persist even if you refresh or close the page.
              </p>
            </div>
          </div>

          {/* Export & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={dbRecords.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 transition disabled:opacity-40"
              title="Download CSV spreadsheet"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJSON}
              disabled={dbRecords.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 transition disabled:opacity-40"
              title="Export complete JSON audit log"
            >
              <FileCode className="h-3.5 w-3.5 text-indigo-600" />
              <span>Export JSON</span>
            </button>

            {dbRecords.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 transition"
                title="Wipe local history from IndexedDB"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear DB</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Cumulative Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-neutral-200/60 dark:border-neutral-800 text-xs">
          <div className="rounded-2xl bg-white/70 p-3 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80">
            <span className="text-[11px] text-neutral-500">Total Transferred</span>
            <p className="text-base font-extrabold text-neutral-900 dark:text-white font-mono mt-0.5">
              {formatBytes(stats.totalBytes)}
            </p>
          </div>

          <div className="rounded-2xl bg-white/70 p-3 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80">
            <span className="text-[11px] text-neutral-500">Logged Transfers</span>
            <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
              {stats.totalFiles} files
            </p>
          </div>

          <div className="rounded-2xl bg-white/70 p-3 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80">
            <span className="text-[11px] text-neutral-500">Sent (Uploads)</span>
            <p className="text-base font-extrabold text-neutral-900 dark:text-white font-mono mt-0.5 flex items-center gap-1">
              <ArrowUp className="h-3.5 w-3.5 text-indigo-500" />
              <span>{stats.sentCount}</span>
            </p>
          </div>

          <div className="rounded-2xl bg-white/70 p-3 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80">
            <span className="text-[11px] text-neutral-500">Received (Downloads)</span>
            <p className="text-base font-extrabold text-neutral-900 dark:text-white font-mono mt-0.5 flex items-center gap-1">
              <ArrowDown className="h-3.5 w-3.5 text-emerald-500" />
              <span>{stats.receivedCount}</span>
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: FREQUENT SCANNED QR CONNECTIONS */}
      {recentConnections && recentConnections.length > 0 && (
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-indigo-500" />
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                Recent Scanned QR Connections ({recentConnections.length})
              </h4>
            </div>
            {onClearConnections && (
              <button
                onClick={onClearConnections}
                className="text-[11px] text-neutral-400 hover:text-rose-500 transition"
              >
                Clear QR List
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {recentConnections.slice(0, 3).map((conn, idx) => (
              <div
                key={conn.id || idx}
                className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/40 text-xs"
              >
                <div className="truncate pr-2">
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    Room {conn.roomId}
                  </span>
                  <p className="text-[10px] text-neutral-400">{formatScannedTime(conn.scannedAt)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {onReconnect && (
                    <button
                      onClick={() => onReconnect(conn)}
                      className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 transition"
                    >
                      Connect
                    </button>
                  )}
                  <button
                    onClick={() => handleCopyUrl(conn.id, conn.url)}
                    className="p-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-700"
                  >
                    {copiedId === conn.id ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-neutral-500" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: SEARCH & FILTERS TOOLBAR */}
      <div className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by file name or device name..."
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-4 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-white dark:focus:bg-neutral-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 hover:text-neutral-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Direction Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 self-start md:self-auto">
          <button
            onClick={() => setFilterDirection('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              filterDirection === 'all'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
            }`}
          >
            All ({dbRecords.length})
          </button>
          <button
            onClick={() => setFilterDirection('sent')}
            className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
              filterDirection === 'sent'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
            }`}
          >
            <ArrowUp className="h-3 w-3 text-indigo-500" />
            <span>Sent</span>
          </button>
          <button
            onClick={() => setFilterDirection('received')}
            className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
              filterDirection === 'received'
                ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
            }`}
          >
            <ArrowDown className="h-3 w-3 text-emerald-500" />
            <span>Received</span>
          </button>
        </div>

        {/* File Category Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {['all', 'image', 'document', 'video', 'audio', 'archive'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition capitalize whitespace-nowrap ${
                filterCategory === cat
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:text-neutral-300'
              }`}
            >
              {cat === 'all' ? 'All Types' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION: AUDIT LOG TABLE */}
      <div className="w-full rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-500" />
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
              Transfer Records ({filteredRecords.length})
            </h4>
          </div>
          <button
            onClick={refreshFromIndexedDB}
            className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Refresh</span>
          </button>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-3">
              <Clock className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {searchQuery ? 'No matching transfer records found' : 'No transfers recorded in IndexedDB yet'}
            </p>
            <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
              Any file you stream or receive between PC and mobile will automatically be indexed here with permanent offline persistence.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 uppercase font-mono text-[10px]">
                  <th className="py-3 px-2">Type</th>
                  <th className="py-3 px-2">Direction</th>
                  <th className="py-3 px-2">Filename</th>
                  <th className="py-3 px-2">Size</th>
                  <th className="py-3 px-2">Avg Speed</th>
                  <th className="py-3 px-2">Device</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Time</th>
                  <th className="py-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {filteredRecords.map((item) => {
                  const category = getFileCategory(item.fileName, item.fileType);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition group"
                    >
                      <td className="py-3 px-2 whitespace-nowrap">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                          {renderCategoryIcon(category)}
                        </div>
                      </td>

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

                      <td className="py-3 px-2 font-medium text-neutral-900 dark:text-white truncate max-w-[220px]">
                        <span title={item.fileName}>{item.fileName}</span>
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
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Done</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-rose-500">
                            <XCircle className="h-3.5 w-3.5" />
                            <span className="capitalize">{item.status}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-right font-mono text-neutral-400 tabular-nums whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}{' '}
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3 px-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-600 transition"
                          title="Delete record from IndexedDB"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
