import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource-variable/manrope";
import "@fontsource-variable/playfair-display";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
