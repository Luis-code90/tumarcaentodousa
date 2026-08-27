import { supabase } from "./supabase";

// Maps a paquetes_globos row (with its nested items/precios/imágenes) into
// a shape the Globos page can render directly: bilingual "incluye" bullets,
// price options and an ordered gallery of photo URLs.
function mapPaquete(row) {
  const incluye = [...row.paquete_items]
    .sort((a, b) => a.orden - b.orden)
    .map((i) => ({ en: i.texto_en, es: i.texto_es }));

  const precios = [...row.paquete_precios]
    .sort((a, b) => a.orden - b.orden)
    .map((p) => ({
      etiqueta_en: p.etiqueta_en,
      etiqueta_es: p.etiqueta_es,
      precio: Number(p.precio),
    }));

  const imagenes = [...row.paquete_imagenes].sort((a, b) => a.orden - b.orden).map((img) => img.imagen_url);

  return {
    id: row.id,
    slug: row.slug,
    nombre_en: row.nombre_en,
    nombre_es: row.nombre_es,
    imagenes,
    incluye,
    precios,
  };
}

export async function fetchPaquetes() {
  const { data, error } = await supabase
    .from("paquetes_globos")
    .select(
      `
      id,
      slug,
      nombre_en,
      nombre_es,
      paquete_items ( orden, texto_en, texto_es ),
      paquete_imagenes ( orden, imagen_url ),
      paquete_precios ( orden, etiqueta_en, etiqueta_es, precio )
    `
    )
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) throw error;

  return data.map(mapPaquete);
}
