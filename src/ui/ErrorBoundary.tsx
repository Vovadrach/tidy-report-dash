import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

/** Кореневий запобіжник: м'який екран замість білої смерті. */
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
        <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
          <div className="card max-w-sm p-8 text-center">
            <h1 className="mb-2 text-[1.25rem] font-bold text-ink">Щось пішло не так</h1>
            <p className="mb-6 text-callout text-ink-3">
              Спробуй оновити сторінку. Після цього перевір, чи збережено останні зміни.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="press h-12 rounded-[16px] bg-accent px-6 font-semibold text-accent-on"
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
