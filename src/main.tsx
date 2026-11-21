
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { initAnalytics } from "./lib/consent";

  initAnalytics();

  createRoot(document.getElementById("root")!).render(<App />);
  