import { useOutletContext, Link } from "react-router-dom";
import { ShoppingBag, PartyPopper, ArrowRight } from "lucide-react";
import { useDocumentMeta } from "../lib/useDocumentMeta";

const COLORS = {
  charcoal: "#2B2A27",
  cream: "#FBF4E8",
  white: "#FFFFFF",
  line: "#E4D6BC",
};

const META = {
  en: {
    title: "TuMarcaEnTodo — Custom Merchandising & Balloon Decor",
    description:
      "Custom t-shirts, hoodies, caps, mugs, tumblers and aprons, plus balloon decor for events — all coordinated directly over WhatsApp. Orlando, FL.",
  },
  es: {
    title: "TuMarcaEnTodo — Merchandising Personalizado y Decoración con Globos",
    description:
      "Remeras, buzos, gorras, mugs, tumblers y delantales personalizados, más decoración con globos para eventos — todo coordinado por WhatsApp. Orlando, FL.",
  },
};

const CARDS = {
  en: [
    {
      to: "/merch",
      icon: ShoppingBag,
      accent: "#E8952E",
      title: "Custom Merchandising",
      body: "T-shirts, hoodies, caps, mugs, tumblers and aprons — build your order and confirm it over WhatsApp.",
      cta: "Browse the catalog",
    },
    {
      to: "/globos",
      icon: PartyPopper,
      accent: "#E39AA6",
      title: "Balloon Decor",
      body: "Organic columns, arches, letter mosaics and full event setups. Get a reference price and request a quote.",
      cta: "See balloon packages",
    },
  ],
  es: [
    {
      to: "/merch",
      icon: ShoppingBag,
      accent: "#E8952E",
      title: "Merchandising Personalizado",
      body: "Remeras, buzos, gorras, mugs, tumblers y delantales — armá tu pedido y confirmalo por WhatsApp.",
      cta: "Ver el catálogo",
    },
    {
      to: "/globos",
      icon: PartyPopper,
      accent: "#E39AA6",
      title: "Decoración con Globos",
      body: "Columnas orgánicas, arcos, mosaicos de letras y ambientaciones completas. Mirá precios de referencia y pedí tu cotización.",
      cta: "Ver paquetes de globos",
    },
  ],
};

export default function Landing() {
  const { lang } = useOutletContext();
  const cards = CARDS[lang];
  useDocumentMeta(META[lang]);

  return (
    <div className="min-h-screen px-5 py-10" style={{ backgroundColor: COLORS.cream }}>
      <div className="max-w-3xl mx-auto grid gap-5 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className="rounded-2xl p-6 flex flex-col gap-3 transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.line}` }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ backgroundColor: card.accent }}
              >
                <Icon size={20} color={COLORS.white} />
              </div>
              <h2 className="text-2xl" style={{ fontFamily: "Georgia, serif", color: COLORS.charcoal }}>
                {card.title}
              </h2>
              <p className="text-sm text-neutral-500 flex-1">{card.body}</p>
              <span
                className="flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: card.accent }}
              >
                {card.cta}
                <ArrowRight size={15} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
