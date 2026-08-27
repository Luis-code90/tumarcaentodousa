-- =========================================================================
-- TuMarcaEnTodo — Decoración con Globos — Migración: galería de fotos
-- Reemplaza la única imagen_url de paquetes_globos por N fotos ordenadas
-- (las columnas de Merge no son idénticas entre sí, ej. dos columnas
-- armadas con globos nunca quedan iguales) — mismo criterio que
-- paquete_items/paquete_precios: tabla propia, no un array/JSON, para que
-- el panel admin pueda administrar cada foto como una fila.
-- Correr una sola vez en el SQL Editor de Supabase.
-- =========================================================================

create table if not exists paquete_imagenes (
  id uuid primary key default gen_random_uuid(),
  paquete_id uuid not null references paquetes_globos (id) on delete cascade,
  imagen_url text not null,
  cloudinary_public_id text,
  orden int not null default 0
);

create index if not exists idx_paquete_imagenes_paquete on paquete_imagenes (paquete_id);

comment on table paquete_imagenes is
  'Galería de fotos de referencia por paquete (varias por paquete: ningún
   trabajo con globos sale idéntico al anterior). orden = 0 es la portada
   que se usa como miniatura en el panel admin.';

-- Migra cualquier imagen_url que ya hayas cargado antes de este cambio,
-- para no perderla — queda como la primera foto (orden 0) de su paquete.
insert into paquete_imagenes (paquete_id, imagen_url, cloudinary_public_id, orden)
select id, imagen_url, cloudinary_public_id, 0
from paquetes_globos
where imagen_url is not null;

-- La columna única ya no se usa — todo pasa a leerse de paquete_imagenes.
alter table paquetes_globos
  drop column if exists imagen_url,
  drop column if exists cloudinary_public_id;

-- RLS: mismo criterio que paquete_items/paquete_precios (lectura pública,
-- escritura admin). is_admin() ya existe (definida en rls.sql).
alter table paquete_imagenes enable row level security;

create policy "paquete_imagenes: lectura pública"
  on paquete_imagenes for select
  to anon, authenticated
  using (true);

create policy "paquete_imagenes: escritura admin"
  on paquete_imagenes for all
  to authenticated
  using (is_admin())
  with check (is_admin());
