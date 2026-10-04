import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useNoIndex } from "../lib/useNoIndex";

// No hay formulario de registro acá a propósito: las cuentas de admin se
// crean desde el Dashboard de Supabase (Authentication → Add user) y se
// promueven a mano en la tabla profiles — ver README del proyecto. Un
// signup público solo agregaría superficie de ataque sin ningún beneficio
// para un panel de dos personas.
export default function AdminLogin() {
  const { session, loading, signIn } = useAuth();
  useNoIndex();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) {
      setError("Email o contraseña incorrectos.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl border border-neutral-200 p-6 flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-neutral-800">Panel de administración</h1>
        <p className="text-sm text-neutral-500 -mt-2">TuMarcaEnTodo</p>

        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-3 py-2 rounded-lg text-sm border border-neutral-300"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full px-3 py-2 rounded-lg text-sm border border-neutral-300"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
