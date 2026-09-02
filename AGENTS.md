# Recipery

Self-hosted recipe manager. Object storage is the only persistence layer —
recipes, collections, profiles, and settings live as files under
`recipes/`, `collections/`, `profiles/`, etc. (see `src/lib/storage/`, which
supports local disk, S3, and Cloudflare R2 backends).

## Design philosophy: minimal, simple, effective

This is the whole point of the app and its main differentiator from
Mealie/Tandoor/Paprika-style recipe managers, which tend to be feature-heavy
and visually busy. Every screen should feel calmer and lighter than the
alternatives, not just "have fewer features."

Concretely, when building or touching any screen:

- Default to fewer, smaller controls over decorative chrome. Prefer a
  subtle divider (`divide-y divide-border/60`) between list rows over a
  bordered card per row. Reach for a card/border only when it's actually
  separating unrelated content, not just to "contain" a row of inputs.
- Prefer icon-only buttons with `aria-label` over icon+text buttons once the
  icon is unambiguous in context (see the ingredient-row remove button in
  `recipe-form-drawer.tsx` for the pattern).
- Prefer native HTML controls (`<select>`, `<input>`) styled to match the
  rest of the form over pulling in a new component/dependency (e.g. a
  combobox library), unless the interaction genuinely can't be done with a
  native control. The unit dropdown in `recipe-form-drawer.tsx` (native
  `<select>` with a "Custom…" escape hatch to a text field) is the reference
  pattern — it gives dropdown behavior without new UI dependencies.
- Prefer an existing or addable shadcn/ui component over hand-rolled markup
  that duplicates one (e.g. a row of styled `<button>`s standing in for
  `Tabs`). Check `src/components/ui/` first; if the primitive is missing,
  use the shadcn MCP server (or `npx shadcn@latest add <component>`) to pull
  it in rather than writing it from scratch. This project's `components.json`
  style is `base-nova`, which resolves to the `@base-ui/react`-based variant
  of each component, not Radix — the CLI/MCP picks that up automatically
  from `components.json`, so no extra flag is needed.
- When adding a field or control to an existing screen, look for something
  to simplify or remove first, not just where to append the new thing.
- Ask before adding a new UI/component dependency. Minimalism here is a
  constraint on the dependency tree too, not only visual style.

If a design decision trades a small amount of functionality for a visibly
calmer screen, take that trade by default and say so — don't quietly add
the feature-complete version.

## Testing

Add Vitest coverage for new or changed logic wherever practical, not just
when asked — bug fixes and new features alike. Pure functions in `src/lib/`
(parsing, formatting, scraping heuristics, etc.) are the highest-value
target and the easiest to test in isolation; see `src/lib/recipes/*.test.ts`
for the pattern, including `scrape.test.ts` for mocking `fetch` on
network-touching code. UI-only changes with no meaningful logic (styling,
layout) don't need a test just to have one. Run `pnpm test` before calling
work done.

- **Path alias**: `vitest.config.ts` mirrors `tsconfig.json`'s `@/*` alias
  via `resolve.alias` — Vitest doesn't read `tsconfig` `paths` on its own.
- **Storage/filesystem code**: prefer a real `LocalDriver` against a
  `fs.mkdtemp()` temp dir over mocking the filesystem — see
  `src/lib/storage/local.test.ts` and `src/lib/store/index.test.ts` (the
  latter also covers the write-queue's concurrency guarantee, the part most
  likely to silently break).
- **`middleware.ts`-style code gated by a module-level env-derived
  constant** (e.g. `DEMO_MODE`): needs `vi.resetModules()` + `vi.stubEnv()`
  and a dynamic `await import()` per case, since the constant is only read
  once at module load — see `src/middleware.test.ts`.
- **React hooks/components**: use `@testing-library/react` with the
  per-file `/** @vitest-environment jsdom */` docblock (the global
  environment stays `node` — most tests don't need a DOM). Mock `fetch` via
  `vi.stubGlobal` and `@/components/ui/toast` via `vi.mock` rather than
  rendering the real toast provider; see `src/hooks/use-collections.test.ts`
  and `use-shopping-list.test.ts` for the optimistic-update-then-rollback
  pattern both hooks share.
- **`localStorage` in jsdom tests**: jsdom 30 delegates it to Node's own
  experimental webstorage, which no-ops without a `--localstorage-file`
  flag. `vitest.setup.ts` polyfills it with an in-memory `Storage` — don't
  remove that polyfill or add flag-based workarounds instead.

## Notes for future work

This repo started from a different project's scaffold (an EPUB library
called Bookhoarder). The leftover branding, unused dependencies (`epubjs`,
`fflate`, `fast-xml-parser`, `embla-carousel-react`, `nodemailer`), and a
stale Cloudflare R2 bucket-binding name (`BOOKHOARD_BUCKET` instead of
`RECIPERY_BUCKET`) have been cleaned up. If you spot any other trace of it
(a stray "Bookhoarder"/"bookhoard" string, a book/EPUB-specific comment,
an unused dependency), that's scaffold debris — clean it up rather than
working around it.
