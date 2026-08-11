# AppFlowy

AppFlowy is an open-source collaborative workspace — Notion-style
pages, databases, and AI features, with the data stored locally or
on infrastructure you control.

## Why it matters

- **Local-first data model.** Every page is a structured YAML tree
  on disk. The desktop client is a thin wrapper over that tree; the
  server is optional and only needed for multi-device sync.
- **Customizable blocks.** The block system is data-only; the
  rendering layer is open and documented. Custom block types are a
  configuration change, not a fork.
- **AI as a first-class feature.** AppFlowy ships AI assistants that
  operate over your workspace data. The assistants are pluggable
  (BYO OpenAI-compatible endpoint), so adopters can keep their data
  inside their own tenancy.

## How it works

AppFlowy's Rust core persists the workspace tree to disk using a
custom CRDT-style format, then exposes operations through a gRPC API.
The Flutter desktop and mobile clients render the tree as a
Notion-style editor; the web client uses Yjs to share state with the
same gRPC backend. AI features plug into the operation stream, so
any block can be summarised, expanded, or transformed by the assistant.

The project is organized into:

- `appflowy_flutter` — the mobile + desktop client.
- `AppFlowy-Cloud` — the optional sync server.
- `frontend/appflowy_flutter` package — the block / plugin SDK.

## Caveats

- **Younger than Notion.** Some advanced Notion features (database
  relations, formulas) are partial or missing.
- **Single binary model.** The desktop client is one executable; you
  cannot embed AppFlowy into another app the way you can with
  Notion's API.
- **License is AGPL-3.0** for the server, with the client under a
  more permissive license. Read the dual-license carefully if you
  plan to fork.

## Deployment notes

```bash
# Desktop app — download from GitHub releases
# https://github.com/AppFlowy-IO/AppFlowy/releases

# Self-hosted cloud (optional)
docker compose -f AppFlowy-Cloud/docker-compose.yml up -d
```

**Minimum:** 2 CPU, 4 GB RAM for the cloud container. Clients run on
any laptop made in the last five years.

**Integration tip:** AppFlowy's block SDK is the cleanest example in
this directory of a project that exposes its data model as a public
API while keeping the renderer proprietary.
