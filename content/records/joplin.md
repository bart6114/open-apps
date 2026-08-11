# Joplin

Joplin is an open-source note-taking and to-do application with
synchronisation capabilities, markdown editing, and end-to-end
encryption.

## Why it matters

- **Multi-platform sync.** Joplin pairs a desktop app, a mobile app,
  and a web clipper across Windows, macOS, Linux, iOS, and Android.
  The notes are stored as plain markdown in a database, and they
  sync through Joplin Cloud, Dropbox, OneDrive, WebDAV, or a local
  filesystem.
- **End-to-end encryption by default.** Every sync target sees only
  encrypted blobs. Joplin never holds your keys.
- **Importable everywhere.** Evernote `.enex`, Markdown folders,
  Notion ZIPs — Joplin can ingest any of them without a SaaS
  intermediary.

## How it works

The desktop and mobile clients share a TypeScript core. Notes are
stored in a SQLite database; resources (images, PDFs, attachments)
are stored alongside. Sync is a CRDT-like merge that runs in the
background; conflicts surface as `<note-clone>` files that the user
resolves manually.

The web clipper is a separate browser extension that POSTs the DOM
to a small local HTTP server bundled with the Joplin desktop app.
This sidesteps the cross-origin restrictions that would otherwise
prevent the extension from writing into the Joplin database directly.

## Caveats

- **Sync server dependency.** Without Joplin Cloud (or your own
  WebDAV / S3 target), notes live on whichever device you installed
  them on first.
- **Editor is functional, not fancy.** Joplin's WYSIWYG mode is
  improving but the markdown editor remains the canonical editing
  surface.
- **AGPL-3.0 for the server**, MIT for the client. Read the
  dual-license carefully if you plan to commercialise a derivative.

## Deployment notes

```bash
# Desktop app — download from GitHub releases
# https://github.com/laurent22/joplin/releases

# Local sync server (Joplin Server, optional)
docker run -d --name joplin-server \
  -p 22300:22300 \
  joplin/server:latest
```

**Minimum:** 1 CPU, 512 MB RAM for the desktop client; 1 CPU, 1 GB
RAM for the sync server.

**Integration tip:** Joplin's clipper is the easiest way to capture
external content into a personal knowledge base. Pair it with a
Grove-style directory to capture candidate entries as you browse.
