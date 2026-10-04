# TuMarcaEnTodo

Sitio web de un negocio en Orlando, FL (mercado US, público hispano/anglo). Dos líneas de negocio, ambas cerradas por **WhatsApp** (no hay pasarela de pago):

- **Merch personalizado** (`/merch`): remeras, buzos, gorras, mugs, tumblers, delantales. Carrito + precios por tramos de cantidad. El checkout guarda un `pedido` en Supabase y abre `wa.me` con el resumen.
- **Decoración con globos** (`/globos`): paquetes de referencia (galería, "incluye", precios) + formulario de cotización que guarda una `solicitud_cotizacion` y abre WhatsApp.
- **Admin** (`/admin`): panel para cargar/editar productos y paquetes, con subida de fotos a Cloudinary.

Es un proyecto **separado de Catálogo Mirlo** (otro Supabase, otra cuenta). No mezclar convenciones ni credenciales.

## Stack

React 18 + Vite 6 + React Router 7 (SPA, sin SSR) · Tailwind 4 (`@tailwindcss/vite`) + estilos inline con tokens `COLORS` por página · lucide-react · Supabase (Postgres + Auth + RLS) · Cloudinary (imágenes, upload unsigned desde el navegador).

```
npm run dev      # desarrollo
npm run build    # genera dist/
npm run preview
```

No hay tests, linter ni TypeScript.

## Estructura

- `src/App.jsx` — rutas. `Layout.jsx` es dueño del idioma (`lang` en/es, default `en`) y lo pasa por `useOutletContext()`.
- `src/pages/Landing.jsx`, `src/CatalogoMerch.jsx`, `src/Globos.jsx` — páginas públicas. Strings i18n inline en cada archivo (objeto `UI` con `en`/`es`).
- `src/lib/` — acceso a datos: `products.js`/`packages.js` (lectura pública), `orders.js`/`quotes.js` (inserts públicos), `adminProducts.js`/`adminPackages.js` (CRUD admin), `auth.jsx` (sesión + `profiles.role`), `cloudinary.js`.
- `src/admin/` — panel. `RequireAdmin` es solo una barrera de UX; la seguridad real es RLS.
- `supabase/` — SQL a correr a mano en el SQL Editor. Orden: `schema.sql` → `rls.sql` → `seed.sql` → `globos_schema.sql` → `globos_rls.sql` → `globos_seed.sql` → migraciones (`*_migration_*.sql`). No hay sistema de migraciones: si cambiás el esquema, agregá un archivo nuevo **y** actualizá el schema base.
- `public/` — favicons, `og-image.png`, `robots.txt`, `sitemap.xml` (escrito a mano, 3 rutas).

## Convenciones y gotchas

- Esquema en **español** (tablas/columnas: `productos`, `tramos_precio`, `paquetes_globos`...), textos bilingües como columnas `_en`/`_es` (no JSON).
- Los slugs de categoría (`Remeras`, `Buzos`, `Gorras`, `Mugs`, `Tumblers`, `Delantales`) y de color (`negro`, `azul`...) están **hardcodeados también en el front** (`CATEGORY_KEYS`, `SWATCHES`, `COLOR_NAMES` en `CatalogoMerch.jsx`). Una categoría o color nuevo en la DB necesita cambio de código.
- Talla `"Única"` es un valor centinela: oculta el selector de talla.
- `tramos_precio.cantidad_max NULL` = tramo abierto (en el front se mapea a `Infinity`). Un `EXCLUDE` impide tramos superpuestos.
- Carrito en `localStorage` (`tumarcaentodo_cart_v1`) guarda solo ids; se rehidrata y re-precia con el catálogo fresco.
- `orders.js` genera el UUID del pedido en el cliente y **no hace `.select()`** tras insertar: los invitados (anon) pueden INSERT pero no SELECT en `pedidos`. No agregar `.returning`/`.select()` ahí.
- Si falla el guardado en Supabase, el flujo sigue a WhatsApp igual (decisión de negocio: WhatsApp es el canal real).
- Roles: `profiles.role` (`customer`/`admin`). Solo se promueve a admin a mano desde el dashboard de Supabase (`update profiles set role='admin'`); el front no puede cambiar `role` (GRANT por columna). No hay signup público.
- `.env` está gitignoreado; plantilla en `.env.example`. Variables `VITE_*` van al bundle (son públicas por diseño: anon key, cloud name, preset). **Nunca** poner `service_role` ni API secret de Cloudinary en el front.
- Dominio objetivo en las meta tags/sitemap/robots: `https://www.tumarcaentodousa.com`. Verificar que coincida con el dominio comprado antes de publicar.
- Hosting aún no definido: hay `vercel.json` y `public/_redirects` (Netlify/Cloudflare). Ambos hacen rewrite SPA → `index.html`.
- Los previews de WhatsApp/redes leen solo el `index.html` estático, así que son iguales para las 3 rutas (ver `useDocumentMeta.js`).

## Preferencias de trabajo

- El usuario habla español; responder en español. Comentarios del código existente están en español (UI pública en en/es, admin solo en español).
- Commits en inglés, mensajes cortos y descriptivos, como los existentes.
- Antes de publicar al dominio real, ver el estado de pendientes en la sección de abajo.

## Pendientes conocidos (auditoría 2026-10-03)

Hecho en código: WhatsApp se abre síncrono en el click (`lib/whatsapp.js`, no volver a poner `window.open` después de un `await`), carrito editable + mensaje de éxito, 404, footer y botón flotante de WhatsApp, idioma por navegador, imágenes Cloudinary optimizadas (`lib/images.js`), `noindex` en admin, headers de seguridad/CSP en `vercel.json` y `public/_headers` (si se agrega un host nuevo para imágenes o APIs, actualizar `img-src`/`connect-src`), y `supabase/hardening_inserts_publicos.sql`.

Pendiente de hacer a mano (fuera del código):

1. Correr `supabase/hardening_inserts_publicos.sql` en el SQL Editor.
2. Verificar en Cloudinary que el preset unsigned tenga formatos, tamaño y carpeta restringidos.
3. Elegir hosting (borrar `vercel.json` o `_redirects`/`_headers` según corresponda) y confirmar el dominio en meta tags/sitemap/robots.
4. Política de privacidad, MFA admin, deshabilitar signup público en Supabase Auth, backups.
5. Probar el checkout en un iPhone y un Android reales.
