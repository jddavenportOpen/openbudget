import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin tracing root to this app dir; the monorepo has multiple lockfiles.
  outputFileTracingRoot: __dirname,
};
export default nextConfig;
