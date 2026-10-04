import { supabase } from "./supabase";
import { mapProducto, PRODUCTO_FIELDS } from "./products";

// Un combo = N unidades de varios productos del catálogo a un precio cerrado
// (ej. 5 camisetas + 1 hoodie = $100). Cada pieza se elige con el color y la
// talla del producto original, así que acá se trae el producto completo
// (ya mapeado a la misma forma que usa el catálogo).
//
// Shape: { id, slug, nombre_en, nombre_es, detalle_en, detalle_es, precio,
//          imagen_url, items: [{ producto, cantidad }] }
function mapCombo(row) {
  const items = [...row.combo_items]
    .sort((a, b) => a.orden - b.orden)
    .map((ci) => (ci.productos ? { producto: mapProducto(ci.productos), cantidad: ci.cantidad } : null));

  // Si algún producto del combo está desactivado (RLS lo oculta) o no tiene
  // colores/tallas cargados, el combo no se puede armar: no se ofrece.
  if (items.length === 0 || items.some((it) => !it || it.producto.colores.length === 0 || it.producto.tallas.length === 0)) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    nombre_en: row.nombre_en,
    nombre_es: row.nombre_es,
    detalle_en: row.detalle_en,
    detalle_es: row.detalle_es,
    precio: Number(row.precio),
    imagen_url: row.imagen_url,
    items,
  };
}

export async function fetchCombos() {
  const { data, error } = await supabase
    .from("combos")
    .select(
      `
      id, slug, nombre_en, nombre_es, detalle_en, detalle_es, precio, imagen_url,
      combo_items ( orden, cantidad, productos ( ${PRODUCTO_FIELDS} ) )
    `
    )
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) throw error;

  return data.map(mapCombo).filter(Boolean);
}
