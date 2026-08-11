# AppFlowy

AppFlowy is a self-hostable, open-source productivity workspace that pairs a
Notion-style block editor with database views (Grid, Board, Calendar),
real-time multi-user collaboration, and an optional AI assistant. The data
plane is Rust with a Yrs CRDT; the UI is a single Flutter codebase covering
macOS, Windows, Linux, iOS, and Android. The product is genuinely
local-first, but the open-core split means that a self-hosted multi-seat
deployment requires a paid commercial license.

## What AppFlowy is, and what it isn't trying to be

AppFlowy's pitch is straightforward: build a Notion-shaped workspace that
runs on your hardware, with your data in your database, in an open-source
repository you can fork. The interesting engineering decision is that the
maintainers did not try to do this in JavaScript. The data layer is
**Rust** — split across `flowy-core`, `flowy-document`,
`flowy-database2`, `flowy-folder`, `flowy-ai`, `flowy-search`,
`flowy-storage` — and the UI is a single **Flutter** codebase that
produces desktop, mobile, and web builds from one Dart tree. The FFI
bridge between them is Protobuf-serialized, type-generated, and exposes
the data layer as a typed API to the UI.

This is the right architecture for a cross-platform productivity app with
real-time collaboration. Rust gives you SQLite, CRDT, file I/O, and AI
inference without paying JavaScript's memory tax; Flutter gives you a
single UI codebase that produces a real native rendering, not a WebView.
The editor is a first-party `appflowy_editor` Flutter package that
replaced `flutter_quill` in 2022 — owning your editor is the right call
when you need Notion-style block behavior with collaborative cursors,
slash menus, and database views.

## Local-first, but with strings attached

The "local-first" claim is real. Writes go to local SQLite first, then
sync to the server. The Yrs CRDT (the Rust port of Yjs) handles conflict
resolution. But the open-source product is not the same product as the
hosted one. The community-edition `AppFlowy-Cloud` is AGPL-3.0 and freely
self-hostable, **but** the documented self-host tier is **one user seat
plus three guest editors**. Larger seats require a per-server commercial
license (`SELF_HOST_LICENSE_AGREEMENT.md`) at $11.88/month/server with
annual renewal. The desktop and mobile clients remain AGPL-3.0.

This is a real open-core split. The framework maintainers are explicit
about it: the AppFlowy-Cloud README states the project is "adopting an
open-core model" while "AppFlowy Web and AppFlowy Flutter will remain open
source." The self-host pricing page lists tiers per server, not per seat,
which is itself a useful operational simplification if you want one
internal-only deployment for a small team.

## The "end-to-end encryption" claim is marketing

The marketing site says "end-to-end encryption." The self-hosting security
documentation describes TLS in transit and server-side encryption
(encrypted volumes for PostgreSQL, MinIO server-side encryption with KMS,
optional S3 AES256). These are different claims. Server-side encryption
means the cloud operator can read your data; E2EE means they cannot. The
mismatch has been picked up by reviewers; a Reddit thread titled "Let's
address the elephant in the room: end-to-end encryption" exists on
r/AppFlowy. Treat the "E2EE" claim as marketing-grade until proven
otherwise, and do not put regulated data on an AppFlowy Cloud deployment
without confirming the actual encryption boundary.

## The sync and import story is the weak link

The two most damaging criticisms in the AppFlowy community are about sync
reliability and Notion import. The OpenTechHub November 2025 review
called sync "the true killer issue." An iOS App Store review from July
2026 says: "I lost data multiple times both on mobile and desktop app." A
closed issue from October 2025, **#8112** ("Full data loss in case of
migration problems due to data storage in RocksDB"), was a real incident
tied to the local store on a migration path before the project reverted
to SQLite.

The Notion import story is structurally lossy for a reason that is not
AppFlowy's fault. Notion's official export is Markdown + CSV; **Notion
does not export Notion databases through the export endpoint**. Whatever
AppFlowy imports from a Notion export cannot include the database rows,
properties, or relations that made the original workspace useful. Multiple
open issues (#8937, #8862, #8789, #8744) complain about "Notion import is
broken." The right mental model is "import pages, not workspaces."

## Where AppFlowy is the best choice

- A single user or small team that wants Notion-shaped features with
  local-first writes, can stomach the AGPL-3.0 + commercial self-host
  split, and is willing to back up the SQLite file.
- A developer who wants to fork a Notion-shaped productivity app and is
  willing to maintain a CRDT-based Rust core.

## Where AppFlowy is not the right choice

- A team of 20+ that wants free self-hosting. The commercial self-host
  license is per-server and not cheap at $11.88/month.
- A user with regulated data expecting E2EE. The marketing says yes; the
  docs describe server-side encryption.
- Anyone whose primary use case is "import my Notion workspace." The
  import is lossy by design.
- A mobile-first team. Mobile sync has the most data-loss complaints in
  the community.

## Deployment notes

The reference install is the `AppFlowy-Cloud` Docker Compose stack:
`appflowy_cloud` (the Rust server), `gotrue` (auth), `postgres`, `minio`
(or any S3), `redis`, and a reverse proxy. The maintainers publish a
self-hosting security guide with an automated backup script that covers
PostgreSQL dump, MinIO storage, and `.env` (daily cron @ 02:00, 30-day
retention, optional off-site via AWS S3 sync, rsync, or Restic with 7
daily / 4 weekly retention).

## Developer lessons worth borrowing

- **Own your editor.** The `appflowy_editor` rewrite from `flutter_quill`
  was the difference between "Markdown app" and "Notion competitor."
  The editor is the product, not the chrome around it.
- **Type your FFI boundary.** Protobuf codegen at the FFI seam (Dart and
  Rust both consume the same types) is a friction-killer for
  cross-language refactors. Many "Rust + Flutter" projects get this wrong;
  AppFlowy gets it right.
- **Local-first needs a real backup story.** The official self-host
  backup script is the right answer (PostgreSQL dump + MinIO + `.env`).
  If you self-host, wire that script to your off-site target on day one.
- **Open-core is a deliberate trade.** A per-server commercial self-host
  license at $11.88/month funds the Rust core development. The AGPL-3.0
  client remains free.

## More from this profile

The full editorial profile (research summary, comparison matrix with
Notion / Obsidian / Anytype / Logseq / AFFiNE / Outline, content
opportunities, verified sources) is available in the directory
maintainer's dossier.
