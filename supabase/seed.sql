-- =========================================================================
-- TuMarcaEnTodo — Seed
-- Carga la paleta de colores, categorías y los 11 productos que hoy viven
-- hardcodeados en el array PRODUCTS de CatalogoMerch.jsx, para que el sitio
-- siga mostrando el mismo catálogo apenas se cambie el mock por el fetch
-- real. Ejecutar después de schema.sql y rls.sql.
-- =========================================================================

-- ---- Categorías (orden = orden de CATEGORY_KEYS en el front) ----
insert into categorias (slug, nombre_en, nombre_es, orden) values
  ('Remeras',    'T-Shirts',     'Camisetas',   1),
  ('Buzos',      'Sweatshirts',  'Suéteres',    2),
  ('Gorras',     'Caps',         'Gorras',      3),
  ('Mugs',       'Mugs',         'Mugs',        4),
  ('Tumblers',   'Tumblers',     'Tumblers',    5),
  ('Delantales', 'Aprons',       'Delantales',  6)
on conflict (slug) do nothing;

-- ---- Colores (espeja SWATCHES + COLOR_NAMES de CatalogoMerch.jsx) ----
insert into colores (id, hex, nombre_en, nombre_es) values
  ('negro',    '#1a1a1a', 'Black',      'Negro'),
  ('blanco',   '#f5f5f5', 'White',      'Blanco'),
  ('gris',     '#8a8a8a', 'Grey',       'Gris'),
  ('azul',     '#2f5fa8', 'Blue',       'Azul'),
  ('rojo',     '#c1272d', 'Red',        'Rojo'),
  ('amarillo', '#f2c230', 'Yellow',     'Amarillo'),
  ('verde',    '#3f7d4f', 'Green',      'Verde'),
  ('rosa',     '#e8a3b8', 'Pink',       'Rosa'),
  ('bordo',    '#6d2530', 'Maroon',     'Bordo'),
  ('celeste',  '#a8d3e6', 'Light blue', 'Celeste'),
  ('dorado',   '#c9a86a', 'Gold',       'Dorado')
on conflict (id) do nothing;

-- ---- Productos + variantes + tramos ----
-- Bloque PL/pgSQL: inserta cada producto, guarda su id en pid y lo usa
-- para insertar sus colores/tallas/tramos asociados, uno por uno.
do $$
declare
  pid uuid;
begin

  -- tshirt-belle
  insert into productos (slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, orden)
  values ('tshirt-belle', 'Remeras', 'Belle+Canvas Jersey Tee', 'Belle+Canvas Jersey',
          'Unisex, premium cotton, 100% made in the USA.', 'Unisex, algodón premium, 100% hecho en EE. UU.', 1)
  returning id into pid;
  insert into producto_colores (producto_id, color_id, orden)
    select pid, c, o from unnest(array['negro','blanco','azul','rojo','verde','bordo']) with ordinality as t(c, o);
  insert into producto_tallas (producto_id, talla, orden)
    select pid, t, o from unnest(array['XS','S','M','L','XL','2XL','3XL','4XL']) with ordinality as tt(t, o);
  insert into tramos_precio (producto_id, cantidad_min, cantidad_max, precio) values
    (pid, 1, 25, 17), (pid, 26, 100, 15);

  -- tshirt-gildan
  insert into productos (slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, orden)
  values ('tshirt-gildan', 'Remeras', 'Gildan Heavy Cotton Adult', 'Gildan Heavy Cotton Adulto',
          'Heavy cotton, reinforced seams.', 'Algodón grueso, costura reforzada.', 2)
  returning id into pid;
  insert into producto_colores (producto_id, color_id, orden)
    select pid, c, o from unnest(array['negro','gris','blanco','azul','rojo','amarillo']) with ordinality as t(c, o);
  insert into producto_tallas (producto_id, talla, orden)
    select pid, t, o from unnest(array['XS','S','M','L','XL','2XL']) with ordinality as tt(t, o);
  insert into tramos_precio (producto_id, cantidad_min, cantidad_max, precio) values
    (pid, 1, 25, 16), (pid, 26, 100, 14);

  -- dri-fit
  insert into productos (slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, orden)
  values ('dri-fit', 'Remeras', 'Dri Fit Sport Tee', 'Dri Fit Deportiva',
          'Lightweight polyester, moisture control.', 'Poliéster liviano, control de humedad.', 3)
  returning id into pid;
  insert into producto_colores (producto_id, color_id, orden)
    select pid, c, o from unnest(array['negro','blanco','amarillo','rojo','azul','verde']) with ordinality as t(c, o);
  insert into producto_tallas (producto_id, talla, orden)
    select pid, t, o from unnest(array['S','M','L','XL','2XL','3XL']) with ordinality as tt(t, o);
  insert into tramos_precio (producto_id, cantidad_min, cantidad_max, precio) values
    (pid, 1, 25, 18), (pid, 26, 100, 16);

  -- sweatshirt
  insert into productos (slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, orden)
  values ('sweatshirt', 'Buzos', 'Crew Neck Heavy Blend', 'Crew Neck Heavy Blend',
          '8oz cotton/poly blend, ribbed cuffs.', 'Algodón/poliéster 8oz, puño acanalado.', 1)
  returning id into pid;
  insert into producto_colores (producto_id, color_id, orden)
    select pid, c, o from unnest(array['negro','gris','blanco','bordo','azul']) with ordinality as t(c, o);
  insert into producto_tallas (producto_id, talla, orden)
    select pid, t, o from unnest(array['S','M','L','XL','2XL','3XL']) with ordinality as tt(t, o);
  insert into tramos_precio (producto_id, cantidad_min, cantidad_max, precio) values
    (pid, 1, 25, 25), (pid, 26, 100, 22);

  -- hoodie
  insert into productos (slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, orden)
  values ('hoodie', 'Buzos', 'Gildan Heavy Blend Hoodie', 'Hoodie Gildan Heavy Blend',
          'Double-lined hood, kangaroo pocket.', 'Capucha doble forro, bolsillo canguro.', 2)
  returning id into pid;
  insert into producto_colores (producto_id, color_id, orden)
    select pid, c, o from unnest(array['negro','gris','verde','azul','rojo','dorado']) with ordinality as t(c, o);
  insert into producto_tallas (producto_id, talla, orden)
    select pid, t, o from unnest(array['S','M','L','XL','2XL','3XL']) with ordinality as tt(t, o);
  insert into tramos_precio (producto_id, cantidad_min, cantidad_max, precio) values
    (pid, 1, 25, 30), (pid, 26, 100, 27);

  -- cap
  insert into productos (slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, orden)
  values ('cap', 'Gorras', 'Six Panel / Trucker / Hip Hop Cap', 'Six Panel / Trucker / Hip Hop',
          'Adjustable, fits any occasion.', 'Ajustable, ideal para cualquier ocasión.', 1)
  returning id into pid;
  insert into producto_colores (producto_id, color_id, orden)
    select pid, c, o from unnest(array['negro','bordo','azul','rosa','rojo','blanco']) with ordinality as t(c, o);
  insert into producto_tallas (producto_id, talla, orden) values (pid, 'Única', 1);
  insert into tramos_precio (producto_id, cantidad_min, cantidad_max, precio) values
    (pid, 1, 25, 15), (pid, 26, 100, 13);

  -- mug-11
  insert into productos (slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, orden)
  values ('mug-11', 'Mugs', 'Ceramic Mug 11oz', 'Mug Cerámica 11oz',
          'Full color, UV DTF sticker.', 'Full color, sticker UV DTF.', 1)
  returning id into pid;
  insert into producto_colores (producto_id, color_id, orden)
    select pid, c, o from unnest(array['negro','blanco','rosa','celeste','azul']) with ordinality as t(c, o);
  insert into producto_tallas (producto_id, talla, orden) values (pid, 'Única', 1);
  insert into tramos_precio (producto_id, cantidad_min, cantidad_max, precio) values (pid, 1, 100, 12);

  -- mug-16
  insert into productos (slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, orden)
  values ('mug-16', 'Mugs', 'Ceramic Mug 16oz', 'Mug Cerámica 16oz',
          'Full color, UV DTF sticker.', 'Full color, sticker UV DTF.', 2)
  returning id into pid;
  insert into producto_colores (producto_id, color_id, orden)
    select pid, c, o from unnest(array['negro','blanco','rosa','celeste','azul']) with ordinality as t(c, o);
  insert into producto_tallas (producto_id, talla, orden) values (pid, 'Única', 1);
  insert into tramos_precio (producto_id, cantidad_min, cantidad_max, precio) values (pid, 1, 100, 16);

  -- tumbler-40
  insert into productos (slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, orden)
  values ('tumbler-40', 'Tumblers', 'Roadsip 40oz with Handle', 'Roadsip 40oz con asa',
          'Stainless steel, cold for 24h.', 'Acero inoxidable, mantiene frío 24h.', 1)
  returning id into pid;
  insert into producto_colores (producto_id, color_id, orden)
    select pid, c, o from unnest(array['negro','gris','rosa','celeste','azul']) with ordinality as t(c, o);
  insert into producto_tallas (producto_id, talla, orden) values (pid, 'Única', 1);
  insert into tramos_precio (producto_id, cantidad_min, cantidad_max, precio) values (pid, 1, 100, 45);

  -- tumbler-20
  insert into productos (slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, orden)
  values ('tumbler-20', 'Tumblers', 'Sublimation Tumbler 20oz', 'Vaso Sublimación 20oz',
          'Stainless steel, sublimation ready.', 'Acero inoxidable, apto sublimación.', 2)
  returning id into pid;
  insert into producto_colores (producto_id, color_id, orden)
    select pid, c, o from unnest(array['negro','blanco']) with ordinality as t(c, o);
  insert into producto_tallas (producto_id, talla, orden) values (pid, 'Única', 1);
  insert into tramos_precio (producto_id, cantidad_min, cantidad_max, precio) values (pid, 1, 100, 28);

  -- apron
  insert into productos (slug, categoria_slug, nombre_en, nombre_es, detalle_en, detalle_es, orden)
  values ('apron', 'Delantales', 'Full Length Apron, 2 Pockets', 'Delantal Largo 2 Bolsillos',
          'Cotton/poly twill, adjustable strap.', 'Algodón/poliéster, tira ajustable.', 1)
  returning id into pid;
  insert into producto_colores (producto_id, color_id, orden)
    select pid, c, o from unnest(array['negro','blanco','rojo','azul','dorado','verde']) with ordinality as t(c, o);
  insert into producto_tallas (producto_id, talla, orden) values (pid, 'Única', 1);
  insert into tramos_precio (producto_id, cantidad_min, cantidad_max, precio) values
    (pid, 1, 25, 18), (pid, 26, 100, 16);

end $$;
