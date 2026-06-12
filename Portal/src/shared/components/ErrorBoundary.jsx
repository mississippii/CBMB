import { Component } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

/**
 * Catches render errors anywhere below it so a single broken page
 * shows a recoverable message instead of white-screening the app.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <TriangleAlert className="w-6 h-6 text-rose-500" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-500">
            The page hit an unexpected error. Your data is safe — reload to continue.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
