import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllPaquetes, setPaqueteActivo } from "../lib/adminPackages";
import ConfirmToggle from "./ConfirmToggle";

export default function GlobosList() {
  const [paquetes, setPaquetes] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setPaquetes(await fetchAllPaquetes());
    } catch (err) {
      setError(err.message || "No se pudieron cargar los paquetes.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActivo(p) {
    try {
      await setPaqueteActivo(p.id, !p.activo);
      await load();
    } catch (err) {
      alert("No se pudo actualizar: " + (err.message || err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-800">Paquetes de Globos</h1>
        <Link to="nuevo" className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-neutral-800 text-white">
          + Nuevo paquete
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!paquetes && !error && <p className="text-sm text-neutral-500">Cargando…</p>}

      {paquetes && (
        <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
          {paquetes.length === 0 && <p className="p-4 text-sm text-neutral-500">Todavía no hay paquetes.</p>}
          {paquetes.map((p) => (
            <div key={p.id} className="p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                {p.imagenes[0] && <img src={p.imagenes[0].imagen_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{p.nombre_es}</p>
                <p className="text-xs text-neutral-400">
                  {p.precios.length} opción{p.precios.length !== 1 ? "es" : ""} de precio
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
