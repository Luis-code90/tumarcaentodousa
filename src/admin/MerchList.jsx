import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllProductos, setProductoActivo } from "../lib/adminProducts";
import ConfirmToggle from "./ConfirmToggle";

export default function MerchList() {
  const [productos, setProductos] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setProductos(await fetchAllProductos());
    } catch (err) {
      setError(err.message || "No se pudieron cargar los productos.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActivo(p) {
    try {
      await setProductoActivo(p.id, !p.activo);
      await load();
    } catch (err) {
      alert("No se pudo actualizar: " + (err.message || err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-800">Productos de Merchandising</h1>
        <Link to="nuevo" className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-neutral-800 text-white">
          + Nuevo producto
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!productos && !error && <p className="text-sm text-neutral-500">Cargando…</p>}

      {productos && (
        <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
          {productos.length === 0 && <p className="p-4 text-sm text-neutral-500">Todavía no hay productos.</p>}
          {productos.map((p) => (
            <div key={p.id} className="p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                {p.colores[0]?.imagen_url && (
                  <img src={p.colores[0].imagen_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{p.nombre_es}</p>
                <p className="text-xs text-neutral-400">
                  {p.categoria_slug} · {p.tramos.length} tramo{p.tramos.length !== 1 ? "s" : ""} de precio
                  {!p.activo && <span className="text-red-500 font-medium"> · inactivo</span>}
                </p>
              </div>
              <Link to={p.slug} className="text-sm font-medium text-neutral-700 underline">
                Editar
              </Link>
              <ConfirmToggle
                label={p.activo ? "Desactivar" : "Reactivar"}
                confirmLabel={p.activo ? "Sí, desactivar" : "Sí, reactivar"}
                tone={p.activo ? "danger" : "default"}
                onConfirm={() => toggleActivo(p)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
