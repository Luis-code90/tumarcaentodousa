-- =========================================================================
-- TuMarcaEnTodo — Decoración con Globos
-- Segunda "tienda" del mismo negocio/proyecto Supabase que Merchandising.
-- Requiere haber corrido schema.sql antes (reutiliza gen_random_uuid() vía
-- pgcrypto y la función set_updated_at()).
-- Orden de ejecución: globos_schema.sql → globos_rls.sql → globos_seed.sql
-- =========================================================================

-- =========================================================================
-- 1. PAQUETES
-- =========================================================================
-- A diferencia de productos (inventario con variantes de color/talla y
-- tramos de precio por cantidad), un paquete de Globos es contenido de
-- portfolio: nombre + lista de "qué incluye" + una o más opciones de precio
-- con etiqueta propia (ej. "1 Columna" / "2 Columnas", no un rango de
-- cantidad). Se modela en tabla, no hardcodeado, porque la idea es que la
-- dueña pueda administrar precios/paquetes desde un futuro panel admin sin
-- tocar código — mismo criterio que ya se usó para productos.
create table if not exists paquetes_globos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre_en text not null,
  nombre_es text not null,
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table paquetes_globos is
  'Portfolio de paquetes de decoración con globos. No es inventario con
   stock — es contenido de precios de referencia (ver solicitudes_cotizacion
   para el flujo real de venta, que se coordina manualmente).';

create index if not exists idx_paquetes_globos_activo on paquetes_globos (activo);

drop trigger if exists set_paquetes_globos_updated_at on paquetes_globos;
create trigger set_paquetes_globos_updated_at
  before update on paquetes_globos
  for each row execute function set_updated_at();

-- ---- Bullets de "qué incluye" ----
-- Tabla propia (no array/JSON) para que un futuro panel admin pueda
-- agregar/quitar/reordenar bullets como filas individuales, igual criterio
-- que producto_colores/producto_tallas en el schema de Merchandising.
create table if not exists paquete_items (
  id uuid primary key default gen_random_uuid(),
  paquete_id uuid not null references paquetes_globos (id) on delete cascade,
  texto_en text not null,
  texto_es text not null,
  orden int not null default 0
);

create index if not exists idx_paquete_items_paquete on paquete_items (paquete_id);

-- ---- Opciones de precio ----
-- "1 a N opciones por paquete, sin máximo fijo", igual filosofía que
-- tramos_precio en Merchandising — pero acá cada fila es una opción con
-- etiqueta propia (ej. "Arco mediano (6–7 ft)"), no un rango de cantidad,
-- porque así es como se vende: por tamaño/variante nombrada, no por lote.
create table if not exists paquete_precios (
  id uuid primary key default gen_random_uuid(),
  paquete_id uuid not null references paquetes_globos (id) on delete cascade,
  etiqueta_en text not null,
  etiqueta_es text not null,
  precio numeric(10, 2) not null check (precio >= 0),
  orden int not null default 0
);

comment on table paquete_precios is
  'Precios de referencia: el precio final se acuerda directo con la
   clienta (ver disclaimer fijo en la UI), esto no alimenta un carrito.';

create index if not exists idx_paquete_precios_paquete on paquete_precios (paquete_id);

-- =========================================================================
-- 2. SOLICITUDES DE COTIZACIÓN
-- =========================================================================
-- No hay carrito ni checkout acá: es un formulario de contacto que
-- persiste la consulta y después abre WhatsApp con los mismos datos, igual
-- patrón que el checkout de Merchandising. paquete_interes referencia el
-- slug del paquete (no un id numérico) para que la fila siga siendo
-- legible aunque el paquete se borre más adelante (on delete set null).
create table if not exists solicitudes_cotizacion (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null,
  fecha_evento date,
  paquete_interes text references paquetes_globos (slug) on delete set null,
  notas text,
  estado text not null default 'pendiente' check (
    estado in ('pendiente', 'contactado', 'cotizado', 'cerrado')
  ),
  created_at timestamptz not null default now()
);

comment on table solicitudes_cotizacion is
  'Consultas del formulario de /globos. No tiene user_id: a diferencia de
   pedidos, acá no existe ni siquiera el concepto de invitado-con-cuenta-
   futura — es simplemente un lead de contacto, visible solo por admin.';

create index if not exists idx_solicitudes_estado on solicitudes_cotizacion (estado);
create index if not exists idx_solicitudes_paquete on solicitudes_cotizacion (paquete_interes);
