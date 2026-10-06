import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Check,
  Copy,
  Clock,
  Tag,
  AlertTriangle,
  RefreshCw,
  Edit2,
  FileCode,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { formatBytes } from '../utils/format';

interface AIFileAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onApplyRenamedFile?: (renamedFile: File) => void;
}

interface AnalysisResult {
  summary: string[];
  sensitiveDataDetected: boolean;
  sensitiveDataWarning: string | null;
  suggestedName: string;
  tags: string[];
  estimatedReadingTimeMinutes: number | null;
}

export const AIFileAnalyzerModal: React.FC<AIFileAnalyzerModalProps> = ({
  isOpen,
  onClose,
  file,
  onApplyRenamedFile,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedName, setAppliedName] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    if (!isOpen || !file) {
      setAnalysis(null);
      setError(null);
      setAppliedName(false);
      return;
    }

    runAnalysis(file);
  }, [isOpen, file]);

  const runAnalysis = async (targetFile: File) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      let textSnippet = '';

      // If text, markdown, json, or code, read the first 8KB directly
      if (
        targetFile.type.startsWith('text/') ||
        targetFile.name.endsWith('.txt') ||
        targetFile.name.endsWith('.md') ||
        targetFile.name.endsWith('.json') ||
        targetFile.name.endsWith('.js') ||
        targetFile.name.endsWith('.ts')
      ) {
        textSnippet = await targetFile.slice(0, 8192).text();
      }

      const res = await fetch('/api/ai/analyze-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: targetFile.name,
          fileType: targetFile.type || 'application/octet-stream',
          fileSize: targetFile.size,
          textSnippet,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to analyze file with AI');
      }

      const data = await res.json();
      setAnalysis({
        summary: data.summary || ['File analyzed successfully.'],
        sensitiveDataDetected: Boolean(data.sensitiveDataDetected),
        sensitiveDataWarning: data.sensitiveDataWarning || null,
        suggestedName: data.suggestedName || targetFile.name,
        tags: Array.isArray(data.tags) ? data.tags : ['Transfer-Ready'],
        estimatedReadingTimeMinutes: data.estimatedReadingTimeMinutes || null,
      });
    } catch (err: any) {
      setError(err.message || 'Unable to complete AI analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyNewName = () => {
    if (!file || !analysis?.suggestedName) return;
    try {
      const newFile = new File([file], analysis.suggestedName, {
        type: file.type,
        lastModified: file.lastModified,
      });
      if (onApplyRenamedFile) {
        onApplyRenamedFile(newFile);
      }
      setAppliedName(true);
      setTimeout(() => setAppliedName(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopySummary = async () => {
    if (!analysis) return;
    const text = `BeamDrop AI Summary for ${file?.name}:\n${analysis.summary.map((s) => `• ${s}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // fallback
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative flex flex-col w-full max-w-xl max-h-[90vh] rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 uppercase tracking-wider">
                  AI File Intelligence
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  Gemini 3.8 Flash
                </span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5 truncate max-w-xs sm:max-w-md">
                {file.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* File Quick Spec Strip */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
            <FileText className="h-4 w-4 text-indigo-500" />
            <span>Size: <strong>{formatBytes(file.size)}</strong></span>
          </div>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <div className="text-neutral-600 dark:text-neutral-300 truncate max-w-[200px]">
            Type: <strong>{file.type || 'Binary Document'}</strong>
          </div>
          {analysis?.estimatedReadingTimeMinutes && (
            <>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>Reading Time: ~{analysis.estimatedReadingTimeMinutes} min</span>
              </div>
            </>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                Analyzing File with Gemini AI...
              </p>
              <p className="text-xs text-neutral-500 max-w-xs">
                Generating key summaries, evaluating sensitivity credentials, and recommending standardized filenames.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Analysis Failed</p>
                <p className="mt-0.5">{error}</p>
                <button
                  onClick={() => runAnalysis(file)}
                  className="mt-2 rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500 transition"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              {/* Sensitive Data Scanner Alert */}
              {analysis.sensitiveDataDetected ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200 flex items-start gap-3 shadow-xs">
                  <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Sensitive Data Detected</h4>
                    <p className="mt-0.5 leading-relaxed">
                      {analysis.sensitiveDataWarning || 'This document contains patterns resembling emails, phone numbers, or private credentials.'}
                    </p>
                    <p className="mt-1 font-semibold text-[11px] text-amber-800 dark:text-amber-300">
                      Recommendation: Transfer using BeamDrop's zero-knowledge E2EE encryption or apply a watermark before sharing.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>No exposed credentials or passwords detected. Safe for direct transfer.</span>
                </div>
              )}

              {/* Document Summary Card */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/80">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Executive Summary & Key Points</span>
                  </h4>
                  <button
                    onClick={handleCopySummary}
                    className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
                  >
                    {copiedSummary ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <ul className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                  {analysis.summary.map((point, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Smart Rename Card */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <Edit2 className="h-3.5 w-3.5 text-indigo-500" />
                      <span>AI Smart Rename Suggestion</span>
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Clean standardized filename without messy spaces or camera hashes.
                    </p>
                  </div>

                  {onApplyRenamedFile && (
                    <button
                      onClick={handleApplyNewName}
                      disabled={appliedName || analysis.suggestedName === file.name}
                      className="flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 dark:bg-white dark:text-neutral-950 transition"
                    >
                      {appliedName ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <ArrowRight className="h-3.5 w-3.5" />}
                      <span>{appliedName ? 'Applied!' : 'Apply Rename'}</span>
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-2.5 border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">
                    {analysis.suggestedName}
                  </span>
                </div>
              </div>

              {/* Tags */}
              {analysis.tags && analysis.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    <span>Tags:</span>
                  </span>
                  {analysis.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <button
            onClick={() => runAnalysis(file)}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-analyze</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
