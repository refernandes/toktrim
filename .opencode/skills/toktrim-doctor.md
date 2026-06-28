# TokTrim Doctor Skill

## When to activate
Activate this skill when:
- User reports toktrim not working
- TUI sidebar shows UNHEALTHY
- toktrim_status returns errors array non-empty
- User asks "why is toktrim not saving tokens"

## Diagnostic workflow
1. Call toktrim_status --json, check errors[] and warnings[]
2. Check providers: for each provider with enabled=true,
   verify in_path=true
3. If any provider enabled=true and in_path=false:
   instruct user: "Run: toktrim install <provider>"
4. If config.parseable=false:
   instruct user: "Fix .toktrim/config.toml — invalid syntax"
5. If healthy=true but savings_percent=0:
   check if input path is correct and non-empty

## Common fixes
| Symptom                  | Fix                              |
|--------------------------|----------------------------------|
| repomix not in PATH      | toktrim install repomix          |
| headroom not in PATH     | toktrim install headroom         |
| config not parseable     | Fix .toktrim/config.toml syntax  |
| artifacts dir missing    | Will be created on first run     |
| savings_percent = 0      | Check --input path exists        |

## What not to do
- Do not call toktrim doctor --json directly (use toktrim_status)
- Do not suggest reinstalling toktrim itself unless binary missing
- Do not modify .toktrim/config.toml without user confirmation
