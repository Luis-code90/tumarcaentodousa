-- =========================================================================
-- TuMarcaEnTodo — Row Level Security
-- Ejecutar después de schema.sql
-- =========================================================================

-- Helper: ¿el usuario autenticado actual es admin? Se usa desde varias
-- políticas. security definer + search_path fijo para que pueda leer
-- profiles sin quedar atrapada en su propia RLS (si no, cualquier política
-- que la llame entraría en una evaluación circular sobre profiles).
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =========================================================================
-- Catálogo: lectura pública, escritura solo admin
-- =========================================================================
-- categorias, colores, productos, producto_colores, producto_tallas y
-- tramos_precio son todos "el catálogo": cualquier visitante anónimo del
-- sitio debe poder leerlos (es justamente lo que reemplaza al array
-- PRODUCTS mock), y solo un admin debería poder editarlos.

alter table categorias enable row level security;
alter table colores enable row level security;
alter table productos enable row level security;
alter table producto_colores enable row level security;
alter table producto_tallas enable row level security;
alter table tramos_precio enable row level security;

create policy "categorias: lectura pública"
  on categorias for select
  to anon, authenticated
  using (true);

create policy "categorias: escritura admin"
  on categorias for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "colores: lectura pública"
  on colores for select
  to anon, authenticated
  using (true);

create policy "colores: escritura admin"
  on colores for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- Productos inactivos (activo = false) no son públicos: solo catálogo
-- visible se expone a anon/authenticated; admin ve todo (incluyendo
-- borradores/despublicados) para poder administrarlos.
create policy "productos: lectura pública de activos"
  on productos for select
  to anon, authenticated
  using (activo = true or is_admin());

create policy "productos: escritura admin"
  on productos for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "producto_colores: lectura pública"
  on producto_colores for select
  to anon, authenticated
  using (true);

create policy "producto_colores: escritura admin"
  on producto_colores for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "producto_tallas: lectura pública"
  on producto_tallas for select
  to anon, authenticated
  using (true);

create policy "producto_tallas: escritura admin"
  on producto_tallas for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "tramos_precio: lectura pública"
  on tramos_precio for select
  to anon, authenticated
  using (true);

create policy "tramos_precio: escritura admin"
  on tramos_precio for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- =========================================================================
-- Pedidos: visibles solo por su dueño o por admin
-- =========================================================================
alter table pedidos enable row level security;
alter table pedido_items enable row level security;

-- Lectura: dueño autenticado (user_id = auth.uid()) o admin. Los pedidos de
-- invitado (user_id NULL) no son visibles para nadie por esta vía —ni
-- siquiera para el cliente que los generó, porque sin auth no hay forma de
-- probar que le pertenecen— salvo para admin. Esto es intencional: es la
-- razón por la que "visible por su dueño" requiere login.
create policy "pedidos: lectura dueño o admin"
  on pedidos for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

-- Inserción: tanto invitados (anon) como clientes logueados pueden crear
-- pedidos (el checkout sigue siendo público, vía WhatsApp). El check evita
-- que alguien inserte un pedido adjudicándoselo a otro usuario: si hay
-- sesión, user_id debe ser esa sesión o NULL; si no hay sesión (anon),
-- solo puede quedar NULL.
create policy "pedidos: insert público (checkout de invitado o logueado)"
  on pedidos for insert
  to anon, authenticated
  with check (
    user_id is null or user_id = auth.uid()
  );

-- Actualización de estado/pago: reservada a admin. El cliente no debería
-- poder marcar su propio pedido como "pagado" o "entregado".
create policy "pedidos: update admin"
  on pedidos for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "pedidos: delete admin"
  on pedidos for delete
  to authenticated
  using (is_admin());

-- pedido_items hereda la visibilidad de su pedido padre.
create policy "pedido_items: lectura dueño o admin"
  on pedido_items for select
  to authenticated
  using (
    is_admin()
    or exists (
      select 1 from pedidos
      where pedidos.id = pedido_items.pedido_id
        and pedidos.user_id = auth.uid()
    )
  );

-- Insert de ítems: debe permitir el mismo flujo de checkout de invitado que
-- pedidos (se insertan pedido + items en la misma operación desde el
-- cliente). Se valida contra el pedido padre en vez de against auth.uid()
-- directamente, replicando la misma regla "NULL o mío".
create policy "pedido_items: insert acompaña a su pedido"
  on pedido_items for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from pedidos
      where pedidos.id = pedido_items.pedido_id
        and (pedidos.user_id is null or pedidos.user_id = auth.uid())
    )
  );

create policy "pedido_items: update/delete admin"
  on pedido_items for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "pedido_items: delete admin"
  on pedido_items for delete
  to authenticated
  using (is_admin());

-- =========================================================================
-- Puntos de fidelización: visibles por su dueño o admin; solo admin escribe
-- =========================================================================
-- Los clientes no deberían poder auto-acreditarse puntos, por eso insert/
-- update/delete quedan reservados a admin (o a un backend con service_role
-- key que corra la lógica de negocio) aunque hoy no exista ese flujo.
alter table puntos_transacciones enable row level security;

create policy "puntos: lectura dueño o admin"
  on puntos_transacciones for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "puntos: escritura admin"
  on puntos_transacciones for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- =========================================================================
-- Perfiles
-- =========================================================================
alter table profiles enable row level security;

create policy "profiles: lectura propia o admin"
  on profiles for select
  to authenticated
  using (id = auth.uid() or is_admin());

create policy "profiles: update propio o admin"
  on profiles for update
  to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- La policy de arriba autoriza el UPDATE de la fila (propia, o cualquiera
-- si is_admin()), pero eso solo cubre "qué fila", no "qué columna". La
-- RLS de Postgres es por fila, no por columna, así que sin este GRANT
-- explícito cualquier usuario logueado podría auto-ascenderse a admin
-- escribiendo su propio profiles.role = 'admin'. Al revocar UPDATE general
-- y conceder solo columnas no sensibles, ni siquiera un admin puede tocar
-- profiles.role usando la anon/authenticated key — cambios de rol quedan
-- reservados al dashboard de Supabase o a un backend con la service_role
-- key, que ignora tanto RLS como estos grants.
revoke update on profiles from authenticated;
grant update (nombre, telefono) on profiles to authenticated;
