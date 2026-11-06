# Process photos in Node.js and keep Cloudflare for R2 storage

On 2026-11-06 the user explicitly rejected an Images plan and requested R2-only
storage after the Images binding returned 9523 for real JPEGs and synthetic
JPEG/PNG fixtures. Move decoding, orientation and metadata-free WebP variants to
Next.js Node.js using Sharp and a portable libheif WASM decoder for HEIC; retain
the existing private R2 Worker as a storage/access gateway without an Images
binding. This preserves the approved privacy, quota and cleanup behavior while
removing the failing external transformation dependency.

Native/WASM processing uses hosting CPU/memory and needs Linux/Vercel packaging
and physical-device verification before beta. No paid plan, new cloud processor
or public original-file fallback is introduced. The former Images cost estimate
is historical; the monthly application cap remains a conservative processing
budget.
