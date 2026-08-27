-- =========================================================================
-- TuMarcaEnTodo — Schema de catálogo de merchandising personalizado
-- Proyecto Supabase independiente (no comparte cuenta con Catálogo Mirlo)
-- =========================================================================
-- Orden de ejecución sugerido en el SQL Editor de Supabase:
--   1. schema.sql   (este archivo)
--   2. rls.sql
--   3. seed.sql     (opcional, carga los productos que hoy viven en el mock)
-- =========================================================================

-- gen_random_uuid(): en proyectos Supabase modernos ya viene disponible,
-- pero se deja explícito por si el proyecto corre en una versión de
-- Postgres donde todavía depende de la extensión.
create extension if not exists pgcrypto;

-- btree_gist habilita el operador && sobre rangos dentro de un EXCLUDE
-- constraint. Se usa más abajo para que la base de datos rechace, a nivel
-- de fila, dos tramos de precio superpuestos para un mismo producto
-- (ej. 1-25 y 20-40) en vez de confiar en que el código de la app lo valide.
create extension if not exists btree_gist;

-- Función utilitaria estándar de Supabase para mantener updated_at al día
-- sin tener que acordarse de setearlo a mano en cada UPDATE.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- 1. PERFILES / ROLES
-- =========================================================================
-- No existe login de clientes en el sitio todavía (el checkout es manual
-- por WhatsApp), pero la tabla de pedidos necesita un concepto de "dueño"
-- para la RLS pedida (punto 5) y de "usuario" para puntos de fidelización
-- (punto 4). profiles es el patrón estándar de Supabase para esto: una fila
-- 1:1 con auth.users que además guarda el rol (customer/admin), porque
-- auth.users no es consultable desde políticas RLS del lado del cliente.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  telefono text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

comment on table profiles is
  'Fila 1:1 con auth.users. Hoy no hay login de clientes en el sitio, así que
   esta tabla queda vacía en la práctica — pero pedidos y puntos de
   fidelización ya están listos para poblarla el día que se agregue auth,
   sin necesitar una migración.';

-- Crea automáticamente el profile al registrarse un usuario (patrón
-- estándar de Supabase). Corre con privilegios del owner de la función
-- porque el trigger vive sobre auth.users, un esquema que el rol
-- autenticado no puede escribir directamente.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =========================================================================
-- 2. CATEGORÍAS
-- =========================================================================
-- Tabla en vez de ENUM: agregar una categoría nueva (ej. "Bolsos") no debe
-- requerir un ALTER TYPE ni un deploy. El slug usa las mismas claves en
-- español que ya existen como literales en CATEGORY_KEYS / UI.categories
-- dentro de CatalogoMerch.jsx (Remeras, Buzos, Gorras...), así el fetch no
-- tiene que traducir nada para que el switch de idioma del front siga
-- funcionando tal cual está.
create table if not exists categorias (
  slug text primary key,
  nombre_en text not null,
  nombre_es text not null,
  orden int not null default 0
);

comment on table categorias is
  'slug coincide 1:1 con los valores de CATEGORY_KEYS/UI.categories en
   CatalogoMerch.jsx (Remeras, Buzos, Gorras, Mugs, Tumblers, Delantales).';

-- =========================================================================
-- 3. COLORES (paleta maestra)
-- =========================================================================
-- Espeja SWATCHES + COLOR_NAMES de CatalogoMerch.jsx. Tenerlo en tabla (en
-- vez de solo confiar en el string que carga cada producto) evita que un
-- typo al cargar un producto ("ngero" en vez de "negro") rompa el swatch
-- silenciosamente: la FK de producto_colores lo rechaza al insertar.
create table if not exists colores (
  id text primary key,
  hex text not null,
  nombre_en text not null,
  nombre_es text not null
);

comment on table colores is
  'Paleta maestra de colores. id coincide con las claves de SWATCHES/
   COLOR_NAMES en el front (negro, blanco, azul, ...).';

-- =========================================================================
-- 4. PRODUCTOS
-- =========================================================================
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  -- slug estable usado como identificador público: es el valor que hoy
  -- vive en PRODUCTS[i].id (ej. "tshirt-belle") y que el carrito persiste
  -- en localStorage. Se mantiene separado del uuid interno para no atar la
  -- URL/el storage del cliente a un identificador que cambiaría si algún
  -- día se migran datos.
  slug text not null unique,
  categoria_slug text not null references categorias (slug) on delete restrict,

  -- Bilingüe como columnas separadas (no JSON) a pedido explícito: deben
  -- coincidir 1:1 con las props nombre_en/nombre_es/detalle_en/detalle_es
  -- que ya consume ProductCard en CatalogoMerch.jsx.
  nombre_en text not null,
  nombre_es text not null,
  detalle_en text not null default '',
  detalle_es text not null default '',

  -- Imágenes en Cloudinary, no en Supabase Storage. Se guarda la URL ya
  -- resuelta (con las transformaciones que decida el admin) y el public_id
  -- por si más adelante se arma una galería o se regeneran variantes de
  -- imagen (thumbnail, zoom) sin tener que volver a subir el archivo.
  imagen_url text,
  cloudinary_public_id text,

  activo boolean not null default true,
  orden int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table productos is
  'nombre_en/nombre_es/detalle_en/detalle_es coinciden 1:1 con los campos
   que ProductCard.jsx ya desestructura de cada producto.';

create index if not exists idx_productos_categoria on productos (categoria_slug);
create index if not exists idx_productos_activo on productos (activo);

drop trigger if exists set_productos_updated_at on productos;
create trigger set_productos_updated_at
  before update on productos
  for each row execute function set_updated_at();

-- ---- Colores habilitados por producto (orden = orden de swatches en UI) ----
create table if not exists producto_colores (
  producto_id uuid not null references productos (id) on delete cascade,
  color_id text not null references colores (id) on delete restrict,
  orden int not null default 0,
  -- Foto de esta variante de color específica (ej. remera roja vs. azul).
  -- Si es NULL, el catálogo cae de vuelta a productos.imagen_url.
  imagen_url text,
  cloudinary_public_id text,
  primary key (producto_id, color_id)
);

create index if not exists idx_producto_colores_producto on producto_colores (producto_id);

-- ---- Tallas habilitadas por producto ----
-- No se modela como tabla maestra propia porque, a diferencia de los
-- colores, las tallas no tienen hex/nombre bilingüe asociado: son el mismo
-- código (S, M, L...) en ambos idiomas. 'Única' es el mismo valor centinela
-- que ya usa el componente (product.tallas[0] !== "Única" oculta el
-- selector de talla), así el mapeo del fetch no necesita traducir nada.
create table if not exists producto_tallas (
  producto_id uuid not null references productos (id) on delete cascade,
  talla text not null check (
    talla in ('XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Única')
  ),
  orden int not null default 0,
  primary key (producto_id, talla)
);

create index if not exists idx_producto_tallas_producto on producto_tallas (producto_id);

-- ---- Tramos de precio por cantidad ----
-- "1 a N tramos, sin máximo fijo": tabla propia en vez de columnas
-- price_tier_1/2/3 en productos. cantidad_max nullable representa un tramo
-- abierto ("100 unidades en adelante") sin necesitar un valor sentinela
-- como 999999.
create table if not exists tramos_precio (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos (id) on delete cascade,
  cantidad_min int not null check (cantidad_min > 0),
  cantidad_max int check (cantidad_max is null or cantidad_max >= cantidad_min),
  precio numeric(10, 2) not null check (precio >= 0),

  -- Garantiza a nivel de base de datos que dos tramos del mismo producto
  -- nunca se pisen (ej. 1-25 y 20-40 a la vez), algo que priceFor() en el
  -- front asume implícitamente pero no valida. cantidad_max NULL se trata
  -- como "infinito" para el chequeo de solapamiento.
  constraint tramos_precio_no_overlap exclude using gist (
    producto_id with =,
    int4range(cantidad_min, coalesce(cantidad_max, 2147483647), '[]') with &&
  )
);

comment on table tramos_precio is
  'Un producto puede tener 1 a N tramos. El EXCLUDE constraint impide
   solaparlos; no hace falta un tope fijo de tramos.';

create index if not exists idx_tramos_precio_producto on tramos_precio (producto_id);

-- =========================================================================
-- 5. PEDIDOS
-- =========================================================================
-- Número correlativo legible para referenciar el pedido en WhatsApp /
-- panel admin, sin exponer el uuid interno al cliente.
create sequence if not exists pedidos_numero_seq;

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique default nextval('pedidos_numero_seq'),

  -- Nullable a propósito: hoy el checkout es 100% de invitado (sin login).
  -- Cuando se agregue auth de clientes, este campo empieza a poblarse solo
  -- con auth.uid() y esos pedidos automáticamente quedan visibles para su
  -- dueño vía RLS, sin migrar el schema.
  user_id uuid references auth.users (id) on delete set null,

  -- Snapshot de contacto: se guarda igual aunque haya user_id, porque el
  -- WhatsApp que confirma el pedido puede no ser el mismo que el de la
  -- cuenta, y porque en pedidos de invitado es el único dato de contacto.
  cliente_nombre text not null,
  cliente_telefono text not null,
  cliente_email text,

  estado text not null default 'pendiente' check (
    estado in ('pendiente', 'confirmado', 'en_produccion', 'listo', 'entregado', 'cancelado')
  ),

  -- Pasarela de pagos: preparado para conectar Stripe sin migrar el schema
  -- (punto 4). Hoy el pago se coordina fuera del sistema, así que ambos
  -- quedan en su default hasta que exista integración real.
  metodo_pago text check (
    metodo_pago is null or metodo_pago in ('efectivo', 'zelle', 'transferencia', 'tarjeta', 'stripe', 'otro')
  ),
  estado_pago text not null default 'pendiente' check (
    estado_pago in ('pendiente', 'pagado', 'parcial', 'reembolsado', 'fallido')
  ),
  stripe_payment_intent_id text unique,

  moneda text not null default 'USD',
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  total numeric(10, 2) not null check (total >= 0),

  idioma text not null default 'en' check (idioma in ('en', 'es')),
  canal text not null default 'whatsapp',
  notas text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table pedidos is
  'estado = ciclo de vida del pedido. metodo_pago/estado_pago/
   stripe_payment_intent_id ya existen desde ahora para que conectar Stripe
   más adelante sea solo escribir en columnas existentes, no un ALTER TABLE.';

create index if not exists idx_pedidos_user on pedidos (user_id);
create index if not exists idx_pedidos_estado on pedidos (estado);

drop trigger if exists set_pedidos_updated_at on pedidos;
create trigger set_pedidos_updated_at
  before update on pedidos
  for each row execute function set_updated_at();

-- ---- Ítems del pedido ----
-- Se desnormaliza nombre/color/talla/precio al momento de la compra
-- (en vez de solo guardar producto_id) para que el historial de pedidos no
-- cambie retroactivamente si el producto sube de precio o se renombra
-- después. producto_id se conserva además como referencia "viva" cuando
-- existe, y se vuelve NULL si el producto se borra del catálogo, sin
-- perder el renglón del pedido.
create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos (id) on delete cascade,
  producto_id uuid references productos (id) on delete set null,

  producto_slug text not null,
  producto_nombre_en text not null,
  producto_nombre_es text not null,
  color_id text,
  color_nombre text,
  talla text,

  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(10, 2) not null check (precio_unitario >= 0),
  subtotal numeric(10, 2) generated always as (cantidad * precio_unitario) stored
);

create index if not exists idx_pedido_items_pedido on pedido_items (pedido_id);

-- =========================================================================
-- 6. PUNTOS DE FIDELIZACIÓN (preparado, sin usar todavía)
-- =========================================================================
-- Requiere user_id NOT NULL a propósito: sin login no hay forma segura de
-- confirmar que quien reclama los puntos es el dueño real del teléfono o
-- email usado en un pedido de invitado. La tabla queda lista pero
-- simplemente no se poblará hasta que exista auth de clientes.
create table if not exists puntos_transacciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pedido_id uuid references pedidos (id) on delete set null,

  tipo text not null check (tipo in ('ganado', 'canjeado', 'ajuste', 'expirado')),
  -- Con signo: ganado > 0, canjeado/expirado < 0. El saldo de un usuario es
  -- simplemente sum(puntos), sin necesitar una tabla de saldo separada que
  -- se pueda desincronizar.
  puntos int not null,
  descripcion text,

  created_at timestamptz not null default now()
);

comment on table puntos_transacciones is
  'Tabla preparada para fidelización pero sin flujo que la use todavía.
   Saldo de un usuario = sum(puntos) where user_id = X.';

create index if not exists idx_puntos_user on puntos_transacciones (user_id);
create index if not exists idx_puntos_pedido on puntos_transacciones (pedido_id);
