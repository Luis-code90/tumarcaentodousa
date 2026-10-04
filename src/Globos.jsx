import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Check, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchPaquetes } from "./lib/packages";
import { createQuoteRequest } from "./lib/quotes";
import { useDocumentMeta } from "./lib/useDocumentMeta";
import { whatsappUrl, openWhatsAppThenSave } from "./lib/whatsapp";
import { optimizeImage } from "./lib/images";

// ---- Design tokens — blush/rose palette lifted from the balloon PDF ----
const COLORS = {
  rose: "#E39AA6",
  roseDark: "#B5646F",
  brown: "#4A3B36",
  blush: "#FDF1EE",
  blushDeep: "#F7DFE0",
  white: "#FFFFFF",
  line: "#F0D3D3",
};

const UI = {
  en: {
    heading: "Balloon Decor Packages",
    subheading: "Reference packages for your event — every design is fully customized and coordinated directly with you.",
    disclaimer: "Prices are for reference only. The final price is agreed based on your specific needs.",
    includes: "Includes",
    loading: "Loading packages…",
    loadError: "We couldn't load the packages. Please try again in a moment.",
    formTitle: "Request a quote",
    formSubtitle: "Tell us a bit about your event and we'll get back to you on WhatsApp.",
    name: "Name",
    phone: "Phone",
    eventDate: "Event date",
    packageInterest: "Package of interest",
    packagePlaceholder: "Not sure yet",
    notes: "Notes",
    notesPlaceholder: "Colors, theme, venue, anything that helps us plan…",
    submit: "Send via WhatsApp",
    submitting: "Sending…",
    requiredHint: "Name and phone are required.",
    sent: "Request sent! We'll reply on WhatsApp. If it didn't open, tap here:",
    reopen: "Open WhatsApp",
  },
  es: {
    heading: "Paquetes de Decoración con Globos",
    subheading: "Paquetes de referencia para tu evento — cada diseño se personaliza y coordina directo con vos.",
    disclaimer: "Los precios son referenciales. El precio final se acuerda según tus necesidades.",
    includes: "Incluye",
    loading: "Cargando paquetes…",
    loadError: "No pudimos cargar los paquetes. Probá de nuevo en un momento.",
    formTitle: "Pedí tu cotización",
    formSubtitle: "Contanos un poco de tu evento y te respondemos por WhatsApp.",
    name: "Nombre",
    phone: "Teléfono",
    eventDate: "Fecha del evento",
    packageInterest: "Paquete de interés",
    packagePlaceholder: "Todavía no estoy segura",
    notes: "Notas",
    notesPlaceholder: "Colores, temática, lugar, lo que nos ayude a planear…",
    submit: "Enviar por WhatsApp",
    submitting: "Enviando…",
    requiredHint: "Nombre y teléfono son obligatorios.",
    sent: "¡Solicitud enviada! Te respondemos por WhatsApp. Si no se abrió, tocá acá:",
    reopen: "Abrir WhatsApp",
  },
};

const META = {
  en: {
    title: "Balloon Decor Packages | TuMarcaEnTodo",
    description:
      "Organic columns, arches, letter mosaics and full event balloon setups in Orlando, FL. Reference pricing — request your quote over WhatsApp.",
  },
  es: {
    title: "Paquetes de Decoración con Globos | TuMarcaEnTodo",
    description:
      "Columnas orgánicas, arcos, mosaicos de letras y ambientaciones completas con globos en Orlando, FL. Precios de referencia — pedí tu cotización por WhatsApp.",
  },
};

// Carrusel simple, sin librería externa: flechas (desktop) + swipe táctil
// (celular). No pretende ser un carrusel "completo" — solo lo que hace
// falta para que la clienta pueda pasar 2 a 5 fotos de ejemplo por paquete,
// que es todo lo que este catálogo necesita.
function ImageCarousel({ images, alt }) {
  const [index, setIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);

  if (images.length === 0) return null;

  function go(delta) {
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  function handleTouchEnd(e) {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 40) go(deltaX < 0 ? 1 : -1);
    setTouchStartX(null);
  }

  return (
    <div
      className="relative w-full aspect-[4/3] overflow-hidden bg-neutral-100"
      onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
      onTouchEnd={handleTouchEnd}
    >
      <img src={optimizeImage(images[index], 800)} alt={alt} className="w-full h-full object-cover" loading="lazy" />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="previous photo"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center bg-white/80"
          >
            <ChevronLeft size={16} color={COLORS.brown} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="next photo"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center bg-white/80"
          >
            <ChevronRight size={16} color={COLORS.brown} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`photo ${i + 1}`}
                onClick={() => setIndex(i)}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: i === index ? COLORS.white : "rgba(255,255,255,0.5)" }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PackageCard({ pkg, lang, t }) {
  const nombre = lang === "en" ? pkg.nombre_en : pkg.nombre_es;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col pb-5"
      style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.line}` }}
    >
      <ImageCarousel images={pkg.imagenes} alt={nombre} />

      <div className="px-5 pt-5 flex flex-col gap-4">
        <h3 className="text-xl" style={{ fontFamily: "Georgia, serif", color: COLORS.brown }}>
          {nombre}
        </h3>

        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: COLORS.roseDark }}>
            {t.includes}
          </p>
          <ul className="flex flex-col gap-1">
            {pkg.incluye.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-600">
                <Check size={14} className="mt-0.5 shrink-0" color={COLORS.rose} />
                <span>{lang === "en" ? item.en : item.es}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2 mt-auto pt-1">
          {pkg.precios.map((pr, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              style={{ backgroundColor: COLORS.blushDeep, color: COLORS.brown }}
            >
              {lang === "en" ? pr.etiqueta_en : pr.etiqueta_es}
              <span style={{ color: COLORS.roseDark }}>${pr.precio}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Globos() {
  const { lang } = useOutletContext();
  const t = UI[lang];
  useDocumentMeta(META[lang]);

  const [paquetes, setPaquetes] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [paqueteInteres, setPaqueteInteres] = useState("");
  const [notas, setNotas] = useState("");
  const [formStatus, setFormStatus] = useState("idle"); // idle | submitting | sent
  const [sentUrl, setSentUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPaquetes()
      .then((data) => {
        if (cancelled) return;
        setPaquetes(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load balloon packages from Supabase:", err);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = nombre.trim() && telefono.trim() && formStatus !== "submitting";

  const selectedPaquete = useMemo(
    () => paquetes.find((p) => p.slug === paqueteInteres),
    [paquetes, paqueteInteres]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setFormStatus("submitting");

    const paqueteNombre = selectedPaquete
      ? lang === "en"
        ? selectedPaquete.nombre_en
        : selectedPaquete.nombre_es
      : "";

    const lines = [
      lang === "en" ? "Hi! I'd like a quote for balloon decor:" : "¡Hola! Quiero una cotización de decoración con globos:",
      "",
      `${t.name}: ${nombre.trim()}`,
      `${t.phone}: ${telefono.trim()}`,
    ];
    if (fechaEvento) lines.push(`${t.eventDate}: ${fechaEvento}`);
    if (paqueteNombre) lines.push(`${t.packageInterest}: ${paqueteNombre}`);
    if (notas.trim()) lines.push(`${t.notes}: ${notas.trim()}`);

    const url = whatsappUrl(lines.join("\n"));
    setSentUrl(url);

    // WhatsApp opens synchronously in the click (mobile popup rules); the
    // Supabase save follows — see lib/whatsapp.js.
    await openWhatsAppThenSave(url, () =>
      createQuoteRequest({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        fechaEvento: fechaEvento || null,
        paqueteInteres: paqueteInteres || null,
        notas: notas.trim() || null,
      })
    );
    setFormStatus("sent");
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.blush }}>
      <div className="px-5 pt-8 pb-4 text-center max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl mb-2" style={{ fontFamily: "Georgia, serif", color: COLORS.brown }}>
          {t.heading}
        </h1>
        <p className="text-sm text-neutral-500">{t.subheading}</p>
      </div>

      <div className="px-5 max-w-2xl mx-auto">
        <p
          className="text-sm text-center rounded-xl px-4 py-3 mb-6"
          style={{ backgroundColor: COLORS.blushDeep, color: COLORS.brown }}
        >
          {t.disclaimer}
        </p>
      </div>

      {status === "loading" && <p className="px-5 py-10 text-center text-sm text-neutral-500">{t.loading}</p>}
      {status === "error" && (
        <p className="px-5 py-10 text-center text-sm" style={{ color: COLORS.roseDark }}>
          {t.loadError}
        </p>
      )}

      {status === "ready" && (
        <main className="px-5 pb-4 max-w-2xl mx-auto grid gap-4 sm:grid-cols-2">
          {paquetes.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} lang={lang} t={t} />
          ))}
        </main>
      )}

      <form
        onSubmit={handleSubmit}
        className="mx-5 my-8 max-w-lg sm:mx-auto rounded-2xl p-6 flex flex-col gap-3"
        style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.line}` }}
      >
        <h2 className="text-xl" style={{ fontFamily: "Georgia, serif", color: COLORS.brown }}>
          {t.formTitle}
        </h2>
        <p className="text-sm text-neutral-500 -mt-1 mb-1">{t.formSubtitle}</p>

        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={t.name}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.line}` }}
        />
        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder={t.phone}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.line}` }}
        />
        <label className="text-xs font-medium text-neutral-500 -mb-2">{t.eventDate}</label>
        <input
          type="date"
          value={fechaEvento}
          onChange={(e) => setFechaEvento(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.line}` }}
        />
        <select
          value={paqueteInteres}
          onChange={(e) => setPaqueteInteres(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ border: `1px solid ${COLORS.line}` }}
        >
          <option value="">{t.packagePlaceholder}</option>
          {paquetes.map((p) => (
            <option key={p.slug} value={p.slug}>
              {lang === "en" ? p.nombre_en : p.nombre_es}
            </option>
          ))}
        </select>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder={t.notesPlaceholder}
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ border: `1px solid ${COLORS.line}` }}
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 mt-1"
          style={{ backgroundColor: "#25D366", color: "#fff" }}
        >
          <MessageCircle size={17} />
          {formStatus === "submitting" ? t.submitting : t.submit}
        </button>
        <p className="text-xs text-neutral-400 text-center">{t.requiredHint}</p>
        {formStatus === "sent" && sentUrl && (
          <p className="text-sm text-center" role="status" style={{ color: COLORS.brown }}>
            {t.sent}{" "}
            <a href={sentUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
              {t.reopen}
            </a>
          </p>
        )}
      </form>
    </div>
  );
}
