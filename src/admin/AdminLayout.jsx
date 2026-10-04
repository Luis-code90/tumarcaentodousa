import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useNoIndex } from "../lib/useNoIndex";

const linkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium ${isActive ? "bg-neutral-800 text-white" : "text-neutral-600 hover:bg-neutral-200"}`;

export default function AdminLayout() {
  const { session, signOut } = useAuth();
  useNoIndex();

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-white border-b border-neutral-200 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-800 mr-2">Admin · TuMarcaEnTodo</span>
          <NavLink to="/admin/merch" className={linkClass}>
            Merchandising
          </NavLink>
          <NavLink to="/admin/globos" className={linkClass}>
            Globos
          </NavLink>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 hidden sm:inline">{session?.user?.email}</span>
          <button onClick={signOut} className="text-sm text-neutral-500 underline">
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="p-5 max-w-4xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
