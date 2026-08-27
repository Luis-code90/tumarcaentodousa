import { useRef, useState } from "react";
import { uploadImage, validateImageFile } from "../lib/cloudinary";

// value: { imagen_url, cloudinary_public_id } | null
// onChange(next: { imagen_url, cloudinary_public_id } | null)
export default function ImageUploadField({ value, onChange, label }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo si falla
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const { url, publicId } = await uploadImage(file);
      onChange({ imagen_url: url, cloudinary_public_id: publicId });
    } catch (err) {
      setError(err.message || "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value?.imagen_url ? (
        <img src={value.imagen_url} alt="" className="w-16 h-16 rounded-lg object-cover border border-neutral-200" />
      ) : (
        <div className="w-16 h-16 rounded-lg border border-dashed border-neutral-300 flex items-center justify-center text-[10px] text-neutral-400 text-center px-1">
          Sin imagen
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-neutral-300 disabled:opacity-50"
          >
            {uploading ? "Subiendo…" : value?.imagen_url ? "Cambiar" : "Subir"} {label}
          </button>
          {value?.imagen_url && !uploading && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-neutral-400 underline"
            >
              Quitar
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600 max-w-[220px]">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  );
}
