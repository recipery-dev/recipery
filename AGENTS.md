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
- When adding a field or control to an existing screen, look for something
  to simplify or remove first, not just where to append the new thing.
- Ask before adding a new UI/component dependency. Minimalism here is a
  constraint on the dependency tree too, not only visual style.

If a design decision trades a small amount of functionality for a visibly
calmer screen, take that trade by default and say so — don't quietly add
the feature-complete version.

## Notes for future work

This repo started from a different project's scaffold (an EPUB library
called Bookhoarder). The leftover branding, unused dependencies (`epubjs`,
`fflate`, `fast-xml-parser`, `embla-carousel-react`, `nodemailer`), and a
stale Cloudflare R2 bucket-binding name (`BOOKHOARD_BUCKET` instead of
`RECIPERY_BUCKET`) have been cleaned up. If you spot any other trace of it
(a stray "Bookhoarder"/"bookhoard" string, a book/EPUB-specific comment,
an unused dependency), that's scaffold debris — clean it up rather than
working around it.
