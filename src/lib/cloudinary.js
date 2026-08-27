const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Client-side checks are a UX convenience (fail fast with a clear message
// before spending the user's time on an upload), not a security boundary —
// the real enforcement has to live in the Cloudinary unsigned preset itself
// (allowed formats / max size / folder), since anyone can call Cloudinary's
// upload endpoint directly with a crafted request that skips this file
// entirely. Configure those restrictions on the preset in the Cloudinary
// dashboard; see .env.example for the exact settings.
export function validateImageFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Solo se permiten imágenes JPG, PNG o WEBP.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "La imagen pesa más de 5MB. Elegí un archivo más liviano.";
  }
  return null;
}

// Uploads directly from the browser to Cloudinary using an unsigned preset
// — no API secret involved on this side. Returns { url, publicId }.
export async function uploadImage(file) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary no está configurado (faltan VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET en .env)."
    );
  }

  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("No se pudo subir la imagen a Cloudinary. Probá de nuevo.");
  }

  const data = await response.json();
  return { url: data.secure_url, publicId: data.public_id };
}
