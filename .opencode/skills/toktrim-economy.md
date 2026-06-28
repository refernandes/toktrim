# TokTrim Economy Skill

## When to activate
Activate this skill when:
- User asks about token costs, savings, or context size
- Working in a large repo (>200 files) before reading many files
- Processing shell output >50KB before passing to context
- User explicitly asks for a repo map or compression

## Workflow: large repo
1. Call toktrim_repo_map with input="." before reading files
2. Use the artifact_path from the result as primary context source
3. Only read individual files when the map is insufficient

## Workflow: large shell output
1. Detect bash tool output >50KB (check _toktrim.compressed field)
2. If not already compressed, call toktrim_optimize_context
   with type="logs" and input=<temp_file>
3. Use compressed artifact instead of raw output

## Workflow: estimate before optimize
1. Call toktrim_estimate to preview savings
2. If savings_percent < 10: skip optimize (not worth it)
3. If savings_percent >= 10: proceed with optimize

## Never do
- Never call toktrim_optimize_context on file diffs or patches
- Never call toktrim_optimize_context on files being edited
- Never pass artifact_path to write/edit tools
- Never run optimize on files in .git/

## Output format
After any toktrim tool call, briefly summarize:
"Saved X tokens (Y%) via <provider>. Artifact at <path>."
Do not show the full JSON output to the user.
