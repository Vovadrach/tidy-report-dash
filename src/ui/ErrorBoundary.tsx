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
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
          <div className="surface-card rounded-3xl p-8 shadow-md text-center max-w-sm">
            <p className="text-4xl mb-3">🫧</p>
            <h1 className="display text-2xl text-foreground mb-2">Щось пішло не так</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Спробуй оновити сторінку — дані в безпеці.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 font-bold active:scale-95 transition-transform"
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
