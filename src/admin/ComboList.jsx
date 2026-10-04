import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllCombos, setComboActivo } from "../lib/adminCombos";
import { fetchAllProductos } from "../lib/adminProducts";
import ConfirmToggle from "./ConfirmToggle";

export default function ComboList() {
  const [combos, setCombos] = useState(null);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const [c, p] = await Promise.all([fetchAllCombos(), fetchAllProductos()]);
      setCombos(c);
      setProductos(p);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los combos. ¿Ya corriste supabase/combos_schema.sql?");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActivo(c) {
    try {
      await setComboActivo(c.id, !c.activo);
      await load();
    } catch (err) {
      alert("No se pudo actualizar: " + (err.message || err));
    }
  }

  function resumen(c) {
    return c.items
      .map((it) => {
        const p = productos.find((pr) => pr.id === it.producto_id);
        return `${it.cantidad} × ${p ? p.nombre_es : "(producto borrado)"}`;
      })
      .join(" + ");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-800">Ofertas (combos)</h1>
        <Link to="nuevo" className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-neutral-800 text-white">
          + Nuevo combo
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!combos && !error && <p className="text-sm text-neutral-500">Cargando…</p>}

      {combos && (
        <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
          {combos.length === 0 && <p className="p-4 text-sm text-neutral-500">Todavía no hay combos.</p>}
          {combos.map((c) => (
            <div key={c.id} className="p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                {c.imagen_url && <img src={c.imagen_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">
                  {c.nombre_es} · ${c.precio}
                </p>
                <p className="text-xs text-neutral-400 truncate">
                  {resumen(c)}
                  {!c.activo && <span className="text-red-500 font-medium"> · inactivo</span>}
                </p>
              </div>
              <Link to={c.slug} className="text-sm font-medium text-neutral-700 underline">
                Editar
              </Link>
              <ConfirmToggle
                label={c.activo ? "Desactivar" : "Reactivar"}
                confirmLabel={c.activo ? "Sí, desactivar" : "Sí, reactivar"}
                tone={c.activo ? "danger" : "default"}
                onConfirm={() => toggleActivo(c)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
