import React from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  Binary,
  Hash,
  FileText,
  Lock,
  Download,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';
import { SecurityScanReport, SecurityScanStage } from '../types';
import { formatBytes } from '../utils/format';

interface SecurityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: SecurityScanReport;
  fileName: string;
  fileSize: number;
  onAcceptAndDownload: () => void;
  onPurge?: () => void;
}

export const SecurityReportModal: React.FC<SecurityReportModalProps> = ({
  isOpen,
  onClose,
  report,
  fileName,
  fileSize,
  onAcceptAndDownload,
  onPurge,
}) => {
  if (!isOpen) return null;

  const isSafe = report.verdict === 'safe';
  const isSuspicious = report.verdict === 'suspicious';
  const isMalicious = report.verdict === 'malicious';

  const getStageIcon = (stageId: SecurityScanStage['id']) => {
    switch (stageId) {
      case 'metadata':
        return <FileText className="h-4 w-4" />;
      case 'hash':
        return <Hash className="h-4 w-4" />;
      case 'magic_bytes':
        return <Binary className="h-4 w-4" />;
      case 'heuristics':
        return <ShieldAlert className="h-4 w-4" />;
      case 'sandbox':
        return <Lock className="h-4 w-4" />;
      case 'decision':
        return <FileCheck className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: SecurityScanStage['status']) => {
    switch (status) {
      case 'passed':
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Passed
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Warning
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle className="h-3 w-3" />
            Blocked
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 ${
                isSafe
                  ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : isSuspicious
                  ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                  : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
              }`}
            >
              {isSafe ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isSafe
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : isSuspicious
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                  }`}
                >
                  {report.verdict === 'safe'
                    ? 'Verified Clean'
                    : report.verdict === 'suspicious'
                    ? 'Caution Flagged'
                    : 'Threat Quarantined'}
                </span>
                <span className="text-xs font-semibold text-neutral-400">
                  Score: <strong className="text-neutral-900 dark:text-white">{report.score}/100</strong>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mt-0.5 truncate max-w-sm">
                {fileName}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {formatBytes(fileSize)} • Detected: {report.detectedType}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 6-Stage Security Pipeline List */}
        <div className="overflow-y-auto my-4 space-y-2.5 pr-1 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
            6-Stage Malware & Exploit Security Pipeline
          </p>

          {report.stages.map((stage) => (
            <div
              key={stage.id}
              className={`rounded-2xl border p-3 text-xs transition ${
                stage.status === 'passed'
                  ? 'border-neutral-200 bg-neutral-50/60 dark:border-neutral-800/80 dark:bg-neutral-950/40'
                  : stage.status === 'warning'
                  ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20'
                  : 'border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
                  <span className="text-neutral-500 dark:text-neutral-400">{getStageIcon(stage.id)}</span>
                  <span>{stage.name}</span>
                </div>
                {getStatusBadge(stage.status)}
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed font-mono">
                {stage.details}
              </p>
            </div>
          ))}

          {report.threatDetails && report.threatDetails.length > 0 && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40 text-xs">
              <div className="font-bold text-rose-800 dark:text-rose-200 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                <span>Identified Threat Indicators:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700 dark:text-rose-300 font-mono">
                {report.threatDetails.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
          {onPurge && isMalicious ? (
            <button
              onClick={onPurge}
              className="flex items-center gap-1.5 rounded-xl border border-rose-300 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Purge from Memory</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
            >
              Close Report
            </button>
          )}

          <button
            onClick={() => {
              onAcceptAndDownload();
              onClose();
            }}
            className={`flex items-center gap-2 rounded-xl py-2.5 px-5 text-xs font-bold text-white transition shadow-md ${
              isMalicious
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isMalicious ? 'Override & Download (Unsafe)' : 'Accept & Download Verified File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
