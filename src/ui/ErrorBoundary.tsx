import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

/** Кореневий запобіжник «Ясно»: м'який екран замість білої смерті. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Unhandled UI error:", error);
    // Sentry підхоплює через init у main.tsx (env-gated)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-bg px-6">
          <div className="surface-card max-w-sm p-8 text-center">
            <h1 className="mb-2 text-xl font-semibold">Щось пішло не так</h1>
            <p className="mb-5 text-sm text-ink-2">Спробуй оновити — дані в безпеці.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-accent mx-auto"
            >
              Оновити
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
