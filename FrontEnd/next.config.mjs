/** @type {import('next').NextConfig} */
const config = {
  outputFileTracingRoot: process.cwd(),
  experimental: { cpus: 1 },
};
export default config;
