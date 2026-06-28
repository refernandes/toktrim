# toktrim-memory

Optional MCP server for cross-session memory in opencode projects.

## Status

Optional component. toktrim works without it. If not running, skip silently.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TOKTRIM_MEMORY_DB_PATH` | `~/.cache/toktrim/memory.db` | SQLite database path |
| `TOKTRIM_MEMORY_PROVIDER` | `local` | Provider: `local` (offline SQLite FTS5) |
| `TOKTRIM_MEMORY_MODEL` | _(empty)_ | Model name (unused in local mode) |
| `TOKTRIM_MEMORY_API_KEY` | _(none)_ | API key (unused in local mode) |

## Quick start (local, offline)

```bash
pip install -r requirements.txt
python server.py
```

No API key required. Runs entirely offline using SQLite FTS5.

## Provider note

Gemini is no longer the default provider. toktrim-memory defaults to `local`
mode (offline SQLite). To use an external OpenAI-compatible provider, set
`TOKTRIM_MEMORY_PROVIDER` to your provider name and provide the corresponding
API key. Gemini remains supported when explicitly configured.
