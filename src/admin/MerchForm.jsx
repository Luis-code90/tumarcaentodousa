import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import {
  fetchProductoBySlug,
  saveProducto,
  fetchColores,
  createColor,
  fetchCategorias,
} from "../lib/adminProducts";
import { slugify } from "../lib/slugify";
import ImageUploadField from "./ImageUploadField";
import { readableError } from "./errors";

const TALLAS_DISPONIBLES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "Única"];

const EMPTY = {
  id: null,
  slug: "",
  categoria_slug: "",
  nombre_en: "",
  nombre_es: "",
  detalle_en: "",
  detalle_es: "",
  activo: true,
  orden: 0,
  colores: [],
  tallas: [],
  tramos: [{ cantidad_min: 1, cantidad_max: "", precio: "" }],
};

export default function MerchForm() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isNew = !slug;

  const [form, setForm] = useState(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [colores, setColores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newColor, setNewColor] = useState({ id: "", nombre_en: "", nombre_es: "", hex: "#888888" });
  const [colorError, setColorError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchCategorias(),
      fetchColores(),
      isNew ? Promise.resolve(null) : fetchProductoBySlug(slug),
    ])
      .then(([cats, cols, producto]) => {
        setCategorias(cats);
        setColores(cols);
        if (producto) {
          setForm(producto);
          setSlugTouched(true);
        } else if (cats[0]) {
          setForm((f) => ({ ...f, categoria_slug: cats[0].slug }));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "No se pudo cargar el producto.");
        setLoading(false);
      });
  }, [slug, isNew]);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateNombreEn(value) {
    setForm((f) => ({ ...f, nombre_en: value, slug: slugTouched ? f.slug : slugify(value) }));
  }

  // ---- Colores ----
  function isColorSelected(colorId) {
    return form.colores.some((c) => c.color_id === colorId);
  }

  function toggleColor(colorId) {
    setForm((f) => {
      if (f.colores.some((c) => c.color_id === colorId)) {
        return { ...f, colores: f.colores.filter((c) => c.color_id !== colorId) };
      }
      return { ...f, colores: [...f.colores, { color_id: colorId, imagen_url: null, cloudinary_public_id: null }] };
    });
  }

  function updateColorImage(colorId, img) {
    setForm((f) => ({
      ...f,
      colores: f.colores.map((c) =>
        c.color_id === colorId ? { ...c, imagen_url: img?.imagen_url ?? null, cloudinary_public_id: img?.cloudinary_public_id ?? null } : c
      ),
    }));
  }

  async function handleAddColor() {
    setColorError(null);
    const id = slugify(newColor.id || newColor.nombre_en);
    if (!id || !newColor.nombre_en.trim() || !newColor.nombre_es.trim()) {
      setColorError("Completá clave, nombre en inglés y nombre en español para el color nuevo.");
      return;
    }
    try {
      await createColor({ id, hex: newColor.hex, nombre_en: newColor.nombre_en.trim(), nombre_es: newColor.nombre_es.trim() });
      const updated = await fetchColores();
      setColores(updated);
      setForm((f) => ({ ...f, colores: [...f.colores, { color_id: id, imagen_url: null, cloudinary_public_id: null }] }));
      setNewColor({ id: "", nombre_en: "", nombre_es: "", hex: "#888888" });
    } catch (err) {
      setColorError(readableError(err));
    }
  }

  // ---- Tallas ----
  function toggleTalla(talla) {
    setForm((f) => {
      const selected = f.tallas.includes(talla);
      if (talla === "Única") {
        return { ...f, tallas: selected ? [] : ["Única"] };
      }
      const withoutUnica = f.tallas.filter((t) => t !== "Única");
      return { ...f, tallas: selected ? withoutUnica.filter((t) => t !== talla) : [...withoutUnica, talla] };
    });
  }

  // ---- Tramos de precio ----
  function updateTramo(index, patch) {
    setForm((f) => ({ ...f, tramos: f.tramos.map((t, i) => (i === index ? { ...t, ...patch } : t)) }));
  }
  function addTramo() {
    setForm((f) => ({ ...f, tramos: [...f.tramos, { cantidad_min: "", cantidad_max: "", precio: "" }] }));
  }
  function removeTramo(index) {
    setForm((f) => ({ ...f, tramos: f.tramos.filter((_, i) => i !== index) }));
  }

  function validate() {
    if (!form.nombre_en.trim() || !form.nombre_es.trim()) return "El nombre en inglés y español son obligatorios.";
    if (!form.slug.trim() || !/^[a-z0-9-]+$/.test(form.slug)) {
      return "El identificador (slug) es obligatorio y solo puede tener minúsculas, números y guiones.";
    }
    if (!form.categoria_slug) return "Elegí una categoría.";
    if (form.colores.length === 0) return "Seleccioná al menos un color disponible.";
    if (form.tallas.length === 0) return "Seleccioná al menos una talla (o 'Única' si no aplica).";
    if (form.tramos.length === 0) return "Agregá al menos un tramo de precio.";
    for (const t of form.tramos) {
      if (t.cantidad_min === "" || Number(t.cantidad_min) <= 0) return "Cada tramo necesita una cantidad mínima mayor a 0.";
      if (t.precio === "" || Number(t.precio) < 0) return "Revisá los precios de los tramos: falta alguno o hay un valor inválido.";
      if (t.cantidad_max !== "" && Number(t.cantidad_max) < Number(t.cantidad_min)) {
        return "En un tramo, la cantidad máxima no puede ser menor que la mínima.";
      }
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveProducto({
        ...form,
        tramos: form.tramos.map((t) => ({
          cantidad_min: Number(t.cantidad_min),
          cantidad_max: t.cantidad_max === "" ? null : Number(t.cantidad_max),
          precio: Number(t.precio),
        })),
      });
      navigate("/admin/merch");
    } catch (err) {
      setError(readableError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">Cargando…</p>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-xl pb-10">
      <h1 className="text-lg font-semibold text-neutral-800">{isNew ? "Nuevo producto" : "Editar producto"}</h1>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      <Field label="Nombre (inglés) *">
        <input className={inputClass} value={form.nombre_en} onChange={(e) => updateNombreEn(e.target.value)} />
      </Field>
      <Field label="Nombre (español) *">
        <input className={inputClass} value={form.nombre_es} onChange={(e) => updateField("nombre_es", e.target.value)} />
      </Field>
      <Field label="Identificador (slug) *" hint="Se usa en el carrito del cliente. Solo minúsculas, números y guiones.">
        <input
          className={inputClass}
          value={form.slug}
          onChange={(e) => {
            setSlugTouched(true);
            updateField("slug", e.target.value);
          }}
        />
      </Field>
      <Field label="Categoría *">
        <select className={inputClass} value={form.categoria_slug} onChange={(e) => updateField("categoria_slug", e.target.value)}>
          {categorias.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nombre_es}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Detalle (inglés)">
        <textarea className={inputClass} rows={2} value={form.detalle_en} onChange={(e) => updateField("detalle_en", e.target.value)} />
      </Field>
      <Field label="Detalle (español)">
        <textarea className={inputClass} rows={2} value={form.detalle_es} onChange={(e) => updateField("detalle_es", e.target.value)} />
      </Field>

      <Field label="Colores disponibles *" hint="Marcá los colores en los que viene este producto y subí una foto para cada uno.">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {colores.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer"
                style={{ borderColor: isColorSelected(c.id) ? "#262626" : "#e5e5e5" }}
              >
                <input type="checkbox" checked={isColorSelected(c.id)} onChange={() => toggleColor(c.id)} />
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: c.hex }} />
                {c.nombre_es}
              </label>
            ))}
          </div>

          {form.colores.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-neutral-100 pt-3">
              {form.colores.map((c) => {
                const meta = colores.find((col) => col.id === c.color_id);
                return (
                  <div key={c.color_id} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-600 w-16 shrink-0">{meta?.nombre_es || c.color_id}</span>
                    <ImageUploadField
                      label="foto"
                      value={{ imagen_url: c.imagen_url, cloudinary_public_id: c.cloudinary_public_id }}
                      onChange={(img) => updateColorImage(c.color_id, img)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <details className="text-xs text-neutral-500">
            <summary className="cursor-pointer select-none">¿No está el color que necesitás? Agregar uno nuevo</summary>
            <div className="flex flex-wrap items-end gap-2 mt-2">
              <MiniField label="Clave (ej: turquesa)">
                <input className={miniInputClass} value={newColor.id} onChange={(e) => setNewColor((c) => ({ ...c, id: e.target.value }))} />
              </MiniField>
              <MiniField label="Nombre EN">
                <input className={miniInputClass} value={newColor.nombre_en} onChange={(e) => setNewColor((c) => ({ ...c, nombre_en: e.target.value }))} />
              </MiniField>
              <MiniField label="Nombre ES">
                <input className={miniInputClass} value={newColor.nombre_es} onChange={(e) => setNewColor((c) => ({ ...c, nombre_es: e.target.value }))} />
              </MiniField>
              <MiniField label="Color">
                <input type="color" value={newColor.hex} onChange={(e) => setNewColor((c) => ({ ...c, hex: e.target.value }))} className="h-9 w-12 rounded border border-neutral-300" />
              </MiniField>
              <button type="button" onClick={handleAddColor} className="text-xs font-medium px-2.5 py-2 rounded-lg border border-neutral-300">
                Agregar color
              </button>
            </div>
            {colorError && <p className="text-xs text-red-600 mt-1">{colorError}</p>}
          </details>
        </div>
      </Field>

      <Field label="Tallas disponibles *" hint="'Única' es excluyente con el resto (no aplica selector de talla en el sitio).">
        <div className="flex flex-wrap gap-2">
          {TALLAS_DISPONIBLES.map((t) => (
            <label
              key={t}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer"
              style={{ borderColor: form.tallas.includes(t) ? "#262626" : "#e5e5e5" }}
            >
              <input type="checkbox" checked={form.tallas.includes(t)} onChange={() => toggleTalla(t)} />
              {t}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Tramos de precio *" hint="Dejá la cantidad máxima vacía para 'en adelante'.">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 text-xs text-neutral-400 pl-1">
            <span className="w-24">Cant. mínima</span>
            <span className="w-24">Cant. máxima</span>
            <span className="w-24">Precio</span>
          </div>
          {form.tramos.map((t, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="number"
                min="1"
                className={`${inputClass} w-24`}
                value={t.cantidad_min}
                onChange={(e) => updateTramo(i, { cantidad_min: e.target.value })}
              />
              <input
                type="number"
                min="1"
                placeholder="sin tope"
                className={`${inputClass} w-24`}
                value={t.cantidad_max}
                onChange={(e) => updateTramo(i, { cantidad_max: e.target.value })}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                className={`${inputClass} w-24`}
                value={t.precio}
                onChange={(e) => updateTramo(i, { precio: e.target.value })}
              />
              <RemoveButton onClick={() => removeTramo(i)} />
            </div>
          ))}
          <AddButton label="Agregar tramo" onClick={addTramo} />
        </div>
      </Field>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" checked={form.activo} onChange={(e) => updateField("activo", e.target.checked)} />
        Visible en el sitio
      </label>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-neutral-800 disabled:opacity-50">
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={() => navigate("/admin/merch")} className="px-4 py-2 rounded-lg text-sm text-neutral-500">
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputClass = "flex-1 px-3 py-2 rounded-lg text-sm border border-neutral-300";
const miniInputClass = "px-2 py-1.5 rounded-lg text-xs border border-neutral-300 w-28";

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

function MiniField({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-neutral-400">{label}</span>
      {children}
    </div>
  );
}

function AddButton({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="self-start flex items-center gap-1 text-xs font-medium text-neutral-600 underline">
      <Plus size={13} /> {label}
    </button>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Quitar" className="text-neutral-400 hover:text-red-600">
      <Trash2 size={16} />
    </button>
  );
}
