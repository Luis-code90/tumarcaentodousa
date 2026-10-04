export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "14079906841";

export function whatsappUrl(text) {
  return `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

// Opens WhatsApp *synchronously* inside the click handler and only then runs
// the Supabase save. Mobile browsers (iOS Safari especially) block
// window.open() when it happens after an `await`, because the user gesture
// has expired by then — that silently killed checkout on phones.
//
// If the browser still blocks the popup, we fall back to navigating the
// current tab, but wait for the save first so it isn't cancelled mid-flight.
export async function openWhatsAppThenSave(url, save) {
  const win = window.open(url, "_blank", "noopener");
  const saving = Promise.resolve()
    .then(save)
    .then(() => true)
    .catch((err) => {
      // WhatsApp is the real confirmation channel; a failed internal save
      // must not block the customer.
      console.error("Failed to save to Supabase:", err);
      return false;
    });

  if (!win) {
    await saving;
    window.location.href = url;
  }
  return saving;
}
