<p align="center">
  <img src="public/logo.png" alt="Recipery" width="120" />
</p>

<h1 align="center">Recipery</h1>

<p align="center">
  A self-hosted recipe library. Object storage is the only persistence layer —
  no database to provision, back up, or migrate between versions.
</p>

<p align="center">
  <a href="https://github.com/recipery-dev/recipery/actions/workflows/ci.yml"><img src="https://github.com/recipery-dev/recipery/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/recipery-dev/recipery/releases"><img src="https://img.shields.io/github/v/release/recipery-dev/recipery" alt="Latest release"></a>
  <a href="https://github.com/recipery-dev/recipery/pkgs/container/recipery"><img src="https://img.shields.io/badge/ghcr.io-recipery--dev%2Frecipery-blue?logo=docker&logoColor=white" alt="Docker image"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License"></a>
  <a href="https://recipery.dev"><img src="https://img.shields.io/badge/website-recipery.dev-orange" alt="Website"></a>
  <a href="https://docs.recipery.dev"><img src="https://img.shields.io/badge/docs-docs.recipery.dev-blue" alt="Documentation"></a>
</p>

## Quickstart (Docker)

```bash
docker compose up
```

This starts the app plus a local MinIO instance (the S3-compatible bucket)
and creates the `recipery` bucket automatically. Open http://localhost:3000.

## Deploying

Docker is the fastest way to try it; Recipery also runs as a Cloudflare
Worker — same source, different environment variables (`make cf-build`,
`make cf-preview`, `make cf-deploy`; see the `Makefile` and `wrangler.jsonc`).
Full walkthroughs are at [docs.recipery.dev](https://docs.recipery.dev).

## Local development

```bash
pnpm install
cp .env.example .env.local   # defaults to the local filesystem driver
pnpm dev
```

Open http://localhost:3000.

To develop against S3/MinIO instead of the local driver, run `docker compose up minio minio-init`
and set `STORAGE_DRIVER=s3` in `.env.local` (see `.env.example` for the rest of the S3 vars).

## Documentation

Full docs are at [docs.recipery.dev](https://docs.recipery.dev).

## Features

- Enter recipes manually or import them from a URL — pulls ingredients,
  steps, photos, timing, and the source site's name from the page's own
  recipe data
- Import from a YouTube link too — pulls in the title, thumbnail, and video,
  plus a best-effort read of any ingredients/steps in the description
- Attach a video to any recipe, YouTube or otherwise — add it on import,
  or set/change it later from Edit
- Ingredients with quantities, units, and a servings scaler that recalculates
  amounts on the fly
- Step-by-step instructions with per-step photos, drag-to-reorder, and a
  print-friendly view
- Collections and favorites for organizing your library, plus per-recipe
  ratings and cook tracking
- Multi-profile support (admin/reader roles) with optional per-profile
  passwords, so a household can share one instance without sharing an account
- Pluggable storage driver: local filesystem or S3-compatible object storage
  (MinIO, Cloudflare R2, Backblaze B2, ...), including a configurable
  directory prefix for sharing a bucket with other apps

## License

Recipery is licensed under the [GNU Affero General Public License v3.0](LICENSE).
You're free to self-host, modify, and use it — including internally at a
company — but if you run a modified version as a network service, you must
make your modified source available to its users.
