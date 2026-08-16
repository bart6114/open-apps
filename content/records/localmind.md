# localmind

LocalMind is a Flutter mobile chat client for talking to AI models without
sending your conversations to anyone else's infrastructure. It speaks
directly to user-configured servers — on-device inference, local
Ollama or LM Studio instances, or any OpenAI-compatible API such as
OpenRouter — with no middleware, account, telemetry, or subscription
in between.

## Why it matters

- **True privacy floor.** Zero analytics, no first-party servers, and
  no fallback proxy. Every byte leaves the device only if the user
  points the app at a server they trust, and conversation history is
  stored in encrypted Hive locally.
- **Runs models on the phone.** GGUF and LiteRT checkpoints (Gemma,
  Qwen, DeepSeek R1 and friends) execute directly on iOS or Android
  via `llamadart` and `flutter_gemma`, so the same app works fully
  offline once a model is downloaded.
- **MCP for tool use.** The app ships a Model Context Protocol client,
  so a running model can be wired to local or remote MCP servers for
  file access, shell actions, or web APIs — toggled per server.
- **Multi-server by design.** Multiple inference endpoints can coexist
  with live health monitoring, live model swapping mid-conversation,
  streaming SSE, expandable reasoning traces (for DeepSeek R1-style
  models), markdown + syntax highlighting, voice I/O, and image
  attachments for vision models.

## How it works

The codebase is a clean Flutter project (`lib/bootstrap`,
`lib/core`, `lib/features`, `lib/services`, `lib/l10n`) with
Riverpod for state and `go_router` for navigation. The `features`
folder is organised as vertical slices — `chat`, `conversations`,
`models`, `on_device`, `mcp`, `personas`, `servers`, `settings`,
`saved_messages`, `cloud_sync`, `lm_studio_catalog`, `stt`, `tts`,
`voice_mode`, `sidebar`, `onboarding` — so each capability owns its
own UI and controllers.

Persistence is dual-layered: ObjectBox (`objectbox` +
`objectbox_flutter_libs`) holds the relational chat history, while
Hive (with `flutter_secure_storage` for secrets) holds lightweight
key-value preferences. Networking is plain `dio` to whatever
OpenAI-compatible endpoint the user configured, with
`url_launcher` for external links and `aws_signature_v4` for the
optional S3 cloud-sync target that ships with end-to-end encryption.

## Caveats

- **On-device inference is hardware-bound.** A 7B GGUF on a mid-tier
  Android will be slow; phones older than ~2022 may not run useful
  models at all. The cloud / local-server paths are the realistic
  default for most users.
- **Single-user app.** There is no notion of shared accounts or
  team workspaces — this is a personal client, not a SaaS frontend.
- **MCP tools are a power feature.** A misconfigured MCP server can
  give a model shell access; treat endpoint URLs with the same care
  you would give any LLM agent tool.
- **iOS App Store status is unclear.** The repo publishes source
  only; distribution is via `flutter run` or sideload at present.

## Deployment notes

```bash
git clone https://github.com/abdulmominsakib/localmind.git
cd localmind
flutter pub get
flutter run
```

For on-device inference you also need a GGUF or LiteRT model —
either pull one through the in-app Model Manager (HuggingFace
integration) or drop a file into the app's documents directory.
For local-server mode, run Ollama or LM Studio on the same network
and add the endpoint under Settings → Servers; OpenRouter or any
custom OpenAI-compatible host works the same way.

**Integration tip:** if you curate a directory like Astro/Grove
for self-hosted or privacy-first tooling, LocalMind pairs naturally
with any project that exposes an OpenAI-compatible API — Ollama,
LM Studio, vLLM, llama.cpp's server mode — and is one of the
cleanest reference apps for showcasing on-device LLM UX in Flutter.
