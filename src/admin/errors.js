// Traduce errores crudos de Postgres/Supabase a mensajes que alguien sin
// conocimientos técnicos pueda entender y accionar.
export function readableError(err) {
  const msg = err?.message || String(err);
  if (msg.includes("duplicate key") && msg.includes("slug")) {
    return "Ya existe un producto/paquete con ese identificador (slug). Elegí otro.";
  }
  if (msg.includes("exclude") || msg.includes("overlap")) {
    return "Los tramos de precio se superponen entre sí. Revisá los rangos de cantidad.";
  }
  return msg;
}
