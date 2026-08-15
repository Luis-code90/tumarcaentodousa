import { Globe } from "lucide-react";
import { Link } from "react-router-dom";

// Shared across "/", "/merch" and "/globos". Only owns the logo, the
// section tagline and the language toggle — section-specific controls
// (like the merch cart button) stay in their own page instead of being
// threaded through here, so this component doesn't need to know anything
// about what each section sells.
export default function Header({ theme, tagline, brand, lang, onToggleLang }) {
  return (
    <header
      className="sticky top-0 z-40 px-5 py-4 flex items-center justify-between"
      style={{ backgroundColor: theme.bg }}
    >
      <Link to="/">
        <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: theme.accent }}>
          {tagline}
        </p>
        <h1 className="text-xl" style={{ fontFamily: "Georgia, serif", color: "#FFFFFF" }}>
          {brand}
        </h1>
      </Link>

      <button
        onClick={onToggleLang}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: theme.pillBg, color: theme.pillText }}
        aria-label="toggle language"
      >
        <Globe size={13} />
        {lang === "en" ? "ES" : "EN"}
      </button>
    </header>
  );
}
