import { supabase } from "./supabase";

// Persists the cart as a pedido + pedido_items right before opening the
// WhatsApp confirmation link (checkout stays manual — this just gives the
// business a durable record of what was ordered, matching requirement #3).
//
// The pedido id is generated client-side and passed explicitly instead of
// letting Postgres default it, so we never need to read the row back with
// .select() after inserting. That matters for RLS: INSERT ... RETURNING is
// checked against SELECT policies too, and pedidos' SELECT policy only
// grants access to `authenticated` (owner) or admin — on purpose, so that
// no anonymous request can list every guest order ever placed. Guest
// checkouts (the only kind that exist today, since there's no customer
// login yet) can INSERT under that policy but can't SELECT afterwards,
// so we sidestep the read entirely.
export async function createOrder({ items, clienteNombre, clienteTelefono, clienteEmail, idioma }) {
  if (!items.length) throw new Error("Cannot create an order with an empty cart");

  const pedidoId = crypto.randomUUID();
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  const { error: pedidoError } = await supabase.from("pedidos").insert({
    id: pedidoId,
    cliente_nombre: clienteNombre,
    cliente_telefono: clienteTelefono,
    cliente_email: clienteEmail || null,
    idioma,
    // Sin envío/descuentos modelados todavía: subtotal === total por ahora,
    // pero quedan como columnas separadas para el día que se sumen.
    subtotal,
    total: subtotal,
  });
  if (pedidoError) throw pedidoError;

  const itemRows = items.map((it) => ({
    pedido_id: pedidoId,
    producto_id: it.product.dbId ?? null,
    producto_slug: it.product.id,
    producto_nombre_en: it.product.nombre_en,
    producto_nombre_es: it.product.nombre_es,
    color_id: it.color,
    color_nombre: it.colorLabel,
    talla: it.talla,
    cantidad: it.qty,
    precio_unitario: it.price,
  }));

  const { error: itemsError } = await supabase.from("pedido_items").insert(itemRows);
  if (itemsError) throw itemsError;

  return pedidoId;
}
