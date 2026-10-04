// Cloudinary serves the original upload (often 3-5MB) unless the URL asks
// for a transformation. f_auto/q_auto picks WebP/AVIF and a sane quality;
// w_ caps the width. URLs from anywhere else are returned untouched.
export function optimizeImage(url, width = 800) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  if (/\/upload\/[^/]*(f_auto|q_auto|w_\d+)/.test(url)) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}
