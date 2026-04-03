/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Prevent webpack from trying to bundle packages that use WASM or native modules.
  // unpdf (PDF.js WASM), mammoth, youtube-transcript must be loaded at runtime.
  serverExternalPackages: ["unpdf", "mammoth", "youtube-transcript"],
}

export default nextConfig
