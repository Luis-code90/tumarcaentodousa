import { useState } from "react";
import { Check, Plus, Minus } from "lucide-react";
import { COLORS, SWATCHES, COLOR_NAMES } from "../lib/merchTokens";
import { optimizeImage } from "../lib/images";

const MAX_COMBOS = 20;

const T = {
  en: {
    perCombo: "per combo",
    includes: "Includes",
    choose: "Choose color and size for each piece",
    combo: "Combo",
    pieceOf: (n) => `#${n}`,
    size: "Size",
    sameAsFirst: "Same as #1 for all",
    add: "Add combo",
    qty: "Combos",
  },
  es: {
    perCombo: "por combo",
    includes: "Incluye",
    choose: "Elegí color y talla de cada pieza",
    combo: "Combo",
    pieceOf: (n) => `#${n}`,
    size: "Talla",
    sameAsFirst: "Igual que #1 para todas",
    add: "Agregar combo",
    qty: "Combos",
  },
};

function MiniSwatch({ name, selected, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className="w-6 h-6 rounded-full flex items-center justify-center"
      style={{
        backgroundColor: SWATCHES[name] || "#ccc",
        border: selected ? `2px solid ${COLORS.charcoal}` : "2px solid transparent",
        outlineOffset: "1px",
      }}
    >
      {selected && <Check size={11} color={name === "blanco" || name === "amarillo" ? COLORS.charcoal : "#fff"} />}
    </button>
  );
}

// Clave estable de cada pieza: unidad del combo (1..N) · componente · pieza.
const key = (u, i, k) => `${u}-${i}-${k}`;

export default function ComboCard({ combo, lang, onAdd }) {
  const t = T[lang];
  const [qty, setQty] = useState(1);
  // Elecciones del cliente por pieza. Lo que no está acá usa el valor por
  // defecto (primer color, primera talla): así al elegir 1 combo ya viene
  // todo "pre-elegido", y al subir la cantidad aparecen las piezas nuevas
  // con sus valores por defecto sin perder lo ya elegido.
  const [sel, setSel] = useState({});

  const nombre = lang === "en" ? combo.nombre_en : combo.nombre_es;
  const detalle = lang === "en" ? combo.detalle_en : combo.detalle_es;

  function pieceOf(u, i, k) {
    const producto = combo.items[i].producto;
    const s = sel[key(u, i, k)] || {};
    return { color: s.color ?? producto.colores[0], talla: s.talla ?? producto.tallas[0] };
  }

  function setPiece(u, i, k, patch) {
    setSel((prev) => ({ ...prev, [key(u, i, k)]: { ...pieceOf(u, i, k), ...patch } }));
  }

  function copyFirstToAll(u, i) {
    const first = pieceOf(u, i, 0);
    setSel((prev) => {
      const next = { ...prev };
      for (let k = 1; k < combo.items[i].cantidad; k++) next[key(u, i, k)] = { ...first };
      return next;
    });
  }

  function handleAdd() {
    const piezas = [];
    for (let u = 0; u < qty; u++) {
      combo.items.forEach((item, i) => {
        for (let k = 0; k < item.cantidad; k++) {
          const { color, talla } = pieceOf(u, i, k);
          piezas.push({
            unidad: u + 1,
            producto: item.producto,
            color,
            colorLabel: COLOR_NAMES[color]?.[lang] || color,
            talla,
          });
        }
      });
    }
    onAdd({ kind: "combo", combo, qty, price: combo.precio, piezas });
    setSel({});
    setQty(1);
  }

  const imagen = combo.imagen_url;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col pb-4"
      style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.line}` }}
    >
      {imagen && <img src={optimizeImage(imagen, 600)} alt={nombre} className="w-full aspect-square object-cover" loading="lazy" />}

      <div className="px-4 pt-4 flex flex-col gap-3">
        <div>
          <h3 className="text-lg leading-tight" style={{ fontFamily: "Georgia, serif", color: COLORS.charcoal }}>
            {nombre}
          </h3>
          {detalle && <p className="text-sm text-neutral-500 mt-0.5">{detalle}</p>}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: COLORS.amberDark }}>
            {t.includes}
          </p>
          <ul className="text-sm text-neutral-600 flex flex-col gap-0.5">
            {combo.items.map((it, i) => (
              <li key={i}>
                {it.cantidad} × {lang === "en" ? it.producto.nombre_en : it.producto.nombre_es}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold" style={{ color: COLORS.charcoal }}>
            ${combo.precio}
          </span>
          <span className="text-xs text-neutral-400">{t.perCombo}</span>
        </div>

        <p className="text-xs font-medium text-neutral-500">{t.choose}</p>

        <div className="flex flex-col gap-4">
          {Array.from({ length: qty }, (_, u) => (
            <div
              key={u}
              className="rounded-xl p-3 flex flex-col gap-3"
              style={{ backgroundColor: COLORS.cream, border: `1px solid ${COLORS.line}` }}
            >
              {qty > 1 && (
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.amberDark }}>
                  {t.combo} {u + 1}
                </p>
              )}

              {combo.items.map((item, i) => {
                const producto = item.producto;
                const pname = lang === "en" ? producto.nombre_en : producto.nombre_es;
                const hasSizes = producto.tallas[0] !== "Única";
                return (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold" style={{ color: COLORS.charcoal }}>
                        {item.cantidad > 1 ? `${item.cantidad} × ` : ""}
                        {pname}
                      </p>
                      {item.cantidad > 1 && (
                        <button
                          type="button"
                          onClick={() => copyFirstToAll(u, i)}
                          className="text-[11px] underline text-neutral-500 shrink-0"
                        >
                          {t.sameAsFirst}
                        </button>
                      )}
                    </div>

                    {Array.from({ length: item.cantidad }, (_, k) => {
                      const { color, talla } = pieceOf(u, i, k);
                      return (
                        <div key={k} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          {item.cantidad > 1 && (
                            <span className="text-[11px] text-neutral-400 w-5">{t.pieceOf(k + 1)}</span>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {producto.colores.map((c) => (
                              <MiniSwatch
                                key={c}
                                name={c}
                                label={COLOR_NAMES[c]?.[lang] || c}
                                selected={color === c}
                                onClick={() => setPiece(u, i, k, { color: c })}
                              />
                            ))}
                          </div>
                          {hasSizes && (
                            <select
                              value={talla}
                              onChange={(e) => setPiece(u, i, k, { talla: e.target.value })}
                              aria-label={t.size}
                              className="px-2 py-1 rounded-md text-xs"
                              style={{ border: `1px solid ${COLORS.line}`, backgroundColor: COLORS.white }}
                            >
                              {producto.tallas.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.line}` }}>
            <button
              type="button"
              className="px-2.5 py-1.5"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="minus"
            >
              <Minus size={14} />
            </button>
            <span className="px-3 text-sm font-medium min-w-[2ch] text-center" aria-label={t.qty}>
              {qty}
            </span>
            <button
              type="button"
              className="px-2.5 py-1.5"
              onClick={() => setQty((q) => Math.min(MAX_COMBOS, q + 1))}
              aria-label="plus"
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity active:opacity-80"
            style={{ backgroundColor: COLORS.amber, color: COLORS.white }}
          >
            {t.add} · ${combo.precio * qty}
          </button>
        </div>
      </div>
    </div>
  );
}
