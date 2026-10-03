// Vercel Function entry. Deliberately plain JavaScript: Vercel transpiles
// TypeScript with esbuild, which drops the decorator metadata NestJS needs for
// dependency injection. `nest build` (real tsc) compiles src/ into dist/ during
// the Vercel build, and this file only forwards to that output.
export { default } from '../dist/serverless.js';
