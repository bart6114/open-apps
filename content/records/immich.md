# Immich

Immich is a self-hosted photo and video backup solution that ships a
native mobile app for iOS and Android plus a web client for desktop
browsing. It is positioned as a Google Photos alternative you can run
on your own hardware.

## Why it matters

- **End-to-end self-host.** Photos never leave your network. The
  reference install is a single `docker-compose.yml` that brings up
  the server, PostgreSQL, Redis, and the machine-learning workers.
- **Modern mobile UX.** Background uploads, Live Photo handling,
  Memories (date-bucketed auto-albums), facial recognition, and a
  search bar that runs locally over your library. The mobile app is
  built in Flutter, so the same code ships to both platforms.
- **Active ML pipeline.** Immich ships a CLIP-based natural-language
  search and a face model that runs entirely on your hardware. The
  quality of these features is the reason most adopters stay after
  evaluating alternatives.

## How it works

The server is a NestJS application that stores object keys in
PostgreSQL and binary assets on the local filesystem or any S3-compatible
backend. Upload requests flow through a queue (`pg-boss`) to a set of
workers that run thumbnail generation, EXIF extraction, and ML
embeddings on demand. The web and mobile clients speak a documented
REST API; the server is the single source of truth.

The codebase is large (~330k lines) but cleanly split: the server
side is TypeScript, the mobile side is Flutter/Dart, and the web side
is Svelte. Each has a focused test suite and a CI pipeline that
publishes multi-arch container images.

## Caveats

- **Resource hungry.** Hardware-accelerated transcoding wants a recent
  Intel iGPU or an NVIDIA GPU. Software transcoding works on any
  modern CPU but is slow at scale.
- **Single-user assumption.** Multi-user support exists but admin
  features are limited compared to mature SaaS offerings.
- **License is AGPL-3.0.** Acceptable for personal use; commercial
  forks must publish their modifications.

## Deployment notes

```bash
git clone https://github.com/immich-app/immich.git
cd immich/docker
cp .env.example .env
docker compose up -d
```

**Minimum:** 2 CPU, 4 GB RAM, 50 GB storage for a small personal
library. 8+ CPU and 16+ GB for a family library with hardware
transcoding enabled.

**Integration tip:** if you operate an Astro/Grove directory like
this one, embed Immich as the canonical "see it in action" example
for any app tagged `self-hosted` or `backup`.
