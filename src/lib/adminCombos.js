import { supabase } from "./supabase";

function mapComboAdmin(row) {
  return {
    id: row.id,
    slug: row.slug,
    nombre_en: row.nombre_en,
    nombre_es: row.nombre_es,
    detalle_en: row.detalle_en,
    detalle_es: row.detalle_es,
    precio: Number(row.precio),
    imagen_url: row.imagen_url,
    cloudinary_public_id: row.cloudinary_public_id,
    activo: row.activo,
    orden: row.orden,
    items: [...row.combo_items]
      .sort((a, b) => a.orden - b.orden)
      .map((ci) => ({ producto_id: ci.producto_id, cantidad: ci.cantidad })),
  };
}

const COMBO_SELECT = `
  id, slug, nombre_en, nombre_es, detalle_en, detalle_es, precio, imagen_url, cloudinary_public_id, activo, orden,
  combo_items ( orden, producto_id, cantidad )
`;

export async function fetchAllCombos() {
  const { data, error } = await supabase.from("combos").select(COMBO_SELECT).order("orden");
  if (error) throw error;
  return data.map(mapComboAdmin);
}

export async function fetchComboBySlug(slug) {
  const { data, error } = await supabase.from("combos").select(COMBO_SELECT).eq("slug", slug).single();
  if (error) throw error;
  return mapComboAdmin(data);
}

// Mismo patrón "borrar todo + reinsertar" para los hijos que en
// adminProducts.js — ver ese comentario para el porqué.
export async function saveCombo({
  id,
  slug,
  nombre_en,
  nombre_es,
  detalle_en,
  detalle_es,
  precio,
  imagen_url,
  cloudinary_public_id,
  activo,
  orden,
  items,
}) {
  const base = {
    slug,
    nombre_en,
    nombre_es,
    detalle_en,
    detalle_es,
    precio,
    imagen_url: imagen_url || null,
    cloudinary_public_id: cloudinary_public_id || null,
    activo,
    orden,
  };

  let comboId = id;
  if (id) {
    const { error } = await supabase.from("combos").update(base).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("combos").insert(base).select("id").single();
    if (error) throw error;
    comboId = data.id;
  }

  const { error: delError } = await supabase.from("combo_items").delete().eq("combo_id", comboId);
  if (delError) throw delError;
  if (items.length) {
    const rows = items.map((it, i) => ({
      combo_id: comboId,
      producto_id: it.producto_id,
      cantidad: it.cantidad,
      orden: i,
    }));
    const { error } = await supabase.from("combo_items").insert(rows);
    if (error) throw error;
  }

  return comboId;
}

export async function setComboActivo(id, activo) {
  const { error } = await supabase.from("combos").update({ activo }).eq("id", id);
  if (error) throw error;
}
