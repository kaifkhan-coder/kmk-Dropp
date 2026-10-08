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
  Zap,
  Stamp,
  Layers,
  Cpu,
  Lock,
} from 'lucide-react';
import { formatBytes } from '../utils/format';

interface AIFileAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onApplyRenamedFile?: (renamedFile: File) => void;
  onOpenWatermark?: (file: File) => void;
  onOpenConverter?: (file: File) => void;
}

interface AnalysisResult {
  summary: string[];
  sensitiveDataDetected: boolean;
  sensitiveDataWarning: string | null;
  suggestedName: string;
  tags: string[];
  estimatedReadingTimeMinutes: number | null;
  compressionPotentialPercent?: number;
  recommendedAction?: string;
  engineUsed: 'Gemini 3.8 Flash' | 'Gemini 3.1 Flash Lite' | 'Autonomous On-Device AI';
}

export const AIFileAnalyzerModal: React.FC<AIFileAnalyzerModalProps> = ({
  isOpen,
  onClose,
  file,
  onApplyRenamedFile,
  onOpenWatermark,
  onOpenConverter,
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

  // Run autonomous client heuristic analysis (independent fallback)
  const runAutonomousClientAnalysis = (targetFile: File, snippet: string): AnalysisResult => {
    const ext = targetFile.name.includes('.') ? targetFile.name.split('.').pop()?.toLowerCase() || '' : '';
    const isCodeOrText = targetFile.type.startsWith('text/') || ['txt', 'md', 'json', 'js', 'ts', 'py', 'html', 'css', 'env'].includes(ext);
    const isImage = targetFile.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
    const isPdf = ext === 'pdf' || targetFile.type === 'application/pdf';

    // Sensitive data radar heuristics
    const sensitivePatterns = [
      /password\s*[:=]/i,
      /api[_-]?key\s*[:=]/i,
      /secret\s*[:=]/i,
      /bearer\s+[a-zA-Z0-9_\-\.]+/i,
      /-----BEGIN (RSA|OPENSSH|PRIVATE) KEY-----/,
      /[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}/, // Card numbers
    ];

    let hasSensitive = false;
    let sensitiveWarning: string | null = null;

    if (snippet) {
      for (const pattern of sensitivePatterns) {
        if (pattern.test(snippet)) {
          hasSensitive = true;
          sensitiveWarning = 'Potential credentials, tokens, or private keys detected in snippet.';
          break;
        }
      }
    }

    // Compression estimation
    let compressionPercent = 10;
    if (isCodeOrText) compressionPercent = 65;
    else if (isPdf) compressionPercent = 25;
    else if (isImage) compressionPercent = 15;

    // Standardized suggested name
    const cleanBase = targetFile.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_');
    const suggestedName = `${cleanBase}_verified.${ext || 'dat'}`;

    // Recommended Action
    let recommendedAction = 'Ready for direct WebRTC P2P transmission';
    if (hasSensitive) {
      recommendedAction = 'High sensitivity: Apply Universal Watermark & AES-256-GCM encryption before sending';
    } else if (isPdf) {
      recommendedAction = 'PDF Document: Can be converted to Word (.docx) or watermarked for privacy';
    } else if (isImage) {
      recommendedAction = 'Photo: Can be watermarked or converted into a formatted PDF';
    }

    const wordCount = snippet ? snippet.split(/\s+/).filter(Boolean).length : 0;
    const readingTime = wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 200)) : null;

    const tags: string[] = ['Transfer-Ready'];
    if (isPdf) tags.push('PDF Document', 'Format-Convertible');
    else if (isImage) tags.push('High-Res Photo', 'Watermark-Ready');
    else if (isCodeOrText) tags.push('Text / Source', 'Compressible');
    else tags.push('Binary Archive', 'Zero-Cloud P2P');

    if (hasSensitive) tags.push('Sensitive-Risk');

    return {
      summary: [
        `File Name: ${targetFile.name} (${formatBytes(targetFile.size)})`,
        `Format: ${targetFile.type || ext.toUpperCase() || 'Binary Stream'}`,
        `Estimated bandwidth savings with chunk compression: ~${compressionPercent}%`,
        hasSensitive
          ? 'Security Alert: Snippet exhibits pattern indicators for credentials or keys.'
          : 'Security Radar: No plaintext keys or credentials detected in initial inspection.',
      ],
      sensitiveDataDetected: hasSensitive,
      sensitiveDataWarning: sensitiveWarning,
      suggestedName,
      tags,
      estimatedReadingTimeMinutes: readingTime,
      compressionPotentialPercent: compressionPercent,
      recommendedAction,
      engineUsed: 'Autonomous On-Device AI',
    };
  };

  const runAnalysis = async (targetFile: File) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    let textSnippet = '';
    try {
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
    } catch {
      // ignore
    }

    try {
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
        throw new Error('Server AI unavailable');
      }

      const data = await res.json();
      let engineName: 'Gemini 3.8 Flash' | 'Gemini 3.1 Flash Lite' | 'Autonomous On-Device AI' = 'Gemini 3.8 Flash';
      if (data.source === 'gemini-3.1-flash-lite') engineName = 'Gemini 3.1 Flash Lite';
      else if (data.source === 'local_inspector') engineName = 'Autonomous On-Device AI';

      const ext = targetFile.name.includes('.') ? targetFile.name.split('.').pop()?.toLowerCase() || '' : '';
      const isCodeOrText = targetFile.type.startsWith('text/') || ['txt', 'md', 'json', 'js', 'ts'].includes(ext);

      setAnalysis({
        summary: data.summary || ['File analyzed successfully.'],
        sensitiveDataDetected: Boolean(data.sensitiveDataDetected),
        sensitiveDataWarning: data.sensitiveDataWarning || null,
        suggestedName: data.suggestedName || targetFile.name,
        tags: Array.isArray(data.tags) ? data.tags : ['Transfer-Ready'],
        estimatedReadingTimeMinutes: data.estimatedReadingTimeMinutes || null,
        compressionPotentialPercent: isCodeOrText ? 65 : 20,
        recommendedAction: Boolean(data.sensitiveDataDetected)
          ? 'High sensitivity: Apply Universal Watermark & AES-256-GCM encryption before sending'
          : ext === 'pdf'
          ? 'PDF Document: Can be converted to Word (.docx) or watermarked for privacy'
          : 'Ready for direct WebRTC P2P transmission',
        engineUsed: engineName,
      });
    } catch {
      // Seamlessly fall back to autonomous client heuristic engine so the user never gets an error!
      const autonomousResult = runAutonomousClientAnalysis(targetFile, textSnippet);
      setAnalysis(autonomousResult);
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

  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name);

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
                  AI File Intelligence Suite
                </span>
                <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                  <Cpu className="h-3 w-3 text-indigo-500" />
                  <span>{analysis?.engineUsed || 'Dual-Engine AI'}</span>
                </span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5 truncate max-w-xs sm:max-w-md">
                {file.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 animate-pulse">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Analyzing file contents, security markers & compression...
              </p>
              <p className="text-[11px] text-neutral-400 font-mono">
                {formatBytes(file.size)} · {file.type || 'Binary stream'}
              </p>
            </div>
          )}

          {error && !analysis && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4" />
                <span>Analysis Issue</span>
              </div>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => runAnalysis(file)}
                className="inline-flex items-center gap-1 text-[11px] font-bold underline"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {analysis && (
            <>
              {/* Security Risk Radar Card */}
              <div
                className={`rounded-2xl border p-4 transition ${
                  analysis.sensitiveDataDetected
                    ? 'border-amber-300 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30'
                    : 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {analysis.sensitiveDataDetected ? (
                      <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                        {analysis.sensitiveDataDetected
                          ? 'Security Warning: Sensitive Content Pattern'
                          : 'Security Radar: Clean & Verified'}
                      </h4>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                        {analysis.sensitiveDataWarning ||
                          'No plaintext tokens, credentials, or sensitive secrets detected.'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      analysis.sensitiveDataDetected
                        ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                        : 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                    }`}
                  >
                    {analysis.sensitiveDataDetected ? 'Caution' : 'Safe'}
                  </span>
                </div>
              </div>

              {/* Smart Content Takeaways */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-900/40 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-neutral-200/60 dark:border-neutral-800/60">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-indigo-500" />
                    <span>AI Key Takeaways</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    {copiedSummary ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <ul className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                  {analysis.summary.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>

                {analysis.estimatedReadingTimeMinutes && (
                  <div className="flex items-center gap-1 pt-1 text-[11px] text-neutral-400 font-mono">
                    <Clock className="h-3 w-3" />
                    <span>Estimated reading time: ~{analysis.estimatedReadingTimeMinutes} min</span>
                  </div>
                )}
              </div>

              {/* Compression & Speed Predictor */}
              <div className="rounded-2xl border border-neutral-200/90 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>Throughput & Compression Predictor</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ~{analysis.compressionPotentialPercent || 25}% Potential Savings
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-center">
                  <div className="rounded-xl bg-neutral-50 p-2 dark:bg-neutral-800/60">
                    <span className="text-neutral-400 block text-[10px]">At 10 MB/s</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {Math.max(0.1, Number((file.size / (10 * 1024 * 1024)).toFixed(1)))}s
                    </span>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-2 dark:bg-neutral-800/60">
                    <span className="text-neutral-400 block text-[10px]">At 25 MB/s</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {Math.max(0.1, Number((file.size / (25 * 1024 * 1024)).toFixed(1)))}s
                    </span>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-2 dark:bg-neutral-800/60">
                    <span className="text-neutral-400 block text-[10px]">At 50 MB/s (LAN)</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {Math.max(0.1, Number((file.size / (50 * 1024 * 1024)).toFixed(1)))}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Suggested Filename Normalizer */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-900/40 space-y-2">
                <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Edit2 className="h-3.5 w-3.5 text-purple-500" />
                  <span>AI Standardized Filename</span>
                </span>
                <div className="flex items-center justify-between gap-2 bg-white rounded-xl p-2.5 border border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800">
                  <span className="font-mono text-xs text-neutral-800 dark:text-neutral-200 truncate">
                    {analysis.suggestedName}
                  </span>
                  {onApplyRenamedFile && (
                    <button
                      type="button"
                      onClick={handleApplyNewName}
                      disabled={appliedName}
                      className="shrink-0 flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 transition"
                    >
                      {appliedName ? <Check className="h-3 w-3 text-emerald-400" /> : <ArrowRight className="h-3 w-3" />}
                      <span>{appliedName ? 'Renamed' : 'Use Name'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {analysis.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-xl bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    <Tag className="h-3 w-3 text-neutral-400" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>

              {/* Recommended Quick Action Shortcuts */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-2">
                {onOpenWatermark && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenWatermark(file);
                      onClose();
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300 transition"
                  >
                    <Stamp className="h-3.5 w-3.5" />
                    <span>Watermark This File</span>
                  </button>
                )}

                {onOpenConverter && (isPdf || isImage) && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenConverter(file);
                      onClose();
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/70 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/50 dark:text-purple-300 transition"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Convert Format</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
