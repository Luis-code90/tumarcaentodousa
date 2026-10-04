-- =========================================================================
-- TuMarcaEnTodo — Endurecimiento de los inserts públicos (anon)
-- Ejecutar UNA VEZ en el SQL Editor de Supabase, después de rls.sql y
-- globos_rls.sql. Es idempotente (se puede volver a correr).
--
-- Problema: con la anon key (pública en el bundle) cualquiera podía
--   * insertar pedidos ya marcados como 'pagado'/'entregado',
--   * mandar precios/totales inventados,
--   * meter textos de cualquier largo,
--   * llenar el panel de basura sin límite.
-- Nada de esto toca el flujo real (WhatsApp), pero ensucia el panel admin.
-- =========================================================================

-- ---- 1. Límites de longitud / formato --------------------------------
-- NOT VALID: se aplican a filas nuevas sin revisar las existentes (por si
-- ya hay datos de prueba). Para validar las viejas: ALTER TABLE ... VALIDATE
-- CONSTRAINT <nombre>;
alter table pedidos drop constraint if exists pedidos_limites;
alter table pedidos add constraint pedidos_limites check (
  char_length(cliente_nombre) between 1 and 100
  and char_length(cliente_telefono) between 5 and 30
  and (cliente_email is null or char_length(cliente_email) <= 150)
  and (notas is null or char_length(notas) <= 1000)
) not valid;

alter table pedido_items drop constraint if exists pedido_items_limites;
alter table pedido_items add constraint pedido_items_limites check (
  cantidad <= 999
  and char_length(producto_slug) <= 100
  and char_length(producto_nombre_en) <= 200
  and char_length(producto_nombre_es) <= 200
  and (color_id is null or char_length(color_id) <= 50)
  and (color_nombre is null or char_length(color_nombre) <= 100)
  and (talla is null or char_length(talla) <= 20)
) not valid;

alter table solicitudes_cotizacion drop constraint if exists solicitudes_limites;
alter table solicitudes_cotizacion add constraint solicitudes_limites check (
  char_length(nombre) between 1 and 100
  and char_length(telefono) between 5 and 30
  and (notas is null or char_length(notas) <= 2000)
) not valid;

-- ---- 2. Un invitado no puede fijar estado/pago/ids de Stripe ----------
drop policy if exists "pedidos: insert público (checkout de invitado o logueado)" on pedidos;
create policy "pedidos: insert público (checkout de invitado o logueado)"
  on pedidos for insert
  to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and estado = 'pendiente'
    and estado_pago = 'pendiente'
    and metodo_pago is null
    and stripe_payment_intent_id is null
  );

drop policy if exists "solicitudes_cotizacion: insert público" on solicitudes_cotizacion;
create policy "solicitudes_cotizacion: insert público"
  on solicitudes_cotizacion for insert
  to anon, authenticated
  with check (estado = 'pendiente');

-- ---- 3. El precio lo decide el servidor, no el navegador ---------------
-- Antes de insertar un ítem, se reemplaza precio_unitario por el del tramo
-- vigente en tramos_precio (misma regla que priceFor() del front: tramo que
-- contiene la cantidad, o el último si se pasa del máximo). Después de cada
-- ítem se recalcula subtotal/total del pedido. Así un cliente no puede
-- "comprar" a $1 manipulando la request.
create or replace function pedido_items_fijar_precio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_precio numeric(10, 2);
begin
  if new.producto_id is null then
    raise exception 'pedido_items.producto_id es obligatorio';
  end if;

  select precio into v_precio
  from tramos_precio
  where producto_id = new.producto_id
    and new.cantidad >= cantidad_min
    and (cantidad_max is null or new.cantidad <= cantidad_max)
  limit 1;

  if v_precio is null then
    select precio into v_precio
    from tramos_precio
    where producto_id = new.producto_id
    order by cantidad_min desc
    limit 1;
  end if;

  if v_precio is null then
    raise exception 'El producto % no tiene precios cargados', new.producto_id;
  end if;

  new.precio_unitario := v_precio;
  return new;
end;
$$;

drop trigger if exists pedido_items_fijar_precio_trg on pedido_items;
create trigger pedido_items_fijar_precio_trg
  before insert on pedido_items
  for each row execute function pedido_items_fijar_precio();

create or replace function pedido_items_recalcular_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update pedidos
  set subtotal = coalesce((select sum(subtotal) from pedido_items where pedido_id = new.pedido_id), 0),
      total = coalesce((select sum(subtotal) from pedido_items where pedido_id = new.pedido_id), 0)
  where id = new.pedido_id;
  return null;
end;
$$;

drop trigger if exists pedido_items_recalcular_total_trg on pedido_items;
create trigger pedido_items_recalcular_total_trg
  after insert on pedido_items
  for each row execute function pedido_items_recalcular_total();

-- ---- 4. Tope global anti-spam -----------------------------------------
-- No hay identidad en un invitado, así que el freno es global: si entran
-- más de N filas en 10 minutos, se rechazan las siguientes. Un ataque no
-- puede llenar la base, y el cliente legítimo igual llega a WhatsApp (el
-- front ignora los errores de guardado). Ajustá el número a gusto.
create or replace function limitar_inserts_publicos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max constant int := 40;
  v_recientes int;
begin
  -- Los admin no tienen tope.
  if auth.uid() is not null and is_admin() then
    return new;
  end if;

  execute format(
    'select count(*) from %I.%I where created_at > now() - interval ''10 minutes''',
    tg_table_schema, tg_table_name
  ) into v_recientes;

  if v_recientes >= v_max then
    raise exception 'Demasiadas solicitudes, probá de nuevo en unos minutos';
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_limitar_trg on pedidos;
create trigger pedidos_limitar_trg
  before insert on pedidos
  for each row execute function limitar_inserts_publicos();

drop trigger if exists solicitudes_limitar_trg on solicitudes_cotizacion;
create trigger solicitudes_limitar_trg
  before insert on solicitudes_cotizacion
  for each row execute function limitar_inserts_publicos();
