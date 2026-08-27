import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

// This is a UX gate, not the real security boundary — it just avoids
// showing admin screens (and the flash of a "loading" state) to the wrong
// people. The actual enforcement is Supabase RLS: every write an admin
// screen makes only succeeds because is_admin() checks profiles.role
// server-side, regardless of what this component does or doesn't render.
export default function RequireAdmin({ children }) {
  const { session, isAdmin, loading, signOut } = useAuth();

  if (loading) {
    return <p className="p-6 text-sm text-neutral-500">Cargando…</p>;
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-sm mx-auto text-center flex flex-col gap-3">
        <p className="text-sm text-neutral-700">
          Tu cuenta no tiene permisos de administrador. Si esto no es lo esperado, pedile a un admin que revise tu
          rol en la tabla <code>profiles</code>.
        </p>
        <button onClick={signOut} className="text-sm underline text-neutral-500">
          Cerrar sesión
        </button>
      </div>
    );
  }

  return children;
}
