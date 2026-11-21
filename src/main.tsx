
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  // Betűtípusok a saját szerverről (a Google Fonts hozzájárulás nélkül továbbítaná a látogató IP-címét)
  import "@fontsource/inter/latin-400.css";
  import "@fontsource/inter/latin-ext-400.css";
  import "@fontsource/inter/latin-500.css";
  import "@fontsource/inter/latin-ext-500.css";
  import "@fontsource/inter/latin-600.css";
  import "@fontsource/inter/latin-ext-600.css";
  import "@fontsource/inter/latin-700.css";
  import "@fontsource/inter/latin-ext-700.css";
  import "@fontsource/space-grotesk/latin-600.css";
  import "@fontsource/space-grotesk/latin-ext-600.css";
  import "@fontsource/space-grotesk/latin-700.css";
  import "@fontsource/space-grotesk/latin-ext-700.css";
  import "./styles/index.css";
  import { initAnalytics } from "./lib/consent";

  initAnalytics();

  createRoot(document.getElementById("root")!).render(<App />);
  