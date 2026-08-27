import { useState } from "react";

// Botón con confirmación inline en dos pasos (en vez de un modal, que es
// más código) — clave para "imposible de romper sin querer": el primer
// click nunca ejecuta la acción, solo la ofrece.
export default function ConfirmToggle({ label, confirmLabel, onConfirm, tone = "default" }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="text-neutral-500">¿Seguro?</span>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm();
            setBusy(false);
            setConfirming(false);
          }}
          className={`underline font-medium ${tone === "danger" ? "text-red-600" : "text-neutral-800"}`}
        >
          {busy ? "…" : confirmLabel}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-neutral-400 underline">
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={`text-xs underline ${tone === "danger" ? "text-red-600" : "text-neutral-500"}`}
    >
      {label}
    </button>
  );
}
