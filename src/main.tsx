import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Спостережуваність (WP-4.3): вмикається лише за наявності VITE_SENTRY_DSN
if (import.meta.env.VITE_SENTRY_DSN) {
  import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      release: __APP_VERSION__,
      tracesSampleRate: 0.1,
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
