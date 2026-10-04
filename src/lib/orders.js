import { supabase } from "./supabase";

// Persists the cart as a pedido + pedido_items (+ pedido_combos and their
// pedido_combo_piezas) right before opening the WhatsApp confirmation link
// (checkout stays manual — this just gives the business a durable record of
// what was ordered).
//
// Cart lines are either plain products ({ product, color, talla, qty, price })
// or combos ({ kind: "combo", combo, qty, price, piezas: [{ unidad, producto,
// color, colorLabel, talla }] }).
//
// All ids are generated client-side and passed explicitly instead of letting
// Postgres default them, so we never need to read a row back with .select()
// after inserting. That matters for RLS: INSERT ... RETURNING is checked
// against SELECT policies too, and pedidos' SELECT policy only grants access
// to `authenticated` (owner) or admin — on purpose, so that no anonymous
// request can list every guest order ever placed. Guest checkouts can INSERT
// under that policy but can't SELECT afterwards, so we sidestep the read.
export async function createOrder({ items, clienteNombre, clienteTelefono, clienteEmail, idioma }) {
  if (!items.length) throw new Error("Cannot create an order with an empty cart");

  const productLines = items.filter((it) => it.kind !== "combo");
  const comboLines = items.filter((it) => it.kind === "combo");

  const pedidoId = crypto.randomUUID();
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  const { error: pedidoError } = await supabase.from("pedidos").insert({
    id: pedidoId,
    cliente_nombre: clienteNombre,
    cliente_telefono: clienteTelefono,
    cliente_email: clienteEmail || null,
    idioma,
    // Sin envío/descuentos modelados todavía: subtotal === total por ahora,
    // pero quedan como columnas separadas para el día que se sumen. El
    // servidor recalcula ambos al insertar los ítems.
    subtotal,
    total: subtotal,
  });
  if (pedidoError) throw pedidoError;

  if (productLines.length) {
    const itemRows = productLines.map((it) => ({
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
  }

  if (comboLines.length) {
    const comboRows = [];
    const piezaRows = [];

    for (const line of comboLines) {
      const pedidoComboId = crypto.randomUUID();
      comboRows.push({
        id: pedidoComboId,
        pedido_id: pedidoId,
        combo_id: line.combo.id,
        combo_slug: line.combo.slug,
        combo_nombre_en: line.combo.nombre_en,
        combo_nombre_es: line.combo.nombre_es,
        cantidad: line.qty,
        precio_unitario: line.price,
      });

      for (const p of line.piezas) {
        piezaRows.push({
          pedido_combo_id: pedidoComboId,
          producto_id: p.producto.dbId ?? null,
          producto_slug: p.producto.id,
          producto_nombre_en: p.producto.nombre_en,
          producto_nombre_es: p.producto.nombre_es,
          color_id: p.color,
          color_nombre: p.colorLabel,
          talla: p.talla,
          unidad: p.unidad,
        });
      }
    }

    const { error: combosError } = await supabase.from("pedido_combos").insert(comboRows);
    if (combosError) throw combosError;

    const { error: piezasError } = await supabase.from("pedido_combo_piezas").insert(piezaRows);
    if (piezasError) throw piezasError;
  }

  return pedidoId;
}
