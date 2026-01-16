/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/bungodduk" : "",
  assetPrefix: process.env.NODE_ENV === "production" ? "/bungodduk/" : "",
  images: {
    unoptimized: true,
  },
};
export default nextConfig;