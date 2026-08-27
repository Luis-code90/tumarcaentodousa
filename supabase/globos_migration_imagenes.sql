-- =========================================================================
-- TuMarcaEnTodo — Decoración con Globos — Migración: imágenes de paquete
-- paquetes_globos ya existe en producción (corriste globos_schema.sql antes
-- de que esto se agregara), así que esto es un ALTER, no parte del CREATE
-- TABLE original. Correr una sola vez en el SQL Editor de Supabase.
-- =========================================================================

alter table paquetes_globos
  add column if not exists imagen_url text,
  add column if not exists cloudinary_public_id text;

comment on column paquetes_globos.imagen_url is
  'Foto de referencia del paquete, alojada en Cloudinary (mismo criterio que
   productos.imagen_url en Merchandising) — no en Supabase Storage.';
