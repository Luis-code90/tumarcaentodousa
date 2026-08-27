import { supabase } from "./supabase";

// ---- Paleta de colores y categorías (listas de referencia para el form) ----

export async function fetchColores() {
  const { data, error } = await supabase.from("colores").select("*").order("id");
  if (error) throw error;
  return data;
}

export async function createColor({ id, hex, nombre_en, nombre_es }) {
  const { error } = await supabase.from("colores").insert({ id, hex, nombre_en, nombre_es });
  if (error) throw error;
}

export async function fetchCategorias() {
  const { data, error } = await supabase.from("categorias").select("*").order("orden");
  if (error) throw error;
  return data;
}

// ---- Productos ----

// A diferencia de products.js (público, solo activo = true, shape ya lista
// para el carrito), acá se traen TODOS los productos —RLS ya permite verlos
// a un admin— con los datos "crudos" tal como viven en la base, porque el
// formulario necesita editar exactamente esos valores (no una versión ya
// transformada para el carrito).
function mapProductoAdmin(row) {
  return {
    id: row.id,
    slug: row.slug,
    categoria_slug: row.categoria_slug,
    nombre_en: row.nombre_en,
    nombre_es: row.nombre_es,
    detalle_en: row.detalle_en,
    detalle_es: row.detalle_es,
    activo: row.activo,
    orden: row.orden,
    colores: [...row.producto_colores]
      .sort((a, b) => a.orden - b.orden)
      .map((c) => ({
        color_id: c.color_id,
        imagen_url: c.imagen_url,
        cloudinary_public_id: c.cloudinary_public_id,
      })),
    tallas: [...row.producto_tallas].sort((a, b) => a.orden - b.orden).map((t) => t.talla),
    tramos: [...row.tramos_precio]
      .sort((a, b) => a.cantidad_min - b.cantidad_min)
      .map((t) => ({ cantidad_min: t.cantidad_min, cantidad_max: t.cantidad_max, precio: Number(t.precio) })),
  };
}

const PRODUCTO_SELECT = `
  id, slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, activo, orden,
  producto_colores ( orden, color_id, imagen_url, cloudinary_public_id ),
  producto_tallas ( orden, talla ),
  tramos_precio ( cantidad_min, cantidad_max, precio )
`;

export async function fetchAllProductos() {
  const { data, error } = await supabase
    .from("productos")
    .select(PRODUCTO_SELECT)
    .order("categoria_slug")
    .order("orden");
  if (error) throw error;
  return data.map(mapProductoAdmin);
}

export async function fetchProductoBySlug(slug) {
  const { data, error } = await supabase.from("productos").select(PRODUCTO_SELECT).eq("slug", slug).single();
  if (error) throw error;
  return mapProductoAdmin(data);
}

// Crea o actualiza un producto y reemplaza por completo sus colores/tallas/
// tramos (borrar todo + reinsertar) en vez de calcular un diff fila por
// fila. Son a lo sumo un puñado de filas por producto, así que el costo es
// insignificante y el código queda mucho más simple de seguir para un
// formulario que puede fallar a mitad de camino — no hay estados
// intermedios raros que reconciliar.
export async function saveProducto({ id, slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, activo, orden, colores, tallas, tramos }) {
  const base = { slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, activo, orden };

  let productoId = id;
  if (id) {
    const { error } = await supabase.from("productos").update(base).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("productos").insert(base).select("id").single();
    if (error) throw error;
    productoId = data.id;
  }

  const { error: delColoresError } = await supabase.from("producto_colores").delete().eq("producto_id", productoId);
  if (delColoresError) throw delColoresError;
  if (colores.length) {
    const rows = colores.map((c, i) => ({
      producto_id: productoId,
      color_id: c.color_id,
      orden: i,
      imagen_url: c.imagen_url || null,
      cloudinary_public_id: c.cloudinary_public_id || null,
    }));
    const { error } = await supabase.from("producto_colores").insert(rows);
    if (error) throw error;
  }

  const { error: delTallasError } = await supabase.from("producto_tallas").delete().eq("producto_id", productoId);
  if (delTallasError) throw delTallasError;
  if (tallas.length) {
    const rows = tallas.map((talla, i) => ({ producto_id: productoId, talla, orden: i }));
    const { error } = await supabase.from("producto_tallas").insert(rows);
    if (error) throw error;
  }

  const { error: delTramosError } = await supabase.from("tramos_precio").delete().eq("producto_id", productoId);
  if (delTramosError) throw delTramosError;
  if (tramos.length) {
    const rows = tramos.map((t) => ({
      producto_id: productoId,
      cantidad_min: t.cantidad_min,
      cantidad_max: t.cantidad_max || null,
      precio: t.precio,
    }));
    const { error } = await supabase.from("tramos_precio").insert(rows);
    if (error) throw error;
  }

  return productoId;
}

export async function setProductoActivo(id, activo) {
  const { error } = await supabase.from("productos").update({ activo }).eq("id", id);
  if (error) throw error;
}
