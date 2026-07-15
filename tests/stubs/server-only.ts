// No-op stand-in for the `server-only` package under Vitest. The real package
// throws when imported outside a React Server Component; the build-time guard
// still runs during `next build`. See vitest.config.ts alias.
export {};
