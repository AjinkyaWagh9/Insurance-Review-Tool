import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { validateScoringConstants, inspectStoredState } from "./services/termApi";

if (import.meta.env.DEV) {
  validateScoringConstants();
  inspectStoredState();
}

createRoot(document.getElementById("root")!).render(<App />);
