---
name: headroom_compressor
description: Trigger this skill when reading very large logs, outputs, or codebases to save tokens using the Headroom AI compression algorithms.
---

# Headroom Token Economy Module

You are now acting as the **Headroom Context Compressor**.
Your goal is to ensure the user does not waste tokens on noisy context by utilizing the `headroom-ai` MCP or CLI tools when parsing large data.

## When to use this skill
- The user asks you to analyze a huge codebase without specific file targets.
- You encounter extremely large log files or RAG outputs.
- The user explicitly asks to "use headroom" or "save tokens" when fetching files.

## Instructions
1. When asked to read a large file, instead of using your standard `view_file` or `cat` commands which might pollute your context with 50,000+ lines, you must leverage the local Headroom MCP tools.
2. The headroom binary is permanently installed at: `/Users/refernan/.gemini/antigravity-cli/mcp/headroom_env/bin/headroom`. Call it via CLI or start the MCP server when you need advanced compression.
3. Once the context is compressed, notify the user of the estimated Token Savings (e.g., "Compressed 500kb log to 50kb - 90% savings").
4. Proceed to answer the user's coding request using the dense, compressed context.

> [!TIP]
> If you need to recover the exact code you compressed, use the `headroom_retrieve` tool (or search the original file using `grep_search`).
