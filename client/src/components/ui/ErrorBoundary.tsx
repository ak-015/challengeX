import { Component, type ErrorInfo, type ReactNode } from 'react';
import { GlassPanel } from './GlassPanel';
import { Heading } from './Heading';

interface Props {
  children: ReactNode;
  /** Shown instead of the default panel. */
  fallback?: (reset: () => void) => ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('UI error:', error.message, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);
    return <ErrorPanel onRetry={this.reset} />;
  }
}

export function ErrorPanel({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-xl items-center justify-center p-4">
      <GlassPanel role="alert" className="w-full p-6 text-center sm:p-8">
        <Heading level={2}>The spell backfired</Heading>
        <p className="mt-3 font-prose text-ash-dim">{message ?? 'Something broke on this screen. Your progress is saved on the server.'}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onRetry && (
            <button type="button" className="btn" onClick={onRetry}>
              Try again
            </button>
          )}
          <a className="btn btn-ghost" href="/realm">
            Return to the realm
          </a>
        </div>
      </GlassPanel>
    </div>
  );
}
