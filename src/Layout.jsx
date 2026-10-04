import { useState, useEffect } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import Header from "./components/Header";
import { MERCH_THEME, GLOBOS_THEME } from "./theme";
import { whatsappUrl } from "./lib/whatsapp";

const BRAND = "TuMarcaEnTodo";
const LANG_KEY = "tumarcaentodo_lang";

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

const FOOTER = {
  en: { merch: "Merchandising", globos: "Balloon Decor", chat: "Chat on WhatsApp", loc: "Orlando, FL" },
  es: { merch: "Merchandising", globos: "Decoración con Globos", chat: "Escribinos por WhatsApp", loc: "Orlando, FL" },
};

// English by default (US-based business), but a returning visitor keeps their
// choice and a first-time visitor whose browser is set to Spanish gets Spanish.
function initialLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "es") return saved;
  } catch {
    // storage unavailable — fall through to browser language
  }
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

// Owns the one piece of state that genuinely needs to survive navigation
// between "/", "/merch" and "/globos": the language toggle. Each page reads
// { lang, setLang } back via useOutletContext() instead of keeping its own
// local copy, so switching to Spanish on the landing page stays Spanish
// after clicking into a section.
export default function Layout() {
  const [lang, setLang] = useState(initialLang);

  // Keeps the <html lang> attribute in sync with the toggle — a11y signal
  // for screen readers and a language hint for search engines.
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // storage unavailable — preference just won't persist
    }
  }, [lang]);

  const location = useLocation();
  const isGlobos = location.pathname.startsWith("/globos");
  const theme = isGlobos ? GLOBOS_THEME : MERCH_THEME;
  const tagline = isGlobos ? TAGLINES[lang].globos : TAGLINES[lang].merch;
  const f = FOOTER[lang];

  // Scroll to top when moving between sections (SPA navigation keeps the
  // previous scroll position otherwise).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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

      <footer className="px-5 py-8 text-center text-xs" style={{ backgroundColor: theme.bg, color: "#FFFFFFB3" }}>
        <nav className="flex justify-center gap-5 mb-3 text-sm" style={{ color: "#FFFFFF" }}>
          <Link to="/merch">{f.merch}</Link>
          <Link to="/globos">{f.globos}</Link>
        </nav>
        <p>
          © {new Date().getFullYear()} {BRAND} · {f.loc}
        </p>
      </footer>

      <a
        href={whatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={f.chat}
        title={f.chat}
        className="fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        style={{ backgroundColor: "#25D366" }}
      >
        <MessageCircle size={22} color="#fff" />
      </a>
    </>
  );
}
