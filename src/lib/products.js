import { supabase } from "./supabase";

// Maps a productos row (with its nested color/talla/tramo relations) into
// the exact shape ProductCard/CartDrawer already consume, so the component
// itself doesn't need to change: { id, categoria, nombre_en, nombre_es,
// detalle_en, detalle_es, colores: string[], tallas: string[],
// tramos: [{ min, max, precio }] }.
function mapProducto(row) {
  const sortedColores = [...row.producto_colores].sort((a, b) => a.orden - b.orden);
  const colores = sortedColores.map((pc) => pc.color_id);

  // Foto por variante de color (ej. remera roja vs. azul), con fallback al
  // imagen_url general del producto cuando ese color todavía no tiene foto
  // propia cargada desde el panel de admin.
  const imagenesPorColor = {};
  for (const pc of sortedColores) {
    if (pc.imagen_url) imagenesPorColor[pc.color_id] = pc.imagen_url;
  }

  const tallas = [...row.producto_tallas]
    .sort((a, b) => a.orden - b.orden)
    .map((pt) => pt.talla);

  const tramos = [...row.tramos_precio]
    .sort((a, b) => a.cantidad_min - b.cantidad_min)
    .map((t) => ({
      min: t.cantidad_min,
      // cantidad_max NULL = tramo abierto ("100 en adelante"). priceFor()
      // en CatalogoMerch.jsx compara qty <= tramo.max, así que Infinity es
      // el equivalente numérico de "sin tope" para esa comparación.
      max: t.cantidad_max ?? Infinity,
      precio: Number(t.precio),
    }));

  return {
    id: row.slug,
    // uuid interno, no consumido por ProductCard/CartDrawer — se lleva
    // colgando solo para que orders.js pueda referenciar productos.id como
    // FK real en pedido_items sin tener que volver a consultarlo.
    dbId: row.id,
    categoria: row.categoria_slug,
    nombre_en: row.nombre_en,
    nombre_es: row.nombre_es,
    detalle_en: row.detalle_en,
    detalle_es: row.detalle_es,
    imagen_url: row.imagen_url,
    imagenesPorColor,
    colores,
    tallas,
    tramos,
  };
}

// Fetches the public catalog (only activo = true products, enforced again
// by RLS regardless of this filter) in one round trip using PostgREST's
// embedded resource syntax instead of N+1 queries per product.
export async function fetchProducts() {
  const { data, error } = await supabase
    .from("productos")
    .select(
      `
      id,
      slug,
      categoria_slug,
      nombre_en,
      nombre_es,
      detalle_en,
      detalle_es,
      imagen_url,
      producto_colores ( orden, color_id, imagen_url ),
      producto_tallas ( orden, talla ),
      tramos_precio ( cantidad_min, cantidad_max, precio )
    `
    )
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) throw error;

  return data.map(mapProducto);
}
