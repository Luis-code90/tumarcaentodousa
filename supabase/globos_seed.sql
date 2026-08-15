-- =========================================================================
-- TuMarcaEnTodo — Decoración con Globos — Seed
-- Carga los 5 paquetes del catálogo "Decoración Globos - TuMarcaEnTodo".
-- Ejecutar después de globos_schema.sql y globos_rls.sql.
-- =========================================================================

do $$
declare
  pid uuid;
begin

  -- ---- 1. Columna Orgánica ----
  insert into paquetes_globos (slug, nombre_en, nombre_es, orden)
  values ('columna-organica', 'Organic Column', 'Columna Orgánica', 1)
  returning id into pid;

  insert into paquete_items (paquete_id, texto_en, texto_es, orden) values
    (pid, 'Balloons in different sizes', 'Globos de diferentes tamaños', 1),
    (pid, 'Color combination of your choice', 'Combinación de colores a elección', 2),
    (pid, 'Base included', 'Base incluida', 3),
    (pid, 'Decorative detail (star, bow, number or simple foil)', 'Detalle decorativo (estrella, lazo, número o foil sencillo)', 4);

  insert into paquete_precios (paquete_id, etiqueta_en, etiqueta_es, precio, orden) values
    (pid, '1 Column', '1 Columna', 150, 1),
    (pid, '2 Columns', '2 Columnas', 260, 2);

  -- ---- 2. Mosaicos de Letras Gigantes ----
  insert into paquetes_globos (slug, nombre_en, nombre_es, orden)
  values ('mosaico-letras', 'Giant Letter Mosaics', 'Mosaicos de Letras Gigantes', 2)
  returning id into pid;

  insert into paquete_items (paquete_id, texto_en, texto_es, orden) values
    (pid, 'Balloons in different sizes', 'Globos de diferentes tamaños', 1),
    (pid, 'Professional design', 'Diseño profesional', 2),
    (pid, 'Sturdy base', 'Base resistente', 3),
    (pid, 'Setup included', 'Montaje incluido', 4),
    (pid, 'Great for a backdrop or main table', 'Ideal para backdrop o mesa principal', 5),
    (pid, 'Extras (plush toys, flowers, etc.) priced separately by model, size and quantity', 'Extras (peluches, flores, etc.) se cobran según la selección de modelo, tamaño y cantidad', 6);

  insert into paquete_precios (paquete_id, etiqueta_en, etiqueta_es, precio, orden) values
    (pid, 'Each letter', 'Cada letra', 85, 1);

  -- ---- 3. Arco Orgánico Temático ----
  insert into paquetes_globos (slug, nombre_en, nombre_es, orden)
  values ('arco-organico', 'Themed Organic Arch', 'Arco Orgánico Temático', 3)
  returning id into pid;

  insert into paquete_items (paquete_id, texto_en, texto_es, orden) values
    (pid, 'Balloons in different sizes', 'Globos de diferentes tamaños', 1),
    (pid, 'Professional organic design', 'Diseño orgánico profesional', 2),
    (pid, 'Gradient or color combination', 'Degradado o combinación de colores', 3),
    (pid, 'Setup included', 'Montaje incluido', 4),
    (pid, 'Great for a backdrop or main table', 'Ideal para backdrop o mesa principal', 5);

  insert into paquete_precios (paquete_id, etiqueta_en, etiqueta_es, precio, orden) values
    (pid, 'Medium arch (6–7 ft)', 'Arco mediano (6–7 ft)', 200, 1),
    (pid, 'Large arch (8–9 ft)', 'Arco grande (8–9 ft)', 300, 2);

  -- ---- 4. Diseño "Ready to Go" ----
  insert into paquetes_globos (slug, nombre_en, nombre_es, orden)
  values ('ready-to-go', '"Ready to Go" Design', 'Diseño "Ready to Go"', 4)
  returning id into pid;

  insert into paquete_items (paquete_id, texto_en, texto_es, orden) values
    (pid, 'Balloons in different sizes', 'Globos de diferentes tamaños', 1),
    (pid, 'Professional design', 'Diseño profesional', 2),
    (pid, 'No setup needed: just pick your favorite spot and you''re done', 'Sin instalaciones: solo elige el rincón favorito y ¡listo!', 3),
    (pid, 'Fully personalized: from welcome messages to your favorite plush toy', 'Totalmente personalizados: desde frases de bienvenida hasta tu peluche favorito', 4),
    (pid, 'Extras (plush toys, flowers, etc.) priced separately by model, size and quantity', 'Extras (peluches, flores, etc.) se cobran según la selección de modelo, tamaño y cantidad', 5);

  insert into paquete_precios (paquete_id, etiqueta_en, etiqueta_es, precio, orden) values
    (pid, '1 Arrangement', '1 Arreglo', 180, 1);

  -- ---- 5. Combos ----
  insert into paquetes_globos (slug, nombre_en, nombre_es, orden)
  values ('combos', 'Combos', 'Combos', 5)
  returning id into pid;

  insert into paquete_items (paquete_id, texto_en, texto_es, orden) values
    (pid, 'Combine two decor pieces at a special price', 'Combiná dos piezas de decoración a un precio especial', 1),
    (pid, 'Same color/design customization as the individual pieces', 'Misma personalización de color/diseño que las piezas individuales', 2);

  insert into paquete_precios (paquete_id, etiqueta_en, etiqueta_es, precio, orden) values
    (pid, '1 Medium arch + 1 column', '1 Arco mediano + 1 columna', 300, 1),
    (pid, '1 Letter + 1 column', '1 Letra + 1 columna', 200, 2),
    (pid, '1 Arrangement + medium arch', '1 Arreglo + arco mediano', 320, 3);

end $$;
