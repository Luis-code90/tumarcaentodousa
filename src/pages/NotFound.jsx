import { Link, useOutletContext } from "react-router-dom";
import { useNoIndex } from "../lib/useNoIndex";

const T = {
  en: { title: "Page not found", body: "That page doesn't exist or was moved.", cta: "Back to home" },
  es: { title: "Página no encontrada", body: "Esa página no existe o se movió.", cta: "Volver al inicio" },
};

export default function NotFound() {
  const { lang } = useOutletContext();
  const t = T[lang];
  useNoIndex();

  return (
    <div className="min-h-[60vh] px-5 py-16 text-center" style={{ backgroundColor: "#FBF4E8" }}>
      <h2 className="text-2xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#2B2A27" }}>
        {t.title}
      </h2>
      <p className="text-sm text-neutral-500 mb-6">{t.body}</p>
      <Link to="/" className="text-sm font-semibold underline" style={{ color: "#B8701A" }}>
        {t.cta}
      </Link>
    </div>
  );
}
