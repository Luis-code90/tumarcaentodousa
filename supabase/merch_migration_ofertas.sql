-- =========================================================================
-- TuMarcaEnTodo — Categoría "Ofertas" (combos)
-- Correr una sola vez en el SQL Editor de Supabase.
-- orden = 0 para que quede primera en el panel admin. En el sitio la
-- pestaña "Ofertas" aparece primera solo si hay al menos un producto
-- activo en esta categoría.
-- Cada combo se carga desde /admin/merch como un producto normal
-- (categoría Ofertas, un color, talla "Única", tramos de precio).
-- =========================================================================
insert into categorias (slug, nombre_en, nombre_es, orden)
values ('Ofertas', 'Deals', 'Ofertas', 0)
on conflict (slug) do nothing;
