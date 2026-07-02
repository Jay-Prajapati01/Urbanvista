import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-lg bg-red-50 border border-red-200">
          <h3 className="text-lg font-semibold text-red-700">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mt-2">An unexpected error occurred in this section. Try refreshing the page.</p>
          <details className="mt-3 text-xs text-muted-foreground">
            <summary>Technical details</summary>
            <pre className="whitespace-pre-wrap mt-2">{String(this.state.error)}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
