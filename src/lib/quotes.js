import { supabase } from "./supabase";

// Persists a quote request from the /globos form. Unlike orders.js, this
// never needs .select() after inserting — solicitudes_cotizacion has no
// child rows to attach afterward — so there's no RLS RETURNING gotcha to
// work around here: a plain admin-only SELECT policy is enough.
export async function createQuoteRequest({ nombre, telefono, fechaEvento, paqueteInteres, notas }) {
  const { error } = await supabase.from("solicitudes_cotizacion").insert({
    nombre,
    telefono,
    fecha_evento: fechaEvento || null,
    paquete_interes: paqueteInteres || null,
    notas: notas || null,
  });
  if (error) throw error;
}
