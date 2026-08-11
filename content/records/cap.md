# Cap

Cap is an open-source alternative to Loom — record your screen, your
microphone, and your face simultaneously, then share a link that
plays in any browser.

## Why it matters

- **Self-host or use the cloud.** Cap's cloud tier is a paid product;
  the open-source release includes a self-hosted backend you can run
  on a $5 VPS.
- **Cross-platform desktop recording.** Built on Electron, so the
  same UX ships to macOS, Windows, and Linux without per-platform
  code.
- **Studio mode.** Cap's `studio` view is a multi-track editor with
  camera bubble positioning, zoom-on-click, and background blur — all
  computed locally before upload.

## How it works

The desktop app is Electron + Next.js; the recording pipeline writes
to WebM directly via `MediaRecorder` and the FFmpeg binary bundled
with the Electron runtime. Uploads stream through a small S3-compatible
storage layer; playback is a plain `<video>` tag with an HLS manifest
generated on upload.

The web app and the storage backend are both Next.js projects; they
share a Postgres database for auth, video metadata, and share-link
state. The studio editor is a SvelteKit project that talks to the
same backend over a documented REST API.

## Caveats

- **Studio editor is web-only.** You can record anywhere, but the
  multi-track editor runs in a browser tab.
- **Storage costs are real.** Cap does not compress aggressively;
  long recordings can balloon. Self-hosters usually pair it with a
  bucket lifecycle policy.
- **License is MIT for the desktop and web apps.** The cloud backend
  is dual-licensed; check before commercialising a hosted fork.

## Deployment notes

```bash
# Self-hosted backend
git clone https://github.com/CapSoftware/Cap.git
cd Cap/docker
docker compose up -d
```

**Minimum:** 1 CPU, 1 GB RAM for the backend; the desktop client runs
on any laptop made in the last five years.

**Integration tip:** Cap is a strong "video feedback" companion for
any directory workflow that involves human review of submissions.
