import { useState, useMemo, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { ShoppingBag, X, Plus, Minus, Check, MessageCircle } from "lucide-react";
import { fetchProducts } from "./lib/products";
import { createOrder } from "./lib/orders";
import { useDocumentMeta } from "./lib/useDocumentMeta";
import { whatsappUrl, openWhatsAppThenSave } from "./lib/whatsapp";
import { optimizeImage } from "./lib/images";

const META = {
  en: {
    title: "Custom Merchandising | TuMarcaEnTodo",
    description:
      "Custom t-shirts, hoodies, caps, mugs, tumblers and aprons with bulk pricing. Build your order and confirm it over WhatsApp.",
  },
  es: {
    title: "Merchandising Personalizado | TuMarcaEnTodo",
    description:
      "Remeras, buzos, gorras, mugs, tumblers y delantales personalizados con precios por cantidad. Armá tu pedido y confirmalo por WhatsApp.",
  },
};

// ---- Design tokens ----
const COLORS = {
  amber: "#E8952E",
  amberDark: "#B8701A",
  charcoal: "#2B2A27",
  cream: "#FBF4E8",
  creamDeep: "#F3E7D3",
  white: "#FFFFFF",
  line: "#E4D6BC",
};

// ---- UI strings, mirrors the _en/_es column pattern planned for Supabase ----
const UI = {
  en: {
    perUnit: "each",
    from: (price, qty) => `($${price} from ${qty}u)`,
    add: "Add",
    yourOrder: "Your order",
    empty: "You haven't added any products yet.",
    emptyCategory: "No products in this category yet.",
    sent: "Order sent! We'll confirm it with you on WhatsApp. If WhatsApp didn't open, tap below.",
    reopen: "Open WhatsApp again",
    remove: "Remove",
    total: "Estimated total",
    confirmWhatsapp: "Confirm via WhatsApp",
    size: "Size",
    unique: "One size",
    yourName: "Your name",
    yourPhone: "Your phone",
    loading: "Loading catalog…",
    loadError: "We couldn't load the catalog. Please try again in a moment.",
    categories: {
      Remeras: "T-Shirts",
      Buzos: "Sweatshirts",
      Gorras: "Caps",
      Mugs: "Mugs",
      Tumblers: "Tumblers",
      Delantales: "Aprons",
    },
    whatsappMsg: (lines, total) =>
      `Hi! I'd like to place this order:\n\n${lines.join("\n")}\n\nEstimated total: $${total}`,
  },
  es: {
    perUnit: "c/u",
    from: (price, qty) => `($${price} desde ${qty}u)`,
    add: "Agregar",
    yourOrder: "Tu pedido",
    empty: "Todavía no agregaste productos.",
    emptyCategory: "Todavía no hay productos en esta categoría.",
    sent: "¡Pedido enviado! Lo confirmamos con vos por WhatsApp. Si no se abrió, tocá abajo.",
    reopen: "Abrir WhatsApp de nuevo",
    remove: "Quitar",
    total: "Total estimado",
    confirmWhatsapp: "Confirmar por WhatsApp",
    size: "Talla",
    unique: "Única",
    yourName: "Tu nombre",
    yourPhone: "Tu teléfono",
    loading: "Cargando catálogo…",
    loadError: "No pudimos cargar el catálogo. Probá de nuevo en un momento.",
    categories: {
      Remeras: "Remeras",
      Buzos: "Buzos",
      Gorras: "Gorras",
      Mugs: "Mugs",
      Tumblers: "Tumblers",
      Delantales: "Delantales",
    },
    whatsappMsg: (lines, total) =>
      `Hola! Quiero hacer este pedido:\n\n${lines.join("\n")}\n\nTotal estimado: $${total}`,
  },
};

const CATEGORY_KEYS = ["Remeras", "Buzos", "Gorras", "Mugs", "Tumblers", "Delantales"];

const SWATCHES = {
  negro: "#1a1a1a",
  blanco: "#f5f5f5",
  gris: "#8a8a8a",
  azul: "#2f5fa8",
  rojo: "#c1272d",
  amarillo: "#f2c230",
  verde: "#3f7d4f",
  rosa: "#e8a3b8",
  bordo: "#6d2530",
  celeste: "#a8d3e6",
  dorado: "#c9a86a",
};

const COLOR_NAMES = {
  negro: { en: "Black", es: "Negro" },
  blanco: { en: "White", es: "Blanco" },
  gris: { en: "Grey", es: "Gris" },
  azul: { en: "Blue", es: "Azul" },
  rojo: { en: "Red", es: "Rojo" },
  amarillo: { en: "Yellow", es: "Amarillo" },
  verde: { en: "Green", es: "Verde" },
  rosa: { en: "Pink", es: "Rosa" },
  bordo: { en: "Maroon", es: "Bordo" },
  celeste: { en: "Light blue", es: "Celeste" },
  dorado: { en: "Gold", es: "Dorado" },
};

// Catalog is fetched from Supabase via fetchProducts() (see
// src/lib/products.js), which maps productos + producto_colores +
// producto_tallas + tramos_precio into exactly this shape: { id, categoria,
// nombre_en, nombre_es, detalle_en, detalle_es, colores, tallas, tramos }.
// Run supabase/seed.sql to load the same 11 products that used to live here
// as a mock array.

function priceFor(product, qty) {
  const tramo =
    product.tramos.find((t) => qty >= t.min && qty <= t.max) ||
    product.tramos[product.tramos.length - 1];
  return tramo.precio;
}

function Swatch({ name, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      title={name}
      aria-label={name}
      aria-pressed={selected}
      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform"
      style={{
        backgroundColor: SWATCHES[name] || "#ccc",
        border: selected ? `2px solid ${COLORS.charcoal}` : "2px solid transparent",
        outlineOffset: "2px",
        transform: selected ? "scale(1.08)" : "scale(1)",
      }}
    >
      {selected && (
        <Check
          size={13}
          color={name === "blanco" || name === "amarillo" ? COLORS.charcoal : "#fff"}
        />
      )}
    </button>
  );
}

function ProductCard({ product, lang, t, onAdd }) {
  const [color, setColor] = useState(product.colores[0]);
  const [talla, setTalla] = useState(product.tallas[0]);
  const [qty, setQty] = useState(1);
  const price = priceFor(product, qty);
  const nombre = lang === "en" ? product.nombre_en : product.nombre_es;
  const detalle = lang === "en" ? product.detalle_en : product.detalle_es;
  // Foto de la variante de color elegida; si ese color no tiene foto propia
  // cargada todavía, cae de vuelta a la imagen general del producto.
  const imagen = product.imagenesPorColor?.[color] || product.imagen_url;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col pb-4"
      style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.line}` }}
    >
      {imagen && (
        <img
          src={optimizeImage(imagen, 600)}
          alt={nombre}
          className="w-full aspect-square object-cover"
          loading="lazy"
        />
      )}

      <div className="px-4 pt-4 flex flex-col gap-3">
      <div>
        <p
          className="text-[11px] uppercase tracking-widest font-semibold"
          style={{ color: COLORS.amberDark }}
        >
          {t.categories[product.categoria]}
        </p>
        <h3 className="text-lg leading-tight" style={{ fontFamily: "Georgia, serif", color: COLORS.charcoal }}>
          {nombre}
        </h3>
        <p className="text-sm text-neutral-500 mt-0.5">{detalle}</p>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold" style={{ color: COLORS.charcoal }}>
          ${price}
        </span>
        <span className="text-xs text-neutral-400">{t.perUnit}</span>
        {product.tramos.length > 1 && (
          <span className="text-xs text-neutral-400">
            {t.from(
              product.tramos[product.tramos.length - 1].precio,
              product.tramos[product.tramos.length - 1].min
            )}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {product.colores.map((c) => (
          <Swatch key={c} name={c} selected={color === c} onClick={() => setColor(c)} />
        ))}
      </div>

      {product.tallas[0] !== "Única" && (
        <div className="flex flex-wrap gap-1.5">
          {product.tallas.map((s) => (
            <button
              key={s}
              onClick={() => setTalla(s)}
              className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
              style={{
                backgroundColor: talla === s ? COLORS.charcoal : COLORS.cream,
                color: talla === s ? COLORS.white : COLORS.charcoal,
                border: `1px solid ${talla === s ? COLORS.charcoal : COLORS.line}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-1">
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: `1px solid ${COLORS.line}` }}
        >
          <button
            className="px-2.5 py-1.5"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="minus"
          >
            <Minus size={14} />
          </button>
          <span className="px-3 text-sm font-medium min-w-[2ch] text-center">{qty}</span>
          <button
            className="px-2.5 py-1.5"
            onClick={() => setQty((q) => Math.min(999, q + 1))}
            aria-label="plus"
          >
            <Plus size={14} />
          </button>
        </div>

        <button
          onClick={() =>
            onAdd({
              product,
              color,
              colorLabel: COLOR_NAMES[color]?.[lang] || color,
              talla,
              qty,
              price,
            })
          }
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity active:opacity-80"
          style={{ backgroundColor: COLORS.amber, color: COLORS.white }}
        >
          {t.add}
        </button>
      </div>
      </div>
    </div>
  );
}

function CartDrawer({
  open,
  onClose,
  items,
  lang,
  t,
  onRemove,
  onChangeQty,
  onCheckout,
  sentUrl,
  clienteNombre,
  clienteTelefono,
  onClienteNombreChange,
  onClienteTelefonoChange,
}) {
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  const canCheckout = items.length > 0 && clienteNombre.trim() && clienteTelefono.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end transition-opacity"
      style={{
        backgroundColor: "rgba(43,42,39,0.45)",
        pointerEvents: open ? "auto" : "none",
        opacity: open ? 1 : 0,
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm h-full flex flex-col p-5 gap-4 transition-transform"
        style={{
          backgroundColor: COLORS.cream,
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl" style={{ fontFamily: "Georgia, serif", color: COLORS.charcoal }}>
            {t.yourOrder}
          </h2>
          <button onClick={onClose} aria-label="close">
            <X size={20} color={COLORS.charcoal} />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-neutral-500 mt-8 text-center">{t.empty}</p>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {items.map((it, i) => {
              const nombre = lang === "en" ? it.product.nombre_en : it.product.nombre_es;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl p-3"
                  style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.line}` }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: COLORS.charcoal }}>
                      {nombre}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {it.colorLabel}
                      {it.talla !== "Única" ? ` · ${t.size} ${it.talla}` : ""} · ${it.price} {t.perUnit}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => onChangeQty(i, it.qty - 1)}
                        aria-label="minus"
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ border: `1px solid ${COLORS.line}` }}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-medium min-w-[2ch] text-center">{it.qty}</span>
                      <button
                        onClick={() => onChangeQty(i, it.qty + 1)}
                        aria-label="plus"
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ border: `1px solid ${COLORS.line}` }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">${it.price * it.qty}</span>
                    <button onClick={() => onRemove(i)} aria-label={t.remove}>
                      <X size={15} color="#999" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={clienteNombre}
              onChange={(e) => onClienteNombreChange(e.target.value)}
              placeholder={t.yourName}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ border: `1px solid ${COLORS.line}`, backgroundColor: COLORS.white }}
            />
            <input
              type="tel"
              value={clienteTelefono}
              onChange={(e) => onClienteTelefonoChange(e.target.value)}
              placeholder={t.yourPhone}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ border: `1px solid ${COLORS.line}`, backgroundColor: COLORS.white }}
            />
          </div>
        )}

        {sentUrl && (
          <div
            className="rounded-xl p-3 text-sm flex flex-col gap-2"
            style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.line}`, color: COLORS.charcoal }}
            role="status"
          >
            <p>{t.sent}</p>
            <a href={sentUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
              {t.reopen}
            </a>
          </div>
        )}

        <div className="pt-3" style={{ borderTop: `1px solid ${COLORS.line}` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">{t.total}</span>
            <span className="text-lg font-semibold" style={{ color: COLORS.charcoal }}>
              ${total}
            </span>
          </div>
          <button
            disabled={!canCheckout}
            onClick={onCheckout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: "#25D366", color: "#fff" }}
          >
            <MessageCircle size={17} />
            {t.confirmWhatsapp}
          </button>
        </div>
      </div>
    </div>
  );
}

const CART_STORAGE_KEY = "tumarcaentodo_cart_v1";

// Reattaches product data by id since only the id is persisted to storage.
// Takes the fetched products list explicitly because it now only exists as
// component state, not as a module-level constant — a product removed from
// Supabase since the cart was saved is silently dropped from the cart.
function hydrateCart(rawItems, products) {
  return rawItems
    .map((it) => {
      const product = products.find((p) => p.id === it.productId);
      if (!product) return null;
      return { ...it, product, price: priceFor(product, it.qty) };
    })
    .filter(Boolean);
}

export default function CatalogoMerch() {
  // Language is owned by Layout.jsx so it stays consistent when navigating
  // between "/", "/merch" and "/globos", not local state here anymore.
  const { lang } = useOutletContext();
  const t = UI[lang];
  useDocumentMeta(META[lang]);

  const [cat, setCat] = useState("Remeras");
  const [products, setProducts] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading"); // loading | ready | error
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [sentUrl, setSentUrl] = useState(null);

  // Cart items need the full product object (for pricing/labels), not just
  // an id, so hydration from localStorage has to wait until the catalog
  // itself has loaded from Supabase. cartHydrated guards against redoing
  // this every time `products` changes reference after the first load.
  const cartHydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => {
        if (cancelled) return;
        setProducts(data);
        setCatalogStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load catalog from Supabase:", err);
        setCatalogStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (catalogStatus !== "ready" || cartHydrated.current) return;
    cartHydrated.current = true;
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) setCart(hydrateCart(JSON.parse(raw), products));
    } catch {
      // storage unavailable or corrupted — start with an empty cart
    }
  }, [catalogStatus, products]);

  const filtered = useMemo(() => products.filter((p) => p.categoria === cat), [products, cat]);
  const cartCount = cart.reduce((s, it) => s + it.qty, 0);

  useEffect(() => {
    try {
      const serializable = cart.map((it) => ({
        productId: it.product.id,
        color: it.color,
        colorLabel: it.colorLabel,
        talla: it.talla,
        qty: it.qty,
      }));
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // storage unavailable (e.g. private browsing) — fail silently, cart still works in-session
    }
  }, [cart]);

  function addToCart(item) {
    setCart((c) => {
      const idx = c.findIndex(
        (it) =>
          it.product.id === item.product.id &&
          it.color === item.color &&
          it.talla === item.talla
      );
      if (idx === -1) return [...c, item];
      const next = [...c];
      const newQty = next[idx].qty + item.qty;
      next[idx] = { ...next[idx], qty: newQty, price: priceFor(item.product, newQty) };
      return next;
    });
    setSentUrl(null);
    setCartOpen(true);
  }

  function changeQty(idx, qty) {
    if (qty < 1) return removeFromCart(idx);
    const next = Math.min(999, qty);
    setCart((c) => c.map((it, i) => (i === idx ? { ...it, qty: next, price: priceFor(it.product, next) } : it)));
  }

  function removeFromCart(idx) {
    setCart((c) => c.filter((_, i) => i !== idx));
  }

  async function checkout() {
    if (!cart.length || !clienteNombre.trim() || !clienteTelefono.trim()) return;

    const lines = cart.map((it) => {
      const nombre = lang === "en" ? it.product.nombre_en : it.product.nombre_es;
      const sizePart = it.talla !== "Única" ? `, ${t.size.toLowerCase()} ${it.talla}` : "";
      return `• ${nombre} — ${it.colorLabel}${sizePart} x${it.qty} — $${it.price * it.qty}`;
    });
    const total = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const url = whatsappUrl(t.whatsappMsg(lines, total));
    const snapshot = cart;

    // WhatsApp must open synchronously in the click (mobile popup rules);
    // the Supabase save runs right after, see lib/whatsapp.js.
    await openWhatsAppThenSave(url, () =>
      createOrder({
        items: snapshot,
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim(),
        idioma: lang,
      })
    );

    setSentUrl(url);
    setCart([]);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.cream }}>
      {/* Cart button — the shared Header (logo + language toggle) now lives
          in Layout.jsx and is common to every section, so the merch-only
          cart control gets its own slim bar instead of living inside it. */}
      <div className="px-5 pt-4 flex justify-end">
        <button
          onClick={() => setCartOpen(true)}
          className="relative p-2 rounded-full"
          style={{ backgroundColor: COLORS.amber }}
          aria-label="cart"
        >
          <ShoppingBag size={19} color={COLORS.charcoal} />
          {cartCount > 0 && (
            <span
              className="absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
              style={{ backgroundColor: COLORS.white, color: COLORS.charcoal }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Category tabs */}
      <div className="px-5 py-4 flex gap-2 overflow-x-auto">
        {CATEGORY_KEYS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              backgroundColor: cat === c ? COLORS.amber : COLORS.white,
              color: cat === c ? COLORS.white : COLORS.charcoal,
              border: `1px solid ${cat === c ? COLORS.amber : COLORS.line}`,
            }}
          >
            {t.categories[c]}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {catalogStatus === "loading" && (
        <p className="px-5 py-10 text-center text-sm text-neutral-500">{t.loading}</p>
      )}
      {catalogStatus === "error" && (
        <p className="px-5 py-10 text-center text-sm" style={{ color: COLORS.amberDark }}>
          {t.loadError}
        </p>
      )}
      {catalogStatus === "ready" && filtered.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-neutral-500">{t.emptyCategory}</p>
      )}
      {catalogStatus === "ready" && filtered.length > 0 && (
        <main className="px-5 pb-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} lang={lang} t={t} onAdd={addToCart} />
          ))}
        </main>
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        lang={lang}
        t={t}
        onRemove={removeFromCart}
        onChangeQty={changeQty}
        sentUrl={sentUrl}
        onCheckout={checkout}
        clienteNombre={clienteNombre}
        clienteTelefono={clienteTelefono}
        onClienteNombreChange={setClienteNombre}
        onClienteTelefonoChange={setClienteTelefono}
      />
    </div>
  );
}
