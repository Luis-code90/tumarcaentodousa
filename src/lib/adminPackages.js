import { supabase } from "./supabase";

function mapPaqueteAdmin(row) {
  return {
    id: row.id,
    slug: row.slug,
    nombre_en: row.nombre_en,
    nombre_es: row.nombre_es,
    activo: row.activo,
    orden: row.orden,
    imagenes: [...row.paquete_imagenes]
      .sort((a, b) => a.orden - b.orden)
      .map((img) => ({ imagen_url: img.imagen_url, cloudinary_public_id: img.cloudinary_public_id })),
    incluye: [...row.paquete_items]
      .sort((a, b) => a.orden - b.orden)
      .map((i) => ({ texto_en: i.texto_en, texto_es: i.texto_es })),
    precios: [...row.paquete_precios]
      .sort((a, b) => a.orden - b.orden)
      .map((p) => ({ etiqueta_en: p.etiqueta_en, etiqueta_es: p.etiqueta_es, precio: Number(p.precio) })),
  };
}

const PAQUETE_SELECT = `
  id, slug, nombre_en, nombre_es, activo, orden,
  paquete_items ( orden, texto_en, texto_es ),
  paquete_imagenes ( orden, imagen_url, cloudinary_public_id ),
  paquete_precios ( orden, etiqueta_en, etiqueta_es, precio )
`;

export async function fetchAllPaquetes() {
  const { data, error } = await supabase.from("paquetes_globos").select(PAQUETE_SELECT).order("orden");
  if (error) throw error;
  return data.map(mapPaqueteAdmin);
}

export async function fetchPaqueteBySlug(slug) {
  const { data, error } = await supabase.from("paquetes_globos").select(PAQUETE_SELECT).eq("slug", slug).single();
  if (error) throw error;
  return mapPaqueteAdmin(data);
}

// Mismo patrón "borrar todo + reinsertar" para los hijos que en
// adminProducts.js — ver ese comentario para el porqué.
export async function savePaquete({ id, slug, nombre_en, nombre_es, activo, orden, imagenes, incluye, precios }) {
  const base = { slug, nombre_en, nombre_es, activo, orden };

  let paqueteId = id;
  if (id) {
    const { error } = await supabase.from("paquetes_globos").update(base).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("paquetes_globos").insert(base).select("id").single();
    if (error) throw error;
    paqueteId = data.id;
  }

  const { error: delItemsError } = await supabase.from("paquete_items").delete().eq("paquete_id", paqueteId);
  if (delItemsError) throw delItemsError;
  if (incluye.length) {
    const rows = incluye.map((item, i) => ({ paquete_id: paqueteId, texto_en: item.texto_en, texto_es: item.texto_es, orden: i }));
    const { error } = await supabase.from("paquete_items").insert(rows);
    if (error) throw error;
  }

  const { error: delImagenesError } = await supabase.from("paquete_imagenes").delete().eq("paquete_id", paqueteId);
  if (delImagenesError) throw delImagenesError;
  if (imagenes.length) {
    const rows = imagenes.map((img, i) => ({
      paquete_id: paqueteId,
      imagen_url: img.imagen_url,
      cloudinary_public_id: img.cloudinary_public_id || null,
      orden: i,
    }));
    const { error } = await supabase.from("paquete_imagenes").insert(rows);
    if (error) throw error;
  }

  const { error: delPreciosError } = await supabase.from("paquete_precios").delete().eq("paquete_id", paqueteId);
  if (delPreciosError) throw delPreciosError;
  if (precios.length) {
    const rows = precios.map((p, i) => ({
      paquete_id: paqueteId,
      etiqueta_en: p.etiqueta_en,
      etiqueta_es: p.etiqueta_es,
      precio: p.precio,
      orden: i,
    }));
    const { error } = await supabase.from("paquete_precios").insert(rows);
    if (error) throw error;
  }

  return paqueteId;
}

export async function setPaqueteActivo(id, activo) {
  const { error } = await supabase.from("paquetes_globos").update({ activo }).eq("id", id);
  if (error) throw error;
}
