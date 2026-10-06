import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Smartphone } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[BeamDrop ErrorBoundary Caught]:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = window.location.origin;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-6 text-white font-sans">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/90 p-8 shadow-2xl text-center backdrop-blur-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-5 border border-amber-500/20">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-white mb-2">
              BeamDrop Recovered
            </h1>

            <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
              BeamDrop encountered a browser environment restriction or temporary session issue. Tap below to reload the app cleanly.
            </p>

            {this.state.error?.message && (
              <div className="mb-6 rounded-xl bg-black/50 p-3 text-left border border-neutral-800/80">
                <p className="font-mono text-xs text-neutral-400 truncate">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-neutral-950 shadow-md hover:bg-neutral-100 active:scale-[0.98] transition"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reload BeamDrop</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
