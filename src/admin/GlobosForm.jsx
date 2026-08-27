import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { fetchPaqueteBySlug, savePaquete } from "../lib/adminPackages";
import { slugify } from "../lib/slugify";
import ImageUploadField from "./ImageUploadField";
import { readableError } from "./errors";

const EMPTY = {
  id: null,
  slug: "",
  nombre_en: "",
  nombre_es: "",
  activo: true,
  orden: 0,
  imagenes: [],
  incluye: [{ texto_en: "", texto_es: "" }],
  precios: [{ etiqueta_en: "", etiqueta_es: "", precio: "" }],
};

export default function GlobosForm() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isNew = !slug;

  const [form, setForm] = useState(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isNew) return;
    fetchPaqueteBySlug(slug)
      .then((p) => {
        setForm(p);
        setSlugTouched(true);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "No se pudo cargar el paquete.");
        setLoading(false);
      });
  }, [slug, isNew]);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateNombreEn(value) {
    setForm((f) => ({
      ...f,
      nombre_en: value,
      slug: slugTouched ? f.slug : slugify(value),
    }));
  }

  function updateListItem(listName, index, patch) {
    setForm((f) => ({
      ...f,
      [listName]: f[listName].map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function addListItem(listName, empty) {
    setForm((f) => ({ ...f, [listName]: [...f[listName], empty] }));
  }

  function removeListItem(listName, index) {
    setForm((f) => ({ ...f, [listName]: f[listName].filter((_, i) => i !== index) }));
  }

  function moveListItem(listName, index, delta) {
    setForm((f) => {
      const list = [...f[listName]];
      const target = index + delta;
      if (target < 0 || target >= list.length) return f;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...f, [listName]: list };
    });
  }

  function validate() {
    if (!form.nombre_en.trim() || !form.nombre_es.trim()) return "El nombre en inglés y español son obligatorios.";
    if (!form.slug.trim()) return "El identificador (slug) es obligatorio.";
    if (!/^[a-z0-9-]+$/.test(form.slug)) return "El identificador solo puede tener minúsculas, números y guiones.";
    const incluye = form.incluye.filter((i) => i.texto_en.trim() || i.texto_es.trim());
    if (incluye.some((i) => !i.texto_en.trim() || !i.texto_es.trim())) {
      return "Cada ítem de 'qué incluye' necesita texto en los dos idiomas (o borralo con la papelera).";
    }
    const precios = form.precios.filter((p) => p.etiqueta_en.trim() || p.etiqueta_es.trim() || p.precio !== "");
    if (precios.length === 0) return "Agregá al menos una opción de precio.";
    for (const p of precios) {
      if (!p.etiqueta_en.trim() || !p.etiqueta_es.trim()) return "Cada opción de precio necesita una etiqueta en los dos idiomas.";
      if (p.precio === "" || Number(p.precio) < 0) return "Revisá los precios: falta alguno o hay un valor inválido.";
    }
    if (form.imagenes.some((img) => !img.imagen_url)) {
      return "Hay una foto sin subir todavía — esperá a que termine de subir o quitá esa fila.";
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
      await savePaquete({
        ...form,
        incluye: form.incluye.filter((i) => i.texto_en.trim() && i.texto_es.trim()),
        precios: form.precios
          .filter((p) => p.etiqueta_en.trim() && p.etiqueta_es.trim() && p.precio !== "")
          .map((p) => ({ ...p, precio: Number(p.precio) })),
      });
      navigate("/admin/globos");
    } catch (err) {
      setError(readableError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">Cargando…</p>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-xl">
      <h1 className="text-lg font-semibold text-neutral-800">{isNew ? "Nuevo paquete" : "Editar paquete"}</h1>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      <Field label="Nombre (inglés) *">
        <input className={inputClass} value={form.nombre_en} onChange={(e) => updateNombreEn(e.target.value)} />
      </Field>
      <Field label="Nombre (español) *">
        <input className={inputClass} value={form.nombre_es} onChange={(e) => updateField("nombre_es", e.target.value)} />
      </Field>
      <Field label="Identificador (slug) *" hint="Se usa en la URL interna. Solo minúsculas, números y guiones.">
        <input
          className={inputClass}
          value={form.slug}
          onChange={(e) => {
            setSlugTouched(true);
            updateField("slug", e.target.value);
          }}
        />
      </Field>

      <Field
        label="Fotos del paquete"
        hint="Podés cargar varias (ej. 5) — ningún trabajo con globos sale igual al anterior. La primera es la que se ve como miniatura en el listado."
      >
        <div className="flex flex-col gap-2">
          {form.imagenes.map((img, i) => (
            <div key={i} className="flex items-center gap-2 bg-neutral-50 rounded-lg p-2">
              <ImageUploadField
                label={`foto ${i + 1}`}
                value={img}
                onChange={(next) => updateListItem("imagenes", i, next ?? { imagen_url: null, cloudinary_public_id: null })}
              />
              <div className="flex flex-col gap-0.5 ml-auto">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => moveListItem("imagenes", i, -1)}
                  aria-label="Mover arriba"
                  className="text-neutral-400 disabled:opacity-20 hover:text-neutral-700"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  disabled={i === form.imagenes.length - 1}
                  onClick={() => moveListItem("imagenes", i, 1)}
                  aria-label="Mover abajo"
                  className="text-neutral-400 disabled:opacity-20 hover:text-neutral-700"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              <RemoveButton onClick={() => removeListItem("imagenes", i)} />
            </div>
          ))}
          <AddButton
            label="Agregar foto"
            onClick={() => addListItem("imagenes", { imagen_url: null, cloudinary_public_id: null })}
          />
        </div>
      </Field>

      <Field label="Qué incluye *">
        <div className="flex flex-col gap-2">
          {form.incluye.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={inputClass}
                placeholder="Inglés"
                value={item.texto_en}
                onChange={(e) => updateListItem("incluye", i, { texto_en: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Español"
                value={item.texto_es}
                onChange={(e) => updateListItem("incluye", i, { texto_es: e.target.value })}
              />
              <RemoveButton onClick={() => removeListItem("incluye", i)} />
            </div>
          ))}
          <AddButton label="Agregar ítem" onClick={() => addListItem("incluye", { texto_en: "", texto_es: "" })} />
        </div>
      </Field>

      <Field label="Opciones de precio *">
        <div className="flex flex-col gap-2">
          {form.precios.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={inputClass}
                placeholder="Etiqueta (inglés)"
                value={p.etiqueta_en}
                onChange={(e) => updateListItem("precios", i, { etiqueta_en: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Etiqueta (español)"
                value={p.etiqueta_es}
                onChange={(e) => updateListItem("precios", i, { etiqueta_es: e.target.value })}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                className={`${inputClass} w-28`}
                placeholder="Precio"
                value={p.precio}
                onChange={(e) => updateListItem("precios", i, { precio: e.target.value })}
              />
              <RemoveButton onClick={() => removeListItem("precios", i)} />
            </div>
          ))}
          <AddButton
            label="Agregar opción de precio"
            onClick={() => addListItem("precios", { etiqueta_en: "", etiqueta_es: "", precio: "" })}
          />
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
        <button type="button" onClick={() => navigate("/admin/globos")} className="px-4 py-2 rounded-lg text-sm text-neutral-500">
          Cancelar
        </button>
      </div>
    </form>
  );
}

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
