import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./components/Header";
import { MERCH_THEME, GLOBOS_THEME } from "./theme";

const BRAND = "TuMarcaEnTodo";

const TAGLINES = {
  en: {
    merch: "We personalize everything you need",
    globos: "Balloon decor for unforgettable events",
  },
  es: {
    merch: "Personalizamos todo lo que necesites",
    globos: "Decoración de globos para eventos inolvidables",
  },
};

// Owns the one piece of state that genuinely needs to survive navigation
// between "/", "/merch" and "/globos": the language toggle. Each page reads
// { lang, setLang } back via useOutletContext() instead of keeping its own
// local copy, so switching to Spanish on the landing page stays Spanish
// after clicking into a section.
export default function Layout() {
  const [lang, setLang] = useState("en"); // English default, per business context (US-based)

  // Keeps the <html lang> attribute in sync with the toggle — a11y signal
  // for screen readers and a language hint for search engines.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const location = useLocation();
  const isGlobos = location.pathname.startsWith("/globos");
  const theme = isGlobos ? GLOBOS_THEME : MERCH_THEME;
  const tagline = isGlobos ? TAGLINES[lang].globos : TAGLINES[lang].merch;

  return (
    <>
      <Header
        theme={theme}
        tagline={tagline}
        brand={BRAND}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === "en" ? "es" : "en"))}
      />
      <Outlet context={{ lang, setLang }} />
    </>
  );
}
