/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});
// Usamos webpack en dev/build (--webpack en scripts) para compatibilidad con PWA y evitar problemas de Turbopack.
// Leaflet puede fallar en dev con doble montaje de StrictMode ("Map container is already initialized").
const nextConfig = {
  reactStrictMode: false,
};
module.exports = withPWA(nextConfig);
