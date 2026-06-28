# TokTrim Memory Skill

## Status: optional component
toktrim-memory is an optional MCP server.
If not running, skip all workflows in this skill silently.
Never error or warn the user about missing toktrim-memory.

## When to activate
Activate this skill when:
- User asks to remember something across sessions
- User references a previous conversation or decision
- User asks "what did we decide about X"
- Storing architecture decisions, recurring preferences,
  or project-specific conventions

## Store workflow
1. Identify the fact, decision, or preference to store
2. Generate a concise key (max 10 words)
3. Call mcp_toktrim_memory_store with key and value
4. Confirm to user: "Stored: <key>"

## Retrieve workflow
1. On session start: call mcp_toktrim_memory_search
   with recent project context as query
2. Inject relevant results into working context
3. Do not show raw results to user unless asked

## What not to store
- Sensitive credentials or tokens
- File contents (use toktrim artifacts instead)
- Temporary debugging notes
- Information that changes frequently

## Provider note
toktrim-memory works with any OpenAI-compatible provider
or offline with TOKTRIM_MEMORY_PROVIDER=local.
No Gemini configuration required.
