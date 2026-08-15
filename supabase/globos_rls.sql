-- =========================================================================
-- TuMarcaEnTodo — Decoración con Globos — Row Level Security
-- Ejecutar después de globos_schema.sql. Reutiliza is_admin(), definida en
-- rls.sql (mismo proyecto Supabase que Merchandising).
-- =========================================================================

-- Catálogo de paquetes: lectura pública, escritura solo admin — mismo
-- criterio que productos/colores/tramos_precio en Merchandising.
alter table paquetes_globos enable row level security;
alter table paquete_items enable row level security;
alter table paquete_precios enable row level security;

create policy "paquetes_globos: lectura pública de activos"
  on paquetes_globos for select
  to anon, authenticated
  using (activo = true or is_admin());

create policy "paquetes_globos: escritura admin"
  on paquetes_globos for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "paquete_items: lectura pública"
  on paquete_items for select
  to anon, authenticated
  using (true);

create policy "paquete_items: escritura admin"
  on paquete_items for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "paquete_precios: lectura pública"
  on paquete_precios for select
  to anon, authenticated
  using (true);

create policy "paquete_precios: escritura admin"
  on paquete_precios for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- =========================================================================
-- Solicitudes de cotización: insert público, lectura solo admin
-- =========================================================================
-- Mismo criterio pedido para pedidos ("insert público, select solo
-- admin"), pero más simple: acá no existe columna user_id ni concepto de
-- "dueño" (no hay login de clientes en el formulario de cotización), así
-- que no hace falta la lógica de "NULL o mío" — el insert es
-- incondicionalmente público.
alter table solicitudes_cotizacion enable row level security;

create policy "solicitudes_cotizacion: insert público"
  on solicitudes_cotizacion for insert
  to anon, authenticated
  with check (true);

create policy "solicitudes_cotizacion: lectura admin"
  on solicitudes_cotizacion for select
  to authenticated
  using (is_admin());

create policy "solicitudes_cotizacion: update admin"
  on solicitudes_cotizacion for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "solicitudes_cotizacion: delete admin"
  on solicitudes_cotizacion for delete
  to authenticated
  using (is_admin());
