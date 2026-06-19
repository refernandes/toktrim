---
name: repomap_generator
description: Trigger this skill to generate a structural map of an entire codebase or directory (classes, interfaces, functions) without reading the file contents. Use this to understand architecture before deep diving.
---

# RepoMap Generator Module

You are equipped with the **Repomix** CLI tool to generate high-level structural maps of any repository.
Instead of using `tree` or blindly reading dozens of files to find where a function or class is defined, use this skill to create a semantic map.

## Instructions
1. When entering a new repository or trying to locate logic in a complex project, DO NOT read files one by one.
2. Run the `repomix` command to generate a structural map.
   - The optimal command is: `repomix --compress --no-files --output repomap.xml`
   - This uses Tree-sitter to parse the AST of the codebase and returns ONLY the signatures, classes, and structure (ignoring the actual logic body).
3. Read the generated `repomap.xml` file using `view_file` to understand the architecture.
4. Once you find the exact file and class you need, you may proceed to read the specific file (or use Headroom to compress it if it's too large).
5. ALWAYS delete the `repomap.xml` when you are done to keep the user's workspace clean.
