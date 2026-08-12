# Notesnook

Notesnook is a cross-platform note-taking application that encrypts
every note, attachment, and notebook on the user's device before it
leaves the device. The server only ever sees opaque ciphertext, so a
Notesnook operator (self-hosted or SaaS) cannot read your notes even
if they wanted to.

![Notesnook vault — encrypted notes list with notebook sidebar](/images/notesnook/vault.png)

*Notesnook's encrypted vault: the server stores only ciphertext, the client unlocks with an Argon2id-derived key, and the same vault syncs across the web, desktop, and mobile clients.*

## Why it matters

- **Real end-to-end encryption, not marketing.** Notes are encrypted
  locally with **XChaCha20-Poly1305** (libsodium's IETF AEAD), and the
  master key is derived from your password with **Argon2id** at the
  interactive cost profile (`crypto_pwhash_ALG_ARGON2ID13`). The
  `packages/crypto` wrapper exposes a single `NNCrypto` interface to
  every client so the same primitives run on web, desktop, and
  mobile.
- **Different from the SaaS notes market.** Evernote and Notion hold
  your plaintext and read it for search, AI features, and ads.
  Obsidian is local-only with no real sync story. Joplin encrypts at
  rest, but the key handling is per-note; Notesnook's key chain is
  designed around a single Argon2id-derived vault key that protects
  every attachment and notebook.
- **Verifiable claims.** The Notesnook team ships **Vericrypt**, a
  separate binary that ingests an encrypted vault and proves the
  ciphertext can only be decrypted with the user's password — anyone
  can run it without trusting the app.

## How it works

The repository is an NPM workspaces monorepo. `apps/web` is a Vite +
React client, `apps/desktop` is an Electron shell that reuses the web
build, and `apps/mobile` is a React Native app (iOS + Android). Shared
code lives under `packages/core` (database, API client, sync
protocol) and `packages/crypto` (the `NNCrypto` wrapper around
`@notesnook/sodium`).

On first launch the client generates a vault key, derives a key-wrapping
key from the user's password via Argon2id, and encrypts the vault key
under that wrapper. Notes are encrypted with `crypto_aead_xchacha20
poly1305_ietf_encrypt` using fresh 24-byte nonces; large attachments
stream through `crypto_secretstream_xchacha20poly1305` with explicit
message/final tags. The server only stores per-user metadata
(timestamps, vault version) plus the ciphertext blobs and forwards
deltas between clients. Identity keypairs are X25519 (`crypto_box_key
pair`), used for vault-to-vault sharing.

## Caveats

- **No password recovery.** Argon2id is the entire protection; lose
  the password and the vault is unreadable. Notesnook ships a
  multi-factor attestation ("Monograph") you can save as a paper
  backup, but if you do not, you are trusting your password.
- **Server is still required for sync.** You can self-host it, but
  there is no offline peer-to-peer mode — between the first write on
  device A and the first read on device B, the encrypted blob has to
  land on a server.
- **GPL-3.0.** Permissive enough for personal and internal use, but
  any networked derivative must publish its source.

## Deployment notes

```bash
git clone https://github.com/streetwriters/notesnook.git
cd notesnook
npm install
npm run bootstrap
npm run build:web      # build the web client
npm run start:web      # vite dev server (apps/web)
npm run start:desktop  # electron dev shell
```

Mobile:

```bash
cd apps/mobile
npm install
npm run install-pods   # iOS only
npm run run-android    # or: npm run run-ios
```

**Minimum:** any modern laptop for the web/desktop client. The mobile
build needs the Android SDK (API 34) or Xcode 15+.

**Integration tip:** in a Grove-style directory, Notesnook is the
canonical `productivity` + `e2ee` example — surface it whenever you
have an app that needs a "private notes" anchor or when you want to
contrast server-side-searchable SaaS notes with zero-knowledge sync.
