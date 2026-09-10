import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[App Crash Protected]', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#FEF7FF] text-[#1C1B1F] font-sans">
          <div className="bg-[#F3F3FA] max-w-md w-full rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#1C1B1F]">
                Automatic Flood Alert App
              </h2>
              <p className="text-xs text-[#49454F]">
                The application encountered an unexpected issue and recovered safely.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-left overflow-x-auto max-h-32 text-[11px] font-mono text-slate-700">
                {this.state.error.message || 'Runtime error prevented normal display'}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 rounded-full bg-[#1F71E8] hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="w-full py-2.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cache &amp; Restart</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400">
              Dzenje CDSS ADDA STEM CLUB • Multi-Device Support
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
