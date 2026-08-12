# Tura

Tura is an open-source, Rust-first coding agent that ships as a
Tauri-based desktop application, a TUI, and a CLI. The premise is
"80% less token, better results" — Tura is built around persistent
task state and evidence-backed verification rather than
unconstrained chat with a model.

## Why it matters

- **Persistent task state, not just a chat box.** A Tura session is a
  task tree with explicit verification steps. The agent confirms the
  requested change, runs the project's tests, walks the compiler
  output, and only marks the task done when the verification passes.
  This is closer to a real software-delivery workflow than a
  streaming chat.
- **Multi-surface.** The same Tura core powers the Tauri desktop app
  (cross-platform), a TUI for terminal users, and a CLI for CI usage.
  The agent's state is portable; switching surfaces does not lose
  context.
- **Local-first.** Tura runs against local files, makes local edits,
  and runs local tests. The model endpoint can be cloud or local
  (Ollama, LM Studio, any OpenAI-compatible server); the workflow
  itself does not require a hosted service.

## How it works

The `Tura-AI/tura` repository is a Cargo workspace. The agent core
in `crates/tura-core` owns the task tree, the verification harness,
and the tool dispatcher. The TUI lives in `crates/tura-tui`, the
CLI in `crates/tura-cli`, and the desktop surfaces in `apps/desktop`
(a Tauri 2 wrapper). The model adapter is a thin wrapper around
`async-openai`; the agent talks to the configured endpoint and
expects tool-call capable models.

Sensors — file changes, compile errors, test outputs — feed back
into the task tree. The agent loop is `plan → act → verify → revise`
and the verification step is the load-bearing one. Token savings
come from the explicit plan; the model is not asked to regenerate
the implementation context on every iteration.

## Caveats

- **Pre-1.0 release line.** The badges on the project page are
  honest about this. Treat the API as subject to change.
- **The agent is only as good as the verification you write.** The
  loop depends on the project's tests and a reasonable `cargo`
  invocation. Open-source projects with weak CI will produce weak
  verification.
- **Model quality matters.** State-of-the-art code models give
  meaningfully better outcomes than local 7B coders. If you want
  Tura to "just work," plan to point it at a strong cloud model.

## Deployment notes

```bash
git clone https://github.com/Tura-AI/tura.git
cd tura
cargo install --path crates/tura-cli
tura              # or run `cargo run -p tura-desktop` for the Tauri app
```

Set the model endpoint and credentials per the CLI / TUI / desktop
settings. Native binaries are published under the project's
GitHub Releases for macOS, Windows, and Linux.

**Integration tip:** Tura is the most credible open-source answer
to "I want a coding agent I can run on my own machine, in my
terminal, without a hosted service." Pair it with **LocalMind**
when the conversation is "what does local-first AI tooling look
like in 2026?"
