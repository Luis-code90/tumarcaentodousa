-- =========================================================================
-- TuMarcaEnTodo — Combos (pestaña "Ofertas")
-- Correr UNA VEZ en el SQL Editor de Supabase, después de rls.sql,
-- globos_rls.sql y hardening_inserts_publicos.sql. Es idempotente.
--
-- Un combo es un conjunto de productos del catálogo a un precio cerrado,
-- ej. "5 camisetas Gildan + 1 hoodie = $100". El cliente elige color y talla
-- de CADA pieza (si compra 2 combos, elige 10 camisetas + 2 hoodies).
-- =========================================================================

-- Reemplaza el enfoque anterior (categoría "Ofertas" con productos sueltos),
-- por si llegó a correrse. Solo borra la categoría si no tiene productos.
delete from categorias
where slug = 'Ofertas'
  and not exists (select 1 from productos where categoria_slug = 'Ofertas');

-- ---- 1. Catálogo de combos ---------------------------------------------
create table if not exists combos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre_en text not null,
  nombre_es text not null,
  detalle_en text not null default '',
  detalle_es text not null default '',
  precio numeric(10, 2) not null check (precio >= 0),
  imagen_url text,
  cloudinary_public_id text,
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_combos_updated_at on combos;
create trigger set_combos_updated_at
  before update on combos
  for each row execute function set_updated_at();

-- Qué productos (y cuántas unidades de cada uno) trae el combo. El color y
-- la talla disponibles salen del propio producto (producto_colores /
-- producto_tallas), no se duplican acá.
create table if not exists combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references combos (id) on delete cascade,
  producto_id uuid not null references productos (id) on delete restrict,
  cantidad int not null check (cantidad between 1 and 50),
  orden int not null default 0
);

create index if not exists idx_combo_items_combo on combo_items (combo_id);

alter table combos enable row level security;
alter table combo_items enable row level security;

drop policy if exists "combos: lectura pública de activos" on combos;
create policy "combos: lectura pública de activos"
  on combos for select
  to anon, authenticated
  using (activo = true or is_admin());

drop policy if exists "combos: escritura admin" on combos;
create policy "combos: escritura admin"
  on combos for all
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "combo_items: lectura pública" on combo_items;
create policy "combo_items: lectura pública"
  on combo_items for select
  to anon, authenticated
  using (true);

drop policy if exists "combo_items: escritura admin" on combo_items;
create policy "combo_items: escritura admin"
  on combo_items for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---- 2. Pedidos con combos ---------------------------------------------
-- Una fila por combo comprado (con su cantidad y precio) y una fila por
-- cada pieza elegida (producto + color + talla + a qué unidad del combo
-- pertenece), para que el negocio sepa exactamente qué producir.
create table if not exists pedido_combos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos (id) on delete cascade,
  combo_id uuid references combos (id) on delete set null,
  combo_slug text not null,
  combo_nombre_en text not null,
  combo_nombre_es text not null,
  cantidad int not null check (cantidad between 1 and 99),
  precio_unitario numeric(10, 2) not null check (precio_unitario >= 0),
  subtotal numeric(10, 2) generated always as (cantidad * precio_unitario) stored
);

create index if not exists idx_pedido_combos_pedido on pedido_combos (pedido_id);

create table if not exists pedido_combo_piezas (
  id uuid primary key default gen_random_uuid(),
  pedido_combo_id uuid not null references pedido_combos (id) on delete cascade,
  producto_id uuid references productos (id) on delete set null,
  producto_slug text not null,
  producto_nombre_en text not null,
  producto_nombre_es text not null,
  color_id text,
  color_nombre text,
  talla text,
  unidad int not null default 1 check (unidad between 1 and 99)
);

create index if not exists idx_pedido_combo_piezas_combo on pedido_combo_piezas (pedido_combo_id);

alter table pedido_combos drop constraint if exists pedido_combos_limites;
alter table pedido_combos add constraint pedido_combos_limites check (
  char_length(combo_slug) <= 100
  and char_length(combo_nombre_en) <= 200
  and char_length(combo_nombre_es) <= 200
) not valid;

alter table pedido_combo_piezas drop constraint if exists pedido_combo_piezas_limites;
alter table pedido_combo_piezas add constraint pedido_combo_piezas_limites check (
  char_length(producto_slug) <= 100
  and char_length(producto_nombre_en) <= 200
  and char_length(producto_nombre_es) <= 200
  and (color_id is null or char_length(color_id) <= 50)
  and (color_nombre is null or char_length(color_nombre) <= 100)
  and (talla is null or char_length(talla) <= 20)
) not valid;

-- ---- 3. RLS de pedidos con combos ---------------------------------------
-- Las políticas de insert de los hijos de un pedido necesitan comprobar que
-- el pedido padre es "de invitado o mío". Hacerlo con una subconsulta
-- directa sobre pedidos falla para un invitado, porque la RLS de pedidos no
-- le deja ver ninguna fila (ni siquiera la que acaba de crear). Esta función
-- security definer hace la comprobación sin esa restricción.
create or replace function pedido_acepta_hijos(p_pedido uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from pedidos
    where id = p_pedido and (user_id is null or user_id = auth.uid())
  );
$$;

create or replace function pedido_combo_acepta_piezas(p_pedido_combo uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from pedido_combos pc
    join pedidos p on p.id = pc.pedido_id
    where pc.id = p_pedido_combo and (p.user_id is null or p.user_id = auth.uid())
  );
$$;

-- Corrige también la política de pedido_items (misma causa).
drop policy if exists "pedido_items: insert acompaña a su pedido" on pedido_items;
create policy "pedido_items: insert acompaña a su pedido"
  on pedido_items for insert
  to anon, authenticated
  with check (pedido_acepta_hijos(pedido_id));

alter table pedido_combos enable row level security;
alter table pedido_combo_piezas enable row level security;

drop policy if exists "pedido_combos: lectura dueño o admin" on pedido_combos;
create policy "pedido_combos: lectura dueño o admin"
  on pedido_combos for select
  to authenticated
  using (
    is_admin()
    or exists (
      select 1 from pedidos
      where pedidos.id = pedido_combos.pedido_id and pedidos.user_id = auth.uid()
    )
  );

drop policy if exists "pedido_combos: insert acompaña a su pedido" on pedido_combos;
create policy "pedido_combos: insert acompaña a su pedido"
  on pedido_combos for insert
  to anon, authenticated
  with check (pedido_acepta_hijos(pedido_id));

drop policy if exists "pedido_combos: update admin" on pedido_combos;
create policy "pedido_combos: update admin"
  on pedido_combos for update
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "pedido_combos: delete admin" on pedido_combos;
create policy "pedido_combos: delete admin"
  on pedido_combos for delete
  to authenticated
  using (is_admin());

drop policy if exists "pedido_combo_piezas: lectura dueño o admin" on pedido_combo_piezas;
create policy "pedido_combo_piezas: lectura dueño o admin"
  on pedido_combo_piezas for select
  to authenticated
  using (
    is_admin()
    or exists (
      select 1
      from pedido_combos pc
      join pedidos p on p.id = pc.pedido_id
      where pc.id = pedido_combo_piezas.pedido_combo_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "pedido_combo_piezas: insert acompaña a su combo" on pedido_combo_piezas;
create policy "pedido_combo_piezas: insert acompaña a su combo"
  on pedido_combo_piezas for insert
  to anon, authenticated
  with check (pedido_combo_acepta_piezas(pedido_combo_id));

drop policy if exists "pedido_combo_piezas: update admin" on pedido_combo_piezas;
create policy "pedido_combo_piezas: update admin"
  on pedido_combo_piezas for update
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "pedido_combo_piezas: delete admin" on pedido_combo_piezas;
create policy "pedido_combo_piezas: delete admin"
  on pedido_combo_piezas for delete
  to authenticated
  using (is_admin());

-- ---- 4. Precio y total decididos por el servidor ------------------------
-- El total del pedido = ítems sueltos + combos. Reemplaza la función de
-- hardening_inserts_publicos.sql para que cuente ambos.
create or replace function recalcular_pedido(p_pedido uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric(10, 2);
begin
  select coalesce((select sum(subtotal) from pedido_items where pedido_id = p_pedido), 0)
       + coalesce((select sum(subtotal) from pedido_combos where pedido_id = p_pedido), 0)
  into v_total;

  update pedidos set subtotal = v_total, total = v_total where id = p_pedido;
end;
$$;

revoke execute on function recalcular_pedido(uuid) from public, anon, authenticated;

create or replace function pedido_items_recalcular_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform recalcular_pedido(new.pedido_id);
  return null;
end;
$$;

create or replace function pedido_combos_fijar_precio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_precio numeric(10, 2);
begin
  if new.combo_id is null then
    raise exception 'pedido_combos.combo_id es obligatorio';
  end if;

  select precio into v_precio from combos where id = new.combo_id and activo = true;
  if v_precio is null then
    raise exception 'El combo % no existe o no está activo', new.combo_id;
  end if;

  new.precio_unitario := v_precio;
  return new;
end;
$$;

drop trigger if exists pedido_combos_fijar_precio_trg on pedido_combos;
create trigger pedido_combos_fijar_precio_trg
  before insert on pedido_combos
  for each row execute function pedido_combos_fijar_precio();

create or replace function pedido_combos_recalcular_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform recalcular_pedido(new.pedido_id);
  return null;
end;
$$;

drop trigger if exists pedido_combos_recalcular_total_trg on pedido_combos;
create trigger pedido_combos_recalcular_total_trg
  after insert on pedido_combos
  for each row execute function pedido_combos_recalcular_total();
