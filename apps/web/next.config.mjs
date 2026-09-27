/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@clipforge/types",
    "@clipforge/api",
    "@clipforge/auth",
    "@clipforge/storage",
  ],
};
export default nextConfig;
