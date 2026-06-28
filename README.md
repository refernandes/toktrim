# TokTrim

## What it is

TokTrim is a C engine for token economy in agentic workflows, with native plugins for opencode. It compresses context, estimates savings, and tracks session economics without external API calls.

## Architecture

```
toktrim (C engine)
  └── JSON contract (doctor/status/estimate/optimize/benchmark)
.opencode/plugins/
  ├── toktrim-server.ts  (tools + hooks + session state)
  └── toktrim-tui.ts     (sidebar panel)
.opencode/skills/
  ├── toktrim-economy.md
  ├── toktrim-doctor.md
  └── toktrim-memory.md  (optional)
toktrim-memory/          (optional MCP server)
```

## Quick start

1. `make`
2. `cp .toktrim/config.toml.example .toktrim/config.toml` and adjust
3. Open project in opencode (plugins load automatically)

## Commands

| Command | Description | `--json` |
|---------|-------------|----------|
| `doctor` | Check environment and provider health | yes |
| `status` | Show current policy and provider state | yes |
| `estimate` | Preview token savings for a path | yes |
| `optimize` | Compress input using best provider | yes |
| `benchmark` | Run full pipeline with comparison report | yes |

## Session isolation

Each opencode session gets a unique `--session-id` and isolated `--state-dir`.
State files are stored in `~/.cache/opencode/toktrim/sessions/<session_id>/state.json`.
No state is shared between sessions unless explicitly configured.

## toktrim-memory (optional)

Optional MCP server for cross-session memory. Works offline with SQLite FTS5
or with any OpenAI-compatible provider.

| Variable | Default | Description |
|----------|---------|-------------|
| `TOKTRIM_MEMORY_DB_PATH` | `~/.cache/toktrim/memory.db` | SQLite database path |
| `TOKTRIM_MEMORY_PROVIDER` | `local` | Provider (local or openai-compatible) |

See `toktrim-memory/README.md` for details.

## Config reference

`.toktrim/config.toml` fields:

| Field | Default | Description |
|-------|---------|-------------|
| `policy.preset` | `cheap-repo` | cheap-repo, balanced, or aggressive |
| `policy.max_tokens` | `100000` | Maximum tokens per operation |
| `providers.repomix.enabled` | `true` | Enable repomix provider |
| `providers.headroom.enabled` | `false` | Enable headroom provider |

See `.toktrim/config.toml.example` for a complete template.

## Tests

```bash
npm --prefix .opencode test   # TypeScript plugin tests (open/close)
make test-contract             # C contract tests
```
