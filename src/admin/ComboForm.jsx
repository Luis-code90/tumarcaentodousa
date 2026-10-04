import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { fetchComboBySlug, saveCombo } from "../lib/adminCombos";
import { fetchAllProductos } from "../lib/adminProducts";
import { slugify } from "../lib/slugify";
import ImageUploadField from "./ImageUploadField";
import { readableError } from "./errors";

const EMPTY = {
  id: null,
  slug: "",
  nombre_en: "",
  nombre_es: "",
  detalle_en: "",
  detalle_es: "",
  precio: "",
  imagen_url: null,
  cloudinary_public_id: null,
  activo: true,
  orden: 0,
  items: [{ producto_id: "", cantidad: 1 }],
};

const inputClass = "flex-1 px-3 py-2 rounded-lg text-sm border border-neutral-300";

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

export default function ComboForm() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isNew = !slug;

  const [form, setForm] = useState(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([fetchAllProductos(), isNew ? Promise.resolve(null) : fetchComboBySlug(slug)])
      .then(([prods, combo]) => {
        setProductos(prods);
        if (combo) {
          setForm(combo);
          setSlugTouched(true);
        }
      })
      .catch((err) => setError(err.message || "No se pudo cargar. ¿Ya corriste supabase/combos_schema.sql?"))
      .finally(() => setLoading(false));
  }, [slug, isNew]);

  function updateField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function updateNombreEn(value) {
    setForm((f) => ({ ...f, nombre_en: value, slug: slugTouched ? f.slug : slugify(value) }));
  }

  function updateItem(index, patch) {
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));
  }

  function validate() {
    if (!form.nombre_en.trim() || !form.nombre_es.trim()) return "El nombre en inglés y español son obligatorios.";
    if (!form.slug.trim() || !/^[a-z0-9-]+$/.test(form.slug)) {
      return "El identificador (slug) es obligatorio y solo puede tener minúsculas, números y guiones.";
    }
    if (form.precio === "" || Number(form.precio) < 0) return "Poné el precio del combo.";
    if (form.items.length === 0) return "Agregá al menos un producto al combo.";
    for (const it of form.items) {
      if (!it.producto_id) return "Elegí el producto en cada fila del combo.";
      if (!Number.isInteger(Number(it.cantidad)) || Number(it.cantidad) < 1 || Number(it.cantidad) > 50) {
        return "La cantidad de cada producto debe ser un número entre 1 y 50.";
      }
      const p = productos.find((pr) => pr.id === it.producto_id);
      if (p && (p.colores.length === 0 || p.tallas.length === 0)) {
        return `"${p.nombre_es}" no tiene colores o tallas cargados, así que el cliente no podría elegirlos.`;
      }
    }
    const ids = form.items.map((it) => it.producto_id);
    if (new Set(ids).size !== ids.length) {
      return "Un mismo producto aparece dos veces. Si son 5 camisetas iguales, poné una sola fila con cantidad 5.";
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
      await saveCombo({
        ...form,
        precio: Number(form.precio),
        orden: Number(form.orden) || 0,
        items: form.items.map((it) => ({ producto_id: it.producto_id, cantidad: Number(it.cantidad) })),
      });
      navigate("/admin/ofertas");
    } catch (err) {
      setError(readableError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">Cargando…</p>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-xl pb-10">
      <h1 className="text-lg font-semibold text-neutral-800">{isNew ? "Nuevo combo" : "Editar combo"}</h1>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      <Field label="Nombre (inglés) *">
        <input className={inputClass} value={form.nombre_en} onChange={(e) => updateNombreEn(e.target.value)} />
      </Field>
      <Field label="Nombre (español) *">
        <input className={inputClass} value={form.nombre_es} onChange={(e) => updateField("nombre_es", e.target.value)} />
      </Field>
      <Field label="Identificador (slug) *" hint="Solo minúsculas, números y guiones.">
        <input
          className={inputClass}
          value={form.slug}
          onChange={(e) => {
            setSlugTouched(true);
            updateField("slug", e.target.value);
          }}
        />
      </Field>
      <Field label="Detalle (inglés)">
        <textarea className={inputClass} rows={2} value={form.detalle_en} onChange={(e) => updateField("detalle_en", e.target.value)} />
      </Field>
      <Field label="Detalle (español)">
        <textarea className={inputClass} rows={2} value={form.detalle_es} onChange={(e) => updateField("detalle_es", e.target.value)} />
      </Field>

      <Field label="Precio del combo (USD) *" hint="Precio por cada combo completo. Si el cliente compra 2, se cobra el doble.">
        <input
          className={inputClass}
          type="number"
          min="0"
          step="0.01"
          value={form.precio}
          onChange={(e) => updateField("precio", e.target.value)}
        />
      </Field>

      <Field label="Foto del combo" hint="Una foto que muestre el conjunto.">
        <ImageUploadField
          value={form.imagen_url ? { imagen_url: form.imagen_url, cloudinary_public_id: form.cloudinary_public_id } : null}
          onChange={(v) => setForm((f) => ({ ...f, imagen_url: v?.imagen_url ?? null, cloudinary_public_id: v?.cloudinary_public_id ?? null }))}
          label="foto"
        />
      </Field>

      <Field
        label="Qué incluye *"
        hint="Elegí productos del catálogo y cuántas unidades trae cada uno. El cliente elegirá el color y la talla de cada pieza entre los que tenga ese producto."
      >
        <div className="flex flex-col gap-2">
          {form.items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="50"
                value={it.cantidad}
                onChange={(e) => updateItem(i, { cantidad: e.target.value })}
                aria-label="Cantidad"
                className="w-16 px-2 py-2 rounded-lg text-sm border border-neutral-300"
              />
              <span className="text-neutral-400 text-sm">×</span>
              <select
                className={inputClass}
                value={it.producto_id}
                onChange={(e) => updateItem(i, { producto_id: e.target.value })}
              >
                <option value="">Elegí un producto…</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_es}
                    {!p.activo ? " (inactivo)" : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Quitar"
                className="text-neutral-400 hover:text-red-600"
                onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, items: [...f.items, { producto_id: "", cantidad: 1 }] }))}
            className="self-start flex items-center gap-1 text-xs font-medium text-neutral-600 underline"
          >
            <Plus size={13} /> Agregar otro producto
          </button>
        </div>
      </Field>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" checked={form.activo} onChange={(e) => updateField("activo", e.target.checked)} />
        Visible en el sitio
      </label>

      <Field label="Orden" hint="Los números más bajos salen primero.">
        <input className={inputClass} type="number" value={form.orden} onChange={(e) => updateField("orden", e.target.value)} />
      </Field>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-neutral-800 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={() => navigate("/admin/ofertas")} className="px-4 py-2 text-sm text-neutral-500 underline">
          Cancelar
        </button>
      </div>
    </form>
  );
}
