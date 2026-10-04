-- =========================================================================
-- TuMarcaEnTodo — Nombres en español de categorías
-- Correr una sola vez en el SQL Editor de Supabase.
-- Solo cambia el texto que se muestra: el slug (Remeras / Buzos) es el
-- identificador interno que usan productos y el front, NO se toca.
-- =========================================================================
update categorias set nombre_es = 'Camisetas' where slug = 'Remeras';
update categorias set nombre_es = 'Suéteres' where slug = 'Buzos';
