# RustDesk

RustDesk is a cross-platform remote desktop application written in Rust
with a Flutter UI client, positioned as an open-source, self-hostable
alternative to TeamViewer and AnyDesk. The whole project — UI, codecs,
network stack, and the relay server — is released under AGPL-3.0, so
teams that need on-prem control over remote-access traffic can audit
and patch every layer.

## Why it matters

- **Truly self-hostable rendezvous + relay.** Drop in `hbbs`
  (ID/rendezvous server, port `21116`) and `hbbr` (relay server, port
  `21117`) on any Linux box and you have a working RustDesk
  rendezvous/relay stack. Both ship as static binaries and as a
  `docker-compose.yml` from the `rustdesk/rustdesk-server` repo.
- **Direct connections when possible, relay when forced.** The
  client tries a TCP hole-punching direct path first; only when both
  peers cannot be reached does it tunnel through `hbbr`. Set
  `ALWAYS_USE_RELAY=Y` on `hbbs` to force every session through the
  relay for strict on-prem routing.
- **One Flutter codebase, every client.** Desktop (Windows, macOS,
  Linux), mobile (iOS, Android), and a Flutter web build all ship from
  the `flutter/` directory. End users grab a single binary and point
  it at their own `hbbs` host instead of the public one.
- **Mature out-of-the-box defaults.** The default public servers work
  with no configuration, which is why adoption crossed six figures of
  GitHub stars before most teams ever thought about self-hosting.

## How it works

The Rust core lives under `libs/` and `src/`. `hbb_common` holds the
video codec wrappers (vp8/vp9), TCP/UDP socket helpers, protobuf
definitions, and the config layer shared by every binary. `scrap`
captures the screen, `enigo` synthesizes keyboard/mouse input, and
`clipboard` syncs the clipboard across Windows, Linux, and macOS. The
binary's main loop splits into `src/server.rs` (the side being
controlled) and `src/client.rs` (the side initiating the session),
with `src/rendezvous_mediator.rs` acting as the broker that talks to
`hbbs`, learns the peer's public address, attempts the UDP/TCP
hole-punch, and falls back to relaying through `hbbr` if the punch
fails.

The UI lives in `flutter/`. Flutter replaced the older Sciter desktop
shell and is now the only supported GUI: same Dart code draws the
desktop window on every OS, the iOS/Android mobile apps, and the
`flutter/web` build. Protocol frames travel over TCP for control and
either direct UDP or a relayed TCP stream for the video pipeline, with
protobuf as the schema.

The server side is a separate repository (`rustdesk/rustdesk-server`)
with two daemons plus a CLI: `hbbs` mints a key pair on first run
(`-k` / `KEY`) so clients can verify the server they are connecting
to, `hbbr` proxies traffic between peers that could not establish a
direct connection, and `rustdesk-utils` handles key inspection and
diagnostics.

## Caveats

- **Two repos to deploy, not one.** The client lives in
  `rustdesk/rustdesk`, the relay in `rustdesk/rustdesk-server`. You
  also need the public key printed by `hbbs` baked into each client
  build (or pasted into the settings dialog) for the client to trust
  your server.
- **License is AGPL-3.0.** Fine for personal, education, and most
  internal corporate use; commercial forks that do not publish their
  modifications must go through RustDesk Server Pro.
- **Relay bandwidth costs add up.** Every session that fails
  hole-punching transits your `hbbr` host, so a busy deployment wants
  generous egress and TCP throughput. A paid "RustDesk Server Pro"
  tier exists for teams that outgrow the OSS deployment.
- **Wayland caveats.** Linux desktop control is solid on X11; on
  Wayland it relies on the portal APIs and a few compositors still
  have rough edges.

## Deployment notes

For the self-hosted relay stack:

```bash
git clone https://github.com/rustdesk/rustdesk-server.git
cd rustdesk-server/docker
docker compose up -d
# Note the printed public key from hbbs logs
```

Distribute the `hbbs` host and key to each end user. They paste both
into the RustDesk desktop client under **Settings → Network → ID
Server**, and from then on the client talks to your infrastructure
instead of `rs-ny.rustdesk.com`.

**Minimum:** a single small VPS (1 vCPU, 1 GB RAM) handles the
`hbbs`/`hbbr` daemons comfortably for personal use. Relay throughput
scales with egress bandwidth rather than CPU.

**Integration tip:** if you are curating a directory like this one,
list RustDesk alongside other self-hosted remote-access tools as the
canonical "you control the rendezvous server" example — its
two-binary split (`hbbs` + `hbbr`) is a clean teaching case for
distinguishing an ID broker from a data relay.
