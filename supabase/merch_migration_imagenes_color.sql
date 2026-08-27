-- =========================================================================
-- TuMarcaEnTodo — Merchandising — Migración: imagen por variante de color
-- productos ya existe en producción, así que esto es un ALTER, no parte del
-- CREATE TABLE original. Correr una sola vez en el SQL Editor de Supabase.
--
-- Antes había una sola imagen por producto (productos.imagen_url). Ahora
-- cada combinación producto+color puede tener su propia foto (remera roja
-- vs. remera azul), que es lo que pidió el panel de admin. productos.
-- imagen_url se mantiene como fallback para cuando un color todavía no
-- tiene foto propia cargada.
-- =========================================================================

alter table producto_colores
  add column if not exists imagen_url text,
  add column if not exists cloudinary_public_id text;

comment on column producto_colores.imagen_url is
  'Foto de esa variante de color específica, alojada en Cloudinary. Si es
   NULL, el catálogo público cae de vuelta a productos.imagen_url.';
